/* ============================================================================
   RITMO · Musicala — Ejercicios interactivos
   Figuras: w=redonda(4), h=blanca(2), q=negra(1), e=corchea(1/2)
   Cada compás suma 4 tiempos (4/4).
   ========================================================================== */

/* --------------------------- Mapas y utilidades --------------------------- */
const DUR     = { w: 4, h: 2, q: 1, e: 0.5 };
const imgMap  = { w: 'redonda.svg', h: 'blanca.svg', q: 'negra.svg', e: 'corchea.svg' };
const names   = { w: 'Redonda', h: 'Blanca', q: 'Negra', e: 'Corchea' };
const gesture = { w: 'autoabrazo.png', h: 'chasquidos.png', q: 'aplauso.png', e: 'piernas.png' };
const gestureName = { w: 'Autoabrazo', h: 'Chasquidos', q: 'Aplauso', e: 'Piernas (alternadas)' };

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clampBpm = (v) => Math.max(40, Math.min(200, parseInt(v, 10) || 72));
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

/* ------------------------------ Audio / beep ------------------------------ */
let audioCtx = null;
function beep(ms = 45, freq = 880, vol = 0.05) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
    o.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* silencioso */ }
}

/* =========================== CATÁLOGO DE EJERCICIOS ======================== */
/* Cada ejercicio: { nombre, nivel, measures: [ [tokens...], ... ] }
   Los 9 primeros son los del PDF original "Iniciación al ritmo". */
const W = ['w'], HH = ['h', 'h'], QQ = ['q', 'q', 'q', 'q'];

const exercises = [
  /* ---- Iniciación (redonda · blanca · negra) — del PDF original ---- */
  { nombre: '1 · Tres redondas',            nivel: 'Iniciación', measures: [W, W, W] },
  { nombre: '2 · Seis blancas',             nivel: 'Iniciación', measures: [HH, HH, HH] },
  { nombre: '3 · Doce negras',              nivel: 'Iniciación', measures: [QQ, QQ, QQ] },
  { nombre: '4 · Redonda · blancas · negras', nivel: 'Iniciación', measures: [W, HH, QQ] },
  { nombre: '5 · Redonda · negras · blancas', nivel: 'Iniciación', measures: [W, QQ, HH] },
  { nombre: '6 · Blancas · redonda · negras', nivel: 'Iniciación', measures: [HH, W, QQ] },
  { nombre: '7 · Blancas · negras · redonda', nivel: 'Iniciación', measures: [HH, QQ, W] },
  { nombre: '8 · Negras · redonda · blancas', nivel: 'Iniciación', measures: [QQ, W, HH] },
  { nombre: '9 · Negras · blancas · redonda', nivel: 'Iniciación', measures: [QQ, HH, W] },

  /* ---- Combinaciones intermedias (sin corcheas) ---- */
  { nombre: '10 · Diálogo blanca-negra',    nivel: 'Intermedio', measures: [['h', 'q', 'q'], ['q', 'q', 'h'], ['h', 'h'], W] },
  { nombre: '11 · Negra y blanca alternas', nivel: 'Intermedio', measures: [['q', 'h', 'q'], ['h', 'q', 'q'], ['q', 'q', 'h'], W] },
  { nombre: '12 · Camino a la redonda',     nivel: 'Intermedio', measures: [QQ, ['q', 'q', 'h'], HH, W] },

  /* ---- Con corcheas ---- */
  { nombre: '13 · Corcheas continuas',      nivel: 'Corcheas', measures: [['e','e','e','e','e','e','e','e'], ['e','e','e','e','e','e','e','e']] },
  { nombre: '14 · Negras y corcheas',       nivel: 'Corcheas', measures: [QQ, ['q','q','e','e','e','e'], ['e','e','e','e','q','q'], QQ] },
  { nombre: '15 · Blanca con corcheas',     nivel: 'Corcheas', measures: [['h','e','e','e','e'], ['e','e','e','e','h']] },
  { nombre: '16 · Mezcla figura a figura',  nivel: 'Corcheas', measures: [['q','e','e','q','q'], ['q','q','e','e','q'], ['e','e','q','q','q']] },
  { nombre: '17 · Redonda y corcheas',      nivel: 'Corcheas', measures: [W, ['e','e','e','e','e','e','e','e']] },
  { nombre: '18 · Subida y bajada',         nivel: 'Corcheas', measures: [['q','q','q','e','e'], ['e','e','q','q','q'], ['q','e','e','q','q'], W] },
  { nombre: '19 · Galope de corcheas',      nivel: 'Corcheas', measures: [['q','e','e','q','e','e'], ['e','e','q','e','e','q'], HH, W] },
  { nombre: '20 · Todo junto',              nivel: 'Corcheas', measures: [['h','q','e','e'], ['e','e','q','h'], ['q','e','e','q','q'], W] },
];

/* ------------------------- Banco Motivos Rítmicos ------------------------ */
// Los 200 motivos se conservan tal como aparecen en el cuaderno entregado.
// Se muestran como partitura para no traducir ni alterar su escritura musical.
const motifImage = (number) => `motivos/motivo-${String(number).padStart(3, '0')}.png`;

/* ------------------------ Generador de combinaciones ---------------------- */
// Construye un compás (suma 4). Las corcheas se agregan de a pares.
function randomMeasure(allowEighth) {
  let rest = 4; const out = [];
  while (rest > 0) {
    const opts = [];
    if (rest >= 4) opts.push('w');
    if (rest >= 2) opts.push('h');
    if (rest >= 1) opts.push('q', 'q');               // peso a la negra
    if (allowEighth && rest >= 1) opts.push('e');     // par de corcheas
    const t = opts[Math.floor(Math.random() * opts.length)];
    if (t === 'e') { out.push('e', 'e'); rest -= 1; }
    else { out.push(t); rest -= DUR[t]; }
  }
  return out;
}
function randomExercise(numMeasures = 4, allowEighth = true) {
  return Array.from({ length: numMeasures }, () => randomMeasure(allowEighth));
}

/* ============================ RENDER DEL PENTAGRAMA ======================== */
// Devuelve { staff, cells } — cells es el array plano de celdas en orden.
function renderStaff(measures) {
  const staff = el('div', 'staff');
  const cells = [];
  measures.forEach((m) => {
    const mEl = el('div', 'measure');
    m.forEach((tok) => {
      const c = el('div', 'cell');
      c.dataset.t = tok;
      c.style.backgroundImage = `url(${imgMap[tok]})`;
      c.title = names[tok];
      mEl.appendChild(c);
      cells.push(c);
    });
    staff.appendChild(mEl);
  });
  return { staff, cells };
}

/* =============================== REPRODUCTOR ============================== */
function createPlayer(opts) {
  // opts: measures, getBpm, getPrecount, getReps,
  //       onStart, onStop, onCount, onBeat, onRep, onNote, onClear
  const timers = new Set();
  let playing = false;
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

  function stop() {
    playing = false;
    clearTimers();
    opts.onStop && opts.onStop();
  }

  function start() {
    stop();
    playing = true;
    opts.onStart && opts.onStart();

    const mpb = 60000 / clampBpm(opts.getBpm());
    const reps = Math.max(1, Math.min(20, parseInt(opts.getReps ? opts.getReps() : 1, 10) || 1));
    let t = 0;

    // ---- Notas con su posición en pulsos ----
    const notes = [];
    let ci = 0, beatPos = 0;
    opts.measures.forEach((m, mi) => m.forEach((tok) => {
      notes.push({ tok, mi, ci: ci++, beat: beatPos });
      beatPos += DUR[tok];
    }));
    const passBeats = Math.round(beatPos);

    // ---- Preconteo: un compás contando 1-2-3-4 en tempo ----
    if (opts.getPrecount && opts.getPrecount()) {
      for (let b = 0; b < 4; b++) {
        const n = b + 1, at = t;
        timers.add(setTimeout(() => {
          beep(70, b === 0 ? 1200 : 700, 0.07);   // clic de cuenta (acento en el 1)
          opts.onCount && opts.onCount(n);
        }, at));
        t += mpb;
      }
      timers.add(setTimeout(() => opts.onCount && opts.onCount(0), t));
    }

    // ---- Repeticiones del ejercicio ----
    for (let r = 0; r < reps; r++) {
      const repOffset = t + r * passBeats * mpb;

      timers.add(setTimeout(() => opts.onRep && opts.onRep(r + 1, reps), repOffset));

      // Pulso 1-2-3-4: metrónomo + conteo visual (acento en el 1)
      for (let b = 0; b < passBeats; b++) {
        const at = repOffset + b * mpb;
        const label = b % 4; // 0 → tiempo 1
        timers.add(setTimeout(() => {
          beep(label === 0 ? 60 : 40, label === 0 ? 1200 : 760, label === 0 ? 0.06 : 0.035);
          opts.onBeat && opts.onBeat(label);
        }, at));
      }

      // Onset de cada figura (sonido + visual). Corcheas alternan agudo/grave
      notes.forEach((n) => {
        const at = repOffset + n.beat * mpb;
        const offbeat = Math.abs(n.beat - Math.round(n.beat)) > 0.01;
        timers.add(setTimeout(() => {
          opts.onNote && opts.onNote(n);
          const freq = n.tok === 'e' ? (offbeat ? 1040 : 880)
                     : n.tok === 'w' ? 520 : n.tok === 'h' ? 600 : 680;
          beep(34, freq, 0.06);
        }, at));
      });
    }

    const total = t + reps * passBeats * mpb;
    timers.add(setTimeout(() => { opts.onClear && opts.onClear(); stop(); }, total + 40));
  }

  return { start, stop, toggle: () => (playing ? stop() : start()), isPlaying: () => playing };
}

/* ======================= BLOQUE EJECUTABLE (runner) ====================== */
// big=false → tarjeta normal; big=true → pantalla completa.
function buildRunner(ex, big) {
  const root = el('div', big ? 'runner big' : 'runner');

  // Título
  const head = el('div', 'runner-head');
  const title = el('h3', 'runner-title');
  title.textContent = ex.nombre;
  const meta = el('span', 'runner-meta');
  meta.textContent = `${ex.measures.length} compases · 4/4`;
  head.append(title, meta);

  // Barra de controles
  const bar = el('div', 'toolbar');

  const bpmLab = el('label');
  bpmLab.textContent = 'BPM: ';
  const bpm = el('input'); bpm.type = 'number'; bpm.min = 40; bpm.max = 200; bpm.step = 1; bpm.value = 72;
  bpmLab.appendChild(bpm);

  const preLab = el('label', 'switch');
  const pre = el('input'); pre.type = 'checkbox'; pre.checked = true;
  preLab.append(pre, document.createTextNode(' Preconteo'));

  const repsLab = el('label');
  repsLab.textContent = 'Repeticiones: ';
  const reps = el('input'); reps.type = 'number'; reps.min = 1; reps.max = 20; reps.step = 1; reps.value = 3;
  repsLab.appendChild(reps);

  const play = el('button', 'chip'); play.textContent = '▶ Reproducir';
  const stopBtn = el('button', 'btn ghost'); stopBtn.textContent = '■ Detener';
  const fsBtn = el('button', 'btn ghost');
  fsBtn.textContent = big ? '⤢ Salir' : '⛶ Pantalla completa';

  bar.append(bpmLab, preLab, repsLab, play, stopBtn, fsBtn);

  // Contador de pulso visual (1-2-3-4) + vuelta actual
  const counter = el('div', 'pulsebar');
  const repInfo = el('span', 'rep-info');
  const dots = [1, 2, 3, 4].map((n) => {
    const d = el('span', 'pulse-dot'); d.textContent = n; return d;
  });
  const dotWrap = el('div', 'pulse-dots');
  dots.forEach((d) => dotWrap.appendChild(d));
  counter.append(dotWrap, repInfo);

  // Pentagrama (compases divididos)
  const { staff, cells } = renderStaff(ex.measures);
  if (big) staff.classList.add('big');
  const measureEls = [...staff.children];

  // Escenario: gesto grande + nombre de figura + cuenta
  const stage = el('div', big ? 'stage big' : 'stage');
  const countEl = el('div', 'countdown');
  const badge = el('div', 'repeat-badge'); badge.textContent = '↻ otra vez';
  const gImg = el('img', 'gesture-big'); gImg.alt = '';
  const gLabel = el('div', 'gesture-label');
  stage.append(countEl, badge, gImg, gLabel);

  root.append(head, bar, counter, staff, stage);

  const lightBeat = (label) => dots.forEach((d, i) => {
    d.classList.toggle('on', i === label);
    d.classList.toggle('accent', i === label && label === 0);
  });
  const clearBeats = () => dots.forEach((d) => d.classList.remove('on', 'accent'));

  let prevTok = null;   // para detectar figuras repetidas
  let eighthSide = 0;   // alternancia izq/der de corcheas

  const player = createPlayer({
    measures: ex.measures,
    getBpm: () => bpm.value,
    getPrecount: () => pre.checked,
    getReps: () => reps.value,
    onStart: () => {
      play.textContent = '⏸ Pausar'; play.classList.add('active');
      prevTok = null; eighthSide = 0;
    },
    onStop: () => {
      play.textContent = '▶ Reproducir'; play.classList.remove('active');
      cells.forEach((c) => c.classList.remove('playing', 'rep'));
      measureEls.forEach((m) => m.classList.remove('on'));
      gImg.classList.remove('show', 'again'); gImg.removeAttribute('src');
      gLabel.textContent = '';
      countEl.classList.remove('show'); countEl.textContent = '';
      badge.classList.remove('show');
      clearBeats(); repInfo.textContent = '';
    },
    onCount: (n) => {
      if (n > 0) { countEl.textContent = n; countEl.classList.add('show'); lightBeat(n - 1); }
      else { countEl.classList.remove('show'); clearBeats(); }
    },
    onBeat: (label) => lightBeat(label),
    onRep: (r, total) => { repInfo.textContent = total > 1 ? `Vuelta ${r} de ${total}` : ''; },
    onNote: (n) => {
      const repeat = (n.tok === prevTok);

      // Alternancia izq/der para corcheas (gesto de piernas)
      let extra = '';
      if (n.tok === 'e') { eighthSide ^= 1; extra = eighthSide ? ' · izq' : ' · der'; }
      else eighthSide = 0;

      cells.forEach((c, i) => {
        c.classList.toggle('playing', i === n.ci);
        if (i === n.ci) { c.classList.remove('rep'); void c.offsetWidth; if (repeat) c.classList.add('rep'); }
        else c.classList.remove('rep');
      });
      measureEls.forEach((m, i) => m.classList.toggle('on', i === n.mi));
      if (window.matchMedia('(max-width: 600px)').matches && staff.scrollWidth > staff.clientWidth) {
        const activeMeasure = measureEls[n.mi];
        staff.scrollTo({ left: activeMeasure.offsetLeft - staff.offsetLeft, behavior: prefersReduced ? 'instant' : 'smooth' });
      }
      countEl.classList.remove('show');

      gImg.src = gesture[n.tok]; gImg.alt = gestureName[n.tok];
      gImg.classList.remove('show', 'again'); void gImg.offsetWidth;
      gImg.classList.add('show', repeat ? 'again' : 'show');
      gLabel.innerHTML = `<b>${names[n.tok]}</b> · ${gestureName[n.tok]}${extra}`;

      // Aviso visual de "misma figura otra vez"
      if (repeat) { badge.classList.remove('show'); void badge.offsetWidth; badge.classList.add('show'); }
      else badge.classList.remove('show');

      prevTok = n.tok;
    },
  });

  play.addEventListener('click', () => player.toggle());
  stopBtn.addEventListener('click', () => player.stop());
  fsBtn.addEventListener('click', () => { player.stop(); big ? closeFullscreen() : openFullscreen(ex); });

  return { root, player };
}

/* ============================ PANTALLA COMPLETA =========================== */
const fsEl = document.getElementById('fs');
let fsPlayer = null;

function openFullscreen(ex) {
  fsEl.innerHTML = '';
  const closeBar = el('div', 'fs-top');
  const brand = el('span', 'fs-brand'); brand.textContent = 'Musicala · Ritmo';
  const x = el('button', 'fs-close'); x.textContent = '✕'; x.title = 'Cerrar (Esc)';
  x.addEventListener('click', closeFullscreen);
  closeBar.append(brand, x);

  const { root, player } = buildRunner(ex, true);
  fsPlayer = player;
  fsEl.append(closeBar, root);
  fsEl.hidden = false;
  document.body.classList.add('no-scroll');
  if (fsEl.requestFullscreen) fsEl.requestFullscreen().catch(() => {});
}

function closeFullscreen() {
  if (fsPlayer) { fsPlayer.stop(); fsPlayer = null; }
  fsEl.hidden = true;
  fsEl.innerHTML = '';
  document.body.classList.remove('no-scroll');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !fsEl.hidden) closeFullscreen(); });
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && !fsEl.hidden) closeFullscreen();
});

/* ============================ MONTAJE DEL CATÁLOGO ======================== */
const catalog = document.getElementById('catalog');

function exerciseCard(ex) {
  const card = el('section', 'card section exercise');
  const { root } = buildRunner(ex, false);
  card.appendChild(root);
  return card;
}

(function mountCatalog() {
  if (!catalog) return;

  // ---- Banco de 200 motivos del cuaderno ----
  const bankTitle = el('h2', 'group-title');
  bankTitle.textContent = 'Banco de 200 motivos rítmicos';
  catalog.appendChild(bankTitle);

  const bank = el('section', 'card motif-bank');
  const intro = el('p', 'note');
  intro.textContent = 'Elige un motivo y practícalo con el mismo preconteo, sonido y gestos de los demás ejercicios.';
  const viewer = el('div', 'motif-viewer');
  const scoreReference = el('details', 'motif-reference');
  const scoreSummary = el('summary'); scoreSummary.textContent = 'Ver partitura original del cuaderno';
  const sheet = el('img', 'motif-sheet'); sheet.alt = 'Partitura original del motivo rítmico 1';
  scoreReference.append(scoreSummary, sheet);
  const nav = el('div', 'motif-nav');
  const previous = el('button', 'btn ghost'); previous.type = 'button'; previous.textContent = '← Anterior';
  const next = el('button', 'chip'); next.type = 'button'; next.textContent = 'Siguiente →';
  nav.append(previous, next);

  const picker = el('div', 'motif-picker');
  picker.setAttribute('aria-label', 'Seleccionar motivo rítmico');
  let currentMotif = 1;
  const motifButtons = [];
  let motifRunner = null;
  const showMotif = (number, shouldFocus = false) => {
    if (motifRunner) motifRunner.player.stop();
    currentMotif = Math.max(1, Math.min(200, number));
    const pattern = motifPatterns[currentMotif - 1];
    const ex = {
      nombre: `Motivo ${currentMotif}`,
      nivel: 'Banco de motivos',
      measures: pattern.split('|').map((measure) => [...measure]),
    };
    const fresh = buildRunner(ex, false);
    viewer.replaceChildren(fresh.root, scoreReference, nav);
    motifRunner = fresh;
    sheet.src = motifImage(currentMotif);
    sheet.alt = `Partitura original del motivo rítmico ${currentMotif}`;
    previous.disabled = currentMotif === 1;
    next.disabled = currentMotif === 200;
    motifButtons.forEach((button, index) => {
      const selected = index + 1 === currentMotif;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (shouldFocus && window.matchMedia('(max-width: 600px)').matches) {
      viewer.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }
  };
  for (let number = 1; number <= 200; number++) {
    const button = el('button', 'motif-choice');
    button.type = 'button'; button.textContent = number;
    button.setAttribute('aria-label', `Ver motivo ${number}`);
    button.addEventListener('click', () => showMotif(number, true));
    motifButtons.push(button); picker.appendChild(button);
  }
  previous.addEventListener('click', () => showMotif(currentMotif - 1, true));
  next.addEventListener('click', () => showMotif(currentMotif + 1, true));
  bank.append(intro, viewer, picker);
  catalog.appendChild(bank);
  showMotif(1);

  // Agrupar por nivel
  const grupos = {};
  exercises.forEach((ex) => { (grupos[ex.nivel] ||= []).push(ex); });

  Object.entries(grupos).forEach(([nivel, lista]) => {
    const h = el('h2', 'group-title');
    h.textContent = nivel;
    catalog.appendChild(h);
    lista.forEach((ex) => catalog.appendChild(exerciseCard(ex)));
  });

  // ---- Generador de combinaciones aleatorias ----
  const genTitle = el('h2', 'group-title');
  genTitle.textContent = 'Generador de combinaciones';
  catalog.appendChild(genTitle);

  const genWrap = el('section', 'card section exercise');
  let genEx = { nombre: '✨ Combinación generada', nivel: 'Generador', measures: randomExercise(4, true) };
  let genRunner = buildRunner(genEx, false);

  const genBar = el('div', 'gen-bar');
  const nuevo = el('button', 'btn ghost'); nuevo.textContent = '↻ Nueva combinación';
  const conCorcheas = el('label', 'switch');
  const chk = el('input'); chk.type = 'checkbox'; chk.checked = true;
  conCorcheas.append(chk, document.createTextNode(' Incluir corcheas'));
  genBar.append(nuevo, conCorcheas);

  genWrap.append(genBar, genRunner.root);
  catalog.appendChild(genWrap);

  nuevo.addEventListener('click', () => {
    genRunner.player.stop();
    genEx = { nombre: '✨ Combinación generada', nivel: 'Generador', measures: randomExercise(4, chk.checked) };
    const fresh = buildRunner(genEx, false);
    genWrap.replaceChild(fresh.root, genRunner.root);
    genRunner = fresh;
  });
})();
