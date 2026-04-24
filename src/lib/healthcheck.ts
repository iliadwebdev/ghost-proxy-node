import https from "https";
import chalk from "chalk";
import http from "http";

function checkTarget(
  name: string,
  url: string,
  timeout = 5000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const { hostname, port, protocol } = new URL(url);
    const transport = protocol === "https:" ? https : http;

    const req = transport.request(
      {
        port: port || (protocol === "https:" ? 443 : 80),
        method: "HEAD",
        path: "/",
        hostname,
        timeout,
      },
      (res) => {
        res.resume();

        console.log(
          `${chalk.green(`  ✓ ${name}`)} ${chalk.gray(` (${url}) — status ${res.statusCode}`)}`,
        );

        resolve(true);
      },
    );

    function handleRequestTimeout() {
      req.destroy();

      console.warn(
        `${chalk.red(`  ✗ ${name}`)} ${chalk.gray(` (${url}) — timed out after ${timeout}ms`)}`,
      );

      resolve(false);
    }

    function handleRequestError(err: Error) {
      console.warn(
        `${chalk.red(`  ✗ ${name}`)} ${chalk.gray(` (${url}) — ${err.message}`)}`,
      );

      resolve(false);
    }

    req.on("timeout", handleRequestTimeout);
    req.on("error", handleRequestError);

    req.end();
  });
}

export async function checkTargets(
  targets: Record<string, string>,
): Promise<void> {
  console.log(chalk.bold("Checking proxy targets…"));

  const checkTargetPromises = Object.entries(targets).map(([name, url]) => {
    return checkTarget(name, url);
  });

  const results = await Promise.all(checkTargetPromises);

  if (results.every(Boolean)) {
    console.log(chalk.green.bold("All targets reachable."));
  } else {
    console.warn(
      `${chalk.yellow.bold("  ⚠ Some targets are unreachable — proxy will start anyway.")}`,
    );
  }
}
