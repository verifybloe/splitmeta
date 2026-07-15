const app = document.getElementById("app");

let currentSession = null;
let updateStatus = {
  status: "idle",
  currentVersion: "",
  version: null,
  percent: 0,
  message: "",
};

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function updateBannerHtml() {
  const s = updateStatus?.status;
  if (!s || s === "idle" || s === "up-to-date" || s === "dev") return "";

  let action = "";
  if (s === "ready") {
    action = `<button class="btn btn-primary" id="install-update">Restart &amp; update</button>`;
  } else if (s === "error") {
    action = `<button class="btn btn-secondary" data-check-update>Try again</button>`;
  }

  const progress =
    s === "downloading"
      ? `<div class="update-progress"><div class="update-progress-bar" style="width:${esc(updateStatus.percent || 0)}%"></div></div>`
      : "";

  return `
    <div class="update-banner">
      <div>
        <p class="update-title">App update</p>
        <p class="muted small">${esc(updateStatus.message || "Checking…")}</p>
        ${progress}
      </div>
      <div class="toolbar" style="margin:0">${action}</div>
    </div>
  `;
}

function bindUpdateActions() {
  document.getElementById("install-update")?.addEventListener("click", async () => {
    await window.splitmeta.installUpdate();
  });
  document.querySelectorAll("[data-check-update]").forEach((el) => {
    el.addEventListener("click", async () => {
      await window.splitmeta.checkForUpdates();
    });
  });
}

function renderLogin(error, mode = "signin") {
  app.innerHTML = `
    <div class="shell login-wrap">
      <div class="card card-accent login-card">
        <p class="eyebrow">SplitMeta for iRacing</p>
        <img src="icon.png" alt="" class="app-logo app-logo-lg" width="56" height="56" />
        <h1>${mode === "register" ? "Create account" : "Sign in"}</h1>
        <p class="muted small">Same account as splitmeta.net — email or Google.</p>

        <form id="email-form" class="auth-form">
          ${
            mode === "register"
              ? `<input type="text" id="name" class="field" placeholder="Name (optional)" autocomplete="name" />`
              : ""
          }
          <input type="email" id="email" class="field" placeholder="Email" required autocomplete="email" />
          <input type="password" id="password" class="field" placeholder="Password (8+ characters)" required minlength="8" autocomplete="${mode === "register" ? "new-password" : "current-password"}" />
          <button type="submit" class="btn btn-primary" id="email-submit" style="width:100%">
            ${mode === "register" ? "Create account" : "Sign in with email"}
          </button>
        </form>

        <p class="auth-toggle muted small">
          ${
            mode === "register"
              ? `Already have an account? <button type="button" class="link-btn" id="toggle-mode">Sign in</button>`
              : `No account? <button type="button" class="link-btn" id="toggle-mode">Create one</button>`
          }
        </p>

        <div class="divider"><span>or</span></div>

        <button class="btn btn-white" id="sign-in-google" style="width:100%">Continue with Google</button>
        ${error ? `<p class="error">${esc(error)}</p>` : ""}
        ${updateBannerHtml()}
      </div>
    </div>
  `;

  bindUpdateActions();

  document.getElementById("toggle-mode")?.addEventListener("click", () => {
    renderLogin(null, mode === "register" ? "signin" : "register");
  });

  document.getElementById("email-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("email-submit");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const name = document.getElementById("name")?.value?.trim() ?? "";

    btn.disabled = true;
    btn.textContent = "Please wait…";

    const result =
      mode === "register"
        ? await window.splitmeta.signUpWithEmail(email, password, name)
        : await window.splitmeta.signInWithEmail(email, password);

    if (!result.ok) {
      renderLogin(result.error, mode);
      return;
    }
    renderDashboard(result.session);
  });

  document.getElementById("sign-in-google").addEventListener("click", async () => {
    const btn = document.getElementById("sign-in-google");
    btn.disabled = true;
    btn.textContent = "Opening browser…";
    const result = await window.splitmeta.signIn();
    if (!result.ok) {
      renderLogin(result.error, mode);
      return;
    }
    renderDashboard(result.session);
  });
}

function renderDashboard(session) {
  currentSession = session;
  if (!session) {
    renderLogin();
    return;
  }

  const watching = session.watching;
  const autoMode = session.autoMode;
  const telemetryOk = session.telemetryExists;
  const initial = esc((session.name || session.email || "?").slice(0, 1).toUpperCase());
  const planBadge =
    session.plan === "PRO"
      ? `<span class="badge badge-pro">Pro</span>`
      : `<span class="badge badge-free">Free</span>`;

  const activity = (session.activity ?? [])
    .map((item) => {
      const cls =
        item.type === "upload"
          ? "msg-upload"
          : item.type === "error"
            ? "msg-error"
            : item.type === "skip"
              ? "msg-skip"
              : "";
      return `<li><time>${formatTime(item.time)}</time><span class="${cls}">${esc(item.message)}</span></li>`;
    })
    .join("");

  const versionLabel = esc(session.appVersion || updateStatus.currentVersion || "");

  let statusDot = "status-paused";
  let statusText = "Paused";
  let statusHint =
    "Click Start watching before you race, or turn on Auto to detect sessions.";
  if (autoMode && watching) {
    statusDot = "status-live";
    statusText = "Auto · Watching";
    statusHint = esc(session.autoLabel || "Session detected — uploading when the race finishes.");
  } else if (autoMode) {
    statusDot = "status-auto";
    statusText = "Auto · Standby";
    statusHint = esc(session.autoLabel || "Waiting for an iRacing session…");
  } else if (watching) {
    statusDot = "status-live";
    statusText = "Watching";
    statusHint = "New races upload automatically after each session.";
  }

  app.innerHTML = `
    <div class="shell">
      <div class="header">
        <div class="brand-row">
          <img src="icon.png" alt="" class="app-logo" width="32" height="32" />
          <div>
            <div class="brand">Split<span>Meta</span></div>
            <div class="muted small">v${versionLabel}</div>
          </div>
        </div>
        <div class="user-block">
          <div class="avatar">${initial}</div>
          <div>
            <div>${esc(session.email)}</div>
            <div style="margin-top:4px">${planBadge}</div>
          </div>
        </div>
      </div>

      ${updateBannerHtml()}

      <div class="grid grid-2">
        <div class="card">
          <div class="stat-label">Uploader status</div>
          <div class="stat-value">
            <span class="status-dot ${statusDot}"></span>
            ${statusText}
          </div>
          <p class="muted small" style="margin-top:10px">${statusHint}</p>
          <div class="toolbar">
            <button class="btn btn-primary" id="toggle-watcher">${watching ? "Pause" : "Start watching"}</button>
            <button class="btn ${autoMode ? "btn-auto-on" : "btn-secondary"}" id="toggle-auto" title="Start when iRacing is detected, pause after upload">
              ${autoMode ? "Auto on" : "Auto"}
            </button>
            <button class="btn btn-secondary" id="upload-latest">Upload latest race</button>
            <button class="btn btn-secondary" data-check-update>Check for updates</button>
          </div>
        </div>

        <div class="card">
          <div class="stat-label">Telemetry folder</div>
          <div class="path">${esc(session.telemetryDir)}</div>
          <p class="muted small" style="margin-top:10px">
            <span class="status-dot ${telemetryOk ? "status-live" : "status-warn"}"></span>
            ${telemetryOk ? "Folder found" : "Folder not found — enable iRacing telemetry logging"}
          </p>
          <div class="toolbar">
            <button class="btn btn-secondary" id="pick-folder">Change folder</button>
            <button class="btn btn-secondary" id="open-meta">Open meta board</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="stat-label">Recent activity</div>
        <ul class="activity">${activity || `<li><span class="muted">No activity yet — complete a race with the watcher running.</span></li>`}</ul>
      </div>

      <div class="toolbar" style="margin-top:20px">
        <button class="btn btn-secondary" id="sign-out">Sign out</button>
      </div>
    </div>
  `;

  bindUpdateActions();

  document.getElementById("toggle-watcher").addEventListener("click", async () => {
    await window.splitmeta.toggleWatcher();
  });

  document.getElementById("toggle-auto").addEventListener("click", async () => {
    await window.splitmeta.toggleAutoMode();
  });

  document.getElementById("upload-latest").addEventListener("click", async () => {
    const btn = document.getElementById("upload-latest");
    btn.disabled = true;
    btn.textContent = "Uploading…";
    const result = await window.splitmeta.uploadLatest();
    if (!result.ok) {
      alert(result.error || "Upload failed");
    }
    btn.disabled = false;
    btn.textContent = "Upload latest race";
  });

  document.getElementById("pick-folder").addEventListener("click", async () => {
    await window.splitmeta.pickTelemetryDir();
  });

  document.getElementById("open-meta").addEventListener("click", () => {
    window.splitmeta.openExternal(`${session.siteUrl}/meta`);
  });

  document.getElementById("sign-out").addEventListener("click", async () => {
    await window.splitmeta.signOut();
    renderLogin();
  });
}

async function boot() {
  if (!window.splitmeta) {
    renderLogin("App failed to start. Reinstall from splitmeta.net/download");
    return;
  }

  window.splitmeta.onSessionUpdated((session) => {
    renderDashboard(session);
  });

  window.splitmeta.onUpdateStatus((status) => {
    updateStatus = status || updateStatus;
    if (currentSession) renderDashboard(currentSession);
    else if (document.getElementById("email-form") || document.getElementById("sign-in-google")) {
      // stay on login, but refresh banner
      const err = document.querySelector(".error")?.textContent || null;
      renderLogin(err);
    }
  });

  try {
    updateStatus = (await window.splitmeta.getUpdateStatus()) || updateStatus;
    let session = await window.splitmeta.getSession();
    if (!session) {
      session = await window.splitmeta.refreshSession();
    }
    if (session) {
      renderDashboard(session);
    } else {
      renderLogin();
    }
  } catch (err) {
    renderLogin(err instanceof Error ? err.message : "Failed to load session");
  }
}

boot();
