/* =========================================================
   tower-status.js
   Deriva o status da torre a partir da qualidade real dos dados
   recebidos. Nunca é um valor inventado.
   ========================================================= */

function computeTowerStatus(normalized, coreFields){
  if(!normalized || !normalized.length){
    return { status: null, missingRatio: null, lastTimestamp: null };
  }
  let totalCells = 0, missingCells = 0;
  normalized.forEach(row => {
    coreFields.forEach(f => {
      totalCells++;
      if(row[f] === null || row[f] === undefined || isNaN(row[f])) missingCells++;
    });
  });
  const missingRatio = totalCells ? missingCells/totalCells : 1;
  let status = "operacional";
  if(missingRatio > 0.35) status = "sem-comunicacao";
  else if(missingRatio > 0.1) status = "atencao";
  const lastTimestamp = normalized[normalized.length-1]?.timestamp ?? null;
  return { status, missingRatio, lastTimestamp };
}

const TOWER_STATUS_LABEL = {
  "operacional": "Operacional",
  "atencao": "Atenção",
  "sem-comunicacao": "Sem comunicação"
};

window.CajuCarbo = window.CajuCarbo || {};
Object.assign(window.CajuCarbo, { computeTowerStatus, TOWER_STATUS_LABEL });
