// =====================================================
// VMLI Idiomas — app.js
// =====================================================

// ============================================================
// 1. CONFIG — troque pelas suas credenciais Supabase
// ============================================================
const SUPABASE_URL  = 'https://pahitjvmtaqdabuzozuf.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaGl0anZtdGFxZGFidXpvenVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDA2MTcsImV4cCI6MjA5NDk3NjYxN30.Kz0HlXEB6PSrNf6mrWZ86O_nkXkNm_4O88dtErRo-98';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// 2. ESTADO GLOBAL
// ============================================================
let user    = null;   // auth user
let profile = null;   // profile row
let activeTab = '';
const _D = {};        // cache de dados para modais

const MONTHS = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const NAV = {
  professor: [
    { id:'dashboard',        icon:'🏠', label:'Dashboard' },
    { id:'minhas-turmas',    icon:'📚', label:'Minhas Turmas' },
    { id:'marcar-presenca',  icon:'✅', label:'Marcar Presença' },
    { id:'historico',        icon:'📋', label:'Histórico' },
    { id:'eventos',          icon:'📅', label:'Eventos' },
    { id:'financeiro',       icon:'💰', label:'Financeiro' },
    { id:'membros',          icon:'🎬', label:'Área de Membros' },
  ],
  aluno: [
    { id:'membros',     icon:'🎬', label:'Área de Membros' },
    { id:'minha-conta', icon:'👤', label:'Minha conta' },
  ],
  admin: [
    { id:'dashboard',     icon:'🏠', label:'Dashboard' },
    { id:'alunos',        icon:'🎓', label:'Alunos' },
    { id:'cobrancas',     icon:'💳', label:'Pagamentos de Alunos' },
    { id:'crm',           icon:'🎯', label:'CRM' },
    { id:'membros',       icon:'🎬', label:'Área de Membros' },
    { id:'experimentais', icon:'🔬', label:'Experimentais' },
    { id:'turmas',        icon:'📚', label:'Turmas' },
    { id:'professores',   icon:'👨‍🏫', label:'Professores' },
    { id:'servicos',      icon:'🛠️', label:'Serviços' },
    { id:'eventos',       icon:'📅', label:'Eventos' },
    { id:'financeiro',    icon:'💰', label:'Financeiro (Professores)' },
    { id:'usuarios',      icon:'🔐', label:'Usuários & Permissões' },
  ],
  secretaria: [
    { id:'dashboard',     icon:'🏠', label:'Dashboard' },
    { id:'alunos',        icon:'🎓', label:'Alunos' },
    { id:'cobrancas',     icon:'💳', label:'Pagamentos de Alunos' },
    { id:'crm',           icon:'🎯', label:'CRM' },
    { id:'membros',       icon:'🎬', label:'Área de Membros' },
    { id:'experimentais', icon:'🔬', label:'Experimentais' },
    { id:'turmas',        icon:'📚', label:'Turmas' },
    { id:'eventos',       icon:'📅', label:'Eventos' },
  ],
  financeiro: [
    { id:'dashboard',  icon:'🏠', label:'Dashboard' },
    { id:'alunos',     icon:'🎓', label:'Alunos' },
    { id:'cobrancas',  icon:'💳', label:'Pagamentos de Alunos' },
    { id:'crm',        icon:'🎯', label:'CRM' },
    { id:'membros',    icon:'🎬', label:'Área de Membros' },
    { id:'eventos',    icon:'📅', label:'Eventos' },
    { id:'financeiro', icon:'💰', label:'Financeiro (Professores)' },
  ],
};
// Itens de menu que dependem de permissão (ver seção 20 — PERMISSÕES)
const NAV_PERM = { alunos:'alunos_ver', cobrancas:'pagamentos_ver', crm:'crm_ver', membros:'membros_ver', usuarios:'__admin' };
function navAllowed(id) {
  if (profile?.role === 'aluno') return ['membros','minha-conta'].includes(id);
  const p = NAV_PERM[id];
  if (!p) return true;
  if (p === '__admin') return profile?.role === 'admin';
  return can(p);
}

// ============================================================
// 3. INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    await loadProfile(session.user);
    if (profile) showApp(); else showLogin();
  } else {
    showLogin();
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { user = null; profile = null; showLogin(); }
  });

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('forgot-btn').addEventListener('click', handleForgotPassword);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
});

async function loadProfile(authUser) {
  user = authUser;
  const { data } = await db.from('profiles').select('*').eq('id', authUser.id).single();
  profile = data;
}

// ============================================================
// 4. AUTH
// ============================================================
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-btn').textContent = 'Entrar';
  document.getElementById('login-btn').disabled = false;
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  buildNav();

  const initials = profile?.name?.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || '?';
  document.getElementById('sidebar-user').innerHTML = `
    <div class="user-avatar">${initials}</div>
    <div>
      <div class="user-name">${profile?.name || 'Usuário'}</div>
      <div class="user-role">${getRoleLabel(profile?.role)}</div>
    </div>`;

  const rb = document.getElementById('role-badge');
  rb.textContent = getRoleLabel(profile?.role);
  rb.className = `role-badge role-${profile?.role}`;

  showTab(profile?.role === 'aluno' ? 'membros' : 'dashboard');
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  btn.textContent = 'Entrando…'; btn.disabled = true;

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    showToast('Email ou senha incorretos', 'error');
    btn.textContent = 'Entrar'; btn.disabled = false;
    return;
  }
  await loadProfile(data.user);
  if (profile) showApp();
  else { showToast('Perfil não encontrado. Contate o administrador.', 'error'); btn.textContent='Entrar'; btn.disabled=false; }
}

async function handleLogout() {
  await db.auth.signOut();
}

async function handleForgotPassword() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showToast('Digite seu email primeiro', 'error'); return; }
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  });
  if (error) showToast('Erro ao enviar email', 'error');
  else showToast('Email de recuperação enviado!', 'success');
}

// ============================================================
// 5. NAVEGAÇÃO
// ============================================================
function buildNav() {
  const items = [...(NAV[profile?.role] || [])].filter(i => navAllowed(i.id));
  if (!items.some(i => i.id === 'minha-conta')) items.push({ id:'minha-conta', icon:'👤', label:'Minha conta' });
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = items.map(i =>
    `<a href="#" class="nav-item" data-tab="${i.id}">
       <span class="nav-icon">${i.icon}</span><span>${i.label}</span>
     </a>`
  ).join('');
  nav.querySelectorAll('.nav-item').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); showTab(el.dataset.tab); closeSidebar(); })
  );
}

function showTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tab)
  );
  const allItems = Object.values(NAV).flat();
  const item = allItems.find(i => i.id === tab);
  document.getElementById('page-title').textContent = item?.label || '';
  if (NAV_PERM[tab] && !navAllowed(tab)) { semPermissao(); return; }
  document.getElementById('content').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  switch (tab) {
    case 'dashboard':       renderDashboard();      break;
    case 'minhas-turmas':   renderMinhasTurmas();   break;
    case 'marcar-presenca': renderMarcarPresenca(); break;
    case 'historico':       renderHistorico();      break;
    case 'professores':     renderProfessores();    break;
    case 'turmas':          renderTurmasAdmin();    break;
    case 'alunos':          renderAlunos();         break;
    case 'servicos':        renderServicos();       break;
    case 'eventos':         renderEventos();        break;
    case 'financeiro':      renderFinanceiro();     break;
    case 'experimentais':   renderExperimentais();  break;
    case 'cobrancas':       renderCobrancas();      break;
    case 'crm':             renderCRM();            break;
    case 'usuarios':        renderUsuarios();       break;
    case 'membros':         renderMembros();        break;
    case 'minha-conta':     renderMinhaConta();     break;
    default:                renderDashboard();
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ============================================================
// 6. DASHBOARD
// ============================================================
async function renderDashboard() {
  if      (profile?.role === 'aluno')      return renderMembros();
  if      (profile?.role === 'admin')      await renderDashboardAdmin();
  else if (profile?.role === 'secretaria') await renderDashboardSecretaria();
  else if (profile?.role === 'financeiro') await renderDashboardFinanceiro();
  else                                      await renderDashboardProfessor();
}

async function renderDashboardProfessor() {
  const { mes, ano } = getCurrentMonthYear();
  const { data: turmas } = await db.from('turmas').select('id,codigo,horario').eq('professor_id', user.id).eq('status','active');
  const turmaIds = turmas?.map(t=>t.id) || [];
  let aulaCount=0, subsCount=0;

  if (turmaIds.length) {
    const { data: aulas } = await db.from('aulas').select('id,is_substituicao,turma_id,data')
      .in('turma_id', turmaIds)
      .gte('data', monthStart(mes,ano)).lte('data', monthEnd(mes,ano));
    aulaCount = aulas?.length || 0;
    subsCount = aulas?.filter(a=>a.is_substituicao).length || 0;
  }

  const { data: recentAulas } = turmaIds.length
    ? await db.from('aulas').select('id,data,is_substituicao,turma_id').in('turma_id', turmaIds).order('data',{ascending:false}).limit(5)
    : { data: [] };

  const turmaMap = {};
  turmas?.forEach(t => { turmaMap[t.id] = t; });
  const valorEstimado = aulaCount * (profile?.valor_aula || 0);

  setContent(`
    <div class="page-header">
      <h2>Olá, ${profile?.name?.split(' ')[0]}! 👋</h2>
      <span class="text-muted">${MONTHS[mes]} ${ano}</span>
    </div>
    <div class="stats-grid">
      ${statCard('📅', aulaCount, 'Aulas este mês')}
      ${statCard('🔄', subsCount, 'Substituições')}
      ${statCard('💰', formatCurrency(valorEstimado), 'Estimativa do mês')}
      ${statCard('📚', turmaIds.length, 'Turmas ativas')}
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Últimas Aulas Registradas</h3>
        <button class="btn btn-sm btn-primary" onclick="showTab('marcar-presenca')">+ Marcar Presença</button>
      </div>
      <div class="card-body">
        ${recentAulas?.length ? recentAulas.map(a=>`
          <div class="list-item">
            <div class="list-item-left">
              <div class="list-item-title">${turmaMap[a.turma_id]?.codigo || '—'}</div>
              <div class="list-item-sub">${turmaMap[a.turma_id]?.horario || ''}
                ${a.is_substituicao ? '&nbsp;<span class="badge badge-warning">Substituição</span>' : ''}
              </div>
            </div>
            <div class="list-item-right"><span class="date-badge">${formatDate(a.data)}</span></div>
          </div>`).join('')
        : '<p class="empty-state">Nenhuma aula registrada ainda.</p>'}
      </div>
    </div>`);
}

async function renderDashboardAdmin() {
  const { mes, ano } = getCurrentMonthYear();
  const [{ count: profCount },{ count: turmaCount },{ count: alunoCount }] = await Promise.all([
    db.from('profiles').select('*',{count:'exact',head:true}).eq('role','professor').eq('ativo',true),
    db.from('turmas').select('*',{count:'exact',head:true}).eq('status','active'),
    db.from('alunos').select('*',{count:'exact',head:true}),
  ]);
  const { data: aulasDoMes } = await db.from('aulas').select('id').gte('data',monthStart(mes,ano)).lte('data',monthEnd(mes,ano));
  const { count: pendingCount } = await db.from('pagamentos').select('*',{count:'exact',head:true}).eq('status','pendente').eq('mes',mes).eq('ano',ano);

  const { data: professores } = await db.from('profiles').select('id,name').eq('role','professor').eq('ativo',true);
  const { data: turmasAtivas } = await db.from('turmas').select('id,professor_id').eq('status','active');
  const turmaProfessor = {};
  const profTurmas = {};
  turmasAtivas?.forEach(t => {
    turmaProfessor[t.id] = t.professor_id;
    profTurmas[t.professor_id] = (profTurmas[t.professor_id]||0) + 1;
  });
  const turmaIds = turmasAtivas?.map(t => t.id) || [];
  const { data: taRows } = turmaIds.length
    ? await db.from('turma_alunos').select('turma_id,aluno_id').eq('status','active').in('turma_id', turmaIds)
    : { data: [] };
  const profAlunos = {};
  taRows?.forEach(r => {
    const professorId = turmaProfessor[r.turma_id];
    if (professorId) profAlunos[professorId] = (profAlunos[professorId]||0) + 1;
  });
  const snap = await financeSnapshot();
  const topProfs = (professores||[]).map(p => ({
    ...p,
    activeTurmas: profTurmas[p.id] || 0,
    activeStudents: profAlunos[p.id] || 0,
    score: (profTurmas[p.id] || 0) * 2 + (profAlunos[p.id] || 0),
  })).sort((a,b) => b.score - a.score).slice(0,5);

  setContent(`
    <div class="page-header">
      <h2>Painel Administrativo 📊</h2>
      <span class="text-muted">${MONTHS[mes]} ${ano}</span>
    </div>
    <div class="stats-grid">
      ${statCard('👨‍🏫', profCount||0, 'Professores Ativos', "showTab('professores')")}
      ${statCard('📚', turmaCount||0, 'Turmas Ativas', "showTab('turmas')")}
      ${statCard('🎓', alunoCount||0, 'Alunos Cadastrados', "showTab('alunos')")}
      ${statCard('📅', aulasDoMes?.length||0, 'Aulas este mês', "showTab('financeiro')")}
    </div>
    ${snapshotHTML(snap)}
    ${pendingCount > 0 ? `
      <div class="alert alert-warning">
        ⚠️ <strong>${pendingCount} professor(es)</strong> com pagamento pendente em ${MONTHS[mes]}.
        <button class="btn btn-sm btn-warning" onclick="showTab('financeiro')">Ver Financeiro</button>
      </div>` : ''}
    <div class="card">
      <div class="card-header">
        <h3>Melhores Professores</h3>
        <span class="text-muted">Classificação por turmas ativas e alunos ativos</span>
      </div>
      <div class="card-body">
        ${topProfs.length ? topProfs.map((p,i)=>`
          <div class="list-item">
            <div class="list-item-left">
              <div class="list-item-title">${i+1}. ${p.name}</div>
              <div class="list-item-sub">${p.activeTurmas} turma(s) ativa(s) • ${p.activeStudents} aluno(s) ativo(s)</div>
            </div>
            <div class="list-item-right"><span class="badge badge-info">Score ${p.score}</span></div>
          </div>`).join('')
        : '<p class="empty-state">Nenhum professor ativo encontrado.</p>'}
      </div>
    </div>
    <div class="quick-actions">
      <h3>Ações Rápidas</h3>
      <div class="actions-grid">
        <button class="action-card" onclick="showTab('professores');setTimeout(()=>openModalProfessor(null),200)">
          <span class="action-icon">➕</span><span>Novo Professor</span>
        </button>
        <button class="action-card" onclick="showTab('turmas');setTimeout(()=>openModalTurma(null),200)">
          <span class="action-icon">➕</span><span>Nova Turma</span>
        </button>
        <button class="action-card" onclick="showTab('alunos');setTimeout(()=>openModalAluno(null),200)">
          <span class="action-icon">➕</span><span>Novo Aluno</span>
        </button>
        <button class="action-card" onclick="showTab('crm');setTimeout(()=>openModalLead(null),200)">
          <span class="action-icon">✨</span><span>Novo Lead</span>
        </button>
        <button class="action-card" onclick="showTab('cobrancas')">
          <span class="action-icon">💳</span><span>Pagamentos</span>
        </button>
        <button class="action-card" onclick="showTab('financeiro')">
          <span class="action-icon">💰</span><span>Financeiro</span>
        </button>
      </div>
    </div>`);
}

async function renderDashboardFinanceiro() {
  const { mes, ano } = getCurrentMonthYear();
  const { data: pags } = await db.from('pagamentos').select('*,profiles(name)').eq('mes',mes).eq('ano',ano);
  const total    = pags?.reduce((s,p)=>s+(p.total||0),0)||0;
  const pago     = pags?.filter(p=>p.status==='pago').reduce((s,p)=>s+(p.total||0),0)||0;
  const pendente = total-pago;
  const snap = await financeSnapshot();

  setContent(`
    <div class="page-header">
      <h2>Dashboard Financeiro 💰</h2>
      <span class="text-muted">${MONTHS[mes]} ${ano}</span>
    </div>
    ${snapshotHTML(snap)}
    <h3 style="margin:8px 0 12px">Pagamento de Professores</h3>
    <div class="stats-grid">
      ${statCard('💵', formatCurrency(total), `Total ${MONTHS[mes]}`)}
      ${statCard('✅', formatCurrency(pago), 'Pago')}
      ${statCard('⏳', formatCurrency(pendente), 'Pendente')}
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Resumo por Professor</h3>
        <button class="btn btn-sm btn-primary" onclick="showTab('financeiro')">Ver Detalhes</button>
      </div>
      <div class="card-body">
        ${pags?.length ? pags.map(p=>`
          <div class="list-item">
            <div class="list-item-left">
              <div class="list-item-title">${p.profiles?.name}</div>
              <div class="list-item-sub">${p.aulas_dadas} aulas × ${formatCurrency(p.valor_aula)}</div>
            </div>
            <div class="list-item-right">
              <span class="badge ${p.status==='pago'?'badge-success':'badge-warning'}">${p.status==='pago'?'Pago':'Pendente'}</span>
              <strong>${formatCurrency(p.total)}</strong>
            </div>
          </div>`).join('')
        : `<p class="empty-state">Nenhum pagamento calculado para ${MONTHS[mes]}.
             <button class="btn btn-sm btn-primary" onclick="showTab('financeiro')">Calcular</button></p>`}
      </div>
    </div>`);
}

async function renderServicos() {
  const { data: servicos } = await db.from('servicos').select('*').order('ordem',{ascending:true});
  _D.servicos = {};
  servicos?.forEach(s => { _D.servicos[s.id] = s; });

  setContent(`
    <div class="page-header">
      <h2>Serviços</h2>
      <button class="btn btn-primary" onclick="openModalServico(null)">+ Novo Serviço</button>
    </div>
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Serviço</th><th>Descrição</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${servicos?.length ? servicos.map(s=>`
              <tr>
                <td>${s.titulo}</td>
                <td>${s.descricao||'—'}</td>
                <td><span class="badge ${s.status==='active'?'badge-success':'badge-gray'}">${s.status==='active'?'Ativo':'Inativo'}</span></td>
                <td><div class="action-btns">
                  <button class="btn btn-sm btn-secondary" onclick="openModalServico('${s.id}')">Editar</button>
                  <button class="btn btn-sm ${s.status==='active'?'btn-danger':'btn-success'}" onclick="toggleServicoStatus('${s.id}','${s.status}')">
                    ${s.status==='active'?'Desativar':'Ativar'}
                  </button>
                </div></td>
              </tr>`).join('')
            : '<tr><td colspan="4" class="empty-state">Nenhum serviço cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`);
}

function openModalServico(id) {
  const s = id ? _D.servicos?.[id] : null;
  openModal(`
    <div class="modal-header">
      <h3>${s ? 'Editar Serviço' : 'Novo Serviço'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="saveServico(event)" style="padding:20px">
      <div class="form-group">
        <label>Título *</label>
        <input type="text" name="titulo" value="${esc(s?.titulo)}" required>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <textarea name="descricao" rows="3">${esc(s?.descricao)}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Ordem</label>
          <input type="number" name="ordem" value="${s?.ordem||0}" min="0">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="active" ${s?.status==='active'?'selected':''}>Ativo</option>
            <option value="inactive" ${s?.status==='inactive'?'selected':''}>Inativo</option>
          </select>
        </div>
      </div>
      <input type="hidden" name="id" value="${s?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${s ? 'Salvar Serviço' : 'Criar Serviço'}</button>
      </div>
    </form>`);
}

async function saveServico(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = {
    titulo: fd.get('titulo').trim(),
    descricao: fd.get('descricao').trim() || null,
    ordem: parseInt(fd.get('ordem')) || 0,
    status: fd.get('status') || 'inactive',
  };
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  const { error } = id ? await db.from('servicos').update(row).eq('id', id) : await db.from('servicos').insert(row);
  if (error) { showToast('Erro: '+error.message, 'error'); btn.disabled=false; return; }
  showToast(id ? 'Serviço atualizado!' : 'Serviço criado!', 'success');
  closeModal(); renderServicos();
}

async function toggleServicoStatus(id, status) {
  const next = status === 'active' ? 'inactive' : 'active';
  await db.from('servicos').update({ status: next }).eq('id', id);
  showToast(`Serviço ${next === 'active' ? 'ativado' : 'desativado'}!`, 'success');
  renderServicos();
}

async function renderEventos() {
  const { data: eventos } = await db.from('eventos').select('*').order('data',{ascending:true});
  _D.eventos = {};
  eventos?.forEach(ev => { _D.eventos[ev.id] = ev; });

  setContent(`
    <div class="page-header">
      <h2>Eventos</h2>
      ${profile?.role==='admin' ? '<button class="btn btn-primary" onclick="openModalEvento(null)">+ Novo Evento</button>' : ''}
    </div>
    <div class="card">
      <div class="card-body">
        ${eventos?.length ? eventos.map(ev=>`
          <div class="event-card">
            <div class="event-card-main">
              <div>
                <div class="event-title">${ev.titulo}</div>
                <div class="event-meta">${formatDate(ev.data||'')} • ${ev.local||'Local não informado'}</div>
              </div>
              <span class="badge ${ev.status==='active'?'badge-success':'badge-gray'}">${ev.status==='active'?'Publicado':'Arquivado'}</span>
            </div>
            <p class="event-desc">${ev.descricao||'<span class="text-muted">Sem descrição</span>'}</p>
            ${profile?.role==='admin' ? `<div class="event-actions"><button class="btn btn-sm btn-secondary" onclick="openModalEvento('${ev.id}')">Editar</button><button class="btn btn-sm ${ev.status==='active'?'btn-danger':'btn-success'}" onclick="toggleEventoStatus('${ev.id}','${ev.status}')">${ev.status==='active'?'Ocultar':'Publicar'}</button></div>` : ''}
          </div>`).join('')
        : '<div class="empty-card"><p>Nenhum evento cadastrado ainda.</p></div>'}
      </div>
    </div>`);
}

function openModalEvento(id) {
  const ev = id ? _D.eventos?.[id] : null;
  openModal(`
    <div class="modal-header">
      <h3>${ev ? 'Editar Evento' : 'Novo Evento'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="saveEvento(event)" style="padding:20px">
      <div class="form-group">
        <label>Título *</label>
        <input type="text" name="titulo" value="${esc(ev?.titulo)}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data *</label>
          <input type="date" name="data" value="${ev?.data||''}" required>
        </div>
        <div class="form-group">
          <label>Local</label>
          <input type="text" name="local" value="${esc(ev?.local)}">
        </div>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <textarea name="descricao" rows="3">${esc(ev?.descricao)}</textarea>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status">
          <option value="active" ${ev?.status==='active'?'selected':''}>Publicado</option>
          <option value="inactive" ${ev?.status==='inactive'?'selected':''}>Arquivado</option>
        </select>
      </div>
      <input type="hidden" name="id" value="${ev?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${ev ? 'Salvar Evento' : 'Criar Evento'}</button>
      </div>
    </form>`);
}

async function saveEvento(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = {
    titulo: fd.get('titulo').trim(),
    data: fd.get('data'),
    local: fd.get('local').trim() || null,
    descricao: fd.get('descricao').trim() || null,
    status: fd.get('status') || 'inactive',
  };
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  const { error } = id ? await db.from('eventos').update(row).eq('id', id) : await db.from('eventos').insert(row);
  if (error) { showToast('Erro: '+error.message, 'error'); btn.disabled=false; return; }
  showToast(id ? 'Evento atualizado!' : 'Evento criado!', 'success');
  closeModal(); renderEventos();
}

async function toggleEventoStatus(id, status) {
  const next = status === 'active' ? 'inactive' : 'active';
  await db.from('eventos').update({ status: next }).eq('id', id);
  showToast(`Evento ${next === 'active' ? 'publicado' : 'arquivado'}!`, 'success');
  renderEventos();
}

// ============================================================
// 7. PROFESSORES (admin)
// ============================================================
async function renderProfessores() {
  const { data: profs } = await db.from('profiles').select('*').eq('role','professor').order('name');
  _D.profs = {};
  profs?.forEach(p => { _D.profs[p.id] = p; });

  setContent(`
    <div class="page-header">
      <h2>Professores</h2>
      <button class="btn btn-primary" onclick="openModalProfessor(null)">+ Novo Professor</button>
    </div>
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Nome</th><th>Email</th><th>Valor/Aula</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${profs?.length ? profs.map(p=>`
              <tr>
                <td><div class="user-cell">
                  <div class="mini-avatar">${initials(p.name)}</div>${p.name}
                </div></td>
                <td>${p.email}</td>
                <td>${formatCurrency(p.valor_aula||0)}</td>
                <td><span class="badge ${p.ativo?'badge-success':'badge-gray'}">${p.ativo?'Ativo':'Inativo'}</span></td>
                <td><div class="action-btns">
                  <button class="btn btn-sm btn-secondary" onclick="openModalProfessor('${p.id}')">Editar</button>
                  <button class="btn btn-sm ${p.ativo?'btn-danger':'btn-success'}"
                    onclick="toggleProfessorStatus('${p.id}',${p.ativo})">
                    ${p.ativo?'Desativar':'Ativar'}
                  </button>
                </div></td>
              </tr>`).join('')
            : '<tr><td colspan="5" class="empty-state">Nenhum professor cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`);
}

function openModalProfessor(id) {
  const p = id ? _D.profs?.[id] : null;
  openModal(`
    <div class="modal-header">
      <h3>${p ? 'Editar Professor' : 'Novo Professor'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="saveProfessor(event)" style="padding:20px">
      <div class="form-group">
        <label>Nome Completo *</label>
        <input type="text" name="name" value="${esc(p?.name)}" required>
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" name="email" value="${esc(p?.email)}" ${p?'readonly':''} required>
        ${!p ? '<span class="hint">Senha padrão: VMLI2024!</span>' : ''}
      </div>
      <div class="form-group">
        <label>Valor por Aula (R$) *</label>
        <input type="number" name="valor_aula" step="0.01" min="0" value="${p?.valor_aula||''}" required>
      </div>
      <input type="hidden" name="id" value="${p?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${p?'Salvar':'Criar Professor'}</button>
      </div>
    </form>`);
}

async function saveProfessor(e) {
  e.preventDefault();
  const fd     = new FormData(e.target);
  const id     = fd.get('id');
  const name   = fd.get('name').trim();
  const email  = fd.get('email').trim();
  const valor  = parseFloat(fd.get('valor_aula'));
  const btn    = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Salvando…';

  try {
    if (id) {
      // Atualizar perfil existente
      const old = _D.profs?.[id];
      await db.from('profiles').update({ name, valor_aula: valor }).eq('id', id);
      if (old?.valor_aula !== valor) {
        await db.from('valor_aula_historico').insert({
          professor_id: id, valor_anterior: old?.valor_aula, valor_novo: valor, alterado_por: user.id
        });
      }
      showToast('Professor atualizado!', 'success');
    } else {
      // Criar novo usuário — preserva sessão do admin (helper na seção 26)
      const nuUser = await createAuthUser({ name, email, role: 'professor', valor_aula: valor });
      if (nuUser) {
        await db.from('valor_aula_historico').insert({
          professor_id: nuUser.id, valor_anterior: 0, valor_novo: valor, alterado_por: user.id
        });
      }
      showToast('Professor criado! Senha padrão: VMLI2024!', 'success');
    }
    closeModal();
    renderProfessores();
  } catch (err) {
    let msg = 'Erro: ' + err.message;
    if (err.message?.includes('rate limit') || err.message?.includes('email rate')) {
      msg = '⚠️ Limite de cadastros atingido. Aguarde alguns minutos e tente novamente.';
    } else if (err.message?.includes('already registered') || err.message?.includes('already been registered')) {
      msg = 'Este email já está cadastrado no sistema.';
    }
    showToast(msg, 'error');
    btn.disabled = false; btn.textContent = id ? 'Salvar' : 'Criar Professor';
  }
}

async function toggleProfessorStatus(id, ativo) {
  const acao = ativo ? 'desativar' : 'ativar';
  if (!confirm(`Tem certeza que deseja ${acao} este professor?`)) return;
  await db.from('profiles').update({ ativo: !ativo }).eq('id', id);
  showToast(`Professor ${ativo ? 'desativado' : 'ativado'}!`, 'success');
  renderProfessores();
}

// ============================================================
// 8. TURMAS (admin)
// ============================================================
async function renderTurmasAdmin() {
  const { data: turmas } = await db.from('turmas')
    .select('*, profiles!turmas_professor_id_fkey(name)')
    .order('status').order('codigo');
  const { data: taRows } = await db.from('turma_alunos').select('turma_id').eq('status','active');
  const countMap = {};
  taRows?.forEach(r => { countMap[r.turma_id] = (countMap[r.turma_id]||0)+1; });
  _D.turmas = {};
  turmas?.forEach(t => { _D.turmas[t.id] = t; });

  setContent(`
    <div class="page-header">
      <h2>Turmas</h2>
      <button class="btn btn-primary" onclick="openModalTurma(null)">+ Nova Turma</button>
    </div>
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Código</th><th>Professor</th><th>Modalidade</th>
            <th>Horário</th><th>Alunos</th><th>Valor/Aula</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${turmas?.length ? turmas.map(t=>`
              <tr>
                <td><strong>${t.codigo}</strong>${t.nome?`<br><small class="text-muted">${t.nome}</small>`:''}</td>
                <td>${t.profiles?.name||'—'}</td>
                <td><span class="badge badge-info">${modalLabel(t.modalidade)}</span></td>
                <td>${t.horario||'—'}</td>
                <td><button class="btn-link-primary" onclick="openModalGerenciarAlunos('${t.id}')">${countMap[t.id]||0} aluno(s)</button></td>
                <td>${formatCurrency(t.valor_aula||0)}</td>
                <td><span class="badge ${t.status==='active'?'badge-success':'badge-gray'}">${t.status==='active'?'Ativa':'Inativa'}</span></td>
                <td><div class="action-btns">
                  <button class="btn btn-sm btn-secondary" onclick="openModalTurma('${t.id}')">Editar</button>
                  <button class="btn btn-sm btn-info" onclick="openModalGerenciarAlunos('${t.id}')">Alunos</button>
                </div></td>
              </tr>`).join('')
            : '<tr><td colspan="8" class="empty-state">Nenhuma turma cadastrada.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`);
}

async function openModalTurma(id) {
  const t = id ? _D.turmas?.[id] : null;
  const { data: profs } = await db.from('profiles').select('id,name').eq('role','professor').eq('ativo',true).order('name');
  openModal(`
    <div class="modal-header">
      <h3>${t?'Editar Turma':'Nova Turma'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="saveTurma(event)" style="padding:20px">
      <div class="form-row">
        <div class="form-group">
          <label>Código *</label>
          <input type="text" name="codigo" value="${esc(t?.codigo)}" placeholder="ex: G1, I2, Ind.25" required>
        </div>
        <div class="form-group">
          <label>Nome (opcional)</label>
          <input type="text" name="nome" value="${esc(t?.nome)}" placeholder="ex: Grupo Iniciante">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Modalidade *</label>
          <select name="modalidade" required>
            <option value="group"      ${t?.modalidade==='group'?'selected':''}>Grupo</option>
            <option value="individual" ${t?.modalidade==='individual'||!t?'selected':''}>Individual</option>
            <option value="extra"      ${t?.modalidade==='extra'?'selected':''}>Extra</option>
          </select>
        </div>
        <div class="form-group">
          <label>Idioma</label>
          <select name="idioma">
            ${['Inglês','Espanhol','Francês','Alemão','Italiano','Português','Outro']
              .map(i=>`<option ${(t?.idioma||'Inglês')===i?'selected':''}>${i}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Nível</label>
          <select name="nivel">
            <option value="">— Selecione —</option>
            ${['A1','A2','B1','B2','C1','C2'].map(n=>`<option ${t?.nivel===n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Horário *</label>
          <input type="text" name="horario" value="${esc(t?.horario)}" placeholder="ex: Ter e Qui — 20h" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Professor *</label>
          <select name="professor_id" required>
            <option value="">— Selecione —</option>
            ${profs?.map(p=>`<option value="${p.id}" ${t?.professor_id===p.id?'selected':''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Valor/Aula (R$) *</label>
          <input type="number" name="valor_aula" step="0.01" min="0" value="${t?.valor_aula||''}" required>
        </div>
      </div>
      <div class="form-group">
        <label>Link do Meet</label>
        <input type="url" name="meet_link" value="${esc(t?.meet_link)}" placeholder="https://meet.google.com/…">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status">
          <option value="active"   ${!t||t.status==='active'?'selected':''}>Ativa</option>
          <option value="inactive" ${t?.status==='inactive'?'selected':''}>Inativa</option>
        </select>
      </div>
      <input type="hidden" name="id" value="${t?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${t?'Salvar':'Criar Turma'}</button>
      </div>
    </form>`);
}

async function saveTurma(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = {
    codigo: fd.get('codigo').trim(),
    nome: fd.get('nome').trim()||null,
    modalidade: fd.get('modalidade'),
    idioma: fd.get('idioma'),
    nivel: fd.get('nivel')||null,
    horario: fd.get('horario').trim(),
    professor_id: fd.get('professor_id'),
    valor_aula: parseFloat(fd.get('valor_aula')),
    meet_link: fd.get('meet_link').trim()||null,
    status: fd.get('status'),
  };
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  const { error } = id
    ? await db.from('turmas').update(row).eq('id', id)
    : await db.from('turmas').insert(row);
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  showToast(id?'Turma atualizada!':'Turma criada!','success');
  closeModal(); renderTurmasAdmin();
}

async function openModalGerenciarAlunos(turmaId) {
  const { data: turma  } = await db.from('turmas').select('*,profiles!turmas_professor_id_fkey(name)').eq('id',turmaId).single();
  const { data: tAlunos } = await db.from('turma_alunos').select('id,aluno_id,alunos(id,nome,email)').eq('turma_id',turmaId).eq('status','active');
  const inIds = tAlunos?.map(ta=>ta.aluno_id)||[];
  const { data: todos } = await db.from('alunos').select('id,nome').order('nome');
  const disponiveis = todos?.filter(a=>!inIds.includes(a.id))||[];
  _D.tAlunos = {}; tAlunos?.forEach(ta=>{ _D.tAlunos[ta.id]=ta; });

  openModal(`
    <div class="modal-header">
      <h3>Alunos — ${turma?.codigo}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="padding:20px">
      <p class="text-muted" style="margin-bottom:16px">${turma?.profiles?.name||''} • ${turma?.horario||''}</p>

      <h4 style="margin-bottom:10px">Na turma (${tAlunos?.length||0})</h4>
      <div id="ta-list" style="margin-bottom:20px">
        ${tAlunos?.length ? tAlunos.map(ta=>`
          <div class="list-item">
            <span>${ta.alunos?.nome}</span>
            <button class="btn btn-sm btn-danger" onclick="removeAlunoFromTurma('${ta.id}','${turmaId}')">Remover</button>
          </div>`).join('')
        : '<p class="text-muted">Nenhum aluno nesta turma.</p>'}
      </div>

      ${disponiveis.length ? `
        <h4 style="margin-bottom:8px">Adicionar aluno</h4>
        <div class="form-row" style="align-items:flex-end">
          <div class="form-group" style="flex:1;margin:0">
            <select id="sel-add-aluno">
              <option value="">— Selecione —</option>
              ${disponiveis.map(a=>`<option value="${a.id}">${a.nome}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" onclick="addAlunoToTurma('${turmaId}')">Adicionar</button>
        </div>` : ''}
    </div>`);
}

async function addAlunoToTurma(turmaId) {
  const alunoId = document.getElementById('sel-add-aluno')?.value;
  if (!alunoId) { showToast('Selecione um aluno','error'); return; }
  const { error } = await db.from('turma_alunos').insert({ turma_id: turmaId, aluno_id: alunoId });
  if (error) { showToast('Erro ao adicionar','error'); return; }
  showToast('Aluno adicionado!','success');
  openModalGerenciarAlunos(turmaId);
}

async function removeAlunoFromTurma(id, turmaId) {
  if (!confirm('Remover este aluno da turma?')) return;
  await db.from('turma_alunos').update({ status:'inactive' }).eq('id', id);
  showToast('Aluno removido','success');
  openModalGerenciarAlunos(turmaId);
}

// ============================================================
// 9. ALUNOS (admin)
// ============================================================
// (módulo de Alunos movido para a seção 22, no final do arquivo)

// ============================================================
// 10. MINHAS TURMAS (professor)
// ============================================================
async function renderMinhasTurmas() {
  const { data: turmas } = await db.from('turmas').select('*').eq('professor_id', user.id).eq('status','active').order('codigo');
  if (!turmas?.length) {
    setContent(`<div class="page-header"><h2>Minhas Turmas</h2></div>
      <div class="empty-card"><p>Você ainda não tem turmas ativas.</p><p class="text-muted">Entre em contato com o administrador.</p></div>`);
    return;
  }
  const { data: allTA } = await db.from('turma_alunos').select('turma_id,alunos(id,nome)').in('turma_id',turmas.map(t=>t.id)).eq('status','active');
  const alunosByTurma = {};
  allTA?.forEach(ta=>{ (alunosByTurma[ta.turma_id]||(alunosByTurma[ta.turma_id]=[])).push(ta.alunos); });

  setContent(`
    <div class="page-header">
      <h2>Minhas Turmas</h2>
      <span class="text-muted">${turmas.length} ativa(s)</span>
    </div>
    <div class="turmas-grid">
      ${turmas.map(t=>{
        const alunos = alunosByTurma[t.id]||[];
        return `<div class="turma-card">
          <div class="turma-card-header">
            <div>
              <div class="turma-codigo">${t.codigo}</div>
              ${t.nome?`<div class="turma-nome">${t.nome}</div>`:''}
            </div>
            <span class="badge badge-info">${modalLabel(t.modalidade)}</span>
          </div>
          <div class="turma-details">
            <div>🕐 ${t.horario||'—'}</div>
            <div>🌍 ${t.idioma||'Inglês'}${t.nivel?' • '+t.nivel:''}</div>
            ${t.meet_link?`<div>📹 <a href="${t.meet_link}" target="_blank">Link do Meet</a></div>`:''}
          </div>
          <div class="turma-alunos">
            <strong>Alunos (${alunos.length})</strong>
            <div class="alunos-list" style="margin-top:6px">
              ${alunos.length ? alunos.map(a=>`<span class="aluno-chip">${a?.nome}</span>`).join('') : '<span class="text-muted" style="font-size:12px">Nenhum aluno</span>'}
            </div>
          </div>
          <div class="turma-card-footer">
            <button class="btn btn-primary btn-full" onclick="showTab('marcar-presenca');setTimeout(()=>preselectTurma('${t.id}'),250)">
              ✅ Marcar Presença
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`);
}

// ============================================================
// 11. MARCAR PRESENÇA (professor)
// ============================================================
async function renderMarcarPresenca() {
  const { data: turmas } = await db.from('turmas').select('*').eq('professor_id', user.id).eq('status','active').order('codigo');
  const today = new Date().toISOString().split('T')[0];

  setContent(`
    <div class="page-header"><h2>Marcar Presença</h2></div>
    <div class="card">
      <div class="card-body">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label>Turma *</label>
            <select id="sel-turma" onchange="loadPresencaForm()">
              <option value="">— Selecione uma turma —</option>
              ${turmas?.map(t=>`<option value="${t.id}">${t.codigo}${t.nome?' — '+t.nome:''} | ${t.horario||''}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Data da Aula *</label>
            <input type="date" id="sel-data" value="${today}" onchange="loadPresencaForm()">
          </div>
        </div>
      </div>
    </div>
    <div id="presenca-form-area"></div>`);
}

function preselectTurma(turmaId) {
  const sel = document.getElementById('sel-turma');
  if (sel) { sel.value = turmaId; loadPresencaForm(); }
}

async function loadPresencaForm() {
  const turmaId = document.getElementById('sel-turma')?.value;
  const dataVal = document.getElementById('sel-data')?.value;
  const area    = document.getElementById('presenca-form-area');
  if (!area) return;
  if (!turmaId || !dataVal) { area.innerHTML=''; return; }

  area.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  const [{ data: turma }, { data: existingAula }, { data: profs }, { data: tAlunos }] = await Promise.all([
    db.from('turmas').select('*,profiles!turmas_professor_id_fkey(name)').eq('id',turmaId).single(),
    db.from('aulas').select('*,presencas(aluno_id,status)').eq('turma_id',turmaId).eq('data',dataVal).maybeSingle(),
    db.from('profiles').select('id,name').eq('role','professor').eq('ativo',true).neq('id',user.id),
    db.from('turma_alunos').select('alunos(id,nome)').eq('turma_id',turmaId).eq('status','active'),
  ]);

  const alunos = tAlunos?.map(ta=>ta.alunos)||[];
  const existPres = {};
  existingAula?.presencas?.forEach(p=>{ existPres[p.aluno_id]=p.status; });

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>${turma?.codigo} — ${formatDate(dataVal)}</h3>
        <span class="badge badge-info">${turma?.horario||''}</span>
      </div>
      <form id="form-presenca" onsubmit="savePresenca(event)">
        <input type="hidden" name="turma_id" value="${turmaId}">
        <input type="hidden" name="data_aula" value="${dataVal}">
        <input type="hidden" name="aula_id" value="${existingAula?.id||''}">
        <div style="padding:16px 18px">
          ${existingAula ? '<div class="alert alert-info">📝 Esta aula já foi registrada. Você está editando.</div>' : ''}

          <h4 style="margin-bottom:12px">Chamada</h4>
          ${alunos.length ? `
            <div class="presenca-list">
              ${alunos.map(a=>{
                const s = existPres[a.id]||'P';
                return `<div class="presenca-item">
                  <span class="aluno-name">${a.nome}</span>
                  <div class="pa-toggle">
                    <label class="pa-btn ${s==='P'?'active-p':''}">
                      <input type="radio" name="pres_${a.id}" value="P" ${s==='P'?'checked':''} onchange="updateToggle(this)"> P
                    </label>
                    <label class="pa-btn ${s==='A'?'active-a':''}">
                      <input type="radio" name="pres_${a.id}" value="A" ${s==='A'?'checked':''} onchange="updateToggle(this)"> A
                    </label>
                  </div>
                </div>`;
              }).join('')}
            </div>` : `<div class="alert alert-warning">⚠️ Nenhum aluno cadastrado nesta turma.</div>`}

          <h4 style="margin:20px 0 10px">Material</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Chapter</label>
              <input type="text" name="chapter" value="${existingAula?.chapter||''}">
            </div>
            <div class="form-group">
              <label>Page</label>
              <input type="text" name="page_num" value="${existingAula?.page_num||''}">
            </div>
            <div class="form-group">
              <label>Exercise</label>
              <input type="text" name="exercise" value="${existingAula?.exercise||''}">
            </div>
          </div>

          <div class="form-group">
            <label>Link do Meet</label>
            <input type="url" name="meet_link" value="${existingAula?.meet_link||turma?.meet_link||''}" placeholder="https://meet.google.com/…">
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="chk-sub" ${existingAula?.is_substituicao?'checked':''} onchange="toggleSubForm()">
              Esta aula foi dada por um substituto?
            </label>
          </div>
          <div id="sub-form" style="display:${existingAula?.is_substituicao?'block':'none'};padding:12px;background:var(--warning-bg);border-radius:var(--radius-sm);margin-bottom:12px">
            <p style="font-size:12px;color:#92400e;margin-bottom:8px">
              O professor titular (você) continua sendo remunerado. O registro indica quem deu a aula.
            </p>
            <div class="form-group" style="margin:0">
              <label>Professor Substituto</label>
              <select name="prof_sub_id">
                <option value="">— Selecione —</option>
                ${profs?.map(p=>`<option value="${p.id}" ${existingAula?.professor_id===p.id?'selected':''}>${p.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Observações</label>
            <textarea name="notas" rows="2" placeholder="Observações sobre a aula…">${existingAula?.notas||''}</textarea>
          </div>

          <div class="exp-section">
            <div class="exp-section-header">
              <span>🔬 Alunos Experimentais nesta aula</span>
              <button type="button" class="btn btn-sm btn-secondary" onclick="addExpRow()">+ Adicionar</button>
            </div>
            <div id="exp-rows"></div>
          </div>
        </div>
        <div class="card-footer">
          <button type="submit" class="btn btn-primary btn-full">
            ${existingAula?'💾 Atualizar Registro':'✅ Registrar Presença'}
          </button>
        </div>
      </form>
    </div>`;

  // Load existing experimentais for this aula
  if (existingAula?.id) {
    const { data: exps } = await db.from('experimentais')
      .select('*').eq('data_aula', dataVal)
      .eq('professor_id', user.id)
      .in('status', ['pendente','convertido']);
    exps?.forEach(exp => addExpRow(exp));
  }
}

function updateToggle(radio) {
  const toggle = radio.closest('.pa-toggle');
  toggle.querySelectorAll('.pa-btn').forEach(lbl => {
    const v = lbl.querySelector('input').value;
    lbl.classList.toggle('active-p', v==='P' && radio.value==='P');
    lbl.classList.toggle('active-a', v==='A' && radio.value==='A');
  });
}

function toggleSubForm() {
  document.getElementById('sub-form').style.display =
    document.getElementById('chk-sub').checked ? 'block' : 'none';
}

async function savePresenca(e) {
  e.preventDefault();
  const fd        = new FormData(e.target);
  const turmaId   = fd.get('turma_id');
  const dataVal   = fd.get('data_aula');
  const existId   = fd.get('aula_id');
  const isSub     = document.getElementById('chk-sub')?.checked;
  const subProfId = fd.get('prof_sub_id');
  const btn       = e.target.querySelector('[type=submit]');
  btn.disabled=true; btn.textContent='Salvando…';

  try {
    const aulaRow = {
      turma_id:            turmaId,
      data:                dataVal,
      professor_id:        isSub && subProfId ? subProfId : user.id,
      is_substituicao:     isSub && !!subProfId,
      professor_titular_id:isSub && subProfId ? user.id : null,
      chapter:             fd.get('chapter')||null,
      page_num:            fd.get('page_num')||null,
      exercise:            fd.get('exercise')||null,
      meet_link:           fd.get('meet_link')||null,
      notas:               fd.get('notas')||null,
    };

    let aulaId = existId;
    if (existId) {
      await db.from('aulas').update(aulaRow).eq('id', existId);
      await db.from('presencas').delete().eq('aula_id', existId);
    } else {
      const { data: newAula, error } = await db.from('aulas').insert(aulaRow).select().single();
      if (error) throw error;
      aulaId = newAula.id;
    }

    // Collect student IDs from the form
    const { data: tAlunos } = await db.from('turma_alunos').select('alunos(id)').eq('turma_id',turmaId).eq('status','active');
    const presRows = (tAlunos||[]).map(ta=>({
      aula_id:  aulaId,
      aluno_id: ta.alunos.id,
      status:   fd.get(`pres_${ta.alunos.id}`) || 'P',
    }));
    if (presRows.length) await db.from('presencas').insert(presRows);

    await saveExperimentais(turmaId, dataVal);
    showToast('Presença registrada! ✅','success');
    _expCount = 0;
    document.getElementById('sel-turma').value = '';
    document.getElementById('presenca-form-area').innerHTML = '';
  } catch (err) {
    showToast('Erro: '+err.message,'error');
    btn.disabled=false; btn.textContent='Registrar Presença';
  }
}

// ============================================================
// 12. HISTÓRICO (professor)
// ============================================================
async function renderHistorico() {
  const { mes, ano } = getCurrentMonthYear();
  setContent(`
    <div class="page-header"><h2>Histórico de Aulas</h2></div>
    <div class="filters-bar">
      <select id="hmes">
        ${MONTHS.slice(1).map((m,i)=>`<option value="${i+1}" ${i+1===mes?'selected':''}>${m}</option>`).join('')}
      </select>
      <select id="hano">
        ${[ano-1,ano,ano+1].map(y=>`<option value="${y}" ${y===ano?'selected':''}>${y}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="loadHistorico()">Ver</button>
    </div>
    <div id="hist-content"><div class="loading"><div class="spinner"></div></div></div>`);
  loadHistorico();
}

async function loadHistorico() {
  const mes = parseInt(document.getElementById('hmes')?.value) || getCurrentMonthYear().mes;
  const ano = parseInt(document.getElementById('hano')?.value) || getCurrentMonthYear().ano;
  const box = document.getElementById('hist-content');
  if (!box) return;
  box.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  const { data: turmas } = await db.from('turmas').select('id,codigo,horario').eq('professor_id',user.id);
  const turmaIds = turmas?.map(t=>t.id)||[];
  const turmaMap = {};
  turmas?.forEach(t=>{ turmaMap[t.id]=t; });

  if (!turmaIds.length) { box.innerHTML='<div class="empty-card"><p>Nenhuma turma.</p></div>'; return; }

  const { data: aulas } = await db.from('aulas')
    .select('*,presencas(status,alunos(nome)),profiles!aulas_professor_id_fkey(name)')
    .in('turma_id', turmaIds)
    .gte('data', monthStart(mes,ano)).lte('data', monthEnd(mes,ano))
    .order('data',{ascending:false});

  if (!aulas?.length) { box.innerHTML=`<div class="empty-card"><p>Nenhuma aula em ${MONTHS[mes]}/${ano}.</p></div>`; return; }

  const total = aulas.length;
  const subs  = aulas.filter(a=>a.is_substituicao).length;

  box.innerHTML = `
    <div class="stats-grid stats-compact">
      ${statCard('📅', total, 'Aulas no mês')}
      ${statCard('🔄', subs, 'Substituições')}
    </div>
    <div class="card">
      <div class="card-body" style="padding:8px 12px">
        ${aulas.map(a=>{
          const turma   = turmaMap[a.turma_id];
          const pres    = a.presencas?.filter(p=>p.status==='P').length||0;
          const aus     = a.presencas?.filter(p=>p.status==='A').length||0;
          const subName = a.profiles?.name;
          return `<div class="historico-item" onclick="toggleHistoricoDetail('${a.id}')">
            <div class="historico-header">
              <div class="historico-left">
                <span class="historico-date">${formatDate(a.data)}</span>
                <span class="historico-turma">${turma?.codigo||''}</span>
                ${a.is_substituicao?`<span class="badge badge-warning" style="font-size:10px">Sub: ${subName||'outro'}</span>`:''}
              </div>
              <div class="historico-right">
                <span class="presenca-count">✅${pres} ❌${aus}</span>
                <span class="expand-icon">▼</span>
              </div>
            </div>
            <div class="historico-detail" id="det-${a.id}" style="display:none">
              ${a.presencas?.length?`<div class="presenca-mini-list">
                ${a.presencas.map(p=>`<span class="presenca-chip ${p.status==='P'?'chip-p':'chip-a'}">${p.alunos?.nome} — ${p.status}</span>`).join('')}
              </div>`:''}
              ${a.chapter||a.page_num||a.exercise?`<div class="material-info">📖 ${[a.chapter?'Ch.'+a.chapter:'',a.page_num?'p.'+a.page_num:'',a.exercise?'Ex.'+a.exercise:''].filter(Boolean).join(' • ')}</div>`:''}
              ${a.notas?`<div class="aula-notas">📝 ${a.notas}</div>`:''}
              ${a.meet_link?`<div style="margin-top:4px"><a href="${a.meet_link}" target="_blank" style="font-size:12px;color:var(--primary)">📹 Meet Link</a></div>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function toggleHistoricoDetail(id) {
  const el = document.getElementById(`det-${id}`);
  if (el) el.style.display = el.style.display==='none' ? 'block' : 'none';
}

// ============================================================
// EXPERIMENTAIS — helpers
// ============================================================
let _expCount = 0;
function addExpRow(data = null) {
  const n = ++_expCount;
  const container = document.getElementById('exp-rows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'exp-row';
  row.id = `exp-row-${n}`;
  row.innerHTML = `
    <div class="form-row" style="align-items:flex-end;gap:10px;margin-bottom:10px">
      <div class="form-group" style="flex:2;margin:0">
        <label>Nome *</label>
        <input type="text" name="exp_nome_${n}" value="${esc(data?.nome)}" placeholder="Nome do experimental" required>
      </div>
      <div class="form-group" style="flex:1;margin:0">
        <label>Modalidade</label>
        <select name="exp_mod_${n}">
          <option value="group"      ${data?.modalidade==='group'||!data?'selected':''}>Grupo</option>
          <option value="individual" ${data?.modalidade==='individual'?'selected':''}>Individual</option>
        </select>
      </div>
      <div class="form-group" style="flex:2;margin:0">
        <label>Email</label>
        <input type="email" name="exp_email_${n}" value="${esc(data?.email)}" placeholder="email@...">
      </div>
      <div class="form-group" style="flex:1.5;margin:0">
        <label>Telefone</label>
        <input type="tel" name="exp_tel_${n}" value="${esc(data?.telefone)}" placeholder="(00) 00000-0000">
      </div>
      <div class="form-group" style="flex:2;margin:0">
        <label>Obs</label>
        <input type="text" name="exp_notas_${n}" value="${esc(data?.notas)}" placeholder="Observações">
      </div>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeExpRow(${n})" style="margin-bottom:0;flex-shrink:0">✕</button>
    </div>`;
  container.appendChild(row);
}

function removeExpRow(n) {
  document.getElementById(`exp-row-${n}`)?.remove();
}

async function saveExperimentais(turmaId, dataVal) {
  const rows = document.querySelectorAll('.exp-row');
  if (!rows.length) return;
  const inserts = [];
  rows.forEach(row => {
    const n = row.id.replace('exp-row-','');
    const nome = row.querySelector(`[name="exp_nome_${n}"]`)?.value?.trim();
    if (!nome) return;
    inserts.push({
      nome,
      email:       row.querySelector(`[name="exp_email_${n}"]`)?.value?.trim()||null,
      telefone:    row.querySelector(`[name="exp_tel_${n}"]`)?.value?.trim()||null,
      notas:       row.querySelector(`[name="exp_notas_${n}"]`)?.value?.trim()||null,
      modalidade:  row.querySelector(`[name="exp_mod_${n}"]`)?.value||'group',
      turma_id:    turmaId||null,
      professor_id:user.id,
      data_aula:   dataVal,
      status:      'pendente',
    });
  });
  if (inserts.length) await db.from('experimentais').insert(inserts);
}

// ============================================================
// 13. FINANCEIRO
// ============================================================
async function renderFinanceiro() {
  if (profile?.role === 'professor') await renderFinanceiroProfessor();
  else                                await renderFinanceiroAdmin();
}

async function renderFinanceiroProfessor() {
  const { mes, ano } = getCurrentMonthYear();
  setContent(`
    <div class="page-header"><h2>Meu Financeiro</h2></div>
    <div class="filters-bar">
      <select id="fmes">${MONTHS.slice(1).map((m,i)=>`<option value="${i+1}" ${i+1===mes?'selected':''}>${m}</option>`).join('')}</select>
      <select id="fano">${[ano-1,ano].map(y=>`<option value="${y}" ${y===ano?'selected':''}>${y}</option>`).join('')}</select>
      <button class="btn btn-primary" onclick="loadFinanceiroProfessor()">Ver</button>
    </div>
    <div id="fin-prof"></div>`);
  loadFinanceiroProfessor();
}

async function loadFinanceiroProfessor() {
  const mes = parseInt(document.getElementById('fmes')?.value) || getCurrentMonthYear().mes;
  const ano = parseInt(document.getElementById('fano')?.value) || getCurrentMonthYear().ano;
  const box = document.getElementById('fin-prof');
  if (!box) return;

  const { data: turmas } = await db.from('turmas').select('id,codigo,valor_aula').eq('professor_id',user.id);
  const turmaIds = turmas?.map(t=>t.id)||[];
  const turmaMap = {};
  turmas?.forEach(t=>{ turmaMap[t.id]=t; });

  const { data: aulas } = turmaIds.length
    ? await db.from('aulas').select('id,turma_id,is_substituicao').in('turma_id',turmaIds).gte('data',monthStart(mes,ano)).lte('data',monthEnd(mes,ano))
    : { data:[] };

  const valorAula  = profile?.valor_aula||0;
  const aulasDadas = aulas?.length||0;
  const subs       = aulas?.filter(a=>a.is_substituicao).length||0;
  const valorBase  = aulasDadas * valorAula;

  const { data: pag } = await db.from('pagamentos').select('*').eq('professor_id',user.id).eq('mes',mes).eq('ano',ano).maybeSingle();
  const desconto  = pag?.desconto||0;
  const acrescimo = pag?.acrescimo||0;
  const total     = valorBase - desconto + acrescimo;
  const status    = pag?.status||'pendente';

  // Breakdown por turma
  const byTurma = {};
  aulas?.forEach(a=>{ byTurma[a.turma_id]=(byTurma[a.turma_id]||0)+1; });

  box.innerHTML = `
    <div class="fin-summary-card">
      <div class="fin-month-title">${MONTHS[mes]} ${ano}</div>
      <div class="fin-status-badge">
        <span class="badge ${status==='pago'?'badge-success':'badge-warning'} badge-lg">${status==='pago'?'✅ Pago':'⏳ Pendente'}</span>
      </div>
      <div class="fin-calc">
        <div class="fin-row"><span>Aulas dadas</span><span>${aulasDadas}</span></div>
        ${subs>0?`<div class="fin-row text-muted"><span>Incl. substituições recebidas</span><span>${subs}</span></div>`:''}
        <div class="fin-row"><span>Valor por aula</span><span>${formatCurrency(valorAula)}</span></div>
        <div class="fin-row fin-total"><span>Valor base</span><span>${formatCurrency(valorBase)}</span></div>
        ${desconto>0?`<div class="fin-row text-danger"><span>Desconto</span><span>− ${formatCurrency(desconto)}</span></div>`:''}
        ${acrescimo>0?`<div class="fin-row text-success"><span>Acréscimo</span><span>+ ${formatCurrency(acrescimo)}</span></div>`:''}
        <div class="fin-row fin-grand-total"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
      </div>
      ${pag?.notas?`<div class="fin-notas">📝 ${pag.notas}</div>`:''}
    </div>
    ${Object.keys(byTurma).length?`
    <div class="card">
      <div class="card-header"><h4>Detalhamento por Turma</h4></div>
      <div class="card-body">
        ${Object.entries(byTurma).map(([tid,cnt])=>`
          <div class="list-item">
            <span>${turmaMap[tid]?.codigo||tid}</span>
            <span>${cnt} aula(s) — ${formatCurrency(cnt*valorAula)}</span>
          </div>`).join('')}
      </div>
    </div>`:''}`;
}

async function renderFinanceiroAdmin() {
  const { mes, ano } = getCurrentMonthYear();
  setContent(`
    <div class="page-header"><h2>Financeiro</h2></div>
    <div class="filters-bar">
      <select id="fmes">${MONTHS.slice(1).map((m,i)=>`<option value="${i+1}" ${i+1===mes?'selected':''}>${m}</option>`).join('')}</select>
      <select id="fano">${[ano-1,ano].map(y=>`<option value="${y}" ${y===ano?'selected':''}>${y}</option>`).join('')}</select>
      <button class="btn btn-primary" onclick="loadFinanceiroAdmin()">Calcular</button>
    </div>
    <div id="fin-admin"></div>`);
  loadFinanceiroAdmin();
}

async function loadFinanceiroAdmin() {
  const mes = parseInt(document.getElementById('fmes')?.value) || getCurrentMonthYear().mes;
  const ano = parseInt(document.getElementById('fano')?.value) || getCurrentMonthYear().ano;
  const box = document.getElementById('fin-admin');
  if (!box) return;
  box.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  const { data: profs } = await db.from('profiles').select('*').eq('role','professor').eq('ativo',true).order('name');
  if (!profs?.length) { box.innerHTML='<div class="empty-card"><p>Nenhum professor ativo.</p></div>'; return; }

  // Para cada professor: busca turmas, conta aulas
  const rows = await Promise.all(profs.map(async prof=>{
    const { data: turmas } = await db.from('turmas').select('id').eq('professor_id',prof.id);
    const tIds = turmas?.map(t=>t.id)||[];
    let aulasDadas=0, subs=0;
    if (tIds.length) {
      const { data: aulas } = await db.from('aulas').select('id,is_substituicao').in('turma_id',tIds).gte('data',monthStart(mes,ano)).lte('data',monthEnd(mes,ano));
      aulasDadas = aulas?.length||0;
      subs = aulas?.filter(a=>a.is_substituicao).length||0;
    }
    const { data: pag } = await db.from('pagamentos').select('*').eq('professor_id',prof.id).eq('mes',mes).eq('ano',ano).maybeSingle();
    const valorAula  = prof.valor_aula||0;
    const valorBase  = aulasDadas * valorAula;
    const desconto   = pag?.desconto||0;
    const acrescimo  = pag?.acrescimo||0;
    const total      = valorBase - desconto + acrescimo;
    return { ...prof, aulasDadas, subs, valorAula, valorBase, desconto, acrescimo, total, status:pag?.status||'pendente', pagId:pag?.id||null, notas:pag?.notas||'' };
  }));

  _D.finRows = {};
  rows.forEach(r=>{ _D.finRows[r.id]=r; });

  const gTotal    = rows.reduce((s,r)=>s+r.total,0);
  const gPago     = rows.filter(r=>r.status==='pago').reduce((s,r)=>s+r.total,0);
  const gPendente = gTotal-gPago;

  box.innerHTML = `
    <div class="stats-grid">
      ${statCard('💵', formatCurrency(gTotal), `Total ${MONTHS[mes]}`)}
      ${statCard('✅', formatCurrency(gPago),  'Pago')}
      ${statCard('⏳', formatCurrency(gPendente), 'Pendente')}
    </div>
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Professor</th><th>Aulas</th><th>Subs</th>
            <th>Valor/Aula</th><th>Base</th><th>Desc.</th>
            <th>Acrés.</th><th>Total</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${rows.map(r=>`
              <tr>
                <td><strong>${r.name}</strong></td>
                <td>${r.aulasDadas}</td>
                <td>${r.subs}</td>
                <td>${formatCurrency(r.valorAula)}</td>
                <td>${formatCurrency(r.valorBase)}</td>
                <td class="text-danger">${r.desconto>0?formatCurrency(r.desconto):'—'}</td>
                <td class="text-success">${r.acrescimo>0?formatCurrency(r.acrescimo):'—'}</td>
                <td><strong>${formatCurrency(r.total)}</strong></td>
                <td><span class="badge ${r.status==='pago'?'badge-success':'badge-warning'}">${r.status==='pago'?'Pago':'Pendente'}</span></td>
                <td><div class="action-btns">
                  <button class="btn btn-sm btn-secondary" onclick="openModalAjuste('${r.id}',${mes},${ano})">Ajustar</button>
                  ${r.status!=='pago'
                    ? `<button class="btn btn-sm btn-success" onclick="marcarPago('${r.id}',${mes},${ano})">Pago ✓</button>`
                    : `<button class="btn btn-sm btn-secondary" onclick="desmarcarPago('${r.pagId}')">Desfazer</button>`}
                </div></td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="7"><strong>TOTAL GERAL</strong></td><td><strong>${formatCurrency(gTotal)}</strong></td><td colspan="2"></td></tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

function openModalAjuste(profId, mes, ano) {
  const r = _D.finRows?.[profId];
  if (!r) { showToast('Dados não encontrados','error'); return; }
  openModal(`
    <div class="modal-header">
      <h3>Ajuste — ${r.name}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="saveAjuste(event)" style="padding:20px">
      <input type="hidden" name="professor_id" value="${profId}">
      <input type="hidden" name="mes" value="${mes}">
      <input type="hidden" name="ano" value="${ano}">
      <input type="hidden" name="aulas_dadas"  value="${r.aulasDadas}">
      <input type="hidden" name="valor_aula"   value="${r.valorAula}">
      <input type="hidden" name="valor_base"   value="${r.valorBase}">
      <div class="fin-calc" style="margin-bottom:16px">
        <div class="fin-row"><span>Aulas dadas</span><span>${r.aulasDadas}</span></div>
        <div class="fin-row"><span>Valor/aula</span><span>${formatCurrency(r.valorAula)}</span></div>
        <div class="fin-row fin-total"><span>Base</span><span>${formatCurrency(r.valorBase)}</span></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Desconto (R$)</label>
          <input type="number" name="desconto" step="0.01" min="0" value="${r.desconto||0}">
        </div>
        <div class="form-group">
          <label>Acréscimo (R$)</label>
          <input type="number" name="acrescimo" step="0.01" min="0" value="${r.acrescimo||0}">
        </div>
      </div>
      <div class="form-group">
        <label>Observações</label>
        <textarea name="notas" rows="2">${r.notas||''}</textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar Ajuste</button>
      </div>
    </form>`);
}

async function saveAjuste(e) {
  e.preventDefault();
  const fd        = new FormData(e.target);
  const profId    = fd.get('professor_id');
  const mes       = parseInt(fd.get('mes'));
  const ano       = parseInt(fd.get('ano'));
  const aulasDadas= parseInt(fd.get('aulas_dadas'));
  const valorAula = parseFloat(fd.get('valor_aula'));
  const valorBase = parseFloat(fd.get('valor_base'));
  const desconto  = parseFloat(fd.get('desconto'))||0;
  const acrescimo = parseFloat(fd.get('acrescimo'))||0;
  const total     = valorBase - desconto + acrescimo;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled=true;

  const { error } = await db.from('pagamentos').upsert({
    professor_id: profId, mes, ano,
    aulas_dadas:  aulasDadas, substituicoes_recebidas: _D.finRows?.[profId]?.subs||0,
    valor_aula: valorAula, valor_base: valorBase,
    desconto, acrescimo, total,
    notas: fd.get('notas')||null,
    updated_at: new Date().toISOString()
  }, { onConflict:'professor_id,mes,ano' });

  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  showToast('Ajuste salvo!','success');
  closeModal(); loadFinanceiroAdmin();
}

async function marcarPago(profId, mes, ano) {
  const r = _D.finRows?.[profId];
  if (!r) return;
  const { error } = await db.from('pagamentos').upsert({
    professor_id: profId, mes, ano,
    aulas_dadas: r.aulasDadas, substituicoes_recebidas: r.subs,
    valor_aula: r.valorAula, valor_base: r.valorBase,
    desconto: r.desconto, acrescimo: r.acrescimo, total: r.total,
    status: 'pago', updated_at: new Date().toISOString()
  }, { onConflict:'professor_id,mes,ano' });
  if (error) { showToast('Erro','error'); return; }
  showToast('Marcado como pago! ✅','success');
  loadFinanceiroAdmin();
}

async function desmarcarPago(pagId) {
  if (!pagId || !confirm('Desfazer pagamento?')) return;
  await db.from('pagamentos').update({ status:'pendente', updated_at:new Date().toISOString() }).eq('id',pagId);
  showToast('Desmarcado','success');
  loadFinanceiroAdmin();
}

// ============================================================
// 14. EXPERIMENTAIS (admin)
// ============================================================
async function renderExperimentais() {
  const { data: exps } = await db.from('experimentais')
    .select('*,turmas(codigo),profiles(name)')
    .order('data_aula', { ascending: false });

  _D.exps = {};
  exps?.forEach(e => { _D.exps[e.id] = e; });

  const pendentes   = exps?.filter(e=>e.status==='pendente')||[];
  const convertidos = exps?.filter(e=>e.status==='convertido')||[];
  const descartados = exps?.filter(e=>e.status==='descartado')||[];

  function expRow(e) {
    const statusBadge = {
      pendente:   '<span class="badge badge-warning">Pendente</span>',
      convertido: '<span class="badge badge-success">Convertido</span>',
      descartado: '<span class="badge badge-gray">Descartado</span>',
    }[e.status] || '';
    const actions = e.status === 'pendente' ? `
      <button class="btn btn-sm btn-primary"  onclick="openModalConverterExp('${e.id}')">Converter ✓</button>
      <button class="btn btn-sm btn-danger"   onclick="descartarExp('${e.id}')">Descartar</button>` : '';
    return `<tr>
      <td>${formatDate(e.data_aula)}</td>
      <td><strong>${e.nome}</strong></td>
      <td>${e.email||'—'}</td>
      <td>${e.telefone||'—'}</td>
      <td><span class="badge badge-info">${modalLabel(e.modalidade)}</span></td>
      <td>${e.turmas?.codigo||'Individual'}</td>
      <td>${e.profiles?.name||'—'}</td>
      <td>${e.notas||'—'}</td>
      <td>${statusBadge}</td>
      <td><div class="action-btns">${actions}</div></td>
    </tr>`;
  }

  setContent(`
    <div class="page-header">
      <h2>Experimentais 🔬</h2>
      <span class="text-muted">${pendentes.length} pendente(s)</span>
    </div>

    <div class="stats-grid" style="margin-bottom:22px">
      ${statCard('⏳', pendentes.length,   'Pendentes')}
      ${statCard('✅', convertidos.length, 'Convertidos')}
      ${statCard('❌', descartados.length, 'Descartados')}
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Todos os Experimentais</h3>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Data</th><th>Nome</th><th>Email</th><th>Telefone</th>
            <th>Modalidade</th><th>Turma</th><th>Professor</th><th>Obs</th>
            <th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${exps?.length
              ? exps.map(expRow).join('')
              : '<tr><td colspan="10" class="empty-state">Nenhum experimental registrado ainda.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`);
}

async function openModalConverterExp(id) {
  const e = _D.exps?.[id];
  if (!e) return;
  const { data: turmas } = await db.from('turmas').select('id,codigo,modalidade').eq('status','active').order('codigo');

  openModal(`
    <div class="modal-header">
      <h3>Converter em Aluno — ${e.nome}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="confirmarConverterExp(event)" style="padding:20px">
      <input type="hidden" name="exp_id" value="${e.id}">
      <div class="form-group">
        <label>Nome *</label>
        <input type="text" name="nome" value="${esc(e.nome)}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" value="${esc(e.email)}">
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input type="tel" name="telefone" value="${esc(e.telefone)}">
        </div>
      </div>
      <div class="form-group">
        <label>Turma *</label>
        <select name="turma_id" required>
          <option value="">— Selecione a turma —</option>
          ${turmas?.map(t=>`<option value="${t.id}" ${e.turma_id===t.id?'selected':''}>${t.codigo} (${modalLabel(t.modalidade)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Observações</label>
        <textarea name="notas" rows="2">${esc(e.notas)}</textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">✓ Confirmar Conversão</button>
      </div>
    </form>`);
}

async function confirmarConverterExp(e) {
  e.preventDefault();
  const fd      = new FormData(e.target);
  const expId   = fd.get('exp_id');
  const turmaId = fd.get('turma_id');
  const btn     = e.target.querySelector('[type=submit]');
  btn.disabled  = true; btn.textContent = 'Convertendo…';

  try {
    // 1. Criar aluno
    const { data: novoAluno, error: errAluno } = await db.from('alunos').insert({
      nome:     fd.get('nome').trim(),
      email:    fd.get('email').trim()||null,
      telefone: fd.get('telefone').trim()||null,
      notas:    fd.get('notas').trim()||null,
    }).select().single();
    if (errAluno) throw errAluno;

    // 2. Matricular em turma (obrigatório)
    const { error: errTA } = await db.from('turma_alunos').insert({
      turma_id: turmaId, aluno_id: novoAluno.id
    });
    if (errTA) throw errTA;

    // 3. Marcar experimental como convertido
    await db.from('experimentais').update({
      status:   'convertido',
      aluno_id: novoAluno.id,
    }).eq('id', expId);

    showToast(`${novoAluno.nome} convertido em aluno! ✅`, 'success');
    closeModal();
    renderExperimentais();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
    btn.disabled = false; btn.textContent = '✓ Confirmar Conversão';
  }
}

async function descartarExp(id) {
  if (!confirm('Marcar este experimental como descartado?')) return;
  await db.from('experimentais').update({ status: 'descartado' }).eq('id', id);
  showToast('Descartado', 'success');
  renderExperimentais();
}

// ============================================================
// 15. UTILITÁRIOS
// ============================================================
function setContent(html) {
  const el = document.getElementById('content');
  if (el) el.innerHTML = html;
}

function statCard(icon, value, label, onclick='') {
  return `<div class="stat-card" ${onclick?`onclick="${onclick}" style="cursor:pointer"`:''}>
    <div class="stat-icon">${icon}</div>
    <div class="stat-info">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  </div>`;
}

function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal-content').innerHTML = '';
}

function showToast(msg, type='info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),350); },3500);
}

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
}

function formatDate(d) {
  if (!d) return '—';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function getCurrentMonthYear() {
  const n = new Date();
  return { mes: n.getMonth()+1, ano: n.getFullYear() };
}

function monthStart(mes, ano) {
  return `${ano}-${String(mes).padStart(2,'0')}-01`;
}
function monthEnd(mes, ano) {
  const ultimoDia = new Date(ano, mes, 0).getDate();   // último dia real do mês (28/29/30/31)
  return `${ano}-${String(mes).padStart(2,'0')}-${String(ultimoDia).padStart(2,'0')}`;
}

function getRoleLabel(r) {
  return { admin:'Administrador', secretaria:'Secretaria', professor:'Professor', financeiro:'Financeiro', aluno:'Aluno' }[r] || r;
}

function modalLabel(m) {
  return { group:'Grupo', individual:'Individual', extra:'Extra' }[m] || m;
}

function initials(name='') {
  return name.trim().split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase() || '?';
}

// Escapa HTML em valores de atributos de formulários
function esc(v) {
  if (!v) return '';
  return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// 20. PERMISSÕES
// ============================================================
const PERMS = [
  { key:'alunos_ver',        label:'Ver alunos',                        desc:'Acessa a lista e a ficha dos alunos' },
  { key:'alunos_editar',     label:'Cadastrar / editar alunos',         desc:'Cria alunos e altera dados cadastrais' },
  { key:'pagamentos_ver',    label:'Ver pagamentos',                    desc:'Painel de pagamentos e aba financeira do aluno' },
  { key:'pagamentos_editar', label:'Registrar pagamentos',              desc:'Marca parcelas como pagas, edita valores e vencimentos' },
  { key:'trancamento',       label:'Trancar / reativar / alterar plano',desc:'Trancamento, cancelamento e mudança do número de parcelas' },
  { key:'crm_ver',           label:'Ver CRM',                           desc:'Acessa o funil de potenciais alunos' },
  { key:'crm_editar',        label:'Editar CRM',                        desc:'Cria e move leads, adiciona anotações, matricula' },
  { key:'crm_funis',         label:'Configurar funis do CRM',           desc:'Cria, edita e exclui funis e etapas' },
  { key:'membros_ver',       label:'Ver Área de Membros',               desc:'Acessa todos os painéis e materiais como equipe' },
  { key:'membros_editar',    label:'Editar Área de Membros',            desc:'Cria painéis, envia arquivos e libera alunos' },
];
const PERM_DEFAULTS = {
  admin:      PERMS.map(p=>p.key),
  secretaria: ['alunos_ver','alunos_editar','pagamentos_ver','pagamentos_editar','trancamento','crm_ver','crm_editar','membros_ver','membros_editar'],
  financeiro: ['alunos_ver','pagamentos_ver','pagamentos_editar'],
  professor:  ['membros_ver'],
  aluno:      [],
};
const ROLES = [
  { id:'admin',      label:'Administrador' },
  { id:'secretaria', label:'Secretaria' },
  { id:'financeiro', label:'Financeiro' },
  { id:'professor',  label:'Professor' },
];

function can(perm, prof = profile) {
  if (!prof) return false;
  if (prof.role === 'admin') return true;
  const ov = prof.permissoes || {};
  if (Object.prototype.hasOwnProperty.call(ov, perm)) return !!ov[perm];
  return (PERM_DEFAULTS[prof.role] || []).includes(perm);
}

function semPermissao(msg = 'Você não tem permissão para acessar esta tela.') {
  setContent(`<div class="card"><div class="card-body"><p class="empty-state">🔒 ${msg}<br><span class="text-muted">Peça ao administrador para liberar em "Usuários & Permissões".</span></p></div></div>`);
}

// ============================================================
// 21. HELPERS — datas, parcelas, whatsapp
// ============================================================
const IDIOMAS = ['Inglês','Espanhol','Francês','Italiano','Alemão','Português para estrangeiros','Outro'];
const ORIGENS = ['Instagram','Facebook','Google','Site','Indicação','WhatsApp','Passou na porta','Evento','Outro'];
const FORMAS_PGTO = [
  { id:'pix',           label:'Pix' },
  { id:'cartao',        label:'Cartão' },
  { id:'boleto',        label:'Boleto' },
  { id:'dinheiro',      label:'Dinheiro' },
  { id:'transferencia', label:'Transferência' },
  { id:'outro',         label:'Outro' },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function makeDate(ano, mes, dia) {
  const last = new Date(ano, mes, 0).getDate();
  const d = Math.min(Math.max(1, dia||1), last);
  return `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function addMonthsYM(ano, mes, n) {
  const t = ano*12 + (mes-1) + n;
  return { ano: Math.floor(t/12), mes: (t%12)+1 };
}
function ymFromInput(v) {          // "2026-09" -> {ano, mes}
  const [a, m] = (v||'').split('-').map(Number);
  return { ano: a, mes: m };
}
function ymToInput(ano, mes) { return `${ano}-${String(mes).padStart(2,'0')}`; }
function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
function daysSince(dateISO) {
  return Math.floor((new Date(todayISO()) - new Date(dateISO)) / 86400000);
}
function valorLiquido(p) { return (Number(p.valor)||0) - (Number(p.desconto)||0); }
function parcelaEstado(p) {
  if (p.status === 'pendente' && p.vencimento < todayISO()) return 'atrasada';
  return p.status;
}
function parcelaBadge(p) {
  const e = parcelaEstado(p);
  return {
    pendente:  '<span class="badge badge-warning">Pendente</span>',
    atrasada:  `<span class="badge badge-danger">Atrasada ${daysSince(p.vencimento)}d</span>`,
    pago:      '<span class="badge badge-success">Paga</span>',
    suspensa:  '<span class="badge badge-info">Suspensa</span>',
    cancelada: '<span class="badge badge-gray">Cancelada</span>',
  }[e] || e;
}
function alunoStatusBadge(s) {
  return {
    ativo:     '<span class="badge badge-success">Ativo</span>',
    trancado:  '<span class="badge badge-info">Trancado</span>',
    cancelado: '<span class="badge badge-gray">Cancelado</span>',
    concluido: '<span class="badge badge-primary">Concluído</span>',
  }[s] || `<span class="badge badge-gray">${s||'—'}</span>`;
}
function formaLabel(id) { return FORMAS_PGTO.find(f=>f.id===id)?.label || id || '—'; }

function waLink(tel, msg='') {
  if (!tel) return '';
  let d = String(tel).replace(/\D/g,'');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return `https://wa.me/${d}${msg ? '?text='+encodeURIComponent(msg) : ''}`;
}
function waBtn(tel, msg='', label='WhatsApp') {
  if (!tel) return '';
  return `<a class="btn btn-sm btn-success wa-btn" href="${waLink(tel,msg)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 ${label}</a>`;
}
function selectOptions(list, selected, placeholder='Selecione…') {
  return `<option value="">${placeholder}</option>` +
    list.map(o => {
      const id = typeof o === 'string' ? o : o.id;
      const lb = typeof o === 'string' ? o : o.label;
      return `<option value="${esc(id)}" ${selected===id?'selected':''}>${esc(lb)}</option>`;
    }).join('');
}

async function logHistorico(alunoId, tipo, descricao) {
  await db.from('aluno_historico').insert({ aluno_id: alunoId, tipo, descricao, user_id: user?.id });
}

function gerarParcelas(alunoId, { n, valor, dia, mesInicio, anoInicio, numeroInicial=1 }) {
  const rows = [];
  for (let i=0; i<n; i++) {
    const { ano, mes } = addMonthsYM(anoInicio, mesInicio, i);
    rows.push({ aluno_id: alunoId, numero: numeroInicial+i, valor, vencimento: makeDate(ano, mes, dia), status:'pendente' });
  }
  return rows;
}

function planoFields(prefix='', vals={}) {
  const { ano, mes } = getCurrentMonthYear();
  const next = addMonthsYM(ano, mes, 1);
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Nº de parcelas *</label>
        <input type="number" name="${prefix}num_parcelas" min="1" max="60" value="${vals.num_parcelas||''}" oninput="atualizaTotalPlano('${prefix}')" placeholder="ex: 12">
      </div>
      <div class="form-group">
        <label>Valor de cada parcela (R$) *</label>
        <input type="number" name="${prefix}valor_parcela" step="0.01" min="0" value="${vals.valor_parcela||''}" oninput="atualizaTotalPlano('${prefix}')" placeholder="ex: 250,00">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Dia do vencimento *</label>
        <input type="number" name="${prefix}dia_vencimento" min="1" max="31" value="${vals.dia_vencimento||10}">
      </div>
      <div class="form-group">
        <label>Primeiro vencimento (mês) *</label>
        <input type="month" name="${prefix}primeiro" value="${vals.primeiro || ymToInput(next.ano, next.mes)}">
      </div>
    </div>
    <div class="plano-total" id="${prefix}plano-total">Total do plano: <strong>${formatCurrency((vals.num_parcelas||0)*(vals.valor_parcela||0))}</strong></div>`;
}
function atualizaTotalPlano(prefix='') {
  const f = document.querySelector('#modal-content form') || document;
  const n = Number(f.querySelector(`[name="${prefix}num_parcelas"]`)?.value||0);
  const v = Number(f.querySelector(`[name="${prefix}valor_parcela"]`)?.value||0);
  const el = document.getElementById(`${prefix}plano-total`);
  if (el) el.innerHTML = `Total do plano: <strong>${formatCurrency(n*v)}</strong>`;
}
function lerPlano(fd, prefix='') {
  const n     = parseInt(fd.get(`${prefix}num_parcelas`)||0);
  const valor = parseFloat(fd.get(`${prefix}valor_parcela`)||0);
  const dia   = parseInt(fd.get(`${prefix}dia_vencimento`)||10);
  const { ano, mes } = ymFromInput(fd.get(`${prefix}primeiro`));
  if (!n || !valor || !ano || !mes) return null;
  return { n, valor, dia, mesInicio: mes, anoInicio: ano };
}

// ============================================================
// 22. ALUNOS — lista (substitui a versão antiga)
// ============================================================
async function renderAlunos() {
  if (!can('alunos_ver')) return semPermissao();
  const sel = can('pagamentos_ver') ? '*, parcelas(id,status,vencimento,valor,desconto)' : '*';
  const { data: alunos, error } = await db.from('alunos').select(sel).order('nome');
  if (error) { setContent(`<div class="alert alert-warning">Erro ao carregar alunos: ${error.message}</div>`); return; }

  _D.alunos = {}; _alunoFiltro = 'todos';
  alunos?.forEach(a => {
    const ps = a.parcelas || [];
    const atrasadas = ps.filter(p => parcelaEstado(p)==='atrasada');
    a._atrasadas = atrasadas.length;
    a._valorAtraso = atrasadas.reduce((s,p)=>s+valorLiquido(p),0);
    a._temPlano = ps.length > 0;
    _D.alunos[a.id] = a;
  });

  const ativos    = alunos?.filter(a=>(a.status||'ativo')==='ativo').length||0;
  const trancados = alunos?.filter(a=>a.status==='trancado').length||0;
  const emAtraso  = alunos?.filter(a=>a._atrasadas>0 && (a.status||'ativo')==='ativo').length||0;

  function finBadge(a) {
    if (!can('pagamentos_ver')) return '—';
    if (a.status==='trancado')  return '<span class="badge badge-info">Suspenso</span>';
    if (a.status==='cancelado') return '<span class="badge badge-gray">—</span>';
    if (a._atrasadas>0) return `<span class="badge badge-danger">${a._atrasadas} em atraso</span>`;
    if (a._temPlano)    return '<span class="badge badge-success">Em dia</span>';
    return '<span class="badge badge-gray">Sem plano</span>';
  }

  setContent(`
    <div class="page-header">
      <h2>Alunos</h2>
      ${can('alunos_editar') ? '<button class="btn btn-primary" onclick="openModalAluno(null)">+ Novo Aluno</button>' : ''}
    </div>
    <div class="stats-grid" style="margin-bottom:18px">
      ${statCard('🎓', ativos, 'Alunos ativos')}
      ${statCard('⏸️', trancados, 'Trancados')}
      ${can('pagamentos_ver') ? statCard('⚠️', emAtraso, 'Com parcela atrasada', "filtrarAlunos('atraso')") : ''}
    </div>
    <div class="card">
      <div class="card-body" style="padding-bottom:0">
        <div class="toolbar">
          <input type="text" class="search-input" placeholder="🔍 Buscar por nome, telefone ou email…" oninput="filterAlunos(this.value)">
          <div class="chips" id="alunos-chips">
            <button class="chip active" data-f="todos"    onclick="filtrarAlunos('todos')">Todos</button>
            <button class="chip" data-f="ativo"           onclick="filtrarAlunos('ativo')">Ativos</button>
            ${can('pagamentos_ver') ? '<button class="chip" data-f="atraso" onclick="filtrarAlunos(\'atraso\')">Em atraso</button>' : ''}
            <button class="chip" data-f="trancado"        onclick="filtrarAlunos('trancado')">Trancados</button>
            <button class="chip" data-f="cancelado"       onclick="filtrarAlunos('cancelado')">Cancelados</button>
          </div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Nome</th><th>Contato</th><th>Idioma</th><th>Status</th><th>Financeiro</th><th>Ações</th></tr></thead>
          <tbody id="alunos-tbody">
            ${alunos?.length ? alunos.map(a=>`
              <tr data-n="${esc((a.nome+' '+(a.telefone||'')+' '+(a.email||'')).toLowerCase())}"
                  data-status="${a.status||'ativo'}" data-atraso="${a._atrasadas>0?1:0}"
                  class="row-click" onclick="openFichaAluno('${a.id}')">
                <td><div class="user-cell"><div class="mini-avatar">${initials(a.nome)}</div><strong>${esc(a.nome)}</strong></div></td>
                <td>${esc(a.telefone)||'—'} ${a.telefone ? `<a class="wa-icon" href="${waLink(a.telefone)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="WhatsApp">💬</a>`:''}<br><span class="text-muted">${esc(a.email)||''}</span></td>
                <td>${esc(a.idioma)||'—'}</td>
                <td>${alunoStatusBadge(a.status||'ativo')}</td>
                <td>${finBadge(a)}</td>
                <td><div class="action-btns">
                  <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openFichaAluno('${a.id}')">Ficha</button>
                  ${can('alunos_editar') ? `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openModalAluno('${a.id}')">Editar</button>` : ''}
                </div></td>
              </tr>`).join('')
            : '<tr><td colspan="6" class="empty-state">Nenhum aluno cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`);
}

let _alunoFiltro = 'todos';
function filtrarAlunos(f) {
  _alunoFiltro = f;
  document.querySelectorAll('#alunos-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.f===f));
  filterAlunos(document.querySelector('.search-input')?.value || '');
}
function filterAlunos(q) {
  q = (q||'').toLowerCase();
  document.querySelectorAll('#alunos-tbody tr[data-n]').forEach(tr => {
    const okQ = tr.dataset.n.includes(q);
    let okF = true;
    if (_alunoFiltro==='atraso') okF = tr.dataset.atraso==='1';
    else if (_alunoFiltro!=='todos') okF = tr.dataset.status===_alunoFiltro;
    tr.style.display = (okQ && okF) ? '' : 'none';
  });
}

function openModalAluno(id) {
  if (!can('alunos_editar')) { showToast('Sem permissão para editar alunos','error'); return; }
  const a = id ? _D.alunos?.[id] : null;
  openModal(`
    <div class="modal-header">
      <h3>${a?'Editar Aluno':'Novo Aluno'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="saveAluno(event)" style="padding:20px">
      <div class="form-group">
        <label>Nome Completo *</label>
        <input type="text" name="nome" value="${esc(a?.nome)}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Telefone (WhatsApp)</label>
          <input type="tel" name="telefone" value="${esc(a?.telefone)}" placeholder="(11) 99999-9999">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" value="${esc(a?.email)}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Idioma</label>
          <select name="idioma">${selectOptions(IDIOMAS, a?.idioma)}</select>
        </div>
        <div class="form-group">
          <label>Como conheceu a escola</label>
          <select name="origem">${selectOptions(ORIGENS, a?.origem)}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data de nascimento</label>
          <input type="date" name="data_nascimento" value="${a?.data_nascimento||''}">
        </div>
        <div class="form-group">
          <label>CPF</label>
          <input type="text" name="cpf" value="${esc(a?.cpf)}" placeholder="000.000.000-00">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Responsável (se menor)</label>
          <input type="text" name="responsavel" value="${esc(a?.responsavel)}">
        </div>
        <div class="form-group">
          <label>Data da matrícula</label>
          <input type="date" name="data_matricula" value="${a?.data_matricula||todayISO()}">
        </div>
      </div>
      <div class="form-group">
        <label>Observações</label>
        <textarea name="notas" rows="2">${esc(a?.notas)}</textarea>
      </div>
      ${!a && can('pagamentos_editar') ? `
        <details class="plano-box" open>
          <summary>💰 Plano de pagamento (opcional — pode configurar depois na ficha)</summary>
          ${planoFields('p_')}
        </details>` : ''}
      <input type="hidden" name="id" value="${a?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${a?'Salvar':'Criar Aluno'}</button>
      </div>
    </form>`);
}

async function saveAluno(e) {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const id  = fd.get('id');
  const g   = k => (fd.get(k)||'').toString().trim() || null;
  const row = {
    nome: g('nome'), email: g('email'), telefone: g('telefone'), notas: g('notas'),
    idioma: g('idioma'), origem: g('origem'), cpf: g('cpf'), responsavel: g('responsavel'),
    data_nascimento: g('data_nascimento'), data_matricula: g('data_matricula'),
  };
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  try {
    if (id) {
      const { error } = await db.from('alunos').update(row).eq('id', id);
      if (error) throw error;
      showToast('Aluno atualizado!','success');
      closeModal();
      if (activeTab==='aluno-ficha') openFichaAluno(id, _D.fichaTab); else renderAlunos();
    } else {
      const plano = can('pagamentos_editar') ? lerPlano(fd, 'p_') : null;
      const { data: novo, error } = await db.from('alunos').insert(row).select().single();
      if (error) throw error;
      if (plano) await aplicarPlano(novo.id, plano, 'novo');
      showToast('Aluno criado! 🎉','success');
      closeModal();
      openFichaAluno(novo.id, 'financeiro');
    }
  } catch (err) {
    showToast('Erro: ' + err.message, 'error'); btn.disabled = false;
  }
}

// ============================================================
// 23. FICHA DO ALUNO — dados, financeiro (parcelas), histórico
// ============================================================
async function openFichaAluno(id, tab) {
  if (!can('alunos_ver')) return semPermissao();
  activeTab = 'aluno-ficha';
  _D.fichaTab = tab || _D.fichaTab || (can('pagamentos_ver') ? 'financeiro' : 'dados');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab==='alunos'));
  document.getElementById('page-title').textContent = 'Ficha do Aluno';
  setContent(`<div class="loading"><div class="spinner"></div></div>`);

  const [{ data: a, error }, { data: parcelas }, { data: hist }, { data: turmas }] = await Promise.all([
    db.from('alunos').select('*').eq('id', id).single(),
    can('pagamentos_ver') ? db.from('parcelas').select('*').eq('aluno_id', id).order('numero') : Promise.resolve({data:[]}),
    db.from('aluno_historico').select('*, profiles(name)').eq('aluno_id', id).order('created_at',{ascending:false}),
    db.from('turma_alunos').select('id,status,turmas(id,codigo,nome,horario,idioma,profiles(name))').eq('aluno_id', id),
  ]);
  if (error || !a) { setContent(`<div class="alert alert-warning">Aluno não encontrado.</div>`); return; }
  a.status = a.status || 'ativo';
  _D.alunos = _D.alunos || {}; _D.alunos[a.id] = a;
  _D.parcelas = {}; (parcelas||[]).forEach(p => { _D.parcelas[p.id] = p; });
  _D.fichaAluno = a; _D.fichaParcelas = parcelas||[]; _D.fichaHist = hist||[]; _D.fichaTurmas = turmas||[];

  const podeTrancar = can('trancamento');
  const acoesStatus = !podeTrancar ? '' : (
    a.status==='ativo'
      ? `<button class="btn btn-sm btn-warning" onclick="openModalTrancar('${a.id}')">⏸ Trancar curso</button>
         <button class="btn btn-sm btn-danger"  onclick="openModalCancelar('${a.id}')">✕ Cancelar matrícula</button>`
    : a.status==='trancado'
      ? `<button class="btn btn-sm btn-success" onclick="openModalReativar('${a.id}')">▶ Reativar</button>
         <button class="btn btn-sm btn-danger"  onclick="openModalCancelar('${a.id}')">✕ Cancelar matrícula</button>`
      : `<button class="btn btn-sm btn-success" onclick="reativarSimples('${a.id}')">▶ Reativar matrícula</button>`);

  setContent(`
    <button class="btn-link btn-back" onclick="showTab('alunos')">← Voltar para Alunos</button>
    <div class="card ficha-header">
      <div class="ficha-id">
        <div class="user-avatar big">${initials(a.nome)}</div>
        <div>
          <h2>${esc(a.nome)} ${alunoStatusBadge(a.status)}</h2>
          <div class="ficha-meta">
            ${a.idioma ? `<span class="badge badge-info">${esc(a.idioma)}</span>` : ''}
            ${a.telefone ? `<span>📱 ${esc(a.telefone)}</span>` : ''}
            ${a.email ? `<span>✉️ ${esc(a.email)}</span>` : ''}
            ${a.data_matricula ? `<span class="text-muted">Matrícula ${formatDate(a.data_matricula)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="ficha-actions">
        ${waBtn(a.telefone, `Olá ${a.nome.split(' ')[0]}, tudo bem? Aqui é da VMLI Idiomas.`)}
        ${can('alunos_editar') ? `<button class="btn btn-sm btn-secondary" onclick="openModalAluno('${a.id}')">✏️ Editar dados</button>` : ''}
        ${can('membros_editar') && !a.profile_id && a.email ? `<button class="btn btn-sm btn-info" onclick="criarAcessoAluno('${a.id}')">🔑 Criar acesso</button>` : ''}
        ${acoesStatus}
      </div>
    </div>

    <div class="tabs">
      ${can('pagamentos_ver') ? `<button class="tab-btn ${_D.fichaTab==='financeiro'?'active':''}" onclick="fichaTab('financeiro')">💰 Financeiro</button>` : ''}
      <button class="tab-btn ${_D.fichaTab==='dados'?'active':''}" onclick="fichaTab('dados')">👤 Dados</button>
      <button class="tab-btn ${_D.fichaTab==='turmas'?'active':''}" onclick="fichaTab('turmas')">📚 Turmas</button>
      <button class="tab-btn ${_D.fichaTab==='historico'?'active':''}" onclick="fichaTab('historico')">📋 Histórico</button>
      ${can('membros_ver') ? `<button class="tab-btn ${_D.fichaTab==='membros'?'active':''}" onclick="fichaTab('membros')">🎬 Área de Membros</button>` : ''}
    </div>
    <div id="ficha-body"></div>`);
  fichaTab(_D.fichaTab);
}

function fichaTab(tab) {
  _D.fichaTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(
    {financeiro:'Financeiro', dados:'Dados', turmas:'Turmas', historico:'Histórico', membros:'Área de Membros'}[tab])));
  const el = document.getElementById('ficha-body');
  if (!el) return;
  if (tab === 'membros') {
    el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    fichaMembrosHTML().then(h => { if (_D.fichaTab==='membros') el.innerHTML = h; })
      .catch(err => { el.innerHTML = `<div class="alert alert-warning">Erro: ${err.message}<br><span class="text-muted">Você já rodou o SQL 03_area_membros.sql?</span></div>`; });
    return;
  }
  el.innerHTML = { financeiro: fichaFinanceiroHTML, dados: fichaDadosHTML, turmas: fichaTurmasHTML, historico: fichaHistoricoHTML }[tab]();
}

function fichaDadosHTML() {
  const a = _D.fichaAluno;
  const item = (l, v) => `<div class="info-item"><span class="info-label">${l}</span><span class="info-value">${v||'—'}</span></div>`;
  return `<div class="card"><div class="card-body info-grid">
    ${item('Nome', esc(a.nome))}
    ${item('Telefone', esc(a.telefone))}
    ${item('Email', esc(a.email))}
    ${item('Idioma', esc(a.idioma))}
    ${item('Nascimento', formatDate(a.data_nascimento))}
    ${item('CPF', esc(a.cpf))}
    ${item('Responsável', esc(a.responsavel))}
    ${item('Origem', esc(a.origem))}
    ${item('Matrícula', formatDate(a.data_matricula))}
    ${item('Status', alunoStatusBadge(a.status))}
    <div class="info-item full"><span class="info-label">Observações</span><span class="info-value">${esc(a.notas)||'—'}</span></div>
  </div></div>`;
}

function fichaTurmasHTML() {
  const ts = _D.fichaTurmas.filter(t => t.turmas);
  return `<div class="card"><div class="card-body">
    ${ts.length ? ts.map(t => `
      <div class="list-item">
        <div class="list-item-left">
          <div class="list-item-title">${esc(t.turmas.codigo)} ${t.turmas.nome ? '— '+esc(t.turmas.nome) : ''}</div>
          <div class="list-item-sub">${esc(t.turmas.horario)||''} ${t.turmas.profiles?.name ? '• Prof. '+esc(t.turmas.profiles.name) : ''}</div>
        </div>
        <div class="list-item-right"><span class="badge ${t.status==='active'?'badge-success':'badge-gray'}">${t.status==='active'?'Ativo':'Inativo'}</span></div>
      </div>`).join('')
    : '<p class="empty-state">Este aluno não está em nenhuma turma. Adicione pela tela <a href="#" onclick="showTab(\'turmas\');return false">Turmas → Alunos</a>.</p>'}
  </div></div>`;
}

function fichaHistoricoHTML() {
  const h = _D.fichaHist;
  const icon = { trancamento:'⏸', reativacao:'▶', cancelamento:'✕', conclusao:'🎓', plano:'📐', parcela:'🧾', pagamento:'💵', nota:'📝' };
  return `<div class="card"><div class="card-body">
    ${h.length ? `<div class="timeline">${h.map(x => `
      <div class="tl-item">
        <div class="tl-icon">${icon[x.tipo]||'•'}</div>
        <div class="tl-body">
          <div class="tl-text">${esc(x.descricao)}</div>
          <div class="tl-meta">${formatDateTime(x.created_at)} ${x.profiles?.name ? '• '+esc(x.profiles.name) : ''}</div>
        </div>
      </div>`).join('')}</div>`
    : '<p class="empty-state">Nenhum registro ainda.</p>'}
  </div></div>`;
}

function fichaFinanceiroHTML() {
  const a = _D.fichaAluno, ps = _D.fichaParcelas;
  const validas  = ps.filter(p => p.status!=='cancelada');
  const total    = validas.reduce((s,p)=>s+valorLiquido(p),0);
  const pago     = ps.filter(p=>p.status==='pago').reduce((s,p)=>s+(Number(p.valor_pago)||valorLiquido(p)),0);
  const aberto   = ps.filter(p=>p.status==='pendente'||p.status==='suspensa').reduce((s,p)=>s+valorLiquido(p),0);
  const atras    = ps.filter(p=>parcelaEstado(p)==='atrasada');
  const atrasado = atras.reduce((s,p)=>s+valorLiquido(p),0);
  const pagas    = ps.filter(p=>p.status==='pago').length;
  const pct      = validas.length ? Math.round(pagas/validas.length*100) : 0;
  const podeEd   = can('pagamentos_editar');
  const podePl   = can('trancamento');

  if (!ps.length) {
    return `<div class="card"><div class="card-body">
      <p class="empty-state">Este aluno ainda não tem plano de pagamento.</p>
      ${podeEd ? `<div style="text-align:center"><button class="btn btn-primary" onclick="openModalPlano('${a.id}','novo')">📐 Configurar plano de parcelas</button></div>` : ''}
    </div></div>`;
  }

  return `
    ${a.status==='trancado' ? '<div class="alert alert-info">⏸ Curso trancado — as parcelas pendentes estão suspensas e não contam como atraso.</div>' : ''}
    ${atras.length ? `<div class="alert alert-warning">⚠️ <strong>${atras.length} parcela(s) atrasada(s)</strong> — ${formatCurrency(atrasado)}.
       ${waBtn(a.telefone, msgCobranca(a, atras), 'Lembrar no WhatsApp')}</div>` : ''}
    <div class="stats-grid" style="margin-bottom:16px">
      ${statCard('📐', formatCurrency(total), `Plano (${validas.length} parcelas)`)}
      ${statCard('✅', formatCurrency(pago), `Pago (${pagas}/${validas.length})`)}
      ${statCard('⏳', formatCurrency(aberto), 'Em aberto')}
      ${statCard('⚠️', formatCurrency(atrasado), 'Atrasado')}
    </div>
    <div class="progress"><div class="progress-bar" style="width:${pct}%"></div><span>${pct}% pago</span></div>
    <div class="card">
      <div class="card-header">
        <h3>Parcelas</h3>
        <div class="action-btns">
          ${podeEd ? `<button class="btn btn-sm btn-secondary" onclick="openModalParcela('${a.id}',null)">+ Parcela avulsa</button>` : ''}
          ${podePl ? `<button class="btn btn-sm btn-primary" onclick="openModalPlano('${a.id}','ajustar')">📐 Alterar nº de parcelas</button>` : ''}
        </div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th><th>Obs</th><th>Ações</th></tr></thead>
          <tbody>${ps.map(p => parcelaRow(p, podeEd)).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

function msgCobranca(a, parcelas) {
  const nome = a.nome.split(' ')[0];
  const lista = parcelas.map(p => `parcela ${p.numero} (venc. ${formatDate(p.vencimento)}) — ${formatCurrency(valorLiquido(p))}`).join(', ');
  return `Olá ${nome}, tudo bem? Aqui é da VMLI Idiomas 😊 Passando para lembrar que consta em aberto: ${lista}. Qualquer dúvida estamos à disposição!`;
}

function parcelaRow(p, podeEd) {
  const e = parcelaEstado(p);
  const valor = Number(p.desconto) > 0
    ? `<s class="text-muted">${formatCurrency(p.valor)}</s> <strong>${formatCurrency(valorLiquido(p))}</strong>`
    : `<strong>${formatCurrency(p.valor)}</strong>`;
  const pg = p.status==='pago' ? `${formatDate(p.data_pagamento)}<br><span class="text-muted">${formaLabel(p.forma_pagamento)}${p.valor_pago && Number(p.valor_pago)!==valorLiquido(p) ? ' • '+formatCurrency(p.valor_pago) : ''}</span>` : '—';
  let acoes = '';
  if (podeEd) {
    if (p.status==='pendente')
      acoes = `<button class="btn btn-sm btn-success" onclick="openModalPagar('${p.id}')">💵 Pagar</button>
               <button class="btn btn-sm btn-secondary" onclick="openModalParcela('${p.aluno_id}','${p.id}')">Editar</button>
               <button class="btn btn-sm btn-danger" onclick="removerParcela('${p.id}')">🗑</button>`;
    else if (p.status==='pago')
      acoes = `<button class="btn btn-sm btn-secondary" onclick="desfazerPagamento('${p.id}')">Desfazer</button>`;
    else if (p.status==='suspensa')
      acoes = `<button class="btn btn-sm btn-secondary" onclick="openModalParcela('${p.aluno_id}','${p.id}')">Editar</button>`;
  }
  return `<tr class="row-${e}">
    <td>${p.numero}</td>
    <td>${formatDate(p.vencimento)}</td>
    <td>${valor}</td>
    <td>${parcelaBadge(p)}</td>
    <td>${pg}</td>
    <td class="text-muted">${esc(p.obs)||''}</td>
    <td><div class="action-btns">${acoes}</div></td>
  </tr>`;
}

// ---- Plano (gerar / ajustar parcelas) ----
function openModalPlano(alunoId, mode) {
  const a  = _D.alunos?.[alunoId] || _D.fichaAluno;
  const ps = _D.fichaParcelas || [];
  const pagas = ps.filter(p=>p.status==='pago');
  const abertas = ps.filter(p=>p.status==='pendente'||p.status==='suspensa');
  const last = abertas[0] || pagas[pagas.length-1];
  const vals = mode==='ajustar' ? {
    num_parcelas: abertas.length || '',
    valor_parcela: last ? Number(last.valor) : (a?.valor_parcela||''),
    dia_vencimento: a?.dia_vencimento || (last ? Number(last.vencimento.split('-')[2]) : 10),
    primeiro: abertas[0] ? abertas[0].vencimento.slice(0,7) : '',
  } : { valor_parcela: a?.valor_parcela||'', dia_vencimento: a?.dia_vencimento||10 };

  openModal(`
    <div class="modal-header">
      <h3>${mode==='ajustar' ? 'Alterar plano de parcelas' : 'Configurar plano de parcelas'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="savePlano(event)" style="padding:20px">
      ${mode==='ajustar' ? `<div class="alert alert-info">
        As <strong>${pagas.length} parcela(s) pagas</strong> são mantidas. As <strong>${abertas.length} em aberto</strong> serão substituídas pelas novas parcelas abaixo.
      </div>` : ''}
      ${planoFields('', vals)}
      <input type="hidden" name="aluno_id" value="${alunoId}">
      <input type="hidden" name="mode" value="${mode}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${mode==='ajustar' ? 'Substituir parcelas' : 'Gerar parcelas'}</button>
      </div>
    </form>`);
  atualizaTotalPlano('');
}

async function savePlano(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const plano = lerPlano(fd, '');
  if (!plano) { showToast('Preencha nº de parcelas, valor e primeiro vencimento','error'); return; }
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  try {
    await aplicarPlano(fd.get('aluno_id'), plano, fd.get('mode'));
    showToast('Parcelas geradas! ✅','success');
    closeModal(); openFichaAluno(fd.get('aluno_id'), 'financeiro');
  } catch (err) { showToast('Erro: '+err.message,'error'); btn.disabled=false; }
}

async function aplicarPlano(alunoId, plano, mode) {
  let numeroInicial = 1;
  if (mode==='ajustar') {
    const { data: existentes } = await db.from('parcelas').select('id,numero,status').eq('aluno_id', alunoId);
    const pagas = (existentes||[]).filter(p=>p.status==='pago');
    numeroInicial = pagas.length ? Math.max(...pagas.map(p=>p.numero))+1 : 1;
    const remover = (existentes||[]).filter(p=>p.status==='pendente'||p.status==='suspensa').map(p=>p.id);
    if (remover.length) {
      const { error } = await db.from('parcelas').delete().in('id', remover);
      if (error) throw error;
    }
  }
  const rows = gerarParcelas(alunoId, { ...plano, numeroInicial });
  const { error } = await db.from('parcelas').insert(rows);
  if (error) throw error;
  await db.from('alunos').update({
    valor_parcela: plano.valor, dia_vencimento: plano.dia,
    num_parcelas: numeroInicial-1+plano.n, valor_curso: (numeroInicial-1+plano.n)*plano.valor,
  }).eq('id', alunoId);
  await logHistorico(alunoId, 'plano',
    `${mode==='ajustar'?'Plano alterado':'Plano criado'}: ${plano.n} parcela(s) de ${formatCurrency(plano.valor)}, vencimento dia ${plano.dia}, a partir de ${MONTHS[plano.mesInicio]}/${plano.anoInicio}`);
}

// ---- Parcela avulsa / editar ----
function openModalParcela(alunoId, parcelaId) {
  const p = parcelaId ? _D.parcelas?.[parcelaId] : null;
  const ps = _D.fichaParcelas || [];
  const nextNum = ps.length ? Math.max(...ps.map(x=>x.numero))+1 : 1;
  openModal(`
    <div class="modal-header">
      <h3>${p ? `Editar parcela ${p.numero}` : 'Nova parcela avulsa'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="saveParcela(event)" style="padding:20px">
      <div class="form-row">
        <div class="form-group"><label>Nº</label><input type="number" name="numero" min="1" value="${p?.numero||nextNum}" required></div>
        <div class="form-group"><label>Vencimento *</label><input type="date" name="vencimento" value="${p?.vencimento||todayISO()}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Valor (R$) *</label><input type="number" step="0.01" min="0" name="valor" value="${p?.valor??''}" required></div>
        <div class="form-group"><label>Desconto (R$)</label><input type="number" step="0.01" min="0" name="desconto" value="${p?.desconto||0}"></div>
      </div>
      <div class="form-group"><label>Observação</label><input type="text" name="obs" value="${esc(p?.obs)}" placeholder="ex: taxa de material, ajuste…"></div>
      <input type="hidden" name="id" value="${p?.id||''}"><input type="hidden" name="aluno_id" value="${alunoId}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${p?'Salvar':'Adicionar'}</button>
      </div>
    </form>`);
}

async function saveParcela(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id'), alunoId = fd.get('aluno_id');
  const row = { numero: parseInt(fd.get('numero')), vencimento: fd.get('vencimento'), valor: parseFloat(fd.get('valor')||0),
                desconto: parseFloat(fd.get('desconto')||0), obs: fd.get('obs').trim()||null };
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  const { error } = id ? await db.from('parcelas').update(row).eq('id', id)
                       : await db.from('parcelas').insert({ ...row, aluno_id: alunoId, status:'pendente' });
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  await logHistorico(alunoId, 'parcela', `${id?'Parcela editada':'Parcela adicionada'}: nº ${row.numero}, ${formatCurrency(row.valor-row.desconto)}, venc. ${formatDate(row.vencimento)}`);
  showToast(id?'Parcela atualizada!':'Parcela adicionada!','success');
  closeModal(); openFichaAluno(alunoId, 'financeiro');
}

async function removerParcela(id) {
  const p = _D.parcelas?.[id]; if (!p) return;
  if (!confirm(`Remover a parcela ${p.numero} (${formatCurrency(valorLiquido(p))})?`)) return;
  const { error } = await db.from('parcelas').delete().eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  await logHistorico(p.aluno_id, 'parcela', `Parcela nº ${p.numero} removida (${formatCurrency(valorLiquido(p))})`);
  showToast('Parcela removida','success'); openFichaAluno(p.aluno_id, 'financeiro');
}

// ---- Pagar / desfazer ----
function openModalPagar(id, voltar='ficha') {
  const p = _D.parcelas?.[id]; if (!p) return;
  const nome = p.alunos?.nome || _D.fichaAluno?.nome || '';
  openModal(`
    <div class="modal-header">
      <h3>💵 Registrar pagamento</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="savePagamento(event)" style="padding:20px">
      <div class="alert alert-info">${esc(nome)} — parcela <strong>${p.numero}</strong>, vencimento ${formatDate(p.vencimento)} — <strong>${formatCurrency(valorLiquido(p))}</strong></div>
      <div class="form-row">
        <div class="form-group"><label>Data do pagamento *</label><input type="date" name="data_pagamento" value="${todayISO()}" required></div>
        <div class="form-group"><label>Forma *</label><select name="forma_pagamento" required>${selectOptions(FORMAS_PGTO,'pix')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Valor recebido (R$) *</label><input type="number" step="0.01" min="0" name="valor_pago" value="${valorLiquido(p).toFixed(2)}" required></div>
        <div class="form-group"><label>Observação</label><input type="text" name="obs" value="${esc(p.obs)}"></div>
      </div>
      <input type="hidden" name="id" value="${p.id}"><input type="hidden" name="voltar" value="${voltar}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-success">✓ Confirmar pagamento</button>
      </div>
    </form>`);
}

async function savePagamento(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const p  = _D.parcelas?.[fd.get('id')];
  const row = { status:'pago', data_pagamento: fd.get('data_pagamento'), forma_pagamento: fd.get('forma_pagamento'),
                valor_pago: parseFloat(fd.get('valor_pago')||0), obs: fd.get('obs').trim()||null, pago_por: user.id };
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  const { error } = await db.from('parcelas').update(row).eq('id', p.id);
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  await logHistorico(p.aluno_id, 'pagamento', `Parcela nº ${p.numero} paga — ${formatCurrency(row.valor_pago)} via ${formaLabel(row.forma_pagamento)} em ${formatDate(row.data_pagamento)}`);
  showToast('Pagamento registrado! ✅','success');
  closeModal();
  if (fd.get('voltar')==='cobrancas') renderCobrancas(); else openFichaAluno(p.aluno_id, 'financeiro');
}

async function desfazerPagamento(id) {
  const p = _D.parcelas?.[id]; if (!p) return;
  if (!confirm(`Desfazer o pagamento da parcela ${p.numero}? Ela voltará a ficar pendente.`)) return;
  const { error } = await db.from('parcelas').update({ status:'pendente', data_pagamento:null, forma_pagamento:null, valor_pago:null, pago_por:null }).eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  await logHistorico(p.aluno_id, 'pagamento', `Pagamento da parcela nº ${p.numero} desfeito`);
  showToast('Pagamento desfeito','success'); openFichaAluno(p.aluno_id, 'financeiro');
}

// ---- Trancar / Reativar / Cancelar ----
function openModalTrancar(alunoId) {
  const a = _D.alunos?.[alunoId];
  openModal(`
    <div class="modal-header"><h3>⏸ Trancar curso</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveTrancar(event)" style="padding:20px">
      <p>As parcelas pendentes de <strong>${esc(a?.nome)}</strong> ficarão <strong>suspensas</strong> (sem contar atraso) até a reativação. Parcelas já pagas não mudam.</p>
      <div class="form-group"><label>Motivo</label><textarea name="motivo" rows="3" placeholder="ex: viagem, motivos financeiros…"></textarea></div>
      <input type="hidden" name="aluno_id" value="${alunoId}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-warning">Confirmar trancamento</button>
      </div>
    </form>`);
}
async function saveTrancar(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const alunoId = fd.get('aluno_id'); const motivo = fd.get('motivo').trim();
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  const { error } = await db.from('alunos').update({ status:'trancado' }).eq('id', alunoId);
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  await db.from('parcelas').update({ status:'suspensa' }).eq('aluno_id', alunoId).eq('status','pendente');
  await logHistorico(alunoId, 'trancamento', `Curso trancado${motivo?': '+motivo:''}`);
  showToast('Curso trancado','success'); closeModal(); openFichaAluno(alunoId,'financeiro');
}

function openModalReativar(alunoId) {
  const a = _D.alunos?.[alunoId];
  const susp = (_D.fichaParcelas||[]).filter(p=>p.status==='suspensa');
  const { ano, mes } = getCurrentMonthYear();
  openModal(`
    <div class="modal-header"><h3>▶ Reativar curso</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveReativar(event)" style="padding:20px">
      <p><strong>${esc(a?.nome)}</strong> tem <strong>${susp.length} parcela(s) suspensa(s)</strong>. Elas voltam a ficar pendentes, uma por mês, a partir do mês escolhido.</p>
      <div class="form-row">
        <div class="form-group"><label>Retomar a partir de *</label><input type="month" name="primeiro" value="${ymToInput(ano,mes)}" required></div>
        <div class="form-group"><label>Dia do vencimento</label><input type="number" name="dia" min="1" max="31" value="${a?.dia_vencimento || (susp[0] ? Number(susp[0].vencimento.split('-')[2]) : 10)}"></div>
      </div>
      <input type="hidden" name="aluno_id" value="${alunoId}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-success">Reativar</button>
      </div>
    </form>`);
}
async function saveReativar(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const alunoId = fd.get('aluno_id');
  const { ano, mes } = ymFromInput(fd.get('primeiro')); const dia = parseInt(fd.get('dia')||10);
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  try {
    const { data: susp } = await db.from('parcelas').select('id,numero').eq('aluno_id', alunoId).eq('status','suspensa').order('numero');
    for (let i=0; i<(susp||[]).length; i++) {
      const d = addMonthsYM(ano, mes, i);
      const { error } = await db.from('parcelas').update({ status:'pendente', vencimento: makeDate(d.ano, d.mes, dia) }).eq('id', susp[i].id);
      if (error) throw error;
    }
    const { error } = await db.from('alunos').update({ status:'ativo', dia_vencimento: dia }).eq('id', alunoId);
    if (error) throw error;
    await logHistorico(alunoId, 'reativacao', `Curso reativado — ${(susp||[]).length} parcela(s) retomadas a partir de ${MONTHS[mes]}/${ano}`);
    showToast('Curso reativado! ▶','success'); closeModal(); openFichaAluno(alunoId,'financeiro');
  } catch (err) { showToast('Erro: '+err.message,'error'); btn.disabled=false; }
}
async function reativarSimples(alunoId) {
  if (!confirm('Reativar a matrícula deste aluno? As parcelas canceladas não voltam — use "Alterar nº de parcelas" para criar um novo plano.')) return;
  const { error } = await db.from('alunos').update({ status:'ativo' }).eq('id', alunoId);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  await logHistorico(alunoId, 'reativacao', 'Matrícula reativada');
  showToast('Matrícula reativada','success'); openFichaAluno(alunoId,'financeiro');
}

function openModalCancelar(alunoId) {
  const a = _D.alunos?.[alunoId];
  openModal(`
    <div class="modal-header"><h3>✕ Cancelar matrícula</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveCancelar(event)" style="padding:20px">
      <div class="alert alert-warning">As parcelas pendentes/suspensas de <strong>${esc(a?.nome)}</strong> serão marcadas como <strong>canceladas</strong>. Parcelas pagas ficam no histórico.</div>
      <div class="form-group"><label>Motivo</label><textarea name="motivo" rows="3"></textarea></div>
      <input type="hidden" name="aluno_id" value="${alunoId}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Voltar</button>
        <button type="submit" class="btn btn-danger">Confirmar cancelamento</button>
      </div>
    </form>`);
}
async function saveCancelar(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const alunoId = fd.get('aluno_id'); const motivo = fd.get('motivo').trim();
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  const { error } = await db.from('alunos').update({ status:'cancelado' }).eq('id', alunoId);
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  await db.from('parcelas').update({ status:'cancelada' }).eq('aluno_id', alunoId).in('status',['pendente','suspensa']);
  await logHistorico(alunoId, 'cancelamento', `Matrícula cancelada${motivo?': '+motivo:''}`);
  showToast('Matrícula cancelada','success'); closeModal(); openFichaAluno(alunoId,'financeiro');
}

// ============================================================
// 24. PAGAMENTOS DE ALUNOS — painel mensal + inadimplentes
// ============================================================
async function renderCobrancas() {
  if (!can('pagamentos_ver')) return semPermissao();
  if (!_D.cob) { const c = getCurrentMonthYear(); _D.cob = { mes:c.mes, ano:c.ano, filtro:'todas' }; }
  const { mes, ano } = _D.cob;
  const ini = monthStart(mes, ano), fim = monthEnd(mes, ano), hoje = todayISO();

  const [{ data: doMes, error }, { data: atrasadas }, { data: recebidas }] = await Promise.all([
    db.from('parcelas').select('*, alunos(id,nome,telefone,status)').gte('vencimento', ini).lte('vencimento', fim).neq('status','cancelada').order('vencimento'),
    db.from('parcelas').select('*, alunos(id,nome,telefone,status)').eq('status','pendente').lt('vencimento', hoje).order('vencimento'),
    db.from('parcelas').select('id,valor_pago,valor,desconto,data_pagamento').eq('status','pago').gte('data_pagamento', ini).lte('data_pagamento', fim),
  ]);
  if (error) { setContent(`<div class="alert alert-warning">Erro: ${error.message}<br><span class="text-muted">Você já rodou o SQL das tabelas novas no Supabase?</span></div>`); return; }

  _D.parcelas = {};
  [...(doMes||[]), ...(atrasadas||[])].forEach(p => { _D.parcelas[p.id] = p; });

  const previsto  = (doMes||[]).filter(p=>p.status==='pendente'||p.status==='pago').reduce((s,p)=>s+valorLiquido(p),0);
  const recebido  = (recebidas||[]).reduce((s,p)=>s+(Number(p.valor_pago)||valorLiquido(p)),0);
  const pendMes   = (doMes||[]).filter(p=>p.status==='pendente').reduce((s,p)=>s+valorLiquido(p),0);
  const totAtraso = (atrasadas||[]).reduce((s,p)=>s+valorLiquido(p),0);

  // inadimplentes agrupados por aluno
  const porAluno = {};
  (atrasadas||[]).forEach(p => {
    if (!p.alunos) return;
    const k = p.alunos.id;
    porAluno[k] = porAluno[k] || { aluno:p.alunos, parcelas:[], total:0, maxDias:0 };
    porAluno[k].parcelas.push(p);
    porAluno[k].total += valorLiquido(p);
    porAluno[k].maxDias = Math.max(porAluno[k].maxDias, daysSince(p.vencimento));
  });
  const inad = Object.values(porAluno).sort((a,b)=>b.maxDias-a.maxDias);

  const lista = _D.cob.filtro==='atrasadas' ? (atrasadas||[])
              : (doMes||[]).filter(p => _D.cob.filtro==='todas' ? true
                  : _D.cob.filtro==='pagas' ? p.status==='pago'
                  : _D.cob.filtro==='pendentes' ? p.status==='pendente' : true);
  const podeEd = can('pagamentos_editar');
  const prev = addMonthsYM(ano, mes, -1), next = addMonthsYM(ano, mes, 1);

  setContent(`
    <div class="page-header">
      <h2>Pagamentos de Alunos 💳</h2>
      <div class="month-nav">
        <button class="btn btn-sm btn-secondary" onclick="cobMes(${prev.ano},${prev.mes})">‹</button>
        <strong>${MONTHS[mes]} ${ano}</strong>
        <button class="btn btn-sm btn-secondary" onclick="cobMes(${next.ano},${next.mes})">›</button>
      </div>
    </div>
    <div class="stats-grid" style="margin-bottom:18px">
      ${statCard('📅', formatCurrency(previsto), `Previsto em ${MONTHS[mes]}`)}
      ${statCard('✅', formatCurrency(recebido), `Recebido em ${MONTHS[mes]}`)}
      ${statCard('⏳', formatCurrency(pendMes), 'A receber no mês')}
      ${statCard('⚠️', formatCurrency(totAtraso), `Em atraso (${inad.length} aluno${inad.length===1?'':'s'})`, "cobFiltro('atrasadas')")}
    </div>

    ${inad.length ? `
    <div class="card">
      <div class="card-header"><h3>⚠️ Inadimplentes</h3><span class="text-muted">Parcelas vencidas em qualquer mês</span></div>
      <div class="card-body">
        ${inad.map(i => `
          <div class="list-item">
            <div class="list-item-left">
              <div class="list-item-title row-click" onclick="openFichaAluno('${i.aluno.id}','financeiro')">${esc(i.aluno.nome)}</div>
              <div class="list-item-sub">${i.parcelas.length} parcela(s) • até ${i.maxDias} dia(s) de atraso</div>
            </div>
            <div class="list-item-right">
              <strong class="text-danger">${formatCurrency(i.total)}</strong>
              ${waBtn(i.aluno.telefone, msgCobranca(i.aluno, i.parcelas), 'Lembrar')}
              <button class="btn btn-sm btn-secondary" onclick="openFichaAluno('${i.aluno.id}','financeiro')">Ficha</button>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-body" style="padding-bottom:0">
        <div class="toolbar">
          <input type="text" class="search-input" placeholder="🔍 Buscar aluno…" oninput="filterCob(this.value)">
          <div class="chips">
            ${[['todas','Todas do mês'],['pendentes','Pendentes'],['pagas','Pagas'],['atrasadas','Atrasadas (todas)']].map(([k,l]) =>
              `<button class="chip ${_D.cob.filtro===k?'active':''}" onclick="cobFiltro('${k}')">${l}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Aluno</th><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th><th>Ações</th></tr></thead>
          <tbody id="cob-tbody">
            ${lista.length ? lista.map(p => `
              <tr data-n="${esc((p.alunos?.nome||'').toLowerCase())}" class="row-${parcelaEstado(p)}">
                <td><strong class="row-click" onclick="openFichaAluno('${p.aluno_id}','financeiro')">${esc(p.alunos?.nome)||'—'}</strong>
                    ${p.alunos?.status==='trancado' ? ' <span class="badge badge-info">Trancado</span>' : ''}</td>
                <td>${p.numero}</td>
                <td>${formatDate(p.vencimento)}</td>
                <td><strong>${formatCurrency(valorLiquido(p))}</strong></td>
                <td>${parcelaBadge(p)}</td>
                <td>${p.status==='pago' ? `${formatDate(p.data_pagamento)}<br><span class="text-muted">${formaLabel(p.forma_pagamento)}</span>` : '—'}</td>
                <td><div class="action-btns">
                  ${podeEd && p.status==='pendente' ? `<button class="btn btn-sm btn-success" onclick="openModalPagar('${p.id}','cobrancas')">💵 Pagar</button>` : ''}
                  ${waBtn(p.alunos?.telefone, msgCobranca(p.alunos||{nome:''}, [p]), '')}
                  <button class="btn btn-sm btn-secondary" onclick="openFichaAluno('${p.aluno_id}','financeiro')">Ficha</button>
                </div></td>
              </tr>`).join('')
            : `<tr><td colspan="7" class="empty-state">Nenhuma parcela ${_D.cob.filtro==='atrasadas'?'atrasada 🎉':'neste mês'}.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`);
}
function cobMes(ano, mes) { _D.cob.ano = ano; _D.cob.mes = mes; renderCobrancas(); }
function cobFiltro(f) { _D.cob.filtro = f; renderCobrancas(); }
function filterCob(q) {
  q = (q||'').toLowerCase();
  document.querySelectorAll('#cob-tbody tr[data-n]').forEach(tr => { tr.style.display = tr.dataset.n.includes(q) ? '' : 'none'; });
}

// ============================================================
// 25. CRM — funis personalizados (Kanban)
// ============================================================
async function loadFunis() {
  const { data, error } = await db.from('funis').select('*, funil_etapas(*)').order('ordem').order('nome');
  if (error) throw error;
  _D.funis = {}; _D.etapas = {};
  (data||[]).forEach(f => {
    f.funil_etapas = (f.funil_etapas||[]).sort((a,b)=>a.ordem-b.ordem || a.nome.localeCompare(b.nome));
    _D.funis[f.id] = f;
    f.funil_etapas.forEach(e => { e.funil = f; _D.etapas[e.id] = e; });
  });
  _D.funisList = (data||[]);
  return _D.funisList;
}
const etapaDe = id => _D.etapas?.[id] || null;
function etapaBadge(e) {
  if (!e) return '<span class="badge badge-gray">Sem etapa</span>';
  return `<span class="badge" style="background:${e.cor}26;color:${e.cor};border-color:${e.cor}55">${esc(e.nome)}</span>`;
}

async function renderCRM() {
  if (!can('crm_ver')) return semPermissao();
  let funis;
  try { funis = await loadFunis(); }
  catch (err) { setContent(`<div class="alert alert-warning">Erro: ${err.message}<br><span class="text-muted">Você já rodou o SQL <strong>02_funis_crm.sql</strong> no Supabase?</span></div>`); return; }

  const ativos = funis.filter(f => f.ativo);
  if (!ativos.length) {
    setContent(`<div class="page-header"><h2>CRM 🎯</h2></div>
      <div class="card"><div class="card-body"><p class="empty-state">Nenhum funil criado ainda.
      ${can('crm_funis') ? '<br><button class="btn btn-primary" style="margin-top:12px" onclick="renderFunis()">⚙️ Criar meu primeiro funil</button>' : 'Peça ao administrador para criar um funil.'}</p></div></div>`);
    return;
  }
  if (!_D.crmFunil || !_D.funis[_D.crmFunil] || !_D.funis[_D.crmFunil].ativo) _D.crmFunil = ativos[0].id;
  const funil = _D.funis[_D.crmFunil];

  const [{ data: leads, error }, { data: users }] = await Promise.all([
    db.from('leads').select('*, profiles!leads_responsavel_id_fkey(name)').eq('funil_id', funil.id).order('updated_at',{ascending:false}),
    db.from('profiles').select('id,name,role').eq('ativo', true).order('name'),
  ]);
  if (error) { setContent(`<div class="alert alert-warning">Erro: ${error.message}</div>`); return; }

  _D.leads = {}; (leads||[]).forEach(l => { _D.leads[l.id] = l; });
  _D.users = users||[];

  const { mes, ano } = getCurrentMonthYear(); const ini = monthStart(mes, ano);
  const tipoDe = l => etapaDe(l.etapa_id)?.tipo || 'aberta';
  const abertos = (leads||[]).filter(l => tipoDe(l)==='aberta');
  const novosMes = (leads||[]).filter(l => l.created_at >= ini).length;
  const ganhosMes = (leads||[]).filter(l => tipoDe(l)==='ganho' && l.updated_at >= ini).length;
  const g = (leads||[]).filter(l=>tipoDe(l)==='ganho').length, p = (leads||[]).filter(l=>tipoDe(l)==='perdido').length;
  const taxa = (g+p) ? Math.round(g/(g+p)*100) : 0;
  const podeEd = can('crm_editar');
  _D.crmShowFinal = _D.crmShowFinal ?? false;

  const cols = funil.funil_etapas.filter(e => e.tipo==='aberta' || _D.crmShowFinal);

  setContent(`
    <div class="page-header">
      <h2>CRM 🎯</h2>
      <div class="action-btns">
        ${can('crm_funis') ? '<button class="btn btn-secondary" onclick="renderFunis()">⚙️ Configurar funis</button>' : ''}
        ${podeEd ? '<button class="btn btn-primary" onclick="openModalLead(null)">+ Novo lead</button>' : ''}
      </div>
    </div>
    ${ativos.length > 1 ? `<div class="chips funil-tabs">
      ${ativos.map(f => `<button class="chip ${f.id===funil.id?'active':''}" onclick="_D.crmFunil='${f.id}';renderCRM()">${esc(f.nome)}</button>`).join('')}
    </div>` : ''}
    ${funil.descricao ? `<p class="text-muted" style="margin:-4px 0 12px">${esc(funil.descricao)}</p>` : ''}
    <div class="stats-grid" style="margin-bottom:16px">
      ${statCard('🎯', abertos.length, 'Em andamento')}
      ${statCard('✨', novosMes, `Novos em ${MONTHS[mes]}`)}
      ${statCard('🏆', ganhosMes, `Ganhos em ${MONTHS[mes]}`)}
      ${statCard('📈', taxa+'%', 'Taxa de conversão')}
    </div>
    <div class="toolbar" style="margin-bottom:12px">
      <input type="text" class="search-input" placeholder="🔍 Buscar lead…" oninput="filterLeads(this.value)">
      <label class="chip ${_D.crmShowFinal?'active':''}" style="cursor:pointer">
        <input type="checkbox" ${_D.crmShowFinal?'checked':''} onchange="_D.crmShowFinal=this.checked;renderCRM()" style="display:none"> Mostrar etapas finais (ganho / perdido)
      </label>
    </div>
    ${!funil.funil_etapas.length ? `<div class="alert alert-warning">Este funil ainda não tem etapas. ${can('crm_funis')?'<button class="btn btn-sm btn-warning" onclick="renderFunis()">Configurar</button>':''}</div>` : ''}
    <div class="kanban" id="kanban">
      ${cols.map(e => {
        const ls = (leads||[]).filter(l => l.etapa_id===e.id);
        return `
        <div class="kanban-col" data-etapa="${e.id}" style="border-top:3px solid ${e.cor}" ${podeEd?'ondragover="event.preventDefault();this.classList.add(\'over\')" ondragleave="this.classList.remove(\'over\')" ondrop="dropLead(event)"':''}>
          <div class="kanban-head"><span>${e.tipo==='ganho'?'🏆 ':e.tipo==='perdido'?'❌ ':''}${esc(e.nome)}</span><span class="kanban-count">${ls.length}</span></div>
          <div class="kanban-body">
            ${ls.map(l => leadCard(l, podeEd)).join('') || '<div class="kanban-empty">—</div>'}
          </div>
        </div>`; }).join('')}
    </div>`);
}

function leadCard(l, podeEd) {
  const dias = daysSince((l.updated_at||l.created_at).slice(0,10));
  return `
    <div class="kanban-card" data-n="${esc((l.nome+' '+(l.telefone||'')+' '+(l.idioma||'')).toLowerCase())}"
         ${podeEd?`draggable="true" ondragstart="event.dataTransfer.setData('text','${l.id}')"`:''} onclick="openLeadDetail('${l.id}')">
      <div class="kc-title">${esc(l.nome)}</div>
      <div class="kc-tags">
        ${l.idioma ? `<span class="badge badge-info">${esc(l.idioma)}</span>` : ''}
        ${l.origem ? `<span class="badge badge-gray">${esc(l.origem)}</span>` : ''}
        ${l.aluno_id ? '<span class="badge badge-success">Aluno</span>' : ''}
      </div>
      <div class="kc-foot">
        <span class="text-muted">${dias===0?'hoje':dias+'d'} ${l.profiles?.name ? '• '+esc(l.profiles.name.split(' ')[0]) : ''}</span>
        ${l.telefone ? `<a class="wa-icon" href="${waLink(l.telefone)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬</a>` : ''}
      </div>
    </div>`;
}
function filterLeads(q) {
  q = (q||'').toLowerCase();
  document.querySelectorAll('.kanban-card').forEach(c => { c.style.display = c.dataset.n.includes(q) ? '' : 'none'; });
}
async function dropLead(ev) {
  ev.preventDefault();
  const col = ev.currentTarget; col.classList.remove('over');
  const id = ev.dataTransfer.getData('text'); const etapaId = col.dataset.etapa;
  if (id && etapaId) moverLead(id, etapaId);
}

// Move um lead para outra etapa (mesmo funil ou outro). Etapa "ganho" abre a matrícula; "perdido" pede motivo.
async function moverLead(id, etapaId, motivo) {
  const l = _D.leads?.[id]; const e = etapaDe(etapaId);
  if (!l || !e || l.etapa_id===etapaId) return;
  if (e.tipo==='perdido' && motivo===undefined) { openModalPerdido(id, etapaId); return; }
  if (e.tipo==='ganho' && !l.aluno_id) { openModalMatricular(id, etapaId); return; }
  const row = { etapa_id: etapaId, funil_id: e.funil_id }; if (motivo) row.motivo_perda = motivo;
  const { error } = await db.from('leads').update(row).eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  await db.from('lead_notas').insert({ lead_id:id, user_id:user.id, texto:`Movido para "${e.nome}"${e.funil_id!==l.funil_id?' (funil '+e.funil.nome+')':''}${motivo?' — '+motivo:''}` });
  showToast(`${l.nome} → ${e.nome}`,'success');
  closeModal(); renderCRM();
}

function openModalPerdido(id, etapaId) {
  const l = _D.leads?.[id];
  const alvo = etapaId || (_D.funis[l.funil_id]?.funil_etapas.find(e=>e.tipo==='perdido')?.id);
  if (!alvo) { showToast('Este funil não tem uma etapa do tipo "perdido". Crie uma em Configurar funis.','error'); return; }
  openModal(`
    <div class="modal-header"><h3>❌ Marcar como perdido</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="event.preventDefault();moverLead('${id}','${alvo}',this.motivo.value.trim())" style="padding:20px">
      <div class="form-group"><label>Motivo</label>
        <select name="motivo"><option value="">Selecione…</option>
          ${['Preço','Horário','Sem retorno','Escolheu outra escola','Desistiu','Outro'].map(m=>`<option>${m}</option>`).join('')}
        </select></div>
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Voltar</button>
        <button type="submit" class="btn btn-danger">Confirmar</button>
      </div>
    </form>`);
}

function etapasOptionsHTML(funilId, selected) {
  const f = _D.funis?.[funilId];
  return (f?.funil_etapas||[]).map(e => `<option value="${e.id}" ${e.id===selected?'selected':''}>${esc(e.nome)}${e.tipo!=='aberta'?' ('+e.tipo+')':''}</option>`).join('');
}
function trocaFunilNoForm(sel) {
  const et = sel.form.querySelector('[name=etapa_id]'); if (et) et.innerHTML = etapasOptionsHTML(sel.value);
}

function openModalLead(id) {
  if (!can('crm_editar')) { showToast('Sem permissão para editar o CRM','error'); return; }
  const l = id ? _D.leads?.[id] : null;
  const funilId = l?.funil_id || _D.crmFunil;
  const etapaId = l?.etapa_id || _D.funis[funilId]?.funil_etapas.find(e=>e.tipo==='aberta')?.id;
  openModal(`
    <div class="modal-header"><h3>${l?'Editar lead':'Novo lead'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveLead(event)" style="padding:20px">
      <div class="form-group"><label>Nome *</label><input type="text" name="nome" value="${esc(l?.nome)}" required></div>
      <div class="form-row">
        <div class="form-group"><label>Telefone (WhatsApp)</label><input type="tel" name="telefone" value="${esc(l?.telefone)}"></div>
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${esc(l?.email)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Idioma de interesse</label><select name="idioma">${selectOptions(IDIOMAS, l?.idioma)}</select></div>
        <div class="form-group"><label>Origem</label><select name="origem">${selectOptions(ORIGENS, l?.origem)}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Funil</label>
          <select name="funil_id" onchange="trocaFunilNoForm(this)">${(_D.funisList||[]).filter(f=>f.ativo||f.id===funilId).map(f=>`<option value="${f.id}" ${f.id===funilId?'selected':''}>${esc(f.nome)}</option>`).join('')}</select></div>
        <div class="form-group"><label>Etapa</label><select name="etapa_id">${etapasOptionsHTML(funilId, etapaId)}</select></div>
      </div>
      <div class="form-group"><label>Responsável</label><select name="responsavel_id">${selectOptions((_D.users||[]).map(u=>({id:u.id,label:u.name})), l?.responsavel_id || (l?null:user.id))}</select></div>
      <div class="form-group"><label>Observações</label><textarea name="observacoes" rows="3">${esc(l?.observacoes)}</textarea></div>
      <input type="hidden" name="id" value="${l?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${l?'Salvar':'Criar lead'}</button>
      </div>
    </form>`);
}
async function saveLead(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const id = fd.get('id');
  const g = k => (fd.get(k)||'').toString().trim() || null;
  const row = { nome:g('nome'), telefone:g('telefone'), email:g('email'), idioma:g('idioma'), origem:g('origem'),
                funil_id:g('funil_id'), etapa_id:g('etapa_id'), responsavel_id:g('responsavel_id'), observacoes:g('observacoes') };
  if (!row.etapa_id) { showToast('Escolha uma etapa (o funil precisa ter etapas)','error'); return; }
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  const { error } = id ? await db.from('leads').update(row).eq('id', id)
                       : await db.from('leads').insert({ ...row, created_by:user.id });
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  _D.crmFunil = row.funil_id;
  showToast(id?'Lead atualizado!':'Lead criado! ✨','success'); closeModal(); renderCRM();
}

async function openLeadDetail(id) {
  const l = _D.leads?.[id]; if (!l) return;
  const { data: notas } = await db.from('lead_notas').select('*, profiles(name)').eq('lead_id', id).order('created_at',{ascending:false});
  const e = etapaDe(l.etapa_id); const tipo = e?.tipo||'aberta'; const podeEd = can('crm_editar');
  const f = _D.funis[l.funil_id];
  const temGanho = f?.funil_etapas.some(x=>x.tipo==='ganho'), temPerd = f?.funil_etapas.some(x=>x.tipo==='perdido');
  const info = (lb, v) => `<div class="info-item"><span class="info-label">${lb}</span><span class="info-value">${v||'—'}</span></div>`;
  openModal(`
    <div class="modal-header">
      <h3>${esc(l.nome)} ${etapaBadge(e)}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="padding:20px">
      <div class="ficha-actions" style="margin-bottom:14px">
        ${waBtn(l.telefone, `Olá ${l.nome.split(' ')[0]}, tudo bem? Aqui é da VMLI Idiomas 😊`)}
        ${podeEd ? `<button class="btn btn-sm btn-secondary" onclick="openModalLead('${l.id}')">✏️ Editar</button>` : ''}
        ${podeEd && tipo==='aberta' ? `<button class="btn btn-sm btn-info" onclick="openModalAgendarExp('${l.id}')">📅 Agendar experimental</button>` : ''}
        ${podeEd && !l.aluno_id ? `<button class="btn btn-sm btn-success" onclick="openModalMatricular('${l.id}')">🎓 Matricular</button>` : ''}
        ${l.aluno_id ? `<button class="btn btn-sm btn-primary" onclick="closeModal();openFichaAluno('${l.aluno_id}')">Ver ficha do aluno</button>` : ''}
        ${podeEd && tipo==='aberta' && temPerd ? `<button class="btn btn-sm btn-danger" onclick="openModalPerdido('${l.id}')">❌ Perdido</button>` : ''}
        ${podeEd ? `<button class="btn btn-sm btn-danger" onclick="excluirLead('${l.id}')">🗑</button>` : ''}
      </div>
      ${podeEd ? `<div class="form-row">
        <div class="form-group"><label>Mover para (${esc(f?.nome||'')})</label>
          <select onchange="if(this.value)moverLead('${l.id}',this.value)">${etapasOptionsHTML(l.funil_id, l.etapa_id)}</select></div>
        ${(_D.funisList||[]).filter(x=>x.ativo && x.id!==l.funil_id).length ? `<div class="form-group"><label>Enviar para outro funil</label>
          <select onchange="if(this.value)moverLead('${l.id}',this.value)"><option value="">Selecione…</option>
            ${(_D.funisList||[]).filter(x=>x.ativo && x.id!==l.funil_id).map(x=>`<optgroup label="${esc(x.nome)}">${x.funil_etapas.map(et=>`<option value="${et.id}">${esc(et.nome)}</option>`).join('')}</optgroup>`).join('')}
          </select></div>` : ''}
      </div>` : ''}
      <div class="info-grid" style="margin-bottom:16px">
        ${info('Telefone', esc(l.telefone))}${info('Email', esc(l.email))}
        ${info('Idioma', esc(l.idioma))}${info('Origem', esc(l.origem))}
        ${info('Responsável', esc(l.profiles?.name))}${info('Criado em', formatDateTime(l.created_at))}
        ${l.motivo_perda ? info('Motivo da perda', esc(l.motivo_perda)) : ''}
        ${l.observacoes ? `<div class="info-item full"><span class="info-label">Observações</span><span class="info-value">${esc(l.observacoes)}</span></div>` : ''}
      </div>
      <h4 style="margin:0 0 10px">📝 Anotações</h4>
      ${podeEd ? `<form onsubmit="saveLeadNota(event,'${l.id}')" class="nota-form">
        <input type="text" name="texto" placeholder="ex: Ligou pedindo horário à noite…" required>
        <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
      </form>` : ''}
      <div class="timeline">
        ${(notas||[]).length ? notas.map(n => `
          <div class="tl-item"><div class="tl-icon">•</div><div class="tl-body">
            <div class="tl-text">${esc(n.texto)}</div>
            <div class="tl-meta">${formatDateTime(n.created_at)} ${n.profiles?.name?'• '+esc(n.profiles.name):''}</div>
          </div></div>`).join('') : '<p class="empty-state">Nenhuma anotação ainda.</p>'}
      </div>
    </div>`);
}
async function saveLeadNota(e, leadId) {
  e.preventDefault();
  const texto = e.target.texto.value.trim(); if (!texto) return;
  const { error } = await db.from('lead_notas').insert({ lead_id:leadId, texto, user_id:user.id });
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  await db.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId);
  const { data: l } = await db.from('leads').select('*, profiles!leads_responsavel_id_fkey(name)').eq('id', leadId).single();
  if (l) _D.leads[leadId] = l;
  openLeadDetail(leadId);
}
async function excluirLead(id) {
  const l = _D.leads?.[id]; if (!l) return;
  if (!confirm(`Excluir o lead "${l.nome}"? As anotações também serão apagadas.`)) return;
  const { error } = await db.from('leads').delete().eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast('Lead excluído','success'); closeModal(); renderCRM();
}

async function openModalAgendarExp(leadId) {
  const l = _D.leads?.[leadId]; if (!l) return;
  const [{ data: turmas }, { data: profs }] = await Promise.all([
    db.from('turmas').select('id,codigo,nome,horario,modalidade').eq('status','active').order('codigo'),
    db.from('profiles').select('id,name').eq('role','professor').eq('ativo',true).order('name'),
  ]);
  const f = _D.funis[l.funil_id];
  const sugestao = f?.funil_etapas.find(e => /experimental/i.test(e.nome) && /agend/i.test(e.nome));
  openModal(`
    <div class="modal-header"><h3>📅 Agendar aula experimental</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveAgendarExp(event)" style="padding:20px">
      <div class="alert alert-info">${esc(l.nome)} ${l.idioma?'• '+esc(l.idioma):''}</div>
      <div class="form-row">
        <div class="form-group"><label>Data da aula *</label><input type="date" name="data_aula" value="${todayISO()}" required></div>
        <div class="form-group"><label>Modalidade *</label>
          <select name="modalidade" required><option value="group">Grupo</option><option value="individual">Individual</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Turma (opcional)</label>
          <select name="turma_id">${selectOptions((turmas||[]).map(t=>({id:t.id,label:`${t.codigo} ${t.nome?'— '+t.nome:''} ${t.horario?'('+t.horario+')':''}`})), '', 'Sem turma / individual')}</select></div>
        <div class="form-group"><label>Professor *</label>
          <select name="professor_id" required>${selectOptions((profs||[]).map(p=>({id:p.id,label:p.name})))}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Observações</label><input type="text" name="notas" value="${esc(l.observacoes)}"></div>
        <div class="form-group"><label>Mover o lead para</label>
          <select name="etapa_id"><option value="">Manter na etapa atual</option>${etapasOptionsHTML(l.funil_id, sugestao?.id)}</select></div>
      </div>
      <input type="hidden" name="lead_id" value="${leadId}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Agendar</button>
      </div>
    </form>`);
}
async function saveAgendarExp(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const l = _D.leads?.[fd.get('lead_id')];
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  try {
    const { data: exp, error } = await db.from('experimentais').insert({
      nome:l.nome, email:l.email, telefone:l.telefone, modalidade:fd.get('modalidade'),
      turma_id: fd.get('turma_id')||null, professor_id: fd.get('professor_id'),
      data_aula: fd.get('data_aula'), notas: fd.get('notas').trim()||null, status:'pendente',
    }).select().single();
    if (error) throw error;
    const upd = { experimental_id: exp.id };
    if (fd.get('etapa_id')) upd.etapa_id = fd.get('etapa_id');
    await db.from('leads').update(upd).eq('id', l.id);
    await db.from('lead_notas').insert({ lead_id:l.id, user_id:user.id, texto:`Experimental agendada para ${formatDate(fd.get('data_aula'))}` });
    showToast('Experimental agendada! 📅','success'); closeModal(); renderCRM();
  } catch (err) { showToast('Erro: '+err.message,'error'); btn.disabled=false; }
}

async function openModalMatricular(leadId, etapaId) {
  if (!can('crm_editar')) return;
  const l = _D.leads?.[leadId]; if (!l) return;
  const { data: turmas } = await db.from('turmas').select('id,codigo,nome,horario').eq('status','active').order('codigo');
  const f = _D.funis[l.funil_id];
  const ganho = etapaId || f?.funil_etapas.find(e=>e.tipo==='ganho')?.id || '';
  openModal(`
    <div class="modal-header"><h3>🎓 Matricular ${esc(l.nome)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveMatricular(event)" style="padding:20px">
      <div class="form-group"><label>Nome completo *</label><input type="text" name="nome" value="${esc(l.nome)}" required></div>
      <div class="form-row">
        <div class="form-group"><label>Telefone</label><input type="tel" name="telefone" value="${esc(l.telefone)}"></div>
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${esc(l.email)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Idioma</label><select name="idioma">${selectOptions(IDIOMAS, l.idioma)}</select></div>
        <div class="form-group"><label>Turma (opcional)</label>
          <select name="turma_id">${selectOptions((turmas||[]).map(t=>({id:t.id,label:`${t.codigo} ${t.nome?'— '+t.nome:''}`})), '', 'Definir depois')}</select></div>
      </div>
      ${can('pagamentos_editar') ? `<details class="plano-box" open><summary>💰 Plano de pagamento</summary>${planoFields('p_')}</details>` : ''}
      <input type="hidden" name="lead_id" value="${leadId}"><input type="hidden" name="etapa_id" value="${ganho}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-success">✓ Confirmar matrícula</button>
      </div>
    </form>`);
}
async function saveMatricular(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const l = _D.leads?.[fd.get('lead_id')];
  const g = k => (fd.get(k)||'').toString().trim() || null;
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Matriculando…';
  try {
    const { data: aluno, error } = await db.from('alunos').insert({
      nome:g('nome'), telefone:g('telefone'), email:g('email'), idioma:g('idioma'), origem:l.origem,
      notas:l.observacoes, data_matricula: todayISO(), status:'ativo',
    }).select().single();
    if (error) throw error;
    const turmaId = g('turma_id');
    if (turmaId) { const { error: e2 } = await db.from('turma_alunos').insert({ turma_id:turmaId, aluno_id:aluno.id }); if (e2) throw e2; }
    const plano = can('pagamentos_editar') ? lerPlano(fd,'p_') : null;
    if (plano) await aplicarPlano(aluno.id, plano, 'novo');
    const upd = { aluno_id: aluno.id, etapa: 'matriculado' };
    const et = g('etapa_id'); if (et) { upd.etapa_id = et; upd.funil_id = etapaDe(et)?.funil_id || l.funil_id; }
    await db.from('leads').update(upd).eq('id', l.id);
    if (l.experimental_id) await db.from('experimentais').update({ status:'convertido', aluno_id:aluno.id }).eq('id', l.experimental_id);
    await db.from('lead_notas').insert({ lead_id:l.id, user_id:user.id, texto:'Matriculado 🎓' });
    await logHistorico(aluno.id, 'nota', `Aluno criado a partir do CRM (origem: ${l.origem||'—'})`);
    showToast(`${aluno.nome} matriculado! 🎉`,'success'); closeModal(); openFichaAluno(aluno.id,'financeiro');
  } catch (err) { showToast('Erro: '+err.message,'error'); btn.disabled=false; btn.textContent='✓ Confirmar matrícula'; }
}

// ---- Configuração de funis e etapas ----
async function renderFunis() {
  if (!can('crm_funis')) return semPermissao('Você não tem permissão para configurar funis.');
  activeTab = 'crm';
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab==='crm'));
  document.getElementById('page-title').textContent = 'Configurar funis';
  setContent(`<div class="loading"><div class="spinner"></div></div>`);
  let funis;
  try { funis = await loadFunis(); } catch (err) { setContent(`<div class="alert alert-warning">Erro: ${err.message}</div>`); return; }
  const { data: cont } = await db.from('leads').select('etapa_id');
  const porEtapa = {}; (cont||[]).forEach(l => { porEtapa[l.etapa_id] = (porEtapa[l.etapa_id]||0)+1; });
  _D.leadsPorEtapa = porEtapa;

  setContent(`
    <button class="btn-link btn-back" onclick="showTab('crm')">← Voltar para o CRM</button>
    <div class="page-header">
      <h2>⚙️ Funis do CRM</h2>
      <button class="btn btn-primary" onclick="openModalFunil(null)">+ Novo funil</button>
    </div>
    <div class="alert alert-info">
      Cada funil tem suas próprias etapas. Use ▲▼ para ordenar. Tipo <strong>Ganho</strong> abre a matrícula ao mover o lead;
      <strong>Perdido</strong> pede o motivo; <strong>Em andamento</strong> é uma etapa normal.
    </div>
    ${funis.length ? funis.map(f => funilCardHTML(f, porEtapa)).join('') : '<div class="card"><div class="card-body"><p class="empty-state">Nenhum funil. Clique em "+ Novo funil".</p></div></div>'}`);
}

function funilCardHTML(f, porEtapa) {
  const total = f.funil_etapas.reduce((s,e)=>s+(porEtapa[e.id]||0),0);
  return `
    <div class="card funil-card ${f.ativo?'':'inativo'}">
      <div class="card-header">
        <div>
          <h3>${esc(f.nome)} ${f.ativo?'':'<span class="badge badge-gray">Inativo</span>'} <span class="text-muted" style="font-weight:400;font-size:0.85rem">• ${total} lead(s)</span></h3>
          ${f.descricao ? `<div class="text-muted" style="font-size:0.85rem">${esc(f.descricao)}</div>` : ''}
        </div>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openModalFunil('${f.id}')">✏️ Editar</button>
          <button class="btn btn-sm btn-secondary" onclick="openModalEtapa('${f.id}',null)">+ Etapa</button>
          <button class="btn btn-sm ${f.ativo?'btn-danger':'btn-success'}" onclick="toggleFunil('${f.id}',${f.ativo})">${f.ativo?'Desativar':'Ativar'}</button>
          ${!total ? `<button class="btn btn-sm btn-danger" onclick="excluirFunil('${f.id}')">🗑</button>` : ''}
        </div>
      </div>
      <div class="card-body">
        ${f.funil_etapas.length ? f.funil_etapas.map((e,i) => `
          <div class="etapa-row">
            <span class="etapa-cor" style="background:${e.cor}"></span>
            <span class="etapa-nome">${esc(e.nome)}</span>
            <span class="badge ${e.tipo==='ganho'?'badge-success':e.tipo==='perdido'?'badge-danger':'badge-gray'}">${e.tipo==='ganho'?'Ganho':e.tipo==='perdido'?'Perdido':'Em andamento'}</span>
            <span class="text-muted">${porEtapa[e.id]||0} lead(s)</span>
            <div class="action-btns">
              <button class="btn btn-sm btn-secondary" ${i===0?'disabled':''} onclick="moverEtapa('${f.id}','${e.id}',-1)">▲</button>
              <button class="btn btn-sm btn-secondary" ${i===f.funil_etapas.length-1?'disabled':''} onclick="moverEtapa('${f.id}','${e.id}',1)">▼</button>
              <button class="btn btn-sm btn-secondary" onclick="openModalEtapa('${f.id}','${e.id}')">Editar</button>
              <button class="btn btn-sm btn-danger" onclick="excluirEtapa('${e.id}')">🗑</button>
            </div>
          </div>`).join('')
        : '<p class="empty-state">Sem etapas ainda. Clique em "+ Etapa".</p>'}
      </div>
    </div>`;
}

function openModalFunil(id) {
  const f = id ? _D.funis?.[id] : null;
  openModal(`
    <div class="modal-header"><h3>${f?'Editar funil':'Novo funil'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveFunil(event)" style="padding:20px">
      <div class="form-group"><label>Nome *</label><input type="text" name="nome" value="${esc(f?.nome)}" placeholder="ex: Captação de alunos, Rematrícula, Parcerias com empresas…" required></div>
      <div class="form-group"><label>Descrição</label><input type="text" name="descricao" value="${esc(f?.descricao)}"></div>
      ${!f ? `<div class="form-group"><label>Começar com</label>
        <select name="modelo">
          <option value="vazio">Funil vazio (eu crio as etapas)</option>
          <option value="basico" selected>Etapas básicas: Novo → Em conversa → Proposta → Ganho / Perdido</option>
          <option value="escola">Modelo escola: Novo → Em conversa → Experimental agendada → Experimental feita → Proposta → Matriculado / Perdido</option>
        </select></div>` : ''}
      <input type="hidden" name="id" value="${f?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f?'Salvar':'Criar funil'}</button>
      </div>
    </form>`);
}
async function saveFunil(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const id = fd.get('id');
  const row = { nome: fd.get('nome').trim(), descricao: fd.get('descricao').trim()||null };
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  try {
    if (id) {
      const { error } = await db.from('funis').update(row).eq('id', id); if (error) throw error;
    } else {
      row.ordem = (_D.funisList||[]).length;
      const { data: f, error } = await db.from('funis').insert(row).select().single(); if (error) throw error;
      const modelos = {
        basico: [['Novo','#60A5FA','aberta'],['Em conversa','#A78BFA','aberta'],['Proposta','#FB923C','aberta'],['Ganho','#2DD4BF','ganho'],['Perdido','#FB4763','perdido']],
        escola: [['Novo contato','#60A5FA','aberta'],['Em conversa','#A78BFA','aberta'],['Experimental agendada','#F59E0B','aberta'],['Experimental feita','#F5C200','aberta'],['Proposta enviada','#FB923C','aberta'],['Matriculado','#2DD4BF','ganho'],['Perdido','#FB4763','perdido']],
      }[fd.get('modelo')];
      if (modelos) {
        const { error: e2 } = await db.from('funil_etapas').insert(modelos.map(([nome,cor,tipo],i)=>({ funil_id:f.id, nome, cor, tipo, ordem:i })));
        if (e2) throw e2;
      }
      _D.crmFunil = f.id;
    }
    showToast(id?'Funil atualizado!':'Funil criado! 🎯','success'); closeModal(); renderFunis();
  } catch (err) { showToast('Erro: '+err.message,'error'); btn.disabled=false; }
}
async function toggleFunil(id, ativo) {
  const { error } = await db.from('funis').update({ ativo: !ativo }).eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  renderFunis();
}
async function excluirFunil(id) {
  const f = _D.funis?.[id];
  if (!confirm(`Excluir o funil "${f?.nome}" e todas as suas etapas?`)) return;
  const { error } = await db.from('funis').delete().eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast('Funil excluído','success'); renderFunis();
}

function openModalEtapa(funilId, etapaId) {
  const e = etapaId ? _D.etapas?.[etapaId] : null;
  const cores = ['#60A5FA','#A78BFA','#F59E0B','#F5C200','#FB923C','#2DD4BF','#FB4763','#34D399','#F472B6','#94A3B8'];
  openModal(`
    <div class="modal-header"><h3>${e?'Editar etapa':'Nova etapa'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveEtapa(event)" style="padding:20px">
      <div class="form-group"><label>Nome *</label><input type="text" name="nome" value="${esc(e?.nome)}" placeholder="ex: Aguardando retorno" required></div>
      <div class="form-row">
        <div class="form-group"><label>Tipo</label>
          <select name="tipo">
            <option value="aberta"  ${(e?.tipo||'aberta')==='aberta'?'selected':''}>Em andamento</option>
            <option value="ganho"   ${e?.tipo==='ganho'?'selected':''}>Ganho (abre matrícula)</option>
            <option value="perdido" ${e?.tipo==='perdido'?'selected':''}>Perdido (pede motivo)</option>
          </select></div>
        <div class="form-group"><label>Cor</label>
          <div class="cores">${cores.map(c=>`<label class="cor-opt"><input type="radio" name="cor" value="${c}" ${(e?.cor||'#60A5FA')===c?'checked':''}><span style="background:${c}"></span></label>`).join('')}</div>
        </div>
      </div>
      <input type="hidden" name="id" value="${e?.id||''}"><input type="hidden" name="funil_id" value="${funilId}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${e?'Salvar':'Adicionar'}</button>
      </div>
    </form>`);
}
async function saveEtapa(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const id = fd.get('id'); const funilId = fd.get('funil_id');
  const row = { nome: fd.get('nome').trim(), tipo: fd.get('tipo'), cor: fd.get('cor')||'#60A5FA' };
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  let res;
  if (id) res = await db.from('funil_etapas').update(row).eq('id', id);
  else {
    const f = _D.funis?.[funilId]; const ordem = f ? f.funil_etapas.length : 0;
    // Nova etapa "em andamento" entra antes das finais (ganho/perdido) para manter a ordem natural
    const finais = f ? f.funil_etapas.filter(x=>x.tipo!=='aberta') : [];
    let pos = ordem;
    if (row.tipo==='aberta' && finais.length) {
      pos = Math.min(...finais.map(x=>x.ordem));
      await Promise.all(finais.map(x => db.from('funil_etapas').update({ ordem: x.ordem+1 }).eq('id', x.id)));
    }
    res = await db.from('funil_etapas').insert({ ...row, funil_id: funilId, ordem: pos });
  }
  if (res.error) { showToast('Erro: '+res.error.message,'error'); btn.disabled=false; return; }
  showToast(id?'Etapa atualizada!':'Etapa adicionada!','success'); closeModal(); renderFunis();
}
async function moverEtapa(funilId, etapaId, dir) {
  const f = _D.funis?.[funilId]; if (!f) return;
  const list = f.funil_etapas; const i = list.findIndex(x=>x.id===etapaId); const j = i+dir;
  if (i<0 || j<0 || j>=list.length) return;
  const a = list[i], b = list[j];
  await Promise.all([
    db.from('funil_etapas').update({ ordem: j }).eq('id', a.id),
    db.from('funil_etapas').update({ ordem: i }).eq('id', b.id),
  ]);
  // normaliza a ordem de todo o funil (evita empates)
  const nova = [...list]; nova[i]=b; nova[j]=a;
  await Promise.all(nova.map((x,k) => x.ordem!==k ? db.from('funil_etapas').update({ ordem:k }).eq('id', x.id) : null));
  await renderFunis();
}
async function excluirEtapa(id) {
  const e = _D.etapas?.[id]; if (!e) return;
  const n = _D.leadsPorEtapa?.[id] || 0;
  if (n > 0) {
    const outras = e.funil.funil_etapas.filter(x=>x.id!==id);
    if (!outras.length) { showToast('Mova os leads para outro funil antes de excluir a única etapa.','error'); return; }
    openModal(`
      <div class="modal-header"><h3>Excluir etapa "${esc(e.nome)}"</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
      <form onsubmit="event.preventDefault();confirmarExcluirEtapa('${id}',this.destino.value)" style="padding:20px">
        <div class="alert alert-warning">Há <strong>${n} lead(s)</strong> nesta etapa. Para onde eles devem ir?</div>
        <div class="form-group"><label>Mover para</label><select name="destino" required>${outras.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></div>
        <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-danger">Mover e excluir</button>
        </div>
      </form>`);
    return;
  }
  if (!confirm(`Excluir a etapa "${e.nome}"?`)) return;
  confirmarExcluirEtapa(id, null);
}
async function confirmarExcluirEtapa(id, destino) {
  if (destino) {
    const { error } = await db.from('leads').update({ etapa_id: destino }).eq('etapa_id', id);
    if (error) { showToast('Erro: '+error.message,'error'); return; }
  }
  const { error } = await db.from('funil_etapas').delete().eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast('Etapa excluída','success'); closeModal(); renderFunis();
}

// ============================================================
// 26. USUÁRIOS & PERMISSÕES (admin)
// ============================================================
async function renderUsuarios() {
  if (profile?.role!=='admin') return semPermissao('Somente administradores gerenciam usuários.');
  const { data: users, error } = await db.from('profiles').select('*').neq('role','aluno').order('role').order('name');
  if (error) { setContent(`<div class="alert alert-warning">Erro: ${error.message}</div>`); return; }
  _D.users = users||[]; _D.usersMap = {}; users?.forEach(u => { _D.usersMap[u.id]=u; });

  setContent(`
    <div class="page-header">
      <h2>Usuários & Permissões 🔐</h2>
      <button class="btn btn-primary" onclick="openModalUsuario(null)">+ Novo usuário</button>
    </div>
    <div class="alert alert-info">
      Cada perfil tem permissões padrão (Secretaria: alunos, pagamentos, trancamento e CRM • Financeiro: alunos e pagamentos • Professor: nenhuma).
      Clique em <strong>Permissões</strong> para liberar ou bloquear telas para uma pessoa específica.
      Logins de <strong>alunos</strong> (Área de Membros) são criados pela ficha de cada aluno e não aparecem aqui.
    </div>
    <div class="card"><div class="table-wrapper"><table class="table">
      <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Permissões</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>
        ${(users||[]).map(u => {
          const ativas = PERMS.filter(p=>can(p.key,u)).length;
          const custom = Object.keys(u.permissoes||{}).length;
          return `<tr>
            <td><div class="user-cell"><div class="mini-avatar">${initials(u.name)}</div>${esc(u.name)}${u.id===user.id?' <span class="text-muted">(você)</span>':''}</div></td>
            <td>${esc(u.email)}</td>
            <td><span class="role-badge role-${u.role}">${getRoleLabel(u.role)}</span></td>
            <td>${u.role==='admin' ? '<span class="badge badge-primary">Todas</span>' : `<span class="badge ${ativas?'badge-success':'badge-gray'}">${ativas}/${PERMS.length}</span> ${custom?'<span class="badge badge-warning" title="Tem ajustes individuais">personalizado</span>':''}`}</td>
            <td><span class="badge ${u.ativo!==false?'badge-success':'badge-gray'}">${u.ativo!==false?'Ativo':'Inativo'}</span></td>
            <td><div class="action-btns">
              <button class="btn btn-sm btn-primary" onclick="openModalPermissoes('${u.id}')">🔐 Permissões</button>
              ${u.id!==user.id ? `<button class="btn btn-sm ${u.ativo!==false?'btn-danger':'btn-success'}" onclick="toggleUsuarioAtivo('${u.id}',${u.ativo!==false})">${u.ativo!==false?'Desativar':'Ativar'}</button>` : ''}
            </div></td>
          </tr>`; }).join('')}
      </tbody></table></div></div>`);
}

function openModalPermissoes(id) {
  const u = _D.usersMap?.[id]; if (!u) return;
  const render = role => PERMS.map(p => {
    const on = can(p.key, { role, permissoes: u.permissoes });
    return `<label class="perm-row ${role==='admin'?'disabled':''}">
      <div><div class="perm-label">${p.label}</div><div class="perm-desc">${p.desc}</div></div>
      <span class="switch"><input type="checkbox" name="perm_${p.key}" ${on?'checked':''} ${role==='admin'?'disabled':''}><span class="slider"></span></span>
    </label>`; }).join('');
  openModal(`
    <div class="modal-header"><h3>🔐 Permissões — ${esc(u.name)}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="savePermissoes(event)" style="padding:20px">
      <div class="form-row">
        <div class="form-group"><label>Nome</label><input type="text" name="name" value="${esc(u.name)}" required></div>
        <div class="form-group"><label>Perfil</label>
          <select name="role" onchange="document.getElementById('perm-list').innerHTML=permListHTML('${u.id}',this.value)">
            ${ROLES.map(r=>`<option value="${r.id}" ${u.role===r.id?'selected':''}>${r.label}</option>`).join('')}
          </select></div>
      </div>
      <div class="perm-list" id="perm-list">${render(u.role)}</div>
      <p class="hint" style="margin-top:8px">Administrador sempre tem todas as permissões. Para voltar ao padrão do perfil, clique em "Restaurar padrão".</p>
      <input type="hidden" name="id" value="${u.id}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="restaurarPadrao('${u.id}')">Restaurar padrão</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`);
}
function permListHTML(id, role) {
  const u = _D.usersMap?.[id];
  return PERMS.map(p => {
    const on = can(p.key, { role, permissoes: {} });
    return `<label class="perm-row ${role==='admin'?'disabled':''}">
      <div><div class="perm-label">${p.label}</div><div class="perm-desc">${p.desc}</div></div>
      <span class="switch"><input type="checkbox" name="perm_${p.key}" ${on?'checked':''} ${role==='admin'?'disabled':''}><span class="slider"></span></span>
    </label>`; }).join('');
}
async function savePermissoes(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const id = fd.get('id'); const role = fd.get('role');
  const permissoes = {};
  if (role!=='admin') PERMS.forEach(p => { permissoes[p.key] = fd.get('perm_'+p.key)==='on'; });
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  const { error } = await db.from('profiles').update({ name: fd.get('name').trim(), role, permissoes }).eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  showToast('Permissões salvas! 🔐','success'); closeModal();
  if (id===user.id) { await loadProfile(user); showApp(); showTab('usuarios'); } else renderUsuarios();
}
async function restaurarPadrao(id) {
  const { error } = await db.from('profiles').update({ permissoes: {} }).eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast('Permissões restauradas ao padrão do perfil','success'); closeModal(); renderUsuarios();
}
async function toggleUsuarioAtivo(id, ativo) {
  const { error } = await db.from('profiles').update({ ativo: !ativo }).eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast(ativo?'Usuário desativado':'Usuário ativado','success'); renderUsuarios();
}

function openModalUsuario() {
  openModal(`
    <div class="modal-header"><h3>Novo usuário</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveUsuario(event)" style="padding:20px">
      <div class="form-group"><label>Nome completo *</label><input type="text" name="name" required></div>
      <div class="form-group"><label>Email *</label><input type="email" name="email" required><span class="hint">Senha padrão: VMLI2024! (peça para trocar no primeiro acesso)</span></div>
      <div class="form-row">
        <div class="form-group"><label>Perfil *</label>
          <select name="role" onchange="document.getElementById('va-box').style.display=this.value==='professor'?'':'none'">
            ${ROLES.filter(r=>r.id!=='admin').map(r=>`<option value="${r.id}">${r.label}</option>`).join('')}
            <option value="admin">Administrador</option>
          </select></div>
        <div class="form-group" id="va-box" style="display:none"><label>Valor por aula (R$)</label><input type="number" name="valor_aula" step="0.01" min="0" value="0"></div>
      </div>
      <p class="hint">As permissões começam no padrão do perfil e podem ser ajustadas depois.</p>
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Criar usuário</button>
      </div>
    </form>`);
  document.querySelector('#modal-content select[name=role]').value = 'secretaria';
}
async function saveUsuario(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Criando…';
  try {
    await createAuthUser({ name: fd.get('name').trim(), email: fd.get('email').trim(), role: fd.get('role'), valor_aula: parseFloat(fd.get('valor_aula')||0) });
    showToast('Usuário criado! Senha padrão: VMLI2024!','success'); closeModal(); renderUsuarios();
  } catch (err) {
    let msg = 'Erro: ' + err.message;
    if (/rate limit/i.test(err.message)) msg = '⚠️ Limite de cadastros atingido. Aguarde alguns minutos.';
    else if (/already/i.test(err.message)) msg = 'Este email já está cadastrado.';
    showToast(msg,'error'); btn.disabled=false; btn.textContent='Criar usuário';
  }
}

// Cria conta de login + profile preservando a sessão do admin (mesma lógica usada em Professores)
async function createAuthUser({ name, email, role, valor_aula=0 }) {
  const { data: adminSess } = await db.auth.getSession();
  const { data: nu, error: signErr } = await db.auth.signUp({
    email, password: 'VMLI2024!', options: { data: { name, role, valor_aula } }
  });
  if (signErr) throw signErr;
  if (adminSess?.session) {
    setTimeout(async () => {
      const { data: cur } = await db.auth.getSession();
      if (!cur?.session || cur.session.user.id !== user.id) {
        await db.auth.setSession({ access_token: adminSess.session.access_token, refresh_token: adminSess.session.refresh_token });
      }
    }, 800);
  }
  if (nu?.user) {
    await new Promise(r => setTimeout(r, 1200));
    await db.from('profiles').upsert({ id: nu.user.id, name, email, role, valor_aula, ativo: true });
  }
  return nu?.user;
}

// ============================================================
// 27. DASHBOARD — resumo financeiro de alunos + CRM
// ============================================================
async function financeSnapshot() {
  const out = { previstoMes:0, recebidoMes:0, atrasado:0, alunosAtraso:0, leadsAtivos:0, ok:false };
  try {
    const { mes, ano } = getCurrentMonthYear(); const ini = monthStart(mes,ano), fim = monthEnd(mes,ano);
    const q = [];
    if (can('pagamentos_ver')) {
      q.push(db.from('parcelas').select('valor,desconto,status').gte('vencimento',ini).lte('vencimento',fim).in('status',['pendente','pago']));
      q.push(db.from('parcelas').select('valor_pago,valor,desconto').eq('status','pago').gte('data_pagamento',ini).lte('data_pagamento',fim));
      q.push(db.from('parcelas').select('valor,desconto,aluno_id').eq('status','pendente').lt('vencimento',todayISO()));
    } else q.push(null,null,null);
    q.push(can('crm_ver') ? db.from('leads').select('id, funil_etapas(tipo)') : null);
    const [a,b,c,d] = await Promise.all(q);
    if (a?.data) out.previstoMes = a.data.reduce((s,p)=>s+valorLiquido(p),0);
    if (b?.data) out.recebidoMes = b.data.reduce((s,p)=>s+(Number(p.valor_pago)||valorLiquido(p)),0);
    if (c?.data) { out.atrasado = c.data.reduce((s,p)=>s+valorLiquido(p),0); out.alunosAtraso = new Set(c.data.map(p=>p.aluno_id)).size; }
    if (d?.data) out.leadsAtivos = d.data.filter(l => (l.funil_etapas?.tipo||'aberta')==='aberta').length;
    out.ok = !(a?.error) ;
  } catch (_) {}
  return out;
}
function snapshotHTML(s) {
  const cards = [];
  if (can('pagamentos_ver')) {
    cards.push(statCard('💳', formatCurrency(s.previstoMes), 'Mensalidades previstas', "showTab('cobrancas')"));
    cards.push(statCard('✅', formatCurrency(s.recebidoMes), 'Recebido este mês', "showTab('cobrancas')"));
    cards.push(statCard('⚠️', formatCurrency(s.atrasado), `Em atraso (${s.alunosAtraso} aluno${s.alunosAtraso===1?'':'s'})`, "showTab('cobrancas')"));
  }
  if (can('crm_ver')) cards.push(statCard('🎯', s.leadsAtivos, 'Leads no funil', "showTab('crm')"));
  if (!cards.length) return '';
  return `<div class="stats-grid" style="margin-bottom:18px">${cards.join('')}</div>
    ${s.alunosAtraso>0 ? `<div class="alert alert-warning">⚠️ <strong>${s.alunosAtraso} aluno(s)</strong> com parcela atrasada — ${formatCurrency(s.atrasado)}.
      <button class="btn btn-sm btn-warning" onclick="showTab('cobrancas')">Ver inadimplentes</button></div>` : ''}`;
}

async function renderDashboardSecretaria() {
  const { mes, ano } = getCurrentMonthYear();
  const [{ count: alunoCount }, { count: turmaCount }, snap] = await Promise.all([
    db.from('alunos').select('*',{count:'exact',head:true}).eq('status','ativo'),
    db.from('turmas').select('*',{count:'exact',head:true}).eq('status','active'),
    financeSnapshot(),
  ]);
  setContent(`
    <div class="page-header">
      <h2>Olá, ${profile?.name?.split(' ')[0]}! 👋</h2>
      <span class="text-muted">${MONTHS[mes]} ${ano}</span>
    </div>
    <div class="stats-grid" style="margin-bottom:18px">
      ${statCard('🎓', alunoCount||0, 'Alunos ativos', "showTab('alunos')")}
      ${statCard('📚', turmaCount||0, 'Turmas ativas', "showTab('turmas')")}
    </div>
    ${snapshotHTML(snap)}
    <div class="quick-actions">
      <h3>Ações Rápidas</h3>
      <div class="actions-grid">
        ${can('alunos_editar') ? `<button class="action-card" onclick="showTab('alunos');setTimeout(()=>openModalAluno(null),200)"><span class="action-icon">➕</span><span>Novo Aluno</span></button>` : ''}
        ${can('crm_editar') ? `<button class="action-card" onclick="showTab('crm');setTimeout(()=>openModalLead(null),200)"><span class="action-icon">✨</span><span>Novo Lead</span></button>` : ''}
        ${can('pagamentos_ver') ? `<button class="action-card" onclick="showTab('cobrancas')"><span class="action-icon">💳</span><span>Pagamentos</span></button>` : ''}
        ${can('crm_ver') ? `<button class="action-card" onclick="showTab('crm')"><span class="action-icon">🎯</span><span>CRM</span></button>` : ''}
      </div>
    </div>`);
}

// ============================================================
// 28. ÁREA DE MEMBROS — painéis, módulos, aulas, acessos
// ============================================================
const BUCKET_MATERIAIS = 'materiais';
const BUCKET_CAPAS     = 'capas';
const isAluno = () => profile?.role === 'aluno';

function youtubeId(url='') {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
function fileIcon(nome='') {
  const ext = (nome.split('.').pop()||'').toLowerCase();
  if (ext==='pdf') return '📄';
  if (['doc','docx','odt','txt'].includes(ext)) return '📝';
  if (['xls','xlsx','csv'].includes(ext)) return '📊';
  if (['ppt','pptx'].includes(ext)) return '📽️';
  if (['mp3','wav','m4a','ogg'].includes(ext)) return '🎧';
  if (['mp4','mov','webm'].includes(ext)) return '🎬';
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return '🖼️';
  if (['zip','rar','7z'].includes(ext)) return '🗜️';
  return '📎';
}
function aulaIcon(a) {
  return { youtube:'▶️', link:'🔗', texto:'📖', arquivo: fileIcon(a.arquivo_nome||'') }[a.tipo] || '•';
}
function fmtBytes(b) { if (!b) return ''; if (b<1024*1024) return Math.round(b/1024)+' KB'; return (b/1024/1024).toFixed(1)+' MB'; }
function textoHTML(t='') {
  return esc(t).split(/\n{2,}/).map(p => '<p>'+p.replace(/\n/g,'<br>').replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>')+'</p>').join('');
}
function capaHTML(p, cls='painel-capa') {
  return p.capa_url
    ? `<div class="${cls}" style="background-image:url('${esc(p.capa_url)}')"></div>`
    : `<div class="${cls} capa-fallback"><span>${esc((p.titulo||'?').slice(0,2).toUpperCase())}</span></div>`;
}
async function signedUrl(path) {
  const { data, error } = await db.storage.from(BUCKET_MATERIAIS).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ---- Lista de painéis ----
async function renderMembros() {
  if (!isAluno() && !can('membros_ver')) return semPermissao();
  const podeEd = can('membros_editar');
  const [{ data: paineis, error }, { data: prog }] = await Promise.all([
    db.from('paineis').select('*, painel_modulos(id, painel_aulas(id)), painel_acessos(id)').order('ordem').order('titulo'),
    db.from('aula_progresso').select('aula_id').eq('profile_id', user.id).eq('concluida', true),
  ]);
  if (error) { setContent(`<div class="alert alert-warning">Erro: ${error.message}<br><span class="text-muted">Você já rodou o SQL <strong>03_area_membros.sql</strong>?</span></div>`); return; }
  const feitas = new Set((prog||[]).map(p=>p.aula_id));
  _D.paineis = {}; (paineis||[]).forEach(p => {
    p._aulas = (p.painel_modulos||[]).flatMap(m => m.painel_aulas||[]);
    p._feitas = p._aulas.filter(a => feitas.has(a.id)).length;
    p._pct = p._aulas.length ? Math.round(p._feitas/p._aulas.length*100) : 0;
    _D.paineis[p.id] = p;
  });
  const lista = paineis||[];

  setContent(`
    <div class="page-header">
      <h2>${isAluno() ? `Olá, ${esc(profile?.name?.split(' ')[0])}! 👋` : 'Área de Membros 🎬'}</h2>
      ${podeEd ? '<button class="btn btn-primary" onclick="openModalPainel(null)">+ Novo painel</button>' : ''}
    </div>
    ${isAluno() ? '<p class="text-muted" style="margin:-6px 0 16px">Seus materiais, aulas extras e conteúdos liberados pela escola.</p>' : ''}
    ${lista.length ? `<div class="paineis-grid">
      ${lista.map((p,i) => `
        <div class="painel-card ${p.ativo?'':'inativo'}" onclick="openPainel('${p.id}')">
          ${capaHTML(p)}
          <div class="painel-body">
            <div class="painel-titulo">${esc(p.titulo)}</div>
            ${p.descricao ? `<div class="painel-desc">${esc(p.descricao)}</div>` : ''}
            <div class="painel-meta">
              <span>${p._aulas.length} aula${p._aulas.length===1?'':'s'}</span>
              ${!isAluno() ? `<span>• ${p.liberado_todos ? 'todos os alunos' : (p.painel_acessos||[]).length+' aluno(s)'}</span>` : ''}
              ${!p.ativo ? '<span class="badge badge-gray">Inativo</span>' : ''}
            </div>
            ${p._aulas.length ? `<div class="progress mini"><div class="progress-bar" style="width:${p._pct}%"></div><span>${p._pct}%</span></div>` : ''}
            ${podeEd ? `<div class="action-btns painel-acoes" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-secondary" onclick="openModalPainel('${p.id}')">✏️</button>
              <button class="btn btn-sm btn-secondary" onclick="openModalAcessos('${p.id}')">👥 Alunos</button>
              <button class="btn btn-sm btn-secondary" ${i===0?'disabled':''} onclick="moverPainel('${p.id}',-1)">▲</button>
              <button class="btn btn-sm btn-secondary" ${i===lista.length-1?'disabled':''} onclick="moverPainel('${p.id}',1)">▼</button>
            </div>` : ''}
          </div>
        </div>`).join('')}
    </div>`
    : `<div class="card"><div class="card-body"><p class="empty-state">${isAluno() ? 'Nenhum conteúdo liberado para você ainda. Fale com a escola 😊' : 'Nenhum painel criado. Clique em "+ Novo painel".'}</p></div></div>`}`);
}

async function moverPainel(id, dir) {
  const ids = Object.values(_D.paineis).sort((a,b)=>a.ordem-b.ordem||a.titulo.localeCompare(b.titulo)).map(p=>p.id);
  const i = ids.indexOf(id), j = i+dir; if (i<0||j<0||j>=ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((pid,k) => db.from('paineis').update({ ordem:k }).eq('id', pid)));
  renderMembros();
}

// ---- Painel (página com módulos e aulas) ----
async function openPainel(id, aulaId) {
  activeTab = 'painel';
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab==='membros'));
  setContent(`<div class="loading"><div class="spinner"></div></div>`);
  const [{ data: p, error }, { data: prog }] = await Promise.all([
    db.from('paineis').select('*, painel_modulos(*, painel_aulas(*))').eq('id', id).single(),
    db.from('aula_progresso').select('aula_id').eq('profile_id', user.id).eq('concluida', true),
  ]);
  if (error || !p) { setContent(`<div class="alert alert-warning">Painel não encontrado ou sem acesso.</div>`); return; }
  p.painel_modulos = (p.painel_modulos||[]).sort((a,b)=>a.ordem-b.ordem);
  p.painel_modulos.forEach(m => { m.painel_aulas = (m.painel_aulas||[]).sort((a,b)=>a.ordem-b.ordem); });
  _D.painel = p; _D.feitas = new Set((prog||[]).map(x=>x.aula_id));
  _D.aulas = {}; _D.modulos = {};
  p.painel_modulos.forEach(m => { _D.modulos[m.id] = m; m.painel_aulas.forEach(a => { a.modulo = m; _D.aulas[a.id] = a; }); });
  document.getElementById('page-title').textContent = p.titulo;
  const podeEd = can('membros_editar');
  _D.modoEdicao = _D.modoEdicao && podeEd;
  const todas = p.painel_modulos.flatMap(m=>m.painel_aulas);
  const primeira = aulaId && _D.aulas[aulaId] ? aulaId : (todas[0]?.id || null);

  setContent(`
    <button class="btn-link btn-back" onclick="showTab('membros')">← Voltar para a Área de Membros</button>
    <div class="card painel-header">
      ${capaHTML(p, 'painel-capa small')}
      <div style="flex:1">
        <h2 style="margin:0 0 4px">${esc(p.titulo)} ${!p.ativo?'<span class="badge badge-gray">Inativo</span>':''}</h2>
        ${p.descricao ? `<div class="text-muted">${esc(p.descricao)}</div>` : ''}
        <div class="text-muted" style="font-size:0.85rem;margin-top:6px">${todas.length} aula(s) • ${todas.filter(a=>_D.feitas.has(a.id)).length} concluída(s)</div>
      </div>
      ${podeEd ? `<div class="ficha-actions">
        <button class="btn btn-sm ${_D.modoEdicao?'btn-warning':'btn-secondary'}" onclick="_D.modoEdicao=!_D.modoEdicao;openPainel('${p.id}',_D.aulaAtual)">${_D.modoEdicao?'✅ Sair da edição':'✏️ Editar conteúdo'}</button>
        <button class="btn btn-sm btn-secondary" onclick="openModalAcessos('${p.id}')">👥 Alunos</button>
        <button class="btn btn-sm btn-secondary" onclick="openModalPainel('${p.id}')">⚙️</button>
      </div>` : ''}
    </div>
    <div class="painel-layout">
      <aside class="painel-menu" id="painel-menu">${painelMenuHTML()}</aside>
      <section class="painel-conteudo" id="painel-conteudo"></section>
    </div>`);
  if (primeira) abrirAula(primeira);
  else document.getElementById('painel-conteudo').innerHTML = `<div class="card"><div class="card-body"><p class="empty-state">${_D.modoEdicao ? 'Comece adicionando um módulo no menu ao lado.' : 'Este painel ainda não tem aulas.'}</p></div></div>`;
}

function painelMenuHTML() {
  const p = _D.painel; const ed = _D.modoEdicao;
  return `
    ${p.painel_modulos.map((m,mi) => `
      <div class="modulo">
        <div class="modulo-head">
          <span class="modulo-titulo">${esc(m.titulo)}</span>
          ${ed ? `<span class="action-btns">
            <button class="btn-icon" title="Nova aula" onclick="openModalAula('${m.id}',null)">＋</button>
            <button class="btn-icon" title="Editar módulo" onclick="openModalModulo('${m.id}')">✏️</button>
            <button class="btn-icon" ${mi===0?'disabled':''} onclick="moverModulo('${m.id}',-1)">▲</button>
            <button class="btn-icon" ${mi===p.painel_modulos.length-1?'disabled':''} onclick="moverModulo('${m.id}',1)">▼</button>
          </span>` : `<span class="text-muted">${m.painel_aulas.filter(a=>_D.feitas.has(a.id)).length}/${m.painel_aulas.length}</span>`}
        </div>
        ${m.descricao ? `<div class="modulo-desc">${esc(m.descricao)}</div>` : ''}
        <div class="aulas-list">
          ${m.painel_aulas.map((a,ai) => `
            <div class="aula-item ${a.id===_D.aulaAtual?'active':''} ${_D.feitas.has(a.id)?'feita':''}" onclick="abrirAula('${a.id}')">
              <span class="aula-check">${_D.feitas.has(a.id)?'✓':aulaIcon(a)}</span>
              <span class="aula-titulo">${esc(a.titulo)}</span>
              ${ed ? `<span class="action-btns" onclick="event.stopPropagation()">
                <button class="btn-icon" onclick="openModalAula('${m.id}','${a.id}')">✏️</button>
                <button class="btn-icon" ${ai===0?'disabled':''} onclick="moverAula('${a.id}',-1)">▲</button>
                <button class="btn-icon" ${ai===m.painel_aulas.length-1?'disabled':''} onclick="moverAula('${a.id}',1)">▼</button>
              </span>` : ''}
            </div>`).join('') || `<div class="text-muted" style="padding:6px 12px;font-size:0.82rem">${ed?'Sem aulas — clique em ＋':'Em breve'}</div>`}
        </div>
      </div>`).join('')}
    ${ed ? `<button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="openModalModulo(null)">+ Novo módulo</button>` : ''}`;
}

async function abrirAula(id) {
  const a = _D.aulas?.[id]; if (!a) return;
  _D.aulaAtual = id;
  document.getElementById('painel-menu').innerHTML = painelMenuHTML();
  const el = document.getElementById('painel-conteudo');
  const todas = _D.painel.painel_modulos.flatMap(m=>m.painel_aulas);
  const idx = todas.findIndex(x=>x.id===id);
  const feita = _D.feitas.has(id);
  let corpo = '';
  if (a.tipo==='youtube') {
    const yid = youtubeId(a.url);
    corpo = yid ? `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${yid}?rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
                : `<div class="alert alert-warning">Link do YouTube inválido. <a href="${esc(a.url)}" target="_blank" rel="noopener">Abrir mesmo assim</a></div>`;
  } else if (a.tipo==='link') {
    corpo = `<div class="aula-link-box"><div>🔗 Este conteúdo abre em outra aba.</div><a class="btn btn-primary" href="${esc(a.url)}" target="_blank" rel="noopener">Abrir conteúdo ↗</a><div class="text-muted" style="font-size:0.8rem;word-break:break-all">${esc(a.url)}</div></div>`;
  } else if (a.tipo==='texto') {
    corpo = `<div class="aula-texto">${textoHTML(a.conteudo)}</div>`;
  } else if (a.tipo==='arquivo') {
    corpo = `<div class="loading"><div class="spinner"></div></div>`;
  }
  el.innerHTML = `
    <div class="card">
      <div class="card-body">
        <div class="aula-head">
          <div><div class="text-muted" style="font-size:0.8rem">${esc(a.modulo?.titulo)}</div><h3 style="margin:2px 0 0">${aulaIcon(a)} ${esc(a.titulo)}</h3></div>
          <button class="btn btn-sm ${feita?'btn-success':'btn-secondary'}" onclick="toggleConcluida('${a.id}')">${feita?'✓ Concluída':'Marcar como concluída'}</button>
        </div>
        ${a.descricao ? `<p class="text-muted">${esc(a.descricao)}</p>` : ''}
        <div id="aula-corpo">${corpo}</div>
        <div class="aula-nav">
          ${idx>0 ? `<button class="btn btn-sm btn-secondary" onclick="abrirAula('${todas[idx-1].id}')">‹ Anterior</button>` : '<span></span>'}
          ${idx<todas.length-1 ? `<button class="btn btn-sm btn-primary" onclick="abrirAula('${todas[idx+1].id}')">Próxima ›</button>` : ''}
        </div>
      </div>
    </div>`;
  if (a.tipo==='arquivo' && a.arquivo_path) {
    try {
      const url = await signedUrl(a.arquivo_path);
      const corpoEl = document.getElementById('aula-corpo');
      if (!corpoEl || _D.aulaAtual !== id) return;   // usuário já navegou para outra aula/tela
      const isPdf = /\.pdf$/i.test(a.arquivo_nome||a.arquivo_path);
      const isImg = /\.(png|jpe?g|gif|webp)$/i.test(a.arquivo_nome||'');
      corpoEl.innerHTML = `
        <div class="arquivo-bar">
          <span>${fileIcon(a.arquivo_nome)} ${esc(a.arquivo_nome)} <span class="text-muted">${fmtBytes(a.arquivo_tamanho)}</span></span>
          <a class="btn btn-sm btn-primary" href="${url}" target="_blank" rel="noopener" download="${esc(a.arquivo_nome)}">⬇ Baixar</a>
        </div>
        ${isPdf ? `<iframe class="pdf-frame" src="${url}"></iframe>` : isImg ? `<img src="${url}" style="max-width:100%;border-radius:12px">` : ''}`;
    } catch (err) {
      const corpoEl = document.getElementById('aula-corpo');
      if (corpoEl) corpoEl.innerHTML = `<div class="alert alert-warning">Não foi possível carregar o arquivo: ${esc(err.message)}</div>`;
    }
  }
}

async function toggleConcluida(aulaId) {
  const feita = _D.feitas.has(aulaId);
  if (feita) {
    const { error } = await db.from('aula_progresso').delete().eq('aula_id', aulaId).eq('profile_id', user.id);
    if (error) { showToast('Erro: '+error.message,'error'); return; }
    _D.feitas.delete(aulaId);
  } else {
    const { error } = await db.from('aula_progresso').upsert({ aula_id: aulaId, profile_id: user.id, concluida: true }, { onConflict: 'aula_id,profile_id' });
    if (error) { showToast('Erro: '+error.message,'error'); return; }
    _D.feitas.add(aulaId);
    showToast('Aula concluída! 🎉','success');
  }
  abrirAula(aulaId);
}

// ---- Painel: criar / editar ----
function openModalPainel(id) {
  if (!can('membros_editar')) return;
  const p = id ? (_D.paineis?.[id] || (_D.painel?.id===id ? _D.painel : null)) : null;
  openModal(`
    <div class="modal-header"><h3>${p?'Editar painel':'Novo painel'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="savePainel(event)" style="padding:20px">
      <div class="form-group"><label>Título *</label><input type="text" name="titulo" value="${esc(p?.titulo)}" placeholder="ex: Inglês — Material Extra, Clube de Conversação…" required></div>
      <div class="form-group"><label>Descrição</label><textarea name="descricao" rows="2">${esc(p?.descricao)}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Capa (imagem)</label><input type="file" name="capa" accept="image/*"><span class="hint">Opcional. Recomendado 800×450px, até 5 MB.</span></div>
        <div class="form-group"><label>ou link da imagem</label><input type="url" name="capa_url" value="${esc(p?.capa_url)}" placeholder="https://…"></div>
      </div>
      <div class="form-row">
        <label class="perm-row"><div><div class="perm-label">Ativo</div><div class="perm-desc">Inativo fica oculto para os alunos</div></div>
          <span class="switch"><input type="checkbox" name="ativo" ${p?.ativo!==false?'checked':''}><span class="slider"></span></span></label>
        <label class="perm-row"><div><div class="perm-label">Liberar para todos os alunos ativos</div><div class="perm-desc">Sem precisar liberar um a um</div></div>
          <span class="switch"><input type="checkbox" name="liberado_todos" ${p?.liberado_todos?'checked':''}><span class="slider"></span></span></label>
      </div>
      <input type="hidden" name="id" value="${p?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        ${p ? `<button type="button" class="btn btn-danger" onclick="excluirPainel('${p.id}')">🗑 Excluir</button>` : ''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${p?'Salvar':'Criar painel'}</button>
      </div>
    </form>`);
}
async function savePainel(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const id = fd.get('id');
  const row = { titulo: fd.get('titulo').trim(), descricao: fd.get('descricao').trim()||null,
                ativo: fd.get('ativo')==='on', liberado_todos: fd.get('liberado_todos')==='on', capa_url: fd.get('capa_url').trim()||null };
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const capa = fd.get('capa');
    if (capa && capa.size) {
      const path = `${id||crypto.randomUUID()}/${Date.now()}-${capa.name.replace(/[^\w.\-]/g,'_')}`;
      const { error: upErr } = await db.storage.from(BUCKET_CAPAS).upload(path, capa, { upsert: true });
      if (upErr) throw upErr;
      row.capa_url = db.storage.from(BUCKET_CAPAS).getPublicUrl(path).data.publicUrl;
    }
    if (id) { const { error } = await db.from('paineis').update(row).eq('id', id); if (error) throw error; }
    else {
      row.ordem = Object.keys(_D.paineis||{}).length; row.created_by = user.id;
      const { data: novo, error } = await db.from('paineis').insert(row).select().single(); if (error) throw error;
      showToast('Painel criado! Agora adicione módulos e aulas.','success'); closeModal();
      _D.modoEdicao = true; openPainel(novo.id); return;
    }
    showToast('Painel salvo!','success'); closeModal();
    if (activeTab==='painel') openPainel(id, _D.aulaAtual); else renderMembros();
  } catch (err) { showToast('Erro: '+err.message,'error'); btn.disabled=false; btn.textContent='Salvar'; }
}
async function excluirPainel(id) {
  if (!confirm('Excluir este painel com todos os módulos, aulas e liberações? Os arquivos enviados também serão removidos.')) return;
  try {
    const { data: files } = await db.storage.from(BUCKET_MATERIAIS).list(id, { limit: 1000 });
    if (files?.length) await db.storage.from(BUCKET_MATERIAIS).remove(files.map(f => `${id}/${f.name}`));
    const { error } = await db.from('paineis').delete().eq('id', id); if (error) throw error;
    showToast('Painel excluído','success'); closeModal(); showTab('membros');
  } catch (err) { showToast('Erro: '+err.message,'error'); }
}

// ---- Módulos ----
function openModalModulo(id) {
  const m = id ? _D.modulos?.[id] : null;
  openModal(`
    <div class="modal-header"><h3>${m?'Editar módulo':'Novo módulo'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveModulo(event)" style="padding:20px">
      <div class="form-group"><label>Título *</label><input type="text" name="titulo" value="${esc(m?.titulo)}" placeholder="ex: Módulo 1 — Boas-vindas" required></div>
      <div class="form-group"><label>Descrição</label><input type="text" name="descricao" value="${esc(m?.descricao)}"></div>
      <input type="hidden" name="id" value="${m?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        ${m ? `<button type="button" class="btn btn-danger" onclick="excluirModulo('${m.id}')">🗑 Excluir</button>` : ''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${m?'Salvar':'Criar módulo'}</button>
      </div>
    </form>`);
}
async function saveModulo(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const id = fd.get('id');
  const row = { titulo: fd.get('titulo').trim(), descricao: fd.get('descricao').trim()||null };
  const res = id ? await db.from('painel_modulos').update(row).eq('id', id)
                 : await db.from('painel_modulos').insert({ ...row, painel_id: _D.painel.id, ordem: _D.painel.painel_modulos.length });
  if (res.error) { showToast('Erro: '+res.error.message,'error'); return; }
  showToast(id?'Módulo salvo':'Módulo criado','success'); closeModal(); openPainel(_D.painel.id, _D.aulaAtual);
}
async function excluirModulo(id) {
  const m = _D.modulos?.[id];
  if (!confirm(`Excluir o módulo "${m?.titulo}" e suas ${m?.painel_aulas.length||0} aula(s)?`)) return;
  for (const a of (m?.painel_aulas||[])) if (a.arquivo_path) await db.storage.from(BUCKET_MATERIAIS).remove([a.arquivo_path]);
  const { error } = await db.from('painel_modulos').delete().eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast('Módulo excluído','success'); closeModal(); _D.aulaAtual = null; openPainel(_D.painel.id);
}
async function moverModulo(id, dir) {
  const list = _D.painel.painel_modulos.map(m=>m.id); const i = list.indexOf(id), j = i+dir;
  if (i<0||j<0||j>=list.length) return; [list[i],list[j]]=[list[j],list[i]];
  await Promise.all(list.map((mid,k)=>db.from('painel_modulos').update({ordem:k}).eq('id',mid)));
  openPainel(_D.painel.id, _D.aulaAtual);
}

// ---- Aulas ----
function openModalAula(moduloId, aulaId) {
  const a = aulaId ? _D.aulas?.[aulaId] : null;
  const tipo = a?.tipo || 'arquivo';
  openModal(`
    <div class="modal-header"><h3>${a?'Editar aula':'Nova aula / material'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveAula(event)" style="padding:20px">
      <div class="form-group"><label>Título *</label><input type="text" name="titulo" value="${esc(a?.titulo)}" placeholder="ex: Apostila Unit 1, Aula extra de pronúncia…" required></div>
      <div class="form-group"><label>Descrição</label><input type="text" name="descricao" value="${esc(a?.descricao)}"></div>
      <div class="form-group"><label>Tipo de conteúdo</label>
        <div class="tipo-opts">
          ${[['arquivo','📄 Arquivo (PDF, áudio, etc.)'],['youtube','▶️ Vídeo do YouTube'],['link','🔗 Link externo'],['texto','📖 Texto']].map(([v,l]) =>
            `<label class="chip ${tipo===v?'active':''}"><input type="radio" name="tipo" value="${v}" ${tipo===v?'checked':''} onchange="trocaTipoAula(this)" style="display:none">${l}</label>`).join('')}
        </div>
      </div>
      <div id="tipo-arquivo" class="tipo-box" style="display:${tipo==='arquivo'?'':'none'}">
        <div class="form-group"><label>Arquivo ${a?.arquivo_nome ? '(atual: '+esc(a.arquivo_nome)+')' : '*'}</label>
          <input type="file" name="arquivo" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp3,.m4a,.wav,.mp4,.png,.jpg,.jpeg,.zip,.txt">
          <span class="hint">Até 50 MB. PDFs e imagens abrem dentro da área; os demais ficam para download.</span></div>
      </div>
      <div id="tipo-youtube" class="tipo-box" style="display:${tipo==='youtube'?'':'none'}">
        <div class="form-group"><label>Link do vídeo *</label><input type="url" name="url_youtube" value="${esc(tipo==='youtube'?a?.url:'')}" placeholder="https://www.youtube.com/watch?v=…"><span class="hint">Dica: no YouTube, deixe o vídeo como "Não listado" para só quem tem o link ver.</span></div>
      </div>
      <div id="tipo-link" class="tipo-box" style="display:${tipo==='link'?'':'none'}">
        <div class="form-group"><label>Link *</label><input type="url" name="url_link" value="${esc(tipo==='link'?a?.url:'')}" placeholder="https://drive.google.com/… ou https://meet.google.com/…"></div>
      </div>
      <div id="tipo-texto" class="tipo-box" style="display:${tipo==='texto'?'':'none'}">
        <div class="form-group"><label>Texto *</label><textarea name="conteudo" rows="8" placeholder="Escreva o conteúdo. Links viram clicáveis automaticamente.">${esc(a?.conteudo)}</textarea></div>
      </div>
      <input type="hidden" name="id" value="${a?.id||''}"><input type="hidden" name="modulo_id" value="${moduloId}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        ${a ? `<button type="button" class="btn btn-danger" onclick="excluirAula('${a.id}')">🗑 Excluir</button>` : ''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${a?'Salvar':'Adicionar'}</button>
      </div>
    </form>`);
}
function trocaTipoAula(radio) {
  document.querySelectorAll('.tipo-opts .chip').forEach(c => c.classList.toggle('active', c.querySelector('input').checked));
  document.querySelectorAll('.tipo-box').forEach(b => { b.style.display = b.id==='tipo-'+radio.value ? '' : 'none'; });
}
async function saveAula(e) {
  e.preventDefault();
  const fd = new FormData(e.target); const id = fd.get('id'); const a = id ? _D.aulas?.[id] : null;
  const tipo = fd.get('tipo');
  const row = { titulo: fd.get('titulo').trim(), descricao: fd.get('descricao').trim()||null, tipo, url:null, conteudo:null };
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  try {
    if (tipo==='youtube') { row.url = fd.get('url_youtube').trim(); if (!youtubeId(row.url)) throw new Error('Cole um link válido do YouTube'); }
    if (tipo==='link')    { row.url = fd.get('url_link').trim(); if (!row.url) throw new Error('Informe o link'); }
    if (tipo==='texto')   { row.conteudo = fd.get('conteudo').trim(); if (!row.conteudo) throw new Error('Escreva o texto'); }
    if (tipo==='arquivo') {
      const file = fd.get('arquivo');
      if (file && file.size) {
        if (file.size > 50*1024*1024) throw new Error('Arquivo maior que 50 MB');
        btn.textContent = 'Enviando arquivo…';
        const path = `${_D.painel.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g,'_')}`;
        const { error: upErr } = await db.storage.from(BUCKET_MATERIAIS).upload(path, file, { upsert:false });
        if (upErr) throw upErr;
        if (a?.arquivo_path) await db.storage.from(BUCKET_MATERIAIS).remove([a.arquivo_path]);
        row.arquivo_path = path; row.arquivo_nome = file.name; row.arquivo_tamanho = file.size;
      } else if (!a?.arquivo_path) throw new Error('Selecione um arquivo');
    } else if (a?.arquivo_path) {
      await db.storage.from(BUCKET_MATERIAIS).remove([a.arquivo_path]);
      row.arquivo_path = null; row.arquivo_nome = null; row.arquivo_tamanho = null;
    }
    const res = id ? await db.from('painel_aulas').update(row).eq('id', id)
                   : await db.from('painel_aulas').insert({ ...row, modulo_id: fd.get('modulo_id'), ordem: (_D.modulos[fd.get('modulo_id')]?.painel_aulas.length||0) }).select().single();
    if (res.error) throw res.error;
    showToast(id?'Aula salva!':'Aula adicionada! ✅','success'); closeModal();
    openPainel(_D.painel.id, id || res.data?.id);
  } catch (err) { showToast('Erro: '+err.message,'error'); btn.disabled=false; btn.textContent = id?'Salvar':'Adicionar'; }
}
async function excluirAula(id) {
  const a = _D.aulas?.[id]; if (!a) return;
  if (!confirm(`Excluir a aula "${a.titulo}"?`)) return;
  if (a.arquivo_path) await db.storage.from(BUCKET_MATERIAIS).remove([a.arquivo_path]);
  const { error } = await db.from('painel_aulas').delete().eq('id', id);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast('Aula excluída','success'); closeModal(); _D.aulaAtual = null; openPainel(_D.painel.id);
}
async function moverAula(id, dir) {
  const a = _D.aulas?.[id]; const list = a.modulo.painel_aulas.map(x=>x.id); const i = list.indexOf(id), j = i+dir;
  if (i<0||j<0||j>=list.length) return; [list[i],list[j]]=[list[j],list[i]];
  await Promise.all(list.map((aid,k)=>db.from('painel_aulas').update({ordem:k}).eq('id',aid)));
  openPainel(_D.painel.id, _D.aulaAtual);
}

// ---- Acessos (liberar alunos) ----
async function openModalAcessos(painelId) {
  if (!can('membros_editar')) return;
  const p = _D.paineis?.[painelId] || _D.painel;
  const [{ data: alunos }, { data: acessos }] = await Promise.all([
    db.from('alunos').select('id,nome,email,status,profile_id').order('nome'),
    db.from('painel_acessos').select('aluno_id').eq('painel_id', painelId),
  ]);
  const lib = new Set((acessos||[]).map(a=>a.aluno_id));
  _D.acessosPainel = painelId;
  openModal(`
    <div class="modal-header"><h3>👥 Quem acessa "${esc(p?.titulo)}"</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div style="padding:20px">
      ${p?.liberado_todos ? '<div class="alert alert-info">Este painel está <strong>liberado para todos os alunos ativos</strong>. As marcações abaixo valem como extra (ex.: manter acesso após trancar).</div>' : ''}
      <div class="toolbar"><input type="text" class="search-input" placeholder="🔍 Buscar aluno…" oninput="filterAcessos(this.value)">
        <span class="text-muted" id="acessos-count">${lib.size} liberado(s)</span></div>
      <div class="acessos-list">
        ${(alunos||[]).map(a => `
          <label class="perm-row acesso-row" data-n="${esc((a.nome+' '+(a.email||'')).toLowerCase())}">
            <div><div class="perm-label">${esc(a.nome)} ${a.status!=='ativo'?alunoStatusBadge(a.status):''}</div>
              <div class="perm-desc">${esc(a.email)||'sem email'} ${a.profile_id?'• <span class="text-success">tem login</span>':'• <span class="text-danger">sem login</span>'}</div></div>
            <span class="switch"><input type="checkbox" ${lib.has(a.id)?'checked':''} onchange="toggleAcesso('${painelId}','${a.id}',this.checked)"><span class="slider"></span></span>
          </label>`).join('') || '<p class="empty-state">Nenhum aluno cadastrado.</p>'}
      </div>
      <p class="hint">Alunos sem login não conseguem entrar — crie o acesso na ficha do aluno (botão "Criar acesso").</p>
      <div class="modal-footer" style="padding:0;margin-top:16px;border:none"><button class="btn btn-primary" onclick="closeModal();if(activeTab==='membros')renderMembros()">Concluir</button></div>
    </div>`);
}
function filterAcessos(q) {
  q = (q||'').toLowerCase();
  document.querySelectorAll('.acesso-row').forEach(r => { r.style.display = r.dataset.n.includes(q)?'':'none'; });
}
async function toggleAcesso(painelId, alunoId, on) {
  const res = on ? await db.from('painel_acessos').upsert({ painel_id:painelId, aluno_id:alunoId, liberado_por:user.id }, { onConflict:'painel_id,aluno_id' })
                 : await db.from('painel_acessos').delete().eq('painel_id', painelId).eq('aluno_id', alunoId);
  if (res.error) { showToast('Erro: '+res.error.message,'error'); return; }
  const c = document.getElementById('acessos-count');
  if (c) { const n = document.querySelectorAll('.acesso-row input:checked').length; c.textContent = `${n} liberado(s)`; }
  showToast(on ? 'Acesso liberado' : 'Acesso removido', 'success');
}

// ---- Ficha do aluno: aba "Área de Membros" + login do aluno ----
async function fichaMembrosHTML() {
  const a = _D.fichaAluno;
  const [{ data: paineis }, { data: acessos }, { data: prog }] = await Promise.all([
    db.from('paineis').select('id,titulo,ativo,liberado_todos, painel_modulos(painel_aulas(id))').order('ordem').order('titulo'),
    db.from('painel_acessos').select('painel_id').eq('aluno_id', a.id),
    a.profile_id ? db.from('aula_progresso').select('aula_id').eq('profile_id', a.profile_id).eq('concluida', true) : Promise.resolve({data:[]}),
  ]);
  const lib = new Set((acessos||[]).map(x=>x.painel_id)); const feitas = new Set((prog||[]).map(x=>x.aula_id));
  const podeEd = can('membros_editar');
  const loginBox = a.profile_id
    ? `<div class="alert alert-info">🔑 Login criado — o aluno entra com <strong>${esc(a.email)}</strong>.
        ${podeEd ? `<button class="btn btn-sm btn-secondary" onclick="resetSenhaAluno('${a.id}')">Enviar redefinição de senha</button>` : ''}</div>`
    : `<div class="alert alert-warning">Este aluno ainda <strong>não tem login</strong> na Área de Membros.
        ${podeEd ? (a.email ? `<button class="btn btn-sm btn-primary" onclick="criarAcessoAluno('${a.id}')">🔑 Criar acesso</button>` : '<span class="text-muted">Cadastre um email na ficha para criar o acesso.</span>') : ''}</div>`;
  return `${loginBox}
    <div class="card"><div class="card-header"><h3>Painéis</h3></div><div class="card-body">
      ${(paineis||[]).length ? paineis.map(p => {
        const aulas = (p.painel_modulos||[]).flatMap(m=>m.painel_aulas||[]);
        const f = aulas.filter(x=>feitas.has(x.id)).length;
        const tem = lib.has(p.id) || p.liberado_todos;
        return `<label class="perm-row">
          <div><div class="perm-label">${esc(p.titulo)} ${!p.ativo?'<span class="badge badge-gray">Inativo</span>':''} ${p.liberado_todos?'<span class="badge badge-info">todos</span>':''}</div>
            <div class="perm-desc">${aulas.length} aula(s)${a.profile_id && aulas.length ? ` • ${f} concluída(s) (${Math.round(f/aulas.length*100)}%)` : ''}</div></div>
          <span class="switch"><input type="checkbox" ${lib.has(p.id)?'checked':''} ${podeEd?'':'disabled'} onchange="toggleAcesso('${p.id}','${a.id}',this.checked)"><span class="slider"></span></span>
        </label>`; }).join('') : '<p class="empty-state">Nenhum painel criado ainda.</p>'}
    </div></div>`;
}
async function criarAcessoAluno(alunoId) {
  const a = _D.alunos?.[alunoId] || _D.fichaAluno;
  if (!a?.email) { showToast('O aluno precisa ter um email cadastrado','error'); return; }
  if (!confirm(`Criar login para ${a.nome} com o email ${a.email}?\nSenha inicial: VMLI2024! (o aluno pode trocar em "Minha conta").`)) return;
  try {
    const nu = await createAuthUser({ name: a.nome, email: a.email, role: 'aluno' });
    if (!nu) throw new Error('Não foi possível criar o usuário');
    const { error } = await db.from('alunos').update({ profile_id: nu.id }).eq('id', alunoId); if (error) throw error;
    await logHistorico(alunoId, 'nota', 'Login da Área de Membros criado');
    showToast('Acesso criado! Senha inicial: VMLI2024!','success'); openFichaAluno(alunoId, 'membros');
  } catch (err) {
    let msg = 'Erro: '+err.message;
    if (/already/i.test(err.message)) msg = 'Já existe um login com este email. Se for deste aluno, me avise para vincular.';
    showToast(msg,'error');
  }
}
async function resetSenhaAluno(alunoId) {
  const a = _D.alunos?.[alunoId] || _D.fichaAluno;
  const { error } = await db.auth.resetPasswordForEmail(a.email, { redirectTo: window.location.href });
  showToast(error ? 'Erro: '+error.message : `Email de redefinição enviado para ${a.email}`, error?'error':'success');
}

// ---- Minha conta (aluno e equipe): trocar senha ----
function renderMinhaConta() {
  setContent(`
    <div class="page-header"><h2>Minha conta 👤</h2></div>
    <div class="card"><div class="card-body">
      <div class="info-grid" style="margin-bottom:20px">
        <div class="info-item"><span class="info-label">Nome</span><span class="info-value">${esc(profile?.name)}</span></div>
        <div class="info-item"><span class="info-label">Email</span><span class="info-value">${esc(profile?.email||user?.email)}</span></div>
        <div class="info-item"><span class="info-label">Perfil</span><span class="info-value">${getRoleLabel(profile?.role)}</span></div>
      </div>
      <h3 style="margin:0 0 10px">🔑 Trocar senha</h3>
      <form onsubmit="salvarNovaSenha(event)" style="max-width:420px">
        <div class="form-group"><label>Nova senha *</label><input type="password" name="senha" minlength="6" required autocomplete="new-password"></div>
        <div class="form-group"><label>Repita a nova senha *</label><input type="password" name="senha2" minlength="6" required autocomplete="new-password"></div>
        <button type="submit" class="btn btn-primary">Salvar nova senha</button>
      </form>
    </div></div>`);
}
async function salvarNovaSenha(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (fd.get('senha') !== fd.get('senha2')) { showToast('As senhas não conferem','error'); return; }
  const { error } = await db.auth.updateUser({ password: fd.get('senha') });
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast('Senha alterada com sucesso! ✅','success'); e.target.reset();
}
