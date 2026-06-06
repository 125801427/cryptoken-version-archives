import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createServer } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "out");
const host = process.env.CRYPTOKEN_WEB_HOST || "127.0.0.1";
const port = Number(process.env.CRYPTOKEN_WEB_PORT || 4000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname.split("?")[0] || "/");
  const normalizedPath = normalize(decoded).replace(/^[\\/]+/, "").replace(/^(\.\.[/\\])+/, "");
  const candidates = [];
  if (!normalizedPath || normalizedPath === "." || normalizedPath === "/" || normalizedPath === "\\") {
    candidates.push(join(root, "index.html"));
  } else {
    candidates.push(join(root, normalizedPath));
    candidates.push(join(root, normalizedPath, "index.html"));
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith(root) || !existsSync(candidate)) continue;
    const fileStat = await stat(candidate);
    if (fileStat.isFile()) return { file: candidate, status: 200 };
  }

  return { file: join(root, "404.html"), status: 404 };
}

createServer(async (req, res) => {
  try {
    const { file, status } = await resolveFile(req.url || "/");
    const fileExists = existsSync(file);
    res.writeHead(fileExists ? status : 404, {
      "Content-Type": contentTypes[extname(file)] || "application/octet-stream",
      "Cache-Control": file.includes("_next") ? "public, max-age=31536000, immutable" : "no-store",
    });
    if (fileExists) {
      createReadStream(file).pipe(res);
      return;
    }
    res.end("Not found");
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal server error");
  }
}).listen(port, host, () => {
  console.log(`Cryptoken static web listening on http://${host}:${port}`);
});
