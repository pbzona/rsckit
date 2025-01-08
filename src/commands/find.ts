import { chooseParser, hasUseClient } from '@/lib/parser';
import { ParsingCommand } from '@/lib/types';

// Use this later for locating client components
export const isClientComponent: ParsingCommand<boolean> = (file, api, options) => {
  const { j } = api;
  const opts = { ...options, parser: chooseParser(file.path) };
  const source = j(file.source, opts);

  return hasUseClient(j, source);
  // return source.toSource(); <- Note to myself to finish the codemod
};