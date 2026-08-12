const fs = require("fs");
const path = require("path");

const api = require("../api.js");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

const SAO_PAULO = {
  name: "São Paulo",
  admin1: "São Paulo",
  country: "Brasil",
  latitude: -23.5475,
  longitude: -46.63611,
};

const FORECAST = {
  current_units: {
    temperature_2m: "°C",
    relative_humidity_2m: "%",
    wind_speed_10m: "km/h",
    apparent_temperature: "°C",
  },
  current: {
    time: "2025-10-13T10:00",
    temperature_2m: 21.4,
    relative_humidity_2m: 67,
    apparent_temperature: 23.8,
    is_day: 1,
    weather_code: 0,
    wind_speed_10m: 5.2,
  },
};

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function mockFetchSequence(...responses) {
  const fetchMock = jest.fn();
  responses.forEach((response) => {
    if (response instanceof Error) {
      fetchMock.mockRejectedValueOnce(response);
    } else {
      fetchMock.mockResolvedValueOnce(response);
    }
  });
  global.fetch = fetchMock;
  return fetchMock;
}

beforeEach(() => {
  document.documentElement.innerHTML = html;
  api.cacheElements();
  jest.restoreAllMocks();
});

afterEach(() => {
  delete global.fetch;
});

describe("validateCity", () => {
  it("rejeita entrada vazia ou só com espaços", () => {
    expect(api.validateCity("")).toMatchObject({ valid: false });
    expect(api.validateCity("    ").message).toBe("Digite o nome de uma cidade para buscar a previsão.");
  });

  it("rejeita entrada nula ou indefinida", () => {
    expect(api.validateCity(null).valid).toBe(false);
    expect(api.validateCity(undefined).valid).toBe(false);
  });

  it("rejeita entrada com menos de 2 caracteres", () => {
    expect(api.validateCity("a")).toMatchObject({
      valid: false,
      message: "Digite ao menos 2 caracteres para buscar a previsão.",
    });
  });

  it("rejeita entrada sem nenhuma letra", () => {
    expect(api.validateCity("12345").message).toBe(
      "Digite um nome de cidade válido (apenas números não são aceitos)."
    );
  });

  it("aceita nome válido e remove espaços nas extremidades", () => {
    expect(api.validateCity("  São Paulo  ")).toEqual({ valid: true, city: "São Paulo", message: "" });
  });

  it("não chama a API quando a entrada é inválida", async () => {
    const fetchMock = mockFetchSequence();
    const result = await api.searchCity("   ");

    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById("error-message").hidden).toBe(false);
    expect(document.getElementById("weather-card").hidden).toBe(true);
  });
});

describe("busca de cidade válida", () => {
  it("consulta o geocoding e retorna o primeiro resultado", async () => {
    const fetchMock = mockFetchSequence(jsonResponse({ results: [SAO_PAULO] }));
    const place = await api.getCoordinates("São Paulo");

    expect(place).toEqual(SAO_PAULO);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(api.GEOCODING_URL);
    expect(fetchMock.mock.calls[0][0]).toContain(`name=${encodeURIComponent("São Paulo")}`);
  });

  it("consulta a previsão com as coordenadas informadas", async () => {
    const fetchMock = mockFetchSequence(jsonResponse(FORECAST));
    const weather = await api.getWeather(SAO_PAULO.latitude, SAO_PAULO.longitude);

    expect(weather.current.temperature_2m).toBe(21.4);
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain(api.FORECAST_URL);
    expect(url).toContain(`latitude=${encodeURIComponent(SAO_PAULO.latitude)}`);
    expect(url).toContain(`longitude=${encodeURIComponent(SAO_PAULO.longitude)}`);
  });

  it("renderiza o card completo no DOM", async () => {
    mockFetchSequence(jsonResponse({ results: [SAO_PAULO] }), jsonResponse(FORECAST));
    const result = await api.searchCity("São Paulo");

    expect(result).toBe(true);
    expect(document.getElementById("weather-card").hidden).toBe(false);
    expect(document.getElementById("error-message").hidden).toBe(true);
    expect(document.getElementById("city-name").textContent).toBe("São Paulo");
    expect(document.getElementById("country-name").textContent).toBe("São Paulo - Brasil");
    expect(document.getElementById("temperature").textContent).toBe("21°C");
    expect(document.getElementById("description").textContent).toBe("Céu limpo");
    expect(document.getElementById("humidity").textContent).toBe("67%");
    expect(document.getElementById("wind").textContent).toBe("5 km/h");
    expect(document.getElementById("feels-like").textContent).toBe("24°C");
    expect(document.getElementById("current-date").textContent).toBe("segunda-feira, 13 de outubro de 2025");
    expect(document.getElementById("weather-icon").className).toBe("wi wi-day-sunny card__icon");
    expect(document.body.classList.contains("day-theme")).toBe(true);
    expect(document.getElementById("loading").hidden).toBe(true);
  });

  it("aplica o tema noturno e o ícone de noite quando is_day é 0", async () => {
    const nightForecast = {
      ...FORECAST,
      current: { ...FORECAST.current, is_day: 0, weather_code: 2 },
    };
    mockFetchSequence(jsonResponse({ results: [SAO_PAULO] }), jsonResponse(nightForecast));
    await api.searchCity("São Paulo");

    expect(document.body.classList.contains("night-theme")).toBe(true);
    expect(document.body.classList.contains("day-theme")).toBe(false);
    expect(document.getElementById("weather-icon").className).toBe("wi wi-night-alt-cloudy card__icon");
    expect(document.getElementById("description").textContent).toBe("Parcialmente nublado");
  });

  it("mapeia códigos WMO conhecidos e desconhecidos", () => {
    expect(api.getWeatherInfo(95, true)).toEqual({ description: "Tempestade", icon: "wi-day-thunderstorm" });
    expect(api.getWeatherInfo(95, false)).toEqual({
      description: "Tempestade",
      icon: "wi-night-alt-thunderstorm",
    });
    expect(api.getWeatherInfo(1234, true)).toEqual({ description: "Condição desconhecida", icon: "wi-na" });
  });
});

describe("busca de cidade inexistente", () => {
  it("lança erro amigável quando results vem vazio", async () => {
    mockFetchSequence(jsonResponse({ results: [] }));

    await expect(api.getCoordinates("cidadeinexistentexyz")).rejects.toThrow(
      'Não encontramos a cidade "cidadeinexistentexyz". Verifique a grafia e tente novamente.'
    );
  });

  it("lança erro amigável quando a resposta não traz o campo results", async () => {
    mockFetchSequence(jsonResponse({ generationtime_ms: 0.5 }));

    await expect(api.getCoordinates("xyz")).rejects.toThrow(/Não encontramos a cidade/);
  });

  it("mostra a mensagem no DOM e não busca a previsão", async () => {
    const fetchMock = mockFetchSequence(jsonResponse({ results: [] }));
    const result = await api.searchCity("cidadeinexistentexyz");

    expect(result).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.getElementById("error-message").hidden).toBe(false);
    expect(document.getElementById("error-message").textContent).toMatch(/Não encontramos a cidade/);
    expect(document.getElementById("weather-card").hidden).toBe(true);
  });
});

describe("tratamento de erros de API", () => {
  it("trata falha de rede na busca de coordenadas", async () => {
    mockFetchSequence(new TypeError("Failed to fetch"));

    await expect(api.getCoordinates("São Paulo")).rejects.toThrow(
      "Falha de conexão. Verifique sua internet e tente novamente."
    );
  });

  it("trata resposta HTTP com erro", async () => {
    mockFetchSequence(jsonResponse({}, false, 500));

    await expect(api.getCoordinates("São Paulo")).rejects.toThrow(
      "O serviço de clima está indisponível no momento. Tente novamente mais tarde."
    );
  });

  it("trata JSON inválido", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    await expect(api.fetchJson("https://exemplo.test")).rejects.toThrow(
      "Não foi possível interpretar a resposta do serviço de clima."
    );
  });

  it("trata previsão sem o campo current", async () => {
    mockFetchSequence(jsonResponse({ latitude: -23.5, longitude: -46.6 }));

    await expect(api.getWeather(-23.5, -46.6)).rejects.toThrow(
      "Os dados de clima não estão disponíveis para esta localidade."
    );
  });

  it("exibe erro no DOM quando a previsão falha após o geocoding", async () => {
    mockFetchSequence(jsonResponse({ results: [SAO_PAULO] }), jsonResponse({}, false, 503));
    const result = await api.searchCity("São Paulo");

    expect(result).toBe(false);
    expect(document.getElementById("error-message").textContent).toBe(
      "O serviço de clima está indisponível no momento. Tente novamente mais tarde."
    );
    expect(document.getElementById("weather-card").hidden).toBe(true);
    expect(document.getElementById("loading").hidden).toBe(true);
  });

  it("limpa o erro anterior em uma nova busca bem-sucedida", async () => {
    mockFetchSequence(jsonResponse({ results: [] }));
    await api.searchCity("cidadeinexistentexyz");
    expect(document.getElementById("error-message").hidden).toBe(false);

    mockFetchSequence(jsonResponse({ results: [SAO_PAULO] }), jsonResponse(FORECAST));
    await api.searchCity("São Paulo");

    expect(document.getElementById("error-message").hidden).toBe(true);
    expect(document.getElementById("error-message").textContent).toBe("");
    expect(document.getElementById("weather-card").hidden).toBe(false);
  });
});

describe("integração com o formulário", () => {
  it("busca a cidade digitada ao enviar o formulário", async () => {
    mockFetchSequence(jsonResponse({ results: [SAO_PAULO] }), jsonResponse(FORECAST));
    api.init(null);

    document.getElementById("city-input").value = "São Paulo";
    document.getElementById("search-form").dispatchEvent(new Event("submit", { cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById("city-name").textContent).toBe("São Paulo");
  });
});
