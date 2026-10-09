/* =========================================================
   sample-loader.js
  Carrega o dataset ambiental selecionado (ERA5-Land).
   A importação de novas planilhas fica restrita a um futuro painel
   administrativo e não é exposta nesta interface pública.
   ========================================================= */

function detectCSVDelimiter(text){
  if(!text) return ",";
  const candidates = [",", ";", "\t", "|"];
  const lines = text.split(/\r?\n/).filter(line => line.trim() && !/^\s*#/.test(line));
  if(!lines.length) return ",";

  let bestDelimiter = ",";
  let bestScore = -1;

  for(const delim of candidates){
    const score = lines.slice(0, 10).reduce((total, line) => {
      const pieces = line.split(delim).length;
      return total + Math.max(0, pieces - 1);
    }, 0);

    if(score > bestScore){
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

function normalizeCSVFields(fields = []){
  return fields
    .map(field => String(field || "").trim().replace(/^\uFEFF/, ""))
    .filter((field, index, arr) => field.length > 0 || index !== arr.length - 1);
}

function normalizeImportedRow(row = {}){
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    if(key === undefined || key === null) return;
    const cleanedKey = String(key).trim();
    if(!cleanedKey) return;
    normalized[cleanedKey] = value === "" || value === undefined ? null : value;
  });
  return normalized;
}

function isLikelyMetadataRow(row = {}){
  const values = Object.values(row)
    .filter(value => value !== null && value !== undefined && String(value).trim() !== "")
    .map(value => String(value).trim());

  if(!values.length) return true;

  const hasDateLikeValue = values.some(value => /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/.test(value));
  const hasNumericValue = values.some((value) => {
    const cleaned = String(value).replace(/%/g, "").replace(/\s+/g, "").replace(",", ".");
    return cleaned !== "" && !Number.isNaN(Number(cleaned));
  });

  if(hasDateLikeValue || hasNumericValue) return false;

  return true;
}

function sanitizeImportedRows(rows = []){
  return (rows || [])
    .map(normalizeImportedRow)
    .filter(row => !isLikelyMetadataRow(row));
}

function loadSampleCSV(path){
  return fetch(path, { cache: "default" })
    .then((response) => {
      if(!response.ok) throw new Error(`Não foi possível carregar ${path}: ${response.status}`);
      return response.text();
    })
    .then((text) => {
      const delimiter = detectCSVDelimiter(text);
      const result = Papa.parse(text, {
        delimiter,
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => String(header || "").trim().replace(/^\uFEFF/, "")
      });

      if(result.errors && result.errors.length){
        const err = result.errors[0];
        throw new Error(`CSV inválido: ${err.message}`);
      }

      const headers = normalizeCSVFields(result.meta.fields || []);
      const rows = sanitizeImportedRows((result.data || []).map(row => {
        const normalized = {};
        Object.entries(row || {}).forEach(([key, value]) => {
          if(key === undefined || key === null) return;
          normalized[String(key).trim()] = value;
        });
        return normalized;
      }));

      return { headers, rows, fileName: path.split("/").pop() };
    });
}

async function parseUploadedDataset(file){
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  if(extension === "xlsx" || extension === "xls"){
    if(!window.XLSX) throw new Error("A biblioteca de leitura Excel não foi carregada. Tente novamente com um arquivo CSV.");
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    if(!workbook || !Array.isArray(workbook.SheetNames) || !workbook.SheetNames.length) throw new Error("A planilha não contém abas.");

    const mergedRows = []; 
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if(!sheet) return;
      const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true, blankrows: false });
      if(!rows.length) return;
      mergedRows.push(...sanitizeImportedRows(rows));
    });

    const headers = mergedRows.length
      ? Array.from(new Set(mergedRows.flatMap(row => Object.keys(row))))
      : [];

    if(!headers.length) throw new Error("A planilha está vazia ou sem linhas válidas para importar.");
    return { headers, rows: mergedRows, fileName: file.name };
  }

  if(extension !== "csv") throw new Error("Formato não suportado. Selecione um arquivo .csv, .xlsx ou .xls.");
  const text = await file.text();
  const delimiter = detectCSVDelimiter(text);
  const result = Papa.parse(text, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    transformHeader: header => String(header || "").trim().replace(/^\uFEFF/, "")
  });
  if(result.errors?.length){
    const error = result.errors[0];
    throw new Error(`CSV inválido: ${error.message}`);
  }
  const headers = normalizeCSVFields(result.meta.fields || []);
  const rows = sanitizeImportedRows((result.data || []).map(row => Object.fromEntries(
    Object.entries(row || {}).map(([key, value]) => [String(key).trim(), value === "" ? null : value])
  )));
  if(!headers.length || !rows.length) throw new Error("O arquivo não contém cabeçalho e registros para importar.");
  return { headers, rows, fileName: file.name };
}

window.CajuCarbo = window.CajuCarbo || {};
window.CajuCarbo.loadSampleCSV = loadSampleCSV;
window.CajuCarbo.parseUploadedDataset = parseUploadedDataset;
