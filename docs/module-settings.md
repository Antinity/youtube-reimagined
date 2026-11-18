# Module settings reference

Define controls under `options` in a plugin’s default export or a theme’s `metadata.js`. The popup renders them and keeps values per module.

```js
options: {
  appearance: {
    type: 'group',
    label: 'Appearance',
    options: {
      accent: {
        type: 'color',
        label: 'Accent',
        tooltip: 'Used for borders and highlights.',
        default: '#794f9e',
      },
      density: {
        type: 'select',
        label: 'Density',
        default: 'compact',
        choices: { compact: 'Compact', comfortable: 'Comfortable' },
      },
    },
  },
}
```

Every entry needs a `type` and a non-empty `label`. Optional `tooltip` text appears next to the label as a help icon. Every setting needs a valid `default`. Groups have `options` and can nest inside other groups.

| Type | Value and fields |
| --- | --- |
| `boolean` | `true` or `false`. |
| `string` | Text, including an empty string. Themes restrict the characters that can be used. |
| `color` | Six-digit hex color such as `'#794f9e'`. |
| `select` | String key from `choices`, an object mapping stored values to labels. |
| `number` | Finite number. Optional `min`, `max`, positive `step`, and boolean `integer`. |
| `range` | Finite number with required `min` and `max`. Optional positive `step` (defaults to 1) and boolean `integer`. |
| `group` | Nested `options` object. Groups have no stored value or default. |

Numeric steps count from `min`, or from zero when `min` is omitted. Set `integer: true` to require a whole number.

Each setting ID must be unique across all groups in the module. The example’s plugin values are `settings.accent` and `settings.density`. Moving these settings between groups keeps their stored IDs.

For themes, setting IDs must start with a letter and can contain letters, digits, underscores, or hyphens. The corresponding CSS variables are `--yr-theme-accent` and `--yr-theme-density`. Boolean values become `1` or `0`, and numbers are unitless. Add units in CSS, for example `calc(var(--yr-theme-spacing, 8) * 1px)`. Theme string defaults and select keys may contain ASCII letters and digits, underscores, spaces, and the characters `# . % + -`. For example, `'8px'` is accepted as a string setting. Choose values that are valid for the CSS property where you use them.
