const app = document.getElementById("app");

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

function renderLogin(error) {
  app.innerHTML = `
    <div class="shell login-wrap">
      <div class="card card-accent login-card">
        <p class="eyebrow">SplitMeta for iRacing</p>
        <h1>Sign in to continue</h1>
        <p class="muted small">Use the same Google account as splitmeta.net. Your session stays signed in on this PC.</p>
        <button class="btn btn-white" id="sign-in" style="width:100%;margin-top:24px">Continue with Google</button>
        ${error ? `<p class="error">${esc(error)}</p>` : ""}
      </div>
    </div>
  `;

  document.getElementById("sign-in").addEventListener("click", async () => {
    const btn = document.getElementById("sign-in");
    btn.disabled = true;
    btn.textContent = "Opening browser…";
    const result = await window.splitmeta.signIn();
    if (!result.ok) {
      renderLogin(result.error);
      return;
    }
    renderDashboard(result.session);
  });
}

function renderDashboard(session) {
  if (!session) {
    renderLogin();
    return;
  }

  const watching = session.watching;
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

  app.innerHTML = `
    <div class="shell">
      <div class="header">
        <div class="brand">Split<span>Meta</span></div>
        <div class="user-block">
          <div class="avatar">${initial}</div>
          <div>
            <div>${esc(session.email)}</div>
            <div style="margin-top:4px">${planBadge}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="stat-label">Uploader status</div>
          <div class="stat-value">
            <span class="status-dot ${watching ? "status-live" : "status-paused"}"></span>
            ${watching ? "Watching" : "Paused"}
          </div>
          <p class="muted small" style="margin-top:10px">
            ${watching ? "New races upload automatically after each session." : "Start watching to resume uploads."}
          </p>
          <div class="toolbar">
            <button class="btn btn-primary" id="toggle-watcher">${watching ? "Pause" : "Start watching"}</button>
            <button class="btn btn-secondary" id="open-meta">Open meta board</button>
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

  document.getElementById("toggle-watcher").addEventListener("click", async () => {
    await window.splitmeta.toggleWatcher();
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
  window.splitmeta.onSessionUpdated((session) => {
    renderDashboard(session);
  });

  let session = await window.splitmeta.getSession();
  if (!session) {
    session = await window.splitmeta.refreshSession();
  }
  if (session) {
    renderDashboard(session);
  } else {
    renderLogin();
  }
}

boot();
