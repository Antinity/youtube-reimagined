export const appearanceKey = 'app:appearance';
export const pauseModsKey = 'app:pause-mods';

export const appearances = ['light', 'dark', 'system'] as const;
export type Appearance = typeof appearances[number];

export function isAppearance(value: unknown): value is Appearance {
  return appearances.some((appearance) => appearance === value);
}

export function readAppearance(values: Readonly<Record<string, unknown>>): Appearance {
  const value = values[appearanceKey];
  return isAppearance(value) ? value : 'system';
}
