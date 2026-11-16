import {
  renderCatalog,
  renderCompanyResults,
  renderCompanyDetails,
  renderCatalogSnapshot,
} from "./catalog.js";
import { loadContent } from "./content.js";
("use strict");
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  orbit:
    '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/><path d="M9 3a9 9 0 0 1 12 12M15 21A9 9 0 0 1 3 9"/>',
  network:
    '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m10 8-4 8m8-8 4 8M8 19h8"/>',
  layers:
    '<path d="m12 3 10 5-10 5L2 8Z"/><path d="m2 12 10 5 10-5M2 16l10 5 10-5"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
  cap: '<path d="m2 9 10-5 10 5-10 5-10-5Z"/><path d="M6 11v5c3 3 9 3 12 0v-5M22 9v7"/>',
  box: '<path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
  route:
    '<circle cx="6" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="M6 8v7a4 4 0 0 0 4 4h5M18 16V9a4 4 0 0 0-4-4h-3"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  arrowUpRight: '<path d="M6 18 18 6M6 6h12v12"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  users:
    '<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-18a4 4 0 0 1 0 8m2 4a6 6 0 0 1 3 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  rocket:
    '<path d="M14 4c3-2 6-1 7-1 0 1 1 4-1 7l-8 8-6-6Z"/><circle cx="16" cy="8" r="2"/><path d="m7 11-4 1 1-6 6-1m3 12-1 4 6-1 1-6M7 17l-4 4m1-5-2 2m6 2-2 2"/>',
  planet:
    '<circle cx="12" cy="12" r="8"/><path d="M4 10c-6 5 0 9 9 4s13-9 7-8M7 6l3 3-1 3 4 2 1 5"/>',
  antenna:
    '<path d="M5 5a10 10 0 0 0 14 14L5 5Zm7 7 6-6M14 4l6 6M9 19l-2 3m8-3 2 3M3 2l19 20"/>',
  data: '<path d="m8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18"/>',
  chart: '<path d="M3 3v18h18M7 16l4-5 4 2 5-7"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Object.hasOwn(paths, name) ? paths[name] : paths.grid}</svg>`;
function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}
let project, copy, companyDataset;
const companyFilters = {
  query: "",
  role: "all",
  segment: "all",
  status: "all",
};
let networkView = "companies";
const catalogHelpers = { escapeHtml, icon, link: (...args) => link(...args) };
let sections = [],
  areas = [],
  regions = [],
  deliverables = [],
  phases = [],
  institutions = [],
  opportunityItems = [];
let ready = false;
const metric = (id) => project.metrics.find((m) => m.id === id).value;
const emptyState = () =>
  '<p class="empty-state">Nenhum conteúdo disponível nesta seção.</p>';
const state = { section: "overview", area: "all", region: "", view: "map" };
const main = document.querySelector("main");
const link = (href, label, cls = "text-link") =>
  `<a class="${cls}" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}${icon("arrowUpRight")}</a>`;
const sectionLink = (id, label) =>
  `<a class="text-link" href="#${id}">${escapeHtml(label)}${icon("arrow")}</a>`;
const panelHeading = (eyebrow, title, action = "") =>
  `<div class="panel-heading"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h2>${escapeHtml(title)}</h2></div>${action}</div>`;
function stats() {
  return `<div class="stats-grid">${project.metrics.map((m) => `<article class="stat-card"><div class="stat-label">${escapeHtml(m.title)}<span class="icon-tile ${m.color}">${icon(m.icon)}</span></div><div class="stat-value">${String(m.value).padStart(2, "0")}<span>${escapeHtml(m.unit)}</span></div><p>${escapeHtml(m.note)}</p></article>`).join("")}</div>`;
}
function mapPanel(full = false) {
  return `<section class="panel map-panel">${panelHeading(copy.mapEyebrow, full ? copy.mapFullTitle : copy.mapTitle, `<div class="segmented" aria-label="Visualização territorial"><button data-map-view="map" class="${state.view === "map" ? "selected" : ""}" aria-pressed="${state.view === "map"}">${icon("map")} Mapa</button><button data-map-view="list" class="${state.view === "list" ? "selected" : ""}" aria-pressed="${state.view === "list"}">${icon("layers")} Regiões</button></div>`)}<div class="map-intro"><span><span class="status-dot"></span> ${escapeHtml(copy.mapCoverage)}</span><span>${regions.length} mesorregiões</span></div><div class="map-stage ${state.view === "list" ? "list-view" : ""}">${state.view === "map" ? `<span class="map-coordinate">${escapeHtml(project.map.coordinates)}</span><img src="${escapeHtml(project.map.src)}" alt="${escapeHtml(project.map.alt)}"><span class="map-compass">N<br>↑</span><span class="map-watermark">${escapeHtml(project.map.label)}</span>` : `<div class="region-list">${regions.map((r, i) => `<button data-region="${i}" class="region-row ${state.region === r ? "active" : ""}"><span class="region-number">${String(i + 1).padStart(2, "0")}</span><span>${escapeHtml(r)}</span>${icon("arrowUpRight")}</button>`).join("") || emptyState()}</div>`}</div><div class="map-bottom"><div><span class="legend-dot"></span><span>${escapeHtml(copy.mapLegend)}</span></div>${sectionLink("regions", copy.mapLink)}</div>${full ? `<div class="region-filter"><label for="region-select">Explorar uma mesorregião</label><select id="region-select"><option value="">Todas as mesorregiões</option>${regions.map((r) => `<option value="${escapeHtml(r)}" ${state.region === r ? "selected" : ""}>${escapeHtml(r)}</option>`).join("")}</select><div id="region-detail" aria-live="polite">${regionDetail()}</div></div>` : ""}</section>`;
}
function regionDetail() {
  return `<strong>${escapeHtml(state.region || copy.regionTitle)}</strong><p>${escapeHtml(state.region ? copy.regionDescription : copy.regionOverview)}</p>`;
}
function opportunities(compact = false) {
  return `<section class="panel opportunities-panel">${panelHeading(copy.opportunitiesEyebrow, compact ? copy.opportunitiesCompactTitle : copy.opportunitiesTitle, compact ? sectionLink("opportunities", "Ver tudo") : "")}${opportunityItems.map((o) => `<div class="opportunity-card"><div class="opportunity-meta"><span class="badge ${o.color}">${escapeHtml(o.label)}</span><span>${escapeHtml(o.status)}</span></div><h3>${escapeHtml(o.title)}</h3><p>${escapeHtml(o.description)}</p>${link(o.url, o.linkLabel)}</div>`).join("") || emptyState()}<div class="radar-note">${icon("info")} ${escapeHtml(copy.opportunitiesNotice)}</div></section>`;
}
function areaCards(compact = false) {
  const list = areas.filter(
    (a) => compact || state.area === "all" || a.category === state.area,
  );
  return `<div class="areas-grid ${compact ? "compact" : ""}">${list.map((a) => `<button class="area-card" data-area-detail="${areas.indexOf(a)}"><span class="icon-tile ${a.color}">${icon(a.icon)}</span><span class="area-card-title">${escapeHtml(a.name)}</span>${!compact ? `<span class="area-description">${escapeHtml(a.description)}</span>` : `<span class="area-subtitle">${escapeHtml(a.tags.slice(0, 2).join(" · "))}</span>`}<span class="area-arrow">${icon("arrowUpRight")}</span></button>`).join("") || emptyState()}</div>`;
}
function roadmap(compact = false) {
  return `<section class="panel roadmap-panel">${panelHeading(copy.roadmapEyebrow, copy.roadmapTitle, compact ? sectionLink("roadmap", "Ver roadmap") : `<span class="badge neutral">Planejamento · ${metric("duration")} meses</span>`)}<div class="timeline">${phases.map((phase, i) => `<article class="phase"><div class="phase-dot">${String(i + 1).padStart(2, "0")}</div><span class="phase-month">${escapeHtml(phase.months)}</span><h3>${escapeHtml(phase.name)}</h3>${!compact ? `<p>${escapeHtml(phase.description)}</p>` : ""}</article>`).join("") || emptyState()}</div>${!compact ? `<div class="notice">${escapeHtml(copy.roadmapNotice)}</div>` : ""}</section>`;
}
function overview() {
  return `<section class="welcome-banner"><div class="welcome-content"><span class="hero-eyebrow"><span class="status-dot"></span> ${escapeHtml(project.hero.eyebrow)}</span><h2>${project.hero.title.map(escapeHtml).join("<br>")}</h2><p>${project.hero.description.map(escapeHtml).join("<br>")}</p><a class="button button-light" href="#network">${escapeHtml(project.hero.linkLabel)} ${icon("arrow")}</a></div><div class="orbit-art" aria-hidden="true"><div class="orbit-ring ring-one"></div><div class="orbit-ring ring-two"></div><div class="orbit-ring ring-three"></div><div class="planet-core"></div><span class="orbital-point point-one"></span><span class="orbital-point point-two"></span><span class="orbital-point point-three"></span><span class="orbit-caption">${escapeHtml(project.hero.caption)}</span></div><span class="hero-index">${escapeHtml(project.hero.index)}</span></section>${renderCatalogSnapshot(companyDataset, catalogHelpers)}<section class="project-numbers" aria-label="Informações do projeto"><div class="section-caption"><span class="eyebrow">O PROJETO OESC</span><span>Equipe e planejamento · fonte institucional</span></div>${stats()}</section><div class="overview-grid">${mapPanel()}${opportunities(true)}</div><section class="areas-section">${panelHeading(copy.areasEyebrow, copy.areasTitle, sectionLink("areas", copy.areasLink))}${areaCards(true)}</section>${roadmap(true)}<div class="source-note">${icon("info")} ${escapeHtml(copy.sourceNote)}</div>`;
}
function network() {
  return `<div class="filterbar network-tabs"><div class="tabs" role="group" aria-label="Conteúdo da rede"><button data-network-view="companies" class="${networkView === "companies" ? "selected" : ""}" aria-pressed="${networkView === "companies"}">Organizações e aplicações</button><button data-network-view="institutions" class="${networkView === "institutions" ? "selected" : ""}" aria-pressed="${networkView === "institutions"}">Instituições do projeto</button></div></div>${networkView === "companies" ? renderCatalog(companyDataset, companyFilters, catalogHelpers) : institutionsPage()}`;
}
function showCompany(id) {
  const company = companyDataset.companies.find((c) => c.id === id);
  if (!company) return;
  const dialog = document.createElement("dialog");
  dialog.className = "area-dialog company-dialog";
  dialog.innerHTML = renderCompanyDetails(
    company,
    companyDataset,
    catalogHelpers,
  );
  document.body.append(dialog);
  dialog
    .querySelector("button")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
}
function updateCompanyResults() {
  document.querySelector("#company-results").innerHTML = renderCompanyResults(
    companyDataset,
    companyFilters,
    catalogHelpers,
  );
}
function downloadCompanyDataset() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(companyDataset, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "oesc-levantamento-downstream.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function institutionsPage() {
  return `<div class="intro-card"><span class="icon-tile blue">${icon("network")}</span><div><h2>${escapeHtml(copy.networkTitle)}</h2><p>${escapeHtml(copy.networkDescription)}</p></div>${link(project.participationUrl, copy.networkLink, "button button-primary")}</div>${stats()}<section class="panel">${panelHeading(copy.institutionsEyebrow, copy.institutionsTitle)}<p class="panel-description">${escapeHtml(copy.institutionsDescription)}</p><div class="institution-grid">${institutions.map((institution) => `<article class="institution-card"><span class="institution-initial ${institution.lead ? "lead" : ""}">${escapeHtml(institution.initials)}</span><div><h3>${escapeHtml(institution.name)}</h3><p>${escapeHtml(institution.description)}</p></div></article>`).join("") || emptyState()}</div></section><div class="notice">${escapeHtml(copy.institutionsNotice)}</div>`;
}
function areaPage() {
  return `<div class="filterbar"><div class="tabs" role="group" aria-label="Filtrar áreas por aplicação">${project.filters.map((f) => `<button data-area-filter="${f.id}" class="${state.area === f.id ? "selected" : ""}" aria-pressed="${state.area === f.id}">${escapeHtml(f.name)}</button>`).join("")}</div><span class="result-count">${areas.filter((a) => state.area === "all" || a.category === state.area).length} áreas</span></div><p class="panel-description">${escapeHtml(copy.areasDescription)}</p>${areaCards()}<section class="open-areas"><span class="icon-tile green">${icon("spark")}</span><div><h2>${escapeHtml(copy.areasOpenTitle)}</h2><p>${escapeHtml(copy.areasOpenDescription)}</p></div>${link(project.participationUrl, copy.areasOpenLink)}</section>`;
}
function deliveryPage() {
  return `<div class="delivery-grid">${deliverables.map((d, i) => `<article class="panel delivery-card"><div class="delivery-top"><span class="icon-tile ${d.color}">${icon(d.icon)}</span><span class="badge neutral">${escapeHtml(d.status)}</span></div><span class="eyebrow">${String(i + 1).padStart(2, "0")} / ENTREGAS DO PROJETO</span><h2>${escapeHtml(d.name)}</h2><p>${escapeHtml(d.description)}</p></article>`).join("") || emptyState()}</div><div class="notice">${escapeHtml(copy.deliverablesNotice)}</div>`;
}
function render() {
  const current = sections.find((s) => s.id === state.section) || sections[0];
  document.title = `${current.name} · OESC`;
  document.querySelector("#breadcrumb-title").textContent = current.name;
  const atlasLink = `<a href="./atlas.html" class="nav-item">${icon("cap")}<span>Atlas de Formação</span></a>`;
  document.querySelector("#navigation").innerHTML = sections
    .map(
      (s) =>
        `${s.id === "opportunities" ? '<p class="nav-label secondary-label">PARTICIPAR</p>' : ""}<a href="#${s.id}" class="nav-item ${s.id === current.id ? "active" : ""}" ${s.id === current.id ? 'aria-current="page"' : ""}>${icon(s.icon)}<span>${escapeHtml(s.name)}</span>${s.id === "opportunities" ? '<span class="nav-new"></span>' : ""}</a>${s.id === "regions" ? atlasLink : ""}`,
    )
    .join("");
  main.innerHTML = `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(current.eyebrow)}</span><h1>${escapeHtml(current.name)}<span class="heading-dot">.</span></h1><p>${escapeHtml(current.description)}</p></div><div class="page-actions"><span class="public-badge">${icon("globe")} Painel público</span><button class="button button-outline" id="export-button">${icon("download")} Exportar resumo</button></div></div>${{ overview, network, areas: areaPage, regions: () => `${mapPanel(true)}<div class="notice">${escapeHtml(copy.regionNotice)}</div>`, deliverables: deliveryPage, roadmap: () => roadmap(false), opportunities: () => opportunities(false) }[current.id]()}`;
  hydrateIcons();
}
function navigate() {
  if (!ready) return;
  state.section = sections.some((s) => s.id === location.hash.slice(1))
    ? location.hash.slice(1)
    : "overview";
  render();
  closeMenu();
}
function closeMenu() {
  document.body.classList.remove("menu-open");
  updateMenuAria();
}
function updateMenuAria() {
  document
    .querySelector("#menu-toggle")
    .setAttribute(
      "aria-expanded",
      String(
        innerWidth <= 900
          ? document.body.classList.contains("menu-open")
          : !document.body.classList.contains("sidebar-collapsed"),
      ),
    );
}
window.addEventListener("hashchange", () => {
  navigate();
  window.scrollTo({ top: 0 });
  main.focus({ preventScroll: true });
});
window.addEventListener("resize", updateMenuAria);
document.querySelector("#menu-toggle").addEventListener("click", () => {
  document.body.classList.toggle(
    innerWidth <= 900 ? "menu-open" : "sidebar-collapsed",
  );
  updateMenuAria();
});
document.querySelector("#backdrop").addEventListener("click", closeMenu);
document.querySelector("#navigation").addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = String(value);
  // Text escaping alone does not escape quotes used inside HTML attributes.
  return span.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function showArea(index) {
  const a = areas[index];
  if (!a) return;
  const dialog = document.createElement("dialog");
  dialog.className = "area-dialog";
  dialog.innerHTML = `<div class="dialog-heading"><span class="icon-tile ${a.color}">${icon(a.icon)}</span><button class="icon-button" aria-label="Fechar detalhes">${icon("close")}</button></div><span class="eyebrow">ÁREA DE INTERESSE</span><h2>${escapeHtml(a.full)}</h2><p>${escapeHtml(a.description)}</p><div class="tags">${a.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div><div class="notice">${escapeHtml(copy.areaNotice)}</div>${link(project.participationUrl, copy.areaLink, "button button-primary")}`;
  document.body.append(dialog);
  dialog
    .querySelector("button")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
}
function exportSummary() {
  const data = {
    fonte: project.source.url,
    natureza: project.summaryNote,
    equipe: metric("team"),
    areas: areas.map((a) => a.full),
    eixos: metric("axes"),
    horizonte_meses: metric("duration"),
    instituicoes_mencionadas: institutions.map((i) => i.name),
    mesorregioes: regions,
    entregas_previstas: deliverables.map((d) => d.name),
    fases_planejadas: phases.map((p) => ({
      nome: p.name,
      janela: p.months,
      descricao: p.description,
    })),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "oesc-resumo-projeto.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const toast = document.querySelector("#toast");
  toast.textContent = "Resumo do projeto exportado em JSON.";
  toast.classList.add("visible");
  clearTimeout(exportSummary.timer);
  exportSummary.timer = setTimeout(
    () => toast.classList.remove("visible"),
    3500,
  );
}
main.addEventListener("click", (event) => {
  if (event.target.closest("#retry-content")) {
    initialize();
    return;
  }
  if (!ready) return;
  const catalogRole = event.target.closest("[data-catalog-role]");
  if (catalogRole) {
    Object.assign(companyFilters, {
      query: "",
      role: catalogRole.dataset.catalogRole,
      segment: "all",
      status: "all",
    });
    networkView = "companies";
    location.hash = "network";
    return;
  }
  const networkTab = event.target.closest("[data-network-view]");
  if (networkTab) {
    networkView = networkTab.dataset.networkView;
    render();
    main.querySelector(`[data-network-view="${networkView}"]`).focus();
  }
  const companyDetail = event.target.closest("[data-company-detail]");
  if (companyDetail) showCompany(companyDetail.dataset.companyDetail);
  if (event.target.closest("#export-companies")) downloadCompanyDataset();
  if (event.target.closest("#clear-company-filters")) {
    Object.assign(companyFilters, {
      query: "",
      role: "all",
      segment: "all",
      status: "all",
    });
    render();
    main.querySelector("#company-query").focus();
  }
  const filter = event.target.closest("[data-area-filter]");
  if (filter) {
    state.area = filter.dataset.areaFilter;
    render();
    main.querySelector(`[data-area-filter="${state.area}"]`).focus();
  }
  const detail = event.target.closest("[data-area-detail]");
  if (detail) showArea(Number(detail.dataset.areaDetail));
  const mapView = event.target.closest("[data-map-view]");
  if (mapView) {
    state.view = mapView.dataset.mapView;
    render();
    main.querySelector(`[data-map-view="${state.view}"]`).focus();
  }
  const region = event.target.closest("[data-region]");
  if (region) {
    state.region = regions[Number(region.dataset.region)];
    if (state.section !== "regions") location.hash = "regions";
    else {
      render();
      main
        .querySelector(`[data-region="${regions.indexOf(state.region)}"]`)
        .focus();
    }
  }
  if (event.target.closest("#export-button")) exportSummary();
});
main.addEventListener("submit", (event) => {
  if (event.target.matches(".catalog-filters")) event.preventDefault();
});
main.addEventListener("input", (event) => {
  if (event.target.id === "company-query") {
    companyFilters.query = event.target.value;
    updateCompanyResults();
  }
});
main.addEventListener("change", (event) => {
  for (const field of ["role", "segment", "status"]) {
    if (event.target.id === `company-${field}`) {
      companyFilters[field] = event.target.value;
      updateCompanyResults();
    }
  }
  if (event.target.id === "region-select") {
    state.region = event.target.value;
    document.querySelector("#region-detail").innerHTML = regionDetail();
  }
});
const searchDialog = document.querySelector("#search-dialog");
const searchInput = document.querySelector("#global-search");
function searchEntries() {
  return [
    ...companyDataset.companies.map((c) => ({
      title: c.name,
      description: [c.city || "", ...c.technologies].join(" · "),
      section: "network",
      companyId: c.id,
    })),
    ...opportunityItems.map((o) => ({
      title: o.title,
      description: o.description,
      section: "opportunities",
    })),
    ...institutions.map((i) => ({
      title: i.name,
      description: i.description,
      section: "network",
    })),
    ...regions.map((name) => ({
      title: name,
      description: copy.mapCoverage,
      section: "regions",
    })),
    ...phases.map((p) => ({
      title: p.name,
      description: p.description,
      section: "roadmap",
    })),
    ...sections.map((s) => ({
      title: s.name,
      description: s.description,
      section: s.id,
    })),
    ...areas.map((a) => ({
      title: a.full,
      description: a.tags.join(" · "),
      section: "areas",
    })),
    ...deliverables.map((d) => ({
      title: d.name,
      description: d.description,
      section: "deliverables",
    })),
  ];
}

function search() {
  const normalize = (text) =>
    text
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const query = normalize(searchInput.value.trim());
  const results = searchEntries().filter((e) =>
    normalize(`${e.title} ${e.description}`).includes(query),
  );
  document.querySelector("#search-results").innerHTML = results.length
    ? results
        .map(
          (e) =>
            `<a class="search-result" href="#${e.section}" ${e.companyId ? `data-company-result="${e.companyId}"` : ""}><span><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.description)}</small></span>${icon("arrow")}</a>`,
        )
        .join("")
    : '<p class="empty-state">Nenhum resultado. Tente “dados”, “rede” ou “roadmap”.</p>';
}
function openSearch() {
  if (!ready) return;
  searchInput.value = "";
  search();
  searchDialog.showModal();
  searchInput.focus();
}
document.querySelector("#open-search").addEventListener("click", openSearch);
document
  .querySelector("#close-search")
  .addEventListener("click", () => searchDialog.close());
searchInput.addEventListener("input", search);
document.querySelector("#search-results").addEventListener("click", (event) => {
  if (event.target.closest("a")) searchDialog.close();
  const companyResult = event.target.closest("[data-company-result]");
  if (companyResult) {
    networkView = "companies";
    if (state.section === "network") render();
    showCompany(companyResult.dataset.companyResult);
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!document.querySelector("dialog[open]")) openSearch();
  }
  if (event.key === "Escape") closeMenu();
});
function renderShell() {
  document.querySelector(".workspace div").innerHTML =
    `${escapeHtml(copy.workspaceTitle)}<span>${escapeHtml(copy.workspaceLocation)}</span>`;
  document.querySelector(".network-prompt strong").textContent =
    copy.sidebarTitle;
  document.querySelector(".network-prompt p").textContent =
    copy.sidebarDescription;
  const participation = document.querySelector(".network-prompt a");
  participation.href = project.participationUrl;
  participation.innerHTML = `${escapeHtml(copy.networkLink)} ${icon("arrowUpRight")}`;
  const institution = document.querySelector(".institution");
  institution.href = project.source.url;
  institution.innerHTML = `<span class="institution-mark">${escapeHtml(copy.institutionMark)}</span><span>${escapeHtml(copy.institutionCredit)}<small>${escapeHtml(copy.institutionSupport)}</small></span>${icon("arrowUpRight")}`;
  document.querySelector(".official-link").href = project.source.url;
  document.querySelector("footer > span").innerHTML =
    `OESC <span class="footer-dot">·</span> ${escapeHtml(copy.footer)}`;
  const sourceLink = document.querySelector("footer a");
  sourceLink.href = project.source.url;
  sourceLink.innerHTML = `${escapeHtml(project.source.label)} ${icon("arrowUpRight")}`;
}
async function initialize() {
  ready = false;
  const searchButton = document.querySelector("#open-search");
  searchButton.disabled = true;
  main.setAttribute("aria-busy", "true");
  main.innerHTML =
    '<section class="panel content-state" role="status"><h1>Carregando o observatório…</h1><p>Buscando os conteúdos do projeto.</p></section>';
  try {
    const data = await loadContent();
    ({ project, sections, areas, regions, deliverables, institutions } = data);
    companyDataset = data.companies;
    copy = project.copy;
    phases = data.roadmap;
    opportunityItems = data.opportunities;
    renderShell();
    ready = true;
    searchButton.disabled = false;
    navigate();
  } catch (error) {
    console.error(error);
    main.innerHTML =
      '<section class="panel content-state" role="alert"><h1>Não foi possível carregar o conteúdo.</h1><p>Verifique sua conexão e tente novamente. Se o problema persistir, os arquivos de conteúdo podem estar indisponíveis.</p><button class="button button-primary" id="retry-content">Tentar novamente</button></section>';
  } finally {
    main.removeAttribute("aria-busy");
  }
}
hydrateIcons();
initialize();
