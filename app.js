/* ========================== UTILIDADES BÁSICAS ========================== */
const imgMap = { w:'redonda.png', h:'blanca.png', q:'negra.png', e:'corchea.png' };
const names  = { w:'redonda',    h:'blanca',     q:'negra',      e:'corchea' };

const $ = (sel) => document.querySelector(sel);
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================== AUDIO / BEEP ============================ */
let audioCtx = null;
function beep(ms=45, freq=880){
  if (prefersReduced) return; // respeta reduce motion
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type='square'; o.frequency.value=freq;
    g.gain.value = 0.04;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + ms/1000);
  }catch(e){ /* silencioso */ }
}

/* ================== HELPERS VISUALES / CONSTRUCCIÓN ==================== */
function buildCells(container, count, token){
  if (!container) return;
  container.innerHTML = '';
  for(let i=0;i<count;i++){
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.t = token;
    d.style.backgroundImage = `url(${imgMap[token]})`;
    container.appendChild(d);
  }
}
function tokenBadge(t){
  const i = document.createElement('img');
  i.className = 'token-img';
  i.src = imgMap[t];
  i.alt = names[t];
  i.title = names[t];
  return i;
}
function cellsForSequence(seq){
  const wrap = document.createElement('div');
  wrap.className = 'cells';
  for(const t of seq){
    const c = document.createElement('div');
    c.className = 'cell';
    c.dataset.t = t;
    c.style.backgroundImage = `url(${imgMap[t]})`;
    wrap.appendChild(c);
  }
  return wrap;
}
function legendForSequence(seq){
  const legend = document.createElement('div');
  legend.className = 'legend';
  for(const t of seq){
    const i = document.createElement('img');
    i.className = 'legend-img';
    i.src = imgMap[t];
    i.alt = names[t];
    legend.appendChild(i);
  }
  return legend;
}

/* =================== PLAYER PARA TARJETAS (si existieran) =============== */
function attachPlayer(btn, cellsWrap, seq){
  let playing=false;
  const timers = new Set();

  const clearTimers = () => { for(const k of timers) clearTimeout(k); timers.clear(); };
  const highlight = (cell, on=true) => { if(cell) cell.classList.toggle('playing', on); };
  const stopSeq = () => {
    playing=false; btn.classList.remove('active'); btn.textContent='▶';
    [...cellsWrap.children].forEach(c=>c.classList.remove('playing'));
    clearTimers();
  };
  const startSeq = () => {
    stopSeq();
    playing=true; btn.classList.add('active'); btn.textContent='⏸';
    const bpmInput = $('#bpm');
    const v = (bpmInput && parseInt(bpmInput.value,10)) || 80;
    const msPerBeat = 60000 / Math.max(40, Math.min(200, v));
    let t=0;

    seq.forEach((tok, idx)=>{
      const cell = cellsWrap.children[idx];
      const durBeats = (tok==='w'?4: tok==='h'?2: tok==='q'?1: 0.5);
      const start = t;
      const end = t + durBeats*msPerBeat;

      const k1 = setTimeout(()=>{
        [...cellsWrap.children].forEach(c=>c.classList.remove('playing'));
        highlight(cell,true);
        beep(40);
      }, start);

      const k2 = setTimeout(()=>{ highlight(cell,false); }, Math.max(0,end-28));
      timers.add(k1); timers.add(k2);
      t = end;
    });

    timers.add(setTimeout(stopSeq, t+12));
  };

  btn.addEventListener('click', ()=> (playing ? stopSeq() : startSeq()));
}

/* ==================== “COMBINACIONES” (OPCIONAL/SEGURO) ================= */
(function optionalCombinaciones(){
  const deckBase = $('#deckBase');
  const orderBase = $('#orderBase');
  const pageSizeBase = $('#pageSizeBase');
  const genBase = $('#genBase');
  const prevBase = $('#prevBase');
  const nextBase = $('#nextBase');
  const pageInfoBase = $('#pageInfoBase');

  if (!deckBase || !orderBase || !pageSizeBase || !pageInfoBase) return; // no existe en el HTML

  const valuesBase = { w:4, h:2, q:1 };
  let dataBase = [], pageBase = 1;

  function compositionsSum4(valuesMap){
    const items = Object.entries(valuesMap);
    const out = [];
    (function dfs(sum, seq){
      if(sum===4){ out.push(seq.slice()); return; }
      if(sum>4) return;
      for(const [t,val] of items){ seq.push(t); dfs(sum+val, seq); seq.pop(); }
    })(0,[]);
    return out;
  }
  function orderBy(arr, mode){
    return (mode==='len')
      ? arr.slice().sort((a,b)=>a.length-b.length || a.join('').localeCompare(b.join('')))
      : arr.slice().sort((a,b)=>a.join('').localeCompare(b.join('')));
  }
  function paginate(data, page, pageSize){
    const start=(page-1)*pageSize, end=start+pageSize;
    const totalPages=Math.max(1, Math.ceil(data.length/pageSize));
    return { slice:data.slice(start,end), totalPages };
  }
  function barComponent(seq){
    const bar = document.createElement('div'); bar.className='bar';

    const row = document.createElement('div'); row.className='seq';
    seq.forEach(t => row.appendChild(tokenBadge(t)));

    const playbar = document.createElement('div'); playbar.className='playbar';
    const btn = document.createElement('button'); btn.className='play'; btn.textContent='▶'; btn.title='Reproducir';
    const cells = cellsForSequence(seq);
    const len = document.createElement('span'); len.className='len'; len.textContent = `${seq.length} figuras`;
    playbar.append(btn, cells, len);

    const meta = document.createElement('div'); meta.className='meta';
    meta.append(legendForSequence(seq));
    const kbd = document.createElement('div'); kbd.className='kbd'; kbd.textContent = '4/4';
    meta.appendChild(kbd);

    bar.append(row, playbar, meta);
    attachPlayer(btn, cells, seq);
    return bar;
  }
  function renderBase(){
    if (!deckBase || !pageSizeBase || !orderBase || !pageInfoBase || !prevBase || !nextBase) return;
    const pb = parseInt(pageSizeBase.value,10);
    const sorted = orderBy(dataBase, orderBase.value);
    const {slice,totalPages} = paginate(sorted, pageBase, pb);
    deckBase.innerHTML='';
    slice.forEach(seq => deckBase.appendChild(barComponent(seq)));
    pageInfoBase.textContent = `pág. ${pageBase}/${totalPages}`;
    prevBase.disabled = (pageBase<=1); nextBase.disabled = (pageBase>=totalPages);
  }
  function initBase(){
    dataBase = compositionsSum4(valuesBase);
    pageBase=1;
    renderBase();
  }

  // Eventos seguros
  genBase?.addEventListener('click', initBase);
  orderBase?.addEventListener('change', ()=>{ pageBase=1; renderBase(); });
  pageSizeBase?.addEventListener('change', ()=>{ pageBase=1; renderBase(); });
  prevBase?.addEventListener('click', ()=>{ pageBase=Math.max(1,pageBase-1); renderBase(); });
  nextBase?.addEventListener('click', ()=>{ pageBase+=1; renderBase(); });

  // Go
  initBase();
})();

/* =================== DEMOS GUIADAS (sincronizadas) ===================== */
// Crea contenedores de gestos alineados bajo las celdas
function ensureSlots(movementEl, count, minH=60){
  movementEl.innerHTML = '';
  Object.assign(movementEl.style, {
    display:'grid', gridAutoFlow:'column', gap:'8px', justifyItems:'center'
  });
  for(let i=0;i<count;i++){
    const slot = document.createElement('div');
    slot.className = 'gesture-slot';
    slot.style.minHeight = `${minH}px`;
    movementEl.appendChild(slot);
  }
  return Array.from(movementEl.querySelectorAll('.gesture-slot'));
}
function gestureForToken(tok){
  switch(tok){
    case 'w': return {src:'autoabrazo.png', alt:'Gesto: autoabrazo'};
    case 'h': return {src:'chasquidos.png', alt:'Gesto: chasquidos'};
    case 'q': return {src:'aplauso.png', alt:'Gesto: aplauso'};
    case 'e': return {src:'piernas.png', alt:'Gesto: piernas (alternadas)'}; 
    default:  return {src:'', alt:''};
  }
}
function startMetronome(totalBeats, msPerBeat){
  let beat = 0;
  beep(45, (beat % 4 === 0) ? 1000 : 820);
  beat++;
  let id = setInterval(() => {
    beep(45, (beat % 4 === 0) ? 1000 : 820);
    beat++;
    if (beat >= totalBeats) { clearInterval(id); id = null; }
  }, msPerBeat);
  return id;
}
function setActiveFor(cellsEl, index){
  [...cellsEl.children].forEach((c,idx)=> c.classList.toggle('playing', idx===index));
}

/* ------------------------ DEMO 1: 4 REDONDAS --------------------------- */
(() => {
  const cells = $('#cellsW'), playBtn = $('#playW'), stopBtn = $('#stopW'), movement = $('#movementW'), bpmInput = $('#bpm');
  if (!cells || !playBtn || !stopBtn || !movement || !bpmInput) return;

  // Las celdas ya están en HTML, no hay que generarlas.
  const timeouts = new Set(); let intervalId = null; let playing = false;

  const clearTimers = () => { for(const t of timeouts) clearTimeout(t); timeouts.clear(); if(intervalId){ clearInterval(intervalId); intervalId=null; } };
  const stopDemo = () => { playing=false; clearTimers(); setActiveFor(cells, -1); movement.querySelectorAll('.gesture-slot').forEach(s=>s.innerHTML=''); playBtn.textContent='▶ Reproducir'; };

  function startDemo(){
    stopDemo(); playing=true; playBtn.textContent='⏸ Pausar';
    const bpm = Math.max(40, Math.min(200, parseInt(bpmInput.value,10) || 80));
    const msPerBeat = 60000 / bpm;

    const durationsBeats = [4,4,4,4];
    const totalBeats = 16;
    const slots = ensureSlots(movement, cells.children.length);
    intervalId = startMetronome(totalBeats, msPerBeat);

    let startBeat = 0;
    durationsBeats.forEach((dur, i)=>{
      const startMs = startBeat * msPerBeat;
      const endMs   = (startBeat + dur) * msPerBeat;

      timeouts.add(setTimeout(()=>{
        setActiveFor(cells, i);
        const g = gestureForToken('w');
        const img = Object.assign(document.createElement('img'), {src:g.src, alt:g.alt, className:'gesture'});
        slots[i].innerHTML=''; slots[i].appendChild(img);
      }, startMs));

      timeouts.add(setTimeout(()=>{
        setActiveFor(cells,-1);
        slots[i].innerHTML='';
      }, Math.max(0, endMs-30)));

      startBeat += dur;
    });

    timeouts.add(setTimeout(stopDemo, totalBeats*msPerBeat + 40));
  }

  playBtn.addEventListener('click', () => (playing ? stopDemo() : startDemo()));
  stopBtn.addEventListener('click', stopDemo);
})();

/* ------------------------ DEMO 2: 8 BLANCAS ---------------------------- */
(() => {
  const cells = $('#cellsH'), playBtn = $('#playH'), stopBtn = $('#stopH'), movement = $('#movementH'), bpmInput = $('#bpmH');
  if (!cells || !playBtn || !stopBtn || !movement || !bpmInput) return;

  // Genera las 8 celdas de blanca (evita el texto literal en HTML)
  buildCells(cells, 8, 'h');

  const timeouts = new Set(); let intervalId = null; let playing = false;

  const clearTimers = () => { for(const t of timeouts) clearTimeout(t); timeouts.clear(); if(intervalId){ clearInterval(intervalId); intervalId=null; } };
  const stopDemo = () => { playing=false; clearTimers(); setActiveFor(cells, -1); movement.querySelectorAll('.gesture-slot').forEach(s=>s.innerHTML=''); playBtn.textContent='▶ Reproducir'; };

  function startDemo(){
    stopDemo(); playing=true; playBtn.textContent='⏸ Pausar';
    const bpm = Math.max(40, Math.min(200, parseInt(bpmInput.value,10) || 72));
    const msPerBeat = 60000 / bpm;

    const notes = 8, durationsBeats = Array.from({length: notes}, ()=>2);
    const totalBeats = 16;
    const slots = ensureSlots(movement, cells.children.length);
    intervalId = startMetronome(totalBeats, msPerBeat);

    let startBeat = 0;
    for(let i=0;i<notes;i++){
      const dur = durationsBeats[i];
      const startMs = startBeat * msPerBeat;
      const endMs   = (startBeat + dur) * msPerBeat;

      timeouts.add(setTimeout(()=>{
        setActiveFor(cells, i);
        const g = gestureForToken('h');
        const img = Object.assign(document.createElement('img'), {src:g.src, alt:g.alt, className:'gesture'});
        slots[i].innerHTML=''; slots[i].appendChild(img);
      }, startMs));

      timeouts.add(setTimeout(()=>{
        setActiveFor(cells,-1);
        slots[i].innerHTML='';
      }, Math.max(0, endMs-30)));

      startBeat += dur;
    }

    timeouts.add(setTimeout(stopDemo, totalBeats*msPerBeat + 40));
  }

  playBtn.addEventListener('click', () => (playing ? stopDemo() : startDemo()));
  stopBtn.addEventListener('click', stopDemo);
})();

/* ------------------------ DEMO 3: 16 NEGRAS ---------------------------- */
(() => {
  const cells = $('#cellsQ'), playBtn = $('#playQ'), stopBtn = $('#stopQ'), movement = $('#movementQ'), bpmInput = $('#bpmQ');
  if (!cells || !playBtn || !stopBtn || !movement || !bpmInput) return;

  // Genera las 16 celdas de negra
  buildCells(cells, 16, 'q');

  const timeouts = new Set(); let intervalId = null; let playing = false;

  const clearTimers = () => { for(const t of timeouts) clearTimeout(t); timeouts.clear(); if(intervalId){ clearInterval(intervalId); intervalId=null; } };
  const stopDemo = () => { playing=false; clearTimers(); setActiveFor(cells, -1); movement.querySelectorAll('.gesture-slot').forEach(s=>s.innerHTML=''); playBtn.textContent='▶ Reproducir'; };

  function startDemo(){
    stopDemo(); playing=true; playBtn.textContent='⏸ Pausar';
    const bpm = Math.max(40, Math.min(200, parseInt(bpmInput.value,10) || 72));
    const msPerBeat = 60000 / bpm;

    const notes = 16, durationsBeats = Array.from({length: notes}, ()=>1);
    const totalBeats = 16;
    const slots = ensureSlots(movement, cells.children.length);
    intervalId = startMetronome(totalBeats, msPerBeat);

    let startBeat = 0;
    for(let i=0;i<notes;i++){
      const dur = durationsBeats[i];
      const startMs = startBeat * msPerBeat;
      const endMs   = (startBeat + dur) * msPerBeat;

      timeouts.add(setTimeout(()=>{
        setActiveFor(cells, i);
        const g = gestureForToken('q');
        const img = Object.assign(document.createElement('img'), {src:g.src, alt:g.alt, className:'gesture'});
        slots[i].innerHTML=''; slots[i].appendChild(img);
      }, startMs));

      timeouts.add(setTimeout(()=>{
        setActiveFor(cells,-1);
        slots[i].innerHTML='';
      }, Math.max(0, endMs-30)));

      startBeat += dur;
    }

    timeouts.add(setTimeout(stopDemo, totalBeats*msPerBeat + 40));
  }

  playBtn.addEventListener('click', () => (playing ? stopDemo() : startDemo()));
  stopBtn.addEventListener('click', stopDemo);
})();

/* ------------------- DEMO 4: FUSIÓN AUTOMÁTICA ------------------------- */
(() => {
  const cells = $('#cellsF'), playBtn = $('#playF'), stopBtn = $('#stopF'), movement = $('#movementF'), bpmInput = $('#bpmF');
  if (!cells || !playBtn || !stopBtn || !movement || !bpmInput) return;

  // Botón "Nueva combinación" (si no existe, lo creo a la derecha del play)
  let shuffleBtn = $('#shuffleF');
  if (!shuffleBtn){
    shuffleBtn = Object.assign(document.createElement('button'), { id:'shuffleF', className:'btn ghost', textContent:'↻ Nueva combinación', title:'Generar otra combinación' });
    playBtn.parentElement.appendChild(shuffleBtn);
  }

  const VAL = { w:4, h:2, q:1 };
  const TOKS = ['w','h','q'];

  function genFusionSeq() {
    const TARGET = 16;
    const result = [];
    function dfs(sum, prev) {
      if (sum === TARGET) return true;
      if (sum > TARGET) return false;
      const opts = TOKS.slice().sort(()=>Math.random()-0.5);
      for (const t of opts) {
        if (t === prev) continue;                   // alternancia
        if (sum + VAL[t] > TARGET) continue;        // no pasarse
        if (t === 'q' && sum < 8 && Math.random() < 0.35) continue; // evita arrancar muy pronto con negras
        result.push(t);
        if (dfs(sum + VAL[t], t)) return true;
        result.pop();
      }
      return false;
    }
    for (let i=0;i<150;i++){ result.length=0; if (dfs(0,null)) break; }
    return result.length ? result : ['w','h','h', ...Array(8).fill('q')]; // fallback
  }

  function rebuildCellsForSeq(seq) {
    cells.innerHTML = '';
    seq.forEach(t => {
      const d = document.createElement('div');
      d.className = 'cell';
      d.style.backgroundImage = `url(${imgMap[t]})`;
      cells.appendChild(d);
    });
  }

  const timeouts = new Set(); let intervalId = null; let playing = false; let currentSeq = [];

  const clearTimers = () => { for (const t of timeouts) clearTimeout(t); timeouts.clear(); if (intervalId){ clearInterval(intervalId); intervalId = null; } };
  const stopDemo = () => { playing=false; clearTimers(); setActiveFor(cells,-1); movement.querySelectorAll('.gesture-slot').forEach(s=>s.innerHTML=''); playBtn.textContent='▶ Reproducir'; };

  function mixAndShow(){
    stopDemo();
    currentSeq = genFusionSeq();
    rebuildCellsForSeq(currentSeq);             // << se ve apenas cargas / mezcles
  }

  function startDemo(){
    stopDemo(); playing=true; playBtn.textContent='⏸ Pausar';

    const slots = ensureSlots(movement, cells.children.length);
    const bpm = Math.max(40, Math.min(200, parseInt(bpmInput.value,10) || 72));
    const msPerBeat = 60000 / bpm;

    const totalBeats = 16;
    intervalId = startMetronome(totalBeats, msPerBeat);

    let startBeat = 0;
    currentSeq.forEach((tok, i) => {
      const dur = (tok==='w'?4: tok==='h'?2: 1);
      const startMs = startBeat * msPerBeat;
      const endMs   = (startBeat + dur) * msPerBeat;

      timeouts.add(setTimeout(()=>{
        setActiveFor(cells, i);
        const g = gestureForToken(tok);
        const img = Object.assign(document.createElement('img'), {src:g.src, alt:g.alt, className:'gesture'});
        slots[i].innerHTML=''; slots[i].appendChild(img);
      }, startMs));

      timeouts.add(setTimeout(()=>{
        setActiveFor(cells,-1);
        slots[i].innerHTML='';
      }, Math.max(0, endMs-30)));

      startBeat += dur;
    });

    timeouts.add(setTimeout(stopDemo, totalBeats*msPerBeat + 40));
  }

  // Eventos
  playBtn.addEventListener('click', () => (playing ? stopDemo() : startDemo()));
  stopBtn.addEventListener('click', stopDemo);
  shuffleBtn.addEventListener('click', mixAndShow);

  // Mostrar una combinación al cargar
  mixAndShow();
})();
