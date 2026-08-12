# Relatório de Auditoria de Segurança e Privacidade

**Projeto:** projeto_clima (aplicação web estática de previsão do tempo)
**Escopo auditado:** `index.html`, `style.css`, `api.js`, `tests/api.test.js`, `package.json`
**Data da revisão:** 2025
**Classificação geral:** baixo risco — aplicação 100% client-side, sem backend, sem autenticação e sem persistência de dados.

---

## 1. Chaves de API e segredos

**Situação: conforme.**

- As duas APIs consumidas (Open-Meteo Geocoding e Forecast) são públicas e gratuitas e **não exigem chave de API**, token ou cabeçalho de autenticação.
- Não há credenciais, tokens ou segredos no código-fonte, no `package.json` ou em arquivos de configuração; também não existe arquivo `.env`.
- Como não há segredos, não existe risco de exposição de credenciais no bundle client-side — problema comum em apps de clima que usam APIs com chave (nesses casos a chave fica visível no navegador e deveria ficar atrás de um proxy).

**Recomendação:** se no futuro for adotado um provedor que exija chave, a requisição deve passar por um proxy/backend próprio; nunca embutir a chave no JavaScript entregue ao navegador.

---

## 2. Comunicação segura (HTTPS)

**Situação: conforme.**

- Todos os endpoints externos são acessados exclusivamente por HTTPS:
  - `https://geocoding-api.open-meteo.com/v1/search`
  - `https://api.open-meteo.com/v1/forecast`
  - `https://cdnjs.cloudflare.com/.../weather-icons.min.css`
- Os endpoints estão fixados como constantes no código (`GEOCODING_URL` e `FORECAST_URL`), sem concatenação de host vindo do usuário — não há risco de redirecionamento da requisição para um host arbitrário (SSRF client-side).
- Não há requisições em HTTP puro, portanto não ocorre *mixed content* quando a aplicação é servida por HTTPS.

**Recomendações:**
- Servir a aplicação por HTTPS em produção e habilitar HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains`).
- Considerar Subresource Integrity (SRI) no `<link>` da Weather Icons para garantir a integridade do CSS vindo do CDN.

---

## 3. Tratamento de entrada e prevenção de XSS

**Situação: conforme.**

- **Validação de entrada:** `validateCity()` normaliza o texto (`trim`) e rejeita valores vazios, com menos de 2 caracteres ou sem nenhuma letra antes de qualquer requisição.
- **Codificação na saída HTTP:** o nome da cidade é codificado com `encodeURIComponent()` na URL do geocoding e os demais parâmetros são montados com `URLSearchParams`, evitando injeção de parâmetros na query string.
- **Renderização segura no DOM:** todo conteúdo dinâmico — nome da cidade, país, temperaturas, descrição, datas e mensagens de erro — é escrito via `textContent`, que trata o valor como texto puro e neutraliza qualquer marcação HTML. Os cards da previsão diária são criados com `document.createElement()` e `append()`, sem interpolação de HTML.
- **Uso de `innerHTML`:** ocorre uma única vez, em `renderDailyForecast()`, apenas para **limpar** a lista (`elements.forecastList.innerHTML = ""`), sem inserir conteúdo — não representa vetor de injeção.
- **Sem execução dinâmica de código:** não há `eval()`, `new Function()`, `document.write()` nem handlers inline (`onclick=`) no HTML.
- **Dados de terceiros:** os campos vindos da API (inclusive `place.name`, que reflete a busca do usuário) também passam por `textContent`, de modo que uma resposta maliciosa da API não conseguiria injetar script.
- **Links externos:** os links do rodapé usam `rel="noopener noreferrer"`, prevenindo *tabnabbing*.

---

## 4. Conformidade com LGPD e GDPR

**Situação: conforme — não há tratamento de dados pessoais.**

| Aspecto | Situação |
| --- | --- |
| Coleta de dados pessoais (PII) | Nenhuma. Não há cadastro, login, formulário de contato, e-mail ou telefone. |
| Dado enviado a terceiros | Apenas o nome da cidade digitado e as coordenadas correspondentes, enviados à Open-Meteo para responder à consulta. |
| Geolocalização do dispositivo | Não utilizada. A API `navigator.geolocation` não é chamada, portanto nenhuma localização precisa do usuário é obtida. |
| Cookies e rastreamento | Nenhum. Não há cookies, analytics, pixels, fingerprinting ou scripts de terceiros além do CSS de ícones. |
| Armazenamento local | Nenhum. Não são usados `localStorage`, `sessionStorage`, IndexedDB ou cache de buscas. |
| Persistência em servidor | Inexistente. A aplicação é estática e não possui backend nem banco de dados. |
| Transparência (art. 9º da LGPD) | Aviso de privacidade visível no rodapé da aplicação, informando o que é enviado e que nada é armazenado. |
| Minimização de dados (art. 6º, III) | Somente o necessário para a consulta é transmitido. |
| Base legal | Não aplicável na prática, pois não há tratamento de dados pessoais pelo controlador. |

**Ressalvas e recomendações:**
- A Open-Meteo é um **operador terceiro** e, como qualquer serviço web, pode registrar o endereço IP e o termo consultado em seus próprios logs. Isso está fora do controle desta aplicação; para uso corporativo, avalie a política de privacidade da Open-Meteo (<https://open-meteo.com/en/terms>) e, se necessário, intermedeie as chamadas por um proxy próprio.
- O mesmo vale para o CDN dos ícones (Cloudflare/cdnjs), que recebe o IP do visitante. Hospedar a fonte de ícones localmente elimina essa comunicação com terceiros e é a opção mais conservadora sob a LGPD/GDPR.
- Caso, futuramente, sejam adicionados histórico de buscas ou cidades favoritas (via `localStorage`), o aviso de privacidade do rodapé deverá ser atualizado.

---

## 5. Dependências

**Situação: conforme.**

- Dependências de runtime: **nenhuma** (JavaScript puro, sem framework e sem build).
- Dependências de desenvolvimento: `jest` e `jest-environment-jsdom`, ambas MIT, usadas apenas nos testes e não entregues ao navegador.
- Os testes automatizados mockam `fetch`, portanto a suíte roda offline e não expõe dados a serviços externos.

**Recomendação:** executar `npm audit` periodicamente e manter as dependências de desenvolvimento atualizadas.

---

## 6. Recomendações para ambiente de produção

### 6.1 Content-Security-Policy (CSP)

Política restritiva sugerida, compatível com o que a aplicação realmente utiliza:

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  style-src 'self' https://cdnjs.cloudflare.com;
  font-src 'self' https://cdnjs.cloudflare.com;
  connect-src https://api.open-meteo.com https://geocoding-api.open-meteo.com;
  img-src 'self' data:;
  base-uri 'none';
  form-action 'none';
  frame-ancestors 'none';
```

Se os arquivos da Weather Icons forem hospedados localmente, `style-src` e `font-src` podem ser reduzidos a `'self'`.

### 6.2 Demais cabeçalhos de segurança

| Cabeçalho | Valor recomendado | Objetivo |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Força HTTPS. |
| `X-Content-Type-Options` | `nosniff` | Impede MIME sniffing. |
| `Referrer-Policy` | `no-referrer` | Evita vazar a URL de origem para terceiros. |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=(), interest-cohort=()` | Bloqueia APIs sensíveis não utilizadas. |
| `X-Frame-Options` | `DENY` | Proteção contra clickjacking (complementa `frame-ancestors`). |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isola o contexto de navegação. |

### 6.3 Boas práticas adicionais

- Adicionar SRI (`integrity` + `crossorigin`) ao CSS carregado do CDN, ou hospedar os ícones localmente.
- Implementar limite de frequência de busca (debounce) para respeitar os limites de uso gratuito da Open-Meteo.
- Manter o aviso de privacidade e as atribuições (`LICENSE`, `NOTICE.md`) sempre atualizados ao evoluir a aplicação.

---

## 7. Resumo

| Item auditado | Resultado |
| --- | --- |
| Exposição de chaves/segredos | Conforme (não há chaves) |
| Comunicação HTTPS | Conforme |
| Validação e sanitização de entradas | Conforme |
| Prevenção de XSS na renderização | Conforme (`textContent` / `createElement`) |
| Coleta de dados pessoais (LGPD/GDPR) | Conforme (nenhum PII coletado) |
| Cookies e rastreamento | Conforme (inexistentes) |
| Dependências de terceiros | Conforme (somente dev, MIT) |
| Cabeçalhos de segurança (CSP etc.) | Pendente — depende da configuração do servidor de produção |

Nenhuma vulnerabilidade foi identificada no código auditado. A única ação pendente é de infraestrutura: configurar os cabeçalhos de segurança listados na seção 6 no servidor que hospedar a aplicação.
