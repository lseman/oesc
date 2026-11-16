const normalize = (text) =>
  text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const matchesWords = (words, terms) => terms.every((term) => words.some((word) => word.startsWith(term)));

export function groupBy(rows, keyFor) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

const keyIndex = (rows, key) => {
  const index = new Map(rows.map((row) => [row[key], row]));
  if (index.size !== rows.length) throw new Error(`Chave duplicada: ${key}`);
  return index;
};

const countOrNull = (value) => value === null || (Number.isInteger(value) && value >= 0);
const match = (value, selection) => !selection || value === selection;

export const metrics = {
  ofertas: { name: "Observações pertinentes", unit: "observações de oferta" },
  proporcao: { name: "Proporção de ofertas pertinentes", unit: "% das observações no recorte" },
  matriculas: { name: "Matrículas pertinentes", unit: "vínculos de matrícula" },
  ies: { name: "IES distintas com oferta pertinente", unit: "instituições distintas" },
};

export function prepareAtlas(data, geography) {
  const municipalities = keyIndex(geography.features.map((feature) => feature.properties), "municipio_codigo");
  const institutions = keyIndex(data.ies, "id");
  const observations = keyIndex(data.observacoes, "id");
  if (municipalities.size !== 295 || data.uf !== "SC" || data.versao !== "1.0.0") {
    throw new Error("A cobertura ou a versão dos dados do Atlas é incompatível.");
  }
  for (const institution of institutions.values()) {
    if (!/^ies:\d+$/.test(institution.id) ||
      !Object.hasOwn(data.categorias, institution.categoria) ||
      !Object.hasOwn(data.organizacoes, institution.organizacao) ||
      !countOrNull(institution.docentes) || !countOrNull(institution.doutores) ||
      (institution.docentes !== null && institution.doutores > institution.docentes)) {
      throw new Error(`Perfil institucional incompatível: ${institution.id}`);
    }
  }
  const rows = [...observations.values()].map((row) => {
    const institution = institutions.get(row.ies);
    const municipality = municipalities.get(row.municipio);
    if (!institution || !municipality ||
      row.id !== `oferta:${row.ies.slice(4)}:${row.cursoCodigo}:1:${row.municipio}` ||
      !Object.hasOwn(data.areas, row.area) || !Object.hasOwn(data.rotulos, row.rotulo) ||
      ![0, 0.5, 1, null].includes(row.pertinencia) ||
      !countOrNull(row.matriculas) || !countOrNull(row.concluintes)) {
      throw new Error(`Observação incompatível: ${row.id}`);
    }
    return {
      ...row,
      search: normalize([municipality.municipio, institution.nome, institution.sigla, row.curso].join(" ")),
    };
  });
  const municipalBase = groupBy(rows, (row) => row.municipio);
  return { data, geography, municipalities, institutions, rows, municipalBase };
}

export function sumWithCoverage(rows, field) {
  let total = 0;
  let known = 0;
  for (const row of rows) {
    if (row[field] === null) continue;
    total += row[field];
    known++;
  }
  return { total, known, expected: rows.length };
}

export function summarize(rows, selection) {
  const included = rows.filter((row) =>
    selection === "direta" ? row.pertinencia === 1 :
      selection === "habilitadora" ? row.pertinencia === 0.5 : row.pertinencia > 0);
  const unknown = rows.filter((row) => row.pertinencia === null);
  const institutionalGroups = groupBy(included, (row) => row.ies);
  const newPossibleInstitutions = new Set(unknown.filter((row) => !institutionalGroups.has(row.ies))
    .map((row) => row.ies));
  return {
    rows,
    base: rows.length,
    included,
    unknown,
    institutions: institutionalGroups,
    newPossibleInstitutions: newPossibleInstitutions.size,
    unknownEnrollments: unknown.some((row) => row.matriculas !== 0),
    unknownGraduates: unknown.some((row) => row.concluintes !== 0),
    enrollments: sumWithCoverage(included, "matriculas"),
    graduates: sumWithCoverage(included, "concluintes"),
  };
}

export function buildRecorte(atlas, filters) {
  const query = normalize(filters.busca.trim());
  const rows = atlas.rows.filter((row) => {
    const institution = atlas.institutions.get(row.ies);
    return match(row.area, filters.area) && match(row.ies, filters.ies) &&
      match(institution.categoria, filters.categoria) && match(institution.organizacao, filters.organizacao) &&
      matchesWords(row.search, query);
  });
  const groups = groupBy(rows, (row) => row.municipio);
  const state = summarize(rows, filters.pertinencia);
  const municipalities = new Map([...atlas.municipalities.keys()].map((id) => [
    id, summarize(groups.get(id) ?? [], filters.pertinencia),
  ]));
  return { rows, municipalities, state };
}

export function findMunicipalities(atlas, query) {
  const terms = normalize(query);
  if (terms.join("").length < 3) return [];
  return [...atlas.municipalities.values()].filter((place) => matchesWords(normalize(place.municipio), terms));
}

export function readMetric(summary, metric, hasBase = true) {
  if (!hasBase) return { value: null, status: "sem-dados" };
  if (!summary.base) return { value: null, status: "sem-recorte" };
  const count = summary.included.length;
  let value = count;
  let partial = summary.unknown.length > 0;

  if (metric === "proporcao") value = 100 * count / summary.base;
  if (metric === "ies") {
    value = summary.institutions.size;
    partial = summary.newPossibleInstitutions > 0;
  }
  if (metric === "matriculas") {
    value = summary.enrollments.total;
    partial = summary.unknownEnrollments || summary.enrollments.known < count;
  }
  if (metric === "concluintes") {
    value = summary.graduates.total;
    partial = summary.unknownGraduates || summary.graduates.known < count;
  }
  if (value === 0 && partial) return { value: null, status: "indeterminado" };
  return { value, status: partial ? "parcial" : value === 0 ? "zero" : "valor" };
}

export function legendBins(max, metric) {
  if (!max) return [];
  const count = metric === "proporcao" ? 5 : Math.min(5, Math.ceil(max));
  const target = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const niceStep = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((step) => step >= target);
  const step = metric === "proporcao" ? Math.max(0.01, niceStep) : Math.ceil(niceStep);
  const limit = metric === "proporcao" ? Math.min(100, step * count) : step * count;
  const bounds = [];
  for (let from = 0; from < max; from += step) {
    bounds.push({ min: Number(from.toPrecision(12)), max: Number(Math.min(from + step, limit).toPrecision(12)) });
  }
  return bounds;
}
