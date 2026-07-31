// ============================================================
// Smiletomorrow — app logic (vanilla JS, hash-routed, no build step)
// ============================================================

const CFG = window.SMILETOMORROW_CONFIG || {};
const NOT_CONFIGURED = !CFG.SUPABASE_URL || CFG.SUPABASE_URL.includes("YOUR-PROJECT-REF");

let sb = null;
if (!NOT_CONFIGURED) {
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
}

const app = document.getElementById("app");

// ---------- helpers ----------

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function getLocalId() {
  let id = localStorage.getItem("st_submitter_id");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    localStorage.setItem("st_submitter_id", id);
  }
  return id;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function starRow(rating) {
  const full = Math.round(Number(rating) || 0);
  let out = "";
  for (let i = 0; i < 5; i++) out += i < full ? "★" : "☆";
  return out;
}

function setActiveNav(route) {
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === route);
  });
}

function configBanner() {
  if (!NOT_CONFIGURED) return "";
  return `
    <div class="section" style="border-top:none;">
      <div class="form-card" style="border-color:#a33;">
        <div style="font-weight:800;margin-bottom:8px;">⚠ Not connected to a database yet</div>
        <div style="color:var(--muted);font-size:15px;line-height:1.5;">
          Open <strong>config.js</strong> and paste in your Supabase project URL and anon key.
          See the README for step-by-step setup — it takes about five minutes.
        </div>
      </div>
    </div>`;
}

// ---------- data access ----------

async function fetchAll() {
  const { data, error } = await sb.from("hospitals").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function insertHospital(payload) {
  const { error } = await sb.from("hospitals").insert([payload]);
  if (error) throw error;
}

async function updateHospital(id, patch) {
  const { error } = await sb.from("hospitals").update(patch).eq("id", id);
  if (error) throw error;
}

function computeRanked(all) {
  return all
    .filter((h) => h.status === "approved")
    .sort((a, b) => (Number(b.rating) - Number(a.rating)) || (new Date(a.created_at) - new Date(b.created_at)))
    .map((h, i) => ({ ...h, rank: i + 1 }));
}

// ---------- router ----------

const routes = {
  "/": renderHome,
  "/listings": renderListings,
  "/list-hospital": renderListHospital,
  "/dashboard": renderDashboard,
  "/admin": renderAdmin,
};

function currentRoute() {
  const h = location.hash.replace(/^#/, "");
  return h === "" ? "/" : h;
}

async function router() {
  const route = currentRoute();
  setActiveNav(route === "/admin" ? "" : route);
  const fn = routes[route] || renderHome;
  app.innerHTML = `<div class="skeleton">Loading…</div>`;
  window.scrollTo(0, 0);
  try {
    await fn();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="section"><div class="error-text">Something went wrong: ${esc(err.message || err)}</div></div>`;
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);

// ---------- HOME ----------

async function renderHome() {
  if (NOT_CONFIGURED) {
    app.innerHTML = `
      ${configBanner()}
      <div class="eyebrow-box"><span class="dot"></span>TRUSTED DENTAL HOSPITAL RANKINGS</div>
      <h1 class="page-title">Find trusted Dental Hospitals, ranked by patients</h1>
      <p class="lede">Browse a simple, ranked directory of professional dental hospitals. The higher the reputation, the higher the rank.</p>
      <a href="#/listings" class="btn"><span>☰ Browse Listings</span></a>
      <a href="#/list-hospital" class="btn btn-solid"><span>List your Hospital</span><span>→</span></a>
    `;
    return;
  }

  const all = await fetchAll();
  const ranked = computeRanked(all);
  const top = ranked.slice(0, 6);

  app.innerHTML = `
    <div class="eyebrow-box"><span class="dot"></span>TRUSTED DENTAL HOSPITAL RANKINGS</div>
    <h1 class="page-title">Find trusted Dental Hospitals, ranked by patients</h1>
    <p class="lede">Browse a simple, ranked directory of professional dental hospitals. The higher the reputation, the higher the rank.</p>

    <a href="#/listings" class="btn"><span>☰ Browse Listings</span></a>
    <a href="#/list-hospital" class="btn btn-solid"><span>List your Hospital</span><span>→</span></a>

    <div class="section">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-title">Hospitals register</div>
        <p class="step-desc">Dental hospitals submit their profile and join the directory.</p>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-title">Admins approve</div>
        <p class="step-desc">Each listing is reviewed before it joins the public rank table.</p>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-title">Patients discover</div>
        <p class="step-desc">Users browse ranked hospitals and find the best fit quickly.</p>
      </div>
    </div>

    <div class="section">
      <div class="top-row">
        <h2 class="section-title">Top ranked hospitals</h2>
        <a href="#/listings" class="link-arrow">View all →</a>
      </div>
      ${top.length === 0
        ? `<div class="empty-state">No approved hospitals yet. Be the first to <a class="link-arrow" href="#/list-hospital">list a hospital</a>.</div>`
        : top.map(rowHtml).join("")}
    </div>

    <div class="section">
      <div class="cta-block">
        <div class="cta-icon">🛡</div>
        <h3>Are you a dental hospital?</h3>
        <p>Register on Smiletomorrow, get approved, and let patients find you through a clear, reputation-based ranking.</p>
        <a href="#/list-hospital" class="btn btn-solid"><span>List your Hospital</span><span>→</span></a>
      </div>
    </div>
  `;
}

function rowHtml(h) {
  return `
    <div class="row">
      <div class="row-main">
        <div class="row-name">${esc(h.name)} ${h.status === "approved" ? '<span class="check">✓</span>' : ""}</div>
        <div class="row-sub"><span>${esc(h.specialty || "General Dentistry")}</span><span>📍 ${esc(h.city || "—")}</span></div>
      </div>
      <div class="row-rank">
        <div class="num">#${h.rank}</div>
        <div class="label">RANK</div>
      </div>
    </div>`;
}

// ---------- LISTINGS ----------

async function renderListings() {
  if (NOT_CONFIGURED) { app.innerHTML = configBanner(); return; }

  const all = await fetchAll();
  const ranked = computeRanked(all);

  const specialties = Array.from(new Set(ranked.map((h) => h.specialty).filter(Boolean))).sort();
  const cities = Array.from(new Set(ranked.map((h) => h.city).filter(Boolean))).sort();

  const shell = `
    <div class="eyebrow-small">02 / LISTINGS</div>
    <h1 class="page-title" style="font-size:36px;">Ranked Dental Hospitals</h1>
    <div class="meta-line">📅 Last updated ${fmtDate(new Date())}</div>
    <div class="meta-line" id="stCount">${ranked.length} hospitals</div>

    <div class="filters">
      <div class="filter">
        <label>RANK</label>
        <select id="fRank">
          <option value="0">All</option>
          <option value="10">Top 10</option>
          <option value="25">Top 25</option>
          <option value="50">Top 50</option>
        </select>
      </div>
      <div class="filter">
        <label>TYPE</label>
        <select id="fType">
          <option value="">All</option>
          ${specialties.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
        </select>
      </div>
      <div class="filter">
        <label>LOCATION</label>
        <select id="fCity">
          <option value="">All UK</option>
          ${cities.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}
        </select>
      </div>
    </div>

    <div id="listRows"></div>
  `;
  app.innerHTML = shell;

  function draw() {
    const rank = Number(document.getElementById("fRank").value);
    const type = document.getElementById("fType").value;
    const city = document.getElementById("fCity").value;

    let filtered = ranked;
    if (rank > 0) filtered = filtered.filter((h) => h.rank <= rank);
    if (type) filtered = filtered.filter((h) => h.specialty === type);
    if (city) filtered = filtered.filter((h) => h.city === city);

    document.getElementById("stCount").textContent = `${filtered.length} hospitals`;
    document.getElementById("listRows").innerHTML = filtered.length === 0
      ? `<div class="empty-state">No hospitals match those filters.</div>`
      : filtered.map(rowHtml).join("");
  }

  document.getElementById("fRank").addEventListener("change", draw);
  document.getElementById("fType").addEventListener("change", draw);
  document.getElementById("fCity").addEventListener("change", draw);
  draw();
}

// ---------- LIST YOUR HOSPITAL ----------

async function renderListHospital() {
  app.innerHTML = `
    <div class="eyebrow-small">03 / LIST</div>
    <h1 class="page-title" style="font-size:36px;">List your Hospital</h1>
    <p class="lede">Submit your details for review. Approved hospitals join the public rank table.</p>
    ${configBanner()}
    <div id="formArea"></div>
  `;
  if (NOT_CONFIGURED) return;

  document.getElementById("formArea").innerHTML = `
    <div class="form-card">
      <form id="hospForm">
        <div class="field">
          <label>HOSPITAL NAME <span class="req">*</span></label>
          <input type="text" id="fName" required />
        </div>
        <div class="field">
          <label>SPECIALTY</label>
          <input type="text" id="fSpecialty" placeholder="e.g. Orthodontics, Oral Surgery" />
        </div>
        <div class="field">
          <label>DESCRIPTION</label>
          <textarea id="fDesc" placeholder="A short description of the hospital"></textarea>
        </div>
        <div class="field">
          <label>ADDRESS</label>
          <input type="text" id="fAddress" placeholder="Street address" />
        </div>
        <div class="field">
          <label>CITY</label>
          <input type="text" id="fCity" placeholder="e.g. London" />
        </div>
        <div class="field">
          <label>PHONE</label>
          <input type="tel" id="fPhone" placeholder="Optional" />
        </div>
        <div class="field">
          <label>WEBSITE</label>
          <input type="url" id="fWebsite" placeholder="https://" />
        </div>
        <button type="submit" class="submit-btn" id="fSubmit">Submit for review</button>
        <div class="error-text" id="fError" style="display:none;"></div>
      </form>
      <p class="form-note">Every submission is reviewed by an admin before it appears on the public rankings.</p>
    </div>
  `;

  document.getElementById("hospForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("fName").value.trim();
    const errEl = document.getElementById("fError");
    errEl.style.display = "none";
    if (!name) return;

    const btn = document.getElementById("fSubmit");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    try {
      await insertHospital({
        name,
        specialty: document.getElementById("fSpecialty").value.trim() || "General Dentistry",
        description: document.getElementById("fDesc").value.trim(),
        address: document.getElementById("fAddress").value.trim(),
        city: document.getElementById("fCity").value.trim(),
        phone: document.getElementById("fPhone").value.trim(),
        website: document.getElementById("fWebsite").value.trim(),
        submitted_by: getLocalId(),
      });

      document.getElementById("formArea").innerHTML = `
        <div class="success-box">
          <div class="t">Submitted for review ✓</div>
          <div class="d">Thanks — ${esc(name)} has been added to the review queue. Track its status on your <a class="link-arrow" href="#/dashboard">Dashboard</a>.</div>
        </div>`;
    } catch (err) {
      errEl.textContent = err.message || "Could not submit. Please try again.";
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Submit for review";
    }
  });
}

// ---------- DASHBOARD ----------

async function renderDashboard() {
  if (NOT_CONFIGURED) { app.innerHTML = configBanner(); return; }

  const all = await fetchAll();
  const total = all.length;
  const approved = all.filter((h) => h.status === "approved").length;
  const pending = all.filter((h) => h.status === "pending").length;
  const ratedApproved = all.filter((h) => h.status === "approved" && Number(h.rating) > 0);
  const avgRating = ratedApproved.length
    ? (ratedApproved.reduce((s, h) => s + Number(h.rating), 0) / ratedApproved.length).toFixed(1)
    : "—";

  const mine = all.filter((h) => h.submitted_by === getLocalId());

  app.innerHTML = `
    <h1 class="page-title" style="font-size:36px;">Provider Dashboard</h1>
    <p class="lede">Overview of registered hospitals, status, and performance.</p>
    <div class="meta-line">📅 Last updated ${fmtDate(new Date())}</div>

    <div class="stats-grid">
      <div class="stat-card"><div class="num">${total}</div><div class="label">Total Hospitals</div></div>
      <div class="stat-card"><div class="num">${approved}</div><div class="label">Approved</div></div>
      <div class="stat-card"><div class="num">${pending}</div><div class="label">Pending</div></div>
      <div class="stat-card"><div class="num">${avgRating}</div><div class="label">Avg Rating</div></div>
    </div>

    <div class="card-block">
      <h3>Your Hospitals</h3>
      <p style="color:var(--muted);font-size:14px;margin:0 0 8px;">Hospitals you've submitted from this browser.</p>
      ${mine.length === 0
        ? `<div class="empty-state">You haven't submitted a hospital yet. <a class="link-arrow" href="#/list-hospital">List one now</a>.</div>`
        : mine.map((h) => `
          <div class="row">
            <div class="row-main">
              <div class="row-name">${esc(h.name)}</div>
              <div class="row-sub"><span class="stars">${starRow(h.rating)}</span><span>${Number(h.rating || 0).toFixed(1)}</span></div>
            </div>
            <span class="status-badge ${h.status}">${h.status}</span>
          </div>`).join("")}
    </div>
  `;
}

// ---------- ADMIN ----------

let adminUnlocked = sessionStorage.getItem("st_admin_ok") === "1";

async function renderAdmin() {
  if (NOT_CONFIGURED) { app.innerHTML = configBanner(); return; }

  if (!adminUnlocked) {
    app.innerHTML = `
      <div class="admin-login">
        <h2 class="section-title" style="margin-bottom:18px;">Admin</h2>
        <div class="field"><input type="password" id="fPass" placeholder="Passcode" /></div>
        <button class="submit-btn" id="fUnlock">Enter</button>
        <div class="error-text" id="fAdminErr" style="display:none;">Incorrect passcode.</div>
      </div>`;
    document.getElementById("fUnlock").addEventListener("click", () => {
      if (document.getElementById("fPass").value === CFG.ADMIN_PASSCODE) {
        adminUnlocked = true;
        sessionStorage.setItem("st_admin_ok", "1");
        renderAdmin();
      } else {
        document.getElementById("fAdminErr").style.display = "block";
      }
    });
    return;
  }

  const all = await fetchAll();
  const pending = all.filter((h) => h.status === "pending");
  const decided = all.filter((h) => h.status !== "pending");

  app.innerHTML = `
    <h1 class="page-title" style="font-size:32px;">Review queue</h1>
    <p class="lede">${pending.length} hospital${pending.length === 1 ? "" : "s"} awaiting approval.</p>
    <div id="pendingArea">
      ${pending.length === 0
        ? `<div class="empty-state">Nothing waiting for review.</div>`
        : pending.map(pendingRowHtml).join("")}
    </div>
    <div class="section">
      <h2 class="section-title" style="font-size:20px;">Decided (${decided.length})</h2>
      ${decided.map((h) => `
        <div class="row">
          <div class="row-main">
            <div class="row-name">${esc(h.name)}</div>
            <div class="row-sub">${esc(h.city || "—")}</div>
          </div>
          <span class="status-badge ${h.status}">${h.status}</span>
        </div>`).join("")}
    </div>
  `;

  pending.forEach((h) => {
    const approveBtn = document.getElementById(`approve-${h.id}`);
    const rejectBtn = document.getElementById(`reject-${h.id}`);
    if (approveBtn) {
      approveBtn.addEventListener("click", async () => {
        const ratingInput = document.getElementById(`rating-${h.id}`);
        const rating = Math.min(5, Math.max(0, Number(ratingInput.value) || 4.5));
        approveBtn.disabled = true;
        await updateHospital(h.id, { status: "approved", rating });
        renderAdmin();
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener("click", async () => {
        rejectBtn.disabled = true;
        await updateHospital(h.id, { status: "rejected" });
        renderAdmin();
      });
    }
  });
}

function pendingRowHtml(h) {
  return `
    <div class="pending-row">
      <h4>${esc(h.name)}</h4>
      <div class="meta">${esc(h.specialty || "—")} · ${esc(h.city || "—")} · submitted ${fmtDate(h.created_at)}</div>
      ${h.description ? `<div class="meta">${esc(h.description)}</div>` : ""}
      <div class="meta" style="display:flex;align-items:center;">
        Rating to assign on approval:
        <input class="rating-input" type="number" id="rating-${h.id}" min="0" max="5" step="0.1" value="4.5" />
      </div>
      <div class="admin-actions">
        <button class="approve" id="approve-${h.id}">Approve</button>
        <button class="reject" id="reject-${h.id}">Reject</button>
      </div>
    </div>`;
}
