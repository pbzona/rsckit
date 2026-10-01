import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeProject, type Snapshot } from "../analysis";
import { AnalysisSession } from "./session";

describe("AnalysisSession", () => {
  let root: string;
  let session: AnalysisSession;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "rsckit-session-"));
    await mkdir(path.join(root, "app"));
    await writeFile(
      path.join(root, "app/page.tsx"),
      '"use client"; export default () => null;',
    );
    session = new AnalysisSession({ root });
  });
  afterEach(async () => {
    await session.close();
    await rm(root, { recursive: true, force: true });
  });

  it("keeps the last good snapshot after a failed refresh and rejects unlisted source paths", async () => {
    const original = await session.getSnapshot();
    await expect(session.getSource("../secret.txt")).rejects.toThrow(
      "analyzed modules",
    );
    expect((await session.getSource("app/page.tsx")).source).toContain(
      "use client",
    );
    await rm(path.join(root, "app"), { recursive: true });
    await expect(session.refresh()).rejects.toThrow();
    expect(await session.getSnapshot()).toBe(original);
  });

  it("rescans when another refresh arrives during an in-flight analysis", async () => {
    let release!: (snapshot: Snapshot) => void;
    const first = await analyzeProject({ root });
    const analyze = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Snapshot>((resolve) => {
            release = resolve;
          }),
      )
      .mockImplementation(() => analyzeProject({ root }));
    session = new AnalysisSession({ root }, analyze);
    const pending = session.refresh();
    await writeFile(
      path.join(root, "app/page.tsx"),
      "export default () => null;",
    );
    const concurrent = session.refresh();
    release(first);
    expect((await pending).routes[0].boundaries).toHaveLength(0);
    expect(await concurrent).toBe(await pending);
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it("watches added, modified, and removed source files", async () => {
    await session.startWatching();
    const updated = new Promise<void>((resolve) =>
      session.subscribe(() => resolve()),
    );
    await writeFile(
      path.join(root, "app/page.tsx"),
      "export default () => null;",
    );
    await updated;
    expect((await session.getSnapshot()).routes[0].boundaries).toHaveLength(0);
  });
});
