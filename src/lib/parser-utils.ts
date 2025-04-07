import babylonParse from 'jscodeshift/parser/babylon.js';
import tsParse from 'jscodeshift/parser/ts.js';
import tsxParse from 'jscodeshift/parser/tsx.js';

const isDeclarationFile = (filePath: string) => /\.d\.(m|c)?ts$/.test(filePath)
const isTsFile = (filePath: string) => /\.(m|c)?.ts$/.test(filePath)

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

export function canBeParsed(filePath: string) {
  return (
    !isDeclarationFile(filePath) &&
    /\.(m|c)?(t|j)sx?$/.test(filePath)
  )
}
