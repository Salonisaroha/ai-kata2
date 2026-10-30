const TILES = [
  { key: 'total', label: 'Total trades', cls: 'total' },
  { key: 'approved', label: 'Approved', cls: 'approved' },
  { key: 'rejected', label: 'Rejected', cls: 'rejected' },
  { key: 'manual', label: 'Manual sign-off', cls: 'manual' },
];

export default function SummaryTiles({ counts }) {
  return (
    <dl className="tiles" aria-label="Summary of decisions">
      {TILES.map(({ key, label, cls }) => (
        <div key={key} className={`tile tile-${cls}`}>
          <dt>{label}</dt>
          <dd data-testid={`count-${key}`}>{counts[key]}</dd>
        </div>
      ))}
    </dl>
  );
}
