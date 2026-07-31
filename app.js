// Lógica de UI do app: abas, formulários, listas e sincronização com o Google Sheets.
(function () {
  const els = {
    authStatus: document.getElementById("auth-status"),
    btnLogin: document.getElementById("btn-login"),
    btnLogout: document.getElementById("btn-logout"),
    syncStatus: document.getElementById("sync-status"),
    tabTarefas: document.getElementById("tab-tarefas"),
    tabNotas: document.getElementById("tab-notas"),
    viewTarefas: document.getElementById("view-tarefas"),
    viewNotas: document.getElementById("view-notas"),
    taskFilters: document.getElementById("task-filters"),
    taskList: document.getElementById("task-list"),
    noteList: document.getElementById("note-list"),
    btnNewTask: document.getElementById("btn-new-task"),
    formTask: document.getElementById("form-task"),
    btnCancelTask: document.getElementById("btn-cancel-task"),
    taskPaste: document.getElementById("task-paste"),
    btnParseTask: document.getElementById("btn-parse-task"),
    btnBulkTarefas: document.getElementById("btn-bulk-tarefas"),
    formTarefasBulk: document.getElementById("form-tarefas-bulk"),
    btnCancelTarefasBulk: document.getElementById("btn-cancel-tarefas-bulk"),
    btnImportTarefasBulk: document.getElementById("btn-import-tarefas-bulk"),
    tarefasBulkPaste: document.getElementById("tarefas-bulk-paste"),
    taskBulkBar: document.getElementById("task-bulk-bar"),
    taskBulkCount: document.getElementById("task-bulk-count"),
    btnClearTaskSelection: document.getElementById("btn-clear-task-selection"),
    btnDeleteSelectedTasks: document.getElementById("btn-delete-selected-tasks"),
    btnNewNote: document.getElementById("btn-new-note"),
    formNote: document.getElementById("form-note"),
    btnCancelNote: document.getElementById("btn-cancel-note"),
    notePaste: document.getElementById("note-paste"),
    btnParseNote: document.getElementById("btn-parse-note"),
    btnNewPedido: document.getElementById("btn-new-pedido"),
    formPedido: document.getElementById("form-pedido"),
    btnCancelPedido: document.getElementById("btn-cancel-pedido"),
    btnImportPedido: document.getElementById("btn-import-pedido"),
    pedidoData: document.getElementById("pedido-data"),
    pedidoPaste: document.getElementById("pedido-paste"),
    pedidoLocaisTabelas: document.getElementById("pedido-locais-tabelas"),
    btnSavePedidoCatalogo: document.getElementById("btn-save-pedido-catalogo"),
    historicoFilters: document.getElementById("historico-filters"),
    resumoDataInicio: document.getElementById("resumo-data-inicio"),
    resumoDataFim: document.getElementById("resumo-data-fim"),
    resumoMensal: document.getElementById("resumo-mensal"),
    pedidoList: document.getElementById("pedido-list"),
    btnNewProduto: document.getElementById("btn-new-produto"),
    formProduto: document.getElementById("form-produto"),
    btnCancelProduto: document.getElementById("btn-cancel-produto"),
    produtoPaste: document.getElementById("produto-paste"),
    btnParseProduto: document.getElementById("btn-parse-produto"),
    produtoList: document.getElementById("produto-list"),
    btnBulkProdutos: document.getElementById("btn-bulk-produtos"),
    formProdutosBulk: document.getElementById("form-produtos-bulk"),
    btnCancelProdutosBulk: document.getElementById("btn-cancel-produtos-bulk"),
    btnImportProdutosBulk: document.getElementById("btn-import-produtos-bulk"),
    produtosBulkPaste: document.getElementById("produtos-bulk-paste"),
    toast: document.getElementById("toast")
  };

  let tasks = [];
  let selectedTaskIds = new Set();
  let notes = [];
  let pedidos = [];
  let produtos = [];
  let locais = [];

  // Catálogo inicial: aparece pronto no primeiro uso, sem precisar importar nada.
  // Pra adicionar mais itens depois, é só pedir aqui na conversa que eu atualizo essa lista.
  const DEFAULT_LOCAIS = ["Elis Bar", "Bar Ideal"];
  const DEFAULT_PRODUTOS = [
    { Nome: "Brahma Claro", Categoria: "Chopp" },
    { Nome: "Brahma Escuro", Categoria: "Chopp" },
    { Nome: "Brahma Black", Categoria: "Chopp" },
    { Nome: "Patagônia", Categoria: "Chopp" },
    { Nome: "Chopp Stella", Categoria: "Chopp" },
    { Nome: "Pepsi", Categoria: "Refrigerantes" },
    { Nome: "Pepsi Black", Categoria: "Refrigerantes" },
    { Nome: "Guaraná Antártica", Categoria: "Refrigerantes" },
    { Nome: "Guaraná Antártica Zero", Categoria: "Refrigerantes" },
    { Nome: "Soda", Categoria: "Refrigerantes" },
    { Nome: "Soda Zero", Categoria: "Refrigerantes" },
    { Nome: "Sukita", Categoria: "Refrigerantes" },
    { Nome: "Tônica", Categoria: "Refrigerantes" },
    { Nome: "Tônica Zero", Categoria: "Refrigerantes" },
    { Nome: "Red Bull", Categoria: "Refrigerantes" },
    { Nome: "Red Bull Tropical", Categoria: "Refrigerantes" },
    { Nome: "Red Bull Suggar Free", Categoria: "Refrigerantes" },
    { Nome: "Red Bull Melancia", Categoria: "Refrigerantes" },
    { Nome: "Stella", Categoria: "Cervejas" },
    { Nome: "Stella Gold", Categoria: "Cervejas" },
    { Nome: "Corona", Categoria: "Cervejas" },
    { Nome: "Corona Cero", Categoria: "Cervejas" },
    { Nome: "Água com gás", Categoria: "Água" },
    { Nome: "Água sem gás", Categoria: "Água" }
  ];
  let currentFilter = "TODAS";
  let historicoFilterLocal = "TODAS";
  let resumoFilterInicio = "";
  let resumoFilterFim = "";
  let toastTimer = null;
  // Trava única de sincronização: impede clique duplo em salvar/excluir e também
  // impede que um save rode junto com o carregamento inicial (que reatribui os
  // arrays de estado e engoliria o item recém-salvo, levando a duplicata).
  let syncBusy = false;

  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function showToast(message, isError) {
    els.toast.textContent = message;
    els.toast.classList.toggle("error", !!isError);
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 3500);
  }

  function setSyncStatus(text) {
    els.syncStatus.textContent = text;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // ---------- Colar e preencher (texto -> campos do formulário) ----------
  function normalizeKey(str) {
    return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  function parsePastedFields(text) {
    const fields = {};
    let currentKey = null;
    const lineRe = /^\s*([^:]{1,30}):\s*(.*)$/;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) {
        currentKey = null;
        continue;
      }
      const m = line.match(lineRe);
      if (m) {
        const key = normalizeKey(m[1]);
        fields[key] = m[2].trim();
        currentKey = key;
      } else if (currentKey) {
        fields[currentKey] = (fields[currentKey] ? fields[currentKey] + "\n" : "") + line;
      }
    }
    return fields;
  }

  function mapPriority(v) {
    const n = normalizeKey(v);
    if (n.startsWith("alta")) return "ALTA";
    if (n.startsWith("baix")) return "BAIXA";
    return "MEDIA";
  }

  function mapStatus(v) {
    const n = normalizeKey(v);
    if (n.includes("feito") || n.includes("conclu")) return "FEITO";
    if (n.includes("fazendo") || n.includes("andamento")) return "FAZENDO";
    return "A_FAZER";
  }

  function mapDate(v) {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return "";
  }

  function parsePastedTask(text) {
    const f = parsePastedFields(text);
    const result = {};
    if (f.titulo) result.Titulo = f.titulo;
    if (f.descricao) result.Descricao = f.descricao;
    if (f.status) result.Status = mapStatus(f.status);
    if (f.prioridade) result.Prioridade = mapPriority(f.prioridade);
    if (f.prazo) result.Prazo = mapDate(f.prazo);
    return result;
  }

  function parseTarefasBulkText(text) {
    const blocks = text.split(/\r?\n\s*\r?\n+/).map((b) => b.trim()).filter(Boolean);
    return blocks.map((block) => parsePastedTask(block)).filter((t) => t.Titulo);
  }

  function parsePastedNote(text) {
    const f = parsePastedFields(text);
    const result = {};
    if (f.titulo) result.Titulo = f.titulo;
    if (f.conteudo) result.Conteudo = f.conteudo;
    if (f.tags) result.Tags = f.tags;
    return result;
  }

  function parsePastedProduto(text) {
    const f = parsePastedFields(text);
    const result = {};
    if (f.nome) result.Nome = f.nome;
    if (f.categoria) result.Categoria = f.categoria;
    return result;
  }

  function parseProdutosBulkText(text) {
    const blocks = text
      .split(/\r?\n\s*\r?\n+/)
      .map((b) => b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
      .filter((b) => b.length > 0);
    let currentCategoria = "";
    const items = [];
    for (const block of blocks) {
      if (block.length === 1) {
        currentCategoria = block[0].replace(/:$/, "").trim();
        continue;
      }
      // Se todas as linhas do bloco começam com a mesma primeira palavra
      // (ex: "Chopp Brahma Claro" / "Chopp Stella"), essa palavra é a categoria.
      const firstWords = block.map((line) => line.split(/\s+/)[0].toLowerCase());
      const sharedPrefix = firstWords.every((w) => w === firstWords[0]) ? block[0].split(/\s+/)[0] : null;
      if (sharedPrefix) {
        currentCategoria = sharedPrefix;
        const stripRe = new RegExp("^" + sharedPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+", "i");
        for (const line of block) {
          const nome = line.replace(stripRe, "").trim();
          items.push({ Nome: nome || line, Categoria: currentCategoria });
        }
      } else {
        for (const line of block) {
          items.push({ Nome: line.replace(/:$/, "").trim(), Categoria: currentCategoria });
        }
      }
    }
    return items;
  }

  // ---------- Abas ----------
  document.querySelectorAll("nav.tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view;
      document.querySelectorAll("section.view").forEach((sec) => {
        sec.classList.toggle("active", sec.id === `view-${view}`);
      });
    });
  });

  // ---------- Autenticação ----------
  function refreshAuthUI() {
    const signedIn = GoogleSync.isSignedIn();
    els.btnLogin.hidden = signedIn;
    els.btnLogout.hidden = !signedIn;
    els.authStatus.textContent = signedIn ? "Conectado ao Google" : "Não conectado";
  }

  els.btnLogin.addEventListener("click", async () => {
    try {
      els.btnLogin.disabled = true;
      await GoogleSync.signIn();
      refreshAuthUI();
      await loadAll();
    } catch (e) {
      showToast("Não foi possível entrar com o Google: " + e.message, true);
    } finally {
      els.btnLogin.disabled = false;
    }
  });

  els.btnLogout.addEventListener("click", () => {
    GoogleSync.signOut();
    tasks = [];
    notes = [];
    pedidos = [];
    produtos = [];
    locais = [];
    renderTasks();
    renderNotes();
    renderPedidos();
    renderProdutos();
    refreshAuthUI();
    setSyncStatus("");
  });

  async function seedDefaultsIfNeeded() {
    // Garante que os produtos e locais padrão sempre existam, mesmo que já
    // haja alguns cadastrados (não duplica os que já existem por nome).
    const produtosFaltando = DEFAULT_PRODUTOS.filter(
      (dp) =>
        !produtos.some(
          (p) => normalizeKey(p.Nome) === normalizeKey(dp.Nome) && normalizeKey(p.Categoria || "") === normalizeKey(dp.Categoria || "")
        )
    );
    if (produtosFaltando.length > 0) {
      setSyncStatus("Preparando catálogo de produtos...");
      for (const item of produtosFaltando) {
        const row = { ID: GoogleSync.genId(), ...item, CriadoEm: nowIso() };
        await GoogleSync.appendRow(GoogleSync.PRODUTOS_SHEET, row);
        produtos.push(row);
      }
    }

    const locaisFaltando = DEFAULT_LOCAIS.filter(
      (nome) => !locais.some((l) => normalizeKey(l.Nome) === normalizeKey(nome))
    );
    if (locaisFaltando.length > 0) {
      setSyncStatus("Preparando locais...");
      for (const nome of locaisFaltando) {
        const row = { ID: GoogleSync.genId(), Nome: nome, CriadoEm: nowIso() };
        await GoogleSync.appendRow(GoogleSync.LOCAIS_SHEET, row);
        locais.push(row);
      }
    }
  }

  // ---------- Carregamento ----------
  async function loadAll() {
    // Segura a mesma trava do withSync: enquanto carrega (e semeia o catálogo
    // padrão), nenhum salvar/excluir pode rodar em paralelo — senão os arrays
    // recarregados aqui sobrescreveriam o item recém-salvo.
    if (syncBusy) return;
    syncBusy = true;
    setSyncStatus("Sincronizando...");
    try {
      tasks = await GoogleSync.getRows(GoogleSync.TASKS_SHEET);
      notes = await GoogleSync.getRows(GoogleSync.NOTES_SHEET);
      pedidos = await GoogleSync.getRows(GoogleSync.PEDIDOS_SHEET);
      produtos = await GoogleSync.getRows(GoogleSync.PRODUTOS_SHEET);
      locais = await GoogleSync.getRows(GoogleSync.LOCAIS_SHEET);
      await seedDefaultsIfNeeded();
      renderTasks();
      renderNotes();
      renderPedidos();
      renderProdutos();
      setSyncStatus("Sincronizado às " + new Date().toLocaleTimeString("pt-BR"));
    } catch (e) {
      if (e.message === "NEED_LOGIN") {
        setSyncStatus("Faça login para carregar seus dados.");
      } else {
        setSyncStatus("Falha ao sincronizar.");
        showToast(e.message, true);
      }
    } finally {
      syncBusy = false;
    }
  }

  // ---------- Tarefas ----------
  els.taskFilters.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    els.taskFilters.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTaskIds.clear();
    renderTasks();
  });

  function updateTaskBulkBar() {
    const n = selectedTaskIds.size;
    els.taskBulkBar.hidden = n === 0;
    els.taskBulkCount.textContent = n === 1 ? "1 tarefa selecionada" : `${n} tarefas selecionadas`;
  }

  function statusLabel(s) {
    return { A_FAZER: "A Fazer", FAZENDO: "Fazendo", FEITO: "Feito" }[s] || s;
  }

  function priorityLabel(p) {
    return { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" }[p] || p;
  }

  function renderTasks() {
    for (const id of Array.from(selectedTaskIds)) {
      if (!tasks.some((t) => t.ID === id)) selectedTaskIds.delete(id);
    }
    const filtered = currentFilter === "TODAS" ? tasks : tasks.filter((t) => t.Status === currentFilter);
    if (filtered.length === 0) {
      els.taskList.innerHTML = '<div class="empty-state">Nenhuma tarefa por aqui ainda.</div>';
      updateTaskBulkBar();
      return;
    }
    els.taskList.innerHTML = filtered
      .map((t) => `
        <div class="card" data-id="${esc(t.ID)}">
          <div class="card-top">
            <label class="task-select-wrap">
              <input type="checkbox" class="task-select" data-id="${esc(t.ID)}" ${selectedTaskIds.has(t.ID) ? "checked" : ""}>
            </label>
            <p class="card-title">${esc(t.Titulo)}</p>
          </div>
          ${t.Descricao ? `<p class="card-desc">${esc(t.Descricao)}</p>` : ""}
          <div class="card-meta">
            <span class="badge status-${esc(t.Status)}">${esc(statusLabel(t.Status))}</span>
            <span class="badge priority-${esc(t.Prioridade)}">${esc(priorityLabel(t.Prioridade))}</span>
            ${t.Prazo ? `<span class="badge" style="background:#334155;color:#cbd5e1">Prazo: ${esc(t.Prazo)}</span>` : ""}
          </div>
          <div class="card-actions">
            ${t.Status !== "FEITO"
              ? `<button class="secondary" data-action="complete">Marcar como feito</button>`
              : `<button class="secondary" data-action="reopen">Reabrir</button>`}
            <button class="secondary" data-action="edit-task">Editar</button>
            <button class="danger" data-action="delete-task">Excluir</button>
          </div>
        </div>
      `)
      .join("");
    updateTaskBulkBar();
  }

  els.taskList.addEventListener("change", (e) => {
    const cb = e.target.closest(".task-select");
    if (!cb) return;
    if (cb.checked) selectedTaskIds.add(cb.dataset.id);
    else selectedTaskIds.delete(cb.dataset.id);
    updateTaskBulkBar();
  });

  els.btnClearTaskSelection.addEventListener("click", () => {
    selectedTaskIds.clear();
    renderTasks();
  });

  els.btnDeleteSelectedTasks.addEventListener("click", async () => {
    const ids = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} tarefa(s) selecionada(s)?`)) return;
    await withSync(async () => {
      for (const id of ids) {
        await GoogleSync.deleteRow(GoogleSync.TASKS_SHEET, id);
      }
      tasks = tasks.filter((t) => !selectedTaskIds.has(t.ID));
      selectedTaskIds.clear();
      renderTasks();
      showToast(`${ids.length} tarefa(s) excluída(s).`);
    });
  });

  els.taskList.addEventListener("click", async (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    const action = e.target.dataset.action;
    const task = tasks.find((t) => t.ID === id);
    if (!task) return;

    if (action === "edit-task") {
      openTaskForm(task);
    } else if (action === "delete-task") {
      if (!confirm(`Excluir a tarefa "${task.Titulo}"?`)) return;
      await withSync(async () => {
        await GoogleSync.deleteRow(GoogleSync.TASKS_SHEET, id);
        tasks = tasks.filter((t) => t.ID !== id);
        renderTasks();
        showToast("Tarefa excluída.");
      });
    } else if (action === "complete" || action === "reopen") {
      const newStatus = action === "complete" ? "FEITO" : "A_FAZER";
      await withSync(async () => {
        const patch = { Status: newStatus, AtualizadoEm: nowIso() };
        await GoogleSync.updateRow(GoogleSync.TASKS_SHEET, id, patch);
        Object.assign(task, patch);
        renderTasks();
      });
    }
  });

  function openTarefasBulkForm() {
    closeTaskForm();
    els.formTarefasBulk.classList.add("open");
    els.tarefasBulkPaste.value = "";
  }

  function closeTarefasBulkForm() {
    els.formTarefasBulk.classList.remove("open");
    els.formTarefasBulk.reset();
  }

  els.btnBulkTarefas.addEventListener("click", openTarefasBulkForm);
  els.btnCancelTarefasBulk.addEventListener("click", closeTarefasBulkForm);

  els.btnImportTarefasBulk.addEventListener("click", async () => {
    const text = els.tarefasBulkPaste.value;
    const items = parseTarefasBulkText(text);
    if (items.length === 0) {
      showToast("Não consegui identificar tarefas nesse texto. Confira o formato e tente de novo.", true);
      return;
    }

    await withSync(async () => {
      const novas = [];
      for (const item of items) {
        const row = {
          ID: GoogleSync.genId(),
          Titulo: item.Titulo,
          Descricao: item.Descricao || "",
          Status: item.Status || "A_FAZER",
          Prioridade: item.Prioridade || "MEDIA",
          Prazo: item.Prazo || "",
          CriadoEm: nowIso(),
          AtualizadoEm: nowIso()
        };
        await GoogleSync.appendRow(GoogleSync.TASKS_SHEET, row);
        novas.push(row);
      }
      tasks.push(...novas);
      renderTasks();
      closeTarefasBulkForm();
      showToast(`${novas.length} tarefa(s) importada(s).`);
    });
  });

  function openTaskForm(task) {
    closeTarefasBulkForm();
    els.formTask.classList.add("open");
    els.taskPaste.value = "";
    document.getElementById("task-id").value = task ? task.ID : "";
    document.getElementById("task-titulo").value = task ? task.Titulo : "";
    document.getElementById("task-descricao").value = task ? task.Descricao : "";
    document.getElementById("task-status").value = task ? task.Status : "A_FAZER";
    document.getElementById("task-prioridade").value = task ? task.Prioridade : "MEDIA";
    document.getElementById("task-prazo").value = task ? task.Prazo : "";
    document.getElementById("task-titulo").focus();
  }

  function closeTaskForm() {
    els.formTask.classList.remove("open");
    els.formTask.reset();
  }

  els.btnNewTask.addEventListener("click", () => openTaskForm(null));
  els.btnCancelTask.addEventListener("click", closeTaskForm);

  els.btnParseTask.addEventListener("click", () => {
    const text = els.taskPaste.value;
    if (!text.trim()) {
      showToast("Cole o texto antes de preencher.", true);
      return;
    }
    const parsed = parsePastedTask(text);
    if (parsed.Titulo) document.getElementById("task-titulo").value = parsed.Titulo;
    if (parsed.Descricao) document.getElementById("task-descricao").value = parsed.Descricao;
    if (parsed.Status) document.getElementById("task-status").value = parsed.Status;
    if (parsed.Prioridade) document.getElementById("task-prioridade").value = parsed.Prioridade;
    if (parsed.Prazo) document.getElementById("task-prazo").value = parsed.Prazo;
    showToast("Campos preenchidos — confira e clique em Salvar tarefa.");
  });

  els.formTask.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("task-id").value;
    const data = {
      Titulo: document.getElementById("task-titulo").value.trim(),
      Descricao: document.getElementById("task-descricao").value.trim(),
      Status: document.getElementById("task-status").value,
      Prioridade: document.getElementById("task-prioridade").value,
      Prazo: document.getElementById("task-prazo").value
    };
    if (!data.Titulo) return;

    await withSync(async () => {
      if (id) {
        data.AtualizadoEm = nowIso();
        await GoogleSync.updateRow(GoogleSync.TASKS_SHEET, id, data);
        const existing = tasks.find((t) => t.ID === id);
        Object.assign(existing, data);
      } else {
        const newTask = { ID: GoogleSync.genId(), ...data, CriadoEm: nowIso(), AtualizadoEm: nowIso() };
        await GoogleSync.appendRow(GoogleSync.TASKS_SHEET, newTask);
        tasks.push(newTask);
      }
      renderTasks();
      closeTaskForm();
      showToast("Tarefa salva.");
    });
  });

  // ---------- Notas ----------
  function renderNotes() {
    if (notes.length === 0) {
      els.noteList.innerHTML = '<div class="empty-state">Nenhuma nota por aqui ainda.</div>';
      return;
    }
    els.noteList.innerHTML = notes
      .map((n) => `
        <div class="card" data-id="${esc(n.ID)}">
          <p class="card-title">${esc(n.Titulo)}</p>
          ${n.Conteudo ? `<p class="card-desc">${esc(n.Conteudo)}</p>` : ""}
          ${n.Tags ? `<p class="tags">${esc(n.Tags)}</p>` : ""}
          <div class="card-actions">
            <button class="secondary" data-action="edit-note">Editar</button>
            <button class="danger" data-action="delete-note">Excluir</button>
          </div>
        </div>
      `)
      .join("");
  }

  els.noteList.addEventListener("click", async (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    const action = e.target.dataset.action;
    const note = notes.find((n) => n.ID === id);
    if (!note) return;

    if (action === "edit-note") {
      openNoteForm(note);
    } else if (action === "delete-note") {
      if (!confirm(`Excluir a nota "${note.Titulo}"?`)) return;
      await withSync(async () => {
        await GoogleSync.deleteRow(GoogleSync.NOTES_SHEET, id);
        notes = notes.filter((n) => n.ID !== id);
        renderNotes();
        showToast("Nota excluída.");
      });
    }
  });

  function openNoteForm(note) {
    els.formNote.classList.add("open");
    els.notePaste.value = "";
    document.getElementById("note-id").value = note ? note.ID : "";
    document.getElementById("note-titulo").value = note ? note.Titulo : "";
    document.getElementById("note-conteudo").value = note ? note.Conteudo : "";
    document.getElementById("note-tags").value = note ? note.Tags : "";
    document.getElementById("note-titulo").focus();
  }

  function closeNoteForm() {
    els.formNote.classList.remove("open");
    els.formNote.reset();
  }

  els.btnNewNote.addEventListener("click", () => openNoteForm(null));
  els.btnCancelNote.addEventListener("click", closeNoteForm);

  els.btnParseNote.addEventListener("click", () => {
    const text = els.notePaste.value;
    if (!text.trim()) {
      showToast("Cole o texto antes de preencher.", true);
      return;
    }
    const parsed = parsePastedNote(text);
    if (parsed.Titulo) document.getElementById("note-titulo").value = parsed.Titulo;
    if (parsed.Conteudo) document.getElementById("note-conteudo").value = parsed.Conteudo;
    if (parsed.Tags) document.getElementById("note-tags").value = parsed.Tags;
    showToast("Campos preenchidos — confira e clique em Salvar nota.");
  });

  els.formNote.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("note-id").value;
    const data = {
      Titulo: document.getElementById("note-titulo").value.trim(),
      Conteudo: document.getElementById("note-conteudo").value.trim(),
      Tags: document.getElementById("note-tags").value.trim()
    };
    if (!data.Titulo) return;

    await withSync(async () => {
      if (id) {
        data.AtualizadoEm = nowIso();
        await GoogleSync.updateRow(GoogleSync.NOTES_SHEET, id, data);
        const existing = notes.find((n) => n.ID === id);
        Object.assign(existing, data);
      } else {
        const newNote = { ID: GoogleSync.genId(), ...data, CriadoEm: nowIso(), AtualizadoEm: nowIso() };
        await GoogleSync.appendRow(GoogleSync.NOTES_SHEET, newNote);
        notes.push(newNote);
      }
      renderNotes();
      closeNoteForm();
      showToast("Nota salva.");
    });
  });

  // ---------- Pedidos ----------
  function parsePedidoText(text) {
    let currentLocal = null;
    let currentCategoria = null;
    let blankStreak = 0;
    const items = [];

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) {
        blankStreak++;
        continue;
      }

      const productMatch = line.match(/^(.+?)\s+(\d+)\s*$/);
      if (productMatch && currentLocal) {
        items.push({
          Local: currentLocal,
          Categoria: currentCategoria || "",
          Produto: productMatch[1].trim(),
          Quantidade: productMatch[2]
        });
        blankStreak = 0;
        continue;
      }

      const pedidoMatch = line.match(/^pedido\s+(.+?):?\s*$/i);
      if (pedidoMatch) {
        currentLocal = pedidoMatch[1].trim();
        currentCategoria = null;
      } else if (blankStreak >= 2 || !currentLocal) {
        currentLocal = line.replace(/:$/, "").trim();
        currentCategoria = null;
      } else {
        currentCategoria = line.replace(/:$/, "").trim();
      }
      blankStreak = 0;
    }
    return items;
  }

  function formatDateBR(iso) {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
  }

  function groupPedidos(list) {
    const groups = new Map();
    for (const p of list) {
      const key = `${p.Data}||${p.Local}`;
      if (!groups.has(key)) groups.set(key, { Data: p.Data, Local: p.Local, items: [] });
      groups.get(key).items.push(p);
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.Data !== b.Data) return a.Data < b.Data ? 1 : -1;
      return a.Local.localeCompare(b.Local);
    });
  }

  function groupByCategoria(items) {
    const map = new Map();
    for (const it of items) {
      const cat = it.Categoria || "";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(it);
    }
    return Array.from(map.entries());
  }

  function renderHistoricoFilters() {
    const locaisUsados = Array.from(new Set(pedidos.map((p) => p.Local))).sort((a, b) => a.localeCompare(b));
    if (!locaisUsados.includes(historicoFilterLocal)) historicoFilterLocal = "TODAS";
    const opcoes = ["TODAS", ...locaisUsados];
    els.historicoFilters.innerHTML = opcoes
      .map(
        (op) =>
          `<button data-local="${esc(op)}" class="${op === historicoFilterLocal ? "active" : ""}">${esc(op === "TODAS" ? "Todos os locais" : op)}</button>`
      )
      .join("");
  }

  els.historicoFilters.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-local]");
    if (!btn) return;
    historicoFilterLocal = btn.dataset.local;
    renderPedidos();
  });

  function sumProdutosPeriodo(list, inicio, fim) {
    const porProduto = new Map();
    for (const p of list) {
      if (!p.Data || p.Faltou === "SIM") continue;
      if (inicio && p.Data < inicio) continue;
      if (fim && p.Data > fim) continue;
      const qtd = Number(p.Quantidade) || 0;
      porProduto.set(p.Produto, (porProduto.get(p.Produto) || 0) + qtd);
    }
    return Array.from(porProduto.entries()).sort((a, b) => b[1] - a[1]);
  }

  els.resumoDataInicio.addEventListener("change", () => {
    resumoFilterInicio = els.resumoDataInicio.value;
    renderPedidos();
  });

  els.resumoDataFim.addEventListener("change", () => {
    resumoFilterFim = els.resumoDataFim.value;
    renderPedidos();
  });

  function renderResumoMensal(filtrados) {
    els.resumoDataInicio.value = resumoFilterInicio;
    els.resumoDataFim.value = resumoFilterFim;

    if (filtrados.length === 0) {
      els.resumoMensal.innerHTML = '<div class="empty-state">Sem dados ainda.</div>';
      return;
    }

    const linhas = sumProdutosPeriodo(filtrados, resumoFilterInicio, resumoFilterFim);
    if (linhas.length === 0) {
      els.resumoMensal.innerHTML = '<div class="empty-state">Nenhum pedido nesse período.</div>';
      return;
    }

    const periodoLabel =
      resumoFilterInicio || resumoFilterFim
        ? `${resumoFilterInicio ? formatDateBR(resumoFilterInicio) : "início"} até ${resumoFilterFim ? formatDateBR(resumoFilterFim) : "hoje"}`
        : "Todo o período";

    els.resumoMensal.innerHTML = `
      <div class="card">
        <p class="card-title">${esc(periodoLabel)}</p>
        <ul style="margin:0;padding-left:18px;color:var(--text-muted);font-size:0.9rem">
          ${linhas.map(([produto, qtd]) => `<li>${esc(String(qtd))}x ${esc(produto)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function renderPedidos() {
    renderHistoricoFilters();
    if (pedidos.length === 0) {
      els.pedidoList.innerHTML = '<div class="empty-state">Nenhum pedido por aqui ainda.</div>';
      els.resumoMensal.innerHTML = '<div class="empty-state">Sem dados ainda.</div>';
      return;
    }
    const filtrados = historicoFilterLocal === "TODAS" ? pedidos : pedidos.filter((p) => p.Local === historicoFilterLocal);
    renderResumoMensal(filtrados);
    if (filtrados.length === 0) {
      els.pedidoList.innerHTML = '<div class="empty-state">Nenhum pedido para esse local.</div>';
      return;
    }
    const groups = groupPedidos(filtrados);
    els.pedidoList.innerHTML = groups
      .map((g) => {
        const catGroups = groupByCategoria(g.items);
        const dateLabel = g.Data ? formatDateBR(g.Data) : "sem data";
        return `
          <div class="card" data-data="${esc(g.Data)}" data-local="${esc(g.Local)}">
            <div class="card-top">
              <p class="card-title">${esc(g.Local)} <span style="color:var(--text-muted);font-weight:400">— ${esc(dateLabel)}</span></p>
            </div>
            ${catGroups
              .map(
                ([cat, items]) => `
                  <p style="margin:8px 0 2px;font-weight:600;color:var(--accent);font-size:0.85rem">${esc(cat || "Sem categoria")}</p>
                  <ul class="pedido-item-list">
                    ${items
                      .map(
                        (it) => `
                          <li class="pedido-item${it.Faltou === "SIM" ? " faltou" : ""}">
                            <label class="pedido-item-label">
                              <input type="checkbox" class="pedido-faltou-check" data-id="${esc(it.ID)}" ${it.Faltou === "SIM" ? "checked" : ""}>
                              <span>${esc(it.Quantidade)}x ${esc(it.Produto)}</span>
                            </label>
                            ${it.Faltou === "SIM" ? '<span class="badge faltou">faltou</span>' : ""}
                          </li>
                        `
                      )
                      .join("")}
                  </ul>
                `
              )
              .join("")}
            <div class="card-actions">
              <button class="danger" data-action="delete-pedido">Excluir pedido</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  els.pedidoList.addEventListener("change", async (e) => {
    const checkbox = e.target.closest(".pedido-faltou-check");
    if (!checkbox) return;
    const id = checkbox.dataset.id;
    const item = pedidos.find((p) => p.ID === id);
    if (!item) return;
    const faltou = checkbox.checked;
    await withSync(async () => {
      await GoogleSync.updateRow(GoogleSync.PEDIDOS_SHEET, id, { Faltou: faltou ? "SIM" : "" });
      item.Faltou = faltou ? "SIM" : "";
      renderPedidos();
    });
  });

  els.pedidoList.addEventListener("click", async (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    if (e.target.dataset.action !== "delete-pedido") return;
    const data = card.dataset.data;
    const local = card.dataset.local;
    if (!confirm(`Excluir o pedido de "${local}" (${data ? formatDateBR(data) : "sem data"})?`)) return;

    await withSync(async () => {
      const toDelete = pedidos.filter((p) => p.Data === data && p.Local === local);
      for (const item of toDelete) {
        await GoogleSync.deleteRow(GoogleSync.PEDIDOS_SHEET, item.ID);
      }
      pedidos = pedidos.filter((p) => !(p.Data === data && p.Local === local));
      renderPedidos();
      showToast("Pedido excluído.");
    });
  });

  function renderPedidoLocaisTabelas() {
    if (locais.length === 0) {
      els.pedidoLocaisTabelas.innerHTML =
        '<div class="empty-state">Nenhum local cadastrado ainda. Me chama na conversa pra eu adicionar um.</div>';
      return;
    }
    if (produtos.length === 0) {
      els.pedidoLocaisTabelas.innerHTML =
        '<div class="empty-state">Cadastre produtos na aba Produtos pra eles aparecerem aqui.</div>';
      return;
    }
    const ordenados = [...produtos].sort((a, b) => {
      const catCmp = (a.Categoria || "").localeCompare(b.Categoria || "");
      return catCmp !== 0 ? catCmp : (a.Nome || "").localeCompare(b.Nome || "");
    });
    const catGroups = groupByCategoria(ordenados.map((p) => ({ ...p, Categoria: p.Categoria || "Sem categoria" })));

    els.pedidoLocaisTabelas.innerHTML = locais
      .map(
        (local) => `
          <div class="pedido-local-tabela" data-local-id="${esc(local.ID)}" data-local-nome="${esc(local.Nome)}">
            <div class="pedido-local-header">
              <strong>${esc(local.Nome)}</strong>
              <button type="button" class="secondary" data-action="remove-local">Remover local</button>
            </div>
            <table class="pedido-table">
              <thead><tr><th>Quant</th><th>Produto</th></tr></thead>
              <tbody>
                ${catGroups
                  .map(
                    ([cat, items]) => `
                      <tr class="pedido-cat-row"><td colspan="2">${esc(cat)}</td></tr>
                      ${items
                        .map(
                          (p) => `
                            <tr>
                              <td class="pedido-qtd-cell">
                                <input type="number" min="0" step="1" placeholder="0"
                                  data-categoria="${esc(p.Categoria)}" data-produto="${esc(p.Nome)}">
                              </td>
                              <td>${esc(p.Nome)}</td>
                            </tr>
                          `
                        )
                        .join("")}
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
      )
      .join("");
  }

  els.pedidoLocaisTabelas.addEventListener("click", async (e) => {
    if (e.target.dataset.action !== "remove-local") return;
    const tabela = e.target.closest(".pedido-local-tabela");
    const id = tabela.dataset.localId;
    const nome = tabela.dataset.localNome;
    if (!confirm(`Remover o local "${nome}"? Pedidos já salvos não são afetados.`)) return;
    await withSync(async () => {
      await GoogleSync.deleteRow(GoogleSync.LOCAIS_SHEET, id);
      locais = locais.filter((l) => l.ID !== id);
      renderPedidoLocaisTabelas();
      showToast("Local removido.");
    });
  });

  els.btnSavePedidoCatalogo.addEventListener("click", async () => {
    const data = els.pedidoData.value || new Date().toISOString().slice(0, 10);
    const items = [];
    els.pedidoLocaisTabelas.querySelectorAll(".pedido-local-tabela").forEach((tabela) => {
      const local = tabela.dataset.localNome;
      tabela.querySelectorAll("input[data-produto]").forEach((inp) => {
        const qtd = Number(inp.value);
        if (qtd > 0) {
          items.push({
            Local: local,
            Categoria: inp.dataset.categoria === "Sem categoria" ? "" : inp.dataset.categoria,
            Produto: inp.dataset.produto,
            Quantidade: String(qtd)
          });
        }
      });
    });
    if (items.length === 0) {
      showToast("Preencha a quantidade de pelo menos um produto.", true);
      return;
    }

    await withSync(async () => {
      const novos = [];
      for (const item of items) {
        const row = { ID: GoogleSync.genId(), Data: data, ...item, CriadoEm: nowIso() };
        await GoogleSync.appendRow(GoogleSync.PEDIDOS_SHEET, row);
        novos.push(row);
      }
      pedidos.push(...novos);
      renderPedidos();
      closePedidoForm();
      const locaisUsados = new Set(novos.map((n) => n.Local)).size;
      showToast(`${novos.length} itens salvos em ${locaisUsados} local(is).`);
    });
  });

  function openPedidoForm() {
    els.formPedido.classList.add("open");
    els.pedidoPaste.value = "";
    els.pedidoData.value = new Date().toISOString().slice(0, 10);
    renderPedidoLocaisTabelas();
  }

  function closePedidoForm() {
    els.formPedido.classList.remove("open");
    els.formPedido.reset();
  }

  els.btnNewPedido.addEventListener("click", openPedidoForm);
  els.btnCancelPedido.addEventListener("click", closePedidoForm);

  els.btnImportPedido.addEventListener("click", async () => {
    const text = els.pedidoPaste.value;
    const items = parsePedidoText(text);
    if (items.length === 0) {
      showToast("Não consegui identificar itens nesse texto. Confira o formato e tente de novo.", true);
      return;
    }
    const data = els.pedidoData.value || new Date().toISOString().slice(0, 10);

    await withSync(async () => {
      const novos = [];
      for (const item of items) {
        const row = { ID: GoogleSync.genId(), Data: data, ...item, CriadoEm: nowIso() };
        await GoogleSync.appendRow(GoogleSync.PEDIDOS_SHEET, row);
        novos.push(row);
      }
      pedidos.push(...novos);
      renderPedidos();
      closePedidoForm();
      showToast(`${novos.length} itens importados.`);
    });
  });

  // ---------- Produtos ----------
  function renderProdutos() {
    if (produtos.length === 0) {
      els.produtoList.innerHTML = '<div class="empty-state">Nenhum produto cadastrado ainda.</div>';
      return;
    }
    const ordenados = [...produtos].sort((a, b) => {
      const catCmp = (a.Categoria || "").localeCompare(b.Categoria || "");
      return catCmp !== 0 ? catCmp : (a.Nome || "").localeCompare(b.Nome || "");
    });
    els.produtoList.innerHTML = ordenados
      .map(
        (p) => `
          <div class="card" data-id="${esc(p.ID)}">
            <div class="card-top">
              <p class="card-title">${esc(p.Nome)}</p>
            </div>
            ${p.Categoria ? `<div class="card-meta"><span class="badge" style="background:#334155;color:#cbd5e1">${esc(p.Categoria)}</span></div>` : ""}
            <div class="card-actions">
              <button class="secondary" data-action="edit-produto">Editar</button>
              <button class="danger" data-action="delete-produto">Excluir</button>
            </div>
          </div>
        `
      )
      .join("");
  }

  els.produtoList.addEventListener("click", async (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    const action = e.target.dataset.action;
    const produto = produtos.find((p) => p.ID === id);
    if (!produto) return;

    if (action === "edit-produto") {
      openProdutoForm(produto);
    } else if (action === "delete-produto") {
      if (!confirm(`Excluir o produto "${produto.Nome}"?`)) return;
      await withSync(async () => {
        await GoogleSync.deleteRow(GoogleSync.PRODUTOS_SHEET, id);
        produtos = produtos.filter((p) => p.ID !== id);
        renderProdutos();
        showToast("Produto excluído.");
      });
    }
  });

  function openProdutoForm(produto) {
    closeProdutosBulkForm();
    els.formProduto.classList.add("open");
    els.produtoPaste.value = "";
    document.getElementById("produto-id").value = produto ? produto.ID : "";
    document.getElementById("produto-nome").value = produto ? produto.Nome : "";
    document.getElementById("produto-categoria").value = produto ? produto.Categoria : "";
    document.getElementById("produto-nome").focus();
  }

  function closeProdutoForm() {
    els.formProduto.classList.remove("open");
    els.formProduto.reset();
  }

  els.btnNewProduto.addEventListener("click", () => openProdutoForm(null));
  els.btnCancelProduto.addEventListener("click", closeProdutoForm);

  els.btnParseProduto.addEventListener("click", () => {
    const text = els.produtoPaste.value;
    if (!text.trim()) {
      showToast("Cole o texto antes de preencher.", true);
      return;
    }
    const parsed = parsePastedProduto(text);
    if (parsed.Nome) document.getElementById("produto-nome").value = parsed.Nome;
    if (parsed.Categoria) document.getElementById("produto-categoria").value = parsed.Categoria;
    showToast("Campos preenchidos — confira e clique em Salvar produto.");
  });

  els.formProduto.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("produto-id").value;
    const data = {
      Nome: document.getElementById("produto-nome").value.trim(),
      Categoria: document.getElementById("produto-categoria").value.trim()
    };
    if (!data.Nome) return;

    await withSync(async () => {
      if (id) {
        await GoogleSync.updateRow(GoogleSync.PRODUTOS_SHEET, id, data);
        const existing = produtos.find((p) => p.ID === id);
        Object.assign(existing, data);
      } else {
        const newProduto = { ID: GoogleSync.genId(), ...data, CriadoEm: nowIso() };
        await GoogleSync.appendRow(GoogleSync.PRODUTOS_SHEET, newProduto);
        produtos.push(newProduto);
      }
      renderProdutos();
      closeProdutoForm();
      showToast("Produto salvo.");
    });
  });

  function openProdutosBulkForm() {
    closeProdutoForm();
    els.formProdutosBulk.classList.add("open");
    els.produtosBulkPaste.value = "";
  }

  function closeProdutosBulkForm() {
    els.formProdutosBulk.classList.remove("open");
    els.formProdutosBulk.reset();
  }

  els.btnBulkProdutos.addEventListener("click", openProdutosBulkForm);
  els.btnCancelProdutosBulk.addEventListener("click", closeProdutosBulkForm);

  els.btnImportProdutosBulk.addEventListener("click", async () => {
    const text = els.produtosBulkPaste.value;
    const items = parseProdutosBulkText(text);
    if (items.length === 0) {
      showToast("Não consegui identificar produtos nesse texto. Confira o formato e tente de novo.", true);
      return;
    }

    const existeChave = new Set(
      produtos.map((p) => normalizeKey(p.Nome) + "||" + normalizeKey(p.Categoria || ""))
    );
    const novosItens = [];
    const vistos = new Set();
    for (const item of items) {
      const chave = normalizeKey(item.Nome) + "||" + normalizeKey(item.Categoria || "");
      if (existeChave.has(chave) || vistos.has(chave)) continue;
      vistos.add(chave);
      novosItens.push(item);
    }
    const duplicados = items.length - novosItens.length;

    if (novosItens.length === 0) {
      showToast("Todos os produtos desse texto já estavam cadastrados.", true);
      return;
    }

    await withSync(async () => {
      const novos = [];
      for (const item of novosItens) {
        const row = { ID: GoogleSync.genId(), ...item, CriadoEm: nowIso() };
        await GoogleSync.appendRow(GoogleSync.PRODUTOS_SHEET, row);
        novos.push(row);
      }
      produtos.push(...novos);
      renderProdutos();
      closeProdutosBulkForm();
      showToast(
        `${novos.length} produtos importados` + (duplicados > 0 ? ` (${duplicados} já existiam e foram ignorados).` : ".")
      );
    });
  });

  // ---------- Util ----------
  async function withSync(fn) {
    if (syncBusy) {
      showToast("Aguarde, sincronizando...", true);
      return;
    }
    syncBusy = true;
    try {
      setSyncStatus("Sincronizando...");
      await fn();
      setSyncStatus("Sincronizado às " + new Date().toLocaleTimeString("pt-BR"));
    } catch (e) {
      setSyncStatus("Falha ao sincronizar.");
      showToast(e.message === "NEED_LOGIN" ? "Sua sessão expirou. Entre novamente." : e.message, true);
      if (e.message === "NEED_LOGIN") refreshAuthUI();
    } finally {
      syncBusy = false;
    }
  }

  // ---------- Inicialização ----------
  (async function boot() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
    try {
      await GoogleSync.init();
    } catch (e) {
      setSyncStatus("Erro ao iniciar login do Google: " + e.message);
    }
    refreshAuthUI();
    if (GoogleSync.isSignedIn()) {
      await loadAll();
    } else {
      setSyncStatus("Entre com sua conta Google para ver e sincronizar seus dados.");
    }
  })();
})();
