import { useCallback, useEffect, useRef, useState } from "react";
import { connectDevframe, type DevframeRpcClient } from "devframe/client";
import type { Snapshot } from "../analysis/types";
import type {} from "../devframe/contract";

export function useInspector() {
  const client = useRef<DevframeRpcClient | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [previous, setPrevious] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState("connecting");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = useRef<Snapshot | null>(null);

  const accept = useCallback((next: Snapshot) => {
    if (current.current && current.current.generatedAt >= next.generatedAt)
      return;
    setPrevious(current.current);
    current.current = next;
    setSnapshot(next);
  }, []);

  useEffect(() => {
    let disposed = false;
    let connection: DevframeRpcClient | undefined;
    const unsubscribe: (() => void)[] = [];
    async function start() {
      connection = await connectDevframe();
      if (disposed) return connection.close?.();
      client.current = connection;
      const isStatic = connection.connectionMeta.backend === "static";
      setMode(isStatic ? "static" : "live");
      const rpc = connection.scope("rsckit").rpc;
      if (!isStatic) {
        unsubscribe.push(
          connection.events.on("connection:status", () => {
            if (!disposed)
              setMode(
                connection?.status === "connected"
                  ? "live"
                  : (connection?.status ?? "disconnected"),
              );
          }),
        );
        const status = await rpc.sharedState("status");
        if (disposed) return;
        unsubscribe.push(
          status.on("updated", async () => {
            if (disposed) return;
            setError(status.value().error);
            if (status.value().error) return;
            try {
              const next = await rpc.call("get-snapshot");
              if (!disposed) accept(next);
            } catch (cause) {
              if (!disposed) setError(message(cause));
            }
          }),
        );
      }
      const next = await rpc.call("get-snapshot");
      if (!disposed) accept(next);
    }
    start().catch((cause) => {
      if (!disposed) setError(message(cause));
    });
    return () => {
      disposed = true;
      for (const off of unsubscribe) off();
      connection?.close?.();
      client.current = null;
    };
  }, [accept]);

  async function refresh() {
    if (!client.current) return;
    setBusy(true);
    try {
      accept(await client.current.scope("rsckit").rpc.call("refresh"));
      setError(null);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  const getSource = useCallback(async (file: string) => {
    if (!client.current) throw new Error("Inspector is not connected");
    return client.current.scope("rsckit").rpc.call("get-source", file);
  }, []);

  return { snapshot, previous, mode, error, busy, refresh, getSource };
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}
