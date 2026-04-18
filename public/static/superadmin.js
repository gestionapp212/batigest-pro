// ===== SUPER ADMIN – BATIGEST PRO =====

const SA = {
  user: null,
  page: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
};

// DB helpers
const SDB = {
  get: (k) => { try { return JSON.parse(localStorage.getItem('batigest_'+k)||'null'); } catch { return null; } },
  set: (k,v) => localStorage.setItem('batigest_'+k, JSON.stringify(v)),
  getAll: (k) => { try { return JSON.parse(localStorage.getItem('batigest_'+k)||'[]'); } catch { return []; } },
  update: (key, id, updates) => {
    const arr = SDB.getAll(key);
    const i = arr.findIndex(x=>x.id==id);
    if (i>=0) { arr[i]={...arr[i],...updates}; SDB.set(key,arr); return arr[i]; }
    return null;
  },
  push: (k, item) => {
    const arr = SDB.getAll(k);
    item.id = item.id || 'sa'+Date.now();
    item.created_at = item.created_at || new Date().toISOString();
    arr.push(item);
    SDB.set(k, arr);
    return item;
  },
  delete: (k, id) => SDB.set(k, SDB.getAll(k).filter(x=>x.id!=id)),
};

function fmt(n) { return Number(n||0).toLocaleString('fr-MA')+' DH'; }
function fmtDate(d) { if(!d) return '–'; return new Date(d).toLocaleDateString('fr-FR'); }

function saToast(msg, type='success') {
  const colors={success:'#16a34a',danger:'#dc2626',warning:'#d97706',info:'#2563eb'};
  const icons={success:'fa-check-circle',danger:'fa-times-circle',warning:'fa-exclamation-triangle',info:'fa-info-circle'};
  let c=document.getElementById('sa-toast-container');
  if(!c){c=document.createElement('div');c.id='sa-toast-container';c.className='toast-container';document.body.appendChild(c);}
  const t=document.createElement('div');
  t.className=`toast toast-${type}`;
  t.innerHTML=`<i class="fas ${icons[type]}" style="color:${colors[type]}"></i><span style="flex:1">${msg}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--text-secondary)"><i class="fas fa-times"></i></button>`;
  c.appendChild(t);
  setTimeout(()=>t.style.opacity='0',3500);
  setTimeout(()=>t.remove(),3800);
}

function saModal(html,size=''){
  closeSaModal();
  const o=document.createElement('div');
  o.className='modal-overlay';o.id='sa-modal-overlay';
  o.innerHTML=`<div class="modal ${size}" id="sa-modal-box">${html}</div>`;
  o.addEventListener('click',e=>{if(e.target===o)closeSaModal();});
  document.body.appendChild(o);
}
function closeSaModal(){const e=document.getElementById('sa-modal-overlay');if(e)e.remove();}

function saConfirm(msg, onOk) {
  saModal(`
    <div class="modal-header"><h3 class="modal-title">Confirmation</h3><button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button></div>
    <p style="color:var(--text-secondary);margin-bottom:24px">${msg}</p>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeSaModal()">Annuler</button><button class="btn btn-danger" onclick="closeSaModal();(${onOk.toString()})()">Confirmer</button></div>`);
}

function setTheme(t){
  SA.theme=t;localStorage.setItem('theme',t);
  document.documentElement.setAttribute('data-theme',t);
}

function saLogin(email, pass) {
  const users = SDB.getAll('users');
  const u = users.find(x=>x.email===email&&x.password===pass&&x.role==='super_admin');
  if(!u){return false;}
  SA.user=u;
  SDB.set('sa_session',u);
  return true;
}

function saLogout(){SDB.set('sa_session',null);SA.user=null;renderSA();}

function renderSA(){
  const root=document.getElementById('root');
  const sess=SDB.get('sa_session');
  if(!sess||sess.role!=='super_admin'){
    root.innerHTML=renderSALogin();
    return;
  }
  SA.user=sess;
  root.innerHTML=`
  <div id="app-layout">
    <div id="sidebar">
      <div class="logo-area">
        <div class="logo-icon">👑</div>
        <div><div class="logo-text">Super Admin</div><div class="logo-sub">BatiGest Pro</div></div>
      </div>
      <nav>
        <div class="nav-section-title">ADMINISTRATION</div>
        ${['dashboard','companies','users','subscriptions','stats'].map(p=>{
          const labels={dashboard:'Tableau de bord',companies:'Sociétés',users:'Utilisateurs',subscriptions:'Abonnements',stats:'Statistiques'};
          const icons={dashboard:'fa-chart-pie',companies:'fa-building',users:'fa-users',subscriptions:'fa-credit-card',stats:'fa-chart-bar'};
          return `<div class="nav-item ${SA.page===p?'active':''}" data-page="${p}" onclick="saNavigate('${p}')">
            <i class="fas ${icons[p]} nav-icon"></i><span>${labels[p]}</span>
          </div>`;
        }).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-avatar-area">
          <div class="user-avatar">S</div>
          <div style="flex:1"><div style="color:#e2e8f0;font-size:13px;font-weight:600">Super Admin</div><div style="color:#94a3b8;font-size:11px">Accès total</div></div>
          <button onclick="saLogout()" style="background:none;border:none;cursor:pointer;color:#94a3b8"><i class="fas fa-sign-out-alt"></i></button>
        </div>
      </div>
    </div>
    <div id="main-content">
      <div id="topbar">
        <h1 class="page-title" id="sa-page-title">Tableau de bord</h1>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" onclick="setTheme(SA.theme==='dark'?'light':'dark')"><i class="fas fa-moon"></i></button>
          <a href="/app" class="btn btn-secondary btn-sm"><i class="fas fa-external-link-alt"></i> App principale</a>
        </div>
      </div>
      <div id="sa-page-content" style="padding:24px"></div>
    </div>
  </div>
  <div id="sa-toast-container" class="toast-container"></div>`;
  setTheme(SA.theme);
  saNavigate(SA.page);
}

function saNavigate(page){
  SA.page=page;
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.toggle('active',e.dataset.page===page));
  const titles={dashboard:'Tableau de bord',companies:'Gestion des sociétés',users:'Tous les utilisateurs',subscriptions:'Abonnements',stats:'Statistiques globales'};
  const el=document.getElementById('sa-page-title');
  if(el) el.textContent=titles[page]||page;
  const content=document.getElementById('sa-page-content');
  if(!content) return;
  const pages={dashboard:saDashboard,companies:saCompanies,users:saUsers,subscriptions:saSubscriptions,stats:saStats};
  if(pages[page]) content.innerHTML=pages[page]();
  if(page==='dashboard') initSACharts();
}

function renderSALogin(){
  return `
  <div id="login-page">
    <div class="login-left">
      <div class="login-hero">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:32px">
          <div style="width:56px;height:56px;background:#7c3aed;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px">👑</div>
          <div><div style="color:#fff;font-size:22px;font-weight:800">BatiGest Pro</div><div style="color:#94a3b8;font-size:13px">Interface Super Admin</div></div>
        </div>
        <h1>Panneau de<br/><span style="color:#a78bfa">contrôle total</span></h1>
        <p>Gérez l'ensemble des sociétés, utilisateurs et abonnements de la plateforme.</p>
        <ul class="feature-list">
          <li><span class="check"><i class="fas fa-check"></i></span>Gestion multi-sociétés</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Contrôle des abonnements</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Activation / suspension de comptes</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Statistiques globales</li>
        </ul>
      </div>
    </div>
    <div class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:40px;height:40px;background:#7c3aed;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">👑</div>
            <span style="font-size:18px;font-weight:800">Super Admin</span>
          </div>
          <h2 style="font-size:22px;font-weight:700;margin-bottom:4px">Accès administrateur</h2>
        </div>
        <form id="sa-login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="sa-email" class="form-input" placeholder="Email administrateur" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <input type="password" id="sa-pass" class="form-input" placeholder="••••••••" required/>
          </div>
          <div id="sa-error" style="display:none;color:#dc2626;font-size:13px;margin-bottom:12px;padding:10px;background:rgba(220,38,38,0.08);border-radius:8px">
            Identifiants incorrects
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;background:#7c3aed">
            <i class="fas fa-shield-alt"></i> Accéder
          </button>
        </form>
        <div style="margin-top:16px;padding:12px;background:var(--bg-main);border-radius:8px;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:8px">
          <i class="fas fa-lock" style="color:#7c3aed"></i>
          Accès réservé aux administrateurs de la plateforme.
        </div>
      </div>
    </div>
  </div>`;
}

// ===== SA DASHBOARD =====
function saDashboard(){
  const companies=SDB.getAll('companies');
  const users=SDB.getAll('users').filter(u=>u.role!=='super_admin');
  const active=companies.filter(c=>c.status==='active');
  const suspended=companies.filter(c=>c.status!=='active');
  const planRev={basic:50,pro:100,business:300};
  const mrr=companies.filter(c=>c.status==='active').reduce((s,c)=>s+(planRev[c.plan]||0),0);
  return `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
    <div class="stat-card"><div class="stat-icon" style="background:rgba(37,99,235,0.1)"><i class="fas fa-building" style="color:#2563eb"></i></div>
      <div class="stat-info"><div class="stat-label">Sociétés totales</div><div class="stat-value">${companies.length}</div><div class="stat-change up"><i class="fas fa-arrow-up"></i> ${active.length} actives</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(22,163,74,0.1)"><i class="fas fa-users" style="color:#16a34a"></i></div>
      <div class="stat-info"><div class="stat-label">Utilisateurs</div><div class="stat-value">${users.length}</div><div class="stat-change up"><i class="fas fa-arrow-up"></i> ${users.filter(u=>u.status==='active').length} actifs</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(124,58,237,0.1)"><i class="fas fa-ban" style="color:#7c3aed"></i></div>
      <div class="stat-info"><div class="stat-label">Comptes suspendus</div><div class="stat-value">${suspended.length}</div><div class="stat-change down">Inactifs</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(217,119,6,0.1)"><i class="fas fa-coins" style="color:#d97706"></i></div>
      <div class="stat-info"><div class="stat-label">MRR (estimation)</div><div class="stat-value">${fmt(mrr)}</div><div class="stat-change up">Mensuel</div></div></div>
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px">
    <div class="card">
      <h3 style="font-weight:700;margin-bottom:16px">Répartition des abonnements</h3>
      <canvas id="sa-chart-plans" height="120"></canvas>
    </div>
    <div class="card">
      <h3 style="font-weight:700;margin-bottom:16px">Statuts sociétés</h3>
      <canvas id="sa-chart-status" height="160"></canvas>
    </div>
  </div>
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="font-weight:700">Sociétés récentes</h3>
      <button class="btn btn-secondary btn-sm" onclick="saNavigate('companies')">Voir tout</button>
    </div>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Société</th><th>Plan</th><th>Utilisateurs</th><th>Statut</th><th>Créée le</th></tr></thead>
        <tbody>
        ${companies.slice(0,5).map(co=>{
          const companyUsers=SDB.getAll('users').filter(u=>u.company_id===co.id);
          const planLimits={basic:1,pro:4,business:10};
          return `<tr>
            <td><div style="font-weight:600">${co.name}</div><div style="font-size:12px;color:var(--text-secondary)">${co.email}</div></td>
            <td><span class="badge ${co.plan==='business'?'badge-purple':co.plan==='pro'?'badge-info':'badge-secondary'}" style="text-transform:uppercase">${co.plan}</span></td>
            <td>${companyUsers.length}/${planLimits[co.plan]||1}</td>
            <td><span class="badge ${co.status==='active'?'badge-success':'badge-danger'}">${co.status==='active'?'Active':'Suspendue'}</span></td>
            <td style="color:var(--text-secondary)">${fmtDate(co.created_at)}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <script>
    window._saChartData = {
      plans: [${companies.filter(c=>c.plan==='basic').length}, ${companies.filter(c=>c.plan==='pro').length}, ${companies.filter(c=>c.plan==='business').length}],
      status: [${active.length}, ${suspended.length}]
    };
  </script>`;
}

function initSACharts(){
  setTimeout(()=>{
    const isDark = SA.theme==='dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const d = window._saChartData || {plans:[0,0,0],status:[0,0]};

    const c1=document.getElementById('sa-chart-plans');
    if(c1) new Chart(c1,{type:'bar',data:{labels:['Basic','Pro','Business'],datasets:[{data:d.plans,backgroundColor:['#94a3b8','#2563eb','#7c3aed'],borderRadius:8}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{grid:{color:isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)'},ticks:{color:textColor,stepSize:1}},x:{grid:{display:false},ticks:{color:textColor}}}}});

    const c2=document.getElementById('sa-chart-status');
    if(c2) new Chart(c2,{type:'doughnut',data:{labels:['Actives','Suspendues'],datasets:[{data:d.status,backgroundColor:['#16a34a','#dc2626'],borderWidth:0}]},options:{responsive:true,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:textColor}}}}});
  },100);
}

// ===== SA COMPANIES =====
function saCompanies(){
  const companies=SDB.getAll('companies');
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Gestion des sociétés</h2><p style="color:var(--text-secondary);font-size:13px">${companies.length} société(s)</p></div>
    <button class="btn btn-primary" onclick="openNewCompanyModal()"><i class="fas fa-plus"></i> Nouvelle société</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Société</th><th>Ville</th><th>Plan</th><th>Utilisateurs</th><th>Statut</th><th>Créée le</th><th>Actions</th></tr></thead>
      <tbody>
      ${companies.length===0?`<tr><td colspan="7"><div class="empty-state" style="padding:40px"><div class="icon">🏢</div><h3>Aucune société</h3></div></td></tr>`:
      companies.map(co=>{
        const users=SDB.getAll('users').filter(u=>u.company_id===co.id);
        const planLimits={basic:1,pro:4,business:10};
        return `<tr>
          <td><div style="font-weight:600">${co.name}</div><div style="font-size:12px;color:var(--text-secondary)">${co.email||'–'}</div></td>
          <td>${co.city||'–'}</td>
          <td>
            <select class="form-select" style="width:auto;padding:4px 8px;font-size:12px" onchange="updateCompanyPlan('${co.id}',this.value)">
              <option value="basic" ${co.plan==='basic'?'selected':''}>Basic – 50 DH</option>
              <option value="pro" ${co.plan==='pro'?'selected':''}>Pro – 100 DH</option>
              <option value="business" ${co.plan==='business'?'selected':''}>Business – 300 DH</option>
            </select>
          </td>
          <td>${users.length} / ${planLimits[co.plan]||1}</td>
          <td>
            <button class="btn btn-sm ${co.status==='active'?'btn-success':'btn-danger'}" onclick="toggleCompanyStatus('${co.id}','${co.status}')">
              <i class="fas fa-${co.status==='active'?'check':'ban'}"></i> ${co.status==='active'?'Active':'Suspendue'}
            </button>
          </td>
          <td style="color:var(--text-secondary)">${fmtDate(co.created_at)}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="openEditCompanyModal('${co.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="deleteCompany('${co.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>`;
}

function openNewCompanyModal(){
  saModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-building" style="margin-right:8px;color:#2563eb"></i>Nouvelle société</h3>
      <button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom société <span class="req">*</span></label><input id="nco-nom" class="form-input" placeholder="BTP Maroc SARL"/></div>
      <div class="form-group"><label class="form-label">Email</label><input id="nco-email" type="email" class="form-input" placeholder="contact@societe.ma"/></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="nco-phone" class="form-input" placeholder="0522001122"/></div>
      <div class="form-group"><label class="form-label">Ville</label><input id="nco-city" class="form-input" placeholder="Casablanca"/></div>
      <div class="form-group"><label class="form-label">Plan abonnement</label>
        <select id="nco-plan" class="form-select">
          <option value="basic">Basic – 50 DH/mois (1 user)</option>
          <option value="pro">Pro – 100 DH/mois (4 users)</option>
          <option value="business">Business – 300 DH/mois (10 users)</option>
        </select>
      </div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
      <h4 style="font-weight:700;margin-bottom:12px">Compte administrateur de la société</h4>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Nom admin <span class="req">*</span></label><input id="nco-admin-nom" class="form-input" placeholder="Nom Prénom"/></div>
        <div class="form-group"><label class="form-label">Email admin <span class="req">*</span></label><input id="nco-admin-email" type="email" class="form-input" placeholder="admin@societe.ma"/></div>
        <div class="form-group"><label class="form-label">Mot de passe <span class="req">*</span></label><input id="nco-admin-pass" type="password" class="form-input" placeholder="Mot de passe"/></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeSaModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveNewCompany()"><i class="fas fa-save"></i> Créer la société</button>
    </div>`);
}

function saveNewCompany(){
  const nom=document.getElementById('nco-nom').value.trim();
  const adminNom=document.getElementById('nco-admin-nom').value.trim();
  const adminEmail=document.getElementById('nco-admin-email').value.trim();
  const adminPass=document.getElementById('nco-admin-pass').value;
  if(!nom||!adminNom||!adminEmail||!adminPass){saToast('Tous les champs requis sont obligatoires','danger');return;}
  const exists=SDB.getAll('users').find(u=>u.email===adminEmail);
  if(exists){saToast('Email admin déjà utilisé','danger');return;}
  const co=SDB.push('companies',{name:nom,email:document.getElementById('nco-email').value,phone:document.getElementById('nco-phone').value,city:document.getElementById('nco-city').value,plan:document.getElementById('nco-plan').value,status:'active'});
  SDB.push('users',{company_id:co.id,name:adminNom,email:adminEmail,password:adminPass,role:'admin',status:'active'});
  closeSaModal();saToast('Société créée avec succès','success');saNavigate('companies');
}

function openEditCompanyModal(id){
  const co=SDB.getAll('companies').find(x=>x.id===id);
  if(!co) return;
  saModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-edit" style="margin-right:8px"></i>Modifier société</h3>
      <button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom</label><input id="eco-nom" class="form-input" value="${co.name}"/></div>
      <div class="form-group"><label class="form-label">Email</label><input id="eco-email" type="email" class="form-input" value="${co.email||''}"/></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="eco-phone" class="form-input" value="${co.phone||''}"/></div>
      <div class="form-group"><label class="form-label">Ville</label><input id="eco-city" class="form-input" value="${co.city||''}"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeSaModal()">Annuler</button>
      <button class="btn btn-primary" onclick="updateCompanyAdmin('${id}')"><i class="fas fa-save"></i> Mettre à jour</button>
    </div>`);
}

function updateCompanyAdmin(id){
  SDB.update('companies',id,{name:document.getElementById('eco-nom').value,email:document.getElementById('eco-email').value,phone:document.getElementById('eco-phone').value,city:document.getElementById('eco-city').value});
  closeSaModal();saToast('Société mise à jour','success');saNavigate('companies');
}

function toggleCompanyStatus(id, current){
  const next=current==='active'?'suspended':'active';
  SDB.update('companies',id,{status:next});
  saToast(`Société ${next==='active'?'activée':'suspendue'}`,'success');
  saNavigate('companies');
}

function updateCompanyPlan(id, plan){
  SDB.update('companies',id,{plan});
  saToast(`Plan mis à jour: ${plan}`,'success');
}

function deleteCompany(id){
  const users=SDB.getAll('users').filter(u=>u.company_id===id);
  if(users.length>0){
    saModal(`
      <div class="modal-header"><h3 class="modal-title" style="color:#dc2626"><i class="fas fa-exclamation-triangle" style="margin-right:8px"></i>Supprimer la société</h3><button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button></div>
      <p style="margin-bottom:16px">Cette société possède <strong>${users.length} utilisateur(s)</strong>. Toutes les données seront supprimées.</p>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeSaModal()">Annuler</button>
      <button class="btn btn-danger" onclick="closeSaModal();confirmDeleteCompany('${id}')"><i class="fas fa-trash"></i> Supprimer quand même</button></div>`);
  } else {
    SDB.delete('companies',id);
    saToast('Société supprimée','danger');
    saNavigate('companies');
  }
}

function confirmDeleteCompany(id){
  SDB.delete('companies',id);
  const users=SDB.getAll('users').filter(u=>u.company_id!==id);
  SDB.set('users',users);
  saToast('Société et données supprimées','danger');
  saNavigate('companies');
}

// ===== SA USERS =====
function saUsers(){
  const users=SDB.getAll('users').filter(u=>u.role!=='super_admin');
  const companies=SDB.getAll('companies');
  return `
  <div style="margin-bottom:20px"><h2 style="font-size:20px;font-weight:700">Tous les utilisateurs</h2><p style="color:var(--text-secondary);font-size:13px">${users.length} utilisateur(s)</p></div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Nom</th><th>Email</th><th>Société</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
      ${users.length===0?`<tr><td colspan="6"><div class="empty-state" style="padding:40px"><div class="icon">👥</div><h3>Aucun utilisateur</h3></div></td></tr>`:
      users.map(u=>{
        const co=companies.find(c=>c.id===u.company_id);
        return `<tr>
          <td><div style="display:flex;align-items:center;gap:8px"><div class="user-avatar" style="width:28px;height:28px;font-size:11px">${u.name.charAt(0)}</div><span style="font-weight:600">${u.name}</span></div></td>
          <td style="color:var(--text-secondary)">${u.email}</td>
          <td>${co?`<span class="badge badge-info">${co.name}</span>`:'<span class="badge badge-secondary">–</span>'}</td>
          <td><span class="badge ${u.role==='admin'?'badge-purple':'badge-info'}">${u.role}</span></td>
          <td><span class="badge ${u.status==='active'?'badge-success':'badge-danger'}">${u.status==='active'?'Actif':'Inactif'}</span></td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="toggleSAUserStatus('${u.id}','${u.status}')"><i class="fas fa-${u.status==='active'?'ban':'check'}" style="color:${u.status==='active'?'#dc2626':'#16a34a'}"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="deleteSAUser('${u.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>`;
}

function toggleSAUserStatus(id,current){
  SDB.update('users',id,{status:current==='active'?'inactive':'active'});
  saToast('Utilisateur mis à jour','success');saNavigate('users');
}

function deleteSAUser(id){
  SDB.delete('users',id);saToast('Utilisateur supprimé','danger');saNavigate('users');
}

// ===== SA SUBSCRIPTIONS =====
function saSubscriptions(){
  const companies=SDB.getAll('companies');
  const planRev={basic:50,pro:100,business:300};
  const mrr=companies.filter(c=>c.status==='active').reduce((s,c)=>s+(planRev[c.plan]||0),0);
  return `
  <div style="margin-bottom:24px">
    <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">Abonnements</h2>
    <p style="color:var(--text-secondary);font-size:13px">MRR estimé : <strong style="color:#16a34a">${fmt(mrr)}</strong></p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:32px">
    ${['basic','pro','business'].map(plan=>{
      const configs={
        basic:{label:'Basic',price:50,maxUsers:1,color:'#64748b',icon:'fa-seedling',features:['1 utilisateur','Modules de base','Support email']},
        pro:{label:'Pro',price:100,maxUsers:4,color:'#2563eb',icon:'fa-rocket',features:['4 utilisateurs','Tous les modules','Support prioritaire']},
        business:{label:'Business',price:300,maxUsers:10,color:'#7c3aed',icon:'fa-crown',features:['10 utilisateurs','Multi-chantiers','Support dédié']}
      };
      const cfg=configs[plan];
      const count=companies.filter(c=>c.plan===plan&&c.status==='active').length;
      const rev=count*cfg.price;
      return `
      <div class="plan-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div style="width:40px;height:40px;border-radius:10px;background:${cfg.color}20;display:flex;align-items:center;justify-content:center">
            <i class="fas ${cfg.icon}" style="color:${cfg.color}"></i>
          </div>
          <div>
            <div style="font-size:18px;font-weight:800;color:${cfg.color}">${cfg.label}</div>
            <div style="font-size:14px;font-weight:700">${cfg.price} DH/mois</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:var(--bg-main);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:${cfg.color}">${count}</div>
            <div style="font-size:11px;color:var(--text-secondary)">Sociétés</div>
          </div>
          <div style="background:var(--bg-main);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:#16a34a">${fmt(rev)}</div>
            <div style="font-size:11px;color:var(--text-secondary)">Revenus/mois</div>
          </div>
        </div>
        <ul style="list-style:none;text-align:left;font-size:13px;color:var(--text-secondary)">
          <li><i class="fas fa-users" style="color:${cfg.color};margin-right:6px"></i>Max. ${cfg.maxUsers} utilisateur(s)</li>
          ${cfg.features.map(f=>`<li style="margin-top:4px"><i class="fas fa-check" style="color:#16a34a;margin-right:6px"></i>${f}</li>`).join('')}
        </ul>
      </div>`;
    }).join('')}
  </div>
  <div class="card">
    <h3 style="font-weight:700;margin-bottom:16px"><i class="fas fa-table" style="margin-right:8px;color:#2563eb"></i>Détail par société</h3>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Société</th><th>Plan actuel</th><th>Revenu mensuel</th><th>Statut</th><th>Changer plan</th></tr></thead>
        <tbody>
        ${companies.map(co=>`
          <tr>
            <td style="font-weight:600">${co.name}</td>
            <td><span class="badge ${co.plan==='business'?'badge-purple':co.plan==='pro'?'badge-info':'badge-secondary'}">${co.plan}</span></td>
            <td style="font-weight:700;color:#16a34a">${co.status==='active'?fmt(planRev[co.plan]||0):'0 DH (suspendu)'}</td>
            <td><span class="badge ${co.status==='active'?'badge-success':'badge-danger'}">${co.status==='active'?'Active':'Suspendue'}</span></td>
            <td>
              <select class="form-select" style="width:auto;padding:4px 8px;font-size:12px" onchange="updateCompanyPlan('${co.id}',this.value)">
                <option value="basic" ${co.plan==='basic'?'selected':''}>Basic</option>
                <option value="pro" ${co.plan==='pro'?'selected':''}>Pro</option>
                <option value="business" ${co.plan==='business'?'selected':''}>Business</option>
              </select>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ===== SA STATS =====
function saStats(){
  const companies=SDB.getAll('companies');
  const users=SDB.getAll('users').filter(u=>u.role!=='super_admin');
  const chantiers=SDB.getAll('chantiers');
  const factures=SDB.getAll('factures');
  const clients=SDB.getAll('clients');
  const paiements=SDB.getAll('paiements');
  const totalCA=factures.filter(f=>f.statut==='paye').reduce((s,f)=>s+f.montant_ttc,0);
  const totalEntrees=paiements.filter(p=>p.type==='entree').reduce((s,p)=>s+p.montant,0);
  return `
  <div style="margin-bottom:20px"><h2 style="font-size:20px;font-weight:700">Statistiques globales</h2></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
    <div class="stat-card"><div class="stat-icon" style="background:rgba(37,99,235,0.1)"><i class="fas fa-building" style="color:#2563eb"></i></div>
      <div class="stat-info"><div class="stat-label">Sociétés</div><div class="stat-value">${companies.length}</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(22,163,74,0.1)"><i class="fas fa-hard-hat" style="color:#16a34a"></i></div>
      <div class="stat-info"><div class="stat-label">Chantiers totaux</div><div class="stat-value">${chantiers.length}</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(124,58,237,0.1)"><i class="fas fa-file-invoice-dollar" style="color:#7c3aed"></i></div>
      <div class="stat-info"><div class="stat-label">CA total platform</div><div class="stat-value" style="font-size:18px">${fmt(totalCA)}</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:rgba(217,119,6,0.1)"><i class="fas fa-users" style="color:#d97706"></i></div>
      <div class="stat-info"><div class="stat-label">Clients totaux</div><div class="stat-value">${clients.length}</div></div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div class="card">
      <h3 style="font-weight:700;margin-bottom:16px">Par société</h3>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Société</th><th>Chantiers</th><th>Clients</th><th>Factures</th></tr></thead>
          <tbody>
          ${companies.map(co=>{
            const ch=chantiers.filter(x=>x.company_id===co.id).length;
            const cl=clients.filter(x=>x.company_id===co.id).length;
            const fa=factures.filter(x=>x.company_id===co.id).length;
            return `<tr><td style="font-weight:600">${co.name}</td><td>${ch}</td><td>${cl}</td><td>${fa}</td></tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h3 style="font-weight:700;margin-bottom:16px">Activité plateforme</h3>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${[
          ['Chantiers actifs', chantiers.filter(c=>c.statut==='en_cours').length, 'fa-spinner','#2563eb'],
          ['Chantiers terminés', chantiers.filter(c=>c.statut==='termine').length, 'fa-check-circle','#16a34a'],
          ['Factures payées', factures.filter(f=>f.statut==='paye').length, 'fa-money-bill-wave','#16a34a'],
          ['Factures impayées', factures.filter(f=>f.statut==='non_paye').length, 'fa-exclamation-circle','#dc2626'],
          ['Total utilisateurs actifs', users.filter(u=>u.status==='active').length, 'fa-user-check','#7c3aed'],
        ].map(([label,val,icon,color])=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-main);border-radius:8px">
            <i class="fas ${icon}" style="color:${color};width:18px;text-align:center"></i>
            <span style="flex:1;font-size:14px">${label}</span>
            <span style="font-weight:700;color:${color}">${val}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded',()=>{
  setTheme(SA.theme);
  renderSA();
  document.addEventListener('submit',e=>{
    if(e.target.id==='sa-login-form'){
      e.preventDefault();
      const email=document.getElementById('sa-email').value;
      const pass=document.getElementById('sa-pass').value;
      if(saLogin(email,pass)) renderSA();
      else document.getElementById('sa-error').style.display='block';
    }
  });
});
