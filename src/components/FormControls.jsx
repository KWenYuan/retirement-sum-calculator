export function NumberField({ label, value, onChange, prefix, suffix, step = 1, min = 0 }) {
  const handleChange = (event) => {
    onChange(event.target.value);
  };

  const handleBlur = (event) => {
    const nextValue = event.target.value;

    if (nextValue === '') {
      onChange('');
      return;
    }

    const parsed = Number(nextValue);
    onChange(Number.isFinite(parsed) ? parsed : '');
  };

  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-shell">
        {prefix && <b>{prefix}</b>}
        <input
          type="number"
          min={min}
          step={step}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {suffix && <b>{suffix}</b>}
      </div>
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={`toggle ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span>{checked ? 'Yes' : 'No'}</span>
      </button>
    </label>
  );
}

export function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {action}
    </div>
  );
}
