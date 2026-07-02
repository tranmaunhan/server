const state = {
  apps: [],
  routes: [],
  deployments: [],
  editingServiceName: null,
  editingRouteId: null,
};

const els = {
  healthStatus: document.getElementById("health-status"),
  healthAppCount: document.getElementById("health-app-count"),
  healthRouteCount: document.getElementById("health-route-count"),
  healthBusy: document.getElementById("health-busy"),
  refreshHealth: document.getElementById("refresh-health"),
  deployToken: document.getElementById("deploy-token"),
  adminToken: document.getElementById("admin-token"),
  saveTokens: document.getElementById("save-tokens"),
  reloadApps: document.getElementById("reload-apps"),
  reloadRoutes: document.getElementById("reload-routes"),
  reloadDeployments: document.getElementById("reload-deployments"),
  appsTable: document.getElementById("apps-table"),
  routesTable: document.getElementById("routes-table"),
  resetForm: document.getElementById("reset-form"),
  resetRouteForm: document.getElementById("reset-route-form"),
  appForm: document.getElementById("app-form"),
  routeForm: document.getElementById("route-form"),
  formTitle: document.getElementById("form-title"),
  routeFormTitle: document.getElementById("route-form-title"),
  deployForm: document.getElementById("deploy-form"),
  deploySelect: document.getElementById("deploy-service-select"),
  routeServiceSelect: document.getElementById("route-service-select"),
  deployOutput: document.getElementById("deploy-output"),
  deploymentsOutput: document.getElementById("deployments-output"),
  nginxOutput: document.getElementById("nginx-output"),
  applyNginx: document.getElementById("apply-nginx"),
  previewNginx: document.getElementById("preview-nginx"),
  toast: document.getElementById("toast"),
};

boot();

function boot() {
  els.deployToken.value = localStorage.getItem("deployToken") || "";
  els.adminToken.value = localStorage.getItem("adminToken") || "";

  els.saveTokens.addEventListener("click", saveTokens);
  els.refreshHealth.addEventListener("click", loadHealth);
  els.reloadApps.addEventListener("click", loadApps);
  els.reloadRoutes.addEventListener("click", loadRoutes);
  els.reloadDeployments.addEventListener("click", loadDeployments);
  els.resetForm.addEventListener("click", resetAppForm);
  els.resetRouteForm.addEventListener("click", resetRouteForm);
  els.appForm.addEventListener("submit", submitAppForm);
  els.routeForm.addEventListener("submit", submitRouteForm);
  els.deployForm.addEventListener("submit", submitDeploy);
  els.applyNginx.addEventListener("click", applyNginxConfig);
  els.previewNginx.addEventListener("click", previewNginxConfig);

  loadHealth();
  Promise.allSettled([loadApps(), loadRoutes(), loadDeployments()]);
}

function saveTokens() {
  localStorage.setItem("deployToken", els.deployToken.value.trim());
  localStorage.setItem("adminToken", els.adminToken.value.trim());
  toast("Token đã được lưu trong trình duyệt này.");
}

async function loadHealth() {
  try {
    const data = await api("/healthz");
    els.healthStatus.textContent = data.ok ? "Ổn định" : "Không rõ";
    els.healthAppCount.textContent = String(data.appCount ?? "-");
    els.healthRouteCount.textContent = String(data.routeCount ?? "-");
    els.healthBusy.textContent = data.busy ? "Đang bận" : "Sẵn sàng";
  } catch (error) {
    els.healthStatus.textContent = "Lỗi";
    els.healthAppCount.textContent = "-";
    els.healthRouteCount.textContent = "-";
    els.healthBusy.textContent = "-";
    toast(error.message, true);
  }
}

async function loadApps() {
  const data = await api("/admin/apps", {
    headers: adminHeaders(),
  });
  state.apps = data.apps || [];
  renderApps();
  renderServiceOptions();
  await loadHealth();
}

async function loadRoutes() {
  const data = await api("/admin/routes", {
    headers: adminHeaders(),
  });
  state.routes = data.routes || [];
  renderRoutes();
  await loadHealth();
}

async function loadDeployments() {
  const data = await api("/admin/deployments", {
    headers: adminHeaders(),
  });
  state.deployments = data.deployments || [];
  renderDeployments();
}

function renderApps() {
  if (!state.apps.length) {
    els.appsTable.innerHTML = '<tr><td colspan="6" class="muted-cell">Chưa có app nào.</td></tr>';
    return;
  }

  els.appsTable.innerHTML = state.apps.map((app) => {
    const image = app.image || '<span class="muted-cell">Lấy từ compose</span>';
    const health = app.healthCheckUrl
      ? `${escapeHtml(app.healthCheckMethod)} ${escapeHtml(app.healthCheckUrl)}`
      : '<span class="muted-cell">Không bật</span>';

    return `
      <tr>
        <td><strong>${escapeHtml(app.serviceName)}</strong><br><span class="muted-cell">${escapeHtml(app.displayName || "")}</span></td>
        <td>${escapeHtml(app.composeService)}</td>
        <td>${image}</td>
        <td>${health}</td>
        <td><span class="pill ${app.enabled ? "" : "disabled"}">${app.enabled ? "Bật" : "Tắt"}</span></td>
        <td>
          <div class="row-actions">
            <button class="ghost" data-app-action="edit" data-id="${escapeHtml(app.serviceName)}">Sửa</button>
            <button class="danger" data-app-action="delete" data-id="${escapeHtml(app.serviceName)}">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  els.appsTable.querySelectorAll("button[data-app-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.appAction === "edit") {
        fillAppForm(button.dataset.id);
      } else {
        await deleteApp(button.dataset.id);
      }
    });
  });
}

function renderRoutes() {
  if (!state.routes.length) {
    els.routesTable.innerHTML = '<tr><td colspan="7" class="muted-cell">Chưa có route nào.</td></tr>';
    return;
  }

  els.routesTable.innerHTML = state.routes.map((route) => `
    <tr>
      <td><strong>${escapeHtml(route.id)}</strong></td>
      <td>${escapeHtml(route.hostname)}</td>
      <td>${escapeHtml(route.pathPrefix)}</td>
      <td>${escapeHtml(route.serviceName)}</td>
      <td>${escapeHtml(String(route.targetPort))}</td>
      <td><span class="pill ${route.enabled ? "" : "disabled"}">${route.enabled ? "Bật" : "Tắt"}</span></td>
      <td>
        <div class="row-actions">
          <button class="ghost" data-route-action="edit" data-id="${escapeHtml(route.id)}">Sửa</button>
          <button class="danger" data-route-action="delete" data-id="${escapeHtml(route.id)}">Xóa</button>
        </div>
      </td>
    </tr>
  `).join("");

  els.routesTable.querySelectorAll("button[data-route-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.routeAction === "edit") {
        fillRouteForm(button.dataset.id);
      } else {
        await deleteRoute(button.dataset.id);
      }
    });
  });
}

function renderDeployments() {
  if (!state.deployments.length) {
    els.deploymentsOutput.textContent = "Chưa có log deploy.";
    return;
  }

  els.deploymentsOutput.textContent = state.deployments
    .map((item) => JSON.stringify(item, null, 2))
    .join("\n\n");
}

function renderServiceOptions() {
  const enabledApps = state.apps.filter((app) => app.enabled);
  els.deploySelect.innerHTML = enabledApps.length
    ? enabledApps.map((app) => `<option value="${escapeHtml(app.serviceName)}">${escapeHtml(app.serviceName)}</option>`).join("")
    : '<option value="">Chưa có service đang bật</option>';

  els.routeServiceSelect.innerHTML = state.apps.length
    ? state.apps.map((app) => `<option value="${escapeHtml(app.serviceName)}">${escapeHtml(app.serviceName)}</option>`).join("")
    : '<option value="">Chưa có service nào</option>';

  if (!state.editingRouteId && state.apps.length) {
    els.routeForm.elements.serviceName.value = state.apps[0].serviceName;
  }
}

function fillAppForm(serviceName) {
  const app = state.apps.find((item) => item.serviceName === serviceName);
  if (!app) {
    return;
  }

  state.editingServiceName = serviceName;
  els.formTitle.textContent = `Sửa app: ${serviceName}`;
  els.appForm.elements.serviceName.value = app.serviceName;
  els.appForm.elements.enabled.value = String(app.enabled);
  els.appForm.elements.displayName.value = app.displayName || "";
  els.appForm.elements.composeService.value = app.composeService === app.serviceName ? "" : app.composeService;
  els.appForm.elements.image.value = app.image || "";
  els.appForm.elements.healthCheckUrl.value = app.healthCheckUrl || "";
  els.appForm.elements.healthCheckMethod.value = app.healthCheckMethod || "GET";
  els.appForm.elements.healthCheckExpectedStatus.value = String(app.healthCheckExpectedStatus || 200);
  els.appForm.elements.healthCheckTimeoutMs.value = String(app.healthCheckTimeoutMs || "");
  els.appForm.elements.healthCheckIntervalMs.value = String(app.healthCheckIntervalMs || "");
}

function resetAppForm() {
  state.editingServiceName = null;
  els.formTitle.textContent = "Tạo app";
  els.appForm.reset();
  els.appForm.elements.enabled.value = "true";
  els.appForm.elements.healthCheckMethod.value = "GET";
}

function fillRouteForm(id) {
  const route = state.routes.find((item) => item.id === id);
  if (!route) {
    return;
  }

  state.editingRouteId = id;
  els.routeFormTitle.textContent = `Sửa route: ${id}`;
  els.routeForm.elements.id.value = route.id;
  els.routeForm.elements.enabled.value = String(route.enabled);
  els.routeForm.elements.hostname.value = route.hostname;
  els.routeForm.elements.pathPrefix.value = route.pathPrefix;
  els.routeForm.elements.serviceName.value = route.serviceName;
  els.routeForm.elements.targetPort.value = String(route.targetPort);
}

function resetRouteForm() {
  state.editingRouteId = null;
  els.routeFormTitle.textContent = "Tạo route nginx";
  els.routeForm.reset();
  els.routeForm.elements.enabled.value = "true";
  els.routeForm.elements.pathPrefix.value = "/";
  if (state.apps.length) {
    els.routeForm.elements.serviceName.value = state.apps[0].serviceName;
  }
}

async function submitAppForm(event) {
  event.preventDefault();

  const payload = {
    serviceName: els.appForm.elements.serviceName.value.trim(),
    enabled: els.appForm.elements.enabled.value === "true",
    displayName: els.appForm.elements.displayName.value.trim(),
    composeService: els.appForm.elements.composeService.value.trim(),
    image: els.appForm.elements.image.value.trim(),
    healthCheckUrl: els.appForm.elements.healthCheckUrl.value.trim(),
    healthCheckMethod: els.appForm.elements.healthCheckMethod.value.trim(),
    healthCheckExpectedStatus: els.appForm.elements.healthCheckExpectedStatus.value.trim(),
    healthCheckTimeoutMs: els.appForm.elements.healthCheckTimeoutMs.value.trim(),
    healthCheckIntervalMs: els.appForm.elements.healthCheckIntervalMs.value.trim(),
  };

  dropEmptyKeys(payload);

  try {
    if (state.editingServiceName) {
      await api(`/admin/apps/${encodeURIComponent(state.editingServiceName)}`, {
        method: "PUT",
        headers: adminJsonHeaders(),
        body: JSON.stringify(payload),
      });
      toast(`Đã cập nhật app ${state.editingServiceName}.`);
    } else {
      await api("/admin/apps", {
        method: "POST",
        headers: adminJsonHeaders(),
        body: JSON.stringify(payload),
      });
      toast(`Đã tạo app ${payload.serviceName}.`);
    }
    resetAppForm();
    await Promise.all([loadApps(), loadRoutes()]);
  } catch (error) {
    toast(error.message, true);
  }
}

async function submitRouteForm(event) {
  event.preventDefault();

  const payload = {
    id: els.routeForm.elements.id.value.trim(),
    enabled: els.routeForm.elements.enabled.value === "true",
    hostname: els.routeForm.elements.hostname.value.trim(),
    pathPrefix: els.routeForm.elements.pathPrefix.value.trim() || "/",
    serviceName: els.routeForm.elements.serviceName.value.trim(),
    targetPort: Number.parseInt(els.routeForm.elements.targetPort.value.trim(), 10),
  };

  try {
    if (state.editingRouteId) {
      await api(`/admin/routes/${encodeURIComponent(state.editingRouteId)}`, {
        method: "PUT",
        headers: adminJsonHeaders(),
        body: JSON.stringify(payload),
      });
      toast(`Đã cập nhật route ${state.editingRouteId}.`);
    } else {
      await api("/admin/routes", {
        method: "POST",
        headers: adminJsonHeaders(),
        body: JSON.stringify(payload),
      });
      toast(`Đã tạo route ${payload.id}.`);
    }
    resetRouteForm();
    await loadRoutes();
  } catch (error) {
    toast(error.message, true);
  }
}

async function deleteApp(serviceName) {
  if (!confirm(`Xóa app ${serviceName}?`)) {
    return;
  }

  try {
    await api(`/admin/apps/${encodeURIComponent(serviceName)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    toast(`Đã xóa app ${serviceName}.`);
    if (state.editingServiceName === serviceName) {
      resetAppForm();
    }
    await Promise.all([loadApps(), loadRoutes()]);
  } catch (error) {
    toast(error.message, true);
  }
}

async function deleteRoute(id) {
  if (!confirm(`Xóa route ${id}?`)) {
    return;
  }

  try {
    await api(`/admin/routes/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    toast(`Đã xóa route ${id}.`);
    if (state.editingRouteId === id) {
      resetRouteForm();
    }
    await loadRoutes();
  } catch (error) {
    toast(error.message, true);
  }
}

async function submitDeploy(event) {
  event.preventDefault();

  const payload = {
    serviceName: els.deployForm.elements.serviceName.value.trim(),
  };

  els.deployOutput.textContent = "Đang deploy...";

  try {
    const result = await api("/deploy", {
      method: "POST",
      headers: deployJsonHeaders(),
      body: JSON.stringify(payload),
    });
    els.deployOutput.textContent = JSON.stringify(result, null, 2);
    toast(`Deployment ${result.serviceName} đã hoàn tất.`);
    await Promise.all([loadHealth(), loadDeployments()]);
  } catch (error) {
    els.deployOutput.textContent = error.message;
    toast(error.message, true);
  }
}

async function previewNginxConfig() {
  els.nginxOutput.textContent = "Đang dựng preview nginx...";
  try {
    const result = await api("/admin/nginx/preview", {
      headers: adminHeaders(),
    });
    els.nginxOutput.textContent = result.content;
    toast("Đã tạo preview cấu hình nginx.");
  } catch (error) {
    els.nginxOutput.textContent = error.message;
    toast(error.message, true);
  }
}

async function applyNginxConfig() {
  els.nginxOutput.textContent = "Đang kiểm tra và áp dụng cấu hình nginx...";
  try {
    const result = await api("/admin/nginx/apply", {
      method: "POST",
      headers: adminHeaders(),
    });
    els.nginxOutput.textContent = [
      `Container: ${result.containerName}`,
      `Validated: ${result.validated}`,
      `Reloaded: ${result.reloaded}`,
      "",
      result.content,
    ].join("\n");
    toast("Đã áp dụng cấu hình nginx.");
  } catch (error) {
    els.nginxOutput.textContent = error.message;
    toast(error.message, true);
  }
}

function deployJsonHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token("deploy")}`,
  };
}

function adminJsonHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token("admin")}`,
  };
}

function adminHeaders() {
  return {
    Authorization: `Bearer ${token("admin")}`,
  };
}

function token(kind) {
  const value = kind === "admin" ? els.adminToken.value.trim() : els.deployToken.value.trim();
  if (!value) {
    throw new Error(`Thiếu ${kind === "admin" ? "admin token" : "deploy token"}`);
  }
  return value;
}

async function api(requestPath, options = {}) {
  const response = await fetch(requestPath, options);
  const text = await response.text();
  const data = text ? tryParseJson(text) : {};
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
  return data;
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function dropEmptyKeys(payload) {
  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") {
      delete payload[key];
    }
  });
}

function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  els.toast.style.background = isError ? "rgba(127, 29, 29, 0.96)" : "rgba(23, 23, 23, 0.95)";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
