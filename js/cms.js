/**
 * Webflow-style CMS binder.
 * Source of truth: /cms/content.json (collections + fields).
 */
export async function loadCMS() {
  const res = await fetch("cms/content.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("CMS unavailable");
  const data = await res.json();

  document.querySelectorAll("[data-cms]").forEach((el) => {
    const path = el.getAttribute("data-cms");
    const val = path.split(".").reduce((o, k) => (o == null ? o : o[k]), data);
    if (val == null) return;
    if (el.tagName === "IMG") el.setAttribute("src", String(val));
    else if (Array.isArray(val)) {
      el.innerHTML = val.map((p) => "<p>" + String(p) + "</p>").join("");
    } else if (el.hasAttribute("data-cms-html")) el.innerHTML = String(val);
    else el.textContent = String(val);
  });

  document.querySelectorAll("[data-cms-href]").forEach((el) => {
    const path = el.getAttribute("data-cms-href");
    const val = path.split(".").reduce((o, k) => (o == null ? o : o[k]), data);
    if (val == null) return;
    const href = String(val).includes("@") && !String(val).startsWith("http") ? "mailto:" + val : String(val);
    el.setAttribute("href", href);
  });

  return data;
}

export function bindTapes(tapes) {
  const track = document.querySelector("[data-cms-repeat='tapes']");
  if (!track || !Array.isArray(tapes)) return;
  const tpl = track.querySelector("template");
  if (!tpl) return;
  tapes.forEach((tape, i) => {
    const node = tpl.content.cloneNode(true);
    const root = node.querySelector(".work") || node.querySelector(".tape") || node.firstElementChild;
    if (root) root.style.setProperty("--i", String(i));
    node.querySelectorAll("[data-field]").forEach((el) => {
      const key = el.getAttribute("data-field");
      if (key === "art" && el.tagName === "IMG") {
        el.src = tape.art;
        el.alt = tape.alt || (tape.title + " — abstract mercury tape art");
        el.loading = "lazy";
        el.decoding = "async";
        el.width = 1024;
        el.height = 1024;
      } else if (tape[key] != null) {
        el.textContent = String(tape[key]);
      }
    });
    const btn = node.querySelector(".play");
    if (btn && tape.sketch) {
      btn.setAttribute("data-play", tape.sketch);
      btn.setAttribute("data-title", tape.title);
    }
    track.appendChild(node);
  });
}

export function bindCredits(credits) {
  const list = document.querySelector("[data-cms-repeat='credits']");
  if (!list || !Array.isArray(credits)) return;
  const tpl = list.querySelector("template");
  if (!tpl) return;
  credits.forEach((row, i) => {
    const node = tpl.content.cloneNode(true);
    node.querySelectorAll("[data-field]").forEach((el) => {
      const key = el.getAttribute("data-field");
      if (key === "index") el.textContent = String(i + 1).padStart(2, "0");
      else if (row[key] != null) el.textContent = String(row[key]);
    });
    list.appendChild(node);
  });
}

export function bindStats(stats) {
  const host = document.querySelector(".stats");
  if (!host || !Array.isArray(stats)) return;
  host.innerHTML = stats
    .map((s) => '<div class="stat"><b>' + s.n + "</b><span>" + s.l + "</span></div>")
    .join("");
}

export function bindList(sel, items, field) {
  const host = document.querySelector(sel);
  if (!host || !Array.isArray(items)) return;
  host.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement(host.tagName === "UL" || host.tagName === "OL" ? "li" : "div");
    if (typeof item === "string") li.textContent = item;
    else {
      li.innerHTML =
        '<span class="rate__item">' +
        (item.item || "") +
        '</span><span class="rate__note">' +
        (item.note || "") +
        "</span>";
      li.className = "rate";
    }
    if (field) li.setAttribute("data-field", field);
    host.appendChild(li);
  });
}
