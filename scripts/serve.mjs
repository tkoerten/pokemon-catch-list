import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 4173);
const serveHost = process.env.SERVE_HOST || "127.0.0.1";
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json" };

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = pathname.replace(/^\/pokemon-catch-list\/?/, "").replace(/^\/+/, "") || "index.html";
    const file = normalize(join(root, relative));
    if (!file.startsWith(normalize(root))) throw new Error("Invalid path");
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, "index.html") : file;
    response.writeHead(200, { "content-type": types[extname(target)] || "application/octet-stream", "cache-control": "no-store" });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, serveHost, () => console.log(`Catch List: http://${serveHost}:${port}/pokemon-catch-list/`));
