/* =========================================================
   App.jsx
   Componente raiz: carrega os dados automaticamente (sem
   upload público — a importação de planilhas é restrita ao
   painel administrativo), controla navegação e renderiza a
   seção ativa.
   ========================================================= */

var { useEffect, useState } = React;
var CC = window.CajuCarbo;
var { Sidebar, Topbar, IntroOverlay, NAV_ITEMS, TemporalFilterBar, applyTemporalFilter, buildTemporalFilterOptions } = CC;

const EMPTY_DATA = {
  hasData: false,
  normalized: [],
  metadata: { fileName: null, rowCount: 0, columnCount: 0, periodStart: null, periodEnd: null },
  statistics: {},
  variables: { matched: {}, unmatched: [], byGroup: {} },
  towerStatus: { status: null, missingRatio: null, lastTimestamp: null },
};

const DEFAULT_DATASET_ID = CC.CC_DATASETS.find(d => d.status === "available")?.id || CC.CC_DATASETS[0].id;
const DEFAULT_FILTER = { granularity: "all", day: "", weekStart: "", weekEnd: "", month: "", year: "", customStart: "", customEnd: "", hourStart: "00:00", hourEnd: "23:59" };

function App(){
  const [introHidden, setIntroHidden] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [datasetId, setDatasetId] = useState(DEFAULT_DATASET_ID);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [data, setData] = useState(EMPTY_DATA);
  const [timeFilter, setTimeFilter] = useState(DEFAULT_FILTER);

  // ---- Intro: dispensa automaticamente após uma breve abertura ----
  useEffect(() => {
    const t = setTimeout(() => setIntroHidden(true), 2200);
    return () => clearTimeout(t);
  }, []);

  // ---- Carregamento do dataset selecionado no alternador ----
  useEffect(() => {
    let cancelled = false;
    const dataset = CC.CC_DATASETS.find(d => d.id === datasetId);
    if(!dataset || dataset.status !== "available") return;

    setStatus("loading");
    async function boot(){
      try{
        const parsed = await CC.loadSampleCSV(dataset.path);
        if(!parsed.rows.length) throw new Error("Dataset vazio.");

        const detected = CC.detectVariables(parsed.headers);
        const normBase = CC.normalizeData(parsed.rows, detected.matched);
        const normalized = CC.calculateDerivedVariables(normBase);

        const metadata = {
          fileName: parsed.fileName,
          rowCount: parsed.rows.length,
          columnCount: parsed.headers.length,
          periodStart: normalized[0]?.timestamp ?? null,
          periodEnd: normalized[normalized.length-1]?.timestamp ?? null,
          datasetLabel: dataset.label,
        };

        const allFields = Object.keys(CC.NUMERIC_FIELD_LABELS);
        const statistics = CC.calculateStatistics(normalized, allFields);
        const towerStatus = CC.computeTowerStatus(normalized, CC.CORE_FIELDS_FOR_TOWER);
        const defaultOptions = buildTemporalFilterOptions(normalized);
        const firstDay = defaultOptions.days[0] || "";
        const lastDay = defaultOptions.days[defaultOptions.days.length - 1] || "";
        const firstMonth = defaultOptions.months[0] || "";
        const lastMonth = defaultOptions.months[defaultOptions.months.length - 1] || "";
        const firstYear = defaultOptions.years[0] ? String(defaultOptions.years[0]) : "";
        const lastYear = defaultOptions.years[defaultOptions.years.length - 1] ? String(defaultOptions.years[defaultOptions.years.length - 1]) : "";

        if(cancelled) return;
        setTimeFilter(prev => ({
          ...DEFAULT_FILTER,
          ...prev,
          granularity: "all",
          day: prev.day || lastDay,
          weekStart: prev.weekStart || firstDay,
          weekEnd: prev.weekEnd || lastDay,
          month: prev.month || lastMonth,
          year: prev.year || lastYear,
          customStart: prev.customStart || firstDay,
          customEnd: prev.customEnd || lastDay,
          hourStart: prev.hourStart || "00:00",
          hourEnd: prev.hourEnd || "23:59"
        }));
        setData({ hasData: true, normalized, metadata, statistics, variables: detected, towerStatus });
        setStatus("ready");
      } catch(err){
        console.error("Falha ao carregar dataset:", err);
        if(!cancelled) setStatus("error");
      }
    }
    boot();
    return () => { cancelled = true; };
  }, [datasetId]);

  // ---- Reveal-on-scroll a cada troca de seção ----
  useEffect(() => {
    const t = setTimeout(() => CC.initScrollReveal(), 30);
    window.scrollTo({ top: 0 });
    return () => clearTimeout(t);
  }, [activeSection, status]);

  useEffect(() => {
    if(!data.hasData || !data.normalized.length) return;
    const options = buildTemporalFilterOptions(data.normalized);
    const currentDay = options.days[options.days.length - 1] || "";
    const currentMonth = options.months[options.months.length - 1] || "";
    const currentYear = options.years[options.years.length - 1] || "";

    setTimeFilter(prev => ({
      ...DEFAULT_FILTER,
      ...prev,
      day: prev.day || currentDay,
      month: prev.month || currentMonth,
      year: prev.year || String(currentYear),
      weekStart: prev.weekStart || (options.days[0] || ""),
      weekEnd: prev.weekEnd || (options.days[options.days.length - 1] || ""),
      customStart: prev.customStart || (options.days[0] || ""),
      customEnd: prev.customEnd || (options.days[options.days.length - 1] || "")
    }));
  }, [data.hasData, data.normalized]);

  const activeItem = NAV_ITEMS.find(i => i.id === activeSection) || NAV_ITEMS[0];
  const filteredNormalized = data.hasData ? applyTemporalFilter(data.normalized, timeFilter) : [];
  const filteredStatistics = data.hasData && filteredNormalized.length
    ? CC.calculateStatistics(filteredNormalized, Object.keys(CC.NUMERIC_FIELD_LABELS))
    : {};
  const filteredTowerStatus = data.hasData && filteredNormalized.length
    ? CC.computeTowerStatus(filteredNormalized, CC.CORE_FIELDS_FOR_TOWER)
    : data.towerStatus;

  const filteredData = data.hasData ? {
    ...data,
    normalized: filteredNormalized,
    statistics: filteredStatistics,
    towerStatus: filteredTowerStatus,
    metadata: {
      ...data.metadata,
      rowCount: filteredNormalized.length,
      filteredRowCount: filteredNormalized.length,
      activeFilter: timeFilter
    }
  } : data;

  function renderSection(){
    switch(activeSection){
      case "overview": return <CC.OverviewSection data={filteredData} />;
      case "cultivo": return <CC.CultivoSection data={filteredData} />;
      case "meteorologia": return <CC.MeteorologiaSection data={filteredData} />;
      case "solo": return <CC.SoloSection data={filteredData} />;
      case "radiacao": return <CC.RadiacaoSection data={filteredData} />;
      case "agua": return <CC.AguaSection data={filteredData} />;
      case "stats": return <CC.EstatisticaSection data={filteredData} />;
      case "modelo": return <CC.ModeloSection data={filteredData} />;
      case "torres": return <CC.TorresSection data={filteredData} />;
      case "relatorio": return <CC.RelatorioSection data={filteredData} />;
      case "producao": return <CC.ProducaoSection />;
      default: return null;
    }
  }

  return (
    <>
      <IntroOverlay hidden={introHidden} />
      <div className="app-shell">
        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)}></div>}
        <Sidebar
          active={activeSection}
          navOpen={navOpen}
          onSelect={(item) => { setActiveSection(item.id); setNavOpen(false); }}
        />
        <Topbar
          activeItem={activeItem}
          status={status}
          onToggleNav={() => setNavOpen(o => !o)}
          datasetId={datasetId}
          onDatasetChange={setDatasetId}
        />
        <main className="content">
          {status === "error" && (
            <div style={{
              margin: "16px 40px 0", padding: "12px 16px", background: "var(--vermelho-100)",
              color: "var(--vermelho-500)", border: "1px solid rgba(179,55,44,.25)",
              borderRadius: "6px", fontSize: 13
            }}>
              Não foi possível carregar automaticamente os dados. Se você abriu este arquivo
              diretamente do disco, sirva a pasta por um servidor local (por exemplo <code>npx serve</code> ou{" "}
              <code>python -m http.server</code>) e recarregue a página — navegadores bloqueiam essa leitura via
              <code>file://</code>.
            </div>
          )}
          {data.hasData && (
            <TemporalFilterBar
              rows={data.normalized}
              filter={timeFilter}
              datasetLabel={data.metadata.datasetLabel}
              onChange={setTimeFilter}
            />
          )}
          <section className="view is-active view-appear" key={activeSection + "|" + datasetId + "|" + JSON.stringify(timeFilter)}>
            {renderSection()}
          </section>
        </main>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
