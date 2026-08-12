# Previsão do Tempo

Aplicação web leve (sem framework e sem build) que mostra as condições atuais de qualquer cidade do mundo, consumindo a API gratuita do [Open-Meteo](https://open-meteo.com/) — **Geocoding API** para converter o nome da cidade em latitude/longitude e **Forecast API** para os dados de clima. A interface se adapta ao período do dia da cidade consultada, alternando entre tema claro e escuro.

Nenhuma chave de API é necessária.

## Funcionalidades

- **Busca por cidade** com validação de entrada (campo vazio, muito curto ou apenas números) e mensagens de erro amigáveis.
- **Previsão para os próximos 5 dias**: cards com dia da semana abreviado (Qui, Sex…), ícone WMO e temperaturas máxima e mínima, em grade responsiva com suporte aos temas claro e escuro.
- **Dados de clima atuais**: temperatura, descrição da condição, umidade relativa, velocidade do vento e sensação térmica, sempre com as unidades devolvidas pela API.
- **Temas dia/noite dinâmicos**: o `<body>` alterna entre `.day-theme` e `.night-theme` de acordo com o campo `is_day` da API (com o horário local como fallback antes da primeira busca).
- **Data por extenso** em pt-BR, no formato `segunda-feira, 13 de outubro de 2025`, baseada no horário local da cidade (`timezone=auto`).
- **Ícones WMO**: os códigos de tempo da OMM são mapeados para os ícones da biblioteca [Weather Icons](https://erikflowers.github.io/weather-icons/), com variantes diurna e noturna.
- **Tratamento de erros** para cidade não encontrada, indisponibilidade do serviço, resposta inválida e falhas de rede/conexão.
- **Layout responsivo** com card arredondado que se reorganiza em telas estreitas.
- **Rodapé com avisos de privacidade e licenciamento**, informando o que é enviado à API e creditando as fontes de dados e ícones.

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
npm test      # roda a suíte completa (28 testes)
```

Outros comandos úteis:

```bash
npm test -- --watch      # re-executa a cada alteração
npm test -- --coverage   # relatório de cobertura
```

A suíte cobre busca de cidade válida (incluindo a renderização do card e a troca de tema), previsão de 5 dias (parâmetros da requisição, máximas/mínimas e renderização do container), cidade inexistente, tratamento de erros da API (rede, status HTTP de erro, JSON inválido, payload sem `current`) e validação de entradas. Todas as chamadas de rede são mockadas, portanto os testes rodam offline.

## Estrutura de pastas

```text
projeto_clima/
├── index.html          # Estrutura da página, IDs consumidos pelo JS e rodapé de privacidade/licenças
├── style.css           # Estilos do card, previsão de 5 dias, rodapé e temas .day-theme/.night-theme
├── api.js              # Consumo da API, validação, formatação, mapa WMO e renderização
├── package.json        # Scripts npm e configuração do Jest (ambiente jsdom)
├── README.md           # Este arquivo
├── LICENSE             # Licença MIT (inglês + tradução em português)
├── NOTICE.md           # Atribuições e créditos de terceiros (Open-Meteo, Weather Icons, Jest, JSDOM)
├── SECURITY_AUDIT.md   # Relatório de auditoria de segurança e privacidade (LGPD/GDPR, XSS, CSP)
└── tests/
    └── api.test.js     # Suíte de testes unitários e de integração com o DOM
```

### O que há em cada arquivo

- **`index.html`** — carrega o CSS da Weather Icons via CDN e define os elementos usados pelo JavaScript: `#search-form`, `#city-input`, `#error-message`, `#loading`, `#weather-card`, `#current-date`, `#city-name`, `#country-name`, `#weather-icon`, `#temperature`, `#description`, `#humidity`, `#wind`, `#feels-like`, `#daily-forecast` e `#forecast-list`. Manter esses IDs é essencial para evitar erros de `null` no JS.
- **`style.css`** — variáveis de tema, card arredondado com desfoque, grade de detalhes e as regras de `.day-theme` / `.night-theme` aplicadas ao `<body>`.
- **`api.js`** — todas as funções documentadas com JSDoc:
  - `validateCity(value)` — valida e normaliza a entrada do usuário;
  - `getCoordinates(city)` — consulta a Geocoding API;
  - `getWeather(latitude, longitude)` — consulta a Forecast API (condições atuais + previsão diária);
  - `renderDailyForecast(weather)` — monta os cards dos próximos 5 dias;
  - `fetchJson(url)` — wrapper de `fetch` que converte falhas em mensagens amigáveis;
  - `formatFullDate(isoTime)` — data por extenso em pt-BR;
  - `getWeatherInfo(code, isDay)` — mapeia o código WMO para descrição e ícone;
  - `renderWeather(place, weather)` / `applyTheme(isDay)` — atualizam o DOM e o tema;
  - `searchCity(value)` — orquestra o fluxo completo da busca;
  - `init(defaultCity)` — inicializa a aplicação (chamada automaticamente no navegador).

  No navegador o arquivo se auto-inicializa; no Node/Jest ele apenas exporta as funções via `module.exports`, sem efeitos colaterais na importação.
- **`tests/api.test.js`** — injeta o `index.html` real no JSDOM e mocka `global.fetch`, validando tanto as funções puras quanto o resultado no DOM.

## Segurança, privacidade e ética de dados

A aplicação foi construída para não tratar nenhum dado pessoal. O relatório completo está em [SECURITY_AUDIT.md](SECURITY_AUDIT.md); em resumo:

- **Sem chaves de API**: as APIs da Open-Meteo são públicas e gratuitas, então não há segredo algum no código client-side.
- **Somente HTTPS**: todos os endpoints (Open-Meteo e CDN dos ícones) são acessados por HTTPS, com hosts fixos em constantes do código.
- **Sem PII, sem cookies, sem armazenamento**: nada de login, geolocalização do dispositivo, cookies, analytics, `localStorage` ou banco de dados. O único dado enviado a terceiros é o nome da cidade digitado, necessário para responder à consulta.
- **Entrada validada e saída escapada**: `validateCity()` valida o texto digitado, `encodeURIComponent`/`URLSearchParams` protegem a URL e toda a renderização usa `textContent` e `document.createElement()` — sem `innerHTML` com dados dinâmicos, o que previne XSS.
- **Transparência (LGPD/GDPR)**: o rodapé informa ao usuário, de forma visível, o que é enviado e que nada é armazenado.
- **Produção**: recomenda-se configurar `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` no servidor — os valores sugeridos estão na seção 6 do relatório de auditoria.

> Ressalva honesta: a Open-Meteo e o CDN dos ícones são serviços de terceiros e podem registrar o IP do visitante em seus próprios logs. Hospedar os ícones localmente e intermediar as chamadas por um proxy próprio elimina esse contato direto.

## Licença e atribuições

- Código sob **licença MIT** — veja [LICENSE](LICENSE) (texto original em inglês e tradução em português).
- Créditos e licenças de terceiros — veja [NOTICE.md](NOTICE.md):
  - **Open-Meteo** — dados meteorológicos sob CC BY 4.0, uso gratuito para fins não comerciais, atribuição obrigatória;
  - **Weather Icons** (Erik Flowers) — SIL OFL 1.1 (fonte) e MIT (código);
  - **Jest** e **JSDOM** — MIT, usados apenas em desenvolvimento.

Ao reutilizar o projeto, mantenha as atribuições do rodapé e o arquivo `NOTICE.md`.

## Referências

- [Open-Meteo — Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- [Open-Meteo — Forecast API](https://open-meteo.com/en/docs)
- [Códigos de tempo WMO](https://open-meteo.com/en/docs#weathervariables)
- [Weather Icons](https://erikflowers.github.io/weather-icons/)
