const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const clientDir = path.join(rootDir, "Client");
const serverDir = path.join(rootDir, "Server");
const npmCommand = "npm";
const useShell = process.platform === "win32";

function startProcess(name, cwd) {
  const child = spawn(npmCommand, ["start"], {
    cwd,
    stdio: "inherit",
    shell: useShell,
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exit(code || 1);
    }
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${name}:`, error.message);
    process.exit(1);
  });

  return child;
}

const processes = [
  startProcess("server", serverDir),
  startProcess("client", clientDir),
];

function shutdown(signal) {
  processes.forEach((child) => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
