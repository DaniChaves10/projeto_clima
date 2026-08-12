# Previsão do Tempo

Aplicação web leve (sem framework e sem build) que mostra as condições atuais de qualquer cidade do mundo, consumindo a API gratuita do [Open-Meteo](https://open-meteo.com/) — **Geocoding API** para converter o nome da cidade em latitude/longitude e **Forecast API** para os dados de clima. A interface se adapta ao período do dia da cidade consultada, alternando entre tema claro e escuro.

Nenhuma chave de API é necessária.

## Funcionalidades

- **Busca por cidade** com validação de entrada (campo vazio, muito curto ou apenas números) e mensagens de erro amigáveis.
- **Dados de clima atuais**: temperatura, descrição da condição, umidade relativa, velocidade do vento e sensação térmica, sempre com as unidades devolvidas pela API.
- **Temas dia/noite dinâmicos**: o `<body>` alterna entre `.day-theme` e `.night-theme` de acordo com o campo `is_day` da API (com o horário local como fallback antes da primeira busca).
- **Data por extenso** em pt-BR, no formato `segunda-feira, 13 de outubro de 2025`, baseada no horário local da cidade (`timezone=auto`).
- **Ícones WMO**: os códigos de tempo da OMM são mapeados para os ícones da biblioteca [Weather Icons](https://erikflowers.github.io/weather-icons/), com variantes diurna e noturna.
- **Tratamento de erros** para cidade não encontrada, indisponibilidade do serviço, resposta inválida e falhas de rede/conexão.
- **Layout responsivo** com card arredondado que se reorganiza em telas estreitas.

## Tecnologias utilizadas

| Camada | Tecnologia |
| --- | --- |
| Marcação | HTML5 semântico |
| Estilos | CSS3 (Flexbox, Grid, variáveis CSS, media queries) |
| Lógica | JavaScript ES6+ (`async/await`, `fetch`, módulos CommonJS para testes) |
| Dados | [Open-Meteo](https://open-meteo.com/) — Geocoding API e Forecast API |
| Ícones | [Weather Icons 2.0.12](https://erikflowers.github.io/weather-icons/) via CDN |
| Testes | [Jest 29](https://jestjs.io/) + [JSDOM](https://github.com/jsdom/jsdom) (`jest-environment-jsdom`) |

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior (apenas para rodar os testes).
- Um navegador moderno e conexão com a internet (a aplicação consome o Open-Meteo e o CDN dos ícones).

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd projeto_clima
```

### 2. Executar a aplicação

A aplicação é estática, então basta servir a pasta. Recomenda-se um servidor local em vez de abrir o `index.html` direto pelo `file://`:

```bash
# com Python
python3 -m http.server 8000

# ou com Node
npx serve .
```

Depois acesse <http://localhost:8000> no navegador. Ao abrir, a página já carrega a previsão de São Paulo; use o campo de busca para consultar outra cidade.

> Alternativa no VS Code: extensão **Live Server** → botão _Go Live_.

### 3. Executar os testes

```bash
npm install   # instala Jest e jest-environment-jsdom
npm test      # roda a suíte completa
```

Outros comandos úteis:

```bash
npm test -- --watch      # re-executa a cada alteração
npm test -- --coverage   # relatório de cobertura
```

A suíte cobre busca de cidade válida (incluindo a renderização do card e a troca de tema), cidade inexistente, tratamento de erros da API (rede, status HTTP de erro, JSON inválido, payload sem `current`) e validação de entradas. Todas as chamadas de rede são mockadas, portanto os testes rodam offline.

## Estrutura de pastas

```text
projeto_clima/
├── index.html          # Estrutura da página e todos os IDs consumidos pelo JS
├── style.css           # Estilos do card, layout responsivo e temas .day-theme/.night-theme
├── api.js              # Consumo da API, validação, formatação, mapa WMO e renderização
├── package.json        # Scripts npm e configuração do Jest (ambiente jsdom)
├── README.md           # Este arquivo
└── tests/
    └── api.test.js     # Suíte de testes unitários e de integração com o DOM
```

### O que há em cada arquivo

- **`index.html`** — carrega o CSS da Weather Icons via CDN e define os elementos usados pelo JavaScript: `#search-form`, `#city-input`, `#error-message`, `#loading`, `#weather-card`, `#current-date`, `#city-name`, `#country-name`, `#weather-icon`, `#temperature`, `#description`, `#humidity`, `#wind` e `#feels-like`. Manter esses IDs é essencial para evitar erros de `null` no JS.
- **`style.css`** — variáveis de tema, card arredondado com desfoque, grade de detalhes e as regras de `.day-theme` / `.night-theme` aplicadas ao `<body>`.
- **`api.js`** — todas as funções documentadas com JSDoc:
  - `validateCity(value)` — valida e normaliza a entrada do usuário;
  - `getCoordinates(city)` — consulta a Geocoding API;
  - `getWeather(latitude, longitude)` — consulta a Forecast API;
  - `fetchJson(url)` — wrapper de `fetch` que converte falhas em mensagens amigáveis;
  - `formatFullDate(isoTime)` — data por extenso em pt-BR;
  - `getWeatherInfo(code, isDay)` — mapeia o código WMO para descrição e ícone;
  - `renderWeather(place, weather)` / `applyTheme(isDay)` — atualizam o DOM e o tema;
  - `searchCity(value)` — orquestra o fluxo completo da busca;
  - `init(defaultCity)` — inicializa a aplicação (chamada automaticamente no navegador).

  No navegador o arquivo se auto-inicializa; no Node/Jest ele apenas exporta as funções via `module.exports`, sem efeitos colaterais na importação.
- **`tests/api.test.js`** — injeta o `index.html` real no JSDOM e mocka `global.fetch`, validando tanto as funções puras quanto o resultado no DOM.

## Referências

- [Open-Meteo — Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- [Open-Meteo — Forecast API](https://open-meteo.com/en/docs)
- [Códigos de tempo WMO](https://open-meteo.com/en/docs#weathervariables)
- [Weather Icons](https://erikflowers.github.io/weather-icons/)
