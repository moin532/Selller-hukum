export function StatGrid({ items = [] }) {
  const cols = Math.min(6, Math.max(items.length, 1));
  return (
    <section
      className="mb-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3"
      style={{ ["--kpi-cols"]: String(cols) }}
      aria-label="Summary"
    >
      <style>{`
        @media (min-width: 1024px) {
          section[aria-label="Summary"] {
            grid-template-columns: repeat(var(--kpi-cols), minmax(0, 1fr));
          }
        }
      `}</style>
      {items.map((item) => (
        <article key={item.label} className="rounded-[10px] border border-border bg-card px-3.5 py-2.5">
          <p className="mb-1 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted">{item.label}</p>
          <p className="m-0 text-[1.35rem] font-semibold text-text">{item.value}</p>
          {item.hint ? <p className="mt-1 text-[0.72rem] text-gold">{item.hint}</p> : null}
        </article>
      ))}
    </section>
  );
}
