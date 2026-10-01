export function waitForShutdown(close: () => Promise<void>, stdin = false) {
  return new Promise<void>((resolve, reject) => {
    let closing = false;
    const shutdown = () => {
      if (closing) return;
      closing = true;
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      process.stdin.off("end", shutdown);
      close().then(resolve, reject);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    if (stdin) process.stdin.once("end", shutdown);
  });
}
