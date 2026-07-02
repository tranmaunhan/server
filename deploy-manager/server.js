const crypto = require("node:crypto");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { spawn } = require("node:child_process");
const express = require("express");

const SERVICE_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const HOSTNAME_PATTERN = /^(?:\*\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
const HTTP_METHODS = new Set(["GET", "HEAD"]);

loadDotEnv();

const DEPLOY_ADDR = envOrDefault("DEPLOY_ADDR", ":8080");
const DEPLOY_TOKEN = requiredEnv("DEPLOY_TOKEN");
const DEPLOY_ADMIN_TOKEN = envOrDefault("DEPLOY_ADMIN_TOKEN", DEPLOY_TOKEN);
const DEPLOY_CONFIG = envOrDefault("DEPLOY_CONFIG", "/data/apps.json");
const ROUTES_CONFIG = envOrDefault("ROUTES_CONFIG", "/data/routes.json");
const DEPLOY_AUDIT_LOG = envOrDefault("DEPLOY_AUDIT_LOG", "/data/deployments.log");
const COMPOSE_PROJECT_DIR = envOrDefault("COMPOSE_PROJECT_DIR", "/workspace");
const COMPOSE_FILE_PATH = envOrDefault("COMPOSE_FILE_PATH", "/workspace/docker-compose.yml");
const COMPOSE_ENV_FILE = envOrDefault("COMPOSE_ENV_FILE", "");
const UI_ENABLED = envOrDefault("DEPLOY_UI_ENABLED", "true") === "true";
const NGINX_GENERATED_CONFIG = envOrDefault(
  "NGINX_GENERATED_CONFIG",
  "/workspace/nginx/conf.d/zz-generated-routes.conf",
);
const NGINX_CONTAINER_NAME = envOrDefault("NGINX_CONTAINER_NAME", "nginx-gateway");
const NGINX_MANAGEMENT_ENABLED = envOrDefault("NGINX_MANAGEMENT_ENABLED", "true") === "true";
const DEFAULT_HEALTH_TIMEOUT_MS = positiveInt(envOrDefault("HEALTHCHECK_TIMEOUT_MS", "60000"));
const DEFAULT_HEALTH_INTERVAL_MS = positiveInt(envOrDefault("HEALTHCHECK_INTERVAL_MS", "3000"));

const state = {
  apps: new Map(),
  routes: new Map(),
  deployBusy: false,
  composeRunner: null,
  deployQueue: [],
  jobs: new Map(),
  jobOrder: [],
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  validateRuntimeConfig();

  state.apps = await loadApps(DEPLOY_CONFIG);
  state.routes = await loadRoutes(ROUTES_CONFIG, state.apps);

  try {
    await writeGeneratedNginxConfig();
  } catch (error) {
    console.warn(`warn: cannot render nginx config on startup: ${error.message}`);
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "512kb" }));

  if (UI_ENABLED) {
    app.use("/ui", express.static(path.join(__dirname, "public")));
    app.get("/", (_req, res) => {
      res.redirect("/ui/");
    });
  }

  app.use((req, _res, next) => {
    req.startedAt = Date.now();
    next();
  });

  app.use((req, res, next) => {
    res.on("finish", () => {
      console.log(`${req.method} ${req.originalUrl} ${Date.now() - req.startedAt}ms`);
    });
    next();
  });

  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      busy: state.deployBusy,
      queueLength: state.deployQueue.length,
      appCount: state.apps.size,
      routeCount: state.routes.size,
      composeProjectDir: COMPOSE_PROJECT_DIR,
      composeFilePath: COMPOSE_FILE_PATH,
      nginxManagementEnabled: NGINX_MANAGEMENT_ENABLED,
    });
  });

  app.get("/apps", requireDeployToken, (_req, res) => {
    res.json({
      apps: sortedApps()
        .filter((item) => item.enabled)
        .map((item) => publicAppView(item)),
    });
  });

  app.post("/deploy", requireDeployToken, asyncHandler(async (req, res) => {
    assertAllowedKeys(req.body, ["serviceName"]);
    const deployRequest = normalizeDeployRequest(req.body);
    const appConfig = state.apps.get(deployRequest.serviceName);
    if (!appConfig || !appConfig.enabled) {
      throw httpError(404, "serviceName is not allowlisted");
    }

    const job = enqueueDeployJob(appConfig);
    processDeployQueue().catch((error) => {
      console.error(`background deploy queue failed: ${error.message}`);
    });

    res.status(202).json({
      ok: true,
      accepted: true,
      jobId: job.id,
      serviceName: job.serviceName,
      composeService: job.composeService,
      status: job.status,
      queueLength: state.deployQueue.length,
    });
  }));

  app.get("/jobs/:id", requireDeployToken, (req, res) => {
    const job = state.jobs.get(req.params.id);
    if (!job) {
      throw httpError(404, "job not found");
    }
    res.json({ ok: true, job: publicJobView(job) });
  });

  app.get("/admin/apps", requireAdminToken, (_req, res) => {
    res.json({ apps: sortedApps() });
  });

  app.post("/admin/apps", requireAdminToken, asyncHandler(async (req, res) => {
    const appConfig = normalizeAppConfig(req.body);
    validateAppConfig(appConfig);
    if (state.apps.has(appConfig.serviceName)) {
      throw httpError(409, "service already exists");
    }

    state.apps.set(appConfig.serviceName, appConfig);
    try {
      await saveApps();
      await writeGeneratedNginxConfig();
    } catch (error) {
      state.apps.delete(appConfig.serviceName);
      throw error;
    }

    res.status(201).json({ ok: true, app: appConfig });
  }));

  app.get("/admin/apps/:serviceName", requireAdminToken, (req, res) => {
    const appConfig = state.apps.get(req.params.serviceName);
    if (!appConfig) {
      throw httpError(404, "service not found");
    }
    res.json({ app: appConfig });
  });

  app.put("/admin/apps/:serviceName", requireAdminToken, asyncHandler(async (req, res) => {
    if (req.body.serviceName && req.body.serviceName !== req.params.serviceName) {
      throw httpError(400, "path serviceName and body serviceName must match");
    }

    const nextConfig = normalizeAppConfig({
      ...req.body,
      serviceName: req.params.serviceName,
    });
    validateAppConfig(nextConfig);

    const previous = state.apps.get(req.params.serviceName);
    if (!previous) {
      throw httpError(404, "service not found");
    }

    state.apps.set(req.params.serviceName, nextConfig);
    try {
      validateRoutesAgainstApps(state.routes, state.apps);
      await saveApps();
      await saveRoutes();
      await writeGeneratedNginxConfig();
    } catch (error) {
      state.apps.set(req.params.serviceName, previous);
      throw error;
    }

    res.json({ ok: true, app: nextConfig });
  }));

  app.patch("/admin/apps/:serviceName", requireAdminToken, asyncHandler(async (req, res) => {
    const previous = state.apps.get(req.params.serviceName);
    if (!previous) {
      throw httpError(404, "service not found");
    }

    assertAllowedKeys(req.body, [
      "enabled",
      "displayName",
      "composeService",
      "image",
      "healthCheckUrl",
      "healthCheckMethod",
      "healthCheckExpectedStatus",
      "healthCheckTimeoutMs",
      "healthCheckIntervalMs",
    ]);

    const nextConfig = normalizeAppConfig({
      ...previous,
      ...req.body,
      serviceName: req.params.serviceName,
    });
    validateAppConfig(nextConfig);

    state.apps.set(req.params.serviceName, nextConfig);
    try {
      validateRoutesAgainstApps(state.routes, state.apps);
      await saveApps();
      await saveRoutes();
      await writeGeneratedNginxConfig();
    } catch (error) {
      state.apps.set(req.params.serviceName, previous);
      throw error;
    }

    res.json({ ok: true, app: nextConfig });
  }));

  app.delete("/admin/apps/:serviceName", requireAdminToken, asyncHandler(async (req, res) => {
    if (routeReferencesService(req.params.serviceName)) {
      throw httpError(409, "cannot delete service while nginx routes still reference it");
    }

    const previous = state.apps.get(req.params.serviceName);
    if (!previous) {
      throw httpError(404, "service not found");
    }

    state.apps.delete(req.params.serviceName);
    try {
      await saveApps();
    } catch (error) {
      state.apps.set(req.params.serviceName, previous);
      throw error;
    }

    res.json({ ok: true, deleted: req.params.serviceName });
  }));

  app.get("/admin/routes", requireAdminToken, (_req, res) => {
    res.json({ routes: sortedRoutes() });
  });

  app.post("/admin/routes", requireAdminToken, asyncHandler(async (req, res) => {
    const routeConfig = normalizeRouteConfig(req.body);
    validateRouteConfig(routeConfig, state.routes, state.apps);
    if (state.routes.has(routeConfig.id)) {
      throw httpError(409, "route already exists");
    }

    state.routes.set(routeConfig.id, routeConfig);
    try {
      await saveRoutes();
      await writeGeneratedNginxConfig();
    } catch (error) {
      state.routes.delete(routeConfig.id);
      throw error;
    }

    res.status(201).json({ ok: true, route: routeConfig });
  }));

  app.get("/admin/routes/:id", requireAdminToken, (req, res) => {
    const routeConfig = state.routes.get(req.params.id);
    if (!routeConfig) {
      throw httpError(404, "route not found");
    }
    res.json({ route: routeConfig });
  });

  app.put("/admin/routes/:id", requireAdminToken, asyncHandler(async (req, res) => {
    if (req.body.id && req.body.id !== req.params.id) {
      throw httpError(400, "path id and body id must match");
    }

    const nextConfig = normalizeRouteConfig({
      ...req.body,
      id: req.params.id,
    });
    const previous = state.routes.get(req.params.id);
    state.routes.set(req.params.id, nextConfig);
    try {
      validateRouteConfig(nextConfig, state.routes, state.apps);
      await saveRoutes();
      await writeGeneratedNginxConfig();
    } catch (error) {
      if (previous) {
        state.routes.set(req.params.id, previous);
      } else {
        state.routes.delete(req.params.id);
      }
      throw error;
    }

    res.json({ ok: true, route: nextConfig });
  }));

  app.patch("/admin/routes/:id", requireAdminToken, asyncHandler(async (req, res) => {
    const previous = state.routes.get(req.params.id);
    if (!previous) {
      throw httpError(404, "route not found");
    }

    assertAllowedKeys(req.body, ["enabled", "hostname", "pathPrefix", "serviceName", "targetPort"]);

    const nextConfig = normalizeRouteConfig({
      ...previous,
      ...req.body,
      id: req.params.id,
    });
    state.routes.set(req.params.id, nextConfig);
    try {
      validateRouteConfig(nextConfig, state.routes, state.apps);
      await saveRoutes();
      await writeGeneratedNginxConfig();
    } catch (error) {
      state.routes.set(req.params.id, previous);
      throw error;
    }

    res.json({ ok: true, route: nextConfig });
  }));

  app.delete("/admin/routes/:id", requireAdminToken, asyncHandler(async (req, res) => {
    const previous = state.routes.get(req.params.id);
    if (!previous) {
      throw httpError(404, "route not found");
    }

    state.routes.delete(req.params.id);
    try {
      await saveRoutes();
      await writeGeneratedNginxConfig();
    } catch (error) {
      state.routes.set(req.params.id, previous);
      throw error;
    }

    res.json({ ok: true, deleted: req.params.id });
  }));

  app.get("/admin/nginx/preview", requireAdminToken, asyncHandler(async (_req, res) => {
    const content = await writeGeneratedNginxConfig();
    res.json({ ok: true, path: NGINX_GENERATED_CONFIG, content });
  }));

  app.post("/admin/nginx/apply", requireAdminToken, asyncHandler(async (_req, res) => {
    if (!NGINX_MANAGEMENT_ENABLED) {
      throw httpError(400, "nginx management is disabled");
    }

    const content = await writeGeneratedNginxConfig();
    const result = await applyNginxConfig();
    res.json({
      ok: true,
      path: NGINX_GENERATED_CONFIG,
      containerName: NGINX_CONTAINER_NAME,
      content,
      ...result,
    });
  }));

  app.get("/admin/deployments", requireAdminToken, asyncHandler(async (_req, res) => {
    res.json({ deployments: await readAuditLog() });
  }));

  app.get("/admin/jobs", requireAdminToken, (_req, res) => {
    res.json({ jobs: listJobs() });
  });

  app.use((error, _req, res, _next) => {
    const status = error.statusCode || 500;
    res.status(status).json({
      ok: false,
      error: status >= 500 && error.expose === false ? "internal server error" : error.message,
    });
  });

  const { host, port } = parseListenAddress(DEPLOY_ADDR);
  app.listen(port, host, () => {
    console.log(`deploy-manager listening on ${host}:${port}`);
  });
}

function requireDeployToken(req, _res, next) {
  if (!constantTimeMatch(readBearerToken(req), DEPLOY_TOKEN)) {
    next(httpError(401, "invalid deploy token"));
    return;
  }
  next();
}

function requireAdminToken(req, _res, next) {
  if (!constantTimeMatch(readBearerToken(req), DEPLOY_ADMIN_TOKEN)) {
    next(httpError(401, "invalid admin token"));
    return;
  }
  next();
}

function readBearerToken(req) {
  const header = String(req.header("authorization") || "").trim();
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return String(req.header("x-deploy-token") || req.header("x-admin-token") || "").trim();
}

function constantTimeMatch(left, right) {
  const a = Buffer.from((left || "").trim());
  const b = Buffer.from((right || "").trim());
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

async function loadApps(configPath) {
  const items = await loadConfigArray(configPath, "apps");
  const apps = new Map();
  for (const item of items) {
    const appConfig = normalizeAppConfig(item);
    validateAppConfig(appConfig);
    apps.set(appConfig.serviceName, appConfig);
  }
  return apps;
}

async function loadRoutes(configPath, apps) {
  const items = await loadConfigArray(configPath, "routes");
  const routes = new Map();
  for (const item of items) {
    const routeConfig = normalizeRouteConfig(item);
    routes.set(routeConfig.id, routeConfig);
  }
  validateRoutesAgainstApps(routes, apps);
  for (const route of routes.values()) {
    validateRouteConfig(route, routes, apps);
  }
  return routes;
}

async function loadConfigArray(configPath, key) {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    assertAllowedKeys(parsed, [key]);
    if (!Array.isArray(parsed[key])) {
      throw new Error(`${key} must be an array`);
    }
    return parsed[key];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function normalizeDeployRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw httpError(400, "request body must be a JSON object");
  }

  const serviceName = String(payload.serviceName || "").trim();
  if (!serviceName) {
    throw httpError(400, "serviceName is required");
  }

  return { serviceName };
}

function normalizeAppConfig(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw httpError(400, "request body must be a JSON object");
  }

  assertAllowedKeys(payload, [
    "serviceName",
    "displayName",
    "enabled",
    "composeService",
    "image",
    "healthCheckUrl",
    "healthCheckMethod",
    "healthCheckExpectedStatus",
    "healthCheckTimeoutMs",
    "healthCheckIntervalMs",
  ]);

  return {
    serviceName: String(payload.serviceName || "").trim(),
    displayName: String(payload.displayName || "").trim(),
    enabled: payload.enabled !== false,
    composeService: String(payload.composeService || "").trim() || String(payload.serviceName || "").trim(),
    image: String(payload.image || "").trim(),
    healthCheckUrl: String(payload.healthCheckUrl || "").trim(),
    healthCheckMethod: String(payload.healthCheckMethod || "GET").trim().toUpperCase(),
    healthCheckExpectedStatus: normalizeStatusCode(payload.healthCheckExpectedStatus, 200),
    healthCheckTimeoutMs: normalizeOptionalPositiveInt(payload.healthCheckTimeoutMs, DEFAULT_HEALTH_TIMEOUT_MS),
    healthCheckIntervalMs: normalizeOptionalPositiveInt(payload.healthCheckIntervalMs, DEFAULT_HEALTH_INTERVAL_MS),
  };
}

function normalizeRouteConfig(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw httpError(400, "request body must be a JSON object");
  }

  assertAllowedKeys(payload, ["id", "enabled", "hostname", "pathPrefix", "serviceName", "targetPort"]);

  const rawPathPrefix = String(payload.pathPrefix || "/").trim() || "/";
  const normalizedPathPrefix = rawPathPrefix === "/" ? "/" : rawPathPrefix.replace(/\/+$/, "");

  return {
    id: String(payload.id || "").trim(),
    enabled: payload.enabled !== false,
    hostname: String(payload.hostname || "").trim().toLowerCase(),
    pathPrefix: normalizedPathPrefix.startsWith("/") ? normalizedPathPrefix : `/${normalizedPathPrefix}`,
    serviceName: String(payload.serviceName || "").trim(),
    targetPort: Number.parseInt(String(payload.targetPort ?? ""), 10),
  };
}

function validateAppConfig(appConfig) {
  if (!SERVICE_PATTERN.test(appConfig.serviceName)) {
    throw httpError(400, "serviceName must match ^[a-z0-9][a-z0-9-]{0,62}$");
  }
  if (appConfig.displayName && appConfig.displayName.length > 120) {
    throw httpError(400, "displayName is too long");
  }
  if (!NAME_PATTERN.test(appConfig.composeService)) {
    throw httpError(400, "composeService is invalid");
  }
  if (appConfig.image && appConfig.image.length > 255) {
    throw httpError(400, "image is too long");
  }
  if (appConfig.healthCheckUrl) {
    let parsed;
    try {
      parsed = new URL(appConfig.healthCheckUrl);
    } catch (_error) {
      throw httpError(400, "healthCheckUrl is invalid");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw httpError(400, "healthCheckUrl must use http or https");
    }
  }
  if (!HTTP_METHODS.has(appConfig.healthCheckMethod)) {
    throw httpError(400, "healthCheckMethod must be GET or HEAD");
  }
  if (appConfig.healthCheckExpectedStatus < 100 || appConfig.healthCheckExpectedStatus > 599) {
    throw httpError(400, "healthCheckExpectedStatus is invalid");
  }
  if (appConfig.healthCheckIntervalMs > appConfig.healthCheckTimeoutMs) {
    throw httpError(400, "healthCheckIntervalMs must be less than or equal to healthCheckTimeoutMs");
  }
}

function validateRouteConfig(routeConfig, routes, apps) {
  if (!SERVICE_PATTERN.test(routeConfig.id)) {
    throw httpError(400, "route id must match ^[a-z0-9][a-z0-9-]{0,62}$");
  }
  if (!HOSTNAME_PATTERN.test(routeConfig.hostname)) {
    throw httpError(400, "hostname is invalid");
  }
  if (!routeConfig.pathPrefix.startsWith("/")) {
    throw httpError(400, "pathPrefix must start with /");
  }
  if (routeConfig.pathPrefix.includes(" ") || routeConfig.pathPrefix.includes("?")) {
    throw httpError(400, "pathPrefix is invalid");
  }
  if (!apps.has(routeConfig.serviceName)) {
    throw httpError(400, "route serviceName must reference an existing app");
  }
  if (!Number.isInteger(routeConfig.targetPort) || routeConfig.targetPort < 1 || routeConfig.targetPort > 65535) {
    throw httpError(400, "targetPort must be a valid port");
  }
  for (const item of routes.values()) {
    if (item.id === routeConfig.id) {
      continue;
    }
    if (item.hostname === routeConfig.hostname && item.pathPrefix === routeConfig.pathPrefix) {
      throw httpError(409, "another route already uses the same hostname and pathPrefix");
    }
  }
}

function validateRoutesAgainstApps(routes, apps) {
  for (const route of routes.values()) {
    if (!apps.has(route.serviceName)) {
      throw httpError(400, `route "${route.id}" references a service that does not exist`);
    }
  }
}

async function runHealthCheck(appConfig) {
  if (!appConfig.healthCheckUrl) {
    return {
      enabled: false,
      status: "skipped",
    };
  }

  const deadline = Date.now() + appConfig.healthCheckTimeoutMs;
  let lastError = "health check did not return a successful status";

  while (Date.now() <= deadline) {
    try {
      const result = await httpHealthCheck(appConfig);
      return {
        enabled: true,
        status: "healthy",
        url: appConfig.healthCheckUrl,
        expectedStatus: appConfig.healthCheckExpectedStatus,
        receivedStatus: result.statusCode,
      };
    } catch (error) {
      lastError = error.message;
    }
    await sleep(appConfig.healthCheckIntervalMs);
  }

  throw httpError(500, `health check failed: ${lastError}`);
}

function httpHealthCheck(appConfig) {
  const target = new URL(appConfig.healthCheckUrl);
  const transport = target.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: appConfig.healthCheckMethod,
      timeout: Math.min(appConfig.healthCheckIntervalMs, appConfig.healthCheckTimeoutMs),
    }, (response) => {
      response.resume();
      if (response.statusCode !== appConfig.healthCheckExpectedStatus) {
        reject(new Error(`received status ${response.statusCode}`));
        return;
      }
      resolve({ statusCode: response.statusCode });
    });

    request.on("timeout", () => {
      request.destroy(new Error("request timed out"));
    });
    request.on("error", reject);
    request.end();
  });
}

async function saveApps() {
  await saveConfigArray(DEPLOY_CONFIG, "apps", sortedApps());
}

async function saveRoutes() {
  await saveConfigArray(ROUTES_CONFIG, "routes", sortedRoutes());
}

async function saveConfigArray(configPath, key, items) {
  const data = JSON.stringify({ [key]: items }, null, 2) + "\n";
  await fs.mkdir(path.posix.dirname(configPath), { recursive: true });
  const tempPath = `${configPath}.tmp`;
  await fs.writeFile(tempPath, data, "utf8");
  await fs.rename(tempPath, configPath);
}

function sortedApps() {
  return [...state.apps.values()].sort((left, right) => left.serviceName.localeCompare(right.serviceName));
}

function sortedRoutes() {
  return [...state.routes.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function publicAppView(appConfig) {
  return {
    serviceName: appConfig.serviceName,
    displayName: appConfig.displayName,
    composeService: appConfig.composeService,
    image: appConfig.image,
    hasHealthCheck: Boolean(appConfig.healthCheckUrl),
  };
}

function enqueueDeployJob(appConfig) {
  const job = {
    id: crypto.randomUUID(),
    serviceName: appConfig.serviceName,
    composeService: appConfig.composeService,
    displayName: appConfig.displayName,
    status: state.deployBusy ? "queued" : "queued",
    requestedAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    error: null,
    health: null,
    pull: null,
    up: null,
  };

  state.jobs.set(job.id, job);
  state.jobOrder.push(job.id);
  state.deployQueue.push(job.id);
  trimStoredJobs();
  return job;
}

async function processDeployQueue() {
  if (state.deployBusy) {
    return;
  }

  const nextJobId = state.deployQueue.shift();
  if (!nextJobId) {
    return;
  }

  const job = state.jobs.get(nextJobId);
  if (!job) {
    return processDeployQueue();
  }

  state.deployBusy = true;
  job.status = "running";
  job.startedAt = new Date().toISOString();

  try {
    const startedAt = Date.now();
    const pullResult = await runCompose(["pull", job.composeService], {
      timeoutMs: 10 * 60 * 1000,
      stdio: "inherit",
    });
    const upResult = await runCompose(["up", "-d", job.composeService], {
      timeoutMs: 5 * 60 * 1000,
      stdio: "inherit",
    });
    const appConfig = state.apps.get(job.serviceName);
    if (!appConfig) {
      throw httpError(500, `service "${job.serviceName}" no longer exists in whitelist`);
    }
    const health = await runHealthCheck(appConfig);

    job.finishedAt = new Date().toISOString();
    job.durationMs = Date.now() - startedAt;
    job.status = "completed";
    job.health = health;
    job.pull = summarizeCommandResult(pullResult);
    job.up = summarizeCommandResult(upResult);

    await writeAudit({
      time: job.finishedAt,
      ok: true,
      jobId: job.id,
      serviceName: job.serviceName,
      composeService: job.composeService,
      displayName: job.displayName,
      durationMs: job.durationMs,
      health,
    });
  } catch (error) {
    job.finishedAt = new Date().toISOString();
    job.durationMs = job.startedAt ? (Date.now() - Date.parse(job.startedAt)) : null;
    job.status = "failed";
    job.error = error.message;

    await writeAudit({
      time: job.finishedAt,
      ok: false,
      jobId: job.id,
      serviceName: job.serviceName,
      composeService: job.composeService,
      displayName: job.displayName,
      durationMs: job.durationMs,
      error: error.message,
    });
  } finally {
    state.deployBusy = false;
    if (state.deployQueue.length > 0) {
      setImmediate(() => {
        processDeployQueue().catch((error) => {
          console.error(`background deploy queue failed: ${error.message}`);
        });
      });
    }
  }
}

function publicJobView(job) {
  return {
    id: job.id,
    serviceName: job.serviceName,
    composeService: job.composeService,
    displayName: job.displayName,
    status: job.status,
    requestedAt: job.requestedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    durationMs: job.durationMs,
    error: job.error,
    health: job.health,
    pull: job.pull,
    up: job.up,
  };
}

function listJobs() {
  return [...state.jobOrder]
    .map((jobId) => state.jobs.get(jobId))
    .filter(Boolean)
    .reverse()
    .map((job) => publicJobView(job));
}

function trimStoredJobs() {
  const maxJobs = 200;
  while (state.jobOrder.length > maxJobs) {
    const oldestJobId = state.jobOrder.shift();
    state.jobs.delete(oldestJobId);
  }
}

function routeReferencesService(serviceName) {
  for (const route of state.routes.values()) {
    if (route.serviceName === serviceName) {
      return true;
    }
  }
  return false;
}

async function writeGeneratedNginxConfig() {
  const enabledRoutes = sortedRoutes().filter((item) => item.enabled);
  const grouped = new Map();

  for (const route of enabledRoutes) {
    if (!grouped.has(route.hostname)) {
      grouped.set(route.hostname, []);
    }
    grouped.get(route.hostname).push(route);
  }

  const lines = [
    "# This file is generated by deploy-manager.",
    "# Do not edit manually.",
    "",
  ];

  for (const hostname of [...grouped.keys()].sort()) {
    const hostnameRoutes = grouped.get(hostname).sort((left, right) => {
      return right.pathPrefix.length - left.pathPrefix.length || left.id.localeCompare(right.id);
    });

    lines.push("server {");
    lines.push("    listen 80;");
    lines.push(`    server_name ${hostname};`);
    lines.push("");

    for (const route of hostnameRoutes) {
      const appConfig = state.apps.get(route.serviceName);
      const upstream = `http://${appConfig.composeService}:${route.targetPort}`;
      for (const line of renderLocationBlocks(route.pathPrefix, upstream)) {
        lines.push(`    ${line}`);
      }
      lines.push("");
    }

    lines.push("}");
    lines.push("");
  }

  if (enabledRoutes.length === 0) {
    lines.push("# No enabled nginx routes configured.");
    lines.push("");
  }

  const content = lines.join("\n");
  await fs.mkdir(path.posix.dirname(NGINX_GENERATED_CONFIG), { recursive: true });
  await fs.writeFile(NGINX_GENERATED_CONFIG, content, "utf8");
  return content;
}

function renderLocationBlocks(pathPrefix, upstream) {
  if (pathPrefix === "/") {
    return renderProxyBlock("location /", upstream);
  }

  const safePrefix = pathPrefix.replace(/\/+$/, "");
  return [
    ...renderProxyBlock(`location = ${safePrefix}`, upstream),
    ...renderProxyBlock(`location ^~ ${safePrefix}/`, upstream),
  ];
}

function renderProxyBlock(locationHeader, upstream) {
  return [
    `${locationHeader} {`,
    `    proxy_pass ${upstream};`,
    "    proxy_http_version 1.1;",
    "    proxy_set_header Host $host;",
    "    proxy_set_header X-Real-IP $remote_addr;",
    "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "    proxy_set_header X-Forwarded-Proto $scheme;",
    "}",
  ];
}

async function applyNginxConfig() {
  const running = (await runCommand("docker", [
    "inspect",
    "-f",
    "{{.State.Running}}",
    NGINX_CONTAINER_NAME,
  ], {
    capture: true,
    timeoutMs: 30_000,
  })).stdout.trim();

  if (running !== "true") {
    throw httpError(500, `nginx container "${NGINX_CONTAINER_NAME}" is not running`);
  }

  await runCommand("docker", ["exec", NGINX_CONTAINER_NAME, "nginx", "-t"], {
    stdio: "inherit",
    timeoutMs: 30_000,
  });
  await runCommand("docker", ["exec", NGINX_CONTAINER_NAME, "nginx", "-s", "reload"], {
    stdio: "inherit",
    timeoutMs: 30_000,
  });

  return { validated: true, reloaded: true };
}

async function writeAudit(record) {
  if (!DEPLOY_AUDIT_LOG) {
    return;
  }
  await fs.mkdir(path.posix.dirname(DEPLOY_AUDIT_LOG), { recursive: true });
  await fs.appendFile(DEPLOY_AUDIT_LOG, `${JSON.stringify(record)}\n`, "utf8");
}

async function readAuditLog() {
  try {
    const raw = await fs.readFile(DEPLOY_AUDIT_LOG, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (_error) {
          return { ok: false, parseError: true, line };
        }
      })
      .slice(-50)
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function runCompose(args, options = {}) {
  const runner = await resolveComposeRunner();
  const composeArgs = [...runner.baseArgs];

  if (runner.mode === "docker-compose") {
    composeArgs.push("--project-directory", COMPOSE_PROJECT_DIR);
    composeArgs.push("-f", COMPOSE_FILE_PATH);
    if (COMPOSE_ENV_FILE) {
      composeArgs.push("--env-file", COMPOSE_ENV_FILE);
    }
  } else {
    composeArgs.push("--project-directory", COMPOSE_PROJECT_DIR);
    composeArgs.push("-f", COMPOSE_FILE_PATH);
    if (COMPOSE_ENV_FILE) {
      composeArgs.push("--env-file", COMPOSE_ENV_FILE);
    }
  }

  composeArgs.push(...args);

  return runCommand(runner.command, composeArgs, {
    cwd: COMPOSE_PROJECT_DIR,
    ...options,
  });
}

async function resolveComposeRunner() {
  if (state.composeRunner) {
    return state.composeRunner;
  }

  try {
    await runCommand("docker", ["compose", "version"], {
      capture: true,
      timeoutMs: 15_000,
    });
    state.composeRunner = {
      command: "docker",
      baseArgs: ["compose"],
      mode: "docker-compose-plugin",
    };
    return state.composeRunner;
  } catch (_error) {
    // Fall through to docker-compose binary detection.
  }

  try {
    await runCommand("docker-compose", ["version"], {
      capture: true,
      timeoutMs: 15_000,
    });
    state.composeRunner = {
      command: "docker-compose",
      baseArgs: [],
      mode: "docker-compose",
    };
    return state.composeRunner;
  } catch (_error) {
    throw httpError(
      500,
      "docker compose is not available inside deploy-manager; install compose plugin or docker-compose binary",
    );
  }
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : (options.stdio || "inherit"),
    });

    let stdout = "";
    let stderr = "";

    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(httpError(500, `${command} timed out`));
    }, options.timeoutMs || 30_000);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(httpError(500, error.message));
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr, command, args });
        return;
      }
      const message = stderr.trim() || `${command} exited with code ${code}`;
      reject(httpError(500, message));
    });
  });
}

function summarizeCommandResult(result) {
  return {
    command: [result.command, ...(result.args || [])].join(" "),
  };
}

function parseListenAddress(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === ":8080") {
    return { host: "0.0.0.0", port: 8080 };
  }
  if (trimmed.startsWith(":")) {
    return { host: "0.0.0.0", port: Number.parseInt(trimmed.slice(1), 10) };
  }
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    return {
      host: parts[0] || "0.0.0.0",
      port: Number.parseInt(parts[1], 10),
    };
  }
  return { host: "0.0.0.0", port: Number.parseInt(trimmed, 10) };
}

function assertAllowedKeys(payload, allowedKeys) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw httpError(400, "request body must be a JSON object");
  }
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      throw httpError(400, `unknown field: ${key}`);
    }
  }
}

function validateRuntimeConfig() {
  if (!isWorkspacePath(COMPOSE_PROJECT_DIR)) {
    throw new Error("COMPOSE_PROJECT_DIR must stay under /workspace");
  }
  if (!isWorkspacePath(COMPOSE_FILE_PATH)) {
    throw new Error("COMPOSE_FILE_PATH must stay under /workspace");
  }
  if (COMPOSE_ENV_FILE && !isWorkspacePath(COMPOSE_ENV_FILE)) {
    throw new Error("COMPOSE_ENV_FILE must stay under /workspace");
  }
  if (!isWorkspacePath(NGINX_GENERATED_CONFIG)) {
    throw new Error("NGINX_GENERATED_CONFIG must stay under /workspace");
  }
}

function isWorkspacePath(value) {
  if (!value) {
    return false;
  }
  const normalized = path.posix.normalize(value);
  return normalized === "/workspace" || normalized.startsWith("/workspace/");
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function loadDotEnv() {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(__dirname, ".env"),
  ];

  for (const filePath of candidates) {
    if (!fsSync.existsSync(filePath)) {
      continue;
    }

    const content = fsSync.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key && process.env[key] == null) {
        process.env[key] = stripWrappingQuotes(value);
      }
    }
    return;
  }
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function envOrDefault(name, fallback) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function normalizeStatusCode(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) {
    throw httpError(400, "healthCheckExpectedStatus must be an integer");
  }
  return parsed;
}

function normalizeOptionalPositiveInt(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw httpError(400, "numeric health check values must be positive integers");
  }
  return parsed;
}

function positiveInt(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("health check env values must be positive integers");
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
