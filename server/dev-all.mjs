import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const webCommand =
  process.platform === "win32"
    ? ["cmd.exe", ["/d", "/s", "/c", `${npm} run dev -- --webpack --hostname 127.0.0.1 --port 4000`]]
    : [npm, ["run", "dev", "--", "--webpack", "--hostname", "127.0.0.1", "--port", "4000"]];
const children = [
  spawn(process.execPath, ["server/index.mjs"], { stdio: "inherit" }),
  spawn(webCommand[0], webCommand[1], { stdio: "inherit" }),
];

function stopAll(signal = "SIGTERM") {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on("SIGINT", () => {
  stopAll("SIGINT");
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopAll("SIGTERM");
  process.exit(143);
});

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}
