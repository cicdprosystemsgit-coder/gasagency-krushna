/**
 * GasAgency Enterprise QA & Deployed App Testing Platform
 * Standalone Node.js HTTP Server + Live URL Probing Proxy + Load Testing Engine
 * Zero External Dependencies (Node.js 18+ native http/https)
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 5050;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/**
 * Handle Live Endpoint Probe (bypasses browser CORS for external deployed URLs)
 */
function handleProbe(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const targetUrl = parsedUrl.query.target;

  if (!targetUrl) {
    res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ error: "Missing ?target= parameter" }));
    return;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ error: "Invalid target URL format" }));
    return;
  }

  const client = parsedTarget.protocol === "https:" ? https : http;
  const startTime = Date.now();

  const options = {
    method: "GET",
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (parsedTarget.protocol === "https:" ? 443 : 80),
    path: parsedTarget.pathname + parsedTarget.search,
    headers: {
      "User-Agent": "GasAgency-QA-Prober/2.0 (Enterprise QA Testing Suite)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    timeout: 10000,
  };

  const probeReq = client.request(options, (probeRes) => {
    const latency = Date.now() - startTime;
    let rawBody = "";

    probeRes.on("data", (chunk) => {
      if (rawBody.length < 50000) {
        rawBody += chunk.toString("utf8");
      }
    });

    probeRes.on("end", () => {
      const securityHeaders = {
        hsts: !!probeRes.headers["strict-transport-security"],
        csp: !!probeRes.headers["content-security-policy"],
        xFrameOptions: probeRes.headers["x-frame-options"] || null,
        xContentTypeOptions: probeRes.headers["x-content-type-options"] || null,
      };

      const hasViewportMeta = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(rawBody);
      const titleMatch = rawBody.match(/<title[^>]*>([^<]+)<\/title>/i);

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({
        status: "success",
        target: targetUrl,
        statusCode: probeRes.statusCode,
        statusMessage: probeRes.statusMessage,
        latencyMs: latency,
        protocol: parsedTarget.protocol,
        headers: probeRes.headers,
        securityHeaders,
        checks: {
          is200Ok: probeRes.statusCode >= 200 && probeRes.statusCode < 400,
          isHttps: parsedTarget.protocol === "https:",
          hasViewportMeta,
          hasHsts: securityHeaders.hsts,
          title: titleMatch ? titleMatch[1].trim() : null,
          contentLength: probeRes.headers["content-length"] || rawBody.length,
        },
      }));
    });
  });

  probeReq.on("error", (err) => {
    const latency = Date.now() - startTime;
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      status: "error",
      target: targetUrl,
      latencyMs: latency,
      error: err.message,
      errorCode: err.code || "CONNECTION_FAILED",
    }));
  });

  probeReq.on("timeout", () => {
    probeReq.destroy();
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      status: "error",
      target: targetUrl,
      latencyMs: 10000,
      error: "Connection timed out after 10000ms",
      errorCode: "TIMEOUT",
    }));
  });

  probeReq.end();
}

/**
 * Handle Load & Stress Testing via Server-Sent Events (SSE)
 * Market-standard performance benchmarking: k6 / Artillery / Postman Runner style
 */
function handleLoadTestStream(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const targetUrl = parsedUrl.query.target;
  const count = Math.min(Math.max(parseInt(parsedUrl.query.count, 10) || 50, 5), 1000);
  const concurrency = Math.min(Math.max(parseInt(parsedUrl.query.concurrency, 10) || 5, 1), 50);
  const method = (parsedUrl.query.method || "GET").toUpperCase();
  const delayMs = Math.max(parseInt(parsedUrl.query.delay, 10) || 0, 0);

  if (!targetUrl) {
    res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ error: "Missing ?target= parameter" }));
    return;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ error: "Invalid target URL" }));
    return;
  }

  // Setup Server-Sent Events stream
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const sendEvent = (eventType, data) => {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("init", {
    target: targetUrl,
    totalRequests: count,
    concurrency,
    method,
    startTime: Date.now(),
  });

  let activeRequests = 0;
  let completedCount = 0;
  let nextIndex = 0;
  let aborted = false;

  const results = [];
  const overallStartTime = Date.now();

  req.on("close", () => {
    aborted = true;
  });

  const executeSingleRequest = (reqIndex) => {
    if (aborted) return;

    activeRequests++;
    const client = parsedTarget.protocol === "https:" ? https : http;
    const reqStartTime = Date.now();

    const options = {
      method,
      hostname: parsedTarget.hostname,
      port: parsedTarget.port || (parsedTarget.protocol === "https:" ? 443 : 80),
      path: parsedTarget.pathname + parsedTarget.search,
      headers: {
        "User-Agent": "GasAgency-QA-LoadTester/1.0",
        "Accept": "*/*",
        "Connection": "keep-alive",
      },
      timeout: 8000,
    };

    const loadReq = client.request(options, (loadRes) => {
      // Consume body to free socket
      loadRes.on("data", () => {});
      loadRes.on("end", () => {
        const latency = Date.now() - reqStartTime;
        activeRequests--;
        completedCount++;

        const resultItem = {
          index: reqIndex,
          status: loadRes.statusCode,
          latencyMs: latency,
          isRateLimited: loadRes.statusCode === 429,
          isSuccess: loadRes.statusCode >= 200 && loadRes.statusCode < 400,
          isServerError: loadRes.statusCode >= 500,
          retryAfter: loadRes.headers["retry-after"] || null,
        };
        results.push(resultItem);

        const elapsedSec = (Date.now() - overallStartTime) / 1000 || 0.001;
        const currentRps = (completedCount / elapsedSec).toFixed(1);

        sendEvent("progress", {
          completed: completedCount,
          total: count,
          latest: resultItem,
          currentRps: parseFloat(currentRps),
          activeConcurrency: activeRequests,
        });

        if (resultItem.isRateLimited) {
          sendEvent("ratelimit_alert", {
            triggeredAt: completedCount,
            status: 429,
            retryAfter: resultItem.retryAfter,
            message: `Target server triggered HTTP 429 Too Many Requests after ${completedCount} requests!`,
          });
        }

        checkAndQueue();
      });
    });

    loadReq.on("error", (err) => {
      const latency = Date.now() - reqStartTime;
      activeRequests--;
      completedCount++;

      const resultItem = {
        index: reqIndex,
        status: 0,
        latencyMs: latency,
        isRateLimited: false,
        isSuccess: false,
        isServerError: true,
        error: err.message,
      };
      results.push(resultItem);

      sendEvent("progress", {
        completed: completedCount,
        total: count,
        latest: resultItem,
        activeConcurrency: activeRequests,
      });

      checkAndQueue();
    });

    loadReq.on("timeout", () => {
      loadReq.destroy();
    });

    loadReq.end();
  };

  const checkAndQueue = () => {
    if (aborted) return;

    if (completedCount >= count) {
      finishLoadTest();
      return;
    }

    while (activeRequests < concurrency && nextIndex < count) {
      const idx = nextIndex++;
      if (delayMs > 0) {
        setTimeout(() => executeSingleRequest(idx), delayMs);
      } else {
        executeSingleRequest(idx);
      }
    }
  };

  const finishLoadTest = () => {
    const totalElapsedMs = Date.now() - overallStartTime;
    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

    const getPercentile = (p) => {
      if (latencies.length === 0) return 0;
      const idx = Math.min(Math.floor((p / 100) * latencies.length), latencies.length - 1);
      return latencies[idx];
    };

    const successCount = results.filter((r) => r.isSuccess).length;
    const rateLimitedCount = results.filter((r) => r.isRateLimited).length;
    const errorCount = results.filter((r) => r.isServerError || r.status === 0).length;

    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    const rps = (count / (totalElapsedMs / 1000)).toFixed(1);

    const summary = {
      targetUrl,
      totalRequests: count,
      concurrency,
      durationMs: totalElapsedMs,
      rps: parseFloat(rps),
      counts: {
        success: successCount,
        rateLimited: rateLimitedCount,
        serverErrors: errorCount,
        other: count - (successCount + rateLimitedCount + errorCount),
      },
      latencies: {
        min: latencies[0] || 0,
        avg: avgLatency,
        p50: getPercentile(50),
        p90: getPercentile(90),
        p95: getPercentile(95),
        p99: getPercentile(99),
        max: latencies[latencies.length - 1] || 0,
      },
      rateLimitDetected: rateLimitedCount > 0,
      resilienceVerdict:
        errorCount === 0 && rateLimitedCount === 0
          ? "HIGHLY_RESILIENT"
          : rateLimitedCount > 0
          ? "RATE_LIMITED_PROTECTED"
          : "SERVER_BOTTLENECK",
    };

    sendEvent("complete", summary);
    res.end();
  };

  // Kick off initial batch
  checkAndQueue();
}

/**
 * Static File Server with fallback to index.html
 */
const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // API Routes
  if (parsedUrl.pathname === "/api/probe") {
    handleProbe(req, res);
    return;
  }

  if (parsedUrl.pathname === "/api/load-test") {
    handleLoadTestStream(req, res);
    return;
  }

  if (parsedUrl.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
    return;
  }

  // Static File Serving
  let relativePath = parsedUrl.pathname;
  if (relativePath === "/" || relativePath === "") {
    relativePath = "/index.html";
  }

  const filePath = path.join(PUBLIC_DIR, relativePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Fallback to index.html for SPA routing
        fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackErr, fallbackContent) => {
          if (fallbackErr) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 Not Found");
          } else {
            res.writeHead(200, { "Content-Type": "text/html; charset=UTF-8" });
            res.end(fallbackContent);
          }
        });
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`=======================================================`);
  console.log(`🚀 GasAgency Enterprise QA Testing Platform is Live!`);
  console.log(`🌐 Local URL:   http://localhost:${PORT}`);
  console.log(`⚡ Load Tester: http://localhost:${PORT}/api/load-test`);
  console.log(`📡 Probe API:   http://localhost:${PORT}/api/probe?target=https://your-app.com`);
  console.log(`👥 Target Role: Dedicated QA & Automation Testing Team`);
  console.log(`=======================================================`);
});
