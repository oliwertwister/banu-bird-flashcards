const state = {
  allCards: [],
  cards: [],
  currentIndex: 0,
  flipped: false,
  shuffled: false,
  currentView: "cards",
};

const els = {
  flashcard: document.querySelector("#flashcard"),
  speciesName: document.querySelector("#speciesName"),
  scientificPreview: document.querySelector("#scientificPreview"),
  backSpeciesName: document.querySelector("#backSpeciesName"),
  cardNumber: document.querySelector("#cardNumber"),
  fieldGrid: document.querySelector("#fieldGrid"),
  positionLabel: document.querySelector("#positionLabel"),
  resultLabel: document.querySelector("#resultLabel"),
  progressBar: document.querySelector("#progressBar"),
  searchInput: document.querySelector("#searchInput"),
  orderFilter: document.querySelector("#orderFilter"),
  familyFilter: document.querySelector("#familyFilter"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  flipButton: document.querySelector("#flipButton"),
  shuffleButton: document.querySelector("#shuffleButton"),
  resetButton: document.querySelector("#resetButton"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  emptyState: document.querySelector("#emptyState"),
  cardStage: document.querySelector(".card-stage"),
  bottomControls: document.querySelector(".bottom-controls"),
  frontMedia: document.querySelector("#frontMedia"),
  frontImage: document.querySelector("#frontImage"),
  backMedia: document.querySelector("#backMedia"),
  backImage: document.querySelector("#backImage"),
  cardsView: document.querySelector("#cardsView"),
  systematicsView: document.querySelector("#systematicsView"),
  systematicsSearch: document.querySelector("#systematicsSearch"),
  taxonomyTree: document.querySelector("#taxonomyTree"),
  taxonomyCount: document.querySelector("#taxonomyCount"),
  statsSpecies: document.querySelector("#statsSpecies"),
  statsOrders: document.querySelector("#statsOrders"),
  statsMedian: document.querySelector("#statsMedian"),
  statsLargest: document.querySelector("#statsLargest"),
  statsLargestName: document.querySelector("#statsLargestName"),
  orderChart: document.querySelector("#orderChart"),
  viewTabs: [...document.querySelectorAll(".view-tab")],
  topbarActions: document.querySelector(".topbar-actions"),
};

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
}

function fillSelect(select, values, defaultLabel) {
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = defaultLabel;
  select.append(all);

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}
function setImage(card) {
  const hasImage = Boolean(card.image);
  for (const pair of [
    [els.frontMedia, els.frontImage],
    [els.backMedia, els.backImage],
  ]) {
    const media = pair[0];
    const image = pair[1];
    media.hidden = !hasImage;
    if (hasImage) {
      image.src = card.image;
      image.alt = card.imageAlt || card.art;
    } else {
      image.removeAttribute("src");
      image.alt = "";
    }
  }
}

function renderCard() {
  const hasCards = state.cards.length > 0;
  els.cardStage.hidden = !hasCards;
  els.bottomControls.hidden = !hasCards;
  els.emptyState.hidden = hasCards;

  if (!hasCards) {
    els.positionLabel.textContent = "0 / 0";
    els.resultLabel.textContent = "keine Karten";
    els.progressBar.style.width = "0%";
    return;
  }

  state.currentIndex = Math.max(0, Math.min(state.currentIndex, state.cards.length - 1));
  const card = state.cards[state.currentIndex];

  els.speciesName.textContent = card.art;
  els.scientificPreview.textContent = card.fields["Wissenschaftlicher Name"] || "";
  els.scientificPreview.style.opacity = "1";
  els.backSpeciesName.textContent = card.art;
  els.cardNumber.textContent = String(card.id).padStart(2, "0");
  setImage(card);

  els.fieldGrid.replaceChildren();
  for (const field of card.displayOrder) {
    if (field === "Wissenschaftlicher Name") continue;
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = field;
    dd.textContent = card.fields[field] || "–";
    wrapper.append(dt, dd);
    els.fieldGrid.append(wrapper);
  }

  els.positionLabel.textContent = String(state.currentIndex + 1) + " / " + String(state.cards.length);
  els.resultLabel.textContent = state.cards.length === 1 ? "Karte" : "Karten";
  els.progressBar.style.width = String(((state.currentIndex + 1) / state.cards.length) * 100) + "%";
  els.prevButton.disabled = state.cards.length < 2;
  els.nextButton.disabled = state.cards.length < 2;

  setFlipped(false);
}
function setFlipped(value) {
  state.flipped = value;
  els.flashcard.classList.toggle("is-flipped", value);
  const back = els.flashcard.querySelector(".card-back");
  back.setAttribute("aria-hidden", String(!value));
  els.flipButton.textContent = value ? "Vorderseite zeigen" : "Antwort anzeigen";
}

function move(delta) {
  if (state.cards.length < 2) return;
  state.currentIndex = (state.currentIndex + delta + state.cards.length) % state.cards.length;
  renderCard();
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLocaleLowerCase("de");
  const order = els.orderFilter.value;
  const family = els.familyFilter.value;

  let filtered = state.allCards.filter((card) => {
    if (order && card.fields["Ordnung"] !== order) return false;
    if (family && card.fields["Familie"] !== family) return false;
    if (!query) return true;

    const haystack = [card.art, ...Object.values(card.fields)]
      .join(" ")
      .toLocaleLowerCase("de");

    return haystack.includes(query);
  });

  if (state.shuffled) {
    filtered = shuffle(filtered);
  }

  state.cards = filtered;
  state.currentIndex = 0;
  renderCard();
}

function clearFilters() {
  els.searchInput.value = "";
  els.orderFilter.value = "";
  els.familyFilter.value = "";
  state.shuffled = false;
  state.cards = [...state.allCards];
  state.currentIndex = 0;
  renderCard();
}
async function loadData() {
  const response = await fetch("data/birds.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load bird data (" + response.status + ")");
  }

  const payload = await response.json();
  const displayOrder = payload.meta.displayFields;

  state.allCards = payload.cards.map((card) => ({
    ...card,
    displayOrder,
  }));
  state.cards = [...state.allCards];

  fillSelect(
    els.orderFilter,
    uniqueSorted(state.allCards.map((card) => card.fields["Ordnung"])),
    "Alle Ordnungen"
  );
  fillSelect(
    els.familyFilter,
    uniqueSorted(state.allCards.map((card) => card.fields["Familie"])),
    "Alle Familien"
  );

  renderCard();
  renderOrderStats();
  renderSystematics();
  if (window.location.hash === "#systematik") {
    switchView("systematics", false);
  }
}

els.flashcard.addEventListener("click", () => setFlipped(!state.flipped));
els.flipButton.addEventListener("click", () => setFlipped(!state.flipped));
els.prevButton.addEventListener("click", () => move(-1));
els.nextButton.addEventListener("click", () => move(1));
els.searchInput.addEventListener("input", applyFilters);
els.orderFilter.addEventListener("change", applyFilters);
els.familyFilter.addEventListener("change", applyFilters);
els.clearFiltersButton.addEventListener("click", clearFilters);

els.shuffleButton.addEventListener("click", () => {
  state.cards = shuffle(state.cards);
  state.shuffled = true;
  state.currentIndex = 0;
  renderCard();
});

els.resetButton.addEventListener("click", clearFilters);

document.addEventListener("keydown", (event) => {
  const tag = document.activeElement && document.activeElement.tagName;
  const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
  if (typing || state.currentView !== "cards") return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    move(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    move(1);
  } else if (event.key === " " || event.code === "Space") {
    event.preventDefault();
    setFlipped(!state.flipped);
  }
});

loadData().catch((error) => {
  console.error(error);
  els.cardStage.hidden = true;
  els.bottomControls.hidden = true;
  els.emptyState.hidden = false;
  els.emptyState.querySelector("h2").textContent = "Daten konnten nicht geladen werden";
  els.emptyState.querySelector("p").textContent =
    "Prüfe, ob data/birds.json vorhanden ist und die Seite über einen Webserver geöffnet wurde.";
  els.clearFiltersButton.hidden = true;
});

function switchView(view, updateHash = true) {
  state.currentView = view;
  const showCards = view === "cards";
  els.cardsView.hidden = !showCards;
  els.systematicsView.hidden = showCards;
  els.topbarActions.hidden = !showCards;

  for (const tab of els.viewTabs) {
    const active = tab.dataset.view === view;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  }

  if (updateHash) {
    const hash = showCards ? "" : "#systematik";
    history.replaceState(null, "", window.location.pathname + window.location.search + hash);
  }
}

function cardMatchesTaxonomySearch(card, query) {
  if (!query) return true;
  const haystack = [
    card.art,
    card.fields["Wissenschaftlicher Name"],
    card.fields["Ordnung"],
    card.fields["Familie"],
  ].join(" ").toLocaleLowerCase("de");
  return haystack.includes(query);
}

function taxonomySummary(rank, name, count) {
  const summary = document.createElement("summary");
  const rankEl = document.createElement("span");
  const nameEl = document.createElement("strong");
  const countEl = document.createElement("span");

  rankEl.className = "taxonomy-rank";
  rankEl.textContent = rank;
  nameEl.textContent = name;
  countEl.className = "taxonomy-count";
  countEl.textContent = count + (count === 1 ? " Art" : " Arten");

  summary.append(rankEl, nameEl, countEl);
  return summary;
}


function renderOrderStats() {
  if (!state.allCards.length) return;

  const counts = new Map();
  for (const card of state.allCards) {
    const order = card.fields["Ordnung"] || "Ohne Ordnung";
    counts.set(order, (counts.get(order) || 0) + 1);
  }

  const rows = [...counts.entries()]
    .map(([order, count]) => ({ order, count }))
    .sort((a, b) => b.count - a.count || a.order.localeCompare(b.order, "de"));

  const values = rows.map((row) => row.count).sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2
    ? values[middle]
    : (values[middle - 1] + values[middle]) / 2;
  const largest = rows[0];
  const maximum = largest ? largest.count : 1;

  els.statsSpecies.textContent = String(state.allCards.length);
  els.statsOrders.textContent = String(rows.length);
  els.statsMedian.textContent = Number.isInteger(median)
    ? String(median)
    : median.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  els.statsLargest.textContent = largest ? String(largest.count) : "–";
  els.statsLargestName.textContent = largest ? largest.order : "";
  els.orderChart.replaceChildren();

  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "order-chart-row";

    const label = document.createElement("span");
    label.className = "order-chart-label";
    label.textContent = row.order;

    const track = document.createElement("div");
    track.className = "order-chart-track";

    const bar = document.createElement("span");
    bar.className = "order-chart-bar";
    bar.style.width = String((row.count / maximum) * 100) + "%";
    bar.setAttribute("aria-hidden", "true");
    track.append(bar);

    const value = document.createElement("strong");
    value.className = "order-chart-value";
    value.textContent = String(row.count);

    item.append(label, track, value);
    els.orderChart.append(item);
  }
}

function renderSystematics() {
  if (!state.allCards.length) return;

  const query = els.systematicsSearch.value.trim().toLocaleLowerCase("de");
  const matches = state.allCards.filter((card) => cardMatchesTaxonomySearch(card, query));
  els.taxonomyTree.replaceChildren();
  els.taxonomyCount.textContent = matches.length + (matches.length === 1 ? " Art" : " Arten");

  const byOrder = new Map();
  for (const card of matches) {
    const order = card.fields["Ordnung"] || "Ohne Ordnung";
    const family = card.fields["Familie"] || "Ohne Familie";

    if (!byOrder.has(order)) byOrder.set(order, new Map());
    const byFamily = byOrder.get(order);
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family).push(card);
  }

  const orderNames = [...byOrder.keys()].sort((a, b) => a.localeCompare(b, "de"));

  for (const orderName of orderNames) {
    const families = byOrder.get(orderName);
    const orderCards = [...families.values()].flat();
    const orderNode = document.createElement("details");
    orderNode.className = "taxonomy-order";
    orderNode.open = Boolean(query);
    orderNode.append(taxonomySummary("Ordnung", orderName, orderCards.length));

    const familyWrap = document.createElement("div");
    familyWrap.className = "taxonomy-children";

    const familyNames = [...families.keys()].sort((a, b) => a.localeCompare(b, "de"));
    for (const familyName of familyNames) {
      const familyCards = families.get(familyName)
        .slice()
        .sort((a, b) => a.art.localeCompare(b.art, "de"));

      const familyNode = document.createElement("details");
      familyNode.className = "taxonomy-family";
      familyNode.open = Boolean(query);
      familyNode.append(taxonomySummary("Familie", familyName, familyCards.length));

      const speciesList = document.createElement("div");
      speciesList.className = "taxonomy-species-list";

      for (const card of familyCards) {
        const button = document.createElement("button");
        button.className = "taxonomy-species";
        button.type = "button";

        const german = document.createElement("span");
        german.className = "taxonomy-german";
        german.textContent = card.art;

        const latin = document.createElement("em");
        latin.className = "taxonomy-latin";
        latin.textContent = card.fields["Wissenschaftlicher Name"] || "";

        button.append(german, latin);
        button.addEventListener("click", () => {
          clearFilters();
          const index = state.cards.findIndex((candidate) => candidate.id === card.id);
          if (index >= 0) {
            state.currentIndex = index;
            renderCard();
          }
          switchView("cards");
          window.scrollTo({ top: 0, behavior: "smooth" });
        });

        speciesList.append(button);
      }

      familyNode.append(speciesList);
      familyWrap.append(familyNode);
    }

    orderNode.append(familyWrap);
    els.taxonomyTree.append(orderNode);
  }

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "taxonomy-empty";
    empty.textContent = "Keine passende Art, Familie oder Ordnung gefunden.";
    els.taxonomyTree.append(empty);
  }
}

for (const tab of els.viewTabs) {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
}

els.systematicsSearch.addEventListener("input", renderSystematics);

window.addEventListener("hashchange", () => {
  switchView(window.location.hash === "#systematik" ? "systematics" : "cards", false);
});
