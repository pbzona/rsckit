import { SourceFile } from "@/source-file/source-file";
import { z } from "zod";

export interface ProjectConfig {
  root: string;
  tsConfig: {
    path: string;
    options: TypeScriptConfig;
  };
  parser: {
    options: ParserOptions;
  };
}

export interface TypeScriptConfig {
  compilerOptions: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
}

export interface ParserOptions {
  projectRoot: string;
  tsConfigPath: string;
}

export interface AnalysisResult {
  pages: SourceFile[];
  routes: string[];
  clientBoundaries: ClientBoundary[];
}

export interface ClientBoundary {
  parent: string;
  child: string;
}
