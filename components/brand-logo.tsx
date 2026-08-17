export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`wordmark${compact ? " wordmark-compact" : ""}`}
      role="img"
      aria-label="egzaminio"
    >
      <span aria-hidden="true">
        <span className="wordmark-main">egzamin</span>
        <span className="wordmark-io">
          i
          <span className="wordmark-o">
            o<span className="wordmark-check">✓</span>
          </span>
        </span>
      </span>
    </span>
  );
}
