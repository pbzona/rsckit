import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { snapshotSchema, type Snapshot } from "./types";

export async function saveSnapshot(
  snapshot: Snapshot,
  output = path.join(snapshot.root, ".rsckit/snapshot.json"),
) {
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporary, output);
  return output;
}

export async function readSnapshot(file: string): Promise<Snapshot> {
  return snapshotSchema.parse(JSON.parse(await readFile(file, "utf8")));
}
