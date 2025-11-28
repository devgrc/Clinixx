/* --- CONFIGURAÇÃO E ESTADO GLOBAL --- */
const S = {
  hamburger: '#hamburger',
  nav: '#nav',
};
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Estado Global (Banco de Dados Local)
const State = {
  get() {
    const raw = localStorage.getItem('clinix_db');
    let data;
    
    if (!raw) {
      // Dados Iniciais (Se estiver vazio)
      data = {
        appointments: [
          { id: 1, specialty: 'Cardiologia', doctor: 'Dra. Ana Silva', date: '15 de Julho, 2024', time: '10:00', location: 'Clinix Central', status: 'agendada' }
        ],
        notifications: [], // Começa vazio
        profile: { name: 'Sofia Carvalho', email: 'sofia.carvalho@email.com' }
      };
    } else {
      data = JSON.parse(raw);
      // CORREÇÃO: Garante que as notificações existam mesmo em dados antigos
      if (!data.notifications) data.notifications = [];
      if (!data.profile) data.profile = { name: 'Sofia Carvalho' };
    }
    return data;
  },
  save(data) {
    localStorage.setItem('clinix_db', JSON.stringify(data));
  },
  
  // --- AÇÕES DE CONSULTAS ---
  addAppointment(appt) {
    const db = this.get();
    // Garante que a lista de agendamentos exista
    if (!db.appointments) db.appointments = [];
    
    db.appointments.unshift(appt);
    this.save(db);
    
    // GERA NOTIFICAÇÃO
    this.addNotification({
      title: 'Consulta Agendada',
      desc: `Sua consulta de ${appt.specialty} com ${appt.doctor} foi confirmada para ${appt.date} às ${appt.time}.`,
      type: 'agenda',
      link: 'consultas.html'
    });
  },
  
  cancelAppointment(id) {
    const db = this.get();
    const index = db.appointments.findIndex(a => a.id == id);
    if (index > -1) {
      db.appointments[index].status = 'cancelada';
      this.save(db);
      
      this.addNotification({
        title: 'Consulta Cancelada',
        desc: `A consulta de ${db.appointments[index].specialty} foi cancelada com sucesso.`,
        type: 'alert',
        link: 'consultas.html'
      });
    }
  },

  // --- AÇÕES DE NOTIFICAÇÃO ---
  addNotification(notif) {
    const db = this.get();
    // Segurança extra: cria array se não existir
    if (!db.notifications) db.notifications = [];
    
    const newNotif = {
      id: Date.now() + Math.random(), // ID único garantido
      title: notif.title,
      desc: notif.desc,
      date: new Date().toISOString(),
      type: notif.type || 'system',
      read: false,
      link: notif.link || '#'
    };
    db.notifications.unshift(newNotif);
    this.save(db);
  },
  
  markAllNotificationsRead() {
    const db = this.get();
    if(db.notifications) {
      db.notifications.forEach(n => n.read = true);
      this.save(db);
    }
  },
  
  // --- AÇÕES DE PERFIL ---
  updateProfile(profileData) {
    const db = this.get();
    db.profile = { ...db.profile, ...profileData };
    this.save(db);

    this.addNotification({
      title: 'Perfil Atualizado',
      desc: 'Suas informações pessoais foram alteradas com sucesso.',
      type: 'success',
      link: 'perfil.html'
    });
  }
};

/* --- FUNÇÕES GERAIS --- */
function initNav() {
  const btn = $(S.hamburger);
  const nav = $(S.nav);
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('is-open');
    });
  }
}

/* --- LÓGICA DE AGENDAMENTO --- */
function initAgendar() {
  const container = document.querySelector('.calendar-container');
  if (!container) return; 

  // Dados de médicos
  const doctorsData = {
    'Cardiologia': ['Dr. Lucas Pereira', 'Dra. Amanda Oliveira', 'Dr. Roberto Santos'],
    'Dermatologia': ['Dra. Ana Silva', 'Dr. Bruno Costa', 'Dra. Carla Dias'],
    'Ortopedia': ['Dr. Rafael Almeida', 'Dra. Fernanda Lima', 'Dr. Eduardo Lima'],
    'Nutrição': ['Dr. João Osvaldo', 'Dra. Patrícia Rocha'],
    'Ginecologia': ['Dra. Diana Pereira', 'Dra. Camila Martins', 'Dr. Paulo Ricardo']
  };

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  let currentDate = new Date();
  let selectedDateObj = null;
  let selectedTime = null;

  const monthText = $('#calendar-month-year');
  const daysGrid = $('#calendar-days');
  const prevBtn = $('#prev-month');
  const nextBtn = $('#next-month');
  
  const inputs = {
    spec: $('#select-specialty'),
    doc: $('#input-doctor'), 
    reason: $('#input-reason'),
    calendarContainer: $('.calendar-container'),
    timeContainer: $('#time-slots')
  };

  const summary = {
    spec: $('#summary-spec'),
    doc: $('#summary-doc'),
    date: $('#summary-date'),
    time: $('#summary-time')
  };

  function clearErrors() {
    inputs.spec.classList.remove('input-error');
    inputs.doc.classList.remove('input-error');
    inputs.reason.classList.remove('input-error');
    inputs.calendarContainer.classList.remove('container-error');
    inputs.timeContainer.classList.remove('container-error');
  }

  // Preenche médicos ao mudar especialidade
  inputs.spec.addEventListener('change', () => {
    const specialty = inputs.spec.value;
    const doctors = doctorsData[specialty] || [];
    inputs.doc.innerHTML = '<option value="" disabled selected>Selecione o Médico</option>';
    doctors.forEach(docName => {
      const option = document.createElement('option');
      option.value = docName;
      option.textContent = docName;
      inputs.doc.appendChild(option);
    });
    inputs.doc.disabled = false;
    inputs.doc.dispatchEvent(new Event('change'));
    inputs.spec.classList.remove('input-error');
  });

  function renderCalendar() {
    currentDate.setDate(1);
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    monthText.textContent = `${months[month]} ${year}`;
    daysGrid.innerHTML = '';

    const firstDayIndex = currentDate.getDay();
    const lastDayInfo = new Date(year, month + 1, 0);
    const totalDays = lastDayInfo.getDate();

    for (let x = 0; x < firstDayIndex; x++) {
      const div = document.createElement('div');
      div.classList.add('calendar-day', 'empty');
      daysGrid.appendChild(div);
    }

    const today = new Date();
    for (let i = 1; i <= totalDays; i++) {
      const dayDiv = document.createElement('div');
      dayDiv.textContent = i;
      dayDiv.classList.add('calendar-day');
      const checkDate = new Date(year, month, i);
      checkDate.setHours(0,0,0,0);
      const todayZero = new Date();
      todayZero.setHours(0,0,0,0);

      if (checkDate < todayZero) {
        dayDiv.classList.add('disabled');
      } else {
        dayDiv.addEventListener('click', () => {
          $$('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
          dayDiv.classList.add('selected');
          selectedDateObj = new Date(year, month, i);
          inputs.calendarContainer.classList.remove('container-error');
          updateSummary();
        });
      }
      if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayDiv.classList.add('today');
      }
      daysGrid.appendChild(dayDiv);
    }
  }

  $$('.time-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      $$('.time-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedTime = pill.textContent;
      inputs.timeContainer.classList.remove('container-error');
      updateSummary();
    });
  });

  function updateSummary() {
    summary.spec.textContent = inputs.spec.value || '—';
    summary.doc.textContent = inputs.doc.value || '—';
    if (selectedDateObj) {
      const d = selectedDateObj.getDate();
      const m = months[selectedDateObj.getMonth()];
      const y = selectedDateObj.getFullYear();
      summary.date.textContent = `${d} de ${m}, ${y}`;
    } else {
      summary.date.textContent = '—';
    }
    summary.time.textContent = selectedTime || '—';
  }

  inputs.doc.addEventListener('change', () => {
    updateSummary();
    inputs.doc.classList.remove('input-error');
  });
  inputs.reason.addEventListener('input', () => {
    inputs.reason.classList.remove('input-error');
  });

  $('#prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
  $('#next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

  // BOTÃO CONFIRMAR
  $('#btn-confirm').addEventListener('click', () => {
    clearErrors(); 
    let isValid = true;
    if (!inputs.spec.value) { inputs.spec.classList.add('input-error'); isValid = false; }
    if (!inputs.doc.value) { inputs.doc.classList.add('input-error'); isValid = false; }
    if (!selectedDateObj) { inputs.calendarContainer.classList.add('container-error'); isValid = false; }
    if (!selectedTime) { inputs.timeContainer.classList.add('container-error'); isValid = false; }
    if (!inputs.reason.value.trim()) { inputs.reason.classList.add('input-error'); isValid = false; }

    if (!isValid) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const m = months[selectedDateObj.getMonth()];
    const formattedDate = `${selectedDateObj.getDate()} de ${m}, ${selectedDateObj.getFullYear()}`;

    const newAppt = {
      id: Date.now(),
      specialty: inputs.spec.value,
      doctor: inputs.doc.value,
      date: formattedDate,
      time: selectedTime,
      location: 'Clinix Central',
      status: 'agendada'
    };

    // Tenta salvar e notificar
    try {
      State.addAppointment(newAppt);
      // ALERTA DE SUCESSO AQUI
      alert('Consulta agendada com sucesso! Você recebeu uma notificação.');
      window.location.href = 'consultas.html';
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar. Tente limpar o cache do navegador.');
    }
  });

  renderCalendar();
}

/* --- LÓGICA DE PERFIL --- */
function initPerfil() {
  const form = document.querySelector('.profile-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('input[type="text"]').value;
    State.updateProfile({ name: name });
    alert('Perfil atualizado com sucesso! Você recebeu uma notificação.');
  });
}

/* --- LÓGICA DE NOTIFICAÇÕES --- */
function initNotifications() {
  const container = $('#notifications-container');
  if (!container) return;

  const db = State.get();
  const pills = $$('.filter-pill');
  const btnMark = $('#btn-mark-read');
  let currentFilter = 'all';

  function render() {
    container.innerHTML = '';
    const dbNow = State.get(); 
    let list = dbNow.notifications || []; // Garante array

    if (currentFilter === 'unread') list = list.filter(n => !n.read);
    else if (currentFilter === 'agenda') list = list.filter(n => n.type === 'agenda');

    if (list.length === 0) {
      container.innerHTML = '<p class="muted" style="text-align:center; padding:20px;">Nenhuma notificação encontrada.</p>';
      return;
    }

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let groups = { 'Hoje': [], 'Ontem': [], 'Antigas': [] };

    list.forEach(notif => {
      const d = new Date(notif.date).toDateString();
      if (d === today) groups['Hoje'].push(notif);
      else if (d === yesterday) groups['Ontem'].push(notif);
      else groups['Antigas'].push(notif);
    });

    for (const [groupName, items] of Object.entries(groups)) {
      if (items.length > 0) {
        container.innerHTML += `<div class="date-divider">${groupName}</div>`;
        items.forEach(notif => {
          container.innerHTML += createNotificationHTML(notif);
        });
      }
    }
  }

  function createNotificationHTML(notif) {
    let iconHTML = '', iconClass = 'icon-blue';
    if (notif.type === 'agenda') {
      iconClass = 'icon-green';
      iconHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
    } else if (notif.type === 'success') {
      iconClass = 'icon-gray';
      iconHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (notif.type === 'alert') {
      iconClass = 'icon-orange';
      iconHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else { 
      iconClass = 'icon-blue';
      iconHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    const dateObj = new Date(notif.date);
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="notification-item ${notif.read ? '' : 'unread'}">
        <div class="notif-icon-box ${iconClass}">${iconHTML}</div>
        <div class="notif-content">
          <div class="notif-title">${notif.title}</div>
          <div class="notif-desc">${notif.desc}</div>
          <div class="notif-time">${timeStr}</div>
          ${notif.link !== '#' ? `<a href="${notif.link}" class="notif-action-link">Ver Detalhes</a>` : ''}
        </div>
      </div>
    `;
  }

  pills.forEach(btn => {
    btn.addEventListener('click', () => {
      pills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      render();
    });
  });

  btnMark.addEventListener('click', () => {
    State.markAllNotificationsRead();
    render();
  });

  render();
}

/* --- RENDERIZAÇÃO DAS LISTAS DE CONSULTA --- */
function renderAppointmentList() {
  const db = State.get();
  const listAgendada = $('#list-agendada');
  const listConcluida = $('#list-concluida');
  const listCancelada = $('#list-cancelada');
  const simpleList = $('.clean-list');

  const filterDate = $('#filter-date') ? $('#filter-date').value : '';
  const filterStatus = $('#filter-status') ? $('#filter-status').value : '';
  const filterSpec = $('#filter-spec') ? $('#filter-spec').value : '';

  let filtered = db.appointments || [];
  if (filterDate) filtered = filtered.filter(a => a.date === filterDate);
  if (filterStatus) filtered = filtered.filter(a => a.status === filterStatus);
  if (filterSpec) filtered = filtered.filter(a => a.specialty === filterSpec);

  if (listAgendada && listConcluida && listCancelada) {
    listAgendada.innerHTML = ''; listConcluida.innerHTML = ''; listCancelada.innerHTML = '';
    let hA=0, hC=0, hCan=0;
    filtered.forEach(appt => {
      const card = createCardHTML(appt);
      if(appt.status==='agendada'){ listAgendada.innerHTML+=card; hA++; }
      else if(appt.status==='concluida'){ listConcluida.innerHTML+=card; hC++; }
      else if(appt.status==='cancelada'){ listCancelada.innerHTML+=card; hCan++; }
    });
    if(!hA) listAgendada.innerHTML='<p class="muted">Nenhuma consulta agendada encontrada.</p>';
    if(!hC) listConcluida.innerHTML='<p class="muted">Nenhuma consulta concluída encontrada.</p>';
    if(!hCan) listCancelada.innerHTML='<p class="muted">Nenhuma consulta cancelada encontrada.</p>';
  } else if (simpleList && !window.location.pathname.includes('historico') && !window.location.pathname.includes('agendar')) {
    simpleList.innerHTML = '';
    const upcoming = (db.appointments || []).slice(0, 3);
    if(upcoming.length===0) simpleList.innerHTML='<p class="muted">Nenhuma atividade recente.</p>';
    else upcoming.forEach(a => simpleList.innerHTML+=createCardHTML(a));
  }
}

function createCardHTML(appt) {
  let badge='agendada', txt='Agendada';
  if(appt.status==='concluida'){ badge='concluida'; txt='Concluída'; }
  else if(appt.status==='cancelada'){ badge='cancelada'; txt='Cancelada'; }
  
  let btns = appt.status==='agendada' 
    ? `<button class="btn-card-cancel js-cancel-btn" data-id="${appt.id}">Cancelar</button><a class="btn-card-action" href="agendar.html">Reagendar</a>`
    : `<a class="btn-card-action" href="agendar.html">Reagendar</a>`;
    
  return `<div class="appointment-card"><div class="appt-card-header"><div class="appt-card-specialty">${appt.specialty}</div><span class="status-badge ${badge}">${txt}</span></div><div class="appt-card-body"><div class="appt-info-row"><svg class="appt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span>${appt.doctor}</span></div><div class="appt-info-row"><svg class="appt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span>${appt.date} • ${appt.time}</span></div><div class="appt-info-row"><svg class="appt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span>${appt.location}</span></div></div><div class="appt-card-footer">${btns}</div></div>`;
}

/* --- CLICK GLOBAL --- */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('js-cancel-btn')) {
    if(confirm("Tem certeza que deseja cancelar?")) {
      State.cancelAppointment(e.target.getAttribute('data-id'));
      renderAppointmentList();
    }
  }
});

/* --- INICIALIZAÇÃO --- */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initAgendar();
  initPerfil();
  initNotifications();
  
  const fDate=$('#filter-date');
  if(fDate) {
    const db=State.get();
    [...new Set((db.appointments||[]).map(a=>a.date))].forEach(d=>{let o=document.createElement('option');o.value=d;o.textContent=d;fDate.appendChild(o)});
    [...new Set((db.appointments||[]).map(a=>a.specialty))].forEach(s=>{let o=document.createElement('option');o.value=s;o.textContent=s;$('#filter-spec').appendChild(o)});
    $('#filter-date').addEventListener('change', renderAppointmentList);
    $('#filter-status').addEventListener('change', renderAppointmentList);
    $('#filter-spec').addEventListener('change', renderAppointmentList);
  }
  
  renderAppointmentList();
});