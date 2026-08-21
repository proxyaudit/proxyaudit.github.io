// ProxyAudit — hero prompt rotation + synced portrait grid
// The rotating terms below are the actual prompts from the paper's
// three proxy categories (occupation, geography, surname). Each term
// maps to a folder of real generated portraits (assets/portraits/)
// sampled from that exact prompt across all three models tested in
// the paper. When the headline word changes, the grid swaps to show
// images actually generated from that prompt — the hero demonstrates
// the method instead of just describing it.

const PROMPT_TERMS = [
  { prefix: "What does a", word: "CEO", category: "ceo" },
  { prefix: "What does a", word: "software developer", category: "developer" },
  { prefix: "What does a", word: "registered nurse", category: "nurse" },
  { prefix: "What does a person", word: "from Michigan", category: "michigan" },
  { prefix: "What does a person", word: "from Memphis", category: "memphis" },
  { prefix: "What does a person", word: "with the last name Chen", category: "chen" },
  { prefix: "What does a person", word: "with the last name Charles", category: "charles" },
];

let PORTRAIT_MANIFEST = null;

async function loadManifest() {
  try {
    const res = await fetch("assets/portraits/manifest.json");
    PORTRAIT_MANIFEST = await res.json();
  } catch (e) {
    PORTRAIT_MANIFEST = null;
  }
}

function shuffledCopy(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleTerms(previous) {
  const next = shuffledCopy(PROMPT_TERMS);
  if (previous && next.length > 1 && next[0].category === previous.category) {
    const swapWith = next.findIndex((t, idx) => idx > 0 && t.category !== previous.category);
    if (swapWith > 0) [next[0], next[swapWith]] = [next[swapWith], next[0]];
  }
  return next;
}

function preload(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve(src);
    img.src = src;
  });
}

function makeTile(src) {
  const tile = document.createElement("div");
  tile.className = "portrait-tile";
  const a = document.createElement("div");
  a.className = "portrait-face is-active";
  a.style.backgroundImage = `url('${src}')`;
  const b = document.createElement("div");
  b.className = "portrait-face";
  tile.append(a, b);
  return tile;
}

let gridGen = 0;

async function renderGridForCategory(category) {
  const grid = document.querySelector("[data-portrait-grid]");
  if (!grid || !PORTRAIT_MANIFEST) return;

  const files = PORTRAIT_MANIFEST[category];
  if (!files || !files.length) return;

  const cols = window.innerWidth < 720 ? 5 : 10;
  const rows = 7;
  const total = cols * rows;
  grid.style.setProperty("--cols", cols);

  const order = shuffledCopy(files);
  const urls = Array.from({ length: total }, (_, n) =>
    `assets/portraits/${order[n % order.length]}`
  );

  const gen = ++gridGen;
  await Promise.all(urls.map(preload));
  if (gen !== gridGen) return;

  const tiles = grid.querySelectorAll(".portrait-tile");

  if (tiles.length === total) {
    tiles.forEach((tile, n) => {
      const faces = tile.querySelectorAll(".portrait-face");
      const current = tile.querySelector(".portrait-face.is-active");
      const next = [...faces].find((f) => f !== current) || faces[1];
      if (!next) return;

      next.style.backgroundImage = `url('${urls[n]}')`;
      next.classList.add("is-incoming", "is-active");

      const settle = () => {
        next.removeEventListener("transitionend", settle);
        if (current && current !== next) current.classList.remove("is-active", "is-incoming");
        next.classList.remove("is-incoming");
      };
      next.addEventListener("transitionend", settle);
      setTimeout(settle, 220);
    });
  } else {
    grid.innerHTML = "";
    urls.forEach((src) => grid.appendChild(makeTile(src)));
  }
}

async function initHero() {
  const blank = document.querySelector("[data-hero-blank]");
  const prefix = document.querySelector("[data-hero-prefix]");
  if (!blank || !prefix) return;

  await loadManifest();

  let terms = shuffleTerms();
  let i = 0;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function render() {
    const term = terms[i];
    prefix.textContent = term.prefix;
    blank.textContent = term.word;
    renderGridForCategory(term.category);
  }

  function advance() {
    i += 1;
    if (i >= terms.length) {
      terms = shuffleTerms(terms[terms.length - 1]);
      i = 0;
    }
  }

  render();
  if (prefersReduced) return;

  setInterval(() => {
    prefix.style.opacity = "0";
    blank.style.opacity = "0";
    setTimeout(() => {
      advance();
      render();
      prefix.style.opacity = "1";
      blank.style.opacity = "1";
    }, 220);
  }, 3200);
}

document.addEventListener("DOMContentLoaded", () => {
  initHero();
});
