import type { PluginOption, PluginOptionValue } from './index';

export function isValidOptionValue(option: PluginOption, value: unknown): value is PluginOptionValue {
  switch (option.type) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        && (option.min === undefined || (Number.isFinite(option.min) && value >= option.min))
        && (option.max === undefined || (Number.isFinite(option.max) && value <= option.max))
        && (option.integer === undefined || (typeof option.integer === 'boolean'
          && (!option.integer || Number.isInteger(value))));
    default:
      return false;
  }
}
