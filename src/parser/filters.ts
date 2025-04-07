import { canBeParsed } from "@/lib/parser-utils";

export const filterEmptyPaths = (paths: string[]) => {
  return paths.filter(p => !!p);
}

export const filterNonEcmaPaths = (paths: string[]) => {
  return paths.filter(p => canBeParsed(p))
}
