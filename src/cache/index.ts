import { SourceFile, createSourceFile } from "@/source-file/source-file";
import { createCache } from "./cache";
import { ParserService } from "@/parser/service";

let parserService: ParserService;

export function setParserService(service: ParserService) {
  parserService = service;
}

export const sourceFileCache = createCache<SourceFile>("source-files.json", parserService, createSourceFile);

