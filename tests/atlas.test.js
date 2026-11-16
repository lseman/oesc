import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRecorte, findMunicipalities, legendBins, prepareAtlas, readMetric, summarize } from "../atlas/model.js";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const data = read("../data/atlas/formacao.json");
const geography = read("../data/atlas/municipios.geojson");
const atlas = prepareAtlas(data, geography);
const recorte = (filters = {}) => buildRecorte(atlas, {
  busca: "", area: "", ies: "", categoria: "", organizacao: "", pertinencia: "", ...filters,
});

test("presential observations join 295 municipalities and 95 unique IES", () => {
  const { state, municipalities, rows } = recorte();
  assert.equal(municipalities.size, 295);
  assert.equal(rows.length, 1616);
  assert.equal(rows.filter((row) => row.abi).length, 16);
  assert.deepEqual(
    [atlas.municipalBase.size, atlas.institutions.size, new Set(rows.map((row) => `${row.ies}:${row.municipio}`)).size],
    [63, 95, 187],
  );
  assert.deepEqual(
    [state.included.length, state.unknown.length, state.institutions.size, state.enrollments.total, state.graduates.total],
    [390, 5, 63, 37045, 4253],
  );
  assert.deepEqual(state.enrollments, { total: 37045, known: 390, expected: 390 });
  assert.equal([...municipalities.values()].reduce((sum, item) => sum + item.included.length, 0), 390);
  assert.ok([...municipalities.values()].reduce((sum, item) => sum + item.institutions.size, 0) > 63);
  assert.throws(() => prepareAtlas({ ...data, observacoes: [...data.observacoes, data.observacoes[0]] }, geography), /duplicada/);
});

test("all filters except pertinence apply to the same proportion denominator", () => {
  const filters = { busca: "joinville", categoria: "1", organizacao: "1", ies: "ies:585", area: "0716" };
  const all = recorte(filters).state;
  const direct = recorte({ ...filters, pertinencia: "direta" }).state;
  const potential = recorte({ ...filters, pertinencia: "habilitadora" }).state;
  assert.equal(direct.base, all.base);
  assert.equal(potential.base, all.base);
  assert.equal(direct.included.length, 1);
  assert.equal(direct.included[0].rotulo, "0716E01");
  assert.equal(direct.enrollments.total, 275);
  assert.equal(direct.graduates.total, 38);
  assert.deepEqual(readMetric(direct, "proporcao"), { value: 100 / all.base, status: "valor" });

  const institutions = recorte({ categoria: "1", organizacao: "1" }).state;
  assert.equal(institutions.base, 132);
  assert.equal(institutions.included.length, 39);
  assert.equal(institutions.institutions.size, 2);
  const ufsc = atlas.institutions.get("ies:585");
  assert.deepEqual([ufsc.docentes, ufsc.doutores, ufsc.linha], [2729, 2514, 269]);
});

test("zero, geographic absence, an empty filter, and incomplete measures stay distinct", () => {
  const { municipalities } = recorte({ pertinencia: "direta" });
  assert.deepEqual(readMetric(municipalities.get("4200101"), "ofertas"), { value: 0, status: "zero" });
  assert.deepEqual(readMetric(municipalities.get("4200051"), "ofertas", false), { value: null, status: "sem-dados" });
  assert.deepEqual(readMetric(recorte({ busca: "sem correspondência" }).state, "ofertas"), { value: null, status: "sem-recorte" });
  assert.deepEqual(readMetric(municipalities.get("4205407"), "ofertas"), { value: null, status: "indeterminado" });
  const joinville = municipalities.get("4209102");
  assert.deepEqual(readMetric(joinville, "ofertas"), { value: 1, status: "parcial" });
  assert.deepEqual(readMetric(joinville, "ies"), { value: 1, status: "valor" });

  // Synthetic cases. A known absence of enrollments cannot change the volume;
  // missing measurements and unknown positive amounts can.
  const knownZero = { ies: "synthetic-1", pertinencia: 1, matriculas: 0, concluintes: 0 };
  const unknownZero = { ies: "synthetic-2", pertinencia: null, matriculas: 0, concluintes: 0 };
  const missing = { ies: "synthetic-3", pertinencia: 1, matriculas: null, concluintes: null };
  assert.deepEqual(readMetric(summarize([knownZero, unknownZero], ""), "matriculas"), { value: 0, status: "zero" });
  assert.deepEqual(readMetric(summarize([knownZero, missing], ""), "matriculas"), { value: null, status: "indeterminado" });
  const partial = summarize([{ ...knownZero, matriculas: 12 }, missing], "");
  assert.deepEqual(partial.enrollments, { total: 12, known: 1, expected: 2 });
  assert.deepEqual(readMetric(partial, "matriculas"), { value: 12, status: "parcial" });
});

test("CINE labels and named searches keep Gastronomia and Astronomia distinct", () => {
  const gastronomy = recorte({ busca: "gástronomia" });
  assert.equal(gastronomy.state.base, 14);
  assert.equal(gastronomy.state.included.length, 0);
  assert.deepEqual(new Set(gastronomy.rows.map(({ rotulo, pertinencia }) => `${rotulo}:${pertinencia}`)), new Set(["1013G01:0"]));
  assert.equal(data.rotulos["1013G01"], "Gastronomia");
  assert.equal(recorte({ busca: "Astronomia" }).state.base, 0);
  assert.equal(recorte({ busca: "Abdon Batista" }).state.base, 0);
  assert.equal(findMunicipalities(atlas, "abdon ba")[0].municipio_codigo, "4200051");
});

test("blue-scale intervals are ordered and span the selected metric", () => {
  for (const [max, key] of [[1, "ofertas"], [51, "ofertas"], [8499, "matriculas"], [0.546448087, "proporcao"], [100, "proporcao"]]) {
    const bins = legendBins(max, key);
    assert.ok(bins.length <= 5);
    assert.equal(bins[0].min, 0);
    assert.ok(bins.at(-1).max >= max);
    assert.ok(bins.every((bin, index) => bin.min < bin.max && (!index || bin.min === bins[index - 1].max)));
    if (key === "proporcao") assert.ok(bins.at(-1).max <= 100);
  }
  assert.deepEqual(legendBins(0, "ofertas"), []);
});
