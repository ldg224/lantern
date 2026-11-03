export function Lockup({ size }: { size: number }) {
  return (
    <span className="lockup" style={{ fontSize: size }} aria-label="lantern">
      <svg viewBox="14 12 72 76" aria-hidden="true">
        <g transform="translate(0 4)">
          <rect fill="var(--lantern-caps)" x="47" y="12" width="6" height="12" rx="3" />
          <rect fill="var(--lantern-caps)" x="34" y="20" width="32" height="12" rx="6" />
          <rect fill="var(--lantern-body)" x="18" y="36" width="64" height="28" rx="14" />
          <rect fill="var(--lantern-caps)" x="34" y="68" width="32" height="12" rx="6" />
        </g>
      </svg>
      <span>lantern</span>
    </span>
  );
}
