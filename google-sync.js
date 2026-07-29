// Integração com Google (login + planilha usada como banco de dados).
// Depende de CONFIG (config.js) já carregado antes deste arquivo.
const GoogleSync = (() => {
  const TASKS_SHEET = "Tarefas";
  const NOTES_SHEET = "Notas";
  const PEDIDOS_SHEET = "Pedidos";
  const PRODUTOS_SHEET = "Produtos";
  const LOCAIS_SHEET = "Locais";
  const TASKS_HEADER = ["ID", "Titulo", "Descricao", "Status", "Prioridade", "Prazo", "CriadoEm", "AtualizadoEm"];
  const NOTES_HEADER = ["ID", "Titulo", "Conteudo", "Tags", "CriadoEm", "AtualizadoEm"];
  const PEDIDOS_HEADER = ["ID", "Data", "Local", "Categoria", "Produto", "Quantidade", "CriadoEm", "Faltou"];
  const PRODUTOS_HEADER = ["ID", "Nome", "Categoria", "CriadoEm"];
  const LOCAIS_HEADER = ["ID", "Nome", "CriadoEm"];
  const TOKEN_STORAGE_KEY = "organizador_gtoken";

  let tokenClient = null;
  let accessToken = null;
  let tokenExpiresAt = 0;
  let spreadsheetId = null;
  let sheetIdCache = {};
  let gisLoadPromise = null;

  function loadGisScript() {
    if (gisLoadPromise) return gisLoadPromise;
    gisLoadPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Não foi possível carregar o script de login do Google."));
      document.head.appendChild(script);
    });
    return gisLoadPromise;
  }

  function restoreToken() {
    try {
      const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.accessToken && saved.tokenExpiresAt > Date.now()) {
        accessToken = saved.accessToken;
        tokenExpiresAt = saved.tokenExpiresAt;
      }
    } catch (e) {
      // ignora token salvo inválido
    }
  }

  function persistToken() {
    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ accessToken, tokenExpiresAt })
    );
  }

  async function init() {
    restoreToken();
    await loadGisScript();
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: () => {} // sobrescrito a cada chamada em requestToken()
    });
  }

  function requestToken(promptValue) {
    return new Promise((resolve, reject) => {
      tokenClient.callback = (resp) => {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        accessToken = resp.access_token;
        tokenExpiresAt = Date.now() + resp.expires_in * 1000 - 60000;
        persistToken();
        resolve(accessToken);
      };
      tokenClient.requestAccessToken({ prompt: promptValue });
    });
  }

  function isSignedIn() {
    return !!accessToken && Date.now() < tokenExpiresAt;
  }

  function signIn() {
    return requestToken("consent");
  }

  function signOut() {
    if (accessToken && window.google) {
      google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    tokenExpiresAt = 0;
    spreadsheetId = null;
    sheetIdCache = {};
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  async function ensureToken() {
    if (isSignedIn()) return accessToken;
    try {
      return await requestToken("");
    } catch (e) {
      throw new Error("NEED_LOGIN");
    }
  }

  async function apiFetch(url, options = {}) {
    const token = await ensureToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Erro na API do Google (${res.status}): ${body.slice(0, 300)}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function headerFor(sheetName) {
    if (sheetName === TASKS_SHEET) return TASKS_HEADER;
    if (sheetName === NOTES_SHEET) return NOTES_HEADER;
    if (sheetName === PEDIDOS_SHEET) return PEDIDOS_HEADER;
    if (sheetName === PRODUTOS_SHEET) return PRODUTOS_HEADER;
    if (sheetName === LOCAIS_SHEET) return LOCAIS_HEADER;
    return [];
  }

  function colLetter(n) {
    let s = "";
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  async function findSpreadsheetId() {
    const q = encodeURIComponent(
      `name='${CONFIG.SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    );
    const data = await apiFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`
    );
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  }

  async function cacheSheetIds() {
    const data = await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`
    );
    data.sheets.forEach((s) => {
      sheetIdCache[s.properties.title] = s.properties.sheetId;
    });
  }

  async function createSpreadsheet() {
    const body = {
      properties: { title: CONFIG.SPREADSHEET_NAME },
      sheets: [
        { properties: { title: TASKS_SHEET } },
        { properties: { title: NOTES_SHEET } },
        { properties: { title: PEDIDOS_SHEET } },
        { properties: { title: PRODUTOS_SHEET } },
        { properties: { title: LOCAIS_SHEET } }
      ]
    };
    const data = await apiFetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      body: JSON.stringify(body)
    });
    spreadsheetId = data.spreadsheetId;
    data.sheets.forEach((s) => {
      sheetIdCache[s.properties.title] = s.properties.sheetId;
    });
    await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: [
          { range: `${TASKS_SHEET}!A1`, values: [TASKS_HEADER] },
          { range: `${NOTES_SHEET}!A1`, values: [NOTES_HEADER] },
          { range: `${PEDIDOS_SHEET}!A1`, values: [PEDIDOS_HEADER] },
          { range: `${PRODUTOS_SHEET}!A1`, values: [PRODUTOS_HEADER] },
          { range: `${LOCAIS_SHEET}!A1`, values: [LOCAIS_HEADER] }
        ]
      })
    });
    return spreadsheetId;
  }

  async function ensureSheetExists(sheetName) {
    if (sheetIdCache[sheetName] !== undefined) return;
    const data = await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] })
    });
    sheetIdCache[sheetName] = data.replies[0].addSheet.properties.sheetId;
    const range = encodeURIComponent(`${sheetName}!A1`);
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
      { method: "PUT", body: JSON.stringify({ values: [headerFor(sheetName)] }) }
    );
  }

  async function ensureHeaderUpToDate(sheetName) {
    const expected = headerFor(sheetName);
    const range = encodeURIComponent(`${sheetName}!1:1`);
    const data = await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`);
    const current = (data.values && data.values[0]) || [];
    const missing = expected.filter((h) => !current.includes(h));
    if (missing.length === 0) return;
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
      { method: "PUT", body: JSON.stringify({ values: [[...current, ...missing]] }) }
    );
  }

  async function ensureSpreadsheet() {
    if (!spreadsheetId) {
      const found = await findSpreadsheetId();
      if (found) {
        spreadsheetId = found;
        await cacheSheetIds();
      } else {
        await createSpreadsheet();
      }
    }
    await ensureSheetExists(PEDIDOS_SHEET);
    await ensureSheetExists(PRODUTOS_SHEET);
    await ensureSheetExists(LOCAIS_SHEET);
    await ensureHeaderUpToDate(PEDIDOS_SHEET);
    return spreadsheetId;
  }

  async function getRows(sheetName) {
    await ensureSpreadsheet();
    const data = await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`
    );
    const values = data.values || [];
    const header = values[0] || headerFor(sheetName);
    return values.slice(1).map((row, idx) => {
      const obj = {};
      header.forEach((key, i) => {
        obj[key] = row[i] ?? "";
      });
      obj.__row = idx + 2;
      return obj;
    });
  }

  async function appendRow(sheetName, obj) {
    await ensureSpreadsheet();
    const header = headerFor(sheetName);
    const row = header.map((key) => obj[key] ?? "");
    const range = encodeURIComponent(`${sheetName}!A:A`);
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [row] }) }
    );
  }

  async function updateRow(sheetName, id, patch) {
    await ensureSpreadsheet();
    const header = headerFor(sheetName);
    const rows = await getRows(sheetName);
    const target = rows.find((r) => r.ID === id);
    if (!target) throw new Error("Registro não encontrado (pode ter sido removido em outro dispositivo).");
    const merged = { ...target, ...patch, ID: id };
    const row = header.map((key) => merged[key] ?? "");
    const range = encodeURIComponent(`${sheetName}!A${target.__row}:${colLetter(header.length)}${target.__row}`);
    await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      { method: "PUT", body: JSON.stringify({ values: [row] }) }
    );
  }

  async function deleteRow(sheetName, id) {
    await ensureSpreadsheet();
    const rows = await getRows(sheetName);
    const target = rows.find((r) => r.ID === id);
    if (!target) return;
    if (sheetIdCache[sheetName] === undefined) await cacheSheetIds();
    const sheetId = sheetIdCache[sheetName];
    await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: { sheetId, dimension: "ROWS", startIndex: target.__row - 1, endIndex: target.__row }
            }
          }
        ]
      })
    });
  }

  function genId() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function getSpreadsheetUrl() {
    return spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null;
  }

  return {
    TASKS_SHEET,
    NOTES_SHEET,
    PEDIDOS_SHEET,
    PRODUTOS_SHEET,
    LOCAIS_SHEET,
    init,
    isSignedIn,
    signIn,
    signOut,
    ensureSpreadsheet,
    getRows,
    appendRow,
    updateRow,
    deleteRow,
    genId,
    getSpreadsheetUrl
  };
})();
