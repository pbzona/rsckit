import { SourceFile } from "@/source-file/source-file";
import { createCache } from "./cache";

export const sourceFileCache = createCache<SourceFile>("source-files.json")

