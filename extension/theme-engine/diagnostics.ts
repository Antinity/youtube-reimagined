export const themeApplicationErrorKey = 'theme:application-error';

export class ThemeValidationError extends Error {
  constructor(source: string, offset: number, message: string) {
    const lines = source.slice(0, offset).split(/\r\n|[\r\n\f]/);
    super(`${message} (line ${lines.length}, column ${(lines.at(-1)?.length ?? 0) + 1})`);
  }
}
