"use strict";

/* =========================
   Stato globale
========================= */
let thoughtsData = null;
let lastThoughtKey = null;

/* =========================
   Utility
========================= */
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Errore caricamento ${path}: ${res.status}`);
  return res.json();
}

function $(sel) {
  return document.querySelector(sel);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function setSafeText(selector, text) {
  const node = $(selector);
  if (node) node.textContent = text ?? "";
}

function renderParagraphs(container, lines) {
  if (!container) return;
  container.innerHTML = "";
  for (const line of lines) container.appendChild(el("p", null, line));
}

function renderList(container, items) {
  if (!container) return;
  container.innerHTML = "";
  for (const it of items) container.appendChild(el("li", null, it));
}

function renderChips(container, items) {
  if (!container) return;
  container.innerHTML = "";
  for (const it of items) container.appendChild(el("li", "chip", it));
}

function renderProjects(grid, projects) {
  if (!grid) return;
  grid.innerHTML = "";
  for (const p of projects) {
    const card = el("article", "card project");
    const head = el("div", "project-head");
    head.appendChild(el("h3", null, p.title));
    head.appendChild(el("p", "muted small", p.why));

    const stacks = el("div", "stack");
    for (const s of (p.stack ?? [])) stacks.appendChild(el("span", "badge", s));

    const actions = el("div", "project-actions");
    if (p.repo) {
      const a = el("a", "btn tiny", "Repo");
      a.href = p.repo;
      a.target = "_blank";
      a.rel = "noreferrer";
      actions.appendChild(a);
    }
    if (p.demo) {
      const a = el("a", "btn tiny ghost", "Demo");
      a.href = p.demo;
      a.target = "_blank";
      a.rel = "noreferrer";
      actions.appendChild(a);
    }

    const highlights = el("ul", "list compact");
    for (const h of (p.highlights ?? [])) highlights.appendChild(el("li", null, h));

    card.appendChild(head);
    card.appendChild(stacks);
    card.appendChild(highlights);
    card.appendChild(actions);

    grid.appendChild(card);
  }
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildId() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ];
  return parts.join("");
}

/* =========================
   Thought UI (animazione)
========================= */
function showThought(text) {
  const node = document.getElementById("thought");
  if (!node) return;

  node.classList.remove("show");

  setTimeout(() => {
    node.textContent = text ?? "";
    node.classList.add("show");
  }, 100);
}

/* =========================
   Thought engine “elegante”
   (categorie + pesi + rari)
========================= */

// Supporta due formati:
// A) vecchio: { "debug": ["..", ".."], "cosmo": [".."] }
// B) nuovo:   { "debug": { "weight": 3, "items": [".."], "rareChance": 0.02 }, ... }

function normalizeThoughts(raw) {
  // Se è un array, lo trasformiamo in una categoria unica
  if (Array.isArray(raw)) {
    return { casuale: { weight: 1, items: raw } };
  }

  // Se è un oggetto
  const out = {};
  for (const [cat, value] of Object.entries(raw ?? {})) {
    if (Array.isArray(value)) {
      out[cat] = { weight: 1, items: value };
    } else if (value && typeof value === "object") {
      const items = Array.isArray(value.items) ? value.items : [];
      const weight = typeof value.weight === "number" ? value.weight : 1;
      const rareChance = typeof value.rareChance === "number" ? value.rareChance : null;
      out[cat] = { weight, items, rareChance };
    }
  }
  return out;
}

function pickWeightedCategory(thoughtsObj) {
  const entries = Object.entries(thoughtsObj)
    .filter(([_, v]) => v && Array.isArray(v.items) && v.items.length);

  if (!entries.length) return null;

  // Prima: categoria “rara” se scatta
  for (const [cat, v] of entries) {
    if (typeof v.rareChance === "number" && Math.random() < v.rareChance) {
      return cat;
    }
  }

  // Poi: pesca con pesi
  const total = entries.reduce((sum, [_, v]) => sum + (v.weight ?? 1), 0);
  let r = Math.random() * total;

  for (const [cat, v] of entries) {
    r -= (v.weight ?? 1);
    if (r <= 0) return cat;
  }

  return entries[entries.length - 1][0];
}

function pickThoughtElegant() {
  if (!thoughtsData || typeof thoughtsData !== "object") return { text: "", category: "" };

  const cat = pickWeightedCategory(thoughtsData);
  if (!cat) return { text: "", category: "" };

  const items = thoughtsData[cat].items;
  if (!items?.length) return { text: "", category: cat };

  let idx = Math.floor(Math.random() * items.length);
  let key = `${cat}|${idx}`;

  // Anti-ripetizione immediata
  if (items.length > 1 && key === lastThoughtKey) {
    idx = (idx + 1) % items.length;
    key = `${cat}|${idx}`;
  }

  lastThoughtKey = key;
  return { text: items[idx], category: cat };
}

/* =========================
   Main
========================= */
(async function main() {
  setSafeText("#year", String(new Date().getFullYear()));
  setSafeText("#buildId", buildId());

  try {
    const [profile, diag, thoughtsRaw] = await Promise.all([
      loadJSON("data/profile.json"),
      loadJSON("data/diagnostics.json"),
      loadJSON("data/thoughts.json"),
    ]);

    // Normalizza e salva globalmente
    thoughtsData = normalizeThoughts(thoughtsRaw);

    // profile
    setSafeText("#name", profile.name);
    setSafeText("#tagline", profile.tagline);
    setSafeText("#heroLead", profile.heroLead ?? $("#heroLead")?.textContent);
    setSafeText("#aboutSubtitle", profile.aboutSubtitle ?? $("#aboutSubtitle")?.textContent);

    renderParagraphs($("#aboutText"), profile.about ?? []);
    renderList($("#nowList"), profile.now ?? []);

    // contacts
    const contact = $("#contactLinks");
    if (contact) {
      contact.innerHTML = "";
      if (profile.links?.github) {
        const a = el("a", "link", "GitHub");
        a.href = profile.links.github;
        a.target = "_blank";
        a.rel = "noreferrer";
        contact.appendChild(a);
      }
      if (profile.links?.email) {
        const a = el("a", "link", "Email");
        a.href = profile.links.email;
        a.target = "_blank";
        a.rel = "noreferrer";
        contact.appendChild(a);
      }
      if (profile.links?.insta) {
        const a = el("a", "link", "Instagram");
        a.href = profile.links.insta;
        a.target = "_blank";
        a.rel = "noreferrer";
        contact.appendChild(a);
      }
      if (profile.links?.tiktok) {
        const a = el("a", "link", "TikTok");
        a.href = profile.links.tiktok;
        a.target = "_blank";
        a.rel = "noreferrer";
        contact.appendChild(a);
      }
    }

    // diagnostics
    renderChips($("#abilities"), diag.abilities ?? []);
    renderChips($("#disabilities"), diag.disabilities ?? []);

    // thoughts button
    const btnTruth = $("#btnTruth");
    const sayThought = () => {
       const t = pickThoughtElegant();
       showThought(t.text);

     const thoughtBox = document.getElementById("thought");

     // rimuove eventuale classe musa precedente
     thoughtBox.classList.remove("musa");

     // se la categoria è musa aggiunge la classe
     if (t.category === "musa") {
       thoughtBox.classList.add("musa");
     }

     const tag = document.getElementById("thoughtTag");
     if (tag) tag.textContent = t.category ? `#${t.category}` : "";
   };

    if (btnTruth) btnTruth.addEventListener("click", sayThought);

    // una frase al primo load
    sayThought();

    // Autoplay “gentile” (commenta se non lo vuoi)
    // setInterval(() => {
    //   if (document.visibilityState === "visible") sayThought();
    // }, 12000);

    // meter meme
    const meterBar = $("#meterBar");
    const btnMeter = $("#btnMeter");
    let deployed = false;
    if (btnMeter && meterBar) {
      btnMeter.addEventListener("click", () => {
        deployed = !deployed;
        const target = deployed ? 12 : 68; // dopo deploy: panico controllato
        meterBar.style.width = `${target}%`;
        btnMeter.textContent = deployed ? "Rollback (per favore)" : "Simula deploy";
      });
    }
  } catch (err) {
    console.error(err);
    showThought("Errore caricamento dati. (Plot twist: anche questo è coerente con la realtà.)");
  }
})();

/* =========================
   Typewriter
========================= */
const text = "booting Rosca.exe...";
const element = document.getElementById("typeText");
let i = 0;

function typeWriter() {
  if (!element) return;
  if (i < text.length) {
    element.textContent += text.charAt(i);
    i++;
    setTimeout(typeWriter, 60);
  }
}
typeWriter();

/* =========================
   Easter eggs (tastiera)
========================= */
let buffer = "";

document.addEventListener("keydown", (e) => {
  buffer += e.key;
  buffer = buffer.slice(-5);

  if (buffer === "debug") {
    showThought("Developer mode unlocked");
    buffer = "";
  } else if (buffer === "rosca") {
    showThought("Agnese è la mia musa ispiratrice di questo progetto.");
    buffer = "";
  } else if (buffer === "amore") {
    showThought("Mi piace pensare che dietro ogni riga di codice ci sia un po' di amore... o almeno un po' di passione per la tecnologia.");
    buffer = "";
  } else if (buffer === "alice") {
    showThought("Alice, top 5 carrier, top 5 pesci");
    buffer = "";
  } else if(buffer === "ciola") {
    showThouth("Viola il colore della ciola");
    buffer = "";
  }
});

/* =========================
   Confidence meter random
========================= */
function randomConfidence() {
  const meter = document.getElementById("meterBar");
  if (!meter) return;
  const value = Math.floor(Math.random() * 100);
  meter.style.width = value + "%";
}

// Se lo chiami da onclick="" deve stare globale:
window.randomConfidence = randomConfidence;
