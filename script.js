/* ============================================================
   LIDERAZGO EN CADENA — "Nadie gana solo."
   Lógica completa: jugadores, organizador, turnos, tiempo y ranking.
   Sincronización en tiempo real con Firebase Realtime Database
   (o modo prueba local si no hay credenciales).
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     0. CONFIGURACIÓN
  ------------------------------------------------------------ */
  const CFG = Object.assign({
    teamsCount: 10, maxPlayers: 6, minPlayers: 2, timeLimitMinutes: 15,
    countdownSeconds: 5, organizerPassword: 'liderazgo2026',
    showChallengeToTeammates: false, firebase: {}
  }, window.LEC_CONFIG || {});

  const TOTAL = 12;                              // retos por equipo
  const LIMIT_MS = CFG.timeLimitMinutes * 60000; // tiempo máximo
  const COUNTDOWN_MS = CFG.countdownSeconds * 1000;

  const MESSAGES = [
    'Nadie gana solo.',
    'Escucha a tu equipo.',
    'Un buen líder también sabe escuchar.',
    'Tu compañero necesita tu ayuda.',
    'Comunicar también es liderar.',
    'Cada integrante es importante.',
    'El éxito individual depende del equipo.'
  ];

  /* ------------------------------------------------------------
     1. LOS 12 RETOS
     (kind: text | choice | match). Las respuestas se comparan
     normalizadas (sin tildes, mayúsculas ni espacios).
  ------------------------------------------------------------ */
  const CHALLENGES = [
    { type: '🧩 Adivina por la descripción', kind: 'text',
      prompt: '¿Qué palabra se describe aquí?',
      big: '“Capacidad de comprender cómo se siente otra persona.”',
      answers: ['empatia'] },

    { type: '🔀 Palabra desordenada', kind: 'text',
      prompt: 'Ordena las letras para formar la palabra:',
      big: 'R A Z G O L I D E',
      hint: 'Pista: es lo que hace quien guía e inspira al grupo.',
      answers: ['liderazgo'] },

    { type: '😀 Adivina con emojis', kind: 'text',
      prompt: '¿Qué palabra representan estos emojis?',
      big: '👥 🤝 🎯',
      hint: 'Pista: varias personas unidas por una misma meta.',
      answers: ['equipo'] },

    { type: '✏️ Completa la palabra', kind: 'text',
      prompt: 'Completa la palabra a la que le faltan letras:',
      big: 'C _ N F _ A N Z A',
      hint: 'Pista: seguridad que sentimos hacia los demás.',
      answers: ['confianza'] },

    { type: '🔎 Mini sopa de letras', kind: 'text',
      prompt: 'Hay una palabra escondida en línea recta (puede ir en diagonal). Encuéntrenla y escríbela.',
      grid: [
        ['U','K','M','P','T','S'],
        ['R','N','B','L','O','C'],
        ['E','V','I','A','F','Y'],
        ['G','H','J','D','X','Q'],
        ['W','Z','P','S','A','B'],
        ['T','M','C','L','E','D']
      ],
      hint: 'Pista: significa estar juntos como uno solo.',
      answers: ['unidad'] },

    { type: '🕵️ Adivina el concepto', kind: 'text',
      prompt: '¿De qué concepto se trata?',
      lines: [
        'Es necesaria para que dos personas se entiendan.',
        'Incluye hablar, escribir y hasta los gestos.',
        'Sin ella, los equipos se confunden y se pelean.'
      ],
      answers: ['comunicacion'] },

    { type: '✅ Selecciona la palabra correcta', kind: 'choice',
      prompt: 'Cuando todos aportan ideas y esfuerzo para lograr una misma meta, están trabajando en ______.',
      options: ['Rivalidad', 'Colaboración', 'Aislamiento', 'Competencia'],
      answers: ['colaboracion'] },

    { type: '🔗 Relaciona definición y palabra', kind: 'match',
      prompt: 'Une cada definición con su palabra.',
      pairs: [
        { def: 'Imaginar ideas nuevas y originales.', answer: 'Creatividad' },
        { def: 'Actuar juntos, ayudándose, para un fin común.', answer: 'Cooperación' },
        { def: 'Decir la verdad aunque cueste.', answer: 'Honestidad' }
      ],
      options: ['Cooperación', 'Honestidad', 'Creatividad'] },

    { type: '🫣 Palabra escondida', kind: 'text',
      prompt: 'Dentro de esta cadena de letras se esconde una palabra. ¿Cuál es?',
      big: 'Q M B R E S P E T O K L Z',
      hint: 'Pista: valorar a los demás aunque piensen distinto.',
      answers: ['respeto'] },

    { type: '💡 Tres pistas', kind: 'text',
      prompt: '¿Cuál es la palabra?',
      lines: [
        'Pista 1: Tenemos dos orejas y solo una boca.',
        'Pista 2: Es mucho más que oír: es prestar atención de verdad.',
        'Pista 3: Un buen líder la practica antes de hablar.'
      ],
      answers: ['escucha'] },

    { type: '🧠 Completa la frase', kind: 'text',
      prompt: 'Completa la frase:',
      big: '“Un buen líder mantiene al equipo con energía y ganas de lograr la meta. A esa energía se le llama ________.”',
      hint: 'Pista: empieza con M.',
      answers: ['motivacion'] },

    { type: '🏁 Reto final', kind: 'text',
      prompt: 'Completa el lema de esta actividad (tres palabras):',
      big: 'N _ _ _ _ _   G _ _ _   S _ _ _',
      hint: 'Pista: es lo que debe recordar todo buen equipo.',
      answers: ['nadie gana solo'] }
  ];

  /* ------------------------------------------------------------
     2. UTILIDADES
  ------------------------------------------------------------ */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // Normaliza: minúsculas, sin tildes, sin espacios ni signos.
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const pad = n => String(n).padStart(2, '0');
  function fmt(ms, ceil) {
    const s = Math.max(0, ceil ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }
  const $ = id => document.getElementById(id);
  const MEDALS = ['🥇', '🥈', '🥉'];

  function safeGet(st, k) { try { return st.getItem(k); } catch (e) { return null; } }
  function safeSet(st, k, v) { try { st.setItem(k, v); } catch (e) { /* ignorar */ } }
  function safeDel(st, k) { try { st.removeItem(k); } catch (e) { /* ignorar */ } }

  /* ------------------------------------------------------------
     3. CAPA DE BASE DE DATOS (Firebase o local)
     Todo el estado vive en "game". Las operaciones de escritura
     son transacciones, así dos celulares nunca se pisan.
  ------------------------------------------------------------ */
  function firebaseConfigured() {
    const f = CFG.firebase || {};
    return !!(f.apiKey && f.databaseURL && !/PEGA_AQUI/.test(f.apiKey + f.databaseURL) && window.firebase);
  }

  function createFirebaseDb(onError) {
    firebase.initializeApp(CFG.firebase);
    const database = firebase.database();
    let offset = 0;
    database.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
    const gameRef = database.ref('game');
    let connHandler = null;
    return {
      mode: 'firebase',
      now: () => Date.now() + offset,
      subscribe(cb) { gameRef.on('value', s => cb(s.val()), e => onError(e)); },
      tx(fn) {
        return gameRef.transaction(fn).then(r => ({ committed: r.committed }));
      },
      setPresence(pid) {
        const ref = database.ref('presence/' + pid);
        const conn = database.ref('.info/connected');
        connHandler = conn.on('value', s => {
          if (s.val() === true) { ref.onDisconnect().remove(); ref.set(true); }
        });
        this._conn = conn;
      },
      clearPresence(pid) {
        if (this._conn && connHandler) this._conn.off('value', connHandler);
        connHandler = null;
        database.ref('presence/' + pid).remove();
      },
      subscribePresence(cb) { database.ref('presence').on('value', s => cb(s.val() || {})); }
    };
  }

  function createLocalDb() {
    const KEY = 'lec_game', PKEY = 'lec_presence';
    const listeners = [];
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
    const readP = () => { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { return {}; } };
    const notify = () => { const v = read(); listeners.forEach(cb => cb(v)); };
    window.addEventListener('storage', e => { if (e.key === KEY) notify(); });
    let hb = null;
    return {
      mode: 'local',
      now: () => Date.now(),
      subscribe(cb) { listeners.push(cb); setTimeout(() => cb(read()), 0); },
      tx(fn) {
        const cur = read();
        const res = fn(cur === null ? null : JSON.parse(JSON.stringify(cur)));
        if (res === undefined) return Promise.resolve({ committed: false });
        localStorage.setItem(KEY, JSON.stringify(res));
        notify();
        return Promise.resolve({ committed: true });
      },
      setPresence(pid) {
        const beat = () => { const p = readP(); p[pid] = Date.now(); localStorage.setItem(PKEY, JSON.stringify(p)); };
        beat(); hb = setInterval(beat, 4000);
      },
      clearPresence(pid) {
        clearInterval(hb);
        const p = readP(); delete p[pid]; localStorage.setItem(PKEY, JSON.stringify(p));
      },
      subscribePresence(cb) {
        const emit = () => {
          const p = readP(), o = {};
          for (const k in p) if (Date.now() - p[k] < 10000) o[k] = true;
          cb(o);
        };
        setInterval(emit, 2000); emit();
      }
    };
  }

  /* ------------------------------------------------------------
     4. ESTADO DE LA APP
  ------------------------------------------------------------ */
  const S = {
    ready: false, error: null,
    game: null, online: {},
    pid: null, name: '',
    screen: 'welcome', pendingTeam: null,
    isOrg: false, orgTab: 'teams', qrUrl: '',
    busy: false, lastKey: null, presenceOn: false,
    prevStatus: null, notifiedTurn: -1
  };

  const db = firebaseConfigured()
    ? createFirebaseDb(e => { S.error = (e && e.message) || 'Error de conexión'; render(); })
    : createLocalDb();
  const store = db.mode === 'local' ? sessionStorage : localStorage; // en modo local, cada pestaña = un jugador

  S.pid = safeGet(store, 'lec_pid');
  S.name = safeGet(store, 'lec_name') || '';
  S.isOrg = safeGet(sessionStorage, 'lec_org') === '1';
  S.qrUrl = safeGet(localStorage, 'lec_qrurl') || (location.href.split('#')[0].split('?')[0]);
  S.game = normalize(null);

  function newPid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /* ------------------------------------------------------------
     5. MODELO DE DATOS
  ------------------------------------------------------------ */
  // Crudo (en la base): { status, startedAt, endedAt, limitMs, teams:{ t1:{players:{pid:{name,num,joinedAt}}, progress, finishedAt, lastProgressAt} } }
  function rawGame(cur) {
    const g = cur && typeof cur === 'object' ? cur : { status: 'lobby', limitMs: LIMIT_MS };
    if (!g.status) g.status = 'lobby';
    if (!g.teams) g.teams = {};
    return g;
  }

  function normalize(raw) {
    const g = raw && typeof raw === 'object' ? raw : {};
    const game = {
      status: g.status || 'lobby',
      startedAt: g.startedAt || 0,
      endedAt: g.endedAt || 0,
      limitMs: g.limitMs || LIMIT_MS,
      teams: {}
    };
    for (let i = 1; i <= CFG.teamsCount; i++) {
      const t = (g.teams && g.teams['t' + i]) || {};
      const players = Object.entries(t.players || {}).map(([id, p]) => ({
        id, name: p.name || '?', num: p.num || 0, joinedAt: p.joinedAt || 0
      })).sort((a, b) => a.num - b.num);
      game.teams[i] = {
        id: i, players, n: players.length,
        progress: t.progress || 0,
        finishedAt: t.finishedAt || 0,
        lastProgressAt: t.lastProgressAt || 0
      };
    }
    return game;
  }

  const teamList = () => Object.values(S.game.teams);

  function findMe() {
    if (!S.pid) return null;
    for (const t of teamList()) {
      const p = t.players.find(x => x.id === S.pid);
      if (p) return { team: t, player: p };
    }
    return null;
  }

  // Quién tiene el turno: el reto #(progress+1) lo resuelve el jugador (progress mod n)+1
  function turnNumber(team) { return team.n ? (team.progress % team.n) + 1 : 0; }

  // Estado derivado de un equipo (depende del reloj)
  function teamInfo(t, g, now) {
    if (g.status === 'lobby') return { state: t.n >= CFG.minPlayers ? 'ready' : 'waiting', elapsed: 0 };
    const lim = g.limitMs;
    let state, end;
    if (t.finishedAt) { state = 'finished'; end = t.finishedAt; }
    else if (g.status === 'ended' && g.endedAt) {
      end = g.endedAt; state = (end - g.startedAt >= lim) ? 'timeout' : 'stopped';
    }
    else if (now - g.startedAt >= lim) { state = 'timeout'; end = g.startedAt + lim; }
    else if (now < g.startedAt) { state = 'countdown'; end = g.startedAt; }
    else { state = 'playing'; end = now; }
    const cap = state === 'finished' ? Infinity : lim;
    return { state, elapsed: Math.max(0, Math.min(end - g.startedAt, cap)) };
  }

  // Clasificación: 1º retos completados (más es mejor), 2º menor tiempo
  // (tiempo en el que lograron su último reto; equipos sin avance al final).
  function ranking(now) {
    const g = S.game;
    if (g.status === 'lobby') return [];
    const rows = teamList().filter(t => t.n > 0).map(t => {
      const info = teamInfo(t, g, now);
      const tie = t.progress > 0 ? Math.max(0, (t.lastProgressAt || g.startedAt) - g.startedAt) : Infinity;
      return { team: t, info, progress: t.progress, time: info.elapsed, tie };
    });
    rows.sort((a, b) => (b.progress - a.progress) || (a.tie - b.tie) || (a.team.id - b.team.id));
    rows.forEach((r, i) => { r.pos = i + 1; });
    return rows;
  }

  function allDone(now) {
    const g = S.game;
    if (g.status === 'lobby') return false;
    const act = teamList().filter(t => t.n > 0);
    if (!act.length) return false;
    return act.every(t => ['finished', 'timeout', 'stopped'].includes(teamInfo(t, g, now).state));
  }
  const showFinal = now => S.game.status === 'ended' || allDone(now);

  /* ------------------------------------------------------------
     6. ACCIONES (escrituras en la base)
  ------------------------------------------------------------ */
  async function joinTeam(teamId) {
    let err = null;
    const name = S.name.trim().slice(0, 20);
    const pid = S.pid || newPid();
    const res = await db.tx(cur => {
      err = null;
      const g = rawGame(cur);
      if (g.status !== 'lobby') { err = 'started'; return; }
      const key = 't' + teamId;
      if (!g.teams[key]) g.teams[key] = {};
      const t = g.teams[key];
      if (!t.players) t.players = {};
      if (t.players[pid]) return g;               // ya estaba dentro
      const ids = Object.keys(t.players);
      if (ids.length >= CFG.maxPlayers) { err = 'full'; return; }
      t.players[pid] = { name, num: ids.length + 1, joinedAt: db.now() };
      return g;
    });
    if (res.committed) {
      S.pid = pid;
      S.screen = 'welcome';
      safeSet(store, 'lec_pid', pid);
      safeSet(store, 'lec_name', name);
      return { ok: true };
    }
    return { ok: false, err: err || 'unknown' };
  }

  async function leaveTeam() {
    const me = findMe();
    if (!me) return;
    const pid = S.pid;
    await db.tx(cur => {
      const g = rawGame(cur);
      if (g.status !== 'lobby') return;
      const t = g.teams['t' + me.team.id];
      if (!t || !t.players || !t.players[pid]) return;
      delete t.players[pid];
      // Renumerar para que los números de jugador sean consecutivos
      Object.entries(t.players).sort((a, b) => a[1].num - b[1].num).forEach(([, p], i) => { p.num = i + 1; });
      return g;
    });
    if (S.presenceOn) { db.clearPresence(pid); S.presenceOn = false; }
    S.screen = 'teams';
  }

  async function startActivity() {
    await db.tx(cur => {
      const g = rawGame(cur);
      if (g.status !== 'lobby') return;
      g.status = 'running';
      g.limitMs = LIMIT_MS;
      g.startedAt = db.now() + COUNTDOWN_MS;
      g.endedAt = 0;
      return g;
    });
  }
  async function endActivity() {
    await db.tx(cur => {
      const g = rawGame(cur);
      if (g.status !== 'running') return;
      g.status = 'ended';
      g.endedAt = db.now();
      return g;
    });
  }
  async function resetActivity() {
    await db.tx(() => ({ status: 'lobby', limitMs: LIMIT_MS, resetAt: db.now() }));
  }

  async function submitCorrect(teamId, expectedProgress) {
    let err = null;
    const pid = S.pid;
    const res = await db.tx(cur => {
      err = null;
      const g = rawGame(cur);
      const t = g.teams['t' + teamId];
      if (!t || !t.players || !t.players[pid]) { err = 'noteam'; return; }
      if (g.status !== 'running') { err = 'ended'; return; }
      const now = db.now();
      if (now < g.startedAt || now - g.startedAt >= g.limitMs) { err = 'time'; return; }
      if (t.finishedAt) { err = 'done'; return; }
      const prog = t.progress || 0;
      if (prog !== expectedProgress) { err = 'stale'; return; }
      const n = Object.keys(t.players).length;
      if ((prog % n) + 1 !== t.players[pid].num) { err = 'notturn'; return; }   // BLOQUEO DE TURNO
      t.progress = prog + 1;
      t.lastProgressAt = now;
      if (t.progress >= TOTAL) t.finishedAt = now;
      return g;
    });
    return { ok: res.committed, err };
  }

  /* ------------------------------------------------------------
     7. COMPONENTES VISUALES REUTILIZABLES
  ------------------------------------------------------------ */
  function logoHeader(small) {
    return h('div', { class: 'logo' },
      h('div', { class: 'chain' }, '🔗'),
      h('div', { class: 'l1' }, 'LIDERAZGO'),
      h('div', { class: 'l2' }, 'EN CADENA'),
      small ? null : h('div', { class: 'tag' }, '“Nadie gana solo.”'));
  }
  function localBadge() {
    return db.mode === 'local'
      ? h('div', { class: 'badge-local' }, '🧪 MODO PRUEBA LOCAL — solo funciona entre pestañas de este navegador')
      : null;
  }
  function wrap(cls, ...kids) {
    return h('div', { class: 'wrap ' + (cls || '') }, localBadge(), ...kids);
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  let overlayTimer = null;
  function showOverlay(cls, ico, title, sub, ms) {
    const o = $('overlay');
    o.replaceChildren(h('div', { class: 'ov-card ' + cls },
      h('div', { class: 'ov-ico' }, ico), h('div', { class: 'ov-title' }, title),
      sub ? h('div', { class: 'ov-sub' }, sub) : null));
    o.classList.add('show');
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => o.classList.remove('show'), ms);
  }

  function openModal(...kids) {
    const m = $('modal');
    m.replaceChildren(h('div', { class: 'modal' }, ...kids));
    m.classList.add('show');
  }
  function closeModal() { $('modal').classList.remove('show'); $('modal').replaceChildren(); }
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });

  function confirmModal(o) {
    openModal(
      h('h2', null, o.title),
      ...(o.lines || []).map(l => h('p', null, l)),
      o.extra || null,
      h('div', { class: 'row' },
        h('button', { class: 'btn ' + (o.danger ? 'btn-danger' : 'btn-primary'), onClick: async () => { closeModal(); await o.onOk(); } }, o.okLabel),
        h('button', { class: 'btn btn-ghost', onClick: closeModal }, 'CANCELAR')));
  }

  function confetti() {
    document.querySelectorAll('.confetti').forEach(n => n.remove());
    const c = h('div', { class: 'confetti' });
    const colors = ['#22d3ee', '#a855f7', '#fbbf24', '#22c55e', '#ffffff', '#f472b6'];
    for (let i = 0; i < 70; i++) {
      const p = h('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (2.5 + Math.random() * 3) + 's';
      p.style.animationDelay = (Math.random() * 1.2) + 's';
      p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      c.append(p);
    }
    document.body.append(c);
    setTimeout(() => c.remove(), 7500);
  }

  function rankingTable(rows, myTeamId) {
    if (!rows.length) return h('p', { class: 'sub' }, 'La clasificación aparecerá cuando comience la actividad.');
    return h('table', { class: 'table' },
      h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'EQUIPO'), h('th', { class: 'num' }, 'RETOS'), h('th', { class: 'num' }, 'TIEMPO'))),
      h('tbody', null, rows.map(r => h('tr', { class: r.team.id === myTeamId ? 'mine' : '' },
        h('td', { class: 'pos' }, r.pos <= 3 ? MEDALS[r.pos - 1] : r.pos + '.'),
        h('td', null, 'Equipo ' + r.team.id),
        h('td', { class: 'num' }, r.progress + '/' + TOTAL),
        h('td', { class: 'num' }, (r.info.state === 'finished' ? '' : (r.info.state === 'playing' ? '⏱️ ' : '⏰ ')),
          h('span', r.info.state === 'playing' ? { 'data-timer': 'team-elapsed', 'data-team': r.team.id } : null, fmt(r.time)))))));
  }

  function finalNode(now, myTeamId) {
    const rows = ranking(now);
    const box = h('div', { class: 'final' });
    box.append(h('h2', { class: 'big-title' }, '🏆 RESULTADOS FINALES'));
    const labels = ['🥇 PRIMER LUGAR', '🥈 SEGUNDO LUGAR', '🥉 TERCER LUGAR'];
    rows.slice(0, 3).forEach((r, i) => box.append(h('div', { class: 'podium p' + (i + 1) },
      h('div', { class: 'p-label' }, labels[i]),
      h('div', { class: 'p-team' }, 'EQUIPO ' + r.team.id),
      h('div', { class: 'p-score' }, r.progress + '/' + TOTAL),
      h('div', { class: 'p-time' }, '⏱️ ' + fmt(r.time)))));
    box.append(h('div', { class: 'card' }, h('h2', null, '🏆 CLASIFICACIÓN'), rankingTable(rows, myTeamId)));
    box.append(
      h('p', { class: 'closing' }, '¡Felicidades a todos los equipos!'),
      h('p', { class: 'closing sub' }, 'El verdadero objetivo no era llegar primero, sino demostrar que nadie gana solo.'));
    return box;
  }

  /* ---- Reto interactivo / solo lectura ---- */
  function buildChallenge(ch, interactive, onEnter) {
    const box = h('div', { class: 'challenge' });
    box.append(h('span', { class: 'ch-type' }, ch.type), h('p', { class: 'ch-prompt' }, ch.prompt));
    if (ch.big) box.append(h('div', { class: 'ch-big' }, ch.big));
    if (ch.grid) {
      const g = h('div', { class: 'ch-grid' });
      g.style.gridTemplateColumns = 'repeat(' + ch.grid[0].length + ',1fr)';
      ch.grid.forEach(row => row.forEach(c => g.append(h('span', null, c))));
      box.append(g);
    }
    if (ch.lines) box.append(h('ul', { class: 'ch-lines' }, ch.lines.map(l => h('li', null, l))));
    if (ch.hint) box.append(h('p', { class: 'ch-hint' }, '💬 ' + ch.hint));

    const api = { node: box, check: () => null, focus: () => {} };
    if (!interactive) return api;

    if (ch.kind === 'choice') {
      let selected = null;
      const opts = h('div', { class: 'opts' });
      ch.options.forEach(o => {
        const b = h('button', { class: 'opt', type: 'button' }, o);
        b.addEventListener('click', () => {
          selected = o;
          opts.querySelectorAll('.opt').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
        });
        opts.append(b);
      });
      box.append(opts);
      api.check = () => selected === null ? null : ch.answers.some(a => norm(a) === norm(selected));
    } else if (ch.kind === 'match') {
      const selects = [];
      const m = h('div', { class: 'match' });
      ch.pairs.forEach(p => {
        const sel = h('select', { class: 'input' },
          h('option', { value: '' }, '— Elige la palabra —'),
          ch.options.map(o => h('option', { value: o }, o)));
        selects.push(sel);
        m.append(h('div', null, h('div', { class: 'def' }, '📌 ' + p.def), sel));
      });
      box.append(m);
      api.check = () => {
        if (selects.some(s => !s.value)) return null;
        return selects.every((s, i) => norm(s.value) === norm(ch.pairs[i].answer));
      };
    } else {
      const input = h('input', {
        class: 'input answer', type: 'text', placeholder: 'Escribe tu respuesta',
        autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'send'
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onEnter && onEnter(); } });
      box.append(input);
      api.check = () => input.value.trim() === '' ? null : ch.answers.some(a => norm(a) === norm(input.value));
      api.focus = () => { input.focus(); input.select(); };
    }
    return api;
  }

  /* ------------------------------------------------------------
     8. PANTALLAS DEL JUGADOR
  ------------------------------------------------------------ */
  function drawWelcome() {
    const input = h('input', {
      class: 'input', type: 'text', placeholder: 'Escribe tu nombre', maxlength: '20',
      autocomplete: 'name', value: S.name
    });
    const go = () => {
      const v = input.value.trim();
      if (!v) { toast('Escribe tu nombre para continuar'); input.focus(); return; }
      S.name = v; safeSet(store, 'lec_name', v);
      S.screen = 'teams'; S.lastKey = null; render();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    return wrap('',
      logoHeader(),
      h('div', { class: 'card center' }, h('h2', null, 'Únete a tu equipo para comenzar.')),
      h('div', { class: 'card' },
        h('label', { class: 'lbl' }, 'NOMBRE DEL PARTICIPANTE'), input,
        h('div', { style: 'height:12px' }),
        h('button', { class: 'btn btn-primary', onClick: go }, 'CONTINUAR ➜')),
      h('button', { class: 'btn-link', onClick: openOrgLogin }, 'SOY ORGANIZADOR'));
  }

  function drawTeams() {
    const grid = h('div', { class: 'grid-teams' });
    teamList().forEach(t => {
      const full = t.n >= CFG.maxPlayers;
      const b = h('button', { class: 'team-btn', onClick: () => {
        if (full) { toast('Este equipo ya está completo. Selecciona otro equipo o consulta con el organizador.'); return; }
        S.pendingTeam = t.id; S.screen = 'confirm'; S.lastKey = null; render();
      } }, 'EQUIPO ' + t.id, h('small', null, full ? 'COMPLETO' : t.n + '/' + CFG.maxPlayers + ' integrantes'));
      if (full) b.setAttribute('disabled', '');
      grid.append(b);
    });
    return wrap('',
      logoHeader(true),
      h('div', { class: 'card center' }, h('h2', null, 'SELECCIONA TU EQUIPO'),
        h('p', { class: 'sub' }, 'Hola, ' + S.name + '. Elige el equipo que te asignó el profesor.')),
      grid,
      h('button', { class: 'btn-link', onClick: () => { S.screen = 'welcome'; S.lastKey = null; render(); } }, '← Cambiar nombre'));
  }

  function drawConfirm() {
    const id = S.pendingTeam;
    const msg = h('p', { class: 'sub', style: 'min-height:20px;color:#fca5a5' });
    const ok = h('button', { class: 'btn btn-ok', onClick: async () => {
      if (S.busy) return;
      S.busy = true; ok.setAttribute('disabled', '');
      const r = await joinTeam(id);
      S.busy = false;
      if (r.ok) { S.lastKey = null; render(); return; }
      ok.removeAttribute('disabled');
      if (r.err === 'full') {
        S.screen = 'teams'; S.lastKey = null; render();
        toast('Este equipo ya está completo. Selecciona otro equipo o consulta con el organizador.');
      } else if (r.err === 'started') {
        S.lastKey = null; render();
      } else msg.textContent = 'No se pudo unir. Revisa tu conexión e inténtalo de nuevo.';
    } }, 'CONFIRMAR');
    return wrap('',
      logoHeader(true),
      h('div', { class: 'card center' },
        h('div', { style: 'font-size:48px' }, '👥'),
        h('h2', null, 'Has seleccionado el EQUIPO ' + id + '.'),
        h('p', { class: 'sub' }, S.name),
        h('p', { class: 'sub', style: 'margin-top:8px;font-weight:700;color:#fff' }, '¿Es correcto?')),
      ok, msg,
      h('button', { class: 'btn btn-ghost', onClick: () => { S.screen = 'teams'; S.lastKey = null; render(); } }, 'CAMBIAR EQUIPO'));
  }

  function drawClosed() {
    return wrap('',
      logoHeader(),
      h('div', { class: 'card center' },
        h('div', { style: 'font-size:56px' }, '🔒'),
        h('h2', null, 'El reto ya comenzó.'),
        h('p', { class: 'sub' }, 'Consulta con el organizador.')),
      h('button', { class: 'btn-link', onClick: openOrgLogin }, 'SOY ORGANIZADOR'));
  }

  function drawLobby(me) {
    const t = me.team;
    const onlineCount = t.players.filter(p => S.online[p.id]).length;
    return wrap('',
      logoHeader(true),
      h('div', { class: 'card' },
        h('div', { class: 'bar-top' }, h('span', { class: 'tag-team' }, 'EQUIPO ' + t.id), h('span', { class: 'tag-me' }, '👤 JUGADOR ' + me.player.num)),
        h('h2', { style: 'margin-top:14px' }, 'Integrantes conectados:'),
        h('ul', { class: 'plist' }, t.players.map(p => h('li', { class: p.id === S.pid ? 'me' : '' },
          S.online[p.id] ? '🟢' : '⚪', ' ', p.name, h('span', { class: 'j' }, 'Jugador ' + p.num + (p.id === S.pid ? ' (tú)' : ''))))),
        h('p', { class: 'sub', style: 'margin-top:12px;font-weight:700;color:#fff' }, onlineCount + (onlineCount === 1 ? ' integrante conectado.' : ' integrantes conectados.')),
        t.n < CFG.minPlayers ? h('p', { class: 'sub', style: 'margin-top:6px' }, 'Se recomiendan al menos ' + CFG.minPlayers + ' integrantes.') : null),
      h('div', { class: 'card center' },
        h('div', { style: 'font-size:40px' }, '⏳'),
        h('p', { class: 'state-sub', style: 'font-weight:700;color:#fff' }, 'Esperando que el organizador inicie el reto...'),
        h('p', { class: 'msg', style: 'margin-top:10px', 'data-rotate': '1' }, MESSAGES[0])),
      h('button', { class: 'btn-link', onClick: async () => { await leaveTeam(); S.lastKey = null; render(); } }, 'Salir del equipo / cambiar'));
  }

  function drawCountdown() {
    return wrap('',
      logoHeader(true),
      h('div', { class: 'card center' },
        h('div', { style: 'font-size:56px' }, '🚀'),
        h('h2', { style: 'font-size:28px' }, '¡EL RETO HA COMENZADO!'),
        h('p', { class: 'state-sub', style: 'font-size:20px;font-weight:700;color:#fff' }, 'Prepárense.'),
        h('div', { class: 'count-num', 'data-countdown': '1' }, '…'),
        h('p', { class: 'msg' }, 'Recuerden: nadie gana solo.')));
  }

  function rankButton() {
    return h('button', { class: 'btn btn-ghost btn-sm', style: 'align-self:center', onClick: () => {
      const rows = ranking(db.now());
      const me = findMe();
      openModal(h('h2', null, '🏆 CLASIFICACIÓN'), rankingTable(rows, me && me.team.id),
        h('button', { class: 'btn btn-primary', onClick: closeModal }, 'CERRAR'));
    } }, '🏆 Ver clasificación');
  }

  function drawPlay(me) {
    const g = S.game, t = me.team, n = t.n;
    const ch = CHALLENGES[t.progress];
    const turn = turnNumber(t);
    const myTurn = me.player.num === turn;
    const turnP = t.players.find(p => p.num === turn);

    // Aviso cuando llega mi turno
    if (myTurn && S.notifiedTurn !== t.progress) {
      S.notifiedTurn = t.progress;
      if (navigator.vibrate) { try { navigator.vibrate([200, 100, 200]); } catch (e) { /* ignorar */ } }
      if (t.progress > 0) toast('🎯 ¡Es tu turno!');
    }

    const dots = h('div', { class: 'dots' }, Array.from({ length: TOTAL }, (_, i) => h('i', { class: i < t.progress ? 'done' : (i === t.progress ? 'cur' : '') })));

    const head = h('div', { class: 'card' },
      h('div', { class: 'bar-top' },
        h('span', { class: 'tag-team' }, 'EQUIPO ' + t.id),
        h('span', { class: 'tag-me' }, '👤 JUGADOR ' + me.player.num)),
      h('div', { class: 'timer', style: 'margin-top:12px' },
        h('div', { class: 'lbl2' }, 'TIEMPO RESTANTE'),
        h('div', { class: 'big' }, '⏱️ ', h('span', { 'data-timer': 'my-remaining' }, fmt(g.limitMs, true))),
        h('div', { class: 'small' }, 'Transcurrido: ', h('span', { 'data-timer': 'my-elapsed' }, '00:00'))),
      h('div', { style: 'margin-top:12px;display:flex;justify-content:space-between;font-weight:800' },
        h('span', null, 'RETO ' + (t.progress + 1) + ' DE ' + TOTAL), h('span', null, '🎯 ' + t.progress + '/' + TOTAL)),
      h('div', { class: 'progress', style: 'margin-top:6px' }, h('div', { style: 'width:' + (t.progress / TOTAL * 100) + '%' })),
      dots);

    const rule = h('div', { class: 'rule' }, '🤝 Puedes ayudar a tu compañero, pero solamente él puede responder.');
    const rot = h('p', { class: 'msg', 'data-rotate': '1' }, MESSAGES[0]);

    if (!myTurn) {
      const children = [
        h('div', { class: 'state-title' }, '⏳ ESPERANDO'),
        h('p', { class: 'state-sub', style: 'font-size:19px;color:#fff;font-weight:700' }, 'Es turno del Jugador ' + turn + '.'),
        turnP ? h('p', { class: 'state-sub' }, '(' + turnP.name + ')') : null,
        h('p', { class: 'state-sub', style: 'margin-top:10px' }, 'Ayuda a tu equipo comunicándote con tus compañeros.')
      ];
      if (CFG.showChallengeToTeammates) children.push(buildChallenge(ch, false).node);
      return wrap('', logoHeader(true), head, h('div', { class: 'card' }, ...children), rule, rot, rankButton());
    }

    // MI TURNO
    const fb = h('div', { class: 'fb' }, '❌ Respuesta incorrecta. Piensa nuevamente.');
    const btn = h('button', { class: 'btn btn-primary', onClick: send }, 'ENVIAR RESPUESTA');
    const ctl = buildChallenge(ch, true, send);

    async function send() {
      if (S.busy) return;
      const v = ctl.check();
      if (v === null) { toast('Primero escribe o elige una respuesta'); return; }
      if (v === false) {
        fb.classList.remove('show'); void fb.offsetWidth; fb.classList.add('show');
        if (navigator.vibrate) { try { navigator.vibrate(250); } catch (e) { /* ignorar */ } }
        ctl.focus();
        return;
      }
      S.busy = true; btn.setAttribute('disabled', '');
      const r = await submitCorrect(t.id, t.progress);
      S.busy = false; btn.removeAttribute('disabled');
      if (r.ok) {
        const finished = t.progress + 1 >= TOTAL;
        if (!finished) showOverlay('ok', '✅', '¡CORRECTO!', 'Excelente trabajo.\n🔓 Turno desbloqueado.', 2300);
        S.lastKey = null; render();
      } else if (r.err === 'time') toast('⏰ El tiempo se agotó');
      else if (r.err === 'stale') { S.lastKey = null; render(); }
      else toast('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.');
    }

    const card = h('div', { class: 'card turn-card' },
      h('div', { class: 'state-title' }, '🎯 TU TURNO'),
      h('p', { class: 'state-sub' }, 'Jugador ' + me.player.num),
      ctl.node, btn, fb);
    return wrap('', logoHeader(true), head, card, rule, rot, rankButton());
  }

  function drawDone(me, now) {
    const t = me.team;
    return wrap('',
      logoHeader(true),
      h('div', { class: 'card center' },
        h('div', { class: 'celebrate' }, '🎉'),
        h('h2', { style: 'font-size:30px' }, '¡LO LOGRARON!'),
        h('p', { class: 'state-sub', style: 'font-size:18px;color:#fff' }, 'Han completado los 12 retos.'),
        h('p', { class: 'state-title', style: 'margin-top:10px;color:var(--cyan)' }, 'Tiempo: ' + fmt(t.finishedAt - S.game.startedAt)),
        h('p', { class: 'state-title' }, TOTAL + '/' + TOTAL),
        h('p', { class: 'msg' }, 'Recuerden: nadie gana solo.')),
      h('div', { class: 'card' }, h('h2', null, '🏆 CLASIFICACIÓN'), rankingTable(ranking(now), t.id)),
      h('p', { class: 'sub', style: 'text-align:center' }, 'Esperando a que los demás equipos terminen...'));
  }

  function drawPlayerFinal(me, now) {
    const kids = [logoHeader(true)];
    if (me) {
      const info = teamInfo(me.team, S.game, now);
      if (info.state === 'finished') {
        kids.push(h('div', { class: 'card center' }, h('div', { class: 'celebrate' }, '🎉'), h('h2', null, '¡LO LOGRARON!'),
          h('p', { class: 'sub' }, 'Han completado los 12 retos en ' + fmt(info.elapsed) + '.')));
      } else {
        kids.push(h('div', { class: 'card center' }, h('div', { style: 'font-size:48px' }, '⏰'),
          h('h2', null, info.state === 'timeout' ? 'TIEMPO AGOTADO' : 'ACTIVIDAD FINALIZADA'),
          h('p', { class: 'sub', style: 'font-size:18px;color:#fff;font-weight:700' }, 'Equipo ' + me.team.id + ': ' + me.team.progress + '/' + TOTAL + ' retos completados.')));
      }
    }
    kids.push(finalNode(now, me && me.team.id));
    return wrap('', ...kids);
  }

  function drawError() {
    return wrap('',
      logoHeader(true),
      h('div', { class: 'card center' }, h('div', { style: 'font-size:48px' }, '⚠️'),
        h('h2', null, 'Problema de conexión'),
        h('p', { class: 'sub' }, S.error),
        h('p', { class: 'sub', style: 'margin-top:8px' }, 'Revisa las reglas de la base de datos y que databaseURL esté bien escrita en firebase-config.js.')));
  }

  /* ------------------------------------------------------------
     9. PANEL DEL ORGANIZADOR
  ------------------------------------------------------------ */
  function openOrgLogin() {
    const input = h('input', { class: 'input', type: 'password', placeholder: 'Contraseña', autocomplete: 'off' });
    const msg = h('p', { style: 'color:#fca5a5;min-height:20px' });
    const go = () => {
      if (input.value === CFG.organizerPassword) {
        S.isOrg = true; safeSet(sessionStorage, 'lec_org', '1');
        closeModal(); S.lastKey = null; render();
      } else { msg.textContent = 'Contraseña incorrecta.'; input.select(); }
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    openModal(h('h2', null, 'ORGANIZADOR'), h('label', { class: 'lbl' }, 'CONTRASEÑA'), input, msg,
      h('div', { class: 'row' }, h('button', { class: 'btn btn-primary', onClick: go }, 'ENTRAR'),
        h('button', { class: 'btn btn-ghost', onClick: closeModal }, 'CANCELAR')));
    setTimeout(() => input.focus(), 50);
  }

  const STATE_LABEL = {
    ready: ['🟢 Listo', 'ok'], waiting: ['🟡 Esperando', 'warn'], countdown: ['🚀 Iniciando', 'info'],
    playing: ['🟢 En juego', 'ok'], finished: ['🏁 Completado', 'info'], timeout: ['⏰ Tiempo agotado', 'bad'], stopped: ['⏹️ Detenido', 'warn']
  };

  function teamCard(t, now) {
    const g = S.game;
    const info = teamInfo(t, g, now);
    const lab = t.n === 0 ? ['⚪ Vacío', ''] : STATE_LABEL[info.state];
    const started = g.status !== 'lobby';
    const turn = turnNumber(t);
    const turnP = t.players.find(p => p.num === turn);
    const meta = [h('div', null, '👥 ', h('b', null, t.n + (t.n === 1 ? ' integrante' : ' integrantes')))];
    if (started && t.n) {
      meta.push(h('div', null, '🎯 ', h('b', null, t.progress + '/' + TOTAL), ' retos'));
      if (info.state === 'playing' || info.state === 'countdown') {
        meta.push(h('div', null, '👤 Turno: ', h('b', null, 'Jugador ' + turn + (turnP ? ' — ' + turnP.name : ''))));
        meta.push(h('div', null, '📍 Reto actual: ', h('b', null, (t.progress + 1) + ' de ' + TOTAL)));
      }
      meta.push(h('div', null, '⏱️ ', h('b', { 'data-timer': 'team-elapsed', 'data-team': t.id }, fmt(info.elapsed))));
    }
    return h('div', { class: 'card tcard' + (t.n === 0 ? ' empty' : '') },
      h('div', { class: 'th' }, h('span', { class: 'tt' }, 'EQUIPO ' + t.id), h('span', { class: 'pill ' + lab[1] }, lab[0])),
      h('div', { class: 'meta' }, meta),
      started && t.n ? h('div', { class: 'progress' }, h('div', { style: 'width:' + (t.progress / TOTAL * 100) + '%' })) : null,
      h('div', { class: 'chips' }, t.players.length
        ? t.players.map(p => h('span', { class: 'chip ' + (S.online[p.id] ? 'on ' : '') + (started && info.state === 'playing' && p.num === turn ? 'turn' : '') },
          (S.online[p.id] ? '🟢 ' : '⚪ ') + 'J' + p.num + ' ' + p.name))
        : h('span', { class: 'chip' }, 'Sin integrantes')));
  }

  function drawQr() {
    const box = h('div', { class: 'qr-box' });
    const urlInput = h('input', { class: 'input', type: 'text', value: S.qrUrl });
    const card = h('div', { class: 'card qr-wrap', id: 'qrcard' },
      h('div', { class: 'scan' }, 'ESCANEA PARA UNIRTE'),
      box,
      h('div', { class: 'url' }, S.qrUrl),
      h('div', { class: 'stats' }, h('span', null, '👥 Participantes: ', h('b', { 'data-live': 'count' }, '0')), h('span', null, '🟢 Conectados: ', h('b', { 'data-live': 'online' }, '0'))),
      h('div', { class: 'row', style: 'width:100%;max-width:560px' },
        h('button', { class: 'btn btn-ghost btn-sm', onClick: () => { const el = $('qrcard'); if (el.requestFullscreen) el.requestFullscreen(); } }, '⛶ Pantalla completa')));
    const cfgCard = h('div', { class: 'card', style: 'max-width:640px;width:100%;margin:0 auto' },
      h('label', { class: 'lbl' }, 'ENLACE QUE ABRE EL QR (la página publicada)'), urlInput,
      h('div', { style: 'height:10px' }),
      h('button', { class: 'btn btn-primary btn-sm', onClick: () => {
        S.qrUrl = urlInput.value.trim() || S.qrUrl; safeSet(localStorage, 'lec_qrurl', S.qrUrl); S.lastKey = null; render();
      } }, 'ACTUALIZAR QR'),
      /^file:|localhost|127\.0\.0\.1/.test(S.qrUrl)
        ? h('div', { class: 'warn-box', style: 'margin-top:12px' }, '⚠️ Este enlace solo funciona en tu computadora. Publica la página (ver README) y pega aquí el enlace público, luego pulsa ACTUALIZAR QR.')
        : null);
    setTimeout(() => {
      if (window.QRCode) {
        try { new QRCode(box, { text: S.qrUrl, width: 280, height: 280, colorDark: '#0a1030', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); }
        catch (e) { box.textContent = 'No se pudo generar el QR'; }
      } else box.textContent = 'No se pudo cargar la librería QR (revisa Internet).';
    }, 0);
    return h('div', { style: 'display:flex;flex-direction:column;gap:14px;align-items:center' }, card, cfgCard);
  }

  function drawOrg(now) {
    const g = S.game;
    const final = showFinal(now);
    const teamsWithPlayers = teamList().filter(t => t.n > 0);
    const small = teamsWithPlayers.filter(t => t.n < CFG.minPlayers);

    let pill;
    if (g.status === 'lobby') pill = h('span', { class: 'pill warn' }, '🟡 Esperando inicio');
    else if (g.status === 'ended' || final) pill = h('span', { class: 'pill bad' }, '⏹️ Actividad finalizada');
    else if (now < g.startedAt) pill = h('span', { class: 'pill info' }, '🚀 Iniciando...');
    else pill = h('span', { class: 'pill ok' }, '🟢 En juego');

    const actions = h('div', { class: 'org-actions' });
    if (g.status === 'lobby') {
      actions.append(h('button', { class: 'btn btn-ok', onClick: () => {
        if (!teamsWithPlayers.length) { toast('Aún no hay participantes registrados'); return; }
        confirmModal({
          title: '¿Deseas iniciar el reto?',
          lines: ['Una vez iniciado, los nuevos participantes no podrán ingresar.'].concat(
            small.length ? ['⚠️ Equipos con menos de ' + CFG.minPlayers + ' integrantes: ' + small.map(t => t.id).join(', ') + '.'] : []),
          okLabel: 'INICIAR', onOk: startActivity
        });
      } }, '🚀 INICIAR ACTIVIDAD'));
    }
    if (g.status === 'running' && !final) {
      actions.append(h('button', { class: 'btn btn-danger', onClick: () => confirmModal({
        title: '¿Finalizar la actividad?', lines: ['Se detendrá el tiempo de todos los equipos y se mostrarán los resultados finales.'],
        okLabel: 'FINALIZAR', danger: true, onOk: async () => { await endActivity(); S.orgTab = 'final'; }
      }) }, '⏹️ FINALIZAR ACTIVIDAD'));
    }
    actions.append(h('button', { class: 'btn btn-ghost', onClick: () => confirmModal({
      title: '¿Estás seguro?', lines: ['Se eliminará el progreso actual.', 'Los participantes registrados también se borrarán y podrás iniciar una nueva actividad.'],
      okLabel: 'REINICIAR', danger: true, onOk: async () => { await resetActivity(); S.orgTab = 'teams'; }
    }) }, '🔄 REINICIAR ACTIVIDAD'));
    actions.append(h('button', { class: 'btn btn-ghost', onClick: () => {
      S.isOrg = false; safeDel(sessionStorage, 'lec_org'); S.lastKey = null; render();
    } }, 'Salir'));

    const top = h('div', { class: 'card org-top' },
      h('div', null, h('div', { class: 'org-title' }, '🔗 LIDERAZGO EN CADENA — Organizador'), h('div', { style: 'margin-top:6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, pill,
        g.status !== 'lobby' ? h('span', { class: 'stats' }, '⏱️ ', h('b', { 'data-timer': 'game-elapsed' }, '00:00'), ' / ', fmt(g.limitMs)) : null)),
      actions);

    const tabs = h('div', { class: 'tabs' });
    const tabDefs = [['teams', '👥 Equipos'], ['rank', '🏆 Clasificación'], ['qr', '📱 Código QR']];
    if (final) tabDefs.push(['final', '🥇 Resultados finales']);
    tabDefs.forEach(([k, label]) => tabs.append(h('button', { class: 'tab' + (S.orgTab === k ? ' on' : ''), onClick: () => { S.orgTab = k; S.lastKey = null; render(); } }, label)));

    const stats = h('div', { class: 'stats' },
      h('span', null, '👥 Participantes: ', h('b', { 'data-live': 'count' }, '0')),
      h('span', null, '🟢 Conectados: ', h('b', { 'data-live': 'online' }, '0')),
      h('span', null, '🧩 Equipos con jugadores: ', h('b', null, teamsWithPlayers.length)));

    let body;
    if (S.orgTab === 'qr') body = drawQr();
    else if (S.orgTab === 'rank') body = h('div', { class: 'card' }, h('h2', null, '🏆 CLASIFICACIÓN'), rankingTable(ranking(now)),
      h('p', { class: 'sub', style: 'margin-top:10px' }, 'Orden: 1º retos completados · 2º menor tiempo.'));
    else if (S.orgTab === 'final' && final) body = finalNode(now);
    else body = h('div', { class: 'teams-grid' }, teamList().map(t => teamCard(t, now)));

    return h('div', { class: 'wrap wide' }, localBadge(), top, tabs, S.orgTab === 'qr' ? null : stats, body);
  }

  /* ------------------------------------------------------------
     10. RENDER (solo redibuja cuando cambia lo que se ve)
  ------------------------------------------------------------ */
  function view(now) {
    const g = S.game;
    if (S.error) return { name: 'error', key: 'error|' + S.error };

    if (S.isOrg) {
      const base = 'org|' + S.orgTab + '|' + g.status + '|' + showFinal(now) + '|' + (now < g.startedAt) + '|';
      if (S.orgTab === 'qr') return { name: 'org', key: base + S.qrUrl };
      const sig = teamList().map(t => [t.id, t.progress, teamInfo(t, g, now).state, t.players.map(p => p.id + p.name + p.num + (S.online[p.id] ? 1 : 0)).join(',')].join(':')).join('|');
      return { name: 'org', key: base + sig };
    }

    const me = findMe();
    if (me) {
      if (g.status === 'lobby') {
        return { name: 'lobby', me, key: 'lobby|' + me.team.id + '|' + me.team.players.map(p => p.id + p.name + p.num + (S.online[p.id] ? 1 : 0)).join(',') };
      }
      if (showFinal(now)) {
        const sig = ranking(now).map(r => r.team.id + ':' + r.progress + ':' + r.time).join(',');
        return { name: 'pfinal', me, key: 'pfinal|' + me.team.id + '|' + sig };
      }
      if (now < g.startedAt) return { name: 'countdown', me, key: 'countdown' };
      const info = teamInfo(me.team, g, now);
      if (info.state === 'finished') {
        return { name: 'done', me, key: 'done|' + ranking(now).map(r => r.team.id + ':' + r.progress + ':' + r.info.state).join(',') };
      }
      return { name: 'play', me, key: 'play|' + me.team.id + '|' + me.team.progress + '|' + me.team.n + '|' + me.player.num };
    }

    // No registrado
    if (g.status !== 'lobby') return { name: 'closed', key: 'closed' };
    if (S.screen === 'teams') return { name: 'teams', key: 'teams|' + teamList().map(t => t.n).join(',') };
    if (S.screen === 'confirm') return { name: 'confirm', key: 'confirm|' + S.pendingTeam };
    return { name: 'welcome', key: 'welcome' };
  }

  let prevName = null;
  function render() {
    const app = $('app');
    if (!S.ready && !S.error) {
      if (!app.firstChild) app.replaceChildren(wrap('', logoHeader(), h('p', { class: 'msg' }, 'Conectando...')));
      return;
    }
    const now = db.now();

    // Presencia (punto verde de conectado)
    const meNow = findMe();
    if (meNow && !S.presenceOn) { db.setPresence(S.pid); S.presenceOn = true; }
    if (!meNow && S.presenceOn) { db.clearPresence(S.pid); S.presenceOn = false; }

    const v = view(now);
    // Pantalla de inicio general (cuenta regresiva) al pasar de lobby a running
    if (S.prevStatus === 'lobby' && S.game.status === 'running' && !S.isOrg && meNow) {
      showOverlay('start', '🚀', '¡EL RETO HA COMENZADO!', 'Prepárense.\nRecuerden: nadie gana solo.', 2600);
    }
    S.prevStatus = S.game.status;

    if (v.key === S.lastKey) return;
    S.lastKey = v.key;

    const typing = document.activeElement && document.activeElement.tagName === 'INPUT';
    let node;
    switch (v.name) {
      case 'error': node = drawError(); break;
      case 'org': node = drawOrg(now); break;
      case 'lobby': node = drawLobby(v.me); break;
      case 'countdown': node = drawCountdown(); break;
      case 'play': node = drawPlay(v.me); break;
      case 'done': node = drawDone(v.me, now); break;
      case 'pfinal': node = drawPlayerFinal(v.me, now); break;
      case 'closed': node = drawClosed(); break;
      case 'teams': node = drawTeams(); break;
      case 'confirm': node = drawConfirm(); break;
      default: node = drawWelcome();
    }
    app.replaceChildren(node);
    const changed = v.name !== prevName;
    if (changed) window.scrollTo(0, 0);
    prevName = v.name;

    if (changed && (v.name === 'done' || v.name === 'pfinal')) confetti();
    if (v.name === 'play') { const inp = document.querySelector('.answer'); if (inp && !typing) setTimeout(() => inp.focus(), 100); }
  }

  /* Actualización continua de cronómetros y contadores (sin redibujar) */
  function tick() {
    if (!S.ready) return;
    const now = db.now(), g = S.game;
    render();
    document.querySelectorAll('[data-timer]').forEach(el => {
      const k = el.dataset.timer;
      let txt = '00:00';
      if (k === 'game-elapsed') txt = fmt(g.status === 'lobby' ? 0 : Math.min((g.endedAt || now) - g.startedAt, g.limitMs));
      else if (k === 'team-elapsed') txt = fmt(teamInfo(g.teams[el.dataset.team], g, now).elapsed);
      else if (k === 'my-remaining' || k === 'my-elapsed') {
        const me = findMe();
        if (me) {
          const e = teamInfo(me.team, g, now).elapsed;
          txt = k === 'my-elapsed' ? fmt(e) : fmt(g.limitMs - e, true);
        }
      }
      if (el.textContent !== txt) el.textContent = txt;
    });
    document.querySelectorAll('[data-countdown]').forEach(el => {
      const s = String(Math.max(0, Math.ceil((g.startedAt - now) / 1000)));
      if (el.textContent !== s) el.textContent = s;
    });
    document.querySelectorAll('[data-rotate]').forEach(el => {
      const m = MESSAGES[Math.floor(now / 7000) % MESSAGES.length];
      if (el.textContent !== m) el.textContent = m;
    });
    const total = teamList().reduce((a, t) => a + t.n, 0);
    const on = teamList().reduce((a, t) => a + t.players.filter(p => S.online[p.id]).length, 0);
    document.querySelectorAll('[data-live="count"]').forEach(el => { el.textContent = total; });
    document.querySelectorAll('[data-live="online"]').forEach(el => { el.textContent = on; });
  }

  /* ------------------------------------------------------------
     11. ARRANQUE
  ------------------------------------------------------------ */
  db.subscribe(raw => {
    S.game = normalize(raw);
    S.ready = true;
    render();
  });
  db.subscribePresence(p => { S.online = p || {}; if (S.ready) render(); });
  setInterval(tick, 250);
  render();

  // Utilidades para pruebas (consola del navegador)
  window.LEC = { S, db, CHALLENGES, norm, ranking, teamInfo, turnNumber, normalize, rawGame, joinTeam, submitCorrect, startActivity, endActivity, resetActivity, leaveTeam, findMe };
})();
