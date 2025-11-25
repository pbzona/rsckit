import { Project } from "./project";

export async function calculateTreeSize(
  project: Project,
  filePath: string,
  visited = new Set<string>(),
): Promise<number> {
  if (visited.has(filePath)) return 0;
  visited.add(filePath);

  try {
    const file = await project.getSourceFile(filePath);
    if (!file) return 0;

    let total = file.size;
    for (const dep of file.dependencies) {
      total += await calculateTreeSize(project, dep, visited);
    }
    return total;
  } catch {
    return 0;
  }
}
