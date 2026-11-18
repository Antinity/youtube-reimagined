import { ident, parse, walk } from 'css-tree';
import { readTheme } from './schema.ts';

const atRules = new Set(['media', 'supports', 'container', 'layer', 'keyframes', '-webkit-keyframes', 'scope', 'starting-style', 'property']);
const unsafeFunctions = new Set(['url', 'src', 'image', 'image-set', '-webkit-image-set', 'paint', 'expression']);

export function validateThemeImport(filename: string, source: string) {
  if (!/\.css$/i.test(filename)) throw new Error('Choose one .css or .theme.css file.');
  const theme = readTheme(source);
  const ast = parse(theme.css, {
    positions: true,
    parseCustomProperty: true,
    onParseError(error) { throw error; },
  });
  walk(ast, (node) => {
    if (node.type === 'Atrule') {
      const name = ident.decode(node.name).toLowerCase();
      if (!atRules.has(name)) throw new Error(`Unsupported @${name} rule. Use self-contained CSS selectors and style rules.`);
    }
    if (node.type === 'Url' || (node.type === 'Function' && unsafeFunctions.has(ident.decode(node.name).toLowerCase()))) {
      throw new Error('Resource-loading and executable CSS functions are unsupported. Use self-contained CSS values.');
    }
    if (node.type === 'Declaration' && ['behavior', '-moz-binding'].includes(ident.decode(node.property).toLowerCase())) {
      throw new Error('Executable CSS properties are unsupported.');
    }
    if (node.type === 'Raw') throw new Error('Unsupported or malformed CSS.');
  });
  return theme;
}
