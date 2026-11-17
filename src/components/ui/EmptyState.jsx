export function EmptyState({ title, body }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
      <h3 className="m-0 text-base font-semibold text-text">{title}</h3>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p> : null}
    </div>
  );
}
