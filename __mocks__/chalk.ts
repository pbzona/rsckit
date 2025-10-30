// Mock for chalk to handle ESM issues in Jest
const boldFn = (str: string) => str;
boldFn.blueBright = (str: string) => str;
boldFn.yellow = (str: string) => str;

const chalk = {
  bold: boldFn,
  green: (str: string) => str,
  yellow: (str: string) => str,
  red: (str: string) => str,
  magenta: (str: string) => str,
};

export default chalk;
