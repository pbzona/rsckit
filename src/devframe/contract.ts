import type { Route, Snapshot } from "../analysis";
import type { SessionStatus } from "./session";

export interface RouteSummary {
  id: string;
  pathname: string;
  clientSourceBytes: number;
  boundaryCount: number;
}

declare module "devframe" {
  interface DevframeRpcServerFunctions {
    "rsckit:get-snapshot": () => Promise<Snapshot>;
    "rsckit:list-routes": () => Promise<RouteSummary[]>;
    "rsckit:get-route": (id: string) => Promise<Route>;
    "rsckit:get-source": (
      file: string,
    ) => Promise<{ path: string; source: string }>;
    "rsckit:refresh": () => Promise<Snapshot>;
  }
  interface DevframeRpcSharedStates {
    "rsckit:status": SessionStatus;
  }
}
