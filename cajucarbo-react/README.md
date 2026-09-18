# CajuCarbo — Data Intelligence Platform (React)

Plataforma científica de visualização de dados ambientais do projeto CajuCarbo (Embrapa), em **React 18** (via CDN, sem etapa de build), com **Three.js** para a torre de monitoramento 3D e o campo de partículas de abertura, e **Plotly.js** para os gráficos.

## Como executar

Este site faz requisições (`fetch`) para carregar o CSV de exemplo e usa `iframe` para os painéis de produção nacional. Por segurança, os navegadores bloqueiam esse tipo de leitura quando o arquivo é aberto diretamente do disco (`file://`). Por isso, sirva a pasta por um servidor local simples:

```bash
# opção 1 — Node
npx serve .

# opção 2 — Python
python -m http.server 8080
```

Depois acesse `http://localhost:8080` (ou a porta indicada) no navegador.

## O que muda em relação à versão anterior

- **Alternador de fonte de dados** no topo do site: troca qual planilha alimenta o dashboard entre as torres de **Petrolina** e **Pacajus**. As médias, amostras visuais, estatísticas e gráficos são recalculados para a fonte selecionada. Detalhes em `ALTERNADOR_DE_DADOS.md`.
- **Logo da CajuCarbo** aplicada na navegação lateral, na tela de abertura e como favicon (`../brand/cajucarbo-logo.png`).
- **Responsivo e cross-device**: menu lateral virou um drawer com fundo escurecido no mobile, barra superior reorganizada para telas pequenas, e os canvases 3D recalculam tamanho ao redimensionar.
- **Pronto para hospedar no GitHub Pages**: um workflow de GitHub Pages já configurado — veja `DEPLOY.md`.
- **Sem botão de importação de planilhas.** O carregamento de dados (Excel/CSV) deixou de ser uma ação do usuário público — a importação de novas planilhas fica reservada a um futuro **painel administrativo**, fora desta interface.
- **Reescrito em React**, com componentes por seção (`js/react/*.jsx`) e um estado único de dados (`normalized`, `statistics`, `metadata`, `towerStatus`) que alimenta todos os gráficos.
- **Torre de campo em 3D real** (Three.js): mastro, treliça, módulos de sensores com pulso, feixes de dados animados até o nó da plataforma, e câmera com rotação automática e controle por arraste (OrbitControls). É montada somente quando a seção "Torres de Campo" está ativa e é descartada (dispose) ao sair da seção, evitando vazamento de memória.
- **Abertura e "Panorama ambiental" em 3D**: rede de partículas conectadas, renderizada com Three.js, com movimento suave e reconstrução periódica das ligações.

## Estrutura

```
index.html              → build final (JSX já embutido, ver observação abaixo)
index.template.html     → template usado para gerar o index.html
css/                     → estilos (tokens institucionais Embrapa, dashboard, animações, responsivo)
js/lib/                  → lógica pura (sem JSX): normalização, estatística, gráficos, cena 3D da torre,
                           partículas 3D, status da torre, carregador do CSV de exemplo
js/react/                → componentes React "fonte" (App.jsx, sections.jsx, common.jsx)
../brand/                → logo da CajuCarbo
../sample-data/          → CSV ambiental de demonstração (ERA5 — Petrolina)
../*.html                → painéis Plotly pré-renderizados de produção nacional de castanha de caju
```

> **Nota sobre o JSX:** os componentes React "de verdade" vivem em `js/react/*.jsx`. Como o Babel standalone
> não consegue buscar arquivos `.jsx` externos quando o site é aberto via `file://`, o `index.html` final
> contém uma cópia desse mesmo código embutida diretamente em tags `<script type="text/babel">`. Ao editar
> a lógica, altere os arquivos em `js/react/` e gere novamente o `index.html` a partir do `index.template.html`
> (substituindo os marcadores `__COMMON_JSX__`, `__SECTIONS_JSX__` e `__APP_JSX__` pelo conteúdo de cada arquivo).
> Em uma etapa futura, isso pode virar um build real (Vite/webpack) com um pipeline de CI.
