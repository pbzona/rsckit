import chalk from "chalk";

type Printer = (msg?: string | number | Stat) => void;
type ConsoleMethod = "log" | "warn" | "error";
type Stat = { stat: string; value: string | number };

// State for silence
let isQuiet = false;

export const setQuiet = (quiet: boolean) => {
  isQuiet = quiet;
};

// Helpers for printing output from CLI commands
function createPrinter(
  callable: Printer = (msg) => msg,
  prefix = "",
  consoleMethod: ConsoleMethod = "log",
  alwaysPrint = false,
): Printer {
  return (msg = "") => {
    if (alwaysPrint || !isQuiet) {
      console[consoleMethod](`${prefix}${callable(msg)}`);
    }
  };
}

export const printHeading = createPrinter(chalk.bold.blueBright);

export const printHeadingAlt = createPrinter(chalk.bold.yellow);
export const printMessage = createPrinter();
export const printNewLine = () => {
  if (!isQuiet) console.log();
};
export const printMessageListItem = createPrinter((msg) => msg, "- ");
export const printStat = createPrinter(
  (msg: Stat) => `${chalk.bold(msg.stat)}: ${msg.value}`,
);

export const printSuccess = createPrinter(chalk.green, "", "log", true);
export const printWarning = createPrinter(chalk.yellow, "✋ ", "warn", true);
export const printError = createPrinter(chalk.red, "🚫 ", "error", true);

// Just having a lil fun :~)
export const debug = createPrinter(chalk.magenta, "🐛 > ");

// Semantic Printers
export const printPageCreation = createPrinter(
  chalk.green.bold,
  "Creating page ",
);
export const printCacheHit = createPrinter(chalk.gray, "Read from cache ");
