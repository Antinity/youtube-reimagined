import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import type { PluginOption, PluginOptions, PluginOptionValue, PluginSettings } from '@/plugin-engine';
import './option-help.css';

export function Checkbox({ id, checked, label, disabled, onSave }: {
  id?: string;
  checked: boolean;
  label?: string;
  disabled?: boolean;
  onSave: (checked: boolean) => Promise<boolean>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const latestWrite = useRef(0);

  useLayoutEffect(() => {
    if (input.current) input.current.checked = checked;
  }, [checked]);

  return <input id={id} ref={input} type="checkbox" aria-label={label} defaultChecked={checked} disabled={disabled}
    onChange={async ({ currentTarget }) => {
      const write = ++latestWrite.current;
      if (!await onSave(currentTarget.checked) && write === latestWrite.current) {
        currentTarget.checked = currentTarget.defaultChecked;
      }
    }} />;
}

function OptionInput({ id, option, value, onSave }: {
  id: string;
  option: PluginOption;
  value: PluginOptionValue;
  onSave: (value: PluginOptionValue) => Promise<boolean>;
}) {
  const select = useRef<HTMLSelectElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const color = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (select.current) select.current.value = String(value);
    if (range.current) range.current.value = String(value);
    if (color.current) color.current.value = String(value);
  }, [value]);

  if (option.type === 'boolean') {
    return <Checkbox id={id} checked={value === true} onSave={onSave} />;
  }
  if (option.type === 'color') {
    return <input id={id} ref={color} type="color" defaultValue={String(value)} onChange={async ({ currentTarget }) => {
      const next = currentTarget.value;
      if (!await onSave(next) && currentTarget.value === next) currentTarget.value = String(value);
    }} />;
  }
  if (option.type === 'select') {
    return <select id={id} ref={select} defaultValue={String(value)} onChange={async ({ currentTarget }) => {
      const next = currentTarget.value;
      if (!await onSave(next) && currentTarget.value === next) currentTarget.value = String(value);
    }}>
      {Object.entries(option.choices).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>;
  }

  const numeric = option.type === 'number' || option.type === 'range';
  const min = numeric && option.min !== undefined ? (option.integer ? Math.ceil(option.min) : option.min) : undefined;
  const max = numeric && option.max !== undefined ? (option.integer ? Math.floor(option.max) : option.max) : undefined;
  const step = numeric ? option.step ?? (option.integer || option.type === 'range' ? 1 : 'any') : undefined;

  async function saveInput(input: HTMLInputElement) {
    const draft = input.value;
    const next = numeric ? input.valueAsNumber : draft;
    if (Object.is(next, value)) return;
    if (!await onSave(next) && input.value === draft) input.value = String(value);
  }

  if (option.type === 'range') {
    return <>
      <input id={id} ref={range} type="range" defaultValue={String(value)} min={min} max={max} step={step}
        onPointerUp={(event) => { void saveInput(event.currentTarget); }}
        onKeyUp={(event) => { void saveInput(event.currentTarget); }}
        onBlur={(event) => { void saveInput(event.currentTarget); }} /> {value}
    </>;
  }

  return <input id={id} type={numeric ? 'number' : 'text'} defaultValue={String(value)}
    min={min} max={max} step={step}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    onBlur={(event) => { void saveInput(event.currentTarget); }} />;
}

function OptionHelp({ label, tooltip }: { label: string; tooltip?: string }) {
  const tooltipId = useId();
  if (!tooltip) return null;
  return <span className="option-help">
    <button type="button" aria-label={`Help for ${label}`} aria-describedby={tooltipId}>?</button>
    <span id={tooltipId} role="tooltip">{tooltip}</span>
  </span>;
}

function OptionRow({ option, value, onSave }: {
  option: PluginOption;
  value: PluginOptionValue;
  onSave: (value: PluginOptionValue) => Promise<boolean>;
}) {
  const id = useId();
  return <div className="option-row">
    <label htmlFor={id}>{option.label}</label>{' '}
    <OptionHelp label={option.label} tooltip={option.tooltip} />{' '}
    <OptionInput id={id} key={option.type === 'number' || option.type === 'string' ? String(value) : undefined}
      option={option} value={value} onSave={onSave} />
  </div>;
}

export function OptionFields({ options, settings, onSave }: {
  options: PluginOptions;
  settings: PluginSettings;
  onSave: (key: string, option: PluginOption, value: PluginOptionValue) => Promise<boolean>;
}) {
  const legacy = new Map<string, ReactNode[]>();
  const nodes: ReactNode[] = [];
  for (const [key, option] of Object.entries(options)) {
    if (option.type === 'group') {
      nodes.push(<fieldset key={`group:${key}`} className="option-group">
        <legend>{option.label}{' '}<OptionHelp label={option.label} tooltip={option.tooltip} /></legend>
        <OptionFields options={option.options} settings={settings} onSave={onSave} />
      </fieldset>);
      continue;
    }

    const input = <OptionRow key={`setting:${key}`} option={option} value={settings[key] ?? option.default}
      onSave={(next) => onSave(key, option, next)} />;
    if (option.group) {
      let fields = legacy.get(option.group);
      if (!fields) {
        fields = [];
        legacy.set(option.group, fields);
        nodes.push(<fieldset key={`legacy:${option.group}`}><legend>{option.group}</legend>{fields}</fieldset>);
      }
      fields.push(input);
    } else {
      nodes.push(input);
    }
  }
  return nodes;
}
