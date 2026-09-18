# Alternador de fonte de dados

No topo do site existe um seletor **"Fonte de dados"** que troca qual planilha alimenta todo o dashboard. Hoje ele lê a lista de `js/lib/datasets.js`:

```js
const CC_DATASETS = [
  {
    id: "petrolina",
    label: "Petrolina — PE",
    subtitle: "ERA5-Land · Torre de campo",
    path: "../sample-data/era5_land_Petrolina_completo.csv",
    status: "available",
  },
  {
    id: "pacajus",
    label: "Pacajus — CE",
    subtitle: "ERA5-Land · Torre de campo",
    path: "../sample-data/era5_land_Pacajus_completo.csv",
    status: "available",
  },
];
```

- **`status: "available"`** → aparece habilitado no seletor e pode ser escolhido.
- **`status: "coming-soon"`** → aparece no seletor, mas desabilitado ("em breve"), até que exista um CSV real.

## Como publicar uma nova torre/localização

1. Coloque o CSV real da nova torre em `../sample-data/` (mesmas colunas que o pipeline já reconhece — veja `js/lib/data-normalizer.js`/`variableMapping` para os nomes aceitos).
2. Em `js/lib/datasets.js`, mude o `status` da entrada correspondente para `"available"` e aponte `path` para o arquivo.
3. Regenere o `index.html` a partir do `index.template.html` (o JSX é embutido nele — veja o README) ou, se estiver rodando um build futuro, apenas publique normalmente.

## Próximo passo natural: painel administrativo

Hoje esse arquivo é editado manualmente. A ideia é que, futuramente, um painel administrativo:
- faça upload da planilha,
- rode a mesma detecção de variáveis que já existe (`detectVariables`) para conferir a estrutura antes de publicar,
- e escreva a entrada em `datasets.js` (ou em um banco de dados / API, numa versão com backend) automaticamente — sem exigir editar código à mão.

Esse fluxo de importação (que existia como botão público em uma versão anterior do site) já está pronto e testado; só precisa ser movido para trás de autenticação de administrador em vez de ficar exposto ao público.
