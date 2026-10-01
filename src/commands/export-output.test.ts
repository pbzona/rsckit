import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertNewOutputDirectory } from "./export-output";

describe("export output protection", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "rsckit-export-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  it("accepts a new directory and preserves existing files and directories", async () => {
    await expect(
      assertNewOutputDirectory(path.join(root, "report")),
    ).resolves.toBeUndefined();
    await writeFile(path.join(root, "keep.txt"), "keep me");
    await expect(assertNewOutputDirectory(root)).rejects.toThrow(
      "already exists",
    );
    await expect(
      assertNewOutputDirectory(path.join(root, "keep.txt")),
    ).rejects.toThrow("already exists");
    expect(await readFile(path.join(root, "keep.txt"), "utf8")).toBe("keep me");
  });
  it("rejects dangling symlinks instead of following them", async () => {
    const link = path.join(root, "report");
    await symlink(path.join(root, "missing"), link);
    await expect(assertNewOutputDirectory(link)).rejects.toThrow(
      "already exists",
    );
  });
});
