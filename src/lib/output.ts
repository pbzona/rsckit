import chalk from 'chalk';

type Printer = (msg?: string | number | Stat) => void;
type ConsoleMethod = 'log' | 'warn' | 'error';
type Stat = { stat: string, value: string | number; };

// Helpers for printing output from CLI commands
function createPrinter(callable: Printer = msg => msg, prefix = '', consoleMethod: ConsoleMethod = 'log'): Printer {
  return (msg = '') => console[consoleMethod](`${prefix}${callable(msg)}`);
}

export const printHeading = createPrinter(chalk.bold.blueBright);
export const printHeadingAlt = createPrinter(chalk.bold.yellow);
export const printMessage = createPrinter();
export const printNewLine = () => console.log();
export const printMessageListItem = createPrinter(msg => msg, '- ');
export const printStat = createPrinter((msg: Stat) =>
  (`${chalk.bold(msg.stat)}: ${msg.value}`)
);

export const printSuccess = createPrinter(chalk.green);
export const printWarning = createPrinter(chalk.yellow, '✋ ', 'warn');
export const printError = createPrinter(chalk.red, '🚫 ', 'error');

// Just having a lil fun :~)
export const debug = createPrinter(chalk.magenta, '🐛 > ');
