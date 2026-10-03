import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("out");
const port = Number(process.env.PORT || 3000);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

async function resolveExportedFile(file) {
  try {
    if ((await stat(file)).isDirectory()) return path.join(file, "index.html");
    return file;
  } catch (error) {
    const match = path.basename(file).match(/^(.+)\.__PAGE__\.txt$/);
    if (!match) throw error;
    const windowsSegmentPath = path.join(path.dirname(file), match[1], "__PAGE__.txt");
    await stat(windowsSegmentPath);
    return windowsSegmentPath;
  }
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("Path outside export directory");
    file = await resolveExportedFile(file);
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream" });
    response.end(body);
  } catch {
    try {
      const body = await readFile(path.join(root, "404.html"));
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(body);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Static preview ready at http://127.0.0.1:${port}`);
});
