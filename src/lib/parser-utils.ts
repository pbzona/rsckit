import * as path from "node:path";
import babylonParse from 'jscodeshift/parser/babylon.js';
import tsParse from 'jscodeshift/parser/ts.js';
import tsxParse from 'jscodeshift/parser/tsx.js';

const isDeclarationFile = (filePath: string) => (
  path.parse(filePath).name.endsWith('.d') && path.parse(filePath).ext === '.ts'
);
const isTsFile = (filePath: string) => path.parse(filePath).ext === '.ts';
const isTsxFile = (filePath: string) => path.parse(filePath).ext === '.tsx';
const isJsFile = (filePath: string) => path.parse(filePath).ext === '.js';
const isJsxFile = (filePath: string) => path.parse(filePath).ext === '.jsx';

export function chooseParser(filePath: string) {
  if (isDeclarationFile(filePath)) {
    return babylonParse();
  }

  // Thank you Jiachi 🙏 - https://github.com/vercel/next.js/pull/71122
  // jsx is allowed in .js files, feed them into the tsx parser.
  // tsx parser .js, .jsx, .tsx
  // ts parser: .ts, .mts, .cts
  return isTsFile(filePath) ? tsParse() : tsxParse();
}

export function mightContainReactComponent(filePath: string) {
  return isTsxFile(filePath) ||
    isJsxFile(filePath) ||
    isJsFile(filePath);
}
