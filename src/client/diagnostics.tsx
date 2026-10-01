import type { Snapshot } from "../analysis/types";

export function Diagnostics({ snapshot }: { snapshot: Snapshot }) {
  const diagnostics = new Map(
    snapshot.diagnostics.map((item) => [JSON.stringify(item), item]),
  );
  return (
    <section className="panel">
      <div className="section-heading">
        <h3>Diagnostics</h3>
        <span>{snapshot.diagnostics.length}</span>
      </div>
      {snapshot.diagnostics.length ? (
        <ul className="diagnostics">
          {[...diagnostics].map(([key, item]) => (
            <li key={key}>
              <span className={`badge ${item.level}`}>{item.level}</span>
              <div>
                <strong>{item.code}</strong>
                {item.file ? <code>{item.file}</code> : null}
                <p>{item.message}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No analysis diagnostics.</p>
      )}
    </section>
  );
}
