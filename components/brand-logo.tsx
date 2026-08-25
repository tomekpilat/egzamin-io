export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`wordmark${compact ? " wordmark-compact" : ""}`}
      role="img"
      aria-label="egzaminio"
    >
      <span className="wordmark-text" aria-hidden="true">
        <span className="wordmark-main">egzamin</span>
        <span className="wordmark-io">io</span>
      </span>
      <span className="wordmark-check-badge" aria-hidden="true">
        <span>✓</span>
      </span>
    </span>
  );
}
