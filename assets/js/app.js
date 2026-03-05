"use strict";

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
  container.innerHTML = "";
  for (const line of lines) {
    const p = el("p", null, line);
    container.appendChild(p);
  }
}

function renderList(container, items) {
  container.innerHTML = "";
  for (const it of items) {
    const li = el("li", null, it);
    container.appendChild(li);
  }
}

function renderChips(container, items) {
  container.innerHTML = "";
  for (const it of items) {
    const li = el("li", "chip", it);
    container.appendChild(li);
  }
}

function renderProjects(grid, projects) {
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
  // “build” simpatico e deterministico-ish, senza librerie
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0")
  ];
  return parts.join("");
}

(async function main() {
  setSafeText("#year", String(new Date().getFullYear()));
  setSafeText("#buildId", buildId());

  try {
    const [profile, diag, thoughts] = await Promise.all([
      loadJSON("data/profile.json"),
      loadJSON("data/diagnostics.json"),
      loadJSON("data/thoughts.json"),
    ]);

    // profile
    setSafeText("#name", profile.name);
    setSafeText("#tagline", profile.tagline);
    setSafeText("#heroLead", profile.heroLead ?? $("#heroLead").textContent);
    setSafeText("#aboutSubtitle", profile.aboutSubtitle ?? $("#aboutSubtitle").textContent);

    renderParagraphs($("#aboutText"), profile.about ?? []);
    renderList($("#nowList"), profile.now ?? []);

    // contacts
    const contact = $("#contactLinks");
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

    // diagnostics
    renderChips($("#abilities"), diag.abilities ?? []);
    renderChips($("#disabilities"), diag.disabilities ?? []);


    // thoughts button
    const thoughtEl = $("#thought");
    const btnTruth = $("#btnTruth");
    const sayThought = () => {
    const msg = randomItem(thoughts ?? []);
    thoughtEl.textContent = msg || "";
    };
    btnTruth.addEventListener("click", sayThought);
    // una frase al primo load
    sayThought();

    // meter meme
    const meterBar = $("#meterBar");
    const btnMeter = $("#btnMeter");
    let deployed = false;
    btnMeter.addEventListener("click", () => {
      deployed = !deployed;
      const target = deployed ? 12 : 68; // dopo deploy: panico controllato
      meterBar.style.width = `${target}%`;
      btnMeter.textContent = deployed ? "Rollback (per favore)" : "Simula deploy";
    });

  } catch (err) {
    console.error(err);
    $("#thought").textContent = "Errore caricamento dati. (Plot twist: anche questo è coerente con la realtà.)";
  }
})();

const text = "booting Rosca.exe...";
const element = document.getElementById("typeText");

let i = 0;

function typeWriter() {
  if (i < text.length) {
    element.textContent += text.charAt(i);
    i++;
    setTimeout(typeWriter, 60);
  }
}

typeWriter();

function showThought(text){
  const el = document.getElementById("thought");

  el.classList.remove("show");

  setTimeout(()=>{
    el.textContent = text;
    el.classList.add("show");
  },100);
}

let buffer = "";

document.addEventListener("keydown", e=>{
  buffer += e.key;
  buffer = buffer.slice(-5);

  if(buffer === "debug"){
    showThought("Developer mode unlocked");
    buffer = "";
  } else if(buffer === "rosca"){
    showThought("Agnese è la mia musa ispiratrice di questo progetto.");
    buffer = "";
  } else if(buffer === "amore"){
    showThought("Mi piace pensare che dietro ogni riga di codice ci sia un po' di amore... o almeno un po' di passione per la tecnologia. Forse è per questo che a volte mi ritrovo a parlare con il mio computer come se fosse una persona, chiedendogli se ha bisogno di una pausa o se vuole un caffè virtuale. In fondo, siamo tutti un po' innamorati del nostro lavoro, no?");
    buffer = "";
  } else if(buffer === "alice"){
    showThought("Alice, top 5 carrier, top 5 pesci");
    buffer = "";
  }
});

const meter = document.getElementById("meterBar");

function randomConfidence(){
  const value = Math.floor(Math.random()*100);
  meter.style.width = value + "%";
}

const categories = Object.keys(thoughts)
const randomCategory = categories[Math.floor(Math.random() * categories.length)]

const categoryThoughts = thoughts[randomCategory]
const randomThought = categoryThoughts[Math.floor(Math.random() * categoryThoughts.length)]
