import type { PluginOption, PluginOptionValue } from './schema';

export function isValidOptionValue(option: PluginOption, value: unknown): value is PluginOptionValue {
  switch (option.type) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
      return typeof value === 'string';
    case 'select':
      return typeof value === 'string' && option.choices != null
        && typeof option.choices === 'object' && !Array.isArray(option.choices)
        && Object.hasOwn(option.choices, value) && typeof option.choices[value] === 'string';
    case 'range':
    case 'number':
      if (option.type === 'range' && (!Number.isFinite(option.min) || !Number.isFinite(option.max))) return false;
      if (typeof value !== 'number' || !Number.isFinite(value)) return false;
      const step = option.step ?? (option.type === 'range' ? 1 : undefined);
      const steps = step === undefined ? 0 : (value - (option.min ?? 0)) / step;
      return (step === undefined || (Number.isFinite(step) && step > 0 && Math.abs(steps - Math.round(steps)) < 1e-8))
        && (option.min === undefined || (Number.isFinite(option.min) && value >= option.min))
        && (option.max === undefined || (Number.isFinite(option.max) && value <= option.max))
        && (option.integer === undefined || (typeof option.integer === 'boolean'
          && (!option.integer || Number.isInteger(value))));
    default:
      return false;
  }
}
