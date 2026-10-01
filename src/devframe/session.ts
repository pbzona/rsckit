import { readFile } from "node:fs/promises";
import path from "node:path";
import { watch, type FSWatcher } from "chokidar";
import {
  analyzeProject,
  type AnalysisOptions,
  type Snapshot,
} from "../analysis";

export interface SessionStatus {
  revision: number;
  error: string | null;
}

export class AnalysisSession {
  private snapshot?: Snapshot;
  private pending?: Promise<Snapshot>;
  private dirty = false;
  private watcher?: FSWatcher;
  private timer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<(status: SessionStatus) => void>();
  private revision = 0;
  private closed = false;

  constructor(
    private options: AnalysisOptions,
    private analyze = analyzeProject,
  ) {}

  getSnapshot(): Promise<Snapshot> {
    return this.snapshot ? Promise.resolve(this.snapshot) : this.refresh();
  }

  refresh(): Promise<Snapshot> {
    if (this.closed) return Promise.reject(new Error("Inspector is closed"));
    if (this.pending) {
      this.dirty = true;
      return this.pending;
    }
    this.pending = this.scan().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  private async scan(): Promise<Snapshot> {
    try {
      do {
        this.dirty = false;
        const snapshot = await this.analyze(this.options);
        this.snapshot = snapshot;
        this.watcher?.add(
          snapshot.modules.map((file) =>
            path.resolve(snapshot.root, file.path),
          ),
        );
        this.publish(null);
      } while (this.dirty && !this.closed);
      return this.snapshot as Snapshot;
    } catch (error) {
      this.publish(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private publish(error: string | null) {
    const status = { revision: ++this.revision, error };
    for (const listener of this.listeners) listener(status);
  }

  subscribe(listener: (status: SessionStatus) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async startWatching() {
    if (this.watcher || this.closed) return;
    const snapshot = await this.getSnapshot();
    this.watcher = watch(
      [
        snapshot.root,
        ...snapshot.modules.map((file) =>
          path.resolve(snapshot.root, file.path),
        ),
      ],
      {
        ignoreInitial: true,
        ignored: (file) =>
          file
            .split(path.sep)
            .some((part) =>
              [
                "node_modules",
                ".git",
                ".next",
                ".rsckit",
                "dist",
                "coverage",
              ].includes(part),
            ),
      },
    );
    this.watcher.on("all", (_event, file) => {
      if (!/\.(?:[cm]?[jt]sx?|json)$/.test(file)) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.refresh().catch(() => {}), 150);
    });
    this.watcher.on("error", (error) => this.publish(String(error)));
    await new Promise<void>((resolve) => this.watcher?.once("ready", resolve));
  }

  async getSource(file: string) {
    const snapshot = await this.getSnapshot();
    if (!snapshot.modules.some((module) => module.path === file)) {
      throw new Error("Source is only available for analyzed modules");
    }
    return {
      path: file,
      source: await readFile(path.resolve(snapshot.root, file), "utf8"),
    };
  }

  async close() {
    this.closed = true;
    clearTimeout(this.timer);
    await this.watcher?.close();
    await this.pending?.catch(() => {});
    this.listeners.clear();
  }
}
