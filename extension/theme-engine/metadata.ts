import { parse, type AnyNode, type Node } from 'acorn';
import { ThemeValidationError } from './diagnostics.ts';
import { validateMetadata } from './schema.ts';

export function readMetadataJs(source: string) {
  const fail = (node: Node, message: string): never => {
    throw new ThemeValidationError(source, node.start, message);
  };
  let program;
  try {
    program = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (error) {
    const issue = error as SyntaxError & { pos?: number };
    throw new ThemeValidationError(source, issue.pos ?? 0, issue.message.replace(/ \(\d+:\d+\)$/, ''));
  }
  const statement = program.body[0];
  if (program.body.length !== 1 || statement?.type !== 'ExportDefaultDeclaration' || statement.declaration.type !== 'ObjectExpression') {
    return fail(program.body[1] ?? statement ?? program, 'Expected a single export default { ... } declaration with literal metadata.');
  }
  const locations = new Map<string, Node>();
  function read(node: AnyNode, path: (string | number)[]): unknown {
    locations.set(JSON.stringify(path), node);
    if (node.type === 'Literal' && (node.value === null || typeof node.value === 'string' || typeof node.value === 'boolean'
      || typeof node.value === 'number' && Number.isFinite(node.value))) return node.value;
    if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal'
      && typeof node.argument.value === 'number' && Number.isFinite(node.argument.value)) return -node.argument.value;
    if (node.type === 'ArrayExpression') return node.elements.map((item, index) => {
      if (!item || item.type === 'SpreadElement') return fail(item ?? node, 'Expected a literal array without holes or spreads.');
      return read(item, [...path, index]);
    });
    if (node.type === 'ObjectExpression') {
      const values: Record<string, unknown> = Object.create(null);
      for (const property of node.properties) {
        if (property.type !== 'Property' || property.kind !== 'init' || property.computed || property.shorthand || property.method) {
          return fail(property, 'Expected a literal property. Computed keys, methods, and spreads are unsupported.');
        }
        const key = property.key.type === 'Identifier' ? property.key.name
          : property.key.type === 'Literal' ? property.key.value : undefined;
        if (typeof key !== 'string' || key === '__proto__' || Object.hasOwn(values, key)) {
          return fail(property.key, 'Expected a unique property name.');
        }
        values[key] = read(property.value, [...path, key]);
      }
      return values;
    }
    return fail(node, 'Expected a static string, number, boolean, object, or array.');
  }
  const metadata = read(statement.declaration, []);
  validateMetadata(metadata, (path, expected) => fail(
    locations.get(JSON.stringify(path)) ?? locations.get(JSON.stringify(path.slice(0, -1))) ?? statement,
    `${path.join('.') || 'Metadata'}: expected ${expected}.`,
  ));
  return metadata;
}
