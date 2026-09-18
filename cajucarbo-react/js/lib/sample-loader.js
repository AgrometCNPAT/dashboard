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
      const rows = (result.data || []).map(row => {
        const normalized = {};
        Object.entries(row || {}).forEach(([key, value]) => {
          if(key === undefined || key === null) return;
          normalized[String(key).trim()] = value;
        });
        return normalized;
      });

      return { headers, rows, fileName: path.split("/").pop() };
    });
}

window.CajuCarbo = window.CajuCarbo || {};
window.CajuCarbo.loadSampleCSV = loadSampleCSV;
