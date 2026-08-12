/* ============================================================
   PROJETO CLIMA — api.js
   Responsável por:
     1. Converter o nome da cidade em coordenadas (lat/lon)
        usando a API de Geocoding do Open-Meteo
     2. Buscar os dados meteorológicos atuais na API de
        Forecast do Open-Meteo, usando essas coordenadas
     3. Atualizar a interface (DOM) com o resultado
     4. Tratar erros (cidade não encontrada, falha de rede, etc.)

   100% GRATUITO e SEM NECESSIDADE DE API KEY.
   Documentação: https://open-meteo.com/
   ============================================================ */

/* ------------------------------------------------------------
   1. CONFIGURAÇÃO DAS APIS (OPEN-METEO)
   ------------------------------------------------------------
   Não é necessário criar conta nem gerar API Key — os
   endpoints abaixo são públicos e gratuitos.
------------------------------------------------------------- */

// API de Geocoding: converte "nome da cidade" -> latitude/longitude
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

// API de Previsão: retorna o clima atual a partir de lat/lon
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/* ------------------------------------------------------------
   2. REFERÊNCIAS AOS ELEMENTOS DO DOM
------------------------------------------------------------- */
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const errorMessage = document.getElementById("errorMessage");
const loader = document.getElementById("loader");
const resultBox = document.getElementById("resultBox");

const weatherIcon = document.getElementById("weatherIcon");
const temperatureEl = document.getElementById("temperature");
const descriptionEl = document.getElementById("description");
const cityNameEl = document.getElementById("cityName");
const countryNameEl = document.getElementById("countryName");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("windSpeed");
const feelsLikeEl = document.getElementById("feelsLike");

/* ------------------------------------------------------------
   3. MAPEAMENTO DE CÓDIGOS DE CLIMA (WMO WEATHER CODES)
   ------------------------------------------------------------
   O Open-Meteo retorna um "weathercode" numérico baseado no
   padrão WMO. Aqui convertemos esse código em:
     - um ícone do Font Awesome
     - uma descrição em português
------------------------------------------------------------- */
const WEATHER_CODE_MAP = {
  0: { icon: "fa-sun", description: "céu limpo" },
  1: { icon: "fa-cloud-sun", description: "predominantemente limpo" },
  2: { icon: "fa-cloud-sun", description: "parcialmente nublado" },
  3: { icon: "fa-cloud", description: "nublado" },
  45: { icon: "fa-smog", description: "névoa" },
  48: { icon: "fa-smog", description: "névoa com geada" },
  51: { icon: "fa-cloud-rain", description: "garoa fraca" },
  53: { icon: "fa-cloud-rain", description: "garoa moderada" },
  55: { icon: "fa-cloud-rain", description: "garoa intensa" },
  56: { icon: "fa-cloud-rain", description: "garoa congelante fraca" },
  57: { icon: "fa-cloud-rain", description: "garoa congelante intensa" },
  61: { icon: "fa-cloud-showers-heavy", description: "chuva fraca" },
  63: { icon: "fa-cloud-showers-heavy", description: "chuva moderada" },
  65: { icon: "fa-cloud-showers-heavy", description: "chuva forte" },
  66: { icon: "fa-cloud-showers-heavy", description: "chuva congelante fraca" },
  67: { icon: "fa-cloud-showers-heavy", description: "chuva congelante forte" },
  71: { icon: "fa-snowflake", description: "neve fraca" },
  73: { icon: "fa-snowflake", description: "neve moderada" },
  75: { icon: "fa-snowflake", description: "neve forte" },
  77: { icon: "fa-snowflake", description: "grãos de neve" },
  80: { icon: "fa-cloud-showers-heavy", description: "pancadas de chuva fracas" },
  81: { icon: "fa-cloud-showers-heavy", description: "pancadas de chuva moderadas" },
  82: { icon: "fa-cloud-showers-heavy", description: "pancadas de chuva violentas" },
  85: { icon: "fa-snowflake", description: "pancadas de neve fracas" },
  86: { icon: "fa-snowflake", description: "pancadas de neve fortes" },
  95: { icon: "fa-bolt", description: "trovoada" },
  96: { icon: "fa-bolt", description: "trovoada com granizo fraco" },
  99: { icon: "fa-bolt", description: "trovoada com granizo forte" },
};

// Retorna o mapeamento do código, com um valor padrão de segurança
function getWeatherInfo(code) {
  return WEATHER_CODE_MAP[code] || { icon: "fa-cloud-sun", description: "condição desconhecida" };
}

/* ------------------------------------------------------------
   4. FUNÇÕES AUXILIARES (UI HELPERS)
------------------------------------------------------------- */

// Exibe/oculta elementos usando a classe utilitária "hidden"
function show(element) {
  element.classList.remove("hidden");
}

function hide(element) {
  element.classList.add("hidden");
}

// Reseta o estado da interface antes de uma nova busca
function resetUI() {
  hide(errorMessage);
  hide(resultBox);
}

/* ------------------------------------------------------------
   5. ETAPA 1 — GEOCODING
   Converte o nome da cidade digitada em latitude/longitude,
   além de retornar o nome "oficial" da cidade e o país.
------------------------------------------------------------- */
async function geocodeCity(city) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(
    city
  )}&count=1&language=pt&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("ERRO_GEOCODING");
  }

  const data = await response.json();

  // Quando a API não encontra nenhum resultado, "results" vem undefined
  if (!data.results || data.results.length === 0) {
    throw new Error("CIDADE_NAO_ENCONTRADA");
  }

  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

/* ------------------------------------------------------------
   6. ETAPA 2 — FORECAST (CLIMA ATUAL)
   Usa lat/lon para buscar temperatura, umidade, vento e
   sensação térmica em tempo real.
------------------------------------------------------------- */
async function fetchCurrentWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    // Campos retornados no bloco "current"
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    timezone: "auto",
  });

  const url = `${FORECAST_URL}?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("ERRO_FORECAST");
  }

  const data = await response.json();
  return data.current;
}

/* ------------------------------------------------------------
   7. FUNÇÃO PRINCIPAL: ORQUESTRA GEOCODING + FORECAST
------------------------------------------------------------- */
async function fetchWeather(city) {
  try {
    // 1) Converte o nome da cidade em coordenadas
    const location = await geocodeCity(city);

    // 2) Busca o clima atual usando essas coordenadas
    const current = await fetchCurrentWeather(location.latitude, location.longitude);

    // 3) Renderiza tudo na tela
    renderWeather(location, current);
  } catch (error) {
    handleError(error);
  } finally {
    hide(loader);
  }
}

/* ------------------------------------------------------------
   8. RENDERIZA OS DADOS NO CARD DE RESULTADO
------------------------------------------------------------- */
function renderWeather(location, current) {
  // Temperatura arredondada (ex: 21°)
  temperatureEl.textContent = Math.round(current.temperature_2m);
  feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}°`;

  // Descrição e ícone a partir do weather_code (padrão WMO)
  const { icon, description } = getWeatherInfo(current.weather_code);
  descriptionEl.textContent = description;
  weatherIcon.className = `weather-icon fa-solid ${icon}`;

  // Cidade e país (retornados pela API de Geocoding)
  cityNameEl.textContent = location.name;
  countryNameEl.textContent = location.country;

  // Umidade e vento (o Open-Meteo já retorna a velocidade em km/h)
  humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  windSpeedEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

  show(resultBox);
}

/* ------------------------------------------------------------
   9. TRATAMENTO DE ERROS
------------------------------------------------------------- */
function handleError(error) {
  console.error("Erro ao buscar clima:", error);

  // Mensagem amigável exibida no card, independente do tipo de erro
  errorMessage.textContent = "Cidade não encontrada. Tente novamente.";
  show(errorMessage);
}

/* ------------------------------------------------------------
   10. EVENTO DE SUBMIT DO FORMULÁRIO
------------------------------------------------------------- */
searchForm.addEventListener("submit", (event) => {
  event.preventDefault(); // evita o reload da página

  const city = cityInput.value.trim();
  if (!city) return;

  resetUI();
  show(loader);

  fetchWeather(city);
});