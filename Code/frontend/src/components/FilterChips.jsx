const CHIPS = [
  { value: 'all', label: 'All', countKey: 'total' },
  { value: 'Approved', label: 'Approved', countKey: 'approved' },
  { value: 'Rejected', label: 'Rejected', countKey: 'rejected' },
  { value: 'Needs Manual Sign-off', label: 'Needs sign-off', countKey: 'manual' },
];

export default function FilterChips({ value, counts, onChange }) {
  return (
    <div className="chips" role="group" aria-label="Filter results by decision">
      {CHIPS.map((c) => (
        <button
          key={c.value}
          type="button"
          className="chip"
          aria-pressed={value === c.value}
          onClick={() => onChange(c.value)}
        >
          {c.label} <span className="chip-count">({counts[c.countKey]})</span>
        </button>
      ))}
    </div>
  );
}
