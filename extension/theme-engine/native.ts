import { list, parse, type ChildNode, type Rule } from 'postcss';
import { ThemeValidationError } from './diagnostics.ts';

type Path = (string | number)[];
type Invalid = (path: Path, expected: string) => never;

function unquote(value: string): string {
  if (!/^(?:"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*')$/.test(value)) return value;
  return value.slice(1, -1).replace(/\\(?:([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|(\r\n|[\s\S]))/gi,
    (_, hex: string | undefined, character: string | undefined) => {
      if (!hex) return /^[\r\n\f]/.test(character ?? '') ? '' : character ?? '';
      const point = Number.parseInt(hex, 16);
      return String.fromCodePoint(point && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? point : 0xfffd);
    });
}

export function readNativeTheme(source: string, validate: (metadata: unknown, invalid: Invalid) => void) {
  let stylesheet;
  try {
    stylesheet = parse(source);
  } catch (cause) {
    const error = cause as { reason?: string; line?: number; column?: number };
    throw new Error(`Invalid CSS: ${error.reason ?? String(cause)} (line ${error.line ?? 1}, column ${error.column ?? 1})`);
  }
  const header = stylesheet.nodes.find((node) => node.type !== 'comment');
  const fail = (node: ChildNode | undefined, message: string): never => {
    throw new ThemeValidationError(source, node?.source?.start?.offset ?? 0, message);
  };
  if (header?.type !== 'atrule' || header.name !== 'layer' || header.params !== 'yr-theme' || !header.nodes) {
    return fail(header, 'Expected a leading @layer yr-theme { ... } metadata block or a legacy /* ==Theme== comment.');
  }

  const locations = new Map<string, ChildNode>();
  const invalid: Invalid = (path, expected) => {
    let node;
    for (let depth = path.length; depth > 0 && !node; depth--) {
      node = locations.get(JSON.stringify(path.slice(0, depth)));
    }
    return fail(node ?? header, `${path.join('.') || 'Metadata'}: expected ${expected}.`);
  };

  function fields(rule: Rule, path: Path, keys: string[]) {
    locations.set(JSON.stringify(path), rule);
    const values = Object.create(null) as Record<string, string>;
    for (const node of rule.nodes) {
      if (node.type !== 'decl') continue;
      const key = node.prop.slice(2).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      if (!node.prop.startsWith('--') || !keys.includes(key) || node.important) fail(node, `Unexpected metadata declaration "${node.prop}".`);
      if (Object.hasOwn(values, key)) fail(node, `Duplicate metadata declaration "${node.prop}".`);
      values[key] = node.value;
      locations.set(JSON.stringify([...path, key]), node);
    }
    return values;
  }

  function options(nodes: ChildNode[], path: Path): Record<string, unknown> {
    const entries: [string, unknown][] = [];
    const seen = new Set<string>();
    for (const node of nodes) {
      if (node.type === 'comment') continue;
      if (node.type !== 'rule' || !/^[.#][a-zA-Z][\w-]*$/.test(node.selector)) {
        fail(node, 'Expected #setting or .group inside the theme metadata.');
        continue;
      }
      const key = node.selector.slice(1);
      if (seen.has(key)) fail(node, `Duplicate theme metadata entry "${key}".`);
      seen.add(key);
      const at = [...path, key];
      const group = node.selector.startsWith('.');
      const definition: Record<string, unknown> = Object.fromEntries(Object.entries(fields(node, at, group
        ? ['label', 'tooltip'] : ['type', 'label', 'tooltip', 'default', 'min', 'max', 'step', 'integer', 'choices']))
        .map(([field, value]) => [field, field === 'choices' ? value : unquote(value)]));
      const children = node.nodes.filter((child) => child.type !== 'decl' && child.type !== 'comment');
      if (group) {
        definition.type = 'group';
        definition.options = options(children, [...at, 'options']);
      } else {
        if (children.length) fail(children[0], 'Only groups can contain nested settings.');
        const number = /^[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?$/i;
        for (const field of ['min', 'max', 'step', ...(definition.type === 'number' || definition.type === 'range' ? ['default'] : [])]) {
          const value = definition[field];
          if (typeof value === 'string' && number.test(value)) definition[field] = Number(value);
        }
        for (const field of ['integer', ...(definition.type === 'boolean' ? ['default'] : [])]) {
          if (definition[field] === 'true' || definition[field] === 'false') definition[field] = definition[field] === 'true';
        }
        if (definition.type === 'color' && typeof definition.default === 'string' && /^#[0-9a-f]{3}$/i.test(definition.default)) {
          definition.default = '#' + [...definition.default.slice(1)].map((digit) => digit.repeat(2)).join('');
        }
        if (typeof definition.choices === 'string') {
          const pairs = list.comma(definition.choices).map((choice) => list.space(choice));
          const choiceKeys = pairs.map(([value]) => unquote(value ?? ''));
          if (pairs.some((pair) => pair.length !== 2) || new Set(choiceKeys).size !== pairs.length) {
            invalid([...at, 'choices'], 'distinct pairs such as compact "Compact", wide "Wide"');
          }
          definition.choices = Object.fromEntries(pairs.map((pair, index) => [choiceKeys[index], unquote(pair[1]!)]));
        }
      }
      entries.push([key, definition]);
    }
    return Object.fromEntries(entries);
  }

  const root = header.nodes.find((node) => node.type === 'rule' && node.selector === ':root');
  if (root?.type !== 'rule') return fail(header, 'Expected :root with theme metadata inside @layer yr-theme.');
  const extraRoot = header.nodes.find((node) => node !== root && node.type === 'rule' && node.selector === ':root');
  if (extraRoot) fail(extraRoot, 'Expected only one :root metadata rule.');
  const child = root.nodes.find((node) => node.type !== 'decl' && node.type !== 'comment');
  if (child) fail(child, 'Place groups and settings beside the :root metadata rule.');
  const declarations = fields(root, [], ['id', 'name', 'description', 'version', 'authors', 'contributors', 'schemaVersion']);
  const metadata: Record<string, unknown> = Object.fromEntries(Object.entries(declarations).map(([key, value]) =>
    [key, key === 'authors' || key === 'contributors' ? (value === 'none' ? [] : list.comma(value).map(unquote))
      : key === 'schemaVersion' && value === '1' ? 1 : unquote(value)]));
  const definitions = options(header.nodes.filter((node) => node !== root), ['options']);
  if (Object.keys(definitions).length) metadata.options = definitions;
  validate(metadata, invalid);
  const cssStart = header.source!.end!.offset!;
  const css = source.slice(cssStart);
  if (!stylesheet.nodes.some((node) => node !== header && node.type !== 'comment')) {
    throw new ThemeValidationError(source, cssStart, 'Expected CSS after the theme metadata.');
  }
  return { metadata, css };
}
