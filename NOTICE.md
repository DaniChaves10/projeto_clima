# NOTICE — Atribuições e créditos de terceiros

Este documento registra os serviços, bibliotecas e conjuntos de dados de terceiros utilizados pelo **projeto_clima**, com suas respectivas licenças e exigências de atribuição.

O código próprio deste projeto é distribuído sob a licença MIT — veja [LICENSE](LICENSE).

---

## 1. Open-Meteo (dados meteorológicos)

- **Serviços utilizados**: Geocoding API (`https://geocoding-api.open-meteo.com`) e Forecast API (`https://api.open-meteo.com`).
- **Site**: <https://open-meteo.com/>
- **Licença dos dados**: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
- **Licença do software Open-Meteo**: AGPL-3.0 (não redistribuído aqui; apenas as APIs públicas são consumidas via HTTPS).
- **Condições de uso / atribuição**:
  - O uso gratuito é destinado a **fins não comerciais**, com limite indicativo de até 10.000 requisições por dia e sem necessidade de chave de API.
  - A atribuição ao Open-Meteo é **obrigatória** sempre que os dados forem exibidos. Neste projeto, o crédito aparece no rodapé de `index.html` e neste arquivo.
  - Usos comerciais ou de maior volume exigem um plano pago da Open-Meteo.
- **Fontes de dados subjacentes**: modelos de serviços meteorológicos nacionais (DWD, NOAA, MétéoFrance, ECMWF, entre outros), cada um com seus próprios termos de dados abertos.

> Dados meteorológicos fornecidos por Open-Meteo.com (CC BY 4.0).

---

## 2. Weather Icons — Erik Flowers

- **Versão utilizada**: 2.0.12, carregada via CDN (cdnjs).
- **Site**: <https://erikflowers.github.io/weather-icons/>
- **Autoria**: Erik Flowers (ícones) e Lukas Bischoff (design original do Weather Themed Icon Set).
- **Licenças**:
  - **Fonte/ícones**: [SIL Open Font License 1.1 (OFL 1.1)](https://scripts.sil.org/OFL);
  - **Código (CSS/LESS/SASS)**: [MIT License](https://opensource.org/licenses/MIT);
  - **Documentação**: CC BY 3.0.
- **Condições de uso / atribuição**: a atribuição ao autor é exigida; a fonte não pode ser vendida isoladamente. Neste projeto, o crédito aparece no rodapé de `index.html` e neste arquivo. Os arquivos não são modificados — são consumidos diretamente do CDN.

> Weather Icons por Erik Flowers — SIL OFL 1.1 (fonte) e MIT (código).

---

## 3. Jest (dependência de desenvolvimento)

- **Versão utilizada**: 29.7.0.
- **Site**: <https://jestjs.io/>
- **Licença**: [MIT License](https://github.com/jestjs/jest/blob/main/LICENSE).
- **Escopo**: usado exclusivamente em tempo de desenvolvimento/teste; não é distribuído com a aplicação e não é carregado pelo navegador.

## 4. JSDOM / jest-environment-jsdom (dependência de desenvolvimento)

- **Versão utilizada**: `jest-environment-jsdom` 29.7.0 (que utiliza o JSDOM).
- **Site**: <https://github.com/jsdom/jsdom>
- **Licença**: [MIT License](https://github.com/jsdom/jsdom/blob/main/LICENSE.txt).
- **Escopo**: simula o DOM durante a execução dos testes automatizados; não é distribuído com a aplicação.

---

## Observações

- Nenhum dos componentes acima é redistribuído dentro deste repositório: as APIs são consumidas via HTTPS, os ícones vêm de CDN público e as dependências de teste são instaladas via npm pelo próprio usuário.
- Ao reutilizar este projeto, mantenha as atribuições do rodapé de `index.html` e este arquivo `NOTICE.md`, conforme exigido pelas licenças CC BY 4.0 e SIL OFL 1.1.
- Para uso comercial, revise os termos da Open-Meteo (<https://open-meteo.com/en/terms>) antes de publicar a aplicação.
