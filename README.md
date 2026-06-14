# Um Golo · Um Km — Desafio Mundial 2026

Por cada golo marcado no Mundial 2026, o Daniel e o José correm **1 km**.
Este site mostra o número de golos e os km corridos por cada um — e atualiza-se
**sozinho**.

## Como funciona

```
ESPN (golos do Mundial)  ─┐
                          ├──►  GitHub Action (de 30 em 30 min)  ──►  data/data.json  ──►  site
Google Sheets (km)       ─┘
```

- **`scripts/update-data.mjs`** — vai buscar os golos à API pública da ESPN e os
  km às folhas de cálculo do Google, e escreve `data/data.json`. Sem chaves nem
  dependências (Node 20+, `fetch` nativo).
- **`.github/workflows/update-data.yml`** — corre o script a cada 30 min, e faz
  commit do `data.json` se houver novidades.
- **`index.html` + `assets/`** — o painel. Lê o `data.json` e atualiza-se também
  no browser de 5 em 5 min.

A contagem arranca no **primeiro golo do Mundial** (a data é detetada
automaticamente) e o objetivo de cada atleta é igual ao total de golos.

## Pôr a funcionar (uma vez)

1. **Faz merge** desta branch para `main`.
2. **Ativa o GitHub Pages:** *Settings → Pages → Build and deployment →
   Deploy from a branch → `main` / `/ (root)`*. O site fica em
   `https://<utilizador>.github.io/run/`.
3. **Confirma que a folha do Daniel** está partilhada como *"Qualquer pessoa com
   o link pode ver"* (já está, pelo link enviado).
4. Em *Actions*, corre o workflow **"Atualizar dados do desafio"** uma vez
   (botão *Run workflow*) para substituir os dados de exemplo por dados reais.

> Os dados que vêm no repositório são **de exemplo** (marcados como tal no site)
> só para se ver o aspeto. A primeira execução do Action substitui-os pelos reais.

## Adicionar o José

Quando souberes o link da folha dele, edita o `config.json`:

```json
{
  "id": "jose",
  "name": "José",
  "sheet": { "id": "ID_DA_FOLHA_DO_JOSE", "gid": "0", "distanceColumn": null }
}
```

O `id` da folha é a parte do link entre `/d/` e `/edit`.

## Afinações no `config.json`

| Campo | O que faz |
|---|---|
| `challenge.kmPerGoal` | Km por golo (por omissão **1**). |
| `competition.startDate` | Dia a partir do qual se contam golos (`2026-06-11`). |
| `runners[].sheet.gid` | Separador da folha (`0` = primeiro). |
| `runners[].sheet.distanceColumn` | Nome (ou índice) da coluna dos km. `null` = deteta automaticamente. |

### Como são lidos os km

O script exporta a folha em CSV e soma a coluna da distância:

1. usa a coluna indicada em `distanceColumn`, se existir;
2. senão, procura um cabeçalho com *km* / *dist*;
3. senão, usa a coluna com mais valores numéricos.

Aceita vírgula decimal e unidades (ex.: `5,2 km` → `5.2`). Os logs do Action
mostram que coluna foi usada — útil para confirmar.

## Correr localmente

```bash
node scripts/update-data.mjs     # atualiza data/data.json (precisa de internet)
python3 -m http.server 8000      # depois abre http://localhost:8000
```

## Estilo

Layout escuro e editorial, com um acento elétrico e detalhes "de terminal",
inspirado em terminal-industries, siena.film, apple, exoape e collabcapitolium.
