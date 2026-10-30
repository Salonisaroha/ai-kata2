import Field from './Field.jsx';
import { AlertIcon } from './Icons.jsx';
import { ACTIONS, SECURITY_TYPES } from '../utils/validation.js';
import { orderValuePreview } from '../utils/format.js';

export default function TradeRow({
  row,
  index,
  portfolios,
  errors = {},
  flagged,
  canRemove,
  onChange,
  onRemove,
}) {
  const id = (name) => `trade-${row.key}-${name}`;
  const control = (name) => ({
    id: id(name),
    value: row[name],
    onChange: (e) => onChange(row.key, name, e.target.value),
    'aria-required': 'true',
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `${id(name)}-error` : undefined,
  });
  const field = (name, label, children) => (
    <Field id={id(name)} label={label} error={errors[name]}>
      {children}
    </Field>
  );

  return (
    <fieldset className={`trade-row${flagged ? ' flagged' : ''}`}>
      <legend>
        Trade {index + 1}
        {flagged && (
          <span className="flag-marker">
            <AlertIcon className="flag-icon" width={14} height={14} />
            <span> Flagged by server</span>
          </span>
        )}
      </legend>
      <div className="trade-grid">
        {field(
          'portfolio_id',
          'Portfolio',
          <select {...control('portfolio_id')}>
            <option value="">Select...</option>
            {portfolios.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>,
        )}
        {field('security_id', 'Security ID', <input type="text" autoComplete="off" {...control('security_id')} />)}
        {field(
          'action',
          'Action',
          <select {...control('action')}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>,
        )}
        {field('quantity', 'Quantity', <input type="number" inputMode="decimal" min="0" step="any" {...control('quantity')} />)}
        {field('price', 'Price', <input type="number" inputMode="decimal" min="0" step="any" {...control('price')} />)}
        {field(
          'security_type',
          'Security type',
          <select {...control('security_type')}>
            {SECURITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>,
        )}
      </div>
      <div className="trade-footer">
        <p className="order-value">
          Order value (qty x price):{' '}
          <strong>{orderValuePreview(row) ?? '—'}</strong>
        </p>
        {canRemove && (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onRemove(row.key)}>
            Remove trade {index + 1}
          </button>
        )}
      </div>
    </fieldset>
  );
}
