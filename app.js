/* =========================================================
    CONSTANTS & GLOBALS
    ========================================================= */
const STORAGE_KEY = "educonnect_dados_v1";

// Modal and Form Selectors
const modalContainer = document.getElementById("modal-container");
const form = document.getElementById("cadastro-form");
const modalProgressoContainer = document.getElementById("modal-progresso-container");
const progressoForm = document.getElementById("progresso-form");
const conteudoContainer = document.getElementById("conteudo");
const calendarContainer = document.getElementById("calendar-container");

// Calendar Detail Modal Selectors
const modalDetalhesContainer = document.getElementById("modal-detalhes-container");
const detalhesLista = document.getElementById("detalhes-lista");

// Filter and Category Selectors
const filtroCategoriaSelect = document.getElementById("filtro-categoria");
const datalistSugestoes = document.getElementById("categorias-sugestoes");
const searchInput = document.getElementById("search");


/* =========================================================
    INITIAL DATA (Seed)
    ========================================================= */
const seedData = [
  {
    id: 1,
    titulo: "Planejar horário de estudo",
    categoria: "Organização",
    data: "2025-12-16",
    descricao: "Definir blocos de 25 min (Pomodoro) para matérias principais",
    curtidas: 3,
    horasEstudadas: 1.5,
    conteudoVisto: "Introdução e cronograma",
    finalizadoEm: null,
  },
  {
    id: 2,
    titulo: "Revisão: Física - Cinemática",
    categoria: "Física",
    data: "2025-12-19",
    descricao: "Revisar conceitos de movimento uniforme e acelerado",
    curtidas: 1,
    horasEstudadas: 0,
    conteudoVisto: "",
    finalizadoEm: null,
  },
  {
    id: 3,
    titulo: "Lista de exercícios: Álgebra",
    categoria: "Matemática",
    data: "2025-12-16",
    descricao: "Resolver 20 questões de polinômios e equações",
    curtidas: 0,
    horasEstudadas: 0,
    conteudoVisto: "",
    finalizadoEm: null,
  },
];

/* =========================================================
    STATE
    ========================================================= */
let dados = [];
let categoriasUnicas = []; 
let filtroBusca = "";
let filtroCategoria = "all";
let ordemAtual = "none";
let itemEditando = null;
let itemProgressoAtual = null;
let dataDetalheAtual = null;
let dataCalendarioAtual = new Date(); // Stores current calendar month state


/* =========================================================
    STORAGE
    ========================================================= */
function salvarDados() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch (err) {
    console.error("Storage save error:", err);
  }
}

function carregarDados() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      dados = [...seedData];
      salvarDados();
    } else {
      const parsed = JSON.parse(raw);
      // Ensure new progress fields exist on loaded items
      dados = Array.isArray(parsed) ? parsed.map(item => ({
        horasEstudadas: 0,
        conteudoVisto: "",
        finalizadoEm: null,
        ...item,
      })) : [...seedData];
    }
  } catch (err) {
    dados = [...seedData];
  }
}

/* =========================================================
    DATA OPERATIONS
    ========================================================= */
function gerarId() {
  const max = dados.reduce((acc, it) => (it.id > acc ? it.id : acc), 0);
  return max + 1;
}

function dispararRenderizacoes() {
  salvarDados();
  
  // Update dynamic list of categories after data change
  atualizarCategoriasUnicas();

  renderizarLista();
  renderizarDashboard();
  
  // Update calendar if active
  if (document.getElementById('view-calendario').classList.contains('active')) {
    renderizarCalendario(dataCalendarioAtual); 
  }
  // Update details modal if open
  if (!modalDetalhesContainer.classList.contains('hidden') && dataDetalheAtual) {
    renderizarDetalhesAtividades(dataDetalheAtual);
  }
}

function adicionarLike(id) {
  const item = dados.find((d) => d.id === id);
  if (!item) return;
  item.curtidas += 1;
  dispararRenderizacoes();
}

function excluirItem(id) {
  dados = dados.filter((d) => d.id !== id);
  dispararRenderizacoes(); 
}

function adicionarItem({ titulo, categoria, data, descricao }) {
  const novo = {
    id: gerarId(),
    titulo: titulo.trim(),
    categoria: categoria.trim(),
    data: data || new Date().toISOString().slice(0, 10),
    descricao: descricao.trim(),
    curtidas: 0,
    horasEstudadas: 0,
    conteudoVisto: "",
    finalizadoEm: null,
  };

  dados.push(novo);
  dispararRenderizacoes(); 
}

function atualizarItem(id, dadosAtualizados) {
  const item = dados.find((d) => d.id === id);
  if (!item) return;

  item.titulo = dadosAtualizados.titulo.trim();
  item.categoria = dadosAtualizados.categoria.trim();
  item.data = dadosAtualizados.data;
  item.descricao = dadosAtualizados.descricao.trim();

  dispararRenderizacoes(); 
}

function atualizarProgressoItem(id, dadosAtualizados) {
  const item = dados.find((d) => d.id === id);
  if (!item) return;

  item.horasEstudadas = parseFloat(dadosAtualizados.horasEstudadas);
  item.conteudoVisto = dadosAtualizados.conteudoVisto.trim();
  item.finalizadoEm = dadosAtualizados.finalizadoEm || null;

  dispararRenderizacoes();
}

/* =========================================================
    CATEGORY & FILTER LOGIC
    ========================================================= */

/**
 * 1. Creates the unique and sorted list of categories.
 */
function atualizarCategoriasUnicas() {
    const novasCategorias = new Set();
    
    dados.forEach(item => {
        if (item.categoria) {
            novasCategorias.add(item.categoria.trim()); 
        }
    });

    categoriasUnicas = Array.from(novasCategorias).filter(cat => cat).sort();
    
    // Rebuild the filter and datalist immediately after updating
    reconstruirFiltrosECategorias();
}

/**
 * 2. Rebuilds the filter <select> and modal <datalist>.
 */
function reconstruirFiltrosECategorias() {
    if (!filtroCategoriaSelect) return;

    const categoriaSelecionada = filtroCategoriaSelect.value;
    filtroCategoriaSelect.innerHTML = ''; // Clear existing options
    
    // A. Add default "Todas Categorias" option
    const defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent = 'Todas Categorias';
    filtroCategoriaSelect.appendChild(defaultOption);

    // B. Add each unique category as a new option
    categoriasUnicas.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filtroCategoriaSelect.appendChild(option);
    });

    // C. Maintain previously selected filter or revert to 'all'
    if (categoriasUnicas.includes(categoriaSelecionada)) {
        filtroCategoriaSelect.value = categoriaSelecionada;
        filtroCategoria = categoriaSelecionada;
    } else {
        filtroCategoriaSelect.value = 'all';
        filtroCategoria = 'all';
    }


    // D. Rebuild Datalist (For Suggestions in Modal)
    if (datalistSugestoes) {
        datalistSugestoes.innerHTML = ''; 

        categoriasUnicas.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            datalistSugestoes.appendChild(option);
        });
    }
}

/* =========================================================
    DASHBOARD LOGIC
    ========================================================= */

function calcularEstatisticas() {
    const totalItens = dados.length;
    const itensConcluidos = dados.filter(item => !!item.finalizadoEm).length;
    const totalHoras = dados.reduce((soma, item) => soma + (item.horasEstudadas || 0), 0);
    
    // Count the most frequent category
    const contagemCategorias = dados.reduce((acc, item) => {
        acc[item.categoria] = (acc[item.categoria] || 0) + 1;
        return acc;
    }, {});
    
    let categoriaMaisFrequente = "N/A";
    let maxContagem = 0;
    
    for (const cat in contagemCategorias) {
        if (contagemCategorias[cat] > maxContagem) {
            maxContagem = contagemCategorias[cat];
            categoriaMaisFrequente = cat;
        }
    }
    
    return {
        totalItens,
        itensConcluidos,
        totalHoras: totalHoras.toFixed(1), 
        categoriaMaisFrequente,
    };
}

function renderizarDashboard() {
    const stats = calcularEstatisticas();
    
    const statTotal = document.getElementById("stat-total"); 
    const statConcluidos = document.getElementById("stat-concluidos"); 
    const statHoras = document.getElementById("stat-horas"); 
    const statFrequente = document.getElementById("stat-frequente");

    if (statTotal) statTotal.textContent = stats.totalItens;
    if (statConcluidos) statConcluidos.textContent = stats.itensConcluidos; 
    if (statHoras) statHoras.textContent = stats.totalHoras; 
    if (statFrequente) statFrequente.textContent = stats.categoriaMaisFrequente; 
}

/* =========================================================
    MODAL HANDLERS (Creation/Edit and Progress)
    ========================================================= */

// Unified function to open/close modals
function toggleModal(container, isVisible, item = null) {
    if (!container) return;
    container.classList.toggle("hidden", !isVisible);
    
    if (container === modalContainer) {
        // Auto-focus on Title when opening
        if (isVisible) {
            document.getElementById("titulo").focus(); 
        }
        
        const modalTitle = document.getElementById("modal-title");

        if (isVisible && item) {
            modalTitle.textContent = "Editar Item";
            document.getElementById("titulo").value = item.titulo;
            document.getElementById("categoria").value = item.categoria;
            document.getElementById("data").value = item.data;
            document.getElementById("descricao").value = item.descricao;
            itemEditando = item; 
        } else if (isVisible) {
            modalTitle.textContent = "Novo Item de Estudo";
            if(form) form.reset();
            document.getElementById("data").value = new Date().toISOString().slice(0, 10);
            itemEditando = null;
        } else {
            if(form) form.reset();
            itemEditando = null;
        }
    }
    
    if (container === modalProgressoContainer && isVisible && item) {
        // Specific logic for Progress Modal
        itemProgressoAtual = item;
        document.getElementById("progresso-title").textContent = `Progresso: ${item.titulo}`;
        document.getElementById("progresso-item-id").value = item.id;
        document.getElementById("horas-estudadas").value = item.horasEstudadas || 0;
        document.getElementById("conteudo-visto").value = item.conteudoVisto || "";
        document.getElementById("finalizado-em-data").value = item.finalizadoEm || "";

        const statusElement = document.querySelector("#modal-progresso-container .finalizado-status");
        if (statusElement) {
          statusElement.textContent = item.finalizadoEm ? `Item concluído em ${formatDate(item.finalizadoEm)}.` : "Ainda pendente.";
        }
    } else if (container === modalProgressoContainer && !isVisible) {
        itemProgressoAtual = null;
        if(progressoForm) progressoForm.reset();
    }
}

// Public opening functions
function abrirModal(modo = "criar", item = null) {
    toggleModal(modalContainer, true, item);
}

function fecharModal() {
    toggleModal(modalContainer, false);
}

function abrirModalProgresso(item) {
    toggleModal(modalProgressoContainer, true, item);
}

function fecharModalProgresso() {
    toggleModal(modalProgressoContainer, false);
}

/* =========================================================
    MODAL HANDLERS (Calendar Details)
    ========================================================= */

function toggleModalDetalhes(isVisible, dataStr = null) {
    if (!modalDetalhesContainer) return;
    modalDetalhesContainer.classList.toggle("hidden", !isVisible);
    
    if (isVisible && dataStr) {
        dataDetalheAtual = dataStr;
        document.getElementById("detalhes-title").textContent = `Atividades em ${formatDate(dataStr)}`;
        renderizarDetalhesAtividades(dataStr);
    } else {
        dataDetalheAtual = null;
    }
}

function abrirModalDetalhes(dataStr) {
    toggleModalDetalhes(true, dataStr);
}

function fecharModalDetalhes() {
    toggleModalDetalhes(false);
}


function setupModalListeners() {
    // Listener for 'Add New' button
    const btnNew = document.getElementById("btn-new-item");
    if (btnNew) btnNew.addEventListener("click", () => abrirModal("criar"));

    // Overlay click events to close (Creation/Edit)
    if (modalContainer) {
        modalContainer.addEventListener("click", (e) => {
            if (e.target === modalContainer || e.target.closest(".btn-close-modal") || e.target.classList.contains("btn-cancel")) fecharModal();
        });
        document.querySelectorAll('#modal-container .btn-close-modal').forEach(btn => btn.addEventListener('click', fecharModal));
        document.querySelectorAll('#modal-container .btn-cancel').forEach(btn => btn.addEventListener('click', fecharModal));
    }

    // Overlay click events to close (Progress)
    if (modalProgressoContainer) {
        modalProgressoContainer.addEventListener("click", (e) => {
             if (e.target === modalProgressoContainer || e.target.closest("#btn-close-progresso")) fecharModalProgresso();
        });
        document.querySelectorAll('#modal-progresso-container .btn-close-modal').forEach(btn => btn.addEventListener('click', fecharModalProgresso));
    }
    
    // Overlay click events to close (Calendar Details)
    if (modalDetalhesContainer) {
        modalDetalhesContainer.addEventListener("click", (e) => {
            if (e.target === modalDetalhesContainer || e.target.closest("#btn-close-detalhes")) fecharModalDetalhes();
        });
        document.querySelectorAll('#modal-detalhes-container .btn-close-modal').forEach(btn => btn.addEventListener('click', fecharModalDetalhes));
    }
}

function setupProgressoForm() {
    if (!progressoForm) return;

    // Submission Listener
    progressoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const id = parseInt(document.getElementById("progresso-item-id").value);
        const horas = document.getElementById("horas-estudadas").value;
        const conteudo = document.getElementById("conteudo-visto").value;
        const dataFinal = document.getElementById("finalizado-em-data").value;

        if (id) {
            atualizarProgressoItem(id, {
                horasEstudadas: horas,
                conteudoVisto: conteudo,
                finalizadoEm: dataFinal,
            });
            fecharModalProgresso();
        }
    });

    // "Mark as Completed" Listener
    const btnConcluido = document.getElementById("btn-marcar-concluido");
    if (btnConcluido) {
        btnConcluido.addEventListener("click", () => {
            const dataFinalElement = document.getElementById("finalizado-em-data");
            
            if (dataFinalElement) {
                const today = new Date().toISOString().slice(0, 10);
                dataFinalElement.value = today;
            }

            progressoForm.dispatchEvent(new Event('submit'));
        });
    }
}

function setupForm() {
    const msg = document.getElementById("form-msg");
    if (!form) return;

    // Internal function to display messages
    const showMessage = (text, type) => {
        if(!msg) return;
        msg.textContent = text;
        msg.style.color = type === "success" ? "var(--primary-color)" : "red";
    };

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const titulo = document.getElementById("titulo").value.trim();
        const categoria = document.getElementById("categoria").value.trim();
        const data = document.getElementById("data").value;
        const descricao = document.getElementById("descricao").value.trim();

        if (titulo.length < 3) return showMessage("Título deve ter min. 3 caracteres", "error");
        
        if (itemEditando) {
            atualizarItem(itemEditando.id, { titulo, categoria, data, descricao });
            showMessage("Item atualizado!", "success");
        } else {
            adicionarItem({ titulo, categoria, data, descricao });
            showMessage("Item criado!", "success");
        }

        setTimeout(() => {
            fecharModal();
            if(msg) msg.textContent = ""; 
        }, 1000);
    });
}

/* =========================================================
    CARD FACTORY
    ========================================================= */

// Helper function to calculate simple progress percentage based on hours
function calcularProgresso(item) {
    if (item.finalizadoEm) return 100;
    // Simple progress: 1h registered = 25% (visual feedback only)
    const maxHorasParaBarra = 4;
    const prog = Math.min(item.horasEstudadas / maxHorasParaBarra * 100, 99);
    return Math.floor(prog);
}

function criarCard(item) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.id = item.id;
  
  const isFinished = !!item.finalizadoEm; 
  const progresso = calcularProgresso(item); 
  const progressClass = isFinished ? 'progress-finished' : (progresso > 0 ? 'progress-in-progress' : 'progress-pending');

  card.innerHTML = `
    <header class="card-head">
      <span class="badge-category">${escapeHtml(item.categoria)}</span>
      <h3 class="card-title">${escapeHtml(item.titulo)}</h3>
      <div class="card-date">
        <span class="icon">📅</span>
        <span>${formatDate(item.data)}</span>
        ${isFinished ? `<span class="badge-finished">✅ Concluído</span>` : ''} 
      </div>
    </header>
    
    <div class="card-body">
      <p class="card-desc">${escapeHtml(item.descricao)}</p>
      
      <div class="progress-bar-container">
        <div class="progress-bar ${progressClass}" style="width: ${progresso}%;"></div>
      </div>
      <p class="card-progress-info">
        Horas Registradas: <strong>${item.horasEstudadas || 0}h</strong>
      </p>
    </div>

    <footer class="card-foot">
      <div class="likes">
        <button class="btn-like-icon" data-id="${item.id}">❤️</button>
        <strong class="likes-count">${item.curtidas}</strong>
      </div>

      <div class="actions">
        <button class="btn-secondary btn-progress" data-id="${item.id}">Progresso</button> 
        <button class="btn-edit">Edit</button>
        <button class="btn-delete" data-id="${item.id}">Del</button>
      </div>
    </footer>
  `;

  // LIKE Listener
  const btnLike = card.querySelector(".btn-like-icon");
  btnLike.addEventListener("click", () => {
    adicionarLike(item.id);
    btnLike.classList.add('liked-effect');
    setTimeout(() => btnLike.classList.remove('liked-effect'), 500);
  });
  
  // DELETE Listener with Confirmation
  const btnDelete = card.querySelector(".btn-delete");
  btnDelete.addEventListener("click", function handler() {
    const itemId = parseInt(this.dataset.id);

    if (this.classList.contains('confirming-delete')) {
      // Second click: Delete
      excluirItem(itemId);
    } else {
      // First click: Request confirmation
      this.textContent = "Confirmar?";
      this.classList.add('confirming-delete');
      // Timeout to reset if user doesn't click again
      setTimeout(() => {
        this.textContent = "Del";
        this.classList.remove('confirming-delete');
      }, 3000); 
    }
  });


  card.querySelector(".btn-progress").addEventListener("click", () => {
    const fullItem = dados.find(d => d.id === item.id);
    if(fullItem) abrirModalProgresso(fullItem);
  });
  
  card.querySelector(".btn-edit").addEventListener("click", () => {
    const fullItem = dados.find(d => d.id === item.id);
    if(fullItem) abrirModal("editar", fullItem);
  });

  return card;
}


/* =========================================================
    RENDERER
    ========================================================= */
function limpar(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

function obterListaFiltrada() {
  return dados
    .filter((it) => escapeHtml(it.titulo.toLowerCase()).includes(filtroBusca.toLowerCase()))
    .filter((it) => filtroCategoria === "all" ? true : it.categoria === filtroCategoria) 
    .sort((a, b) => {
      if (ordemAtual === "titulo") return a.titulo.localeCompare(b.titulo);
      if (ordemAtual === "data") return new Date(a.data) - new Date(b.data);
      if (ordemAtual === "curtidas") return b.curtidas - a.curtidas;
      return 0;
    });
}

function renderizarLista() {
  if (!conteudoContainer) return;

  limpar(conteudoContainer);
  const lista = obterListaFiltrada();

  if (!lista.length) {
    // Ensure the empty message appears correctly
    conteudoContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Nenhum item encontrado.</p>`;
    return;
  }

  // Create the grid if there are items
  const grid = document.createElement("div");
  grid.className = "cards-grid";
  lista.forEach((item) => grid.appendChild(criarCard(item)));
  conteudoContainer.appendChild(grid);
}

/* =========================================================
    FILTERS AND SEARCH
    ========================================================= */
function setupFiltros() {
  // Uses global searchInput and filtroCategoriaSelect

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filtroBusca = e.target.value;
      renderizarLista();
    });
  }

  if (filtroCategoriaSelect) {
    filtroCategoriaSelect.addEventListener("change", (e) => {
      filtroCategoria = e.target.value;
      renderizarLista();
    });
  }
  
  // Sorting listeners refactor
  const sortButtons = document.querySelectorAll('.sort-buttons button');
  sortButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove 'active' class from all buttons and add to the clicked one
        sortButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (btn.id === "sort-az") ordemAtual = "titulo";
        else if (btn.id === "sort-date") ordemAtual = "data";
        else if (btn.id === "sort-likes") ordemAtual = "curtidas";
        else ordemAtual = "none";
        
        renderizarLista();
    });
  });
}

/* =========================================================
    CALENDAR LOGIC
    ========================================================= */

function getAtividadesPorData() {
    const atividades = {};
    dados.forEach(item => {
        const dataKey = item.data; 
        if (!atividades[dataKey]) atividades[dataKey] = [];
        atividades[dataKey].push(item);
    });
    return atividades;
}

function renderizarCalendario(dataBase = new Date()) {
    if (!calendarContainer) return;
    calendarContainer.innerHTML = ''; 
    
    dataCalendarioAtual = dataBase; 

    const atividadesPorData = getAtividadesPorData();
    const hoje = new Date();
    const ano = dataBase.getFullYear();
    const mes = dataBase.getMonth(); 
    
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0).getDate(); 
    let diaDaSemana = primeiroDia.getDay(); 

    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    
    // --- Calendar Header ---
    const header = document.createElement('div');
    header.className = 'calendar-header';
    header.innerHTML = `
        <button id="btn-prev-month" class="btn-secondary">&lt;</button>
        <h3>${nomesMeses[mes]} de ${ano}</h3>
        <button id="btn-next-month" class="btn-secondary">&gt;</button>
    `;
    calendarContainer.appendChild(header);

    // --- Calendar Grid ---
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    // 1. Weekday Names Row
    nomesDias.forEach(nome => {
        const diaNome = document.createElement('div');
        diaNome.className = 'calendar-day-name';
        diaNome.textContent = nome;
        grid.appendChild(diaNome);
    });

    // 2. Fill with empty days
    for (let i = 0; i < diaDaSemana; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        grid.appendChild(emptyDay);
    }
    
    // 3. Fill with days of the month
    for (let dia = 1; dia <= ultimoDia; dia++) {
        const dataAtualStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const hasActivity = atividadesPorData[dataAtualStr];
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = dia;
        dayElement.dataset.date = dataAtualStr; 

        const isToday = ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate();
        if (isToday) dayElement.classList.add('today');
        
        if (hasActivity) {
            dayElement.classList.add('has-activity');
            dayElement.title = hasActivity.map(a => a.titulo).join('\n');
            
            // Listener to open details modal
            dayElement.addEventListener('click', () => abrirModalDetalhes(dataAtualStr));
        }

        grid.appendChild(dayElement);
        diaDaSemana++;
    }

    calendarContainer.appendChild(grid);
    
    // --- Calendar Navigation ---
    document.getElementById('btn-prev-month').addEventListener('click', () => {
        renderizarCalendario(new Date(ano, mes - 1, 1));
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
        renderizarCalendario(new Date(ano, mes + 1, 1));
    });
}

/* =========================================================
    CALENDAR DETAIL LOGIC
    ========================================================= */

function renderizarDetalhesAtividades(dataStr) {
    if (!detalhesLista) return;
    limpar(detalhesLista);
    
    // Filter and sort activities for the selected date
    const atividades = dados
        .filter(item => item.data === dataStr)
        .sort((a, b) => a.titulo.localeCompare(b.titulo));
    
    if (atividades.length === 0) {
        detalhesLista.innerHTML = `<p>Nenhuma atividade agendada para esta data.</p>`;
        return;
    }

    atividades.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "detalhe-item";

        itemEl.innerHTML = `
            <h4>${escapeHtml(item.titulo)}</h4>
            <p>Categoria: <strong>${escapeHtml(item.categoria)}</strong></p>
            <p class="detalhe-item-desc">${escapeHtml(item.descricao)}</p>
            <div class="detalhe-item-footer">
                <span class="detalhe-progresso">Horas: ${item.horasEstudadas || 0}h</span>
                ${item.finalizadoEm ? '<span class="detalhe-concluido">✅ Concluído</span>' : '<span class="detalhe-pendente">⏳ Pendente</span>'}
            </div>
            <button class="btn-secondary btn-small btn-open-progresso" data-id="${item.id}">Ver Progresso</button>
        `;
        
        // Listener to open progress modal (reusing existing function)
        itemEl.querySelector(".btn-open-progresso").addEventListener("click", () => {
            const fullItem = dados.find(d => d.id === item.id);
            if (fullItem) {
                fecharModalDetalhes(); 
                abrirModalProgresso(fullItem); 
            }
        });
        
        detalhesLista.appendChild(itemEl);
    });
}

/* =========================================================
    HELPERS
    ========================================================= */
function escapeHtml(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
  if (!dateStr) return dateStr;
  const partes = dateStr.split('-'); 
  if (partes.length !== 3) return dateStr; 

  const year = parseInt(partes[0]);
  const month = parseInt(partes[1]) - 1; 
  const day = parseInt(partes[2]);

  const d = new Date(year, month, day);

  if (isNaN(d.getTime())) return dateStr; 
  
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0"); 
  const yy = d.getFullYear();
  
  return `${dd}/${mm}/${yy}`;
}

/* =========================================================
    NAVIGATION (SPA)
    ========================================================= */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // 1. Update navigation state (buttons)
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 2. Control view visibility
      const targetId = btn.getAttribute('data-target');
      
      views.forEach(v => {
        const isTarget = v.id === targetId;
        
        v.classList.remove('active');
        v.classList.toggle('hidden', !isTarget);
        
        if (isTarget) {
            v.classList.add('active');
        }
      });
      
      // 3. Trigger specific rendering 
      if (targetId === 'view-calendario') {
          renderizarCalendario(dataCalendarioAtual); 
      } else if (targetId === 'view-dashboard') {
          renderizarDashboard();
      } else if (targetId === 'view-estudos') {
          // Ensure list is rendered with current filters upon entry
          renderizarLista();
      }
    });
  });
}

/* =========================================================
    INITIALIZATION
    ========================================================= */
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return; 

  const saved = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (systemPrefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', initial);
  // Uses .theme-icon selector to update content
  const icon = btn.querySelector('.theme-icon');
  if (icon) icon.textContent = initial === 'dark' ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    if (icon) icon.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}
    
document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  initThemeToggle();
  
  // Initialize category list and rebuild filters
  atualizarCategoriasUnicas(); 
  
  setupModalListeners(); 
  setupProgressoForm();
  setupForm();
  
  setupNavigation();
  setupFiltros();
  
  // Render study list and initial dashboard
  renderizarLista();
  renderizarDashboard(); 
});