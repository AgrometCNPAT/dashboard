const test = require("node:test");
const assert = require("node:assert/strict");

global.window = { CajuCarbo: {} };
require("./statistics.js");
require("./period-filter.js");
require("./data-normalizer.js");
require("./sample-loader.js");

const CC = window.CajuCarbo;

function dated(timestamp, values = {}){
  return { timestamp, timestampRaw: timestamp, ...values };
}

test("interpreta ISO, DD/MM/AAAA, mês escrito e rejeita datas impossíveis", () => {
  assert.equal(CC.parsePeriodDate("2024-02-29").dateKey, "2024-02-29");
  assert.equal(CC.parseTimestampToISO("2024-03-01T01:02:03Z"), "2024-03-01T01:02:03Z");
  assert.equal(CC.parsePeriodDate("29/02/2024 23:30").month, 2);
  assert.equal(CC.parsePeriodDate("31/02/2024"), null);
  assert.equal(CC.normalizePeriodMonth("Março"), 3);
  assert.equal(CC.normalizePeriodMonth("11"), 11);
});

test("Geral mantém todas as linhas e filtros anuais e mensais usam datas reais", () => {
  const rows = [
    dated("2020-12-31T23:00:00"), dated("2021-01-01T00:00:00"),
    dated("2021-01-04T00:00:00"), dated("2021-02-02T00:00:00")
  ];
  const index = CC.buildPeriodIndex(rows);
  const periods = CC.getAvailablePeriods(index);

  assert.equal(CC.filterDataByPeriod(index, { mode: "all" }).rows.length, 4);
  assert.deepEqual(CC.filterDataByPeriod(index, { mode: "year", year: 2021 }).rows, rows.slice(1));
  assert.deepEqual(CC.filterDataByPeriod(index, { mode: "month", year: 2021, month: 1 }).rows, rows.slice(1, 3));
  assert.deepEqual(periods.monthsByYear["2021"].map(item => item.value), [1, 2]);
});

test("semana ISO combina ano e número corretamente na virada do ano", () => {
  const rows = [dated("2020-12-31"), dated("2021-01-01"), dated("2021-01-04")];
  const index = CC.buildPeriodIndex(rows);
  const result = CC.filterDataByPeriod(index, { mode: "week", year: 2020, week: 53 });

  assert.deepEqual(result.rows, rows.slice(0, 2));
  assert.deepEqual(CC.getAvailablePeriods(index).weeksByYear["2020"].map(item => item.value), [53]);
});

test("trocar ano corrige mês inválido para um mês disponível", () => {
  const index = CC.buildPeriodIndex([dated("2020-12-01"), dated("2021-03-01")]);
  const periods = CC.getAvailablePeriods(index);
  const selection = CC.normalizePeriodSelection(periods, { mode: "month", year: 2020, month: 3 });

  assert.equal(selection.year, 2020);
  assert.equal(selection.month, 12);
});

test("intervalo sem registros retorna vazio e respeita limites inclusivos", () => {
  const index = CC.buildPeriodIndex([dated("2024-03-01"), dated("2024-03-31"), dated("2024-04-01")]);
  assert.equal(CC.filterDataByPeriod(index, { mode: "range", startDate: "2024-05-01", endDate: "2024-05-31" }).rows.length, 0);
  assert.equal(CC.filterDataByPeriod(index, { mode: "range", startDate: "2024-03-01", endDate: "2024-03-31" }).rows.length, 2);
  assert.equal(CC.filterDataByPeriod(index, { mode: "range", startDate: "2024-04-01", endDate: "2024-03-01" }).rows.length, 0);
});

test("datas inválidas e colunas separadas são visíveis sem descartar medições", () => {
  const detected = CC.detectVariables(["Ano", "Mês", "Semana", "Temperatura"]);
  const rows = CC.normalizeData([
    { Ano: "2024", Mês: "Março", Semana: "W09", Temperatura: "22.5" },
    { Ano: "2024", Mês: "13", Semana: "0", Temperatura: "Infinity" }
  ], detected.matched);
  const index = CC.buildPeriodIndex(rows);
  const selection = CC.filterDataByPeriod(index, { mode: "month", year: 2024, month: 3 });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].period_month, 3);
  assert.equal(rows[0].period_week, 9);
  assert.deepEqual(selection.rows, rows);
  assert.equal(CC.getAvailablePeriods(index).undatedCount, 1);

  const crossoverRows = CC.normalizeData([
    { Ano: "2021", Mês: "Janeiro", Semana: "53", Temperatura: "18" }
  ], detected.matched);
  const crossoverIndex = CC.buildPeriodIndex(crossoverRows);
  assert.equal(CC.filterDataByPeriod(crossoverIndex, { mode: "week", year: 2020, week: 53 }).rows.length, 1);
});

test("reindexar dados importados atualiza opções e preserva duplicatas", () => {
  const original = [dated("2024-01-01"), dated("2024-01-01")];
  const updated = [...original, dated("2025-06-01")];
  assert.deepEqual(CC.getAvailablePeriods(CC.buildPeriodIndex(original)).years, [2024]);
  assert.deepEqual(CC.getAvailablePeriods(CC.buildPeriodIndex(updated)).years, [2024, 2025]);
  assert.equal(CC.filterDataByPeriod(CC.buildPeriodIndex(original), { mode: "all" }).rows.length, 2);
});

test("médias ignoram ausentes, totais somam chuva sem duplicar valor diário", () => {
  const rows = [
    dated("2024-01-01T00:00:00", { temperature: 10, tp_mm: 1, tp_mm_dia: 4 }),
    dated("2024-01-01T01:00:00", { temperature: 20, tp_mm: 2, tp_mm_dia: 4 }),
    dated("2024-01-02T00:00:00", { temperature: null, tp_mm: 3, tp_mm_dia: 6 })
  ];
  const metrics = CC.calculatePeriodMetrics(rows, ["temperature", "tp_mm", "tp_mm_dia"]);

  assert.equal(metrics.observationCount, 3);
  assert.equal(metrics.statistics.temperature.mean, 15);
  assert.equal(metrics.statistics.temperature.count, 2);
  assert.equal(metrics.statistics.temperature.missing, 1);
  assert.equal(metrics.totals.tp_mm, 6);
  assert.equal(metrics.totals.tp_mm_dia, 10);
});

test("séries temporais agrupam por mês, semana e dia sem médias de médias", () => {
  const monthly = CC.groupDataForCharts(
    ["2024-01-01", "2024-01-02", "2024-02-01"],
    [{ name: "T", values: [10, 20, 40] }]
  );
  assert.equal(monthly.groupBy, "month");
  assert.deepEqual(monthly.series[0].values, [15, 40]);

  const weekly = CC.groupDataForCharts(
    ["2024-03-01", "2024-03-04", "2024-03-11"],
    [{ name: "T", values: [10, 20, 40] }]
  );
  assert.equal(weekly.groupBy, "week");
  assert.deepEqual(weekly.series[0].values, [10, 20, 40]);

  const daily = CC.groupDataForCharts(
    ["2024-03-01T00:00:00", "2024-03-01T01:00:00"],
    [{ name: "T", values: [10, null] }]
  );
  assert.equal(daily.groupBy, "day");
  assert.deepEqual(daily.series[0].values, [10]);

  const dailyAcrossMonths = CC.groupDataForCharts(
    ["2024-01-01T00:00:00", "2024-01-01T01:00:00", "2024-02-01T00:00:00"],
    [{ name: "T", values: [10, 20, 40] }],
    "day"
  );
  assert.equal(dailyAcrossMonths.groupBy, "day");
  assert.deepEqual(dailyAcrossMonths.series[0].values, [15, 40]);

  const rainfall = CC.groupDataForCharts(
    ["2024-01-01", "2024-01-02", "2024-02-01"],
    [{ name: "Chuva", aggregate: "sum", values: [1, 2, 4] }]
  );
  assert.deepEqual(rainfall.series[0].values, [3, 4]);
});

test("importa planilhas Excel com múltiplas abas e ignora linhas de metadados", async () => {
  const sheet1 = [
    { Data: "01/01/2024", Temperatura: 20 },
    { Data: "02/01/2024", Temperatura: 22 },
    { Data: "Metadata", Temperatura: "linha de texto" }
  ];
  const sheet2 = [
    { Data: "03/01/2024", Temperatura: 24 },
    { Data: "04/01/2024", Temperatura: 26 },
    { Data: "Resumo", Temperatura: null }
  ];

  const originalXlsx = global.window.XLSX;
  global.window.XLSX = {
    read: () => ({
      SheetNames: ["Primeira guia", "Segunda guia"],
      Sheets: {
        "Primeira guia": { A1: { v: "Data" }, B1: { v: "Temperatura" }, A2: { v: "01/01/2024" }, B2: { v: 20 }, A3: { v: "02/01/2024" }, B3: { v: 22 }, A4: { v: "Metadata" }, B4: { v: "linha de texto" } },
        "Segunda guia": { A1: { v: "Data" }, B1: { v: "Temperatura" }, A2: { v: "03/01/2024" }, B2: { v: 24 }, A3: { v: "04/01/2024" }, B3: { v: 26 }, A4: { v: "Resumo" }, B4: { v: null } }
      }
    }),
    utils: {
      sheet_to_json: (sheet, options) => {
        const values = [];
        const rows = Object.entries(sheet).filter(([key]) => /^[A-Z]+\d+$/.test(key));
        const maxRow = Math.max(...rows.map(([key]) => parseInt(key.replace(/^[A-Z]+/, ''), 10)));
        const maxCol = Math.max(...rows.map(([key]) => key.replace(/\d+$/, '').split('').reduce((sum, ch) => sum * 26 + (ch.charCodeAt(0)-64), 0)));
        for (let rowNum = 2; rowNum <= maxRow; rowNum++) {
          const row = {};
          for (let colNum = 1; colNum <= maxCol; colNum++) {
            const key = String.fromCharCode(64 + colNum) + rowNum;
            if (sheet[key] !== undefined) row[String.fromCharCode(64 + colNum)] = sheet[key].v;
          }
          if (row['A'] && String(row['A']).trim() !== 'Data') values.push({ Data: row['A'], Temperatura: row['B'] });
        }
        return values;
      }
    }
  };

  const file = { name: "dados.xlsx", arrayBuffer: async () => new ArrayBuffer(8) };
  const parsed = await CC.parseUploadedDataset(file);

  assert.equal(parsed.headers.length, 2);
  assert.equal(parsed.rows.length, 4);
  assert.deepEqual(parsed.rows.map(r => r.Data), ["01/01/2024", "02/01/2024", "03/01/2024", "04/01/2024"]);

  global.window.XLSX = originalXlsx;
});