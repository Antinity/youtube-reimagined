import { ident, parse, tokenize, tokenTypes as token, walk, type SyntaxParseError } from 'css-tree';
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

  let ast;
  try {
    ast = parse(theme.css, {
      positions: true,
      parseCustomProperty: true,
      onParseError(error) { throw error; },
    });
  } catch (cause) {
    const error = cause as SyntaxParseError;
    invalid(error.offset ?? 0, `Invalid CSS: ${error.message}`);
  }
  walk(ast!, (node) => {
    const at = node.loc?.start.offset ?? 0;
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
  return theme;
}
