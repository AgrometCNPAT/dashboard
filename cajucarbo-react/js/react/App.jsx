/* =========================================================
   App.jsx
   Componente raiz: carrega os dados automaticamente (sem
   upload público — a importação de planilhas é restrita ao
   painel administrativo), controla navegação e renderiza a
   seção ativa.
   ========================================================= */

var { useEffect, useMemo, useState } = React;
var CC = window.CajuCarbo;
var { Sidebar, Topbar, IntroOverlay, NAV_ITEMS } = CC;

const EMPTY_DATA = {
  hasData: false,
  normalized: [],
  metadata: { fileName: null, rowCount: 0, columnCount: 0, periodStart: null, periodEnd: null },
  statistics: {},
  variables: { matched: {}, unmatched: [], byGroup: {} },
  towerStatus: { status: null, missingRatio: null, lastTimestamp: null },
};

const DEFAULT_DATASET_ID = CC.CC_DATASETS.find(d => d.status === "available")?.id || CC.CC_DATASETS[0].id;

function App(){
  const [introHidden, setIntroHidden] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [datasetId, setDatasetId] = useState(DEFAULT_DATASET_ID);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [data, setData] = useState(EMPTY_DATA);
  const [periodSelection, setPeriodSelection] = useState({ mode: "all" });
  const [uploadedSource, setUploadedSource] = useState(null);
  const [importError, setImportError] = useState("");

  // ---- Intro: dispensa automaticamente após uma breve abertura ----
  useEffect(() => {
    const t = setTimeout(() => setIntroHidden(true), 2200);
    return () => clearTimeout(t);
  }, []);

  // ---- Carregamento do dataset selecionado no alternador ----
  useEffect(() => {
    let cancelled = false;
    const dataset = CC.CC_DATASETS.find(d => d.id === datasetId);
    if(datasetId === "uploaded" && !uploadedSource) return;
    if(datasetId !== "uploaded" && (!dataset || dataset.status !== "available")) return;

    setStatus("loading");
    async function boot(){
      try{
        const parsed = datasetId === "uploaded" ? uploadedSource : await CC.loadSampleCSV(dataset.path);
        if(!parsed.rows.length) throw new Error("Dataset vazio.");

        const detected = CC.detectVariables(parsed.headers);
        const normBase = CC.normalizeData(parsed.rows, detected.matched);
        const normalized = CC.calculateDerivedVariables(normBase);
        if(!normalized.length) throw new Error("Nenhum registro com variáveis numéricas reconhecidas. Confira os cabeçalhos e os valores do arquivo.");
        const periodIndex = CC.buildPeriodIndex(normalized);
        const periods = CC.getAvailablePeriods(periodIndex);

        const metadata = {
          fileName: parsed.fileName,
          rowCount: parsed.rows.length,
          columnCount: parsed.headers.length,
          periodStart: normalized.find(row => row.timestamp)?.timestamp ?? null,
          periodEnd: normalized.slice().reverse().find(row => row.timestamp)?.timestamp ?? null,
          datasetLabel: datasetId === "uploaded" ? parsed.fileName : dataset.label,
        };

        const allFields = Object.keys(CC.NUMERIC_FIELD_LABELS);
        const { statistics } = CC.calculatePeriodMetrics(normalized, allFields);
        const towerStatus = CC.computeTowerStatus(normalized, CC.CORE_FIELDS_FOR_TOWER);

        if(cancelled) return;
        setData({ hasData: true, normalized, periodIndex, periods, metadata, statistics, variables: detected, towerStatus });
        setStatus("ready");
        setImportError("");
      } catch(err){
        console.error("Falha ao carregar dataset:", err);
        if(!cancelled){
          setStatus("error");
          setImportError(err.message || "Não foi possível processar o arquivo.");
        }
      }
    }
    boot();
    return () => { cancelled = true; };
  }, [datasetId, uploadedSource]);

  useEffect(() => {
    if(!data.periods) return;
    setPeriodSelection(current => CC.normalizePeriodSelection(data.periods, current));
  }, [data.periods]);

  // ---- Reveal-on-scroll a cada troca de seção ----
  useEffect(() => {
    const t = setTimeout(() => CC.initScrollReveal(), 30);
    window.scrollTo({ top: 0 });
    return () => clearTimeout(t);
  }, [activeSection, status]);

  const activeItem = NAV_ITEMS.find(i => i.id === activeSection) || NAV_ITEMS[0];

  const filteredData = useMemo(() => {
    if(!data.hasData || !data.periodIndex) return data;
    const filtered = CC.filterDataByPeriod(data.periodIndex, periodSelection);
    const normalized = filtered.rows;
    const metrics = CC.calculatePeriodMetrics(normalized, Object.keys(CC.NUMERIC_FIELD_LABELS));
    const datedRows = normalized
      .map(row => ({ row, key: CC.getPeriodParts(row)?.dateKey }))
      .filter(entry => entry.key)
      .sort((a,b)=>a.key.localeCompare(b.key));
    return {
      ...data,
      normalized,
      statistics: metrics.statistics,
      periodTotals: metrics.totals,
      selectedPeriod: filtered.selection,
      metadata: {
        ...data.metadata,
        rowCount: normalized.length,
        periodStart: datedRows[0]?.row.timestamp ?? null,
        periodEnd: datedRows[datedRows.length - 1]?.row.timestamp ?? null
      },
      towerStatus: CC.computeTowerStatus(normalized, CC.CORE_FIELDS_FOR_TOWER)
    };
  }, [data, periodSelection]);

  async function handleImportFile(file){
    setImportError("");
    try{
      const parsed = await CC.parseUploadedDataset(file);
      setUploadedSource(parsed);
      setDatasetId("uploaded");
      setPeriodSelection({ mode: "all" });
    } catch(error){
      setImportError(error.message || "Não foi possível importar o arquivo.");
    }
  }

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

  const periodRevision = JSON.stringify([datasetId, periodSelection]);
  const noRowsForPeriod = status === "ready" && activeSection !== "producao"
    && filteredData.hasData && filteredData.normalized.length === 0;

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
          uploadedLabel={uploadedSource?.fileName}
        />
        <main className="content">
          {status === "error" && (
            <div style={{
              margin: "16px 40px 0", padding: "12px 16px", background: "var(--vermelho-100)",
              color: "var(--vermelho-500)", border: "1px solid rgba(179,55,44,.25)",
              borderRadius: "6px", fontSize: 13
            }}>
              {importError || <>Não foi possível carregar automaticamente os dados. Se você abriu este arquivo
                diretamente do disco, sirva a pasta por um servidor local (por exemplo <code>npx serve</code> ou{" "}
                <code>python -m http.server</code>) e recarregue a página — navegadores bloqueiam essa leitura via
                <code>file://</code>.</>}
            </div>
          )}
          {status === "ready" && activeSection !== "producao" && data.periods && (
            <CC.PeriodFilter
              periods={data.periods}
              selection={periodSelection}
              onChange={setPeriodSelection}
              recordCount={filteredData.normalized.length}
            />
          )}
          <section className="view is-active view-appear" key={activeSection + "|" + datasetId}>
            <CC.DataRevisionContext.Provider value={periodRevision}>
              {noRowsForPeriod
                ? <CC.EmptyState title="Nenhum registro neste período" desc="Escolha outro período ou selecione Geral para restaurar todos os registros disponíveis." />
                : renderSection()}
            </CC.DataRevisionContext.Provider>
          </section>
        </main>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
