import { ClientBoundary as CoreClientBoundary } from "./types";
import { Project } from "./project";

export interface AnalyzedPage {
  filePath: string;
  useClient: boolean;
  dependencies: string[];
  // Extensible for future props
  [key: string]: unknown;
}

export interface AnalyzedClientBoundary extends CoreClientBoundary {
  [key: string]: unknown;
}

export interface AnalysisOutput {
  pages: AnalyzedPage[];
  routes: string[];
  clientBoundaries: AnalyzedClientBoundary[];
  // Extensible
  [key: string]: unknown;
}

export type AnalysisTransform = (
  output: AnalysisOutput,
  project: Project,
) => Promise<AnalysisOutput>;
