const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { URL } = require("node:url");
const { analyzeProject, ValidationError } = require("./cpm");

const PORT = Number(process.env.PORT || 3001);
const DIST_DIR = path.join(__dirname, "..", "frontend", "dist");
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  response.writeHead(200, {
    "Content-Type": contentType,
  });

  fs.createReadStream(filePath).pipe(response);
}

function tryServeStatic(urlPath, response) {
  if (!fs.existsSync(DIST_DIR)) {
    return false;
  }

  const normalizedPath = urlPath === "/" ? "/index.html" : urlPath;
  const safeRelativePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = path.join(DIST_DIR, safeRelativePath);
  const insideDist = requestedPath.startsWith(DIST_DIR);

  if (insideDist && fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    sendFile(response, requestedPath);
    return true;
  }

  if (!path.extname(normalizedPath)) {
    const indexPath = path.join(DIST_DIR, "index.html");

    if (fs.existsSync(indexPath)) {
      sendFile(response, indexPath);
      return true;
    }
  }

  return false;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();

      if (body.length > 1_000_000) {
        reject(new ValidationError("Payload jest zbyt duzy."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new ValidationError("Nie udalo sie odczytac danych JSON."));
      }
    });

    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, JSON_HEADERS);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      service: "projekt-bojler-backend",
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cpm/analyze") {
    try {
      const payload = await readJsonBody(request);
      const result = analyzeProject(payload.tasks ?? []);
      sendJson(response, 200, result);
    } catch (error) {
      const statusCode = error instanceof ValidationError ? 400 : 500;
      sendJson(response, statusCode, {
        message:
          error instanceof ValidationError
            ? error.message
            : "Wystapil nieoczekiwany blad podczas analizy CPM.",
      });
    }
    return;
  }

  if (request.method === "GET" && tryServeStatic(url.pathname, response)) {
    return;
  }

  sendJson(response, 404, {
    message: "Nie znaleziono zasobu.",
  });
});

server.listen(PORT, () => {
  console.log(`CPM backend listening on http://localhost:${PORT}`);
});
