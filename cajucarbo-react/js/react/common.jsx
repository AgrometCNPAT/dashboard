/* =========================================================
   common.jsx
   Componentes compartilhados: intro 3D, navegação, PlotlyChart,
   estados vazios e pequenos helpers de exibição.
   ========================================================= */

var { useEffect, useRef, useState } = React;
var CC = window.CajuCarbo;

function fmt(v, decimals=1){
  return (v === null || v === undefined || isNaN(v))
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Wrapper genérico para qualquer gráfico Plotly. `draw` recebe o nó DOM. */
function PlotlyChart({ draw, deps = [], className = "chart-box" }){
  const ref = useRef(null);
  useEffect(() => {
    if(ref.current) draw(ref.current);
    return () => { if(ref.current && ref.current.data) Plotly.purge(ref.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <div ref={ref} className={className}></div>;
}

function CountUp({ value, decimals=0 }){
  const ref = useRef(null);
  useEffect(() => {
    if(ref.current && typeof value === "number") CC.countUp(ref.current, value, { decimals });
  }, [value]);
  return <span ref={ref} className="count-up">{typeof value === "number" ? "0" : "—"}</span>;
}

function EmptyState({ title, desc }){
  return (
    <div className="empty-state">
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
  );
}

function StatRow({ pairs, formatValue }){
  return (
    <div style={{display:"flex", gap:18, flexWrap:"wrap", marginBottom:14}}>
      {pairs.map(([label, val], i) => (
        <div key={i}>
          <div style={{fontSize:11, color:"var(--cinza-400)", fontWeight:600}}>{label}</div>
          <div style={{fontFamily:"var(--fonte-num)", fontSize:18, fontWeight:700, color:"var(--azul-900)"}}>{formatValue ? formatValue(val, label) : fmt(val)}</div>
        </div>
      ))}
    </div>
  );
}

function BigStat({ value, unit }){
  return (
    <div style={{fontFamily:"var(--fonte-num)", fontSize:30, fontWeight:700, color:"var(--azul-900)"}}>
      {fmt(value)}<small style={{fontSize:14, color:"var(--cinza-400)", fontWeight:600}}> {unit}</small>
    </div>
  );
}

/* ---------------------------------------------------------
   Intro (abertura 3D)
--------------------------------------------------------- */
function IntroOverlay({ hidden }){
  const canvasHostRef = useRef(null);

  useEffect(() => {
    if(hidden || !canvasHostRef.current || !window.THREE) return;
    const scene = CC.createParticleNetwork3D(canvasHostRef.current, {
      count: 36, color: 0xffffff, linkColor: 0x2E8B57, radius: 6.5, cameraZ: 8
    });
    return () => scene.dispose();
  }, [hidden]);

  return (
    <div className={"intro" + (hidden ? " is-hidden" : "")}>
      <div className="intro__canvas" ref={canvasHostRef}></div>
      <div className="intro__content">
        <img src="../brand/cajucarbo-logo.png" alt="CajuCarbo" className="intro__logo" />
        <div className="intro__mark">EMBRAPA</div>
        <div className="intro__title">CajuCarbo</div>
        <p className="intro__tagline">Monitoramento e inteligência de dados para sistemas agrícolas</p>
        <p className="intro__desc">A plataforma transforma dados ambientais em informações para análise científica.</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Navegação lateral
--------------------------------------------------------- */
const NAV_ITEMS = [
  { id: "overview", num: "01", label: "Visão Geral" },
  { id: "cultivo", num: "02", label: "Dados do Cultivo" },
  { id: "meteorologia", num: "03", label: "Meteorologia" },
  { id: "solo", num: "04", label: "Solo" },
  { id: "radiacao", num: "05", label: "Radiação e Energia" },
  { id: "agua", num: "06", label: "Água e Orvalho" },
  { id: "stats", num: "07", label: "Análise Estatística" },
  { id: "modelo", num: "08", label: "Modelos de Dados" },
  { id: "torres", num: "09", label: "Torres de Campo" },
  { id: "relatorio", num: "10", label: "Relatórios" },
  { id: "producao", num: "▤", label: "Produção Nacional" },
];

function Sidebar({ active, onSelect, navOpen }){
  return (
    <nav className={"sidenav" + (navOpen ? " is-open" : "")} id="sidenav">
      <div className="sidenav__brand">
        <div className="sidenav__brand-row">
          <img src="../brand/cajucarbo-logo.png" alt="CajuCarbo" className="sidenav__logo" />
          <div>
            <div className="sidenav__brand-mark">CajuCarbo</div>
            <div className="sidenav__brand-sub">Data Intelligence Platform</div>
          </div>
        </div>
      </div>
      <ul className="sidenav__list">
        {NAV_ITEMS.map(item => (
          <li
            key={item.id}
            className={"sidenav__item" + (active === item.id ? " is-active" : "")}
            onClick={() => onSelect(item)}
          >
            <span className="num">{item.num}</span> {item.label}
          </li>
        ))}
      </ul>
      <div className="sidenav__foot">Embrapa · Projeto CajuCarbo<br/>Plataforma de análise de dados ambientais</div>
    </nav>
  );
}

/* ---------------------------------------------------------
   Alternador de fonte de dados (consome o registro em datasets.js)
--------------------------------------------------------- */
function DatasetSwitcher({ datasetId, onChange }){
  const datasets = CC.CC_DATASETS;
  return (
    <div className="dataset-switcher">
      <label htmlFor="dataset-select">Fonte de dados</label>
      <select
        id="dataset-select"
        value={datasetId}
        onChange={(e) => onChange(e.target.value)}
      >
        {datasets.map(d => (
          <option key={d.id} value={d.id} disabled={d.status !== "available"}>
            {d.label}{d.status !== "available" ? " (em breve)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function Topbar({ activeItem, status, onToggleNav, datasetId, onDatasetChange }){
  const pillClass = status === "ready" ? "status-pill is-online" : (status === "error" ? "status-pill" : "status-pill is-waiting");
  const pillLabel = status === "ready" ? "Dados conectados" : (status === "error" ? "Falha ao carregar dados" : "Carregando dados...");
  return (
    <header className="topbar">
      <div style={{display:"flex", alignItems:"center", minWidth:0}}>
        <button className="nav-toggle" onClick={onToggleNav} aria-label="Menu">☰</button>
        <div className="topbar__section-title"><span>{activeItem.num}</span>{activeItem.label}</div>
      </div>
      <div className="topbar__right">
        {datasetId && <DatasetSwitcher datasetId={datasetId} onChange={onDatasetChange} />}
        <span className={pillClass}><span className="dot"></span> {pillLabel}</span>
      </div>
    </header>
  );
}

function toLocalDateString(value){
  if(!value) return "";
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKeyFromValue(value){
  if(!value) return "";
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseTimeMinutes(value){
  if(!value) return 0;
  const [hours, minutes] = String(value).split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function buildTemporalFilterOptions(rows){
  const valid = (rows || []).filter(r => r && r.timestamp);
  if(!valid.length) return { minDate: null, maxDate: null, years: [], months: [], days: [] };

  const dates = valid.map(r => new Date(r.timestamp)).filter(d => !Number.isNaN(d.getTime()));
  const minTime = dates.reduce((min, d) => (d.getTime() < min ? d.getTime() : min), dates[0].getTime());
  const maxTime = dates.reduce((max, d) => (d.getTime() > max ? d.getTime() : max), dates[0].getTime());
  const minDate = new Date(minTime);
  const maxDate = new Date(maxTime);

  const years = Array.from(new Set(dates.map(d => d.getFullYear()))).sort((a,b)=>a-b);
  const months = Array.from(new Set(dates.map(d => monthKeyFromValue(d)))).sort();
  const days = Array.from(new Set(dates.map(d => toLocalDateString(d)))).sort();

  return { minDate, maxDate, years, months, days };
}

function formatTemporalFilterLabel(filter, options = {}){
  if(!filter || filter.granularity === "all") return "Todos os dados";
  if(filter.granularity === "day") return filter.day ? `Dia ${filter.day.split("-").reverse().join("/")}` : "Dia selecionado";
  if(filter.granularity === "week") {
    if(filter.weekStart && filter.weekEnd) return `${filter.weekStart.split("-").reverse().join("/")} — ${filter.weekEnd.split("-").reverse().join("/")}`;
    return "Semana selecionada";
  }
  if(filter.granularity === "month") return filter.month ? new Date(`${filter.month}-01T00:00:00`).toLocaleString("pt-BR", { month: "long", year: "numeric" }) : "Mês selecionado";
  if(filter.granularity === "year") return filter.year ? String(filter.year) : "Ano selecionado";
  if(filter.granularity === "custom") {
    if(filter.customStart && filter.customEnd) return `${filter.customStart.split("-").reverse().join("/")} — ${filter.customEnd.split("-").reverse().join("/")}`;
    return "Intervalo personalizado";
  }
  return "Período selecionado";
}

function applyTemporalFilter(rows, filter){
  if(!rows || !rows.length) return [];
  const normalized = rows.filter(r => r && r.timestamp);
  if(!normalized.length) return [];

  const options = buildTemporalFilterOptions(normalized);
  const defaultDay = options.days[options.days.length - 1] || toLocalDateString(options.maxDate);
  const defaultMonth = options.months[options.months.length - 1] || monthKeyFromValue(options.maxDate);
  const defaultYear = options.years[options.years.length - 1] || new Date(options.maxDate).getFullYear();

  const selectedDay = filter && filter.day ? filter.day : defaultDay;
  const selectedMonth = filter && filter.month ? filter.month : defaultMonth;
  const selectedYear = filter && filter.year ? Number(filter.year) : Number(defaultYear);

  return normalized.filter(row => {
    const d = new Date(row.timestamp);
    if(Number.isNaN(d.getTime())) return false;

    const dateKey = toLocalDateString(d);
    const month = monthKeyFromValue(d);
    const year = d.getFullYear();
    const hourMin = parseTimeMinutes(filter && filter.hourStart ? filter.hourStart : "00:00");
    const hourMax = parseTimeMinutes(filter && filter.hourEnd ? filter.hourEnd : "23:59");
    const currentMinutes = d.getHours() * 60 + d.getMinutes();

    if(filter && filter.hourStart && filter.hourEnd){
      if(currentMinutes < hourMin || currentMinutes > hourMax) return false;
    }

    switch(filter && filter.granularity ? filter.granularity : "all"){
      case "all":
        return true;
      case "day":
        return dateKey === selectedDay;
      case "week": {
        const weekStart = filter && filter.weekStart ? filter.weekStart : selectedDay;
        const weekEnd = filter && filter.weekEnd ? filter.weekEnd : toLocalDateString(new Date(new Date(weekStart).getTime() + 6 * 86400000));
        return dateKey >= weekStart && dateKey <= weekEnd;
      }
      case "month":
        return month === selectedMonth;
      case "year":
        return year === selectedYear;
      case "custom":
        return (!filter.customStart || dateKey >= filter.customStart) && (!filter.customEnd || dateKey <= filter.customEnd);
      default:
        return true;
    }
  });
}

function TemporalFilterBar({ rows, filter, onChange, datasetLabel }){
  const options = buildTemporalFilterOptions(rows || []);
  const setFilter = (patch) => onChange({ ...filter, ...patch });
  const activeLabel = formatTemporalFilterLabel(filter, options);

  const monthOptions = (options.months || []).map(value => {
    const [year, month] = value.split("-");
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
    return <option key={value} value={value}>{label}</option>;
  });

  const yearOptions = (options.years || []).map(value => <option key={value} value={value}>{value}</option>);

  const activeRecords = rows ? rows.length : 0;
  const currentGranularity = filter && filter.granularity ? filter.granularity : "all";

  return (
    <div className="panel reveal" style={{ marginBottom: 20 }}>
      <div className="panel__title" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h3>Período de análise</h3>
        <span className="meta" style={{ fontSize: 11 }}>{datasetLabel || "Base ativa"}</span>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "Todos" },
            { id: "day", label: "Diário" },
            { id: "week", label: "Semanal" },
            { id: "month", label: "Mensal" },
            { id: "year", label: "Anual" },
            { id: "custom", label: "Personalizado" }
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter({ granularity: item.id })}
              style={{
                border: currentGranularity === item.id ? "1px solid rgba(18,72,160,0.45)" : "1px solid rgba(148,163,184,0.35)",
                background: currentGranularity === item.id ? "rgba(18,72,160,0.12)" : "rgba(255,255,255,0.04)",
                color: currentGranularity === item.id ? "var(--azul-900)" : "var(--cinza-700)",
                padding: "8px 12px",
                borderRadius: 999,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
          {currentGranularity === "day" && (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Data</span>
              <input type="date" value={filter.day || ""} onChange={(e) => setFilter({ granularity: "day", day: e.target.value })} />
            </label>
          )}

          {currentGranularity === "week" && (
            <>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Início</span>
                <input type="date" value={filter.weekStart || ""} onChange={(e) => setFilter({ granularity: "week", weekStart: e.target.value, weekEnd: e.target.value ? toLocalDateString(new Date(new Date(e.target.value).getTime() + 6 * 86400000)) : "" })} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Fim</span>
                <input type="date" value={filter.weekEnd || ""} onChange={(e) => setFilter({ granularity: "week", weekStart: filter.weekStart || e.target.value, weekEnd: e.target.value })} />
              </label>
            </>
          )}

          {currentGranularity === "month" && (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Mês</span>
              <select value={filter.month || ""} onChange={(e) => setFilter({ granularity: "month", month: e.target.value })}>
                <option value="">Selecione</option>
                {monthOptions}
              </select>
            </label>
          )}

          {currentGranularity === "year" && (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Ano</span>
              <select value={filter.year || ""} onChange={(e) => setFilter({ granularity: "year", year: e.target.value })}>
                <option value="">Selecione</option>
                {yearOptions}
              </select>
            </label>
          )}

          {currentGranularity === "custom" && (
            <>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Início</span>
                <input type="date" value={filter.customStart || ""} onChange={(e) => setFilter({ granularity: "custom", customStart: e.target.value })} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Fim</span>
                <input type="date" value={filter.customEnd || ""} onChange={(e) => setFilter({ granularity: "custom", customEnd: e.target.value })} />
              </label>
            </>
          )}

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Hora inicial</span>
            <input type="time" value={filter.hourStart || "00:00"} onChange={(e) => setFilter({ hourStart: e.target.value })} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--cinza-400)", fontWeight: 700, textTransform: "uppercase" }}>Hora final</span>
            <input type="time" value={filter.hourEnd || "23:59"} onChange={(e) => setFilter({ hourEnd: e.target.value })} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "var(--cinza-400)" }}>
            <strong style={{ color: "var(--azul-900)" }}>Período analisado:</strong> {activeLabel}
          </div>
          <div style={{ fontSize: 12, color: "var(--cinza-400)" }}>
            <strong style={{ color: "var(--azul-900)" }}>Registros analisados:</strong> {activeRecords.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
    </div>
  );
}

window.CajuCarbo = window.CajuCarbo || {};
Object.assign(window.CajuCarbo, {
  fmt, PlotlyChart, CountUp, EmptyState, StatRow, BigStat,
  IntroOverlay, Sidebar, Topbar, NAV_ITEMS,
  TemporalFilterBar, buildTemporalFilterOptions, applyTemporalFilter, formatTemporalFilterLabel
});
