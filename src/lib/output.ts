import chalk, { ChalkInstance } from 'chalk';

type Printer = (msg: any) => void;
type ConsoleMethod = 'log' | 'warn' | 'error';

// Helpers for printing output from CLI commands
function createPrinter(callable: Printer = msg => msg, prefix = '', consoleMethod: ConsoleMethod = 'log'): Printer {
  return msg => console[consoleMethod](`${prefix}${callable(msg)}`);
}

export const printHeading = createPrinter(chalk.bold.blueBright);
export const printMessage = createPrinter();
export const printMessageListItem = createPrinter(msg => msg, '- ');
export const printSuccess = createPrinter(chalk.green);
export const printWarning = createPrinter(chalk.yellow);
export const printError = createPrinter(chalk.red);

// Just having a lil fun :~)
export const debug = createPrinter(chalk.magenta, '🐛 > ');