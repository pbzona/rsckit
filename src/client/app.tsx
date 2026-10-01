import { useDeferredValue, useState } from "react";
import { Diagnostics } from "./diagnostics";
import { bytes } from "./format";
import { RouteDetails } from "./route-details";
import { SourceDialog } from "./source-dialog";
import { useInspector } from "./use-inspector";

export function App() {
  const inspector = useInspector();
  const { snapshot, previous, mode, busy, error } = inspector;
  const [routeId, setRouteId] = useState("");
  const [boundaryId, setBoundaryId] = useState("");
  const [search, setSearch] = useState("");
  const filter = useDeferredValue(search).toLowerCase();
  const [source, setSource] = useState<string | null>(null);
  const route =
    snapshot?.routes.find((item) => item.id === routeId) ?? snapshot?.routes[0];
  const routes =
    snapshot?.routes.filter((item) =>
      `${item.pathname} ${item.id}`.toLowerCase().includes(filter),
    ) ?? [];

  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "rsckit-snapshot.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            R
          </span>
          <h1>
            RSC Kit <span>Inspector</span>
          </h1>
          <span className="badge">{mode}</span>
        </div>
        <div className="actions">
          <button type="button" onClick={download} disabled={!snapshot}>
            Download JSON
          </button>
          <button
            type="button"
            className="primary"
            onClick={inspector.refresh}
            disabled={mode !== "live" || busy}
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>
      {error ? (
        <div className="notice error" role="alert">
          {error}
          {snapshot ? " Showing the last successful snapshot." : ""}
        </div>
      ) : null}
      {!snapshot ? (
        <main className="empty" aria-live="polite">
          {error
            ? "Could not load the project."
            : "Connecting to the analysis session…"}
        </main>
      ) : (
        <>
          <div className="projectbar">
            <span title={snapshot.root}>{snapshot.root}</span>
            <time dateTime={snapshot.generatedAt}>
              Analyzed {new Date(snapshot.generatedAt).toLocaleTimeString()}
            </time>
          </div>
          <div className="workspace">
            <aside className="routes" aria-label="Routes">
              <div className="section-heading">
                <h2>Routes</h2>
                <span>{snapshot.routes.length}</span>
              </div>
              <label className="search">
                <span className="sr-only">Search routes</span>
                <input
                  placeholder="Search routes…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <nav>
                {routes.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`route-button ${item.id === route?.id ? "selected" : ""}`}
                    onClick={() => {
                      setRouteId(item.id);
                      setBoundaryId("");
                    }}
                    aria-current={item.id === route?.id ? "page" : undefined}
                  >
                    <strong>{item.pathname}</strong>
                    <small>{item.id}</small>
                    <span>
                      {item.boundaries.length} boundaries ·{" "}
                      {bytes(item.clientSourceBytes)}
                    </span>
                  </button>
                ))}
                {routes.length === 0 ? (
                  <p className="muted">No matching routes.</p>
                ) : null}
              </nav>
            </aside>
            <main className="details">
              {route ? (
                <RouteDetails
                  route={route}
                  snapshot={snapshot}
                  previous={previous}
                  boundaryId={boundaryId}
                  selectBoundary={setBoundaryId}
                  openSource={setSource}
                />
              ) : (
                <div className="empty">No App Router pages found.</div>
              )}
              <Diagnostics snapshot={snapshot} />
              <p className="footnote">
                Source graph estimates exclude packages, assets, tree shaking,
                compression, and runtime Flight data. Conditional route entries
                may not run on every request.
              </p>
            </main>
          </div>
        </>
      )}
      {source ? (
        <SourceDialog
          key={source}
          file={source}
          getSource={inspector.getSource}
          close={() => setSource(null)}
        />
      ) : null}
    </div>
  );
}
