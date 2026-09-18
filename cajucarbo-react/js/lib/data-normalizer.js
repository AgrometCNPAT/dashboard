/* =========================================================
   data-normalizer.js
   Reconhecimento automático de colunas + normalização
   ========================================================= */

/**
 * variableMapping
 * Cada chave interna aponta para uma lista de "aliases" (nomes de coluna
 * possíveis, em minúsculas, sem acento/espacos) que o sistema tenta
 * reconhecer automaticamente na planilha importada.
 */
const variableMapping = {
  timestamp:        { label: "Data/Hora",                 group: "TEMPO",       aliases: ["valid_time","data","datetime","timestamp","date","data_hora"] },

  latitude:         { label: "Latitude",                  group: "LOCALIZACAO", aliases: ["latitude","lat"] },
  longitude:        { label: "Longitude",                 group: "LOCALIZACAO", aliases: ["longitude","lon","lng"] },

  t2m_c:            { label: "Temperatura do ar",          group: "TEMPERATURA", aliases: ["t2m","t2m_c","temp_c","temperatura"] },
  t2m_c_mean:       { label: "Temperatura média",          group: "TEMPERATURA", aliases: ["t2m_c_mean","temp_media","temperatura_media"] },
  t2m_c_min:        { label: "Temperatura mínima",         group: "TEMPERATURA", aliases: ["t2m_c_min","temp_min","temperatura_minima"] },
  t2m_c_max:        { label: "Temperatura máxima",         group: "TEMPERATURA", aliases: ["t2m_c_max","temp_max","temperatura_maxima"] },

  d2m_c:            { label: "Ponto de orvalho",           group: "UMIDADE",     aliases: ["d2m","d2m_c","dew_point","ponto_orvalho"] },
  rh:               { label: "Umidade relativa",           group: "UMIDADE",     aliases: ["rh","umidade","umidade_relativa"] },
  rh_mean:          { label: "Umidade média",              group: "UMIDADE",     aliases: ["rh_mean","umidade_media"] },
  rh_min:           { label: "Umidade mínima",             group: "UMIDADE",     aliases: ["rh_min","umidade_minima"] },
  rh_max:           { label: "Umidade máxima",             group: "UMIDADE",     aliases: ["rh_max","umidade_maxima"] },

  skt_c:            { label: "Temperatura da superfície",  group: "TEMPERATURA", aliases: ["skt","skt_c","temp_superficie"] },

  swvl1:            { label: "Umidade do solo (0-7cm)",    group: "SOLO",        aliases: ["swvl1","soil1","umid_solo_1"] },
  swvl2:            { label: "Umidade do solo (7-28cm)",   group: "SOLO",        aliases: ["swvl2","soil2","umid_solo_2"] },
  swvl3:            { label: "Umidade do solo (28-100cm)", group: "SOLO",        aliases: ["swvl3","soil3","umid_solo_3"] },
  swvl4:            { label: "Umidade do solo (100-289cm)",group: "SOLO",        aliases: ["swvl4","soil4","umid_solo_4"] },
  swvl1_mean:       { label: "Umidade do solo — média",    group: "SOLO",        aliases: ["swvl1_mean","umid_solo_media"] },

  sp_hpa:           { label: "Pressão atmosférica",        group: "PRESSAO",     aliases: ["sp_pa","sp_hpa","pressao","pressao_atm"] },
  sp_hpa_mean:      { label: "Pressão — média",            group: "PRESSAO",     aliases: ["sp_hpa_mean","pressao_media"] },

  strd_jm2:         { label: "Radiação térmica (J/m²)",    group: "RADIACAO",    aliases: ["strd_jm2"] },
  strd_wm2:         { label: "Radiação térmica (W/m²)",    group: "RADIACAO",    aliases: ["strd_wm2"] },
  ssrd_jm2:         { label: "Radiação solar (J/m²)",      group: "RADIACAO",    aliases: ["ssrd_jm2"] },
  ssrd_wm2:         { label: "Radiação solar (W/m²)",      group: "RADIACAO",    aliases: ["ssrd_wm2"] },
  ssrd_mjm2_dia:    { label: "Radiação solar diária (MJ/m²)", group: "RADIACAO", aliases: ["ssrd_mjm2_dia","radiacao_dia"] },

  v10:              { label: "Vento — componente V",       group: "VENTO",       aliases: ["v10"] },
  u10:              { label: "Vento — componente U",       group: "VENTO",       aliases: ["u10"] },
  wind_speed:       { label: "Velocidade do vento",        group: "VENTO",       aliases: ["wind_speed","velocidade_vento","vento"] },
  wind_speed_mean:  { label: "Vento — média",              group: "VENTO",       aliases: ["wind_speed_mean","vento_medio"] },

  tp_mm:            { label: "Precipitação",                group: "PRECIPITACAO",aliases: ["tp_m","tp_mm","precipitacao","chuva"] },
  tp_mm_dia:        { label: "Precipitação diária",         group: "PRECIPITACAO",aliases: ["tp_mm_dia","precipitacao_dia","chuva_dia"] },
};

/**
 * parseTimestampToISO(raw)
 * Converte formatos comuns de planilha (dd/mm/aaaa[ HH:mm]) para um
 * formato ISO que os gráficos conseguem ordenar/interpretar como tempo.
 * Se o valor não corresponder a um padrão conhecido, é devolvido como veio.
 */
function parseTimestampToISO(raw){
  if(raw === null || raw === undefined) return null;
  const v = String(raw).trim();
  if(!v) return null;

  const isoLike = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(isoLike) return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}T${isoLike[4]}:${isoLike[5]}:${isoLike[6] || "00"}`;

  const dayFirst = v.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(dayFirst) return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}T${dayFirst[4]}:${dayFirst[5]}:${dayFirst[6] || "00"}`;

  const dayOnly = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(dayOnly) return `${dayOnly[3]}-${dayOnly[2]}-${dayOnly[1]}`;

  // Remove linhas de metadados e textos inseridos em meio ao dataset.
  if(/[A-Za-zÀ-ÿ]/.test(v)) return null;
  return v;
}

/** Normaliza uma string de cabeçalho de coluna para comparação. */
function slugHeader(h){
  return String(h)
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9_]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

/**
 * detectVariables(headers)
 * Recebe os cabeçalhos crus da planilha e retorna:
 *  - matched: { headerOriginal -> chave interna reconhecida }
 *  - unmatched: [headers não reconhecidos]
 *  - byGroup: contagem de variáveis reconhecidas por grupo temático
 */
function detectVariables(headers){
  const matched = {};
  const unmatched = [];
  const byGroup = {};

  headers.forEach(h => {
    const slug = slugHeader(h);
    let found = null;

    for(const key in variableMapping){
      if(variableMapping[key].aliases.includes(slug)){
        found = key;
        break;
      }
    }
    if(found){
      matched[h] = found;
      const group = variableMapping[found].group;
      byGroup[group] = (byGroup[group]||0) + 1;
    } else {
      unmatched.push(h);
    }
  });

  return { matched, unmatched, byGroup };
}

/**
 * normalizeData(rawRows, matched)
 * Transforma linhas cruas (array de objetos, chave = cabeçalho original)
 * em um modelo interno padronizado, usando o mapeamento detectado.
 * Nenhum valor é inventado: campos ausentes permanecem `null`.
 */
function normalizeData(rawRows, matched){
  return rawRows.reduce((acc, row) => {
    const out = {
      timestamp: null, latitude: null, longitude: null,
      t2m_c: null, t2m_c_mean: null, t2m_c_min: null, t2m_c_max: null,
      d2m_c: null, skt_c: null,
      rh: null, rh_mean: null, rh_min: null, rh_max: null,
      swvl1: null, swvl2: null, swvl3: null, swvl4: null, swvl1_mean: null,
      sp_hpa: null, sp_hpa_mean: null,
      wind_speed: null, wind_speed_mean: null, u10: null, v10: null,
      tp_mm: null, tp_mm_dia: null,
      ssrd_wm2: null, ssrd_mjm2_dia: null, strd_wm2: null,
    };

    for(const originalHeader in row){
      const key = matched[originalHeader];
      if(!key) continue;
      if(!(key in out)) continue; // chave reconhecida mas fora do modelo interno padrão (ok, ignorado no modelo)

      let val = row[originalHeader];
      if(val === "" || val === undefined) val = null;

      if(key === "timestamp"){
        if(out.timestamp === null && val !== null){
          out.timestamp = parseTimestampToISO(val);
        }
        continue;
      }

      if(val !== null){
        const numeric = typeof val !== "string" ? Number(val) : parseFloat(String(val).replace(",", "."));
        if(isNaN(numeric)){
          continue;
        }

        let scaled = numeric;
        const sourceAlias = slugHeader(String(originalHeader));

        if((key === "t2m_c" || key === "d2m_c" || key === "skt_c") && ["t2m", "d2m", "skt"].includes(sourceAlias)){
          scaled = numeric - 273.15;
        }

        if(key === "sp_hpa" && sourceAlias === "sp_pa"){
          scaled = numeric / 100;
        }

        if(key === "tp_mm" && sourceAlias === "tp_m"){
          scaled = numeric * 1000;
        }

        out[key] = scaled;
      }
    }

    // Linha de metadado/ruído: sem timestamp válido ou sem qualquer número útil,
    // deve ser descartada antes de calcular médias e estatísticas.
    const hasNumericData = Object.values(out).some(v => typeof v === "number" && !isNaN(v));
    if(out.timestamp && hasNumericData){
      acc.push(out);
    }
    return acc;
  }, []);
}

window.CajuCarbo = window.CajuCarbo || {};
window.CajuCarbo.variableMapping = variableMapping;
window.CajuCarbo.detectVariables = detectVariables;
window.CajuCarbo.normalizeData = normalizeData;
window.CajuCarbo.slugHeader = slugHeader;
window.CajuCarbo.parseTimestampToISO = parseTimestampToISO;
