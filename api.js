const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const errorEl = document.getElementById("error-message");
const loadingEl = document.getElementById("loading");
const cardEl = document.getElementById("weather-card");
const dateEl = document.getElementById("current-date");
const cityEl = document.getElementById("city-name");
const countryEl = document.getElementById("country-name");
const iconEl = document.getElementById("weather-icon");
const temperatureEl = document.getElementById("temperature");
const descriptionEl = document.getElementById("description");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const feelsLikeEl = document.getElementById("feels-like");

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

function getWeatherInfo(code, isDay) {
  const info = WMO_CODES[code] || { description: "Condição desconhecida", day: "wi-na", night: "wi-na" };
  return { description: info.description, icon: isDay ? info.day : info.night };
}

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

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  cardEl.hidden = true;
}

function clearError() {
  errorEl.textContent = "";
  errorEl.hidden = true;
}

function setLoading(isLoading) {
  loadingEl.hidden = !isLoading;
}

function applyTheme(isDay) {
  document.body.classList.toggle("day-theme", isDay);
  document.body.classList.toggle("night-theme", !isDay);
}

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

async function getCoordinates(city) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
  const data = await fetchJson(url);
  if (!data.results || data.results.length === 0) {
    throw new Error(`Não encontramos a cidade "${city}". Verifique a grafia e tente novamente.`);
  }
  return data.results[0];
}

async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    timezone: "auto",
  });
  const data = await fetchJson(`${FORECAST_URL}?${params.toString()}`);
  if (!data.current) {
    throw new Error("Os dados de clima não estão disponíveis para esta localidade.");
  }
  return data;
}

function renderWeather(place, weather) {
  const current = weather.current;
  const units = weather.current_units || {};
  const isDay = current.is_day === 1;
  const { description, icon } = getWeatherInfo(current.weather_code, isDay);

  dateEl.textContent = formatFullDate(current.time);
  cityEl.textContent = place.name;
  countryEl.textContent = [place.admin1, place.country].filter(Boolean).join(" - ");
  iconEl.className = `wi ${icon} card__icon`;
  temperatureEl.textContent = `${Math.round(current.temperature_2m)}${units.temperature_2m || "°C"}`;
  descriptionEl.textContent = description;
  humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}${units.relative_humidity_2m || "%"}`;
  windEl.textContent = `${Math.round(current.wind_speed_10m)} ${units.wind_speed_10m || "km/h"}`;
  feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}${units.apparent_temperature || "°C"}`;

  applyTheme(isDay);
  cardEl.hidden = false;
}

async function searchCity(city) {
  clearError();
  setLoading(true);
  try {
    const place = await getCoordinates(city);
    const weather = await getWeather(place.latitude, place.longitude);
    renderWeather(place, weather);
  } catch (error) {
    showError(error.message || "Ocorreu um erro inesperado. Tente novamente.");
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) {
    showError("Digite o nome de uma cidade para buscar a previsão.");
    return;
  }
  searchCity(city);
});

const localHour = new Date().getHours();
applyTheme(localHour >= 6 && localHour < 18);
dateEl.textContent = formatFullDate();
searchCity("São Paulo");
