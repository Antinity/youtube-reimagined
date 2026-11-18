import { ident, parse, tokenize, tokenTypes as token, walk, type SyntaxParseError } from 'css-tree';
import { parse as parseStylesheet } from 'postcss';
import { ThemeValidationError } from './diagnostics.ts';
import { readTheme } from './schema.ts';

const atRules = new Set(['media', 'supports', 'container', 'layer', 'keyframes', '-webkit-keyframes', 'scope', 'starting-style', 'property']);
const unsafeFunctions = new Set(['url', 'src', 'image', 'image-set', '-webkit-image-set', 'paint', 'expression']);
const closing = new Map([
  [token.Function, ')'], [token.LeftParenthesis, ')'], [token.LeftSquareBracket, ']'], [token.LeftCurlyBracket, '}'],
]);

export function validateThemeImport(filename: string, source: string) {
  if (!/\.css$/i.test(filename)) throw new Error('Choose one .css or .theme.css file.');
  const theme = readTheme(source);
  validateThemeCss(theme.css, source);
  return theme;
}

export function validateThemeCss(css: string, source = css) {
  const theme = { css };
  if (!css.trim()) throw new ThemeValidationError(source, 0, 'Expected a non-empty CSS stylesheet.');
  const cssStart = source.length - theme.css.length;
  const invalid = (offset: number, message: string): never => {
    throw new ThemeValidationError(source, cssStart + offset, message);
  };

  const blocks: { expected: string; start: number }[] = [];
  tokenize(theme.css, (type, start, end) => {
    const expected = closing.get(type);
    if (expected) blocks.push({ expected, start });
    if (type === token.RightParenthesis || type === token.RightSquareBracket || type === token.RightCurlyBracket) {
      const found = theme.css[start];
      if (blocks.pop()?.expected !== found) invalid(start, `Unexpected closing "${found}". Check the matching opening delimiter.`);
    }
    if (type === token.BadString || (type === token.String && (end - start === 1 || theme.css[end - 1] !== theme.css[start]))) {
      invalid(start, 'Unterminated CSS string. Close it with the matching quote.');
    }
    if (type === token.Comment && !theme.css.slice(start + 2, end).endsWith('*/')) {
      invalid(start, 'Unterminated CSS comment. Close it with */.');
    }
    if (type === token.Url || type === token.BadUrl) {
      invalid(start, 'URL loading is unsupported. Use self-contained CSS values.');
    }
  });
  const unclosed = blocks.at(-1);
  if (unclosed) invalid(unclosed.start, `Unclosed CSS delimiter. Expected "${unclosed.expected}".`);

  // CSS Tree requires & on nested rules. Add it only to the validation copy.
  const insertions: number[] = [];
  try {
    parseStylesheet(theme.css).walkRules((rule) => {
      if (rule.selector.startsWith('&')) return;
      for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
        if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) break;
        if (parent.type === 'rule') {
          if (rule.source?.start?.offset !== undefined) insertions.push(rule.source.start.offset);
          break;
        }
      }
    });
  } catch (cause) {
    const error = cause as { line?: number; column?: number; reason?: string };
    const lineStarts = [...theme.css.matchAll(/\r\n|[\r\n\f]/g)];
    const previous = lineStarts[(error.line ?? 1) - 2];
    const offset = (previous ? previous.index + previous[0].length : 0) + (error.column ?? 1) - 1;
    invalid(offset, `Invalid CSS: ${error.reason ?? String(cause)}`);
  }
  const validationCss = insertions.reduceRight((css, at) => `${css.slice(0, at)}& ${css.slice(at)}`, theme.css);
  const originalOffset = (offset: number) => {
    for (const at of insertions) {
      if (offset < at) break;
      offset -= Math.min(2, offset - at);
    }
    return offset;
  };

  let ast;
  try {
    ast = parse(validationCss, {
      positions: true,
      parseCustomProperty: true,
      onParseError(error) { throw error; },
    });
  } catch (cause) {
    const error = cause as SyntaxParseError;
    invalid(originalOffset(error.offset ?? 0), `Invalid CSS: ${error.message}`);
  }
  walk(ast!, (node) => {
    const at = originalOffset(node.loc?.start.offset ?? 0);
    if (node.type === 'Atrule') {
      const name = ident.decode(node.name).toLowerCase();
      if (!atRules.has(name)) invalid(at, `Unsupported @${name} rule. Use self-contained CSS selectors and style rules.`);
    }
    if (node.type === 'Url' || (node.type === 'Function' && unsafeFunctions.has(ident.decode(node.name).toLowerCase()))) {
      invalid(at, `Unsupported resource-loading or executable CSS value "${node.type === 'Function' ? node.name : 'url'}".`);
    }
    if (node.type === 'Declaration') {
      const property = ident.decode(node.property).toLowerCase();
      if (property === 'behavior' || property === '-moz-binding') invalid(at, `Unsupported executable CSS property "${property}".`);
      if (!property.startsWith('--') && node.value.type === 'Value' && node.value.children.isEmpty) {
        invalid(at, `Missing value for "${property}". Expected a CSS value after the colon.`);
      }
    }
    if (node.type === 'Raw') invalid(at, 'Unsupported or malformed CSS. Use standard CSS syntax.');
  });
}
