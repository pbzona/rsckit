import type { Boundary, Route, Snapshot } from "../analysis/types";
import { bytes } from "./format";

export function ModuleTable({
  route,
  boundary,
  snapshot,
  openSource,
}: {
  route: Route;
  boundary?: Boundary;
  snapshot: Snapshot;
  openSource: (file: string) => void;
}) {
  const moduleMap = new Map(snapshot.modules.map((item) => [item.path, item]));
  const boundaryModules = boundary ? new Set(boundary.clientModules) : null;
  const modules = route.modules.filter(
    (item) => !boundaryModules || boundaryModules.has(item.path),
  );
  return (
    <section className="panel">
      <div className="section-heading">
        <h3>{boundary ? "Boundary client modules" : "Route modules"}</h3>
        <span>Environment is route-wide</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Environment</th>
              <th>Source</th>
              <th>Imports</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((item) => {
              const info = moduleMap.get(item.path);
              const imports = new Map(
                info?.imports.map((dep) => [JSON.stringify(dep), dep]),
              );
              return (
                <tr key={item.path}>
                  <td>
                    <button
                      type="button"
                      className="file-link"
                      onClick={() => openSource(item.path)}
                    >
                      {item.path}
                    </button>
                  </td>
                  <td>
                    {item.environments.map((env) => (
                      <span className={`badge ${env}`} key={env}>
                        {env}
                      </span>
                    ))}
                  </td>
                  <td>{info ? bytes(info.sourceBytes) : "Unavailable"}</td>
                  <td>
                    <details>
                      <summary>{info?.imports.length ?? 0} imports</summary>
                      <ul className="imports">
                        {[...imports].map(([key, dep]) => (
                          <li key={key}>
                            <code>{dep.specifier}</code>
                            <span className="badge">
                              {dep.kind} · {dep.status}
                            </span>
                            {dep.target && moduleMap.has(dep.target) ? (
                              <button
                                type="button"
                                className="file-link"
                                onClick={() => {
                                  if (dep.target) openSource(dep.target);
                                }}
                              >
                                {dep.target}
                              </button>
                            ) : dep.target ? (
                              <code>{dep.target}</code>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
