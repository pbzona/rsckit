import { AnalysisOutput, AnalysisTransform } from "./analysis-types";
import { Project } from "./project";
import { calculateTreeSize } from "./metrics";
import { formatBytes } from "@/lib/bytes";

export async function applyTransforms(
  output: AnalysisOutput,
  project: Project,
  transforms: AnalysisTransform[],
): Promise<AnalysisOutput> {
  let result = output;
  for (const transform of transforms) {
    result = await transform(result, project);
  }
  return result;
}

export const addSizeTransform: AnalysisTransform = async (
  output: AnalysisOutput,
  project: Project,
) => {
  const newClientBoundaries = await Promise.all(
    output.clientBoundaries.map(async (boundary) => {
      const file = await project.getSourceFile(boundary.child);
      const size = file?.size || 0;
      const treeSize = await calculateTreeSize(
        project,
        boundary.child,
      );

      return {
        ...boundary,
        size,
        treeSize,
        formattedSize: formatBytes(size),
        formattedTreeSize: formatBytes(treeSize),
      };
    }),
  );

  const newPages = await Promise.all(
    output.pages.map(async (page) => {
      const file = await project.getSourceFile(page.filePath);
      const size = file?.size || 0;
      return {
        ...page,
        size,
        formattedSize: formatBytes(size),
      };
    }),
  );

  return {
    ...output,
    clientBoundaries: newClientBoundaries,
    pages: newPages,
  };
};
