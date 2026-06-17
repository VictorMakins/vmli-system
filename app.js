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
// Integrações externas opcionais
// - Cole aqui os Webhooks do n8n/Brevo/Mailchimp/WhatsApp quando estiverem prontos.
// - Se ficarem vazios, o sistema apenas registra a campanha/mensagem no Supabase.
// ============================================================
const EMAIL_MARKETING_WEBHOOK_URL = '';
const WHATSAPP_BROADCAST_WEBHOOK_URL = '';

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
    { id:'financeiro',       icon:'💰', label:'Financeiro' },
    { id:'servicos',         icon:'🧩', label:'Serviços' },
    { id:'membros',          icon:'👥', label:'Membros' },
  ],
  admin: [
    { id:'dashboard',        icon:'🏠', label:'Dashboard' },
    { id:'professores',      icon:'👨‍🏫', label:'Professores' },
    { id:'turmas',           icon:'📚', label:'Turmas' },
    { id:'turmas-ativas',    icon:'🗂️', label:'Turmas Ativas' },
    { id:'aulas-admin',      icon:'📒', label:'Aulas Dadas' },
    { id:'alunos',           icon:'🎓', label:'Alunos' },
    { id:'financeiro',       icon:'💰', label:'Financeiro' },
    { id:'mensagens',        icon:'📣', label:'Mensagens' },
    { id:'email-marketing',  icon:'✉️', label:'Email Marketing' },
    { id:'servicos',         icon:'🧩', label:'Serviços' },
    { id:'membros',          icon:'👥', label:'Membros' },
  ],
  financeiro: [
    { id:'dashboard',  icon:'🏠', label:'Dashboard' },
    { id:'financeiro', icon:'💰', label:'Financeiro' },
    { id:'turmas-ativas', icon:'🗂️', label:'Turmas Ativas' },
  ],
  aluno: [
    { id:'dashboard',       icon:'🏠', label:'Área do Aluno' },
    { id:'minhas-turmas',   icon:'📚', label:'Minhas Turmas' },
    { id:'financeiro-aluno',icon:'💳', label:'Pagamentos' },
    { id:'servicos',        icon:'🧩', label:'Serviços' },
    { id:'membros',         icon:'👥', label:'Membros' },
  ],
};

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

  showTab('dashboard');
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
  const items = NAV[profile?.role] || [];
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
  document.getElementById('content').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  switch (tab) {
    case 'dashboard':       renderDashboard();      break;
    case 'minhas-turmas':   renderMinhasTurmas();   break;
    case 'marcar-presenca': renderMarcarPresenca(); break;
    case 'historico':       renderHistorico();      break;
    case 'professores':       renderProfessores();            break;
    case 'turmas':            renderTurmasAdmin();            break;
    case 'turmas-ativas':     renderTurmasAtivasDetalhadas(); break;
    case 'aulas-admin':       renderAulasAdmin();             break;
    case 'alunos':            renderAlunos();                 break;
    case 'financeiro':        renderFinanceiro();             break;
    case 'financeiro-aluno':  renderFinanceiroAluno();        break;
    case 'mensagens':         renderMensagens();              break;
    case 'email-marketing':   renderEmailMarketing();         break;
    case 'servicos':          renderServicos();               break;
    case 'membros':           renderMembros();                break;
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
  if      (profile?.role === 'admin')      await renderDashboardAdmin();
  else if (profile?.role === 'financeiro') await renderDashboardFinanceiro();
  else if (profile?.role === 'aluno')      await renderDashboardAluno();
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
    ${pendingCount > 0 ? `
      <div class="alert alert-warning">
        ⚠️ <strong>${pendingCount} professor(es)</strong> com pagamento pendente em ${MONTHS[mes]}.
        <button class="btn btn-sm btn-warning" onclick="showTab('financeiro')">Ver Financeiro</button>
      </div>` : ''}
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
        <button class="action-card" onclick="showTab('financeiro')">
          <span class="action-icon">💰</span><span>Ver Financeiro</span>
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

  setContent(`
    <div class="page-header">
      <h2>Dashboard Financeiro 💰</h2>
      <span class="text-muted">${MONTHS[mes]} ${ano}</span>
    </div>
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
      // Criar novo usuário — preserva sessão do admin
      const { data: adminSess } = await db.auth.getSession();
      const { data: nu, error: signErr } = await db.auth.signUp({
        email, password: 'VMLI2024!',
        options: { data: { name, role: 'professor', valor_aula: valor } }
      });
      if (signErr) throw signErr;

      // Restaura sessão admin após signUp
      if (adminSess?.session) {
        setTimeout(async () => {
          const { data: cur } = await db.auth.getSession();
          if (!cur?.session || cur.session.user.id !== user.id) {
            await db.auth.setSession({
              access_token:  adminSess.session.access_token,
              refresh_token: adminSess.session.refresh_token,
            });
          }
        }, 800);
      }

      // Garante que o profile existe com valor_aula correto
      if (nu?.user) {
        await new Promise(r => setTimeout(r, 1200));
        await db.from('profiles').upsert({
          id: nu.user.id, name, email, role: 'professor', valor_aula: valor
        });
        await db.from('valor_aula_historico').insert({
          professor_id: nu.user.id, valor_anterior: 0, valor_novo: valor, alterado_por: user.id
        });
      }
      showToast('Professor criado! Senha padrão: VMLI2024!', 'success');
    }
    closeModal();
    renderProfessores();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
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
async function renderAlunos() {
  const { data: alunos } = await db.from('alunos').select('*').order('nome');
  _D.alunos = {};
  alunos?.forEach(a=>{ _D.alunos[a.id]=a; });

  setContent(`
    <div class="page-header">
      <h2>Alunos</h2>
      <button class="btn btn-primary" onclick="openModalAluno(null)">+ Novo Aluno</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding-bottom:0">
        <input type="text" class="search-input" placeholder="🔍 Buscar aluno…" oninput="filterAlunos(this.value)">
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Ações</th></tr></thead>
          <tbody id="alunos-tbody">
            ${alunos?.length ? alunos.map(a=>`
              <tr data-n="${a.nome.toLowerCase()}">
                <td>${a.nome}</td>
                <td>${a.email||'—'}</td>
                <td>${a.telefone||'—'}</td>
                <td><button class="btn btn-sm btn-secondary" onclick="openModalAluno('${a.id}')">Editar</button></td>
              </tr>`).join('')
            : '<tr><td colspan="4" class="empty-state">Nenhum aluno cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`);
}

function filterAlunos(q) {
  document.querySelectorAll('#alunos-tbody tr[data-n]').forEach(tr => {
    tr.style.display = tr.dataset.n.includes(q.toLowerCase()) ? '' : 'none';
  });
}

function openModalAluno(id) {
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
          <label>Email</label>
          <input type="email" name="email" value="${esc(a?.email)}">
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input type="tel" name="telefone" value="${esc(a?.telefone)}">
        </div>
      </div>
      <div class="form-group">
        <label>Observações</label>
        <textarea name="notas" rows="2">${esc(a?.notas)}</textarea>
      </div>
      <input type="hidden" name="id" value="${a?.id||''}">
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${a?'Salvar':'Criar Aluno'}</button>
      </div>
    </form>`);
}

async function saveAluno(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = { nome:fd.get('nome').trim(), email:fd.get('email').trim()||null, telefone:fd.get('telefone').trim()||null, notas:fd.get('notas').trim()||null };
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled=true;
  const { error } = id ? await db.from('alunos').update(row).eq('id',id) : await db.from('alunos').insert(row);
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  showToast(id?'Aluno atualizado!':'Aluno criado!','success');
  closeModal(); renderAlunos();
}

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
        </div>
        <div class="card-footer">
          <button type="submit" class="btn btn-primary btn-full">
            ${existingAula?'💾 Atualizar Registro':'✅ Registrar Presença'}
          </button>
        </div>
      </form>
    </div>`;
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

    showToast('Presença registrada! ✅','success');
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
// 14. ÁREA DO ALUNO, TURMAS ATIVAS, AULAS, MARKETING, MENSAGENS, SERVIÇOS E MEMBROS
// ============================================================
async function getAlunoAtual() {
  if (profile?.role !== 'aluno') return null;
  if (profile?.aluno_id) {
    const { data } = await db.from('alunos').select('*').eq('id', profile.aluno_id).maybeSingle();
    if (data) return data;
  }
  if (profile?.email) {
    const { data } = await db.from('alunos').select('*').ilike('email', profile.email).maybeSingle();
    return data || null;
  }
  return null;
}

async function renderDashboardAluno() {
  const aluno = await getAlunoAtual();
  if (!aluno) {
    setContent(`<div class="page-header"><h2>Área do Aluno</h2></div>
      <div class="alert alert-warning">Seu usuário está logado como aluno, mas ainda não foi vinculado a um cadastro em <strong>alunos</strong>. O admin precisa cadastrar seu email na tabela de alunos ou preencher <code>profiles.aluno_id</code>.</div>`);
    return;
  }

  const { data: tRows } = await db.from('turma_alunos')
    .select('turmas(id,codigo,nome,horario,idioma,nivel,meet_link,profiles!turmas_professor_id_fkey(name))')
    .eq('aluno_id', aluno.id).eq('status','active');

  const { data: pagamentos, error: pagErr } = await db.from('aluno_pagamentos')
    .select('*').eq('aluno_id', aluno.id).order('vencimento',{ascending:true}).limit(5);

  const aberto = !pagErr && pagamentos ? pagamentos.filter(p=>p.status !== 'pago').length : 0;

  setContent(`
    <div class="page-header"><h2>Bem-vindo(a), ${aluno.nome?.split(' ')[0] || 'aluno'} 👋</h2></div>
    <div class="stats-grid">
      ${statCard('📚', tRows?.length||0, 'Turmas ativas')}
      ${statCard('💳', pagErr ? '—' : aberto, 'Pagamentos em aberto')}
      ${statCard('🧩', 'VMLI', 'Serviços disponíveis', "showTab('servicos')")}
    </div>
    <div class="card">
      <div class="card-header"><h3>Minhas próximas informações</h3></div>
      <div class="card-body">
        ${tRows?.length ? tRows.map(r=>{
          const t = r.turmas;
          return `<div class="list-item">
            <div class="list-item-left">
              <div class="list-item-title">${t?.codigo || 'Turma'} ${t?.nome ? '— '+t.nome : ''}</div>
              <div class="list-item-sub">${t?.profiles?.name || 'Professor'} • ${t?.horario || 'Horário a confirmar'} • ${t?.idioma || 'Inglês'}${t?.nivel ? ' • '+t.nivel : ''}</div>
            </div>
            ${t?.meet_link ? `<a class="btn btn-sm btn-primary" href="${t.meet_link}" target="_blank">Entrar na aula</a>` : ''}
          </div>`;
        }).join('') : '<p class="empty-state">Nenhuma turma ativa vinculada ao seu cadastro.</p>'}
      </div>
    </div>`);
}

async function renderFinanceiroAluno() {
  const aluno = await getAlunoAtual();
  if (!aluno) {
    setContent(`<div class="page-header"><h2>Pagamentos</h2></div><div class="alert alert-warning">Aluno não vinculado ao cadastro financeiro.</div>`);
    return;
  }
  const { data: pags, error } = await db.from('aluno_pagamentos').select('*').eq('aluno_id', aluno.id).order('vencimento',{ascending:false});
  if (error) {
    setContent(`<div class="page-header"><h2>Pagamentos</h2></div>
      <div class="alert alert-warning">A tabela <code>aluno_pagamentos</code> ainda não existe no Supabase. Rode o SQL complementar que deixei abaixo.</div>`);
    return;
  }
  const totalAberto = (pags||[]).filter(p=>p.status !== 'pago').reduce((s,p)=>s+(p.valor||0),0);
  setContent(`
    <div class="page-header"><h2>Meus Pagamentos</h2><span class="text-muted">${aluno.nome}</span></div>
    <div class="stats-grid">${statCard('⏳', formatCurrency(totalAberto), 'Total em aberto')}</div>
    <div class="card"><div class="table-wrapper"><table class="table">
      <thead><tr><th>Mês</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Link</th></tr></thead>
      <tbody>
        ${pags?.length ? pags.map(p=>`<tr>
          <td>${p.mes ? MONTHS[p.mes] : '—'} ${p.ano || ''}</td>
          <td>${p.vencimento ? formatDate(p.vencimento) : '—'}</td>
          <td><strong>${formatCurrency(p.valor)}</strong></td>
          <td><span class="badge ${p.status==='pago'?'badge-success':'badge-warning'}">${p.status==='pago'?'Pago':'Pendente'}</span></td>
          <td>${p.link_pagamento ? `<a href="${p.link_pagamento}" target="_blank">Abrir</a>` : '—'}</td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Nenhum pagamento cadastrado.</td></tr>'}
      </tbody>
    </table></div></div>`);
}

async function renderTurmasAtivasDetalhadas() {
  const { data: turmas } = await db.from('turmas')
    .select('*,profiles!turmas_professor_id_fkey(name,email)')
    .eq('status','active').order('codigo');

  const turmaIds = turmas?.map(t=>t.id)||[];
  const { data: tAlunos } = turmaIds.length
    ? await db.from('turma_alunos').select('turma_id,alunos(id,nome,email,telefone)').in('turma_id', turmaIds).eq('status','active')
    : { data: [] };

  const alunosByTurma = {};
  tAlunos?.forEach(ta => { (alunosByTurma[ta.turma_id]||(alunosByTurma[ta.turma_id]=[])).push(ta.alunos); });

  setContent(`
    <div class="page-header"><h2>Turmas Ativas</h2><span class="text-muted">Responsável, alunos, horário, início e término</span></div>
    <div class="turmas-grid">
      ${turmas?.length ? turmas.map(t=>{
        const alunos = alunosByTurma[t.id]||[];
        return `<div class="turma-card">
          <div class="turma-card-header">
            <div><div class="turma-codigo">${t.codigo}</div>${t.nome?`<div class="turma-nome">${t.nome}</div>`:''}</div>
            <span class="badge badge-success">Ativa</span>
          </div>
          <div class="turma-details">
            <div>👨‍🏫 Responsável: <strong>${t.profiles?.name || '—'}</strong></div>
            <div>🕐 ${t.horario || 'Horário não definido'}</div>
            <div>🌍 ${t.idioma || 'Inglês'}${t.nivel ? ' • '+t.nivel : ''}</div>
            <div>📅 Início: ${t.data_inicio ? formatDate(t.data_inicio) : '—'} • Término: ${t.data_fim ? formatDate(t.data_fim) : '—'}</div>
          </div>
          <div class="turma-alunos"><strong>Alunos (${alunos.length})</strong>
            <div class="alunos-list" style="margin-top:8px">
              ${alunos.length ? alunos.map(a=>`<span class="aluno-chip" title="${a?.email || ''}">${a?.nome}</span>`).join('') : '<span class="text-muted" style="font-size:12px">Nenhum aluno vinculado</span>'}
            </div>
          </div>
        </div>`;
      }).join('') : '<div class="empty-card"><p>Nenhuma turma ativa.</p></div>'}
    </div>`);
}

async function renderAulasAdmin() {
  const { mes, ano } = getCurrentMonthYear();
  setContent(`
    <div class="page-header"><h2>Aulas Dadas e Progresso</h2><span class="text-muted">Controle onde cada turma está no material</span></div>
    <div class="filters-bar">
      <select id="ames">${MONTHS.slice(1).map((m,i)=>`<option value="${i+1}" ${i+1===mes?'selected':''}>${m}</option>`).join('')}</select>
      <select id="aano">${[ano-1,ano,ano+1].map(y=>`<option value="${y}" ${y===ano?'selected':''}>${y}</option>`).join('')}</select>
      <button class="btn btn-primary" onclick="loadAulasAdmin()">Ver aulas</button>
    </div>
    <div id="aulas-admin-box"><div class="loading"><div class="spinner"></div></div></div>`);
  loadAulasAdmin();
}

async function loadAulasAdmin() {
  const mes = parseInt(document.getElementById('ames')?.value) || getCurrentMonthYear().mes;
  const ano = parseInt(document.getElementById('aano')?.value) || getCurrentMonthYear().ano;
  const box = document.getElementById('aulas-admin-box');
  if (!box) return;
  box.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  const { data: aulas, error } = await db.from('aulas')
    .select('*,turmas(codigo,nome,horario,idioma,nivel),profiles!aulas_professor_id_fkey(name),presencas(status)')
    .gte('data', monthStart(mes,ano)).lte('data', monthEnd(mes,ano))
    .order('data',{ascending:false});
  if (error) { box.innerHTML = `<div class="alert alert-warning">Erro ao carregar aulas: ${error.message}</div>`; return; }

  const latestByTurma = {};
  (aulas||[]).forEach(a => { if (!latestByTurma[a.turma_id]) latestByTurma[a.turma_id] = a; });

  box.innerHTML = `
    <div class="stats-grid stats-compact">
      ${statCard('📅', aulas?.length||0, `Aulas em ${MONTHS[mes]}`)}
      ${statCard('📚', Object.keys(latestByTurma).length, 'Turmas com registro')}
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>Onde cada turma está</h3></div>
      <div class="card-body">
        ${Object.values(latestByTurma).length ? Object.values(latestByTurma).map(a=>`<div class="list-item">
          <div class="list-item-left">
            <div class="list-item-title">${a.turmas?.codigo || 'Turma'} — última aula em ${formatDate(a.data)}</div>
            <div class="list-item-sub">${a.profiles?.name || 'Professor'} • ${a.turmas?.horario || ''}</div>
            <div class="list-item-sub">📖 ${[a.chapter?'Chapter '+a.chapter:'',a.page_num?'Page '+a.page_num:'',a.exercise?'Exercise '+a.exercise:''].filter(Boolean).join(' • ') || 'Material não informado'}</div>
          </div>
        </div>`).join('') : '<p class="empty-state">Nenhuma aula registrada neste mês.</p>'}
      </div>
    </div>
    <div class="card"><div class="table-wrapper"><table class="table">
      <thead><tr><th>Data</th><th>Turma</th><th>Professor</th><th>Presenças</th><th>Material</th><th>Observações</th></tr></thead>
      <tbody>
        ${aulas?.length ? aulas.map(a=>{
          const pres = a.presencas?.filter(p=>p.status==='P').length || 0;
          const aus = a.presencas?.filter(p=>p.status==='A').length || 0;
          return `<tr>
            <td>${formatDate(a.data)}</td>
            <td><strong>${a.turmas?.codigo || '—'}</strong><br><small>${a.turmas?.nome || ''}</small></td>
            <td>${a.profiles?.name || '—'} ${a.is_substituicao ? '<br><span class="badge badge-warning">Substituição</span>' : ''}</td>
            <td>✅ ${pres} / ❌ ${aus}</td>
            <td>${[a.chapter?'Ch. '+a.chapter:'',a.page_num?'p. '+a.page_num:'',a.exercise?'Ex. '+a.exercise:''].filter(Boolean).join(' • ') || '—'}</td>
            <td>${a.notas || '—'}</td>
          </tr>`;
        }).join('') : '<tr><td colspan="6" class="empty-state">Nenhuma aula encontrada.</td></tr>'}
      </tbody>
    </table></div></div>`;
}

async function renderMensagens() {
  const { count: alunoCount } = await db.from('alunos').select('*',{count:'exact',head:true});
  setContent(`
    <div class="page-header"><h2>Enviar Mensagem aos Alunos</h2><span class="text-muted">WhatsApp, email ou comunicado interno via webhook</span></div>
    <div class="card">
      <form onsubmit="sendMensagemAlunos(event)" style="padding:20px">
        <div class="alert alert-info">Este módulo registra a mensagem no Supabase. Para envio real por WhatsApp/email, conecte o webhook do n8n em <code>WHATSAPP_BROADCAST_WEBHOOK_URL</code>.</div>
        <div class="form-row">
          <div class="form-group"><label>Canal</label><select name="canal"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="interno">Comunicado interno</option></select></div>
          <div class="form-group"><label>Público</label><select name="publico"><option value="todos">Todos os alunos (${alunoCount||0})</option></select></div>
        </div>
        <div class="form-group"><label>Título / Assunto *</label><input type="text" name="titulo" required placeholder="Ex: Aviso importante sobre as aulas"></div>
        <div class="form-group"><label>Mensagem *</label><textarea name="mensagem" rows="5" required placeholder="Digite a mensagem que será enviada aos alunos..."></textarea></div>
        <button class="btn btn-primary btn-full" type="submit">📣 Registrar / Enviar Mensagem</button>
      </form>
    </div>
    <div id="msg-history"></div>`);
  loadMensagemHistory();
}

async function sendMensagemAlunos(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Processando…';

  const { data: alunos } = await db.from('alunos').select('id,nome,email,telefone').order('nome');
  const payload = {
    canal: fd.get('canal'), publico: fd.get('publico'), titulo: fd.get('titulo').trim(),
    mensagem: fd.get('mensagem').trim(), total_destinatarios: alunos?.length || 0,
    destinatarios: alunos || [], created_by: user.id
  };

  const { error } = await db.from('comunicacoes').insert(payload);
  if (error) { showToast('Erro ao registrar: '+error.message,'error'); btn.disabled=false; btn.textContent='📣 Registrar / Enviar Mensagem'; return; }

  if (WHATSAPP_BROADCAST_WEBHOOK_URL) {
    try { await fetch(WHATSAPP_BROADCAST_WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); }
    catch (_) { showToast('Mensagem registrada, mas o webhook falhou.', 'warning'); }
  }
  showToast(WHATSAPP_BROADCAST_WEBHOOK_URL ? 'Mensagem enviada para o webhook!' : 'Mensagem registrada. Configure o webhook para envio real.', 'success');
  e.target.reset(); btn.disabled=false; btn.textContent='📣 Registrar / Enviar Mensagem'; loadMensagemHistory();
}

async function loadMensagemHistory() {
  const box = document.getElementById('msg-history');
  if (!box) return;
  const { data, error } = await db.from('comunicacoes').select('*').order('created_at',{ascending:false}).limit(8);
  if (error) { box.innerHTML = `<div class="alert alert-warning">Crie a tabela <code>comunicacoes</code> no Supabase para ativar o histórico.</div>`; return; }
  box.innerHTML = `<div class="card"><div class="card-header"><h3>Últimas mensagens</h3></div><div class="card-body">
    ${data?.length ? data.map(c=>`<div class="list-item"><div class="list-item-left"><div class="list-item-title">${c.titulo}</div><div class="list-item-sub">${c.canal} • ${c.total_destinatarios || 0} destinatários • ${new Date(c.created_at).toLocaleString('pt-BR')}</div></div></div>`).join('') : '<p class="empty-state">Nenhuma mensagem registrada.</p>'}
  </div></div>`;
}

async function renderEmailMarketing() {
  setContent(`
    <div class="page-header"><h2>Email Marketing</h2><span class="text-muted">Campanhas, newsletters e automações</span></div>
    <div class="card">
      <form onsubmit="saveEmailCampanha(event)" style="padding:20px">
        <div class="alert alert-info">Para disparo real, conecte Brevo, Mailchimp, Resend ou n8n usando <code>EMAIL_MARKETING_WEBHOOK_URL</code>. Sem webhook, a campanha fica salva como rascunho.</div>
        <div class="form-row">
          <div class="form-group"><label>Nome da campanha *</label><input type="text" name="nome" required placeholder="Ex: Matrículas abertas 2026"></div>
          <div class="form-group"><label>Status</label><select name="status"><option value="rascunho">Rascunho</option><option value="agendada">Agendada</option><option value="enviada">Enviar para webhook agora</option></select></div>
        </div>
        <div class="form-group"><label>Assunto do email *</label><input type="text" name="assunto" required></div>
        <div class="form-group"><label>Prévia / Subtítulo</label><input type="text" name="preview"></div>
        <div class="form-group"><label>Conteúdo do email *</label><textarea name="conteudo" rows="8" required></textarea></div>
        <button class="btn btn-primary btn-full" type="submit">✉️ Salvar Campanha</button>
      </form>
    </div>
    <div id="email-campanhas-list"></div>`);
  loadEmailCampanhas();
}

async function saveEmailCampanha(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const row = {
    nome: fd.get('nome').trim(), assunto: fd.get('assunto').trim(), preview: fd.get('preview').trim()||null,
    conteudo: fd.get('conteudo').trim(), status: fd.get('status'), created_by: user.id, updated_at: new Date().toISOString()
  };
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  const { data, error } = await db.from('email_campanhas').insert(row).select().single();
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; return; }
  if (row.status === 'enviada' && EMAIL_MARKETING_WEBHOOK_URL) {
    try { await fetch(EMAIL_MARKETING_WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); }
    catch (_) { showToast('Campanha salva, mas o webhook falhou.', 'warning'); }
  }
  showToast('Campanha salva!', 'success');
  e.target.reset(); btn.disabled=false; loadEmailCampanhas();
}

async function loadEmailCampanhas() {
  const box = document.getElementById('email-campanhas-list');
  if (!box) return;
  const { data, error } = await db.from('email_campanhas').select('*').order('created_at',{ascending:false}).limit(10);
  if (error) { box.innerHTML = `<div class="alert alert-warning">Crie a tabela <code>email_campanhas</code> no Supabase para ativar este módulo.</div>`; return; }
  box.innerHTML = `<div class="card"><div class="card-header"><h3>Campanhas recentes</h3></div><div class="card-body">
    ${data?.length ? data.map(c=>`<div class="list-item"><div class="list-item-left"><div class="list-item-title">${c.nome}</div><div class="list-item-sub">${c.assunto} • ${c.status}</div></div><span class="date-badge">${new Date(c.created_at).toLocaleDateString('pt-BR')}</span></div>`).join('') : '<p class="empty-state">Nenhuma campanha criada.</p>'}
  </div></div>`;
}

async function renderServicos() {
  const isAdmin = profile?.role === 'admin';
  const { data, error } = await db.from('servicos').select('*').eq('ativo', true).order('ordem').order('nome');
  setContent(`
    <div class="page-header"><h2>Serviços VMLI</h2>${isAdmin?'<button class="btn btn-primary" onclick="openModalServico(null)">+ Novo Serviço</button>':''}</div>
    ${error ? '<div class="alert alert-warning">Crie a tabela <code>servicos</code> no Supabase para gerenciar os serviços pelo sistema.</div>' : ''}
    <div class="turmas-grid">
      ${data?.length ? data.map(s=>`<div class="turma-card">
        <div class="turma-card-header"><div><div class="turma-codigo">${s.nome}</div><div class="turma-nome">${s.categoria || 'Serviço'}</div></div><span class="badge badge-info">${s.modalidade || 'VMLI'}</span></div>
        <div class="turma-details"><div>${s.descricao || 'Descrição não informada.'}</div>${s.preco_base ? `<div>💰 A partir de ${formatCurrency(s.preco_base)}</div>` : ''}</div>
        ${isAdmin ? `<div class="turma-card-footer"><button class="btn btn-sm btn-secondary" onclick="openModalServico('${s.id}')">Editar</button></div>` : ''}
      </div>`).join('') : defaultServicosHtml(isAdmin)}
    </div>`);
  _D.servicos = {}; data?.forEach(s=>{ _D.servicos[s.id]=s; });
}

function defaultServicosHtml(isAdmin=false) {
  const defs = [
    ['Inglês para adultos','Aulas individuais ou em grupo com foco em comunicação real.'],
    ['Inglês corporativo','Treinamentos para empresas, times e profissionais.'],
    ['Preparatórios internacionais','IELTS, TOEFL, Cambridge e entrevistas globais.'],
    ['Espanhol','Aulas para comunicação, viagens e negócios.'],
    ['Mentoria global','Carreira internacional, networking e posicionamento profissional.'],
    ['Tradução e revisão','Documentos, apresentações, currículos e materiais técnicos.']
  ];
  return defs.map(([n,d])=>`<div class="turma-card"><div class="turma-card-header"><div><div class="turma-codigo">${n}</div></div><span class="badge badge-info">VMLI</span></div><div class="turma-details"><div>${d}</div></div></div>`).join('') + (isAdmin?'<div class="alert alert-info">Cadastre serviços no botão acima para substituir estes cards padrão.</div>':'');
}

function openModalServico(id) {
  const s = id ? _D.servicos?.[id] : null;
  openModal(`
    <div class="modal-header"><h3>${s?'Editar Serviço':'Novo Serviço'}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <form onsubmit="saveServico(event)" style="padding:20px">
      <input type="hidden" name="id" value="${s?.id||''}">
      <div class="form-group"><label>Nome *</label><input type="text" name="nome" value="${esc(s?.nome)}" required></div>
      <div class="form-row"><div class="form-group"><label>Categoria</label><input type="text" name="categoria" value="${esc(s?.categoria)}"></div><div class="form-group"><label>Modalidade</label><input type="text" name="modalidade" value="${esc(s?.modalidade)}" placeholder="Online, Presencial, Híbrido"></div></div>
      <div class="form-group"><label>Descrição</label><textarea name="descricao" rows="3">${esc(s?.descricao)}</textarea></div>
      <div class="form-row"><div class="form-group"><label>Preço base</label><input type="number" name="preco_base" step="0.01" min="0" value="${s?.preco_base||''}"></div><div class="form-group"><label>Ordem</label><input type="number" name="ordem" value="${s?.ordem||0}"></div></div>
      <div class="modal-footer" style="padding:0;margin-top:20px;border:none"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button></div>
    </form>`);
}

async function saveServico(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = { nome:fd.get('nome').trim(), categoria:fd.get('categoria').trim()||null, modalidade:fd.get('modalidade').trim()||null, descricao:fd.get('descricao').trim()||null, preco_base:parseFloat(fd.get('preco_base'))||null, ordem:parseInt(fd.get('ordem'))||0, ativo:true };
  const { error } = id ? await db.from('servicos').update(row).eq('id',id) : await db.from('servicos').insert(row);
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast('Serviço salvo!', 'success'); closeModal(); renderServicos();
}

async function renderMembros() {
  if (profile?.role === 'admin') {
    const [{ data: profs }, { data: alunos }] = await Promise.all([
      db.from('profiles').select('id,name,email,role,ativo').in('role',['admin','professor','financeiro']).order('name'),
      db.from('alunos').select('id,nome,email,telefone').order('nome')
    ]);
    setContent(`
      <div class="page-header"><h2>Área de Membros</h2><span class="text-muted">Equipe, professores e alunos</span></div>
      <div class="stats-grid">${statCard('👨‍🏫', profs?.filter(p=>p.role==='professor').length||0, 'Professores')}${statCard('🎓', alunos?.length||0, 'Alunos')}${statCard('🧑‍💼', profs?.filter(p=>p.role==='admin'||p.role==='financeiro').length||0, 'Gestão')}</div>
      <div class="card"><div class="card-header"><h3>Equipe</h3></div><div class="card-body">${profs?.map(p=>`<div class="list-item"><div class="list-item-left"><div class="list-item-title">${p.name}</div><div class="list-item-sub">${p.email} • ${getRoleLabel(p.role)}</div></div><span class="badge ${p.ativo?'badge-success':'badge-gray'}">${p.ativo?'Ativo':'Inativo'}</span></div>`).join('') || ''}</div></div>
      <div class="card"><div class="card-header"><h3>Alunos</h3></div><div class="card-body">${alunos?.map(a=>`<div class="list-item"><div class="list-item-left"><div class="list-item-title">${a.nome}</div><div class="list-item-sub">${a.email || 'Sem email'} • ${a.telefone || 'Sem telefone'}</div></div></div>`).join('') || '<p class="empty-state">Nenhum aluno.</p>'}</div></div>`);
  } else {
    setContent(`
      <div class="page-header"><h2>Área de Membros</h2></div>
      <div class="card"><div class="card-body">
        <h3>VMLI Members</h3>
        <p class="text-muted">Este espaço pode concentrar materiais, avisos, links importantes, calendário da escola e benefícios para alunos e professores.</p>
        <div class="actions-grid" style="margin-top:16px">
          <button class="action-card" onclick="showTab('servicos')"><span class="action-icon">🧩</span><span>Ver Serviços</span></button>
          <button class="action-card" onclick="showTab('minhas-turmas')"><span class="action-icon">📚</span><span>Minhas Turmas</span></button>
        </div>
      </div></div>`);
  }
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
  return `${ano}-${String(mes).padStart(2,'0')}-31`;
}

function getRoleLabel(r) {
  return { admin:'Administrador', professor:'Professor', financeiro:'Financeiro', aluno:'Aluno' }[r] || r;
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
