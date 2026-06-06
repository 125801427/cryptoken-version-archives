import { spawn } from "node:child_process";

const children = [
  spawn("node", ["server/index.mjs"], { shell: true, stdio: "inherit" }),
  spawn("node", ["server/static.mjs"], { shell: true, stdio: "inherit" }),
];

function shutdown() {
  for (const child of children) {
    child.kill();
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
}
