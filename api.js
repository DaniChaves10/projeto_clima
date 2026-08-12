/**
 * @file Camada de dados e de interface da aplicação de Previsão do Tempo.
 * Consome a Geocoding API e a Forecast API do Open-Meteo, trata os erros de forma
 * amigável e renderiza o resultado no card da página.
 *
 * O módulo funciona tanto no navegador (via `<script src="api.js">`, que dispara
 * {@link init} automaticamente) quanto no Node/Jest (via `require`, sem efeitos colaterais).
 */

/**
 * Endpoint da Geocoding API do Open-Meteo (cidade -> latitude/longitude).
 * @constant {string}
 */
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

/**
 * Endpoint da Forecast API do Open-Meteo (coordenadas -> condições atuais).
 * @constant {string}
 */
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * @typedef {Object} WmoEntry
 * @property {string} description Descrição da condição do tempo em português.
 * @property {string} day Classe da Weather Icons usada durante o dia.
 * @property {string} night Classe da Weather Icons usada durante a noite.
 */

/**
 * @typedef {Object} WeatherInfo
 * @property {string} description Descrição da condição do tempo em português.
 * @property {string} icon Classe da Weather Icons já escolhida conforme dia/noite.
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid Indica se a entrada pode ser enviada à API.
 * @property {string} city Nome da cidade já normalizado (sem espaços nas extremidades).
 * @property {string} message Mensagem de erro amigável, ou string vazia quando válido.
 */

/**
 * @typedef {Object} Place
 * @property {string} name Nome da cidade.
 * @property {number} latitude Latitude em graus decimais.
 * @property {number} longitude Longitude em graus decimais.
 * @property {string} [admin1] Estado/região retornada pelo geocoding.
 * @property {string} [country] País retornado pelo geocoding.
 */

/**
 * @typedef {Object} CurrentWeather
 * @property {string} time Horário local da medição, em ISO 8601.
 * @property {number} temperature_2m Temperatura do ar a 2 m, em °C.
 * @property {number} relative_humidity_2m Umidade relativa, em %.
 * @property {number} apparent_temperature Sensação térmica, em °C.
 * @property {0|1} is_day 1 durante o dia, 0 durante a noite.
 * @property {number} weather_code Código WMO da condição do tempo.
 * @property {number} wind_speed_10m Velocidade do vento a 10 m, em km/h.
 */

/**
 * @typedef {Object} DailyWeather
 * @property {string[]} time Datas dos dias previstos, em `YYYY-MM-DD`.
 * @property {number[]} weather_code Código WMO de cada dia.
 * @property {number[]} temperature_2m_max Temperatura máxima de cada dia, em °C.
 * @property {number[]} temperature_2m_min Temperatura mínima de cada dia, em °C.
 */

/**
 * @typedef {Object} Forecast
 * @property {CurrentWeather} current Condições atuais.
 * @property {Object<string, string>} [current_units] Unidades de cada campo de `current`.
 * @property {DailyWeather} [daily] Previsão diária (arrays paralelos indexados por dia).
 * @property {Object<string, string>} [daily_units] Unidades de cada campo de `daily`.
 */

/**
 * Quantidade de dias futuros exibidos na previsão estendida.
 * @constant {number}
 */
const FORECAST_DAYS = 5;

/**
 * Mapa dos códigos WMO retornados pelo Open-Meteo para descrição em português e
 * ícones da biblioteca Weather Icons (variantes diurna e noturna).
 * @constant {Object<number, WmoEntry>}
 */
const WMO_CODES = {
  0: { description: "Céu limpo", day: "wi-day-sunny", night: "wi-night-clear" },
  1: { description: "Predominantemente limpo", day: "wi-day-sunny-overcast", night: "wi-night-alt-partly-cloudy" },
  2: { description: "Parcialmente nublado", day: "wi-day-cloudy", night: "wi-night-alt-cloudy" },
  3: { description: "Nublado", day: "wi-cloudy", night: "wi-cloudy" },
  45: { description: "Nevoeiro", day: "wi-day-fog", night: "wi-night-fog" },
  48: { description: "Nevoeiro com geada", day: "wi-day-fog", night: "wi-night-fog" },
  51: { description: "Garoa leve", day: "wi-day-sprinkle", night: "wi-night-alt-sprinkle" },
  53: { description: "Garoa moderada", day: "wi-day-sprinkle", night: "wi-night-alt-sprinkle" },
  55: { description: "Garoa intensa", day: "wi-day-sprinkle", night: "wi-night-alt-sprinkle" },
  56: { description: "Garoa congelante leve", day: "wi-day-sleet", night: "wi-night-alt-sleet" },
  57: { description: "Garoa congelante intensa", day: "wi-day-sleet", night: "wi-night-alt-sleet" },
  61: { description: "Chuva fraca", day: "wi-day-rain", night: "wi-night-alt-rain" },
  63: { description: "Chuva moderada", day: "wi-day-rain", night: "wi-night-alt-rain" },
  65: { description: "Chuva forte", day: "wi-rain", night: "wi-rain" },
  66: { description: "Chuva congelante fraca", day: "wi-day-rain-mix", night: "wi-night-alt-rain-mix" },
  67: { description: "Chuva congelante forte", day: "wi-rain-mix", night: "wi-rain-mix" },
  71: { description: "Neve fraca", day: "wi-day-snow", night: "wi-night-alt-snow" },
  73: { description: "Neve moderada", day: "wi-day-snow", night: "wi-night-alt-snow" },
  75: { description: "Neve forte", day: "wi-snow", night: "wi-snow" },
  77: { description: "Grãos de neve", day: "wi-snowflake-cold", night: "wi-snowflake-cold" },
  80: { description: "Pancadas de chuva fracas", day: "wi-day-showers", night: "wi-night-alt-showers" },
  81: { description: "Pancadas de chuva moderadas", day: "wi-day-showers", night: "wi-night-alt-showers" },
  82: { description: "Pancadas de chuva fortes", day: "wi-showers", night: "wi-showers" },
  85: { description: "Pancadas de neve fracas", day: "wi-day-snow", night: "wi-night-alt-snow" },
  86: { description: "Pancadas de neve fortes", day: "wi-snow", night: "wi-snow" },
  95: { description: "Tempestade", day: "wi-day-thunderstorm", night: "wi-night-alt-thunderstorm" },
  96: { description: "Tempestade com granizo leve", day: "wi-day-storm-showers", night: "wi-night-alt-storm-showers" },
  99: { description: "Tempestade com granizo forte", day: "wi-storm-showers", night: "wi-storm-showers" },
};

/**
 * Cache dos elementos do DOM manipulados pela aplicação, preenchido por {@link cacheElements}.
 * @type {Object<string, (HTMLElement|null)>}
 */
const elements = {};

/**
 * Busca no documento todos os elementos usados pela aplicação e os guarda em {@link elements}.
 * Deve ser chamada após o DOM estar disponível; nos testes é chamada a cada `beforeEach`,
 * depois que o `index.html` é injetado no JSDOM.
 *
 * @returns {Object<string, (HTMLElement|null)>} O próprio cache `elements`, já preenchido.
 *   Campos não encontrados no documento ficam com `null`.
 * @example
 * document.body.innerHTML = '<span id="city-name"></span>';
 * const els = cacheElements();
 * els.city.textContent = "São Paulo";
 */
function cacheElements() {
  elements.form = document.getElementById("search-form");
  elements.cityInput = document.getElementById("city-input");
  elements.error = document.getElementById("error-message");
  elements.loading = document.getElementById("loading");
  elements.card = document.getElementById("weather-card");
  elements.date = document.getElementById("current-date");
  elements.city = document.getElementById("city-name");
  elements.country = document.getElementById("country-name");
  elements.icon = document.getElementById("weather-icon");
  elements.temperature = document.getElementById("temperature");
  elements.description = document.getElementById("description");
  elements.humidity = document.getElementById("humidity");
  elements.wind = document.getElementById("wind");
  elements.feelsLike = document.getElementById("feels-like");
  elements.forecast = document.getElementById("daily-forecast");
  elements.forecastList = document.getElementById("forecast-list");
  return elements;
}

/**
 * Valida e normaliza o texto digitado pelo usuário antes de consultar a API.
 * Rejeita valores vazios/somente espaços, com menos de 2 caracteres ou sem nenhuma letra.
 *
 * @param {string|null|undefined} value Texto informado no campo de busca.
 * @returns {ValidationResult} Resultado da validação com a mensagem amigável quando inválido.
 * @example
 * validateCity("  São Paulo "); // { valid: true, city: "São Paulo", message: "" }
 * validateCity("12345").valid;  // false
 */
function validateCity(value) {
  const city = String(value == null ? "" : value).trim();
  if (!city) {
    return { valid: false, city: "", message: "Digite o nome de uma cidade para buscar a previsão." };
  }
  if (city.length < 2) {
    return { valid: false, city, message: "Digite ao menos 2 caracteres para buscar a previsão." };
  }
  if (!/[\p{L}]/u.test(city)) {
    return { valid: false, city, message: "Digite um nome de cidade válido (apenas números não são aceitos)." };
  }
  return { valid: true, city, message: "" };
}

/**
 * Traduz um código WMO para descrição em português e para a classe da Weather Icons
 * correspondente ao período do dia. Códigos desconhecidos caem em um fallback (`wi-na`).
 *
 * @param {number} code Código WMO retornado pelo Open-Meteo (ex.: 0, 61, 95).
 * @param {boolean} isDay `true` para usar o ícone diurno, `false` para o noturno.
 * @returns {WeatherInfo} Descrição e classe do ícone a aplicar no elemento `#weather-icon`.
 * @example
 * getWeatherInfo(95, true);  // { description: "Tempestade", icon: "wi-day-thunderstorm" }
 * getWeatherInfo(999, true); // { description: "Condição desconhecida", icon: "wi-na" }
 */
function getWeatherInfo(code, isDay) {
  const info = WMO_CODES[code] || { description: "Condição desconhecida", day: "wi-na", night: "wi-na" };
  return { description: info.description, icon: isDay ? info.day : info.night };
}

/**
 * Formata uma data por extenso no padrão pt-BR (dia da semana, dia, mês e ano).
 * Sem argumento — ou com uma data inválida — usa a data atual como fallback.
 *
 * @param {string} [isoTime] Data/hora em ISO 8601, normalmente `weather.current.time`.
 * @returns {string} Data por extenso, ex.: `"segunda-feira, 13 de outubro de 2025"`.
 * @example
 * formatFullDate("2025-10-13T10:00"); // "segunda-feira, 13 de outubro de 2025"
 */
function formatFullDate(isoTime) {
  const date = isoTime ? new Date(isoTime) : new Date();
  const valid = !Number.isNaN(date.getTime()) ? date : new Date();
  return valid.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formata uma data ISO como dia da semana abreviado em pt-BR, com a inicial maiúscula
 * e sem o ponto final (ex.: `"Qui"`).
 *
 * @param {string} isoDate Data em ISO 8601, normalmente `weather.daily.time[i]`.
 * @returns {string} Dia da semana abreviado, ou string vazia se a data for inválida.
 * @example
 * formatWeekdayShort("2025-10-16"); // "Qui"
 */
function formatWeekdayShort(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(/\.$/, "");
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

/**
 * Exibe uma mensagem de erro amigável na área `#error-message` e oculta o card do clima.
 * Não faz nada se o elemento de erro ainda não estiver em cache.
 *
 * @param {string} message Mensagem a ser exibida ao usuário.
 * @returns {void}
 * @example
 * showError("Falha de conexão. Verifique sua internet e tente novamente.");
 */
function showError(message) {
  if (!elements.error) return;
  elements.error.textContent = message;
  elements.error.hidden = false;
  if (elements.card) elements.card.hidden = true;
  if (elements.forecast) elements.forecast.hidden = true;
}

/**
 * Limpa e oculta a área de erro, normalmente no início de uma nova busca.
 *
 * @returns {void}
 * @example
 * clearError();
 */
function clearError() {
  if (!elements.error) return;
  elements.error.textContent = "";
  elements.error.hidden = true;
}

/**
 * Alterna a visibilidade do indicador de carregamento `#loading`.
 *
 * @param {boolean} isLoading `true` mostra o indicador, `false` o esconde.
 * @returns {void}
 * @example
 * setLoading(true);
 */
function setLoading(isLoading) {
  if (elements.loading) elements.loading.hidden = !isLoading;
}

/**
 * Aplica o tema visual dinâmico trocando as classes do `<body>` entre
 * `.day-theme` e `.night-theme`.
 *
 * @param {boolean} isDay `true` aplica o tema claro (dia), `false` o tema escuro (noite).
 * @returns {void}
 * @example
 * applyTheme(weather.current.is_day === 1);
 */
function applyTheme(isDay) {
  document.body.classList.toggle("day-theme", isDay);
  document.body.classList.toggle("night-theme", !isDay);
}

/**
 * Executa uma requisição HTTP e devolve o JSON, convertendo qualquer falha
 * (rede, status HTTP de erro ou corpo inválido) em mensagens amigáveis ao usuário.
 *
 * @async
 * @param {string} url URL completa a ser requisitada.
 * @returns {Promise<Object>} Corpo da resposta já convertido em objeto.
 * @throws {Error} `"Falha de conexão..."` quando o `fetch` rejeita (offline/DNS/CORS).
 * @throws {Error} `"O serviço de clima está indisponível..."` quando o status não é 2xx.
 * @throws {Error} `"Não foi possível interpretar a resposta..."` quando o corpo não é JSON válido.
 * @example
 * const data = await fetchJson("https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0");
 */
async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("Falha de conexão. Verifique sua internet e tente novamente.");
  }
  if (!response.ok) {
    throw new Error("O serviço de clima está indisponível no momento. Tente novamente mais tarde.");
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error("Não foi possível interpretar a resposta do serviço de clima.");
  }
}

/**
 * Converte o nome de uma cidade em coordenadas usando a Geocoding API do Open-Meteo.
 * Retorna sempre o primeiro (e mais relevante) resultado.
 *
 * @async
 * @param {string} city Nome da cidade já validado por {@link validateCity}.
 * @returns {Promise<Place>} Local encontrado, com latitude, longitude, estado e país.
 * @throws {Error} `'Não encontramos a cidade "<city>"...'` quando a API não retorna resultados.
 * @throws {Error} Os mesmos erros de rede/serviço propagados por {@link fetchJson}.
 * @example
 * const place = await getCoordinates("São Paulo");
 * console.log(place.latitude, place.longitude); // -23.5475 -46.63611
 */
async function getCoordinates(city) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
  const data = await fetchJson(url);
  if (!data.results || data.results.length === 0) {
    throw new Error(`Não encontramos a cidade "${city}". Verifique a grafia e tente novamente.`);
  }
  return data.results[0];
}

/**
 * Busca as condições atuais e a previsão diária de um ponto geográfico na Forecast API
 * do Open-Meteo (temperatura, umidade, sensação térmica, vento, código WMO, indicador
 * dia/noite e as máximas/mínimas dos próximos dias).
 * O fuso horário é resolvido automaticamente (`timezone=auto`), então `current.time`
 * já vem no horário local da cidade.
 *
 * @async
 * @param {number} latitude Latitude em graus decimais.
 * @param {number} longitude Longitude em graus decimais.
 * @returns {Promise<Forecast>} Resposta da API contendo `current`, `current_units` e `daily`.
 * @throws {Error} `"Os dados de clima não estão disponíveis para esta localidade."`
 *   quando a resposta não traz o bloco `current`.
 * @throws {Error} Os mesmos erros de rede/serviço propagados por {@link fetchJson}.
 * @example
 * const weather = await getWeather(-23.5475, -46.63611);
 * console.log(weather.current.temperature_2m); // 21.4
 */
async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: String(FORECAST_DAYS + 1),
    timezone: "auto",
  });
  const data = await fetchJson(`${FORECAST_URL}?${params.toString()}`);
  if (!data.current) {
    throw new Error("Os dados de clima não estão disponíveis para esta localidade.");
  }
  return data;
}

/**
 * Preenche o card com os dados recebidos, escolhe o ícone WMO conforme dia/noite,
 * aplica o tema correspondente e exibe o card.
 * Requer que {@link cacheElements} já tenha sido executada.
 *
 * @param {Place} place Local retornado pelo geocoding.
 * @param {Forecast} weather Previsão retornada por {@link getWeather}.
 * @returns {void}
 * @example
 * const place = await getCoordinates("São Paulo");
 * renderWeather(place, await getWeather(place.latitude, place.longitude));
 */
function renderWeather(place, weather) {
  const current = weather.current;
  const units = weather.current_units || {};
  const isDay = current.is_day === 1;
  const { description, icon } = getWeatherInfo(current.weather_code, isDay);

  elements.date.textContent = formatFullDate(current.time);
  elements.city.textContent = place.name;
  elements.country.textContent = [place.admin1, place.country].filter(Boolean).join(" - ");
  elements.icon.className = `wi ${icon} card__icon`;
  elements.temperature.textContent = `${Math.round(current.temperature_2m)}${units.temperature_2m || "°C"}`;
  elements.description.textContent = description;
  elements.humidity.textContent = `${Math.round(current.relative_humidity_2m)}${units.relative_humidity_2m || "%"}`;
  elements.wind.textContent = `${Math.round(current.wind_speed_10m)} ${units.wind_speed_10m || "km/h"}`;
  elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}${units.apparent_temperature || "°C"}`;

  applyTheme(isDay);
  elements.card.hidden = false;
}

/**
 * Renderiza os cards da previsão dos próximos dias em `#forecast-list`, ignorando o dia
 * atual e limitando a {@link FORECAST_DAYS} dias. Cada card traz o dia da semana abreviado,
 * o ícone WMO (variante diurna) e as temperaturas máxima e mínima.
 * Oculta o container quando a resposta não traz previsão diária.
 *
 * @param {Forecast} weather Previsão retornada por {@link getWeather}.
 * @returns {number} Quantidade de dias efetivamente renderizados.
 * @example
 * renderDailyForecast(await getWeather(-23.5475, -46.63611)); // 5
 */
function renderDailyForecast(weather) {
  if (!elements.forecast || !elements.forecastList) return 0;

  const daily = weather.daily;
  const units = weather.daily_units || {};
  const unit = units.temperature_2m_max || "°C";
  elements.forecastList.innerHTML = "";

  if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
    elements.forecast.hidden = true;
    return 0;
  }

  const today = weather.current && weather.current.time ? String(weather.current.time).slice(0, 10) : null;
  const days = daily.time
    .map((date, index) => ({
      date,
      code: daily.weather_code ? daily.weather_code[index] : undefined,
      max: daily.temperature_2m_max ? daily.temperature_2m_max[index] : undefined,
      min: daily.temperature_2m_min ? daily.temperature_2m_min[index] : undefined,
    }))
    .filter((day) => day.date !== today)
    .slice(0, FORECAST_DAYS);

  if (days.length === 0) {
    elements.forecast.hidden = true;
    return 0;
  }

  days.forEach((day) => {
    const { description, icon } = getWeatherInfo(day.code, true);

    const item = document.createElement("li");
    item.className = "forecast__item";
    item.dataset.date = day.date;

    const weekday = document.createElement("span");
    weekday.className = "forecast__weekday";
    weekday.textContent = formatWeekdayShort(day.date);

    const iconEl = document.createElement("i");
    iconEl.className = `wi ${icon} forecast__icon`;
    iconEl.title = description;
    iconEl.setAttribute("aria-label", description);

    const temps = document.createElement("p");
    temps.className = "forecast__temps";

    const max = document.createElement("span");
    max.className = "forecast__max";
    max.textContent = `${Math.round(day.max)}${unit}`;

    const min = document.createElement("span");
    min.className = "forecast__min";
    min.textContent = `${Math.round(day.min)}${unit}`;

    temps.append(max, min);
    item.append(weekday, iconEl, temps);
    elements.forecastList.appendChild(item);
  });

  elements.forecast.hidden = false;
  return days.length;
}

/**
 * Fluxo completo da busca: valida a entrada, obtém as coordenadas, busca a previsão
 * e renderiza o card. Nunca rejeita — qualquer falha vira uma mensagem amigável na tela.
 *
 * @async
 * @param {string} value Texto digitado pelo usuário (validado internamente).
 * @returns {Promise<boolean>} `true` quando o card foi renderizado, `false` quando houve erro.
 * @example
 * const ok = await searchCity("Tóquio");
 * if (!ok) console.log("A mensagem de erro já está visível na página.");
 */
async function searchCity(value) {
  const validation = validateCity(value);
  if (!validation.valid) {
    showError(validation.message);
    return false;
  }
  clearError();
  setLoading(true);
  try {
    const place = await getCoordinates(validation.city);
    const weather = await getWeather(place.latitude, place.longitude);
    renderWeather(place, weather);
    renderDailyForecast(weather);
    return true;
  } catch (error) {
    showError(error.message || "Ocorreu um erro inesperado. Tente novamente.");
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Inicializa a aplicação: guarda os elementos do DOM, registra o `submit` do formulário,
 * aplica o tema inicial pelo horário local, exibe a data por extenso e, opcionalmente,
 * faz uma busca inicial. É chamada automaticamente no navegador.
 *
 * @param {?string} [defaultCity="São Paulo"] Cidade carregada ao abrir a página;
 *   passe `null` para não disparar nenhuma busca (usado nos testes).
 * @returns {void}
 * @example
 * init();      // inicializa e já carrega São Paulo
 * init(null);  // inicializa sem busca automática
 */
function init(defaultCity = "São Paulo") {
  cacheElements();
  if (!elements.form) return;

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    searchCity(elements.cityInput ? elements.cityInput.value : "");
  });

  const localHour = new Date().getHours();
  applyTheme(localHour >= 6 && localHour < 18);
  elements.date.textContent = formatFullDate();
  if (defaultCity) searchCity(defaultCity);
}

// No navegador não existe `module`, então a aplicação inicializa sozinha.
if (typeof window !== "undefined" && typeof module === "undefined") {
  init();
}

// No Node/Jest as funções são exportadas sem que nada seja executado na importação.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    WMO_CODES,
    GEOCODING_URL,
    FORECAST_URL,
    FORECAST_DAYS,
    cacheElements,
    validateCity,
    getWeatherInfo,
    formatFullDate,
    formatWeekdayShort,
    fetchJson,
    getCoordinates,
    getWeather,
    renderWeather,
    renderDailyForecast,
    searchCity,
    applyTheme,
    init,
    elements,
  };
}
