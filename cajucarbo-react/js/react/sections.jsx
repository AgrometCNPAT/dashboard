/* =========================================================
   sections.jsx
   As 10 seções do dashboard + Produção Nacional, como componentes.
   — Gráficos limpos, fluidos e altamente informativos para
     análise agronômica e tomada de decisão no campo.
   ========================================================= */

var { useEffect, useRef, useState: useStateS } = React;
var { fmt, PlotlyChart, CountUp, EmptyState, StatRow, BigStat } = window.CajuCarbo;
var NUMERIC_FIELD_LABELS = window.CajuCarbo.NUMERIC_FIELD_LABELS;

function getField(normalized, field){
  return normalized.map(r => r[field]);
}
function onlyNumbers(arr){ return window.CajuCarbo.onlyNumbers(arr); }

function formatScatterMetric(value, decimals=3){
  return value === null || value === undefined || isNaN(value)
    ? "—"
    : Number(value).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function scatterInterpretation(metrics, xLabel, yLabel){
  if(metrics.count < 5 || metrics.r === null) return "Dados insuficientes para interpretar a relação entre as variáveis selecionadas.";
  const direction = metrics.r < 0 ? "Relação inversa" : "Relação direta";
  const magnitude = Math.abs(metrics.r) >= 0.7 ? "forte" : Math.abs(metrics.r) >= 0.4 ? "moderada" : "fraca";
  return `${direction} ${magnitude} entre ${xLabel.toLowerCase()} e ${yLabel.toLowerCase()}.`;
}

function sumField(normalized, field){
  const vals = onlyNumbers(getField(normalized, field));
  return vals.length ? vals.reduce((a,b)=>a+b,0) : null;
}

function isDailySeries(normalized){
  const days = normalized.map(row => row.timestamp?.slice(0, 10)).filter(Boolean);
  return days.length > 0 && new Set(days).size === days.length;
}

function totalPrecipitation(normalized){
  const preferredField = isDailySeries(normalized) ? "tp_mm_dia" : "tp_mm";
  return sumField(normalized, preferredField)
    ?? sumField(normalized, "tp_mm_dia")
    ?? sumField(normalized, "tp_mm");
}

function solarSeries(normalized){
  if(!isDailySeries(normalized)){
    return { values: getField(normalized, "ssrd_wm2"), unit: "W/m²", name: "Radiação Solar Global (SSRD)" };
  }
  return {
    values: getField(normalized, "ssrd_mjm2_dia").map(value => Number(value) * 1000000 / 86400),
    unit: "W/m²",
    name: "Radiação Solar Global (média diária)"
  };
}

function recordLabel(normalized){
  return isDailySeries(normalized) ? "observações diárias" : "observações horárias";
}

function lastValid(normalized, field){
  const vals = onlyNumbers(getField(normalized, field));
  return vals.length ? vals[vals.length-1] : null;
}

function timestamps(normalized){ return normalized.map(r => r.timestamp); }

function formatPeriodRange(meta){
  if(!meta.periodStart || !meta.periodEnd) return "Não identificado nos dados";
  return `${meta.periodStart} — ${meta.periodEnd}`;
}

function locationLabel(normalized){
  const lat = normalized.find(r=>r.latitude!==null)?.latitude;
  const lon = normalized.find(r=>r.longitude!==null)?.longitude;
  if(lat === undefined || lon === undefined) return "Não disponível";
  return `${fmt(lat,3)}, ${fmt(lon,3)}`;
}

/** Componente auxiliar para caixas de contexto agronômico */
function AgroGuide({ title, badge, badgeType="blue", items = [], children }){
  const modifier = badgeType === "green" ? "chart-agro-guide--green" : badgeType === "amber" ? "chart-agro-guide--amber" : "";
  const tagClass = `badge-tag badge-tag--${badgeType}`;
  return (
    <div className={`chart-agro-guide ${modifier}`}>
      <div className="chart-agro-guide__header">
        {badge && <span className={tagClass}>{badge}</span>}
        <span>{title}</span>
      </div>
      {children}
      {items.map((it, idx) => (
        <p key={idx}><strong>{it.label}:</strong> {it.text}</p>
      ))}
    </div>
  );
}

function ChartCaption({ title, text }){
  return (
    <div className="chart-caption">
      <div className="chart-caption__title">{title}</div>
      <div className="chart-caption__text">{text}</div>
    </div>
  );
}

/* =========================== 01 — VISÃO GERAL =========================== */
function OverviewSection({ data }){
  const { hasData, normalized, metadata, statistics, towerStatus } = data;
  const panoramaRef = useRef(null);

  useEffect(() => {
    if(!panoramaRef.current || !window.THREE || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scene = window.CajuCarbo.createParticleNetwork3D(panoramaRef.current, {
      count: 28, color: 0x2E8B57, linkColor: 0x1A5DA6, radius: 5.5, cameraZ: 7
    });
    return () => scene.dispose();
  }, []);

  const towerColor = towerStatus.status === "operacional" ? "var(--verde-700)"
    : towerStatus.status === "atencao" ? "var(--ambar-500)"
    : towerStatus.status === "sem-comunicacao" ? "var(--vermelho-500)"
    : "var(--cinza-400)";

  return (
    <>
      <div className="view-header reveal">
        <div className="eyebrow">CAJUCARBO — INTELIGÊNCIA DE DADOS DO CULTIVO</div>
        <h1>Visão Geral</h1>
        <p>Panorama executivo do monitoramento agrometeorológico e ambiental do projeto CajuCarbo.</p>
      </div>

      <div className="kpi-row reveal">
        <div className="kpi"><div className="kpi__label">STATUS DA PLATAFORMA</div>
          <div className="kpi__value" style={{fontSize:18, color: hasData ? "var(--verde-700)" : "var(--cinza-400)"}}>{hasData ? "Ativa" : "Carregando..."}</div></div>
        <div className="kpi"><div className="kpi__label">PERÍODO DOS DADOS</div>
          <div className="kpi__value" style={{fontSize:15}}>{hasData ? formatPeriodRange(metadata) : "—"}</div></div>
        <div className="kpi"><div className="kpi__label">REGISTROS</div>
          <div className="kpi__value">{hasData ? <CountUp value={metadata.rowCount} /> : "—"}</div></div>
        <div className="kpi"><div className="kpi__label">VARIÁVEIS</div>
          <div className="kpi__value">{hasData ? <CountUp value={metadata.columnCount} /> : "—"}</div></div>
        <div className="kpi"><div className="kpi__label">LOCALIZAÇÃO</div>
          <div className="kpi__value" style={{fontSize:15}}>{hasData ? locationLabel(normalized) : "—"}</div></div>
        <div className="kpi"><div className="kpi__label">STATUS DAS TORRES</div>
          <div className="kpi__value" style={{fontSize:15, color: towerColor}}>{hasData ? window.CajuCarbo.TOWER_STATUS_LABEL[towerStatus.status] : "—"}</div></div>
      </div>

      <div className="panorama reveal">
        <div className="panorama__canvas" ref={panoramaRef}></div>
        <div className="panorama__inner">
          <h2>Panorama ambiental</h2>
          <p>Evolução integrada de temperatura do ar (°C) e umidade relativa (%) ao longo do período monitorado.</p>
          {hasData ? (
            <>
              <PlotlyChart
                className="chart-box tall"
                deps={[metadata.fileName]}
                draw={(node) => window.CajuCarbo.renderTimeSeries(node, timestamps(normalized), [
                  { name: "Temperatura do ar", values: getField(normalized,"t2m_c"), unit: "°C" },
                  { name: "Umidade relativa", values: getField(normalized,"rh"), unit: "%" }
                ], {
                  dualAxis: true,
                  xTitle: "Data / Período de Monitoramento",
                  yTitle: "Temperatura do ar (°C)",
                  y2Title: "Umidade relativa do ar (%)",
                  tickformat: ".1f"
                })}
              />
              <div style={{marginTop:14, padding:14, background:"rgba(255,255,255,0.08)", borderRadius:8, fontSize:12.5, lineHeight:1.5, color:"rgba(255,255,255,0.85)"}}>
                <div style={{fontWeight:700, marginBottom:4, color:"#FFFFFF", textTransform:"uppercase", letterSpacing:"0.04em", fontSize:11.5}}>
                  💡 Interpretação Agrometeorológica do Panorama:
                </div>
                <p style={{margin:"0 0 4px 0", color:"rgba(255,255,255,0.9)"}}>
                  • <strong>Dinâmica Diária Inversa:</strong> A curva azul (Temperatura) e a verde (Umidade) operam em oposição de fase. Nos picos de calor vespertino (13h–15h), a umidade cai para a faixa crítica (&lt; 30%), disparando a demanda evaporativa foliar.
                </p>
                <p style={{margin:0, color:"rgba(255,255,255,0.9)"}}>
                  • <strong>Impacto no Cajueiro:</strong> Períodos com temperatura média entre 24°C e 32°C com umidade acima de 45% favorecem a polinização eficiente e o enchimento da castanha.
                </p>
              </div>
            </>
          ) : (
            <EmptyState title="Carregando dados..." desc="O panorama ambiental é gerado automaticamente a partir dos dados da torre de monitoramento." />
          )}
        </div>
      </div>
    </>
  );
}

/* =========================== 02 — DADOS DO CULTIVO =========================== */
function CultivoSection({ data }){
  const { hasData, normalized, statistics, metadata } = data;
  if(!hasData) return <><Header n="02" t="Dados do Cultivo" d="Localização, temperatura, umidade, vento, precipitação, pressão e solo." /><EmptyState title="Carregando dados..." desc="Aguardando o processamento dos dados da torre." /></>;
  const s = statistics;

  // Cálculo rigoroso de precipitação total a partir das leituras horárias (sem duplicidade diária)
  const totalChuva = totalPrecipitation(normalized);

  return (
    <>
      <Header n="02" t="Dados do Cultivo" d="Parâmetros agrometeorológicos consolidados: temperatura, umidade, ventos, lâmina de chuva e perfil de retenção hídrica no solo." />

      <div className="panel reveal" style={{marginBottom:20}}>
        <div className="panel__title"><h3>Identificação da Área Monitorada</h3></div>
        <table className="data-table">
          <tbody>
            <tr><td>Latitude / Longitude</td><td>{fmt(normalized.find(r=>r.latitude!==null)?.latitude,4)}, {fmt(normalized.find(r=>r.longitude!==null)?.longitude,4)} ({metadata.datasetLabel})</td></tr>
            <tr><td>Período Coberto</td><td>{formatPeriodRange(metadata)}</td></tr>
            <tr><td>Total de Registros Coletados</td><td>{metadata.rowCount.toLocaleString("pt-BR")} {recordLabel(normalized)}</td></tr>
            <tr><td>Precipitação Total Acumulada</td><td>{fmt(totalChuva, 1)} mm</td></tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-2 reveal-stagger" style={{marginBottom:20}}>
        <div className="panel">
          <div className="panel__title"><h3>Temperatura do Ar</h3><span className="meta">°C</span></div>
          <StatRow pairs={[["Média", s.t2m_c_mean?.mean ?? s.t2m_c?.mean],["Mínima", s.t2m_c_min?.min ?? s.t2m_c?.min],["Máxima", s.t2m_c_max?.max ?? s.t2m_c?.max],["Amplitude Diária", s.amplitude_termica?.mean]]} />
          <PlotlyChart draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [{name:"Temperatura do ar", values:getField(normalized,"t2m_c"), unit:"°C"}], {
            xTitle:"Data / Hora do Registro",
            yTitle:"Temperatura do ar (°C)",
            tickformat:".1f"
          })} />
          <AgroGuide title="Leitura Agronômica — Temperatura" badge="Térmico" badgeType="blue" items={[
            { label: "Faixa Ideal para Cajueiro", text: "22°C a 32°C. Promove ótimo desenvolvimento vegetativo e floração contínua." },
            { label: "Ponto de Atenção", text: "Temperaturas > 35°C com ar seco podem induzir abortamento de flores hermafroditas e queima de brotações." }
          ]} />
        </div>

        <div className="panel">
          <div className="panel__title"><h3>Umidade Relativa do Ar</h3><span className="meta">%</span></div>
          <StatRow pairs={[["Média", s.rh_mean?.mean ?? s.rh?.mean],["Mínima", s.rh_min?.min ?? s.rh?.min],["Máxima", s.rh_max?.max ?? s.rh?.max]]} />
          <PlotlyChart draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [{name:"Umidade relativa", values:getField(normalized,"rh"), unit:"%"}], {
            fill:true,
            xTitle:"Data / Hora do Registro",
            yTitle:"Umidade relativa do ar (%)",
            tickformat:".0f"
          })} />
          <AgroGuide title="Leitura Agronômica — Umidade do Ar" badge="Higrometria" badgeType="green" items={[
            { label: "Faixa de Conforto", text: "50% a 70%. Mantém a taxa transpiratória equilibrada sem favorecer patógenos." },
            { label: "Risco Fitossanitário", text: "Umidade > 85% por mais de 8h contínuas cria ambiente propício para antracnose (Colletotrichum gloeosporioides)." }
          ]} />
        </div>
      </div>

      <div className="grid grid-3 reveal-stagger" style={{marginBottom:20}}>
        <div className="panel"><div className="panel__title"><h3>Ponto de Orvalho</h3></div><BigStat value={s.d2m_c?.mean} unit="°C" /></div>
        <div className="panel"><div className="panel__title"><h3>Temperatura da Superfície</h3></div><BigStat value={s.skt_c?.mean} unit="°C" /></div>
        <div className="panel"><div className="panel__title"><h3>Velocidade do Vento</h3></div><BigStat value={s.wind_speed_mean?.mean ?? s.wind_speed?.mean} unit="m/s" /></div>
      </div>

      <div className="grid grid-2 reveal-stagger" style={{marginBottom:20}}>
        <div className="panel">
          <div className="panel__title"><h3>Precipitação Pluviométrica</h3><span className="meta">mm</span></div>
          <StatRow pairs={[["Total Acumulado", totalChuva],["Média Diária", s.tp_mm_dia?.mean ?? s.tp_mm?.mean],["Máxima Diária", s.tp_mm_dia?.max]]} />
          <PlotlyChart draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [{name:"Lâmina de chuva", values: getField(normalized,"tp_mm_dia"), unit:"mm"}], {
            type:"bar",
            xTitle:"Data do Registro",
            yTitle:"Lâmina de Chuva Diária (mm)",
            tickformat:".1f"
          })} />
          <AgroGuide title="Manejo Hídrico — Precipitação" badge="Irrigação" badgeType="blue" items={[
            { label: "Distribuição Hídrica", text: `Acúmulo de ${fmt(totalChuva,1)} mm no período. Eventos concentrados exigem manejo de drenagem e armazenamento.` },
            { label: "Decisão de Campo", text: "Em dias com chuva < 5 mm sob alta radiação, a perda por evaporação direta anula a recarga, exigindo irrigação complementar." }
          ]} />
        </div>

        <div className="panel">
          <div className="panel__title"><h3>Pressão Atmosférica</h3><span className="meta">hPa</span></div>
          <StatRow pairs={[["Média", s.sp_hpa_mean?.mean ?? s.sp_hpa?.mean],["Mínima", s.sp_hpa?.min],["Máxima", s.sp_hpa?.max]]} />
          <PlotlyChart draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [{name:"Pressão atmosférica", values:getField(normalized,"sp_hpa"), unit:"hPa"}], {
            xTitle:"Data / Hora do Registro",
            yTitle:"Pressão Atmosférica (hPa)",
            tickformat:".0f"
          })} />
          <AgroGuide title="Comportamento Barométrico" badge="Atmosfera" badgeType="amber" items={[
            { label: "Padrão Local", text: `Pressão média de ${fmt(s.sp_hpa_mean?.mean ?? s.sp_hpa?.mean, 1)} hPa no período selecionado. Quedas bruscas sinalizam instabilidade e rajadas de vento.` }
          ]} />
        </div>
      </div>

      <div className="panel reveal">
        <div className="panel__title"><h3>Perfil Estratificado de Umidade do Solo</h3><span className="meta">m³/m³ (% volumétrica)</span></div>
        <div className="soil-profile">
          <div className="layers">
            {[
              { key:"swvl1", name:"0 a 7 cm (Superficial)",       desc:"Evaporação direta", val: s.swvl1?.mean },
              { key:"swvl2", name:"7 a 28 cm (Subsuperficial)",   desc:"Raízes finas",      val: s.swvl2?.mean },
              { key:"swvl3", name:"28 a 100 cm (Zona Radicular)", desc:"Raízes efetivas",   val: s.swvl3?.mean },
              { key:"swvl4", name:"100 a 289 cm (Profundo)",      desc:"Reserva do perfil", val: s.swvl4?.mean }
            ].map((layer, i)=>(
              <div key={layer.key} className="soil-layer" style={{background:["#E6F4EA","#CEEAD6","#E8F0FE","#D2E3FC"][i], color:"#1E293B", border:"1px solid rgba(0,0,0,0.05)"}}>
                <div>
                  <div style={{fontWeight:600}}>{layer.name}</div>
                  <div style={{fontSize:11, color:"#64748B"}}>{layer.desc}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="v" style={{fontSize:14, fontWeight:700}}>{fmt(layer.val,3)} <small style={{fontSize:10}}>m³/m³</small></div>
                  <div style={{fontSize:11, color:"#166534", fontWeight:600}}>({fmt((layer.val||0)*100, 1)}%)</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{flex:1}}>
            <PlotlyChart className="chart-box" draw={(n)=>window.CajuCarbo.renderSoilProfile(n, [
              {label:"0 a 7 cm (Superficial)",       value: s.swvl1?.mean ?? 0},
              {label:"7 a 28 cm (Subsuperficial)",   value: s.swvl2?.mean ?? 0},
              {label:"28 a 100 cm (Zona Radicular)", value: s.swvl3?.mean ?? 0},
              {label:"100 a 289 cm (Profundo)",      value: s.swvl4?.mean ?? 0}
            ])} />
          </div>
        </div>
        <AgroGuide title="Diagnóstico Hídrico do Solo — Perfil Físico" badge="Água no Solo" badgeType="green" items={[
          { label: "Zona de Absorção Ativa (28–100 cm)", text: `Maior retenção de água (${fmt(s.swvl3?.mean,3)} m³/m³ ou ${fmt((s.swvl3?.mean||0)*100,1)}%), garantindo suprimento hídrico contínuo para o sistema radicular pivotante e lateral do cajueiro.` },
          { label: "Camada Superficial (0–7 cm)", text: `Média de ${fmt(s.swvl1?.mean,3)} m³/m³ (${fmt((s.swvl1?.mean||0)*100,1)}%). Apresenta alta flutuação térmica e secagem rápida pós-chuva devido à exposição solar.` },
          { label: "Capacidade de Campo de Referência", text: "Para solos franco-arenosos e latossolos típicos da região, a capacidade de campo situa-se entre 0,16 e 0,22 m³/m³." }
        ]} />
      </div>
    </>
  );
}

/* =========================== 03 — METEOROLOGIA =========================== */
function MeteorologiaSection({ data }){
  const { hasData, normalized, statistics } = data;
  const [varA, setVarA] = useStateS("t2m_c");
  const [varB, setVarB] = useStateS("rh");
  if(!hasData) return <><Header n="03" t="Meteorologia" d="Séries temporais, comparação entre variáveis e VPD." /><EmptyState title="Carregando dados..." desc="Aguardando o processamento dos dados." /></>;

  const optsA = ["t2m_c","rh","sp_hpa","wind_speed","d2m_c","tp_mm_dia"];
  const optsB = ["rh","t2m_c","vpd","ssrd_wm2","tp_mm_dia","wind_speed"];
  const scatterX = getField(normalized, varA);
  const scatterY = getField(normalized, varB);
  const scatterXLabel = NUMERIC_FIELD_LABELS[varA];
  const scatterYLabel = NUMERIC_FIELD_LABELS[varB];
  const scatterMetrics = window.CajuCarbo.calculateScatterMetrics(scatterX, scatterY);

  return (
    <>
      <Header n="03" t="Meteorologia" d="Dinâmica das variáveis atmosféricas, correlações pareadas e déficit de pressão de vapor (VPD)." />
      <div className="filters-bar reveal">
        <div className="filter-field"><label>Variável Primária (Eixo Y Esquerdo)</label>
          <select value={varA} onChange={e=>setVarA(e.target.value)}>
            {optsA.map(f=><option key={f} value={f}>{NUMERIC_FIELD_LABELS[f]}</option>)}
          </select>
        </div>
        <div className="filter-field"><label>Variável Secundária (Eixo Y Direito)</label>
          <select value={varB} onChange={e=>setVarB(e.target.value)}>
            {optsB.map(f=><option key={f} value={f}>{NUMERIC_FIELD_LABELS[f]}</option>)}
          </select>
        </div>
      </div>

      <div className="panel reveal" style={{marginBottom:20}}>
        <div className="panel__title"><h3>Evolução Temporal Sincronizada</h3></div>
        <PlotlyChart className="chart-box tall" deps={[varA,varB]} draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [
          { name: NUMERIC_FIELD_LABELS[varA], values: getField(normalized,varA) },
          { name: NUMERIC_FIELD_LABELS[varB], values: getField(normalized,varB) }
        ], {
          dualAxis: true,
          xTitle: "Data / Período de Observação",
          yTitle: NUMERIC_FIELD_LABELS[varA],
          y2Title: NUMERIC_FIELD_LABELS[varB]
        })} />
        <AgroGuide title="Análise Temporal Cruzada" badge="Comportamento" badgeType="blue" items={[
          { label: "Leitura do Gráfico", text: "As duas variáveis são traçadas em escalas independentes para visualização nítida de ciclos diurnos, frentes meteorológicas e correlações sazonais." }
        ]} />
      </div>

      <div className="grid grid-2 reveal-stagger">
        <div className="panel">
          <div className="panel__title"><h3>Dispersão e Tendência Linear</h3><span className="meta">R² / r</span></div>
          <StatRow
            pairs={[["R²", scatterMetrics.r2],["Correlação (r)", scatterMetrics.r],["Observações (n)", scatterMetrics.count]]}
            formatValue={(value, label) => label === "Observações (n)" ? value.toLocaleString("pt-BR") : formatScatterMetric(value)}
          />
          <PlotlyChart className="chart-box" deps={[varA,varB]} draw={(n)=>window.CajuCarbo.renderScatterCompare(n, scatterX, scatterY, scatterXLabel, scatterYLabel, timestamps(normalized))} />
          <AgroGuide title="Ajuste de Regressão Linear" badge="Estatística" badgeType="amber" items={[
            { label: "Interpretação", text: scatterInterpretation(scatterMetrics, scatterXLabel, scatterYLabel) },
            { label: "Indicadores", text: `R² = ${formatScatterMetric(scatterMetrics.r2)} · r = ${formatScatterMetric(scatterMetrics.r)} · n = ${scatterMetrics.count.toLocaleString("pt-BR")}` },
            { label: "Coeficiente de Determinação (R²)", text: "Mede o quanto a variação da variável Y é explicada pela variável X. Os pontos e a reta permanecem disponíveis para análise detalhada." }
          ]} />
        </div>

        <div className="panel">
          <div className="panel__title"><h3>Déficit de Pressão de Vapor (VPD)</h3><span className="meta">kPa</span></div>
          <StatRow pairs={[["Atual", lastValid(normalized,"vpd")],["Média", statistics.vpd?.mean],["Mínimo", statistics.vpd?.min],["Máximo", statistics.vpd?.max]]} />
          <PlotlyChart draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [{name:"VPD (Déficit de Pressão de Vapor)", values:getField(normalized,"vpd"), unit:"kPa"}], {
            fill:true,
            xTitle:"Data / Hora do Registro",
            yTitle:"Déficit de Pressão de Vapor — VPD (kPa)",
            tickformat:".2f"
          })} />
          <AgroGuide title="Fisiologia Foliar — VPD no Cajueiro" badge="Estresse Hídrico" badgeType="green" items={[
            { label: "Faixa Ótima (&lt; 1,2 kPa)", text: "Estômatos totalmente abertos, absorção plena de CO₂ para fotossíntese sem perda hídrica excessiva." },
            { label: "Faixa de Atenção (1,2 a 2,0 kPa)", text: "Início do fechamento estomático preventivo para evitar desidratação." },
            { label: "Estresse Crítico (&gt; 2,0 kPa)", text: "Fechamento estomático severo, paralisação fotossintética e abortamento de flores no pomar." }
          ]} />
        </div>
      </div>
    </>
  );
}

/* =========================== 04 — SOLO =========================== */
function SoloSection({ data }){
  const { hasData, normalized, statistics } = data;
  if(!hasData) return <><Header n="04" t="Solo" d="Perfil de umidade do solo por profundidade." /><EmptyState title="Carregando dados..." desc="Aguardando o processamento dos dados." /></>;
  const s = statistics;

  return (
    <>
      <Header n="04" t="Dinâmica Hídrica do Solo" d="Perfil estratificado de umidade volumétrica nas 4 camadas padronizadas (0 a 289 cm) e respostas temporais a eventos pluviais." />

      <div className="panel reveal" style={{marginBottom:20}}>
        <div className="panel__title"><h3>Perfil Médio de Retenção por Profundidade</h3><span className="meta">θ em m³/m³</span></div>
        <ChartCaption title="Leitura agronômica" text="Cada barra representa a umidade volumétrica volumétrica média do perfil do solo. Quanto maior o valor, maior a água disponível para o sistema radicular em cada horizonte." />
        <PlotlyChart draw={(n)=>window.CajuCarbo.renderSoilProfile(n, [
          {label:"0 a 7 cm (Superficial)",       value: s.swvl1?.mean ?? 0},
          {label:"7 a 28 cm (Subsuperficial)",   value: s.swvl2?.mean ?? 0},
          {label:"28 a 100 cm (Zona Radicular)", value: s.swvl3?.mean ?? 0},
          {label:"100 a 289 cm (Profundo)",      value: s.swvl4?.mean ?? 0}
        ])} />
        <AgroGuide title="Interpretação da Estratificação do Solo" badge="Manejo Hídrico" badgeType="green" items={[
          { label: "0 a 7 cm", text: `Média de ${fmt(s.swvl1?.mean,3)} m³/m³ (${fmt((s.swvl1?.mean||0)*100,1)}%). A camada superficial responde rápido a chuva e evaporação, portanto biometria alta de flutuação.` },
          { label: "7 a 28 cm", text: `Média de ${fmt(s.swvl2?.mean,3)} m³/m³ (${fmt((s.swvl2?.mean||0)*100,1)}%). A zona de transição favorece raízes finas e absorção parcial durante períodos secos.` },
          { label: "28 a 100 cm", text: `Média de ${fmt(s.swvl3?.mean,3)} m³/m³ (${fmt((s.swvl3?.mean||0)*100,1)}%). É o horizonte mais relevante para suprimento contínuo à raiz do cajueiro.` },
          { label: "100 a 289 cm", text: `Média de ${fmt(s.swvl4?.mean,3)} m³/m³ (${fmt((s.swvl4?.mean||0)*100,1)}%). Mantém reserva profunda e amortecimento hídrico durante estiagem.` }
        ]} />
      </div>

      <div className="panel reveal">
        <div className="panel__title"><h3>Evolução Temporal Contínua das 4 Camadas</h3></div>
        <ChartCaption title="Interpretação operacional" text="A resposta da umidade no solo varia com o horizonte: camadas superficiais sobem rápido após chuva e caem em poucos dias; camadas profundas mudam de forma mais lenta e prolongada." />
        <PlotlyChart className="chart-box tall" draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [
          {name:"0 a 7 cm (Superficial)",       values:getField(normalized,"swvl1"), unit:"m³/m³", color:"#68D391"},
          {name:"7 a 28 cm (Subsuperficial)",   values:getField(normalized,"swvl2"), unit:"m³/m³", color:"#38A169"},
          {name:"28 a 100 cm (Zona Radicular)", values:getField(normalized,"swvl3"), unit:"m³/m³", color:"#22543D"},
          {name:"100 a 289 cm (Profundo)",      values:getField(normalized,"swvl4"), unit:"m³/m³", color:"#1A365D"}
        ], {
          xTitle:"Data / período de medição",
          yTitle:"Umidade volumétrica do solo (m³/m³)",
          tickformat:".3f"
        })} />
        <AgroGuide title="Comportamento da Infiltração e Recarga" badge="Dinâmica Temporal" badgeType="blue" items={[
          { label: "Picos pluviais", text: `A camada superficial responde quase imediatamente às chuvas e pode atingir até ${fmt(Math.max(...onlyNumbers(getField(normalized, "swvl1"))), 3)} m³/m³ em eventos intensos.` },
          { label: "Percolação e amortecimento", text: "As camadas subsuperficiais apresentam variações mais lentas e contínuas, indicando infiltração e armazenamento efetivo do perfil do solo." }
        ]} />
      </div>
    </>
  );
}

/* =========================== 05 — RADIAÇÃO E ENERGIA =========================== */
function RadiacaoSection({ data }){
  const { hasData, normalized, statistics } = data;
  if(!hasData) return <><Header n="05" t="Radiação e Energia" d="Radiação solar e térmica." /><EmptyState title="Carregando dados..." desc="Aguardando o processamento dos dados." /></>;
  const s = statistics;
  return (
    <>
      <Header n="05" t="Radiação e Balanço de Energia" d="Irradiância solar global e radiação térmica atmosférica incidente sobre o dossel do cajueiro." />
      <div className="grid grid-3 reveal-stagger" style={{marginBottom:20}}>
        <div className="panel"><div className="panel__title"><h3>Radiação Solar Global</h3></div><BigStat value={s.ssrd_wm2?.mean} unit="W/m²" /></div>
        <div className="panel"><div className="panel__title"><h3>Radiação Solar Diária</h3></div><BigStat value={s.ssrd_mjm2_dia?.mean} unit="MJ/m²" /></div>
        <div className="panel"><div className="panel__title"><h3>Radiação Térmica Atmosférica</h3></div><BigStat value={s.strd_wm2?.mean} unit="W/m²" /></div>
      </div>
      <div className="panel reveal">
        <div className="panel__title"><h3>Evolução da Irradiância Solar e Térmica</h3></div>
        <PlotlyChart className="chart-box tall" draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [
          {name:"Radiação Solar Global (SSRD)", values:getField(normalized,"ssrd_wm2"), unit:"W/m²", color:"#D97706"},
          {name:"Radiação Térmica Atmosférica (STRD)", values:getField(normalized,"strd_wm2"), unit:"W/m²", color:"#1E88E5"}
        ], {
          fill:true,
          xTitle:"Data / Hora do Registro",
          yTitle:"Densidade de Fluxo de Irradiância (W/m²)",
          tickformat:".0f"
        })} />
        <AgroGuide title="Energia Solar e Fotossíntese no Pomar" badge="Radiação PAR" badgeType="amber" items={[
          { label: "Radiação Solar Global (SSRD)", text: "Motor da fotossíntese e da evapotranspiração potencial. Picos ao meio-dia ultrapassam 1.000 W/m² sob céu límpido no semiárido." },
          { label: "Radiação Térmica (STRD)", text: "Radiação de ondas longas emitida pela atmosfera e nuvens, mantendo o balanço térmico noturno e evitando resfriamento excessivo." }
        ]} />
      </div>
    </>
  );
}

/* =========================== 06 — ÁGUA E ORVALHO =========================== */
function AguaSection({ data }){
  const { hasData, normalized, statistics } = data;
  if(!hasData) return <><Header n="06" t="Água e Orvalho" d="Precipitação e ponto de orvalho." /><EmptyState title="Carregando dados..." desc="Aguardando o processamento dos dados." /></>;
  const s = statistics;
  const totalChuva = sumField(normalized, "tp_mm") ?? sumField(normalized, "tp_mm_dia");

  return (
    <>
      <Header n="06" t="Água e Orvalho" d="Balanço hídrico atmosférico, precipitação acumulada e condensação no dossel foliar." />
      <div className="grid grid-2 reveal-stagger">
        <div className="panel">
          <div className="panel__title"><h3>Lâmina de Chuva Diária</h3><span className="meta">mm</span></div>
          <StatRow pairs={[["Total Acumulado", totalChuva],["Média Diária", s.tp_mm_dia?.mean ?? s.tp_mm?.mean],["Máxima Registrada", s.tp_mm_dia?.max ?? s.tp_mm?.max]]} />
          <PlotlyChart draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [{name:"Chuva diária", values:getField(normalized,"tp_mm_dia"), unit:"mm"}], {
            type:"bar",
            xTitle:"Data do Registro",
            yTitle:"Precipitação Diária (mm)",
            tickformat:".1f"
          })} />
          <AgroGuide title="Relevância da Chuva" badge="Recarga" badgeType="blue" items={[
            { label: "Precipitação Acumulada", text: `${fmt(totalChuva,1)} mm acumulados. Chuvas > 10 mm promovem recarga efetiva da zona radicular.` }
          ]} />
        </div>

        <div className="panel">
          <div className="panel__title"><h3>Temperatura do Ponto de Orvalho</h3><span className="meta">°C</span></div>
          <StatRow pairs={[["Média", s.d2m_c?.mean],["Mínimo", s.d2m_c?.min],["Máximo", s.d2m_c?.max]]} />
          <PlotlyChart draw={(n)=>window.CajuCarbo.renderTimeSeries(n, timestamps(normalized), [{name:"Ponto de orvalho", values:getField(normalized,"d2m_c"), unit:"°C"}], {
            xTitle:"Data / Hora do Registro",
            yTitle:"Temperatura de Orvalho (°C)",
            tickformat:".1f"
          })} />
          <AgroGuide title="Formação de Orvalho Noturno" badge="Microclima" badgeType="green" items={[
            { label: "Condensação Foliar", text: "Quando a temperatura da folha atinge o ponto de orvalho durante a madrugada, ocorre molhamento foliar. Fonte hídrica suplementar, mas requer atenção a fungos." }
          ]} />
        </div>
      </div>
    </>
  );
}

/* =========================== 07 — ANÁLISE ESTATÍSTICA =========================== */
function EstatisticaSection({ data }){
  const { hasData, normalized, statistics } = data;
  const fields = ["t2m_c","rh","sp_hpa","wind_speed","tp_mm_dia","vpd"].filter(f => statistics[f]?.count);
  const [statVar, setStatVar] = useStateS(fields[0] || "t2m_c");
  if(!hasData) return <><Header n="07" t="Análise Estatística" d="Estatística descritiva, distribuições e correlação." /><EmptyState title="Carregando dados..." desc="Aguardando o processamento dos dados." /></>;

  const s = statistics;
  const matrix = fields.map(a => fields.map(b => {
    const r = window.CajuCarbo.pearsonCorrelation(getField(normalized,a), getField(normalized,b));
    return r === null ? 0 : +r.toFixed(2);
  }));

  return (
    <>
      <Header n="07" t="Análise Estatística Avançada" d="Estatística descritiva completa, histogramas de distribuição de frequência, boxplots e matriz de correlação de Pearson." />
      <div className="filters-bar reveal">
        <div className="filter-field"><label>Selecionar Variável para Histograma</label>
          <select value={statVar} onChange={e=>setStatVar(e.target.value)}>
            {fields.map(f=><option key={f} value={f}>{NUMERIC_FIELD_LABELS[f]}</option>)}
          </select>
        </div>
      </div>

      <div className="panel reveal" style={{marginBottom:20, overflowX:"auto"}}>
        <div className="panel__title"><h3>Resumo Estatístico Paramétrico e Não-Paramétrico</h3></div>
        <table className="data-table">
          <thead><tr><th>Variável</th><th>Amostras (N)</th><th>Ausentes</th><th>Média</th><th>Mediana</th><th>Desvio Padrão</th><th>Mínimo</th><th>Máximo</th><th>P25 (Q1)</th><th>P75 (Q3)</th></tr></thead>
          <tbody>
            {fields.map(f => { const d = s[f]; return (
              <tr key={f}>
                <td><strong>{NUMERIC_FIELD_LABELS[f]}</strong></td><td>{d.count.toLocaleString("pt-BR")}</td><td>{d.missing}</td>
                <td>{fmt(d.mean,2)}</td><td>{fmt(d.median,2)}</td><td>{fmt(d.stddev,2)}</td>
                <td>{fmt(d.min,2)}</td><td>{fmt(d.max,2)}</td><td>{fmt(d.p25,2)}</td><td>{fmt(d.p75,2)}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      <div className="grid grid-2 reveal-stagger" style={{marginBottom:20}}>
        <div className="panel">
          <div className="panel__title"><h3>Distribuição de Frequência (Histograma)</h3></div>
          <PlotlyChart deps={[statVar]} draw={(n)=>window.CajuCarbo.renderHistogram(n, onlyNumbers(getField(normalized,statVar)), NUMERIC_FIELD_LABELS[statVar])} />
          <AgroGuide title="Análise de Distribuição" badge="Frequência" badgeType="blue" items={[
            { label: "Interpretação", text: `Mostra a concentração de leituras em cada intervalo de ${NUMERIC_FIELD_LABELS[statVar]}, permitindo identificar modas e assimetrias na série.` }
          ]} />
        </div>

        <div className="panel">
          <div className="panel__title"><h3>Boxplot Comparativo (Quartis e Outliers)</h3></div>
          <PlotlyChart draw={(n)=>window.CajuCarbo.renderBoxplot(n, fields.map(f=>({name:NUMERIC_FIELD_LABELS[f].split(" (")[0], values:onlyNumbers(getField(normalized,f))})))} />
          <AgroGuide title="Dispersão Interquartil" badge="Quartis" badgeType="amber" items={[
            { label: "Elementos do Boxplot", text: "Linha central = Mediana; Caixa = 50% dos dados centrais (Q1 a Q3); Hastes = Limites superior/inferior; Pontos soltos = Outliers estatísticos." }
          ]} />
        </div>
      </div>

      <div className="panel reveal">
        <div className="panel__title"><h3>Matriz de Correlação Linear de Pearson</h3></div>
        <PlotlyChart className="chart-box tall" draw={(n)=>window.CajuCarbo.renderCorrelationMatrix(n, fields.map(f=>NUMERIC_FIELD_LABELS[f].split(" (")[0]), matrix)} />
        <div className="corr-scale"><span>-1,00 (Inversa Forte)</span><div className="bar"></div><span>+1,00 (Direta Forte)</span></div>
        <AgroGuide title="Interpretação da Matriz de Correlação" badge="Pearson r" badgeType="green" items={[
          { label: "Valores Próximos a +1,0 (Verde)", text: "Forte correlação direta: quando uma variável cresce, a outra tende a crescer proporcionalmente." },
          { label: "Valores Próximos a -1,0 (Vermelho)", text: "Forte correlação inversa (ex: Temperatura vs Umidade Relativa: r = -0,85)." }
        ]} />
      </div>
    </>
  );
}

/* =========================== 08 — MODELO DE DADOS =========================== */
function ModeloSection({ data }){
  const { hasData, variables } = data;
  const byGroup = hasData ? variables.byGroup : {};
  const groups = [
    { key:"TEMPERATURA", label:"Temperatura" }, { key:"UMIDADE", label:"Umidade" },
    { key:"SOLO", label:"Solo" }, { key:"RADIACAO", label:"Radiação" },
    { key:"PRECIPITACAO", label:"Precipitação" }, { key:"VENTO", label:"Vento" },
    { key:"PRESSAO", label:"Pressão" },
  ];
  return (
    <>
      <Header n="08" t="Modelos de Dados" d="Estrutura e relação entre os grupos de variáveis identificados no pipeline CajuCarbo." />
      <div className="var-model-grid reveal-stagger">
        {groups.map(g => (
          <div key={g.key} className="var-model-card">
            <div className="n">{hasData ? (byGroup[g.key]||0) : "—"}</div>
            <div className="l">{g.label}</div>
          </div>
        ))}
        <div className="var-model-card"><div className="n">{hasData ? "2" : "—"}</div><div className="l">Dados derivados (VPD, amplitude)</div></div>
      </div>
      <div className="panel reveal" style={{marginTop:20}}>
        <div className="panel__title"><h3>Estrutura do Modelo de Dados</h3></div>
        <ModelDiagram active={hasData} />
      </div>
    </>
  );
}

function ModelDiagram({ active }){
  return (
    <svg viewBox="0 0 900 320" width="100%" className="model-diagram" style={{opacity: active ? 1 : 0.35, transition:"opacity .5s"}}>
      <g fontFamily="Inter, Arial" fontSize="12" fill="#5B6472">
        <rect x="20" y="20" width="220" height="42" rx="6" fill="#E7EEF7" stroke="#013B7A"/>
        <text x="130" y="45" textAnchor="middle" fill="#013B7A" fontWeight="700">DADOS METEOROLÓGICOS</text>
        <rect x="20" y="130" width="220" height="42" rx="6" fill="#E5F3EA" stroke="#00693C"/>
        <text x="130" y="155" textAnchor="middle" fill="#00693C" fontWeight="700">DADOS DO SOLO</text>
        <rect x="20" y="240" width="220" height="42" rx="6" fill="#FBF1DE" stroke="#C98A1F"/>
        <text x="130" y="265" textAnchor="middle" fill="#C98A1F" fontWeight="700">DADOS DERIVADOS</text>
        <rect x="340" y="20" width="200" height="252" rx="6" fill="none" stroke="#DEE2E8"/>
        <text x="440" y="44" textAnchor="middle" fontWeight="700" fill="#2B3140">Variáveis</text>
        <text x="440" y="72" textAnchor="middle">Temperatura · Umidade</text>
        <text x="440" y="92" textAnchor="middle">Pressão · Vento</text>
        <text x="440" y="112" textAnchor="middle">Radiação · Precipitação</text>
        <text x="440" y="150" textAnchor="middle">Umidade do solo</text>
        <text x="440" y="170" textAnchor="middle">Temperatura · Fluxos</text>
        <text x="440" y="208" textAnchor="middle">VPD</text>
        <text x="440" y="228" textAnchor="middle">Amplitude térmica</text>
        <text x="440" y="248" textAnchor="middle">Médias · Tendências</text>
        <rect x="640" y="110" width="220" height="70" rx="6" fill="#001B3D"/>
        <text x="750" y="140" textAnchor="middle" fill="#FFFFFF" fontWeight="700">MODELO INTERNO</text>
        <text x="750" y="160" textAnchor="middle" fill="rgba(255,255,255,.6)" fontSize="11">normalizedData</text>
        <path className="data-beam" d="M240,41 C 300,41 300,145 340,145" stroke="#013B7A" fill="none"/>
        <path className="data-beam" d="M240,151 C 300,151 300,151 340,151" stroke="#00693C" fill="none"/>
        <path className="data-beam" d="M240,261 C 300,261 300,157 340,157" stroke="#C98A1F" fill="none"/>
        <path className="data-beam" d="M540,145 C 590,145 590,145 640,145" stroke="#1A5DA6" fill="none"/>
      </g>
    </svg>
  );
}

/* =========================================================
   09 — TORRES DE CAMPO (3D)
   =========================================================== */
function TorresSection({ data }){
  const { hasData, metadata, towerStatus } = data;
  const stageRef = useRef(null);
  const sceneHandle = useRef(null);

  useEffect(() => {
    if(!stageRef.current) return;
    sceneHandle.current = window.CajuCarbo.createTowerScene(stageRef.current, towerStatus.status || "operacional");
    return () => { if(sceneHandle.current) sceneHandle.current.dispose(); sceneHandle.current = null; };
  }, []);

  useEffect(() => {
    if(sceneHandle.current && towerStatus.status) sceneHandle.current.updateStatus(towerStatus.status);
  }, [towerStatus.status]);

  return (
    <>
      <Header n="09" t="Torres de Campo" d="Pontos de monitoramento instalados em campo e status real de telemetria, em modelo 3D interativo." />
      <div className="tower-section reveal">
        <div className="tower-stage" ref={stageRef}></div>
        <div className="tower-info">
          <h3>Torre Agrometeorológica — Campo Monitorado</h3>
          <p>Estação micrometeorológica e sensores de solo instalados na área experimental do projeto CajuCarbo, com transmissão contínua de parâmetros ambientais.</p>
          {hasData ? (
            <>
              <div className={"tower-status-row status-" + towerStatus.status}><span className="dot"></span> {window.CajuCarbo.TOWER_STATUS_LABEL[towerStatus.status]}</div>
              <div className="tower-mini-stats">
                <div><div className="v">{fmt((1-towerStatus.missingRatio)*100,0)}%</div><div className="l">Completude dos dados</div></div>
                <div><div className="v">{metadata.rowCount.toLocaleString("pt-BR")}</div><div className="l">Registros recebidos</div></div>
                <div><div className="v">{towerStatus.lastTimestamp ?? "—"}</div><div className="l">Última leitura</div></div>
              </div>
            </>
          ) : <p style={{color:"rgba(255,255,255,.4)", fontSize:13}}>Calculando status a partir dos dados recebidos...</p>}
        </div>
      </div>
      <div className="section-divider"></div>
      <div className="panel reveal">
        <div className="panel__title"><h3>Histórico Operacional da Estação</h3></div>
        {hasData ? <ObservatoryTimeline data={data} /> : <EmptyState title="Sem histórico disponível" desc="A linha do tempo é construída a partir dos dados carregados." />}
      </div>
    </>
  );
}

function ObservatoryTimeline({ data }){
  const { metadata: m, towerStatus: t } = data;
  return (
    <div className="observatory-timeline">
      <div className="observatory-event">
        <div className="date">{m.periodStart ?? "Início"}</div>
        <div className="title">Início do Período Monitorado</div>
        <div className="desc">Primeiro registro validado no conjunto de dados importado.</div>
      </div>
      <div className="observatory-event">
        <div className="date">Ao Longo do Período</div>
        <div className="title">{m.rowCount.toLocaleString("pt-BR")} Leituras Processadas</div>
        <div className="desc">Índice de completude de {fmt((1-t.missingRatio)*100,0)}% nas variáveis centrais de balanço hídrico e atmosférico.</div>
      </div>
      <div className="observatory-event">
        <div className="date">{m.periodEnd ?? "Fim"}</div>
        <div className="title">Última Leitura Disponível</div>
        <div className="desc">Status operacional classificado como "{window.CajuCarbo.TOWER_STATUS_LABEL[t.status]}".</div>
      </div>
    </div>
  );
}

/* =========================== 10 — RELATÓRIO =========================== */
function RelatorioSection({ data }){
  const { hasData, statistics: s, metadata: m, towerStatus: t, normalized } = data;
  if(!hasData) return <><Header n="10" t="Relatório de Análise" d="Resumo automático gerado a partir dos dados carregados." /><EmptyState title="Carregando dados..." desc="Aguardando o processamento dos dados." /></>;

  const totalChuva = sumField(normalized, "tp_mm") ?? sumField(normalized, "tp_mm_dia");

  return (
    <>
      <Header n="10" t="Relatório Agrometeorológico Executivo" d="Síntese consolidada dos indicadores ambientais, hídricos e microclimáticos da área monitorada." />
      <div className="panel reveal">
        <div className="panel__title"><h3>Resumo Executivo do Cultivo</h3><span className="meta">Base de Dados ERA5-Land / {metadata.datasetLabel}</span></div>
        <table className="data-table">
          <tbody>
            <tr><td>Arquivo de Origem</td><td><strong>{m.fileName}</strong></td></tr>
            <tr><td>Período Analisado</td><td>{formatPeriodRange(m)}</td></tr>
            <tr><td>Total de Leituras Horárias</td><td>{m.rowCount.toLocaleString("pt-BR")} observações</td></tr>
            <tr><td>Variáveis Monitoradas</td><td>{m.columnCount} colunas</td></tr>
            <tr><td>Temperatura Média do Ar</td><td><strong>{fmt(s.t2m_c?.mean)} °C</strong> (Mínima: {fmt(s.t2m_c?.min)} °C / Máxima: {fmt(s.t2m_c?.max)} °C)</td></tr>
            <tr><td>Umidade Relativa Média</td><td><strong>{fmt(s.rh?.mean)} %</strong> (Mínima: {fmt(s.rh?.min)} % / Máxima: {fmt(s.rh?.max)} %)</td></tr>
            <tr><td>Precipitação Total Acumulada</td><td><strong>{fmt(totalChuva, 1)} mm</strong> (Média diária: {fmt(s.tp_mm_dia?.mean, 2)} mm/dia)</td></tr>
            <tr><td>Umidade do Solo — Superficial (0–7 cm)</td><td><strong>{fmt(s.swvl1?.mean,3)} m³/m³ ({fmt((s.swvl1?.mean||0)*100, 1)}%)</strong></td></tr>
            <tr><td>Umidade do Solo — Zona Radicular (28–100 cm)</td><td><strong>{fmt(s.swvl3?.mean,3)} m³/m³ ({fmt((s.swvl3?.mean||0)*100, 1)}%)</strong></td></tr>
            <tr><td>Radiação Solar Média</td><td><strong>{fmt(s.ssrd_wm2?.mean)} W/m²</strong></td></tr>
            <tr><td>Velocidade Média do Vento</td><td><strong>{fmt(s.wind_speed?.mean)} m/s</strong></td></tr>
            <tr><td>Status da Telemetria</td><td><span style={{color:"var(--verde-700)", fontWeight:700}}>{window.CajuCarbo.TOWER_STATUS_LABEL[t.status]}</span> (Completude: {fmt((1-t.missingRatio)*100,0)}%)</td></tr>
          </tbody>
        </table>
        <p style={{marginTop:16, fontSize:12.5, color:"var(--cinza-400)"}}>A exportação para PDF e a importação de novas planilhas ficam disponíveis no painel administrativo da plataforma CajuCarbo.</p>
        <button className="btn" disabled title="Disponível no painel administrativo">Exportar Relatório PDF</button>
      </div>
    </>
  );
}

/* =========================== PRODUÇÃO NACIONAL =========================== */
function ProducaoSection(){
  const items = [
    ["1_panorama_nacional_2024.html", "Panorama Nacional da Castanha de Caju (2024)"],
    ["2_evolucao_producao.html", "Evolução Histórica da Produção (Toneladas)"],
    ["3_evolucao_area.html", "Evolução da Área Plantada e Colhida (Hectares)"],
    ["4_evolucao_rendimento.html", "Evolução do Rendimento Médio (kg/ha)"],
    ["5_ceara_serie_temporal.html", "Ceará — Série Temporal e Dinâmica Produtiva"],
    ["6_ceara_vs_brasil_producao.html", "Participação Ceará vs. Brasil — Produção"],
    ["7_ceara_vs_brasil_area.html", "Participação Ceará vs. Brasil — Área"],
    ["8_ceara_vs_brasil_rendimento.html", "Comparativo Ceará vs. Brasil — Rendimento"],
  ];
  return (
    <>
      <Header n="▤" t="Produção Nacional de Castanha de Caju" d="Painéis analíticos da produção agrícola brasileira e cearense (dados IBGE/PAM), contextualizando o impacto socioeconômico da cultura." />
      <div className="grid grid-2 reveal-stagger">
        {items.map(([file, title]) => (
          <div className="panel" key={file}>
            <div className="panel__title"><h3>{title}</h3></div>
            <iframe src={"../" + file} className="embed-frame" title={title}></iframe>
          </div>
        ))}
      </div>
      <div className="panel reveal" style={{marginTop:20}}>
        <div className="panel__title"><h3>Produção Municipal no Ceará — 2024</h3></div>
        <iframe src="../9_municipios_ceara_2024.html" className="embed-frame tall" title="Municípios do Ceará"></iframe>
      </div>
    </>
  );
}

/* ---- Cabeçalho de seção reutilizável ---- */
function Header({ n, t, d }){
  return (
    <div className="view-header reveal">
      <div className="eyebrow">SEÇÃO {n}</div>
      <h1>{t}</h1>
      <p>{d}</p>
    </div>
  );
}

window.CajuCarbo = window.CajuCarbo || {};
Object.assign(window.CajuCarbo, {
  OverviewSection, CultivoSection, MeteorologiaSection, SoloSection, RadiacaoSection,
  AguaSection, EstatisticaSection, ModeloSection, TorresSection, RelatorioSection, ProducaoSection
});
