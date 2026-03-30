const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const clientDir = path.join(rootDir, "Client");
const nodeModulesDir = path.join(clientDir, "node_modules");
const npmCommand = "npm";
const useShell = process.platform === "win32";
const bridgePort = process.env.RETROBOARD_DEMO_JIRA_PORT || "3001";
const bridgeUrl = `http://localhost:${bridgePort}`;

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || rootDir,
      env: options.env || process.env,
      stdio: "inherit",
      shell: useShell,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code || 1}`));
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

function startChild(name, command, args, options = {}, onFailure) {
  const child = spawn(command, args, {
    cwd: options.cwd || rootDir,
    env: options.env || process.env,
    stdio: "inherit",
    shell: useShell,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}.`);
      onFailure(code);
    }
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${name}: ${error.message}`);
    onFailure(1);
  });

  return child;
}

async function ensureClientDependencies() {
  if (fs.existsSync(nodeModulesDir)) {
    return;
  }

  console.log("Client dependencies not found. Installing demo dependencies...");
  await runCommand(npmCommand, ["ci", "--prefix", "Client"], { cwd: rootDir });
}

async function startDemoWithJiraBridge() {
  await ensureClientDependencies();

  const children = [];
  let isShuttingDown = false;

  const stopAll = (signal = "SIGTERM") => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    children.forEach((child) => {
      if (!child.killed) {
        child.kill(signal);
      }
    });
  };

  const fail = (code) => {
    stopAll();
    process.exit(code || 1);
  };

  children.push(
    startChild(
      "demo Jira bridge",
      "node",
      [path.join("scripts", "demo-jira-bridge.js")],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          RETROBOARD_DEMO_JIRA_PORT: bridgePort,
        },
      },
      fail
    )
  );

  children.push(
    startChild(
      "demo client",
      npmCommand,
      ["start"],
      {
        cwd: clientDir,
        env: {
          ...process.env,
          VITE_DEMO_MODE: "true",
          VITE_DEMO_JIRA_BRIDGE_URL: bridgeUrl,
        },
      },
      fail
    )
  );

  console.log("RetroBoard demo with the live Jira bridge is starting on http://localhost:8081");
  console.log(`Local Jira bridge: ${bridgeUrl}`);

  process.on("SIGINT", () => stopAll("SIGINT"));
  process.on("SIGTERM", () => stopAll("SIGTERM"));
}

startDemoWithJiraBridge().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
