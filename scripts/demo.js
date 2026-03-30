const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const clientDir = path.join(rootDir, "Client");
const npmCommand = "npm";
const nodeModulesDir = path.join(clientDir, "node_modules");
const useShell = process.platform === "win32";

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

async function ensureClientDependencies() {
  if (fs.existsSync(nodeModulesDir)) {
    return;
  }

  console.log("Client dependencies not found. Installing demo dependencies...");
  await runCommand(npmCommand, ["ci", "--prefix", "Client"], { cwd: rootDir });
}

async function startDemo() {
  await ensureClientDependencies();

  const child = spawn(npmCommand, ["start"], {
    cwd: clientDir,
    env: {
      ...process.env,
      VITE_DEMO_MODE: "true",
    },
    stdio: "inherit",
    shell: useShell,
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });

  child.on("error", (error) => {
    console.error("Failed to start the demo client:", error.message);
    process.exit(1);
  });

  const shutdown = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startDemo().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
