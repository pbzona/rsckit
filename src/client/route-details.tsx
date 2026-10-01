import type { Route, Snapshot } from "../analysis/types";
import { bytes } from "./format";
import { ModuleTable } from "./module-table";

export function RouteDetails({
  route,
  snapshot,
  previous,
  boundaryId,
  selectBoundary,
  openSource,
}: {
  route: Route;
  snapshot: Snapshot;
  previous: Snapshot | null;
  boundaryId: string;
  selectBoundary: (id: string) => void;
  openSource: (file: string) => void;
}) {
  const boundary =
    route.boundaries.find((item) => item.id === boundaryId) ??
    route.boundaries[0];
  const priorRoute = previous?.routes.find((item) => item.id === route.id);
  const delta = route.clientSourceBytes - (priorRoute?.clientSourceBytes ?? 0);
  return (
    <>
      <div className="route-heading">
        <div>
          <p className="eyebrow">Route analysis</p>
          <h2>{route.pathname}</h2>
          <p className="muted mono">{route.page}</p>
        </div>
        <span className="badge">{route.entries.length} entry files</span>
      </div>
      <div className="metrics">
        <Metric
          label="Client source"
          value={bytes(route.clientSourceBytes)}
          detail="Unique local modules, UTF-8"
        />
        <Metric
          label="Client boundaries"
          value={String(route.boundaries.length)}
          detail="Server → client import edges"
        />
        <Metric
          label="RSC payload"
          value="Not measured"
          detail="Source bytes are not transfer bytes"
        />
      </div>
      {previous ? (
        <div className="notice" role="status">
          Changes since {new Date(previous.generatedAt).toLocaleTimeString()}:{" "}
          {priorRoute
            ? `${delta >= 0 ? "+" : "−"}${bytes(Math.abs(delta))} client source; ${countNew(route, priorRoute)} new / ${countNew(priorRoute, route)} removed boundaries.`
            : "New route."}
        </div>
      ) : null}
      <section className="panel">
        <div className="section-heading">
          <h3>Route entry files</h3>
          <span>Conservative composition</span>
        </div>
        <div className="entry-files">
          {route.entries.map((file) => (
            <button
              type="button"
              className="file-link"
              key={file}
              onClick={() => openSource(file)}
            >
              {file}
            </button>
          ))}
        </div>
      </section>
      <div className="boundary-grid">
        <section className="panel">
          <div className="section-heading">
            <h3>Client boundaries</h3>
          </div>
          <div className="boundary-list">
            {route.boundaries.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`boundary-button ${item.id === boundary?.id ? "selected" : ""}`}
                onClick={() => selectBoundary(item.id)}
                aria-pressed={item.id === boundary?.id}
              >
                <strong>{item.child}</strong>
                <small>from {item.parent ?? "route entry"}</small>
                <span>
                  {bytes(item.sourceBytes)} · {item.clientModules.length}{" "}
                  modules
                </span>
              </button>
            ))}
            {!boundary ? (
              <p className="muted">
                This route has no discovered client boundaries.
              </p>
            ) : null}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h3>Why it reaches the client</h3>
          </div>
          {boundary ? (
            <>
              <p className="muted explanation">
                One import path from a route entry to this boundary. Client
                context continues through its local imports.
              </p>
              <ol className="chain">
                {boundary.importChain.map((file, index) => (
                  <li key={file}>
                    <span>{index + 1}</span>
                    <button
                      type="button"
                      className="file-link"
                      onClick={() => openSource(file)}
                    >
                      {file}
                    </button>
                    {file === boundary.child ? (
                      <span className="badge client">use client</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="muted">
              Select a boundary to inspect its import path.
            </p>
          )}
        </section>
      </div>
      <ModuleTable
        route={route}
        boundary={boundary}
        snapshot={snapshot}
        openSource={openSource}
      />
    </>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function countNew(route: Route, previous: Route) {
  const ids = new Set(previous.boundaries.map((item) => item.id));
  return route.boundaries.filter((item) => !ids.has(item.id)).length;
}
