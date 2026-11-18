import { parse, type AnyNode, type Expression, type Node } from 'acorn';
import { isNonEmptyText, isPluginId, pluginApiVersion, type PluginMetadata, type PluginOption, type PluginOptions } from './schema.ts';
import { isValidOptionValue } from './options.ts';

export interface PluginImportCandidate {
  name: string;
  source: string;
  metadata: PluginMetadata;
  factory: string;
}

function fail(node: Node, message: string): never {
  const at = node.loc?.start;
  throw new Error(at ? `${message} (line ${at.line}, column ${at.column + 1})` : message);
}

function checkModule(node: AnyNode) {
  if (node.type === 'ImportDeclaration' || node.type === 'ImportExpression' || node.type === 'MetaProperty' && node.meta.name === 'import') {
    fail(node, 'Imports and import.meta are unsupported. Put all plugin code in one .js file.');
  }
  if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
    fail(node, 'Expected only one export, export default followed by the plugin object or its const name.');
  }
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) {
      for (const item of child) if (item?.type) checkModule(item);
    } else if (child?.type) {
      checkModule(child);
    }
  }
}

export function validatePluginImport(name: string, source: string): PluginImportCandidate {
  let program;
  try {
    program = parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const at = (error as SyntaxError & { loc?: { line: number; column: number } }).loc;
    const detail = error.message.replace(/ \(\d+:\d+\)$/, '');
    throw new Error(`JavaScript syntax error: ${detail}${at ? ` (line ${at.line}, column ${at.column + 1})` : ''}`);
  }
  checkModule(program);

  const bindings = new Map<string, Expression>();
  const functions = new Map<string, AnyNode>();
  for (const statement of program.body) {
    if (statement.type === 'VariableDeclaration' && statement.kind === 'const') {
      for (const declarator of statement.declarations) {
        if (declarator.id.type === 'Identifier' && declarator.init) bindings.set(declarator.id.name, declarator.init);
      }
    }
    if (statement.type === 'FunctionDeclaration') functions.set(statement.id.name, statement);
  }

  function resolve(node: AnyNode, seen = new Set<string>()): AnyNode {
    if (node.type !== 'Identifier') return node;
    if (seen.has(node.name)) fail(node, `Circular reference to "${node.name}". Expected a static const value.`);
    seen.add(node.name);
    const binding = bindings.get(node.name) ?? functions.get(node.name);
    return binding ? resolve(binding, seen) : node;
  }

  function properties(node: AnyNode, path: string) {
    const value = resolve(node);
    if (value.type !== 'ObjectExpression') fail(node, `${path} must be an object literal or a const initialized to one.`);
    const fields = new Map<string, AnyNode>();
    for (const prop of value.properties) {
      if (prop.type !== 'Property' || prop.kind !== 'init' || prop.computed) {
        fail(prop, `${path} must use explicit properties. Spreads, getters, setters and computed keys are unsupported.`);
      }
      const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.type === 'Literal' ? prop.key.value : undefined;
      if (typeof key !== 'string') fail(prop.key, `${path} property names must be strings.`);
      if (key === '__proto__') fail(prop.key, `${path} cannot use "__proto__" as a property name.`);
      if (fields.has(key)) fail(prop.key, `Duplicate property "${path}.${key}".`);
      fields.set(key, prop.value);
    }
    return fields;
  }

  function required(fields: Map<string, AnyNode>, owner: Node, key: string, expected: string) {
    const node = fields.get(key);
    if (!node) fail(owner, `Missing "${key}". Expected ${expected}.`);
    return node;
  }

  function literal(node: AnyNode, path: string): unknown {
    const value = resolve(node);
    if (value.type === 'Literal' && !('regex' in value) && !('bigint' in value)) return value.value;
    if (value.type === 'UnaryExpression' && (value.operator === '-' || value.operator === '+')
      && value.argument.type === 'Literal' && typeof value.argument.value === 'number') {
      return value.operator === '-' ? -value.argument.value : value.argument.value;
    }
    fail(node, `${path} must be a literal or a const initialized to a literal.`);
  }

  function string(node: AnyNode, path: string, allowEmpty = false) {
    const value = literal(node, path);
    if (typeof value !== 'string' || (!allowEmpty && !isNonEmptyText(value))) fail(node, `${path} must be ${allowEmpty ? 'a' : 'a non-empty'} string.`);
    return value;
  }

  function people(node: AnyNode, path: string) {
    const value = resolve(node);
    if (value.type !== 'ArrayExpression') fail(node, `${path} must be an array of names, for example ["Ada"].`);
    return value.elements.map((item) => {
      if (!item || item.type === 'SpreadElement') fail(node, `${path} must list names as strings.`);
      return string(item, path, true);
    });
  }

  const exported = program.body.find((statement) => statement.type === 'ExportDefaultDeclaration');
  if (!exported) fail(program, 'Missing default export. Expected export default { id, name, description, version, authors, activate }.');
  const fields = properties(exported.declaration, 'Plugin');
  const read = (key: string) => required(fields, exported.declaration, key, `a plugin ${key} property`);

  const id = string(read('id'), 'Plugin.id');
  if (!isPluginId(id)) fail(read('id'), 'Plugin.id must use lowercase letters, digits, and single hyphens between segments.');
  const metadata: PluginMetadata = {
    id,
    name: string(read('name'), 'Plugin.name'),
    description: string(read('description'), 'Plugin.description'),
    version: string(read('version'), 'Plugin.version'),
    authors: people(read('authors'), 'Plugin.authors'),
  };
  const contributors = fields.get('contributors');
  if (contributors) metadata.contributors = people(contributors, 'Plugin.contributors');
  const api = fields.get('apiVersion');
  if (api) {
    if (literal(api, 'Plugin.apiVersion') !== pluginApiVersion) fail(api, `Unsupported plugin API version. Expected apiVersion: ${pluginApiVersion} or omit the property.`);
    metadata.apiVersion = pluginApiVersion;
  }
  const activate = resolve(read('activate'));
  if ((activate.type !== 'FunctionDeclaration' && activate.type !== 'FunctionExpression' && activate.type !== 'ArrowFunctionExpression')
    || activate.async || activate.generator) {
    fail(read('activate'), 'Plugin.activate must be a synchronous function, for example activate({ settings, onCleanup }) {}.');
  }

  const leaves = new Map<string, string>();
  function readOptions(options: AnyNode, parent: string, ancestors = new Set<AnyNode>()): PluginOptions {
    const object = resolve(options);
    if (ancestors.has(object)) fail(options, `${parent} must not contain itself.`);
    const parents = new Set(ancestors).add(object);
    return Object.fromEntries([...properties(options, parent)].map(([key, node]) => {
      const path = `${parent}.${key}`;
      if (!key.trim()) fail(node, 'Plugin option names must be non-empty strings.');
      const optionFields = properties(node, path);
      const typeNode = required(optionFields, node, 'type', 'group, boolean, string, color, number, range or select');
      const type = string(typeNode, `${path}.type`);
      const label = string(required(optionFields, node, 'label', 'a non-empty option label'), `${path}.label`);
      const tooltipNode = optionFields.get('tooltip');
      const tooltip = tooltipNode ? { tooltip: string(tooltipNode, `${path}.tooltip`) } : {};
      if (type === 'group') {
        const children = required(optionFields, node, 'options', 'an object containing nested options');
        const defaultNode = optionFields.get('default');
        if (defaultNode) fail(defaultNode, `${path}.default belongs on a setting inside the group.`);
        return [key, { type, label, ...tooltip, options: readOptions(children, `${path}.options`, parents) }];
      }
      const children = optionFields.get('options');
      if (children) fail(children, `${path}.options requires type: "group".`);
      const previous = leaves.get(key);
      if (previous) fail(node, `Duplicate setting ID "${key}" at ${path}. It is already used by ${previous}.`);
      leaves.set(key, path);
      const defaultNode = required(optionFields, node, 'default', `a default value for the ${type} option`);
      const option: { type: string; label: string; default: unknown; [key: string]: unknown } = {
        type, label, ...tooltip, default: literal(defaultNode, `${path}.default`),
      };
      const group = optionFields.get('group');
      if (group) option.group = string(group, `${path}.group`);
      switch (type) {
        case 'number':
        case 'range':
          for (const bound of ['min', 'max', 'step', 'integer']) {
            const boundNode = optionFields.get(bound);
            if (!boundNode) {
              if (type === 'range' && (bound === 'min' || bound === 'max')) fail(node, `${path} requires a numeric "${bound}".`);
              continue;
            }
            const value = literal(boundNode, `${path}.${bound}`);
            if (bound === 'integer' ? typeof value !== 'boolean'
              : typeof value !== 'number' || !Number.isFinite(value) || (bound === 'step' && value <= 0)) {
              fail(boundNode, `${path}.${bound} must be ${bound === 'integer' ? 'a boolean' : bound === 'step' ? 'a finite positive number' : 'a finite number'}.`);
            }
            option[bound] = value;
          }
          if (typeof option.min === 'number' && typeof option.max === 'number' && option.min > option.max) {
            fail(optionFields.get('max')!, `${path}.max must be greater than or equal to min.`);
          }
          break;
        case 'select': {
          const choices = required(optionFields, node, 'choices', 'an object mapping stored values to labels');
          option.choices = Object.fromEntries([...properties(choices, `${path}.choices`)].map(([value, choice]) =>
            [value, string(choice, `${path}.choices.${value}`)]));
          break;
        }
        case 'boolean':
        case 'string':
        case 'color':
          break;
        default:
          fail(typeNode, `${path}.type must be group, boolean, string, color, number, range or select.`);
      }
      const definition = option as PluginOption;
      if (!isValidOptionValue(definition, definition.default)) {
        fail(defaultNode, `${path}.default must be ${type === 'select' ? 'one of the declared choice keys' : type === 'range' || type === 'number' ? 'a number satisfying min, max, step and integer' : type === 'color' ? 'a hex color such as "#112233"' : `a ${type}`}.`);
      }
      return [key, definition];
    }));
  }
  const options = fields.get('options');
  if (options) metadata.options = readOptions(options, 'Plugin.options');

  // Preserve the position and evaluation order of statements around the export.
  let result = '__yrPlugin';
  while (source.includes(result)) result += '_';
  const header = source.slice(0, exported.declaration.start).replace(/^#![^\r\n]*/, (line) => ' '.repeat(line.length));
  const padding = header.slice(exported.start).replace(/[^\r\n]/g, ' ');
  const expression = source.slice(exported.declaration.start, exported.declaration.end);
  const rest = source.slice(exported.end);
  const body = `${header.slice(0, exported.start)}const ${result} = (${padding}${expression});${rest}`;
  const factory = `function () {\n"use strict";\n${body}\nreturn ${result};\n}`;
  try {
    parse(`(${factory})`, { ecmaVersion: 'latest' });
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const at = (error as SyntaxError & { loc?: { line: number; column: number } }).loc;
    if (at) throw new Error(`Plugin initialization must be synchronous. Move top-level await into a function (line ${at.line - 2}, column ${at.column + 1}).`);
    throw error;
  }
  return { name, source, metadata, factory };
}
