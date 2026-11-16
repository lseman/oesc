import { buildRecorte, findMunicipalities, groupBy, legendBins, metrics, prepareAtlas, readMetric, summarize } from "./model.js";

const select = (selector) => document.querySelector(selector);
const searchForm = select("#filters");
const state = { view: "cursos", rank: "municipios", page: 0, municipality: "", institution: null };
const PAGE_SIZE = 10;
const integer = new Intl.NumberFormat("pt-BR");
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const collator = new Intl.Collator("pt-BR");
const palette = ["#dbeafe", "#a9cdf6", "#6ca7e9", "#3577c4", "#123d80"];
const statuses = {
  "sem-dados": { text: "Sem dados presenciais", fill: "#d6dbe4" },
  "sem-recorte": { text: "Sem observações no recorte", fill: "#f7f9fc" },
  indeterminado: { text: "Indeterminado", fill: "url(#unknown-pattern)" },
  zero: { text: "0 comprovado", fill: "#e8f5fe" },
};
const classes = {
  0: "Relação não identificada", 0.5: "Habilitadora potencial",
  1: "Direta", null: "Classificação indeterminada",
};
const filterNames = {
  area: "Área CINE", pertinencia: "Pertinência", ies: "IES",
  categoria: "Categoria", organizacao: "Organização",
};
const stateLabels = {
  ofertas: "Ofertas pertinentes", proporcao: "Proporção pertinente",
  matriculas: "Matrículas pertinentes", ies: "IES distintas",
};
const number = (value) => value === null ? "Indisponível" : integer.format(value);
const fmt = (value, metric) => metric === "proporcao" ? `${decimal.format(value)}%` : number(value);
const escape = (value) => String(value).replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

let atlas, result;
const paths = new Map();
const metric = () => state.view === "instituicoes" ? "ies" : select("#metric").value;
const municipalityName = (id) => atlas.municipalities.get(id).municipio;
const institutionName = (id) => {
  const institution = atlas.institutions.get(id);
  return institution.sigla || institution.nome;
};

function formatReading(reading, key) {
  if (reading.status === "zero") return fmt(0, key);
  if (reading.value === null) return statuses[reading.status].text;
  return `${fmt(reading.value, key)}${reading.status === "parcial" ? " (parcial)" : ""}`;
}

function coverageText(coverage) {
  return `${number(coverage.known)}/${number(coverage.expected)} observações pertinentes com valor`;
}

function ratioText(summary) {
  return `${number(summary.included.length)}/${number(summary.base)} observações · ${number(summary.unknown.length)} com classificação indeterminada`;
}

function metricNote(summary, key) {
  if (key === "matriculas") return coverageText(summary.enrollments);
  if (key === "proporcao") return ratioText(summary);
  if (key === "ies") {
    const count = summary.newPossibleInstitutions;
    return count ? `${number(count)} IES adicionais possíveis` : "Uma vez por IES no recorte";
  }
  return `${number(summary.base)} no denominador · ${number(summary.unknown.length)} com classificação indeterminada`;
}

function populate(selectElement, options) {
  for (const [value, label] of options) selectElement.add(new Option(label, value));
}

function populateFilters() {
  const byName = ([, a], [, b]) => collator.compare(a, b);
  const { data, institutions, municipalities } = atlas;
  populate(searchForm.elements.area, Object.entries(data.areas).sort(byName)
    .map(([code, name]) => [code, `${name} (${code})`]));
  populate(searchForm.elements.ies, [...institutions.values()].map((item) =>
    [item.id, item.sigla ? `${item.sigla} · ${item.nome}` : item.nome]).sort(byName));
  for (const [field, labels] of [["categoria", data.categorias], ["organizacao", data.organizacoes]]) {
    const used = new Set([...institutions.values()].map((item) => item[field]));
    populate(searchForm.elements[field], Object.entries(labels).filter(([code]) => used.has(code)));
  }
  const places = [...municipalities].map(([id, place]) => [id, place.municipio]).sort(byName);
  for (const id of ["#municipality", "#compare-first", "#compare-second"]) populate(select(id), places);
  return places.map(([id]) => id);
}

function drawMap(orderedIds) {
  const { bbox, features } = atlas.geography;
  const [west, south, east, north] = bbox;
  const midLatitude = ((south + north) / 2) * Math.PI / 180;
  const longitudeFactor = Math.cos(midLatitude);
  const scale = Math.min(840 / ((east - west) * longitudeFactor), 580 / (north - south));
  const offsetX = (900 - (east - west) * longitudeFactor * scale) / 2;
  const offsetY = (640 - (north - south) * scale) / 2;
  const project = ([lon, lat]) =>
    `${((lon - west) * longitudeFactor * scale + offsetX).toFixed(2)},${((north - lat) * scale + offsetY).toFixed(2)}`;
  const geometry = new Map(features.map((feature) => [feature.properties.municipio_codigo, feature.geometry]));
  const group = select("#map-paths");
  for (const [index, id] of orderedIds.entries()) {
    const item = geometry.get(id);
    const polygons = item.type === "Polygon" ? [item.coordinates] : item.coordinates;
    const path = document.createElementNS(group.namespaceURI, "path");
    path.setAttribute("d", polygons.flatMap((polygon) =>
      polygon.map((ring) => `M${ring.map(project).join("L")}Z`)).join(""));
    path.dataset.municipality = id;
    path.setAttribute("role", "button");
    path.setAttribute("tabindex", index === 0 ? "0" : "-1");
    path.append(document.createElementNS(group.namespaceURI, "title"));
    paths.set(id, path);
    group.append(path);
  }
  group.addEventListener("keydown", (event) => {
    const id = event.target.dataset.municipality;
    if (!id) return;
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      chooseMunicipality(id, true);
    }
    const direction = { ArrowRight: 1, ArrowDown: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    const index = orderedIds.indexOf(id);
    const next = orderedIds[(index + direction + orderedIds.length) % orderedIds.length];
    paths.get(id).setAttribute("tabindex", "-1");
    paths.get(next).setAttribute("tabindex", "0");
    paths.get(next).focus();
  });
}

function municipalReading(id, key = metric()) {
  return readMetric(result.municipalities.get(id), key, atlas.municipalBase.has(id));
}

function drawMapValues() {
  const key = metric();
  const readings = [...paths.keys()].map((id) => [id, municipalReading(id, key)]);
  const max = Math.max(0, ...readings.map(([, reading]) => reading.value ?? 0));
  const bins = legendBins(max, key);
  const color = (index) => palette[Math.round(index * (palette.length - 1) / Math.max(1, bins.length - 1))];
  for (const [id, reading] of readings) {
    const path = paths.get(id);
    const title = `${municipalityName(id)} · ${formatReading(reading, key)}`;
    const fill = statuses[reading.status]?.fill ?? color(bins.findIndex((bin) => reading.value <= bin.max + 1e-10));
    path.style.setProperty("--map-color", fill);
    path.dataset.status = reading.status;
    path.dataset.value = reading.value ?? "";
    path.setAttribute("aria-label", title);
    path.firstElementChild.textContent = title;
  }
  const legendItem = (label, fill, cls = "") =>
    `<li><span class="swatch ${cls}" style="--swatch:${fill}"></span>${label}</li>`;
  const quantities = bins.map(({ min, max: upper }, index) => {
    const range = key === "proporcao" ? `&gt;${decimal.format(min)} a ${fmt(upper, key)}` :
      min + 1 === upper ? number(upper) : `${number(min + 1)} a ${number(upper)}`;
    return legendItem(range, color(index));
  });
  select("#map-legend").innerHTML = `<p class="legend-title">${metrics[key].name} · ${metrics[key].unit}</p>
    ${quantities.length ? `<ul class="legend-list">${quantities.join("")}</ul>` : ""}
    <ul class="legend-list">${Object.entries(statuses).map(([status, item]) =>
      legendItem(item.text, status === "indeterminado" ? "#e6edf5" : item.fill,
        status === "indeterminado" ? "unknown" : "")).join("")}</ul>`;
  const present = [...result.municipalities.values()].filter((item) => item.base).length;
  select("#map-context").textContent =
    `${number(present)} de ${number(atlas.municipalities.size)} municípios com observações`;
}

function updateOutline() {
  for (const [id, path] of paths) path.setAttribute("aria-pressed", String(id === state.municipality));
  select("#map-selection").setAttribute("d", paths.get(state.municipality)?.getAttribute("d") ?? "");
}

function drawPlaceMatches(query) {
  const container = select("#place-matches");
  const places = findMunicipalities(atlas, query).sort((a, b) => collator.compare(a.municipio, b.municipio));
  container.hidden = !places.length;
  container.innerHTML = places.length ?
    `<strong>Municípios encontrados</strong>${places.slice(0, 6).map(({ municipio_codigo: id, municipio: name }) =>
      `<button type="button" class="text-button" data-municipality="${escape(id)}">${escape(name)}</button>`).join("")}` : "";
}

function setFilterPanel(open) {
  select("#filter-toggle").setAttribute("aria-expanded", String(open));
  select("#advanced-filters").hidden = !open;
}

function drawFilterSummary(active) {
  const fields = Object.entries(filterNames).filter(([field]) => active[field]);
  const count = select("#filter-count");
  count.hidden = !fields.length;
  count.textContent = number(fields.length);
  select("#filter-toggle").setAttribute("aria-label",
    fields.length ? `Filtros, ${number(fields.length)} ${fields.length === 1 ? "ativo" : "ativos"}` : "Filtros");
  select("#active-filters").hidden = !fields.length && !active.busca.trim();
  select("#filter-chips").innerHTML = fields.map(([field, label]) => {
    const value = searchForm.elements[field].selectedOptions[0].textContent;
    return `<li title="${escape(value)}"><span>${label}</span> ${escape(value)}</li>`;
  }).join("");
}

function drawState() {
  select("#state-metrics").innerHTML = Object.entries(stateLabels).map(([key, label]) => {
    const reading = readMetric(result.state, key);
    const value = reading.value === null ? (reading.status === "sem-recorte" ? "Sem observações" : formatReading(reading, key)) :
      fmt(reading.value, key);
    return `<dl class="metric-card${key === metric() ? " is-current" : ""}" data-metric="${key}" data-value="${reading.value ?? ""}">
      <dt>${label}</dt><dd class="metric-value${reading.value === null ? " unavailable" : ""}">
        <span>${value}</span>${reading.status === "parcial" ? '<small class="partial-tag">Parcial</small>' : ""}
      </dd><dd class="metric-note">${metricNote(result.state, key)}</dd></dl>`;
  }).join("");
}

function factList(items) {
  return `<dl class="detail-facts">${items.map(([label, value]) =>
    `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
}

function offers(rows) {
  const { data } = atlas;
  return `<ul class="detail-list offer-list">${[...rows].sort((a, b) => collator.compare(a.curso, b.curso)).map((row) =>
    `<li><details><summary>${escape(row.curso)}${row.abi ? " · ABI" : ""}</summary>
    <p>${escape(institutionName(row.ies))} · ${escape(municipalityName(row.municipio))}</p>
    <p>Área CINE ${escape(row.area)} · ${escape(data.areas[row.area])}<br>Rótulo ${escape(row.rotulo)} · ${escape(data.rotulos[row.rotulo])}</p>
    <p>${classes[row.pertinencia]} · Regra ${escape(row.regra)}<br>Matrículas: ${number(row.matriculas)} · Concluintes: ${number(row.concluintes)}</p>
    <p>Código do curso ${escape(row.cursoCodigo)} · Inep, cadastro de cursos 2024, linha ${number(row.linha)}</p>
    </details></li>`).join("")}</ul>`;
}

function institutionButton(id, local) {
  const institution = atlas.institutions.get(id);
  return `<button type="button" class="text-button" data-institution="${escape(id)}" data-scope="${local ? "municipal" : "estadual"}"
      aria-label="Perfil da instituição ${escape(institution.nome)}">${escape(institutionName(id))}</button>`;
}

function drawMunicipality() {
  const id = state.municipality;
  const container = select("#municipality-detail");
  const title = select("#detail-title");
  title.textContent = id ? municipalityName(id) : "Município";
  if (!id) {
    container.innerHTML = '<p class="empty">Selecione um município para explorar as ofertas e instituições do recorte.</p>';
    return;
  }
  const summary = result.municipalities.get(id);
  const coverage = municipalReading(id);
  if (!summary.base) {
    container.innerHTML = `<p class="empty">${coverage.status === "sem-dados" ?
      "Sem observações presenciais identificadas na base. O valor do indicador é indisponível." :
      "Há dados presenciais neste município. Nenhuma observação corresponde aos filtros ativos."}</p>
      <div class="detail-actions"><button type="button" class="quiet-button" id="pin">Adicionar à comparação</button></div>`;
    return;
  }
  const relevant = summary.included.length;
  container.innerHTML = `<p class="detail-meta">IBGE ${escape(id)} · ${ratioText(summary)}</p>
    ${coverage.status === "zero" ? '<p class="detail-meta">Zero comprovado para o indicador selecionado.</p>' : ""}
    ${factList([
      ["Observações pertinentes", formatReading(municipalReading(id, "ofertas"), "ofertas")],
      ["Proporção pertinente", formatReading(municipalReading(id, "proporcao"), "proporcao")],
      ["IES distintas", formatReading(municipalReading(id, "ies"), "ies")],
      ["Matrículas pertinentes", formatReading(municipalReading(id, "matriculas"), "matriculas")],
      ["Concluintes pertinentes", formatReading(municipalReading(id, "concluintes"), "concluintes")],
    ])}
    <p class="detail-meta">Matrículas ${coverageText(summary.enrollments)}. Concluintes ${coverageText(summary.graduates)}.</p>
    <div class="detail-actions"><button type="button" class="quiet-button" id="pin">Adicionar à comparação</button></div>
    ${summary.institutions.size ? `<h4>Instituições com oferta pertinente</h4><ul class="detail-list">
      ${[...summary.institutions].sort(([a], [b]) => collator.compare(institutionName(a), institutionName(b)))
        .map(([ies, rows]) => `<li>${institutionButton(ies, true)}<p>Observações pertinentes · ${number(rows.length)}</p></li>`).join("")}</ul>` : ""}
    ${relevant ? `<h4>Ofertas pertinentes</h4>${offers(summary.included)}` : ""}
    ${summary.unknown.length ? `<h4>Ofertas com pertinência indeterminada</h4>${offers(summary.unknown)}` : ""}
    ${summary.base > relevant + summary.unknown.length ? `<details class="detail-meta">
      <summary>Outras ofertas do denominador</summary>${offers(summary.rows.filter((row) =>
        row.pertinencia !== null && !summary.included.includes(row)))}</details>` : ""}`;
}

function drawInstitution() {
  const container = select("#institution-detail");
  container.hidden = !state.institution;
  if (!state.institution) return;
  const { id, local } = state.institution;
  const institution = atlas.institutions.get(id);
  const rows = result.rows.filter((row) => row.ies === id && (!local || row.municipio === state.municipality));
  const summary = summarize(rows, filters().pertinencia);
  const { data } = atlas;
  container.innerHTML = `<p class="eyebrow">Perfil institucional</p>
    <h3 tabindex="-1">${escape(institution.nome)}</h3>
    <p class="detail-meta">Código Inep ${escape(id.slice(4))} · ${escape(data.categorias[institution.categoria])} · ${escape(data.organizacoes[institution.organizacao])}</p>
    <h4>Ofertas · ${local ? escape(municipalityName(state.municipality)) : "Santa Catarina"}</h4>
    <p class="detail-meta">${ratioText(summary)}</p>
    ${summary.base ? `${factList([
      ["Matrículas pertinentes", formatReading(readMetric(summary, "matriculas"), "matriculas")],
      ["Concluintes pertinentes", formatReading(readMetric(summary, "concluintes"), "concluintes")],
    ])}<p class="detail-meta">Matrículas ${coverageText(summary.enrollments)}. Concluintes ${coverageText(summary.graduates)}.</p>` :
      '<p class="empty">Nenhuma observação desta IES corresponde aos filtros ativos.</p>'}
    <h4>Docentes · agregado cadastral da IES</h4>
    ${factList([["Em exercício", number(institution.docentes)], ["Doutores em exercício", number(institution.doutores)]])}
    <p class="detail-meta">Âmbito integral da IES em 2024. Os dados disponíveis não distribuem docentes por área, curso, campus ou município. Cobertura cadastral: ${[institution.docentes, institution.doutores].filter((value) => value !== null).length}/2 indicadores.</p>
    <p class="detail-meta">Fonte: Inep, Censo da Educação Superior 2024, cadastro de IES, linha ${number(institution.linha)}.</p>
    ${summary.included.length ? `<h4>Ofertas pertinentes e CINE</h4>${offers(summary.included)}` : ""}
    ${summary.unknown.length ? `<h4>Ofertas com pertinência indeterminada</h4>${offers(summary.unknown)}` : ""}
    <div class="detail-actions"><button type="button" id="close-institution" class="quiet-button">Fechar perfil</button></div>`;
}

function compare() {
  const places = [select("#compare-first").value, select("#compare-second").value];
  const pinned = new Set(places.filter(Boolean));
  const linkCount = select("#map-compare-count");
  linkCount.hidden = !pinned.size;
  linkCount.textContent = `${pinned.size}/2`;
  select("#compare-progress").textContent = [
    "Nenhum município selecionado", "1 de 2 municípios selecionados", "2 municípios selecionados",
  ][pinned.size];
  const pin = select("#pin");
  if (pin) {
    pin.textContent = pinned.has(state.municipality) ? "Ver comparação" :
      pinned.size === 2 ? "Trocar segundo município" : "Adicionar à comparação";
  }
  const container = select("#comparison");
  if (places.some((value) => !value) || places[0] === places[1]) {
    container.innerHTML = `<p class="empty">${places[0] && places[0] === places[1] ?
      "Escolha um município diferente para a segunda coluna." :
      "Escolha dois municípios para comparar os resultados com os mesmos filtros."}</p>`;
    return;
  }
  const keys = ["ofertas", "proporcao", "matriculas", "ies"];
  container.innerHTML = `<div class="scroll-table" role="region" aria-label="Tabela de comparação de municípios" tabindex="0">
    <table><thead><tr><th scope="col">Indicador</th>${places.map((id) => `<th scope="col">${escape(municipalityName(id))}</th>`).join("")}</tr></thead>
    <tbody>${keys.map((key) => `<tr><th scope="row">${metrics[key].name}</th>${places.map((id) =>
      `<td>${formatReading(municipalReading(id, key), key)}<small>${metricNote(result.municipalities.get(id), key)}</small></td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
}

function rankRecords(institutional, key) {
  if (!institutional) return [...result.municipalities].filter(([, summary]) => summary.base).map(([id, summary]) =>
    ({ id, name: municipalityName(id), summary, reading: municipalReading(id, key) }));
  const groups = groupBy(result.rows, (row) => row.ies);
  return [...groups].map(([id, rows]) => {
    const summary = summarize(rows, filters().pertinencia);
    return { id, name: institutionName(id), summary, reading: readMetric(summary, key) };
  }).filter(({ summary }) => summary.included.length || summary.unknown.length);
}

function ranking() {
  const institutional = state.rank === "instituicoes";
  const key = institutional && metric() === "ies" ? "ofertas" : metric();
  const records = rankRecords(institutional, key).sort((a, b) =>
    (b.reading.value ?? -1) - (a.reading.value ?? -1) || collator.compare(a.name, b.name));
  const pages = Math.ceil(records.length / PAGE_SIZE);
  const first = state.page * PAGE_SIZE;
  const next = first + PAGE_SIZE;
  select("#ranking-description").textContent = institutional ?
    "IES com oferta pertinente ou com classificação indeterminada no recorte estadual." :
    "Municípios com observações no recorte. A ordenação usa o indicador do mapa.";
  select("#ranking").innerHTML = records.length ? `<div class="scroll-table" role="region" aria-label="Tabela do ranking" tabindex="0">
    <table><thead><tr><th scope="col">${institutional ? "Instituição" : "Município"}</th><th scope="col" class="numeric">${metrics[key].name}</th>
    <th scope="col" class="numeric">Ofertas no recorte</th><th scope="col" class="numeric">Indeterminadas</th></tr></thead>
    <tbody>${records.slice(first, next).map(({ id, name, reading, summary }) =>
      `<tr><th scope="row">${institutional ? institutionButton(id, false) :
        `<button type="button" class="text-button" data-municipality="${escape(id)}">${escape(name)}</button>`}</th>
      <td class="numeric" data-value="${reading.value ?? ""}">${formatReading(reading, key)}</td>
      <td class="numeric">${number(summary.base)}</td><td class="numeric">${number(summary.unknown.length)}</td></tr>`).join("")}</tbody></table></div>` :
    '<p class="empty">Nenhum resultado no ranking com os filtros ativos.</p>';
  select("#ranking-pages").hidden = pages < 2;
  select("#previous").disabled = state.page === 0;
  select("#next").disabled = state.page >= pages - 1;
  select("#page-count").textContent = `Página ${state.page + 1} de ${pages} · ${number(records.length)} resultados`;
}

function drawSources(geoSources) {
  const { data } = atlas;
  select("#source-body").innerHTML = `
    <p><strong>Inep, Censo da Educação Superior ${data.ano}.</strong> ${number(atlas.rows.length)} observações da dimensão presencial em ${number(atlas.municipalBase.size)} municípios de SC e ${number(atlas.institutions.size)} IES. A unidade é a observação curso–dimensão–município e inclui áreas básicas de ingresso (ABI). Matrículas e concluintes contam vínculos por observação. As referências de EaD estão excluídas.</p>
    <p><strong>CINE · regras ${escape(data.regras)} do WP-007.</strong> A proporção divide as observações com pertinência selecionada por todas as observações presenciais sob os demais filtros, incluindo as indeterminadas. A ficha mostra o numerador, o denominador e as indeterminadas. Valores parciais registram apenas o que foi identificado. O mapa usa zero quando as lacunas não podem alterar o resultado, e marca indeterminação quando o valor conhecido é zero e pode mudar.</p>
    <p><strong>Instituições.</strong> Uma IES pode ofertar em vários municípios e é deduplicada na síntese estadual. Categoria e organização seguem o dicionário cadastral do Inep. Os docentes são agregados cadastrais de toda a IES.</p>
    <p><strong>IBGE.</strong> ${geoSources.fontes.map(({ edicao }) => escape(edicao)).join(" e ")}. A geometria é generalizada para visão estadual. ${escape(geoSources.observacao_licenca)}</p>
    <p>A pertinência é uma leitura exploratória dos nomes e códigos cadastrais. Currículos, pesquisa e capacidades tecnológicas não foram medidos. <a href="atlas/dados.md">Proveniência e condições de uso dos arquivos do Atlas</a></p>`;
}

const filters = () => Object.fromEntries(new FormData(searchForm));
function refresh() {
  state.page = 0;
  const active = filters();
  result = buildRecorte(atlas, active);
  drawFilterSummary(active);
  drawPlaceMatches(active.busca);
  drawState();
  drawMapValues();
  updateOutline();
  drawMunicipality();
  drawInstitution();
  compare();
  ranking();
}

function chooseMunicipality(id, focus = false) {
  state.municipality = id;
  if (state.institution?.local) state.institution = null;
  select("#municipality").value = id;
  updateOutline();
  drawMunicipality();
  drawInstitution();
  compare();
  if (focus) {
    const heading = select("#detail-title");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "nearest" });
  }
}

function bind() {
  select("#source-link").addEventListener("click", () => { select("#fontes").open = true; });
  const filterToggle = select("#filter-toggle");
  filterToggle.addEventListener("click", () => setFilterPanel(select("#advanced-filters").hidden));
  searchForm.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || select("#advanced-filters").hidden || event.target.type === "search") return;
    event.preventDefault();
    setFilterPanel(false);
    filterToggle.focus();
  });
  searchForm.addEventListener("submit", (event) => event.preventDefault());
  searchForm.addEventListener("input", () => refresh());
  searchForm.addEventListener("reset", () => queueMicrotask(() => {
    refresh();
    searchForm.elements.busca.focus({ preventScroll: true });
  }));
  select("#municipality").addEventListener("change", (event) => chooseMunicipality(event.target.value));
  select("#metric").addEventListener("change", () => refresh());
  select("#compare-first").addEventListener("change", compare);
  select("#compare-second").addEventListener("change", compare);
  select("#previous").addEventListener("click", () => { state.page--; ranking(); });
  select("#next").addEventListener("click", () => { state.page++; ranking(); });
  select("#atlas").addEventListener("click", (event) => {
    const place = event.target.closest("[data-municipality]");
    if (place) chooseMunicipality(place.dataset.municipality, true);

    const institution = event.target.closest("[data-institution]");
    if (institution) {
      state.institution = { id: institution.dataset.institution, local: institution.dataset.scope === "municipal" };
      drawInstitution();
      select("#institution-detail h3").focus();
    }

    const view = event.target.closest("[data-view]");
    if (view) {
      state.view = view.dataset.view;
      for (const button of document.querySelectorAll("[data-view]")) button.setAttribute("aria-pressed", String(button === view));
      select("#metric-control").hidden = state.view === "instituicoes";
      refresh();
    }

    const rank = event.target.closest("[data-ranking]");
    if (rank) {
      state.rank = rank.dataset.ranking;
      state.page = 0;
      for (const button of document.querySelectorAll("[data-ranking]")) button.setAttribute("aria-pressed", String(button === rank));
      ranking();
    }

    if (event.target.id === "pin") {
      const first = select("#compare-first");
      const second = select("#compare-second");
      if ([first.value, second.value].includes(state.municipality)) {
        select("#comparar").focus();
      } else {
        (first.value ? second : first).value = state.municipality;
        compare();
      }
    }

    if (event.target.id === "close-institution") {
      const id = state.institution.id;
      state.institution = null;
      drawInstitution();
      const button = [...document.querySelectorAll("[data-institution]")].find((item) => item.dataset.institution === id);
      (button ?? select("#municipality")).focus();
    }
  });
}

async function read(filename) {
  const response = await fetch(new URL(`../data/atlas/${filename}`, import.meta.url));
  if (!response.ok) throw new Error(`Falha ao carregar ${filename} (${response.status}).`);
  return response.json();
}

async function loadAtlas() {
  const status = select("#load-status");
  try {
    const [data, geography, geoSources] = await Promise.all([read("formacao.json"), read("municipios.geojson"), read("fontes-geograficas.json")]);
    atlas = prepareAtlas(data, geography);
    drawMap(populateFilters());
    drawSources(geoSources);
    refresh();
    bind();
    status.hidden = true;
    select("#source-link").hidden = false;
    select("#atlas").hidden = false;
  } catch (error) {
    status.textContent = `O Atlas não pôde carregar os dados. ${error.message} Recarregue a página pelo servidor local.`;
  }
}

loadAtlas();
