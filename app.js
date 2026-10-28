(function(){
'use strict';

/* PURE:START */
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DIA = ['dom','seg','ter','qua','qui','sex','sáb'];
const pad = n => String(n).padStart(2,'0');
const isoDate = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const ymOf = d => d.getFullYear()+'-'+pad(d.getMonth()+1);
const parseYM = ym => { const p = ym.split('-'); return [+p[0], +p[1]]; };
const addMonths = (ym, n) => { const a = parseYM(ym); return ymOf(new Date(a[0], a[1]-1+n, 1)); };
const daysIn = ym => { const a = parseYM(ym); return new Date(a[0], a[1], 0).getDate(); };
const fromISO = iso => new Date(+iso.slice(0,4), +iso.slice(5,7)-1, +iso.slice(8,10));
const fmtBR = iso => iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4);
const cap = t => t.charAt(0).toUpperCase()+t.slice(1);
const monthLabel = ym => { const a = parseYM(ym); return cap(new Date(a[0], a[1]-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})); };
const fold = s => String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

const dueDate = (s, ym) => ym+'-'+pad(Math.min(Math.max(Math.floor(+s.venc)||5,1), daysIn(ym)));
const statusOf = (s, ym, todayISO) => {
  if (s.pay && s.pay[ym]) return 'pago';
  if (!(+s.valor > 0)) return 'isento';
  return todayISO > dueDate(s, ym) ? 'atrasado' : 'pendente';
};
const rowsFor = (students, ym) => students.filter(s => (s.pay && s.pay[ym]) || (s.ativo !== false && (!s.inicio || s.inicio <= ym)));
const totalsFor = (rows, ym, todayISO) => {
  const t = {rec:0, pend:0, late:0, nPaid:0, nPend:0, nLate:0};
  rows.forEach(s => {
    const st = statusOf(s, ym, todayISO);
    if (st === 'pago') { t.rec += (+s.pay[ym].v || 0); t.nPaid++; }
    else if (st === 'atrasado') { t.late += (+s.valor || 0); t.nLate++; }
    else if (st === 'pendente') { t.pend += (+s.valor || 0); t.nPend++; }
  });
  t.expected = t.rec + t.pend + t.late;
  t.pct = t.expected ? Math.round(t.rec / t.expected * 100) : 0;
  return t;
};
const recByMonth = (students, ym) => students.reduce((a, s) => a + ((s.pay && s.pay[ym]) ? (+s.pay[ym].v || 0) : 0), 0);
const shortMoney = v => v >= 1000 ? (Math.round(v/100)/10).toLocaleString('pt-BR')+' mil' : String(Math.round(v));
const initials = n => { const p = String(n||'').trim().split(/\s+/).filter(Boolean); if (!p.length) return '?'; return (p[0][0] + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase(); };

const weekdayIdx = iso => fromISO(iso).getDay();
const monthGrid = ym => { const cells = []; const lead = weekdayIdx(ym+'-01'); for (let i=0;i<lead;i++) cells.push(null); for (let d=1; d<=daysIn(ym); d++) cells.push(ym+'-'+pad(d)); return cells; };
const weekStart = iso => { const d = fromISO(iso); d.setDate(d.getDate() - d.getDay()); return isoDate(d); };
const cmpLesson = (a, b) => a.date.localeCompare(b.date) || ((a.criado||0) - (b.criado||0));
const themeCounts = ls => {
  const m = new Map();
  ls.forEach(l => { const k = fold(l.tema).trim(); if (!k) return; const e = m.get(k) || {label: String(l.tema).trim(), n: 0}; e.n++; m.set(k, e); });
  return Array.from(m.values()).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt-BR'));
};
const groupWeeks = (ls, ym) => {
  const m = new Map();
  ls.forEach(l => { const k = weekStart(l.date); if (!m.has(k)) m.set(k, []); m.get(k).push(l); });
  const first = ym+'-01', last = ym+'-'+pad(daysIn(ym));
  return Array.from(m.entries()).sort((a, b) => a[0] < b[0] ? -1 : 1).map(e => {
    const s = e[0], d = fromISO(s); d.setDate(d.getDate()+6);
    const a = s < first ? first : s, z = isoDate(d) > last ? last : isoDate(d);
    const mes = MES[+ym.slice(5)-1];
    return {label: (a === z ? (+a.slice(8)) : (+a.slice(8))+'–'+(+z.slice(8)))+' '+mes, lessons: e[1]};
  });
};
const csvCell = v => { let s = String(v==null?'':v); if (/^[=+\-@]/.test(s)) s = "'"+s; return '"'+s.replace(/"/g,'""')+'"'; };

/* eventos */
const EV_LABEL = {competicao:'Competição', exame:'Exame de faixa', seminario:'Seminário', outro:'Outro'};
const evLabel = ev => EV_LABEL[ev.tipo] || 'Evento';
const evClass = ev => ev.tipo === 'competicao' ? 'comp' : ev.tipo === 'exame' ? 'exam' : 'outro';
const cmpEvent = (a, b) => a.date.localeCompare(b.date) || String(a.hora||'').localeCompare(String(b.hora||'')) || ((a.criado||0) - (b.criado||0));
const evDateShort = iso => DIA[fromISO(iso).getDay()]+', '+(+iso.slice(8,10))+' '+MES[+iso.slice(5,7)-1];
const daysUntil = (iso, todayISO) => Math.round((fromISO(iso) - fromISO(todayISO)) / 86400000);
const untilLabel = n => n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n > 1 ? 'em '+n+' dias' : n === -1 ? 'ontem' : 'há '+(-n)+' dias';
const evPartStatus = (ev, sid, todayISO) => {
  const p = (ev.participantes || {})[sid];
  if (p && p.pago) return 'pago';
  if (!(+ev.taxa > 0)) return 'isento';
  return todayISO > (ev.prazo || ev.date) ? 'atrasado' : 'pendente';
};
const evTotals = (ev, valid, todayISO) => {
  const t = {n:0, nPaid:0, nLate:0, nPend:0, rec:0, falta:0, total:0, pct:0}, taxa = +ev.taxa || 0, parts = ev.participantes || {};
  Object.keys(parts).forEach(id => {
    if (valid && !valid.has(id)) return;
    t.n++;
    const st = evPartStatus(ev, id, todayISO);
    if (st === 'pago') { t.nPaid++; t.rec += (+parts[id].v || 0); }
    else if (st === 'atrasado') { t.nLate++; t.falta += taxa; }
    else if (st === 'pendente') { t.nPend++; t.falta += taxa; }
  });
  t.total = t.rec + t.falta;
  t.pct = t.total ? Math.round(t.rec / t.total * 100) : 0;
  return t;
};
const summaryText = (ym, ls, evs) => {
  const days = new Set(ls.map(l => l.date)).size, th = themeCounts(ls);
  const out = [monthLabel(ym), ls.length+(ls.length === 1 ? ' aula' : ' aulas')+' em '+days+(days === 1 ? ' dia' : ' dias')+'.', ''];
  if (th.length) out.push('Temas: '+th.map(t => t.label+(t.n > 1 ? ' ('+t.n+'x)' : '')).join(', ')+'.', '');
  if (evs && evs.length) { out.push('Eventos:'); evs.forEach(e => out.push('- '+e.date.slice(8)+'/'+e.date.slice(5,7)+' '+e.titulo+' ('+evLabel(e)+')')); out.push(''); }
  groupWeeks(ls, ym).forEach(w => {
    out.push('Semana de '+w.label+':');
    w.lessons.forEach(l => out.push('- '+l.date.slice(8)+'/'+l.date.slice(5,7)+' '+l.tema+(l.turma ? ' ('+l.turma+')' : '')));
    out.push('');
  });
  return out.join('\n').trim();
};
/* turmas */
const TURMA_COLORS = ['#f3cd3c','#e8a07c','#a9d3b0','#8fb4ff','#d9a7f0','#ff9fb8'];
const turmaHue = name => { let h = 0; String(name).split('').forEach(c => { h = (h*31 + c.charCodeAt(0)) >>> 0; }); return h % TURMA_COLORS.length; };
const turmaDias = t => (Array.isArray(t.dias) ? t.dias : []).map(Number).filter(n => n >= 0 && n <= 6).filter((n, i, a) => a.indexOf(n) === i).sort((a, b) => a - b);
const turmaWhen = t => { const d = turmaDias(t).map(i => cap(DIA[i])).join(' · '); const h = t.hora ? (t.fim ? t.hora+'–'+t.fim : t.hora) : ''; return [d, h].filter(Boolean).join(' · '); };
const turmaPlannedOn = (list, iso) => { const w = weekdayIdx(iso); return list.filter(t => turmaDias(t).indexOf(w) >= 0).sort((a, b) => String(a.hora||'').localeCompare(String(b.hora||'')) || a.nome.localeCompare(b.nome, 'pt-BR')); };
const nextClassISO = (t, todayISO) => { if (!turmaDias(t).length) return null; for (let i = 0; i < 7; i++) { const x = fromISO(todayISO); x.setDate(x.getDate()+i); if (turmaDias(t).indexOf(x.getDay()) >= 0) return isoDate(x); } return null; };
/* conversões entre o formato do app e as tabelas do banco */
const hhmm = t => t ? String(t).slice(0,5) : '';
const nn = v => { const s = v == null ? '' : String(v).trim(); return s === '' ? null : s; };
const msOf = iso => { const n = Date.parse(iso); return isNaN(n) ? 0 : n; };
const fromRows = R => {
  const tName = {};
  const turmas = R.turmas.map(r => { tName[r.id] = r.nome; return {id:r.id, nome:r.nome, dias:(r.dias || []).map(Number), hora:hhmm(r.hora_inicio), fim:hhmm(r.hora_fim), local:r.local_treino || '', obs:r.obs || '', criado:msOf(r.criado_em)}; });
  const pays = {};
  R.pagamentos.forEach(p => { (pays[p.aluno_id] = pays[p.aluno_id] || {})[String(p.mes).slice(0,7)] = {v:+p.valor || 0, d:p.pago_em ? String(p.pago_em).slice(0,10) : ''}; });
  const students = R.alunos.map(r => ({id:r.id, nome:r.nome, turma:tName[r.turma_id] || '', faixa:r.faixa || '', nasc:r.nascimento || '', mae:r.nome_mae || '', pai:r.nome_pai || '', tel:r.telefone || '', saude:r.saude || '', obs:r.obs || '', valor:+r.mensalidade || 0, venc:+r.dia_vencimento || 5, inicio:r.aluno_desde ? String(r.aluno_desde).slice(0,7) : '', ativo:r.ativo !== false, pay:pays[r.id] || {}, criado:msOf(r.criado_em)}));
  const lessons = R.aulas.map(r => ({id:r.id, date:String(r.data_aula).slice(0,10), turma:tName[r.turma_id] || '', tema:r.tema, conteudo:r.conteudo || '', proxima:r.proxima || '', criado:msOf(r.criado_em)}));
  const parts = {};
  R.inscricoes.forEach(r => { (parts[r.evento_id] = parts[r.evento_id] || {})[r.aluno_id] = r.pago ? {pago:true, em:r.pago_em ? String(r.pago_em).slice(0,10) : '', v:+r.valor_pago || 0} : {pago:false}; });
  const events = R.eventos.map(r => ({id:r.id, titulo:r.titulo, tipo:r.tipo, date:String(r.data_evento).slice(0,10), hora:hhmm(r.hora), local:r.local_evento || '', taxa:+r.taxa || 0, prazo:r.prazo_pagamento ? String(r.prazo_pagamento).slice(0,10) : '', obs:r.obs || '', participantes:parts[r.id] || {}, criado:msOf(r.criado_em)}));
  return {turmas:turmas, students:students, lessons:lessons, events:events};
};
const turmaToRow = t => ({id:t.id, nome:t.nome, dias:turmaDias(t), hora_inicio:nn(t.hora), hora_fim:nn(t.fim), local_treino:nn(t.local), obs:nn(t.obs)});
const alunoToRow = (s, turmaId) => ({id:s.id, turma_id:turmaId || null, nome:s.nome, faixa:nn(s.faixa), nascimento:nn(s.nasc), nome_mae:nn(s.mae), nome_pai:nn(s.pai), telefone:nn(s.tel), saude:nn(s.saude), obs:nn(s.obs), mensalidade:Math.max(0, +s.valor || 0), dia_vencimento:Math.min(31, Math.max(1, Math.floor(+s.venc) || 5)), aluno_desde:(/^\d{4}-\d{2}$/.test(s.inicio || '') ? s.inicio : ymOf(new Date()))+'-01', ativo:s.ativo !== false});
const pagamentoRows = s => Object.keys(s.pay || {}).map(ym => ({aluno_id:s.id, mes:ym+'-01', valor:Math.max(0, +s.pay[ym].v || 0), pago_em:nn(s.pay[ym].d) || isoDate(new Date())}));
const aulaToRow = (l, turmaId) => ({id:l.id, turma_id:turmaId || null, data_aula:l.date, tema:l.tema, conteudo:nn(l.conteudo), proxima:nn(l.proxima)});
const eventoToRow = e => ({id:e.id, titulo:e.titulo, tipo:e.tipo, data_evento:e.date, hora:nn(e.hora), local_evento:nn(e.local), taxa:Math.max(0, +e.taxa || 0), prazo_pagamento:nn(e.prazo), obs:nn(e.obs)});
const inscricaoRows = e => Object.keys(e.participantes || {}).map(sid => { const p = e.participantes[sid] || {}; return {evento_id:e.id, aluno_id:sid, pago:!!p.pago, pago_em:p.pago ? (nn(p.em) || isoDate(new Date())) : null, valor_pago:p.pago ? Math.max(0, +p.v || 0) : null}; });
/* PURE:END */

const BELTS = [['','Sem faixa'],['branca','Branca'],['cinza','Cinza'],['azul','Azul'],['amarela','Amarela'],['laranja','Laranja'],['verde','Verde'],['roxa','Roxa'],['marrom','Marrom'],['preta','Preta']];
const BELT_COLOR = {branca:'#f4f4f2', cinza:'#9aa0a6', azul:'#3b6fd1', amarela:'#f2d03b', laranja:'#f08a2e', verde:'#3f9a52', roxa:'#7b4bb5', marrom:'#7a4a2b', preta:'#151515'};
const ARROW = '<svg class="arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';

const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c === 'x' ? r : (r&3|8)).toString(16); });
const upsert = (arr, item) => { const i = arr.findIndex(x => x.id === item.id); if (i >= 0) arr[i] = item; else arr.push(item); };
const TABS = ['alunos','turmas','financeiro','planejamento'];

const now0 = new Date();
const state = {
  tab:'alunos', students:[], lessons:[], events:[], turmas:[], turma:'', meName:'', user:null,
  decided:false, demo:false, loadError:false,
  finMonth: ymOf(now0), planMonth: ymOf(now0), selDay: isoDate(now0),
  finFilter:'todos', finQuery:'', alFilter:'todos', alQuery:'', editLesson:null, lastTurma:''
};
let demoData = {students:[], lessons:[], events:[], turmas:[]};
const sheet = {open:false, kind:'', id:null, opener:null};

const data = () => state.demo ? demoData : state;
const turmaObjs = () => {
  const D = data(), defs = (D.turmas || []).slice(), names = new Set(defs.map(t => t.nome));
  D.students.forEach(s => { if (s.turma && !names.has(s.turma)) { names.add(s.turma); defs.push({id:null, nome:s.turma, dias:[], implicit:true}); } });
  return defs.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
};
const turmas = () => turmaObjs().map(t => t.nome);
const inTurma = s => !state.turma || s.turma === state.turma;
const validIds = () => new Set(data().students.filter(inTurma).map(s => s.id));
const turmaColor = name => {
  const ord = turmaObjs().sort((x, y) => (x.criado || 1e15) - (y.criado || 1e15) || x.nome.localeCompare(y.nome, 'pt-BR'));
  const i = ord.findIndex(t => t.nome === name);
  return TURMA_COLORS[(i >= 0 ? i : turmaHue(name)) % TURMA_COLORS.length];
};
const tdot = name => '<i class="tdot" style="--tc:'+turmaColor(name)+'"></i>';
const evVisible = e => { if (!state.turma) return true; const ids = Object.keys(e.participantes || {}); if (!ids.length) return true; const valid = validIds(); return ids.some(i => valid.has(i)); };
const visEvents = () => data().events.filter(evVisible);

/* ---------- avisos ---------- */
let toastTimer = 0;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
}
/* ---------- conta e banco de dados (Supabase) ---------- */
const SB_URL = 'https://ulmiqpjwcbxnuoipwuxx.supabase.co';
const SB_KEY = 'sb_publishable_Ute6F7Dcmy4AnrDzYpj7ZA_S58JgMqT';
let sb = null, store = null, chain = Promise.resolve(), loadedAt = 0;
const siteURL = () => location.origin + location.pathname;

function errMsg(e){
  const c = String(e && e.code || ''), m = String(e && e.message || '');
  if (!navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(m)) return 'Sem conexão. Verifique a internet e tente de novo.';
  if (c === '23505') return 'Já existe um registro com esse nome.';
  if (c === '23514' || c === '22001' || c === '22007' || c === '22P02') return 'Algum campo tem um valor fora do permitido.';
  if (c === '42501' || c === 'PGRST301' || /jwt/i.test(m)) return 'Sua sessão expirou. Saia e entre de novo.';
  return 'Não foi possível salvar agora. Tente de novo.';
}
async function run(q){ const r = await q; if (r.error) throw r.error; return r.data; }
const isNetErr = e => !!e && (e instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(String(e.message || '')));

function enqueue(fn){
  chain = chain.then(async () => {
    try { await fn(); }
    catch (e) {
      if (!isNetErr(e)) throw e;
      await new Promise(r => setTimeout(r, 700)); await fn();
    }
  }).then(() => {}, async e => {
    console.error(e); toast(errMsg(e));
    try { await reload(); } catch (x) {}
  });
  return chain;
}

async function fetchAll(table){
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = await run(sb.from(table).select('*').order('id').range(from, from + 999));
    out.push.apply(out, rows);
    if (rows.length < 1000) break;
  }
  return out;
}
async function loadAll(){
  const r = await Promise.all(['turmas','alunos','pagamentos','aulas','eventos','inscricoes'].map(fetchAll));
  loadedAt = Date.now();
  return fromRows({turmas:r[0], alunos:r[1], pagamentos:r[2], aulas:r[3], eventos:r[4], inscricoes:r[5]});
}
async function reload(){
  if (!sb || !state.user) return;
  const d = await loadAll();
  state.students = d.students; state.lessons = d.lessons; state.events = d.events; state.turmas = d.turmas;
  render();
}

const tid = name => { const t = state.turmas.find(x => x.nome === name); return t ? t.id : null; };
store = {
  saveTurma: t => enqueue(() => run(sb.from('turmas').upsert(turmaToRow(t)))),
  delTurma: id => enqueue(() => run(sb.from('turmas').delete().eq('id', id))),
  saveStudent: s => enqueue(async () => {
    await run(sb.from('alunos').upsert(alunoToRow(s, tid(s.turma))));
    const rows = pagamentoRows(s);
    if (rows.length) await run(sb.from('pagamentos').upsert(rows, {onConflict:'aluno_id,mes'}));
    let del = sb.from('pagamentos').delete().eq('aluno_id', s.id);
    if (rows.length) del = del.not('mes', 'in', '('+rows.map(r => r.mes).join(',')+')');
    await run(del);
  }),
  delStudent: id => enqueue(() => run(sb.from('alunos').delete().eq('id', id))),
  saveLesson: l => enqueue(() => run(sb.from('aulas').upsert(aulaToRow(l, tid(l.turma))))),
  delLesson: id => enqueue(() => run(sb.from('aulas').delete().eq('id', id))),
  saveEvent: e => enqueue(async () => {
    await run(sb.from('eventos').upsert(eventoToRow(e)));
    const rows = inscricaoRows(e);
    if (rows.length) await run(sb.from('inscricoes').upsert(rows, {onConflict:'evento_id,aluno_id'}));
    let del = sb.from('inscricoes').delete().eq('evento_id', e.id);
    if (rows.length) del = del.not('aluno_id', 'in', '('+rows.map(r => r.aluno_id).join(',')+')');
    await run(del);
  }),
  delEvent: id => enqueue(() => run(sb.from('eventos').delete().eq('id', id)))
};

/* As alterações aparecem na tela na hora e são enviadas ao banco em seguida. */
const act = {
  saveStudent(s){ upsert(data().students, s); render(); return state.demo ? Promise.resolve() : store.saveStudent(s); },
  delStudent(i){
    const D = data();
    D.students = D.students.filter(x => x.id !== i);
    D.events.forEach(e => { if (e.participantes) delete e.participantes[i]; });
    render(); return state.demo ? Promise.resolve() : store.delStudent(i);
  },
  saveLesson(l){ upsert(data().lessons, l); render(); return state.demo ? Promise.resolve() : store.saveLesson(l); },
  delLesson(i){ const D = data(); D.lessons = D.lessons.filter(x => x.id !== i); render(); return state.demo ? Promise.resolve() : store.delLesson(i); },
  saveEvent(e){ upsert(data().events, e); render(); return state.demo ? Promise.resolve() : store.saveEvent(e); },
  delEvent(i){ const D = data(); D.events = D.events.filter(x => x.id !== i); render(); return state.demo ? Promise.resolve() : store.delEvent(i); },
  async saveTurma(t, oldName){
    const D = data();
    upsert(D.turmas, t);
    if (oldName && oldName !== t.nome) {
      if (state.turma === oldName) state.turma = t.nome;
      D.students.forEach(x => { if (x.turma === oldName) x.turma = t.nome; });
      D.lessons.forEach(x => { if (x.turma === oldName) x.turma = t.nome; });
    }
    render();
    if (!state.demo) await store.saveTurma(t);
  },
  async delTurma(t){
    const D = data();
    if (state.turma === t.nome) state.turma = '';
    D.students.forEach(x => { if (x.turma === t.nome) x.turma = ''; });
    D.lessons.forEach(x => { if (x.turma === t.nome) x.turma = ''; });
    D.turmas = D.turmas.filter(x => x.id !== t.id);
    render();
    if (!state.demo) await store.delTurma(t.id);
  }
};

/* ---------- entrar, sair, criar conta ---------- */
const emptyData = () => ({students:[], lessons:[], events:[], turmas:[]});
async function enterApp(user){
  if (sheet.open) closeSheet();
  Object.assign(state, emptyData(), {user:user, meName:(user.user_metadata && user.user_metadata.nome) || '', demo:false, decided:false, loadError:false, turma:''});
  demoData = emptyData();
  render();
  try { Object.assign(state, await loadAll()); }
  catch (e) { console.error(e); state.loadError = true; toast(errMsg(e)); }
  state.decided = true; resetLessonForm(); render();
}
function leaveApp(){
  Object.assign(state, emptyData(), {user:null, meName:'', demo:true, decided:true, loadError:false, turma:''});
  demoData = makeDemo();
  if (sheet.open) closeSheet();
  resetLessonForm(); render();
  openAuth('login');
}
async function onAuth(ev, session){
  if (ev === 'SIGNED_OUT') { leaveApp(); return; }
  if (!session) { if (ev === 'INITIAL_SESSION') leaveApp(); return; }
  if (ev === 'TOKEN_REFRESHED' || ev === 'USER_UPDATED') { state.user = session.user; return; }
  if (!state.user || state.user.id !== session.user.id) await enterApp(session.user);
  if (ev === 'PASSWORD_RECOVERY') openAuth('reset');
}
function authMsg(e){
  const m = String(e && e.message || ''), c = String(e && (e.code || e.status) || '');
  if (!navigator.onLine || /failed to fetch|networkerror|load failed/i.test(m)) return 'Sem conexão. Verifique a internet e tente de novo.';
  if (/invalid login/i.test(m) || c === 'invalid_credentials') return 'E-mail ou senha incorretos.';
  if (/not confirmed/i.test(m) || c === 'email_not_confirmed') return 'Confirme seu e-mail primeiro: abra o link na mensagem que enviamos.';
  if (/already registered|already exists/i.test(m) || c === 'user_already_exists') return 'Esse e-mail já tem conta. Entre ou recupere a senha.';
  if (/rate limit|too many|over_email_send_rate_limit|429/i.test(m + c)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (/password/i.test(m) && /(short|least|weak|characters)/i.test(m)) return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
  if (/same password|different from the old/i.test(m)) return 'Escolha uma senha diferente da anterior.';
  return 'Não foi possível concluir agora. Tente de novo.';
}
const AUTH_CLOSE = '<button type="button" class="icon-btn" data-act="close-sheet" aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
function authHTML(mode, v){
  v = v || {};
  const head = t => '<div class="sheet-h"><h3 id="sheet-title" tabindex="-1">'+t+'</h3>'+AUTH_CLOSE+'</div>';
  const email = '<div class="field"><label for="au-email">E-mail</label><input id="au-email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="254" value="'+esc(v.email)+'"></div>';
  const pass = (label, auto) => '<div class="field"><label for="au-senha">'+label+'</label><input id="au-senha" type="password" autocomplete="'+auto+'" maxlength="72"></div>';
  const wrap = (title, inner) => '<div class="sheet auth" role="dialog" aria-modal="true" aria-labelledby="sheet-title">'+head(title)+inner+'</div>';
  if (mode === 'sent') {
    return wrap(v.kind === 'forgot' ? 'Confira seu e-mail' : 'Confirme seu e-mail',
      '<p class="hint">'+(v.kind === 'forgot'
        ? 'Se <b>'+esc(v.email)+'</b> tiver uma conta, enviamos um link para criar uma nova senha.'
        : 'Enviamos um link de confirmação para <b>'+esc(v.email)+'</b>. Abra a mensagem (olhe também o spam) e depois volte aqui para entrar.')+'</p>'+
      '<div class="form-acts"><button type="button" class="btn" data-act="auth-mode" data-mode="login">Ir para o login</button></div>');
  }
  if (mode === 'reset') {
    return wrap('Nova senha',
      '<form id="auth-form" data-mode="reset" novalidate>'+
        pass('Nova senha (mínimo 8 caracteres)', 'new-password')+
        '<div class="field"><label for="au-senha2">Repita a nova senha</label><input id="au-senha2" type="password" autocomplete="new-password" maxlength="72"></div>'+
        '<div class="err" id="au-err" role="alert"></div>'+
        '<div class="form-acts"><button type="submit" class="btn" id="au-ok">Salvar nova senha</button></div></form>');
  }
  if (mode === 'forgot') {
    return wrap('Recuperar senha',
      '<form id="auth-form" data-mode="forgot" novalidate>'+
        '<p class="hint">Digite o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>'+email+
        '<div class="err" id="au-err" role="alert"></div>'+
        '<div class="form-acts"><button type="submit" class="btn" id="au-ok">Enviar link</button><button type="button" class="btn ghost" data-act="auth-mode" data-mode="login">Voltar</button></div></form>');
  }
  const signup = mode === 'signup';
  return wrap(signup ? 'Criar conta' : 'Entrar',
    '<div class="seg" role="group" aria-label="Entrar ou criar conta">'+
      '<button type="button" class="chip-btn" data-act="auth-mode" data-mode="login" aria-pressed="'+(!signup)+'">Entrar</button>'+
      '<button type="button" class="chip-btn" data-act="auth-mode" data-mode="signup" aria-pressed="'+signup+'">Criar conta</button></div>'+
    '<form id="auth-form" data-mode="'+mode+'" novalidate>'+
      (signup ? '<div class="field"><label for="au-nome">Seu nome</label><input id="au-nome" type="text" autocomplete="name" maxlength="120" value="'+esc(v.nome)+'"></div>' : '')+
      email+
      pass(signup ? 'Senha (mínimo 8 caracteres)' : 'Senha', signup ? 'new-password' : 'current-password')+
      (signup ? '<p class="hint">Os dados dos alunos são de responsabilidade do professor. Cadastre somente o que precisa e peça autorização aos responsáveis dos menores de idade.</p>' : '')+
      '<div class="err" id="au-err" role="alert"></div>'+
      '<div class="form-acts"><button type="submit" class="btn" id="au-ok">'+(signup ? 'Criar minha conta' : 'Entrar')+'</button>'+
        (signup ? '' : '<button type="button" class="linkbtn" data-act="auth-mode" data-mode="forgot">Esqueci minha senha</button>')+'</div>'+
    '</form>'+
    (state.demo ? '<button type="button" class="linkbtn" data-act="close-sheet">Ver o app com dados de exemplo</button>' : ''));
}
function openAuth(mode, v){
  if (sheet.open && sheet.kind !== 'auth') closeSheet();
  if (!sheet.open) openSheet(authHTML(mode, v), '#sheet-title', 'auth', null);
  else { $('#overlay').innerHTML = authHTML(mode, v); const f = $('#sheet-title'); if (f) f.focus(); }
  sheet.mode = mode;
}
function authSwitch(mode){
  const email = $('#au-email') ? $('#au-email').value.trim() : '', nome = $('#au-nome') ? $('#au-nome').value.trim() : '';
  openAuth(mode, {email:email, nome:nome});
}
async function authSubmit(){
  const form = $('#auth-form'); if (!form || !sb) return;
  const mode = form.dataset.mode, err = $('#au-err'), btn = $('#au-ok'), fail = (m, id) => { err.textContent = m; if (id && $(id)) $(id).focus(); };
  const email = $('#au-email') ? $('#au-email').value.trim() : '', senha = $('#au-senha') ? $('#au-senha').value : '';
  err.textContent = '';
  if (mode !== 'reset' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Informe um e-mail válido.', '#au-email');
  if (mode === 'signup') {
    if (!$('#au-nome').value.trim()) return fail('Informe seu nome.', '#au-nome');
  }
  if (mode === 'login' && !senha) return fail('Informe sua senha.', '#au-senha');
  if ((mode === 'signup' || mode === 'reset') && senha.length < 8) return fail('A senha precisa ter pelo menos 8 caracteres.', '#au-senha');
  if (mode === 'reset' && senha !== $('#au-senha2').value) return fail('As senhas não são iguais.', '#au-senha2');
  const label = btn.textContent; btn.disabled = true; btn.textContent = 'Aguarde…';
  try {
    if (mode === 'login') {
      const r = await sb.auth.signInWithPassword({email:email, password:senha});
      if (r.error) throw r.error;
    } else if (mode === 'signup') {
      const nome = $('#au-nome').value.trim();
      const r = await sb.auth.signUp({email:email, password:senha, options:{data:{nome:nome}, emailRedirectTo:siteURL()}});
      if (r.error) throw r.error;
      if (!r.data.session) {
        if (r.data.user && r.data.user.identities && r.data.user.identities.length === 0) { btn.disabled = false; btn.textContent = label; return fail('Esse e-mail já tem conta. Entre ou recupere a senha.', '#au-email'); }
        openAuth('sent', {email:email, kind:'signup'});
      }
    } else if (mode === 'forgot') {
      const r = await sb.auth.resetPasswordForEmail(email, {redirectTo:siteURL()});
      if (r.error) throw r.error;
      openAuth('sent', {email:email, kind:'forgot'});
    } else if (mode === 'reset') {
      const r = await sb.auth.updateUser({password:senha});
      if (r.error) throw r.error;
      closeSheet(); toast('Senha alterada.');
    }
  } catch (e) {
    console.error(e);
    if ($('#au-ok')) { btn.disabled = false; btn.textContent = label; }
    err.textContent = authMsg(e);
  }
}
async function logout(){
  if (!sb) return;
  try { await sb.auth.signOut(); } catch (e) { console.error(e); }
  if (state.user) leaveApp();
}

/* ---------- exemplos ---------- */
function makeDemo(){
  const t = new Date(), cur = ymOf(t), todayISO = isoDate(t);
  const plus = n => isoDate(new Date(t.getFullYear(), t.getMonth(), t.getDate()+n));
  const mkS = (nome, turma, faixa, mae, pai, tel, saude, valor, venc, skip, nasc) => {
    const pay = {};
    for (let i = 1; i <= 8; i++) { const m = addMonths(cur, -i); if (skip.indexOf(i) < 0) pay[m] = {v:valor, d:m+'-'+pad(Math.min(venc, daysIn(m)))}; }
    return {id:'ex-'+uid(), nome, turma, faixa, mae, pai, tel, saude, obs:'', valor, venc, nasc, inicio:addMonths(cur,-8), ativo:true, pay, exemplo:true, criado:Date.now()};
  };
  const s = [
    mkS('Ana Beatriz Souza','Sub 13','amarela','Carla Souza','Marcos Souza','(21) 99000-0001','Asma leve. Leva bombinha na mochila.',180,5,[],'2014-03-12'),
    mkS('Lucas Ferreira','Sub 13','laranja','Patrícia Ferreira','','(21) 99000-0002','',180,10,[2],'2013-07-02'),
    mkS('Helena Martins','Sub 13','branca','Renata Martins','Paulo Martins','(21) 99000-0003','Alergia a amendoim.',180,10,[],'2014-11-23'),
    mkS('Davi Oliveira','Sub 15','verde','Juliana Oliveira','Rafael Oliveira','(21) 99000-0004','',200,20,[1,2],'2012-01-30'),
    mkS('Sofia Costa','Sub 15','azul','Marta Costa','','(21) 99000-0005','',200,28,[],'2012-09-14'),
    mkS('Miguel Rocha','Sub 15','laranja','Bianca Rocha','André Rocha','(21) 99000-0006','',0,5,[],'2013-05-08')
  ];
  [0,1,5].forEach(i => { s[i].pay[cur] = {v:s[i].valor, d:cur+'-'+pad(Math.min(s[i].venc, daysIn(cur)))}; });
  const A = ['Ukemi e quedas básicas','Osoto-gari em duplas','Osoto-gari em duplas','Randori leve','Revisão do mês'];
  const B = ['Kumi-kata e deslocamento','Seoi-nage em duplas','Newaza: imobilizações','Seoi-nage em duplas','Preparação para o exame'];
  const notes = ['Aquecimento, séries curtas, correção de postura e roda final.','Trabalho em duplas com troca a cada 5 minutos.','Foco em atenção, controle e respeito ao parceiro.','Repetição do conteúdo anterior com ajustes individuais.','Demonstração de cada aluno e comentários da turma.'];
  const ls = []; let a = 0, b = 0;
  for (let d = 1; d <= daysIn(cur); d++) {
    const iso = cur+'-'+pad(d), wd = fromISO(iso).getDay();
    if (iso > plus(3)) break;
    if (wd === 2 || wd === 4) { const k = a++ % A.length; ls.push({id:'ex-'+uid(), date:iso, turma:'Sub 13', tema:A[k], conteudo:notes[k], proxima:'', criado:d, exemplo:true}); }
    if (wd === 6) { const k = b++ % B.length; ls.push({id:'ex-'+uid(), date:iso, turma:'Sub 15', tema:B[k], conteudo:notes[k], proxima:'', criado:d, exemplo:true}); }
  }
  const part = (ids, paid) => { const o = {}; ids.forEach((i, k) => { o[s[i].id] = paid.indexOf(i) >= 0 ? {pago:true, em:plus(-3), v:90} : {pago:false}; }); return o; };
  const evs = [
    {id:'ex-'+uid(), titulo:'Campeonato Estadual (exemplo)', tipo:'competicao', date:plus(12), hora:'09:00', local:'Ginásio do clube, centro', taxa:90, prazo:plus(7), obs:'Levar judogi azul e documento. Pesagem às 8h.', participantes:part([0,1,3,4],[0,3]), criado:1, exemplo:true},
    {id:'ex-'+uid(), titulo:'Exame de faixa (exemplo)', tipo:'exame', date:plus(26), hora:'10:00', local:'Dojo', taxa:60, prazo:plus(20), obs:'Quem vai fazer o exame traz a faixa nova já comprada.', participantes:part([1,2,5],[2]), criado:2, exemplo:true},
    {id:'ex-'+uid(), titulo:'Festival de judô (exemplo)', tipo:'competicao', date:plus(-14), hora:'08:30', local:'Escola parceira', taxa:50, prazo:plus(-20), obs:'', participantes:part([0,2,3],[0,2]), criado:3, exemplo:true}
  ];
  const tu = [
    {id:'ex-'+uid(), nome:'Sub 13', dias:[2,4], hora:'18:00', fim:'19:00', local:'Tatame principal', obs:'', criado:1, exemplo:true},
    {id:'ex-'+uid(), nome:'Sub 15', dias:[6], hora:'09:00', fim:'10:30', local:'Tatame principal', obs:'', criado:2, exemplo:true},
    {id:'ex-'+uid(), nome:'Adultos', dias:[1,3], hora:'20:00', fim:'21:30', local:'Tatame principal', obs:'', criado:3, exemplo:true}
  ];
  return {students:s, lessons:ls, events:evs, turmas:tu};
}

/* ---------- renderização ---------- */
function upcomingEvents(){ const today = isoDate(new Date()); return visEvents().filter(e => e.date >= today).sort(cmpEvent); }

function renderTbar(){
  const bar = $('#tbar'), list = turmaObjs(), D = data();
  bar.hidden = !state.decided || list.length === 0;
  if (bar.hidden) return;
  if (state.turma && !list.some(t => t.nome === state.turma)) state.turma = '';
  $('#tchips').innerHTML = '<button type="button" class="tchip" data-act="set-turma" data-name="" data-key="tc:" aria-pressed="'+(!state.turma)+'">Todas as turmas</button>'+
    list.map(t => '<button type="button" class="tchip" data-act="set-turma" data-name="'+esc(t.nome)+'" data-key="tc:'+esc(t.nome)+'" aria-pressed="'+(state.turma === t.nome)+'">'+tdot(t.nome)+esc(t.nome)+'</button>').join('');
  const info = $('#tinfo'), t = list.find(x => x.nome === state.turma);
  if (!t) { info.hidden = true; info.innerHTML = ''; return; }
  const n = D.students.filter(s => s.turma === t.nome && s.ativo !== false).length, when = turmaWhen(t);
  info.hidden = false;
  info.innerHTML = '<span>'+tdot(t.nome)+' <b>'+esc(t.nome)+'</b></span><span>'+(when ? esc(when) : 'Dias ainda não definidos')+'</span>'+(t.local ? '<span>'+esc(t.local)+'</span>' : '')+'<span>'+n+(n === 1 ? ' aluno ativo' : ' alunos ativos')+'</span>'+
    '<button type="button" class="btn ghost sm" data-act="edit-turma" data-id="'+esc(t.id || '')+'" data-name="'+esc(t.nome)+'" data-key="tinfo-edit">'+(t.id ? 'Editar turma' : 'Definir dias')+'</button>';
}

function renderChrome(){
  const n = $('#store-note');
  if (!state.decided) n.textContent = 'Carregando…';
  else if (state.demo) n.textContent = 'Dados de exemplo';
  else n.textContent = (state.meName ? 'Olá, '+state.meName.split(' ')[0]+' · ' : '')+'seus dados ficam privados na sua conta';
  $('#logout-btn').hidden = !state.user;
  const bn = $('#demo-banner');
  bn.hidden = !(state.demo || state.loadError);
  if (state.loadError) {
    $('#banner-msg').textContent = 'Não foi possível carregar os seus dados.';
    $('#banner-acts').innerHTML = '<button type="button" class="btn sm" data-act="retry-load">Tentar de novo</button>';
  } else {
    $('#banner-msg').textContent = 'Você está vendo dados de exemplo, que não são salvos. Crie sua conta para cadastrar seus alunos.';
    $('#banner-acts').innerHTML = '<button type="button" class="btn sm" data-act="auth-open" data-mode="signup">Criar conta</button> <button type="button" class="btn sm" data-act="auth-open" data-mode="login">Entrar</button>';
  }
  TABS.forEach(t => {
    const b = $('#tab-'+t); b.setAttribute('aria-selected', String(state.tab === t)); b.tabIndex = state.tab === t ? 0 : -1;
    $('#panel-'+t).hidden = state.tab !== t;
  });
  renderHero();
}

function renderHero(){
  const tab = state.tab, titles = {alunos:'Seus alunos.', turmas:'Suas turmas.', financeiro:'Dojo em dia.', planejamento:'Treino com plano.'};
  $('#hero-h1').textContent = titles[tab];
  $('#hero-eyebrow').textContent = {alunos:'Alunos · Judô', turmas:'Turmas · Judô', financeiro:'Finanças · Judô', planejamento:'Planejamento · Judô'}[tab];
  const cta = $('#hero-cta');
  const cfg = {alunos:['Novo aluno','new-student'], turmas:['Nova turma','new-turma'], financeiro:['Ver alunos','go-alunos'], planejamento:['Novo evento','new-event']}[tab];
  cta.innerHTML = cfg[0]+' '+ARROW; cta.dataset.target = cfg[1];
  let sub = 'Alunos, turmas, mensalidades, aulas e eventos do dojo em um só lugar.';
  if (!state.decided) sub = 'Carregando o seu dojo…';
  else {
    const D = data(), today = isoDate(new Date()), ymNow = ymOf(new Date()), parts = [];
    const S = D.students.filter(inTurma), ativos = S.filter(s => s.ativo !== false);
    if (state.turma && tab !== 'turmas') parts.push(state.turma);
    if (tab === 'alunos') {
      const care = ativos.filter(s => s.saude && String(s.saude).trim()).length;
      if (ativos.length) { parts.push(ativos.length+(ativos.length === 1 ? ' aluno ativo' : ' alunos ativos')); if (care) parts.push(care+' com cuidados de saúde'); }
    } else if (tab === 'turmas') {
      const n = turmaObjs().length;
      if (n) parts.push(n+(n === 1 ? ' turma' : ' turmas')+' e '+D.students.filter(s => s.ativo !== false).length+' alunos ativos');
    } else if (tab === 'financeiro') {
      if (S.length) {
        const t = totalsFor(rowsFor(S, ymNow), ymNow, today);
        parts.push(t.nLate ? t.nLate+(t.nLate === 1 ? ' mensalidade em atraso' : ' mensalidades em atraso')+' neste mês' : 'Nenhuma mensalidade em atraso neste mês');
      }
    } else {
      const up = upcomingEvents()[0];
      if (up) parts.push('Próximo evento: '+up.titulo+', '+untilLabel(daysUntil(up.date, today)));
    }
    if (parts.length) sub = parts.join('. ')+'.';
  }
  $('#hero-sub').textContent = sub;
}

function rowHTML(s, ym, today){
  const st = statusOf(s, ym, today), p = s.pay && s.pay[ym];
  const pillTxt = {pago:'Pago', pendente:'A vencer', atrasado:'Em atraso', isento:'Isento'}[st];
  const meta = [s.turma ? '<span class="tl">'+tdot(s.turma)+esc(s.turma)+'</span>' : 'Sem turma'];
  meta.push(+s.valor > 0 ? BRL.format(+s.valor) : 'Isento', 'vence dia '+Math.min(Math.max(Math.floor(+s.venc)||5,1), daysIn(ym)));
  if (p && p.d) meta.push('pago em '+p.d.slice(8,10)+'/'+p.d.slice(5,7));
  const k = esc(s.id);
  const btn = st === 'pago'
    ? '<button type="button" class="btn ghost sm" data-act="toggle-pay" data-id="'+k+'" data-key="pay:'+k+'">Desfazer</button>'
    : (st === 'isento' ? '' : '<button type="button" class="btn sm" data-act="toggle-pay" data-id="'+k+'" data-key="pay:'+k+'">Receber</button>');
  const belt = s.faixa && BELT_COLOR[s.faixa] ? ' style="--belt:'+BELT_COLOR[s.faixa]+'"' : '';
  return '<div class="row">'+
    '<button type="button" class="who" data-act="open-student" data-id="'+k+'" data-key="open:'+k+'" aria-label="Abrir ficha de '+esc(s.nome)+'">'+
      '<span class="avatar"'+belt+' aria-hidden="true">'+esc(initials(s.nome))+'</span>'+
      '<span class="who-txt"><strong>'+esc(s.nome)+'</strong><span class="meta">'+meta.map((m, i) => i === 0 ? m : '<span>· '+m+'</span>').join('')+'</span></span>'+
    '</button>'+
    '<div class="acts"><span class="pill '+st+'">'+pillTxt+'</span>'+btn+'</div>'+
  '</div>';
}

const ageOf = (nasc, todayISO) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc || '')) return null; let a = +todayISO.slice(0,4) - +nasc.slice(0,4); if (todayISO.slice(5) < nasc.slice(5)) a--; return a >= 0 && a < 120 ? a : null; };
function alunoRowHTML(s, ym, today){
  const st = statusOf(s, ym, today);
  const pillTxt = {pago:'Pagou', pendente:'A vencer', atrasado:'Em atraso', isento:'Isento'}[st];
  const k = esc(s.id), age = ageOf(s.nasc, today);
  const belt = s.faixa && BELT_COLOR[s.faixa] ? ' style="--belt:'+BELT_COLOR[s.faixa]+'"' : '';
  const meta = [s.turma ? '<span class="tl">'+tdot(s.turma)+esc(s.turma)+'</span>' : 'Sem turma'];
  if (s.faixa && BELT_COLOR[s.faixa]) meta.push('faixa '+esc(s.faixa));
  if (age != null) meta.push(age+' anos');
  if (s.ativo === false) meta.push('inativo');
  const info = [];
  if (s.mae) info.push('<span>Mãe: <b>'+esc(s.mae)+'</b></span>');
  if (s.pai) info.push('<span>Pai: <b>'+esc(s.pai)+'</b></span>');
  if (s.tel) info.push('<span>Tel.: <b>'+esc(s.tel)+'</b></span>');
  if (s.nasc) info.push('<span>Nasc.: <b>'+fmtBR(s.nasc)+'</b></span>');
  return '<div class="arow">'+
    '<button type="button" class="who" data-act="open-student" data-id="'+k+'" data-key="aopen:'+k+'" aria-label="Abrir ficha de '+esc(s.nome)+'">'+
      '<span class="avatar"'+belt+' aria-hidden="true">'+esc(initials(s.nome))+'</span>'+
      '<span class="who-txt"><strong>'+esc(s.nome)+'</strong><span class="meta">'+meta.map((m, i) => i === 0 ? m : '<span>· '+m+'</span>').join('')+'</span>'+
      (info.length ? '<span class="info">'+info.join('')+'</span>' : '')+
      (s.saude && String(s.saude).trim() ? '<span class="care">Saúde: '+esc(s.saude)+'</span>' : '')+
      '</span>'+
    '</button>'+
    '<div class="acts"><span class="pill '+st+'" title="Mensalidade de '+esc(monthLabel(ym).toLowerCase())+'">'+pillTxt+'</span></div>'+
  '</div>';
}

function renderAlunos(){
  const D = data(), ym = ymOf(new Date()), today = isoDate(new Date());
  const q = fold(state.alQuery).trim();
  const base = D.students.filter(s => inTurma(s) && (!q || fold(s.nome+' '+(s.mae||'')+' '+(s.pai||'')+' '+(s.tel||'')).indexOf(q) >= 0));
  const flt = {todos:() => true, pago:s => statusOf(s, ym, today) === 'pago', aberto:s => ['pendente','atrasado'].indexOf(statusOf(s, ym, today)) >= 0, saude:s => !!(s.saude && String(s.saude).trim())};
  const chips = [['todos','Todos'],['pago','Pagaram'],['aberto','Em aberto'],['saude','Cuidados de saúde']];
  $('#al-chips').innerHTML = chips.map(c => '<button type="button" class="chip-btn" data-act="al-chip" data-f="'+c[0]+'" data-key="achip:'+c[0]+'" aria-pressed="'+(state.alFilter === c[0])+'">'+c[1]+'<span class="n">'+base.filter(flt[c[0]]).length+'</span></button>').join('');
  $('#al-eyebrow').textContent = D.students.length ? 'Situação de '+monthLabel(ym).toLowerCase() : 'Cadastro';
  const rank = {atrasado:0, pendente:1, isento:2, pago:3};
  const rows = base.filter(flt[state.alFilter] || flt.todos).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const host = $('#al-list');
  if (!state.decided) host.innerHTML = '<div class="empty"><p>Carregando seus alunos…</p></div>';
  else if (!D.students.length) host.innerHTML = '<div class="empty"><strong>Cadastre seu primeiro aluno</strong><p>Nome, faixa, responsáveis, telefone e cuidados de saúde ficam reunidos aqui, junto com a situação da mensalidade.</p><button type="button" class="btn" data-act="new-student" data-key="new-al-empty">Novo aluno</button></div>';
  else if (!rows.length) host.innerHTML = '<div class="empty"><p>Nenhum aluno neste filtro.</p></div>';
  else host.innerHTML = rows.map(s => alunoRowHTML(s, ym, today)).join('');
}

/* eventos: blocos reutilizados no calendário e no financeiro */
function partRowsHTML(ev, today){
  const D = data(), taxa = +ev.taxa || 0, rank = {atrasado:0, pendente:1, isento:2, pago:3};
  const rows = Object.keys(ev.participantes || {}).map(id => D.students.find(s => s.id === id)).filter(Boolean).filter(inTurma)
    .map(s => ({s:s, st:evPartStatus(ev, s.id, today)}))
    .sort((a, b) => rank[a.st] - rank[b.st] || a.s.nome.localeCompare(b.s.nome, 'pt-BR'));
  if (!rows.length) return '<p class="hint">Nenhum aluno inscrito ainda. Use “Editar evento” para escolher os participantes.</p>';
  const pillTxt = {pago:'Pago', pendente:'A pagar', atrasado:'Em atraso', isento:'Sem taxa'};
  return '<div class="prows">'+rows.map(r => {
    const k = 'ep:'+esc(ev.id)+':'+esc(r.s.id);
    const btn = r.st === 'isento' ? '' : '<button type="button" class="btn sm'+(r.st === 'pago' ? ' ghost' : '')+'" data-act="toggle-ev-pay" data-ev="'+esc(ev.id)+'" data-sid="'+esc(r.s.id)+'" data-key="'+k+'">'+(r.st === 'pago' ? 'Desfazer' : 'Receber')+'</button>';
    const belt = r.s.faixa && BELT_COLOR[r.s.faixa] ? ' style="--belt:'+BELT_COLOR[r.s.faixa]+'"' : '';
    return '<div class="prow"><span class="avatar sm"'+belt+' aria-hidden="true">'+esc(initials(r.s.nome))+'</span>'+
      '<span class="p-name">'+esc(r.s.nome)+'<em>'+esc(r.s.turma || 'Sem turma')+'</em></span>'+
      '<span class="pill '+r.st+'">'+pillTxt[r.st]+'</span>'+btn+'</div>';
  }).join('')+'</div>';
}
function eventHTML(ev, mode){
  const today = isoDate(new Date()), t = evTotals(ev, validIds(), today), taxa = +ev.taxa || 0, full = mode === 'full';
  const facts = [['Data', cap(fromISO(ev.date).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}))+(ev.hora ? ', '+esc(ev.hora) : '')]];
  if (ev.local) facts.push(['Local', esc(ev.local)]);
  facts.push(['Taxa por aluno', taxa > 0 ? BRL.format(taxa) : 'Sem taxa']);
  if (taxa > 0) facts.push(['Pagar até', fmtBR(ev.prazo || ev.date)]);
  facts.push(['Inscritos', String(t.n)]);
  const sum = taxa > 0
    ? '<div class="evt-sum"><div class="bar" role="img" aria-label="'+t.pct+'% recebido"><i style="width:'+t.pct+'%"></i></div><span><b>'+t.nPaid+' de '+t.n+'</b> pagaram · recebido <b>'+BRL.format(t.rec)+'</b> · falta <b>'+BRL.format(t.falta)+'</b>'+(t.nLate ? ' · <b>'+t.nLate+'</b> em atraso' : '')+'</span></div>'
    : '<p class="hint">Evento sem taxa de inscrição.</p>';
  const k = esc(ev.id);
  const acts = full
    ? '<div class="evt-acts"><button type="button" class="btn ghost sm" data-act="edit-event" data-id="'+k+'" data-key="ee:'+k+'">Editar evento</button><button type="button" class="btn danger sm" data-act="del-event" data-id="'+k+'" data-key="ed:'+k+'">Excluir evento</button></div>'
    : '<div class="evt-acts"><button type="button" class="btn ghost sm" data-act="open-event" data-id="'+k+'" data-key="eo:'+k+'">Abrir no calendário '+ARROW+'</button></div>';
  return '<article class="evt '+evClass(ev)+'" aria-label="'+esc(ev.titulo)+'">'+
    '<div class="evt-h"><span class="tag-ev '+evClass(ev)+'">'+esc(evLabel(ev))+'</span><span class="when">'+untilLabel(daysUntil(ev.date, today))+'</span></div>'+
    '<h3>'+esc(ev.titulo)+'</h3>'+
    '<dl class="facts">'+facts.map(f => '<div><dt>'+f[0]+'</dt><dd>'+f[1]+'</dd></div>').join('')+'</dl>'+
    (full && ev.obs ? '<p class="evt-note">'+esc(ev.obs)+'</p>' : '')+
    sum+
    '<div><h4 class="sub-h" style="margin-bottom:6px">Participantes e pagamento</h4>'+partRowsHTML(ev, today)+'</div>'+
    acts+
  '</article>';
}

function renderFinance(){
  const D = data(), ym = state.finMonth, today = isoDate(new Date());
  $('#fin-label').textContent = monthLabel(ym);
  const S = D.students.filter(inTurma), all = rowsFor(S, ym), t = totalsFor(all, ym, today);

  $('#kpis').innerHTML =
    '<div class="tile main"><div class="lbl">Recebido em '+MES[+ym.slice(5)-1]+'</div><div class="val">'+BRL.format(t.rec)+'</div>'+
      '<div class="bar" role="img" aria-label="'+t.pct+'% do previsto recebido"><i style="width:'+t.pct+'%"></i></div>'+
      '<div class="sub">'+(t.expected ? t.pct+'% dos '+BRL.format(t.expected)+' previstos' : 'Nenhuma mensalidade prevista')+'</div></div>'+
    '<div class="tile"><div class="lbl">A vencer</div><div class="val">'+BRL.format(t.pend)+'</div><div class="sub">'+t.nPend+(t.nPend === 1 ? ' aluno' : ' alunos')+'</div></div>'+
    '<div class="tile"><div class="lbl">Em atraso</div><div class="val'+(t.nLate ? ' late' : '')+'">'+BRL.format(t.late)+'</div><div class="sub">'+t.nLate+(t.nLate === 1 ? ' aluno' : ' alunos')+'</div></div>';

  const months = []; for (let i = 5; i >= 0; i--) months.push(addMonths(ym, -i));
  const vals = months.map(m => recByMonth(S, m)), max = Math.max.apply(null, vals.concat([1]));
  $('#chart').innerHTML = '<div class="lbl">Recebido nos últimos 6 meses (R$)</div>'+
    '<div class="bars" role="img" aria-label="Recebido por mês: '+months.map((m, i) => MES[+m.slice(5)-1]+' '+Math.round(vals[i])).join(', ')+'">'+
    months.map((m, i) => '<div class="col'+(m === ym ? ' sel' : '')+'"><span class="v">'+shortMoney(vals[i])+'</span><span class="b" style="height:'+(vals[i] > 0 ? Math.max(3, Math.round(vals[i]/max*88)) : 2)+'px"></span><span class="m">'+MES[+m.slice(5)-1]+'</span></div>').join('')+'</div>';

  const q = fold(state.finQuery).trim();
  const base = all.filter(s => (!q || fold(s.nome+' '+(s.mae||'')+' '+(s.pai||'')).indexOf(q) >= 0));
  const cnt = {todos:base.length, atrasado:0, pendente:0, pago:0};
  base.forEach(s => { const st = statusOf(s, ym, today); if (cnt[st] != null) cnt[st]++; });
  const chips = [['todos','Todos'],['atrasado','Em atraso'],['pendente','A vencer'],['pago','Pagos']];
  $('#fin-chips').innerHTML = chips.map(c => '<button type="button" class="chip-btn" data-act="chip" data-f="'+c[0]+'" data-key="chip:'+c[0]+'" aria-pressed="'+(state.finFilter === c[0])+'">'+c[1]+'<span class="n">'+cnt[c[0]]+'</span></button>').join('');

  const rank = {atrasado:0, pendente:1, isento:2, pago:3};
  const rows = base.filter(s => state.finFilter === 'todos' || statusOf(s, ym, today) === state.finFilter)
    .sort((a, b) => rank[statusOf(a, ym, today)] - rank[statusOf(b, ym, today)] || a.nome.localeCompare(b.nome, 'pt-BR'));
  const host = $('#list');
  if (!state.decided) host.innerHTML = '<div class="empty"><p>Carregando seus alunos…</p></div>';
  else if (!D.students.length) host.innerHTML = '<div class="empty"><strong>Nenhum aluno cadastrado</strong><p>Cadastre os alunos na aba Alunos. As mensalidades de cada mês aparecem aqui para você marcar os pagamentos.</p><button type="button" class="btn" data-act="go-alunos">Ir para alunos</button></div>';
  else if (!rows.length) host.innerHTML = '<div class="empty"><p>Nenhum aluno neste filtro.</p></div>';
  else host.innerHTML = rows.map(s => rowHTML(s, ym, today)).join('');

  /* eventos no financeiro */
  const valid = validIds();
  const evs = visEvents().filter(e => e.date >= today || evTotals(e, valid, today).falta > 0).sort(cmpEvent).slice(0, 8);
  const falta = evs.reduce((a, e) => a + evTotals(e, valid, today).falta, 0);
  $('#ev-fin-sum').textContent = state.decided && evs.length && falta > 0 ? 'A receber de eventos: '+BRL.format(falta) : '';
  const eh = $('#ev-fin');
  if (!state.decided) eh.innerHTML = '';
  else if (!evs.length) eh.innerHTML = '<div class="card empty"><strong>Nenhum evento com pagamento em aberto</strong><p>Cadastre competições e exames de faixa na aba Planejamento e eventos. Os alunos inscritos aparecem aqui com o controle de pagamento.</p><button type="button" class="btn ghost" data-act="go-plan">Ir para o calendário '+ARROW+'</button></div>';
  else eh.innerHTML = evs.map(e => eventHTML(e, 'compact')).join('');
}

function monthLessons(){
  const D = data();
  return D.lessons.filter(l => l.date.indexOf(state.planMonth) === 0 && (!state.turma || l.turma === state.turma)).sort(cmpLesson);
}

function renderTurmas(){
  const D = data(), host = $('#tu-grid'), today = isoDate(new Date()), ym = ymOf(new Date());
  if (!state.decided) { host.innerHTML = ''; return; }
  const list = turmaObjs();
  if (!list.length) { host.innerHTML = '<div class="card empty" style="grid-column:1/-1"><strong>Crie sua primeira turma</strong><p>Defina o nome, os dias da semana e o horário. A grade aparece no calendário e você filtra alunos, finanças e aulas por turma.</p><button type="button" class="btn" data-act="new-turma" data-key="new-tu-empty">Nova turma</button></div>'; return; }
  host.innerHTML = list.map(t => {
    const al = D.students.filter(s => s.turma === t.nome && s.ativo !== false);
    const tot = totalsFor(rowsFor(al, ym), ym, today), nl = D.lessons.filter(l => l.turma === t.nome && l.date.indexOf(ym) === 0).length;
    const nx = nextClassISO(t, today), when = turmaWhen(t), k = esc(t.nome);
    return '<article class="tcard'+(state.turma === t.nome ? ' sel' : '')+'" style="--tc:'+turmaColor(t.nome)+'" aria-label="Turma '+k+'">'+
      '<div class="tc-h">'+tdot(t.nome)+'<h3>'+k+'</h3></div>'+
      '<p class="tc-when">'+(when ? esc(when) : 'Dias ainda não definidos')+'</p>'+
      (t.local ? '<p class="tc-sub">'+esc(t.local)+'</p>' : '')+
      (nx ? '<p class="tc-sub">Próxima aula: '+untilLabel(daysUntil(nx, today))+' · '+evDateShort(nx)+'</p>' : '')+
      '<div class="tc-stats"><div><b>'+al.length+'</b><span>'+(al.length === 1 ? 'aluno' : 'alunos')+'</span></div><div><b>'+tot.nPaid+'</b><span>pagaram</span></div><div><b>'+tot.nLate+'</b><span>em atraso</span></div></div>'+
      '<p class="tc-sub">'+nl+(nl === 1 ? ' aula registrada' : ' aulas registradas')+' em '+MES[+ym.slice(5)-1]+'</p>'+
      (t.obs ? '<p class="tc-sub">'+esc(t.obs)+'</p>' : '')+
      '<div class="tc-acts"><button type="button" class="btn sm" data-act="go-turma-alunos" data-name="'+k+'" data-key="tca:'+k+'">Ver alunos</button>'+
      '<button type="button" class="btn ghost sm" data-act="go-turma-plan" data-name="'+k+'" data-key="tcp:'+k+'">Calendário</button>'+
      '<button type="button" class="btn ghost sm" data-act="edit-turma" data-id="'+esc(t.id || '')+'" data-name="'+k+'" data-key="tce:'+k+'">'+(t.id ? 'Editar' : 'Definir dias')+'</button></div>'+
    '</article>';
  }).join('');
}

function renderUpcoming(){
  const host = $('#ev-up'), today = isoDate(new Date());
  if (!state.decided) { host.innerHTML = ''; return; }
  const up = upcomingEvents().slice(0, 4), valid = validIds();
  if (!up.length) { host.innerHTML = '<div class="card empty" style="grid-column:1/-1"><strong>Nenhum evento marcado</strong><p>Cadastre competições e exames de faixa para ver data, local, inscritos e pagamentos assim que abrir esta aba.</p><button type="button" class="btn" data-act="new-event" data-key="newev-empty">Novo evento</button></div>'; return; }
  host.innerHTML = up.map(e => {
    const t = evTotals(e, valid, today), taxa = +e.taxa || 0, k = esc(e.id);
    return '<button type="button" class="evcard '+evClass(e)+'" data-act="open-event" data-id="'+k+'" data-key="uc:'+k+'">'+
      '<span class="evc-top"><span class="tag-ev '+evClass(e)+'">'+esc(evLabel(e))+'</span><span class="when">'+untilLabel(daysUntil(e.date, today))+'</span></span>'+
      '<strong class="evc-t">'+esc(e.titulo)+'</strong>'+
      '<span class="evc-m">'+evDateShort(e.date)+(e.hora ? ' · '+esc(e.hora) : '')+'</span>'+
      (e.local ? '<span class="evc-m">'+esc(e.local)+'</span>' : '')+
      '<span class="evc-foot"><span>'+(taxa > 0 ? BRL.format(taxa)+' por aluno' : 'Sem taxa')+'</span><span>'+t.n+(t.n === 1 ? ' inscrito' : ' inscritos')+'</span></span>'+
      (taxa > 0 && t.n ? '<span class="bar"><i style="width:'+t.pct+'%"></i></span><span class="evc-pay">'+t.nPaid+' de '+t.n+' pagaram</span>' : '')+
    '</button>';
  }).join('');
}

function renderPlanning(){
  const D = data(), ym = state.planMonth, today = isoDate(new Date());
  $('#plan-label').textContent = monthLabel(ym);
  fillLessonTurma();
  if (state.selDay.indexOf(ym) !== 0) state.selDay = (today.indexOf(ym) === 0) ? today : ym+'-01';
  renderUpcoming();
  const grade = state.turma ? turmaObjs().filter(t => t.nome === state.turma) : turmaObjs();
  const ls = monthLessons(), byDay = {}, evByDay = {};
  ls.forEach(l => { (byDay[l.date] = byDay[l.date] || []).push(l); });
  const evs = monthEvents();
  evs.forEach(e => { (evByDay[e.date] = evByDay[e.date] || []).push(e); });
  $('#cal').innerHTML = monthGrid(ym).map(iso => {
    if (!iso) return '<div></div>';
    const li = byDay[iso] || [], ei = evByDay[iso] || [], n = li.length + ei.length, pl = turmaPlannedOn(grade, iso);
    const parts = [];
    if (ei.length) parts.push(ei.length+(ei.length === 1 ? ' evento' : ' eventos'));
    if (li.length) parts.push(li.length+(li.length === 1 ? ' aula registrada' : ' aulas registradas'));
    if (pl.length) parts.push('aula prevista: '+pl.map(t => t.nome).join(', '));
    const label = fromISO(iso).toLocaleDateString('pt-BR',{day:'numeric',month:'long'})+', '+(parts.length ? parts.join(', ') : 'sem registros');
    const chips = ei.map(e => '<span class="chip ev '+evClass(e)+'">'+esc(e.titulo)+'</span>').concat(li.map(l => '<span class="chip">'+esc(l.tema)+'</span>'));
    return '<button type="button" class="day'+(iso === today ? ' today' : '')+(iso === state.selDay ? ' sel' : '')+'" data-act="day" data-iso="'+iso+'" data-key="day:'+iso+'" aria-pressed="'+(iso === state.selDay)+'" aria-label="'+esc(label)+'">'+
      '<span class="n">'+(+iso.slice(8))+'</span>'+
      (n ? chips.slice(0,2).join('')+(n > 2 ? '<span class="more">+'+(n-2)+'</span>' : '') : '')+
      (pl.length ? '<span class="plan">'+pl.slice(0,4).map(t => '<i style="--tc:'+turmaColor(t.nome)+'"></i>').join('')+'</span>' : '')+
      (n ? '<span class="dots">'+ei.slice(0,2).map(() => '<i class="e"></i>').join('')+li.slice(0,3).map(() => '<i></i>').join('')+'</span>' : '')+
    '</button>';
  }).join('');
  renderDay(grade);
  renderSummary(ls, evs);
}

function renderDay(grade){
  const D = data(), iso = state.selDay;
  $('#day-label').textContent = cap(fromISO(iso).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}));
  const evs = D.events.filter(e => e.date === iso && evVisible(e)).sort(cmpEvent);
  $('#day-events').innerHTML = evs.map(e => eventHTML(e, 'full')).join('');
  const allLessons = D.lessons.filter(l => l.date === iso);
  const pl = turmaPlannedOn(grade || turmaObjs(), iso);
  $('#day-plan').innerHTML = pl.length ? '<h4 class="sub-h" style="margin-bottom:4px">Grade do dia</h4><div class="planrows">'+pl.map(t => {
    const done = allLessons.some(l => l.turma === t.nome), k = esc(t.nome);
    return '<div class="planrow"><span class="p-name"><span class="tl">'+tdot(t.nome)+k+'</span><em>'+esc([t.hora ? (t.fim ? t.hora+'–'+t.fim : t.hora) : '', t.local || ''].filter(Boolean).join(' · ') || 'Aula prevista')+'</em></span>'+
      (done ? '<span class="pill pago">Registrada</span>' : '<button type="button" class="btn sm" data-act="plan-reg" data-name="'+k+'" data-key="pr:'+k+'">Registrar aula</button>')+'</div>';
  }).join('')+'</div>' : '';
  const items = allLessons.filter(l => !state.turma || l.turma === state.turma).sort(cmpLesson);
  $('#day-list').innerHTML = items.length ? items.map(l =>
    '<article class="lesson"><div class="lesson-h"><strong>'+esc(l.tema)+'</strong>'+(l.turma ? '<span class="tag tl">'+tdot(l.turma)+esc(l.turma)+'</span>' : '')+'</div>'+
    (l.conteudo ? '<p>'+esc(l.conteudo)+'</p>' : '')+
    (l.proxima ? '<div class="next">Próxima aula: '+esc(l.proxima)+'</div>' : '')+
    '<div class="lesson-acts"><button type="button" class="btn ghost sm" data-act="edit-lesson" data-id="'+esc(l.id)+'" data-key="le:'+esc(l.id)+'">Editar</button>'+
    '<button type="button" class="btn danger sm" data-act="del-lesson" data-id="'+esc(l.id)+'" data-key="ld:'+esc(l.id)+'">Excluir</button></div></article>'
  ).join('') : '<p class="hint">Nenhuma aula registrada neste dia. Preencha o tema abaixo para registrar.</p>';
}

function renderSummary(ls, evs){
  const ym = state.planMonth, host = $('#summary');
  const title = '<h3 id="sum-title">Resumo de '+esc(monthLabel(ym).toLowerCase())+'</h3>';
  if (!state.decided) { host.innerHTML = title+'<p class="hint">Carregando…</p>'; return; }
  if (!ls.length && !evs.length) { host.innerHTML = title+'<p class="hint">Registre a primeira aula ou evento do mês e o resumo aparece aqui, já organizado por tema e por semana.</p>'; return; }
  const th = themeCounts(ls), days = new Set(ls.map(l => l.date)).size, weeks = groupWeeks(ls, ym), topN = th.length ? th[0].n : 0;
  const evBlock = evs.length ? '<div><h4>Eventos do mês</h4><div class="weeks"><ul>'+evs.map(e => '<li><span class="d">'+e.date.slice(8)+'/'+e.date.slice(5,7)+'</span><span>'+esc(e.titulo)+' <em>· '+esc(evLabel(e))+'</em></span></li>').join('')+'</ul></div></div>' : '';
  host.innerHTML = title+
    '<div class="mini"><div><b>'+ls.length+'</b><span>'+(ls.length === 1 ? 'aula' : 'aulas')+'</span></div><div><b>'+days+'</b><span>'+(days === 1 ? 'dia' : 'dias')+' de aula</span></div><div><b>'+evs.length+'</b><span>'+(evs.length === 1 ? 'evento' : 'eventos')+'</span></div></div>'+
    evBlock+
    (th.length ? '<div><h4>Temas do mês</h4><div class="themes">'+th.map(t => '<span class="theme'+(t.n === topN && topN > 1 ? ' top' : '')+'">'+esc(t.label)+(t.n > 1 ? '<b>'+t.n+'×</b>' : '')+'</span>').join('')+'</div></div>' : '')+
    (weeks.length ? '<div><h4>Semana a semana</h4><div class="weeks">'+weeks.map(w => '<div><div class="wk-h">'+esc(w.label)+'</div><ul>'+w.lessons.map(l => '<li><span class="d">'+l.date.slice(8)+'/'+l.date.slice(5,7)+'</span><span>'+esc(l.tema)+(l.turma ? ' <em>· '+esc(l.turma)+'</em>' : '')+'</span></li>').join('')+'</ul></div>').join('')+'</div></div>' : '')+
    '<div class="sum-actions"><button type="button" class="btn ghost sm" data-act="copy-summary" data-key="copy">Copiar resumo</button></div>'+
    '<textarea id="copy-fallback" class="sr" readonly aria-label="Resumo para copiar"></textarea>';
}

function render(){
  const a = document.activeElement, fk = a && a.dataset ? a.dataset.key : null;
  renderTbar(); renderChrome(); renderAlunos(); renderTurmas(); renderFinance(); renderPlanning();
  if (sheet.open && sheet.kind === 'student') refreshPayGrid();
  if (fk) { const el = document.querySelector('[data-key="'+(window.CSS && CSS.escape ? CSS.escape(fk) : fk)+'"]'); if (el && el !== document.activeElement) el.focus({preventScroll:true}); }
}

/* ---------- ficha do aluno ---------- */
function turmaSelectHTML(id, cur){
  const names = turmas(); if (cur && names.indexOf(cur) < 0) names.push(cur);
  return '<select id="'+id+'" style="width:100%"><option value="">Sem turma</option>'+names.map(n => '<option value="'+esc(n)+'"'+(n === cur ? ' selected' : '')+'>'+esc(n)+'</option>').join('')+'</select>';
}
function sheetHTML(v, isEdit){
  return '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">'+
    '<div class="sheet-h"><h3 id="sheet-title">'+(isEdit ? 'Ficha do aluno' : 'Novo aluno')+'</h3><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<form id="student-form" novalidate>'+
      '<fieldset><legend>Aluno</legend>'+
        '<div class="field"><label for="sf-nome">Nome completo</label><input id="sf-nome" type="text" maxlength="120" value="'+esc(v.nome)+'" autocomplete="off"></div>'+
        '<div class="grid2"><div class="field"><label for="sf-turma">Turma</label>'+turmaSelectHTML('sf-turma', v.turma)+'</div>'+
        '<div class="field"><label for="sf-faixa">Faixa atual</label><select id="sf-faixa" style="width:100%">'+BELTS.map(b => '<option value="'+b[0]+'"'+((v.faixa || '') === b[0] ? ' selected' : '')+'>'+b[1]+'</option>').join('')+'</select></div></div>'+
        '<div class="field"><label for="sf-nasc">Data de nascimento</label><input id="sf-nasc" type="date" value="'+esc(v.nasc)+'"></div>'+
        '<div class="field"><label for="sf-saude">Saúde e cuidados</label><textarea id="sf-saude" maxlength="1000" placeholder="Alergias, asma, lesões, medicamentos">'+esc(v.saude)+'</textarea></div>'+
        '<div class="field"><label for="sf-obs">Observações</label><textarea id="sf-obs" maxlength="1000">'+esc(v.obs)+'</textarea></div>'+
      '</fieldset>'+
      '<fieldset><legend>Responsáveis</legend>'+
        '<div class="grid2"><div class="field"><label for="sf-mae">Nome da mãe</label><input id="sf-mae" type="text" maxlength="120" value="'+esc(v.mae)+'" autocomplete="off"></div>'+
        '<div class="field"><label for="sf-pai">Nome do pai</label><input id="sf-pai" type="text" maxlength="120" value="'+esc(v.pai)+'" autocomplete="off"></div></div>'+
        '<div class="field"><label for="sf-tel">Telefone para contato</label><input id="sf-tel" type="tel" maxlength="30" value="'+esc(v.tel)+'" autocomplete="off"></div>'+
      '</fieldset>'+
      '<fieldset><legend>Mensalidade</legend>'+
        '<div class="grid2"><div class="field"><label for="sf-valor">Valor (R$)</label><input id="sf-valor" type="number" inputmode="decimal" min="0" step="0.01" value="'+esc(v.valor)+'" placeholder="0,00"></div>'+
        '<div class="field"><label for="sf-venc">Dia do vencimento</label><input id="sf-venc" type="number" inputmode="numeric" min="1" max="31" step="1" value="'+esc(v.venc)+'"></div></div>'+
        '<div class="field"><label for="sf-inicio">Aluno desde</label><input id="sf-inicio" type="month" value="'+esc(v.inicio)+'" placeholder="AAAA-MM"></div>'+
        '<label class="check"><input id="sf-ativo" type="checkbox"'+(v.ativo !== false ? ' checked' : '')+'>Aluno ativo</label>'+
      '</fieldset>'+
      (isEdit ? '<div><div class="pay-h"><span class="lbl-s">Pagamentos de <span id="pay-year"></span></span></div><div class="paygrid" id="paygrid"></div></div>' : '')+
      '<div class="err" id="sf-err" role="alert"></div>'+
      '<div class="form-acts"><button type="submit" class="btn">Salvar</button><button type="button" class="btn ghost" data-act="close-sheet">Cancelar</button>'+
      (isEdit ? '<button type="button" class="btn danger" data-act="del-student" id="del-student">Excluir aluno</button>' : '')+'</div>'+
    '</form></div>';
}

function openSheet(html, firstId, kind, id){
  sheet.open = true; sheet.kind = kind; sheet.id = id; sheet.opener = document.activeElement;
  const ov = $('#overlay'); ov.innerHTML = html; ov.hidden = false;
  document.body.style.overflow = 'hidden';
  const f = $(firstId); if (f) f.focus();
}
function openStudent(id){
  const D = data(), s = id ? D.students.find(x => x.id === id) : null;
  if (id && !s) return;
  const v = s || {nome:'', turma:state.turma || '', faixa:'', nasc:'', mae:'', pai:'', tel:'', saude:'', obs:'', valor:'', venc:5, inicio:ymOf(new Date()), ativo:true};
  openSheet(sheetHTML(v, !!s), '#sf-nome', 'student', s ? s.id : null);
  if (s) refreshPayGrid();
}
function closeSheet(){
  if (!sheet.open) return;
  sheet.open = false; sheet.id = null; sheet.kind = '';
  const ov = $('#overlay'); ov.hidden = true; ov.innerHTML = '';
  document.body.style.overflow = '';
  if (sheet.opener && document.contains(sheet.opener)) { try { sheet.opener.focus({preventScroll:true}); } catch(e){} }
}
function refreshPayGrid(){
  const host = $('#paygrid'); if (!host || !sheet.id) return;
  const D = data(), s = D.students.find(x => x.id === sheet.id);
  if (!s) { closeSheet(); return; }
  const year = +state.finMonth.slice(0,4), today = isoDate(new Date());
  $('#pay-year').textContent = year;
  host.innerHTML = MES.map((m, i) => {
    const ym = year+'-'+pad(i+1), st = statusOf(s, ym, today), before = !!(s.inicio && ym < s.inicio && !(s.pay && s.pay[ym])), p = s.pay && s.pay[ym];
    const txt = before ? '—' : p ? 'Pago' : st === 'atrasado' ? 'Atrasado' : st === 'isento' ? 'Isento' : 'Aberto';
    return '<button type="button" class="pm '+(before ? 'na' : st)+'" data-act="pay-month" data-ym="'+ym+'" data-key="pm:'+ym+'" aria-pressed="'+(!!p)+'"'+(before || st === 'isento' && !p ? ' disabled' : '')+'><span class="pm-m">'+m+'</span><span class="pm-s">'+txt+'</span></button>';
  }).join('');
}
function togglePay(id, ym){
  const D = data(), s = D.students.find(x => x.id === id); if (!s) return Promise.resolve();
  const pay = Object.assign({}, s.pay || {});
  if (pay[ym]) delete pay[ym]; else pay[ym] = {v:+s.valor || 0, d:isoDate(new Date())};
  return act.saveStudent(Object.assign({}, s, {pay:pay}));
}
function saveStudentForm(){
  const D = data(), err = $('#sf-err');
  const nome = $('#sf-nome').value.trim();
  if (!nome) { err.textContent = 'Informe o nome do aluno.'; $('#sf-nome').focus(); return; }
  const valor = parseFloat(String($('#sf-valor').value).replace(',', '.')) || 0;
  if (valor < 0) { err.textContent = 'O valor da mensalidade não pode ser negativo.'; $('#sf-valor').focus(); return; }
  const venc = Math.floor(+$('#sf-venc').value);
  if (!(venc >= 1 && venc <= 31)) { err.textContent = 'Informe o dia do vencimento entre 1 e 31.'; $('#sf-venc').focus(); return; }
  let inicio = $('#sf-inicio').value.trim();
  if (!/^\d{4}-\d{2}$/.test(inicio)) inicio = ymOf(new Date());
  const cur = sheet.id ? D.students.find(x => x.id === sheet.id) : null;
  const s = Object.assign({}, cur || {pay:{}, criado:Date.now()}, {
    id: cur ? cur.id : uid(), nome:nome, turma:$('#sf-turma').value.trim(), faixa:$('#sf-faixa').value, nasc:$('#sf-nasc').value, saude:$('#sf-saude').value.trim(), obs:$('#sf-obs').value.trim(),
    mae:$('#sf-mae').value.trim(), pai:$('#sf-pai').value.trim(), tel:$('#sf-tel').value.trim(), valor:valor, venc:venc, inicio:inicio, ativo:$('#sf-ativo').checked
  });
  closeSheet(); act.saveStudent(s);
}

/* ---------- eventos: cadastro e pagamento ---------- */
function eventSheetHTML(v, isEdit){
  const D = data(), parts = v.participantes || {};
  const list = D.students.filter(s => s.ativo !== false || parts[s.id]).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const ts = Array.from(new Set(list.map(s => s.turma).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const picks = list.length ? list.map(s => {
    const p = parts[s.id], paid = !!(p && p.pago), belt = s.faixa && BELT_COLOR[s.faixa] ? ' style="--belt:'+BELT_COLOR[s.faixa]+'"' : '';
    return '<label class="prow pick" data-name="'+esc(fold(s.nome))+'" data-turma="'+esc(s.turma || '')+'"><input type="checkbox" class="pchk" value="'+esc(s.id)+'"'+(p ? ' checked' : '')+(paid ? ' disabled' : '')+'>'+
      '<span class="avatar sm"'+belt+' aria-hidden="true">'+esc(initials(s.nome))+'</span><span class="p-name">'+esc(s.nome)+'<em>'+esc(s.turma || 'Sem turma')+'</em></span>'+(paid ? '<span class="pill pago">Pago</span>' : '')+'</label>';
  }).join('') : '<p class="hint" style="padding:10px 0">Cadastre alunos na aba Alunos para inscrevê-los em eventos.</p>';
  return '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">'+
    '<div class="sheet-h"><h3 id="sheet-title">'+(isEdit ? 'Editar evento' : 'Novo evento')+'</h3><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<form id="event-form" novalidate>'+
      '<fieldset><legend>Evento</legend>'+
        '<div class="field"><label for="ef-titulo">Nome do evento</label><input id="ef-titulo" type="text" maxlength="120" value="'+esc(v.titulo)+'" placeholder="Ex.: Campeonato Estadual" autocomplete="off"></div>'+
        '<div class="grid2"><div class="field"><label for="ef-tipo">Tipo</label><select id="ef-tipo" style="width:100%">'+Object.keys(EV_LABEL).map(k => '<option value="'+k+'"'+(v.tipo === k ? ' selected' : '')+'>'+EV_LABEL[k]+'</option>').join('')+'</select></div>'+
        '<div class="field"><label for="ef-local">Local</label><input id="ef-local" type="text" maxlength="120" value="'+esc(v.local)+'" autocomplete="off"></div></div>'+
        '<div class="grid2"><div class="field"><label for="ef-data">Data</label><input id="ef-data" type="date" value="'+esc(v.date)+'"></div>'+
        '<div class="field"><label for="ef-hora">Horário</label><input id="ef-hora" type="time" value="'+esc(v.hora)+'"></div></div>'+
        '<div class="field"><label for="ef-obs">Observações</label><textarea id="ef-obs" maxlength="1000" placeholder="Pesagem, o que levar, regras">'+esc(v.obs)+'</textarea></div>'+
      '</fieldset>'+
      '<fieldset><legend>Taxa de inscrição</legend>'+
        '<div class="grid2"><div class="field"><label for="ef-taxa">Valor por aluno (R$)</label><input id="ef-taxa" type="number" inputmode="decimal" min="0" step="0.01" value="'+esc(v.taxa)+'" placeholder="0,00"></div>'+
        '<div class="field"><label for="ef-prazo">Pagar até</label><input id="ef-prazo" type="date" value="'+esc(v.prazo)+'"></div></div>'+
      '</fieldset>'+
      '<fieldset><legend>Alunos que vão participar <span id="ef-count"></span></legend>'+
        '<div class="pick-tools"><label class="sr" for="ef-q">Buscar aluno</label><input id="ef-q" type="search" placeholder="Buscar aluno" autocomplete="off" style="flex:1 1 160px;width:auto">'+
          ts.map(t => '<button type="button" class="chip-btn" data-act="pick-turma" data-turma="'+esc(t)+'">Marcar '+esc(t)+'</button>').join('')+'</div>'+
        '<div class="pick-list" id="ef-list">'+picks+'</div>'+
        '<p class="hint">Quem já pagou fica marcado. Para tirar o aluno do evento, desfaça o pagamento antes.</p>'+
      '</fieldset>'+
      '<div class="err" id="ef-err" role="alert"></div>'+
      '<div class="form-acts"><button type="submit" class="btn">Salvar evento</button><button type="button" class="btn ghost" data-act="close-sheet">Cancelar</button></div>'+
    '</form></div>';
}
function updateEfCount(){
  const el = $('#ef-count'); if (!el) return;
  const n = $$('#ef-list .pchk:checked').length;
  el.textContent = '· '+n+(n === 1 ? ' selecionado' : ' selecionados');
}
function openEvent(id, dateISO){
  const D = data(), e = id ? D.events.find(x => x.id === id) : null;
  if (id && !e) return;
  const v = e || {titulo:'', tipo:'competicao', date:dateISO || isoDate(new Date()), hora:'', local:'', taxa:'', prazo:'', obs:'', participantes:{}};
  openSheet(eventSheetHTML(v, !!e), '#ef-titulo', 'event', e ? e.id : null);
  updateEfCount();
}
function saveEventForm(){
  const D = data(), err = $('#ef-err');
  const titulo = $('#ef-titulo').value.trim();
  if (!titulo) { err.textContent = 'Informe o nome do evento.'; $('#ef-titulo').focus(); return; }
  const date = $('#ef-data').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { err.textContent = 'Informe a data do evento.'; $('#ef-data').focus(); return; }
  const taxa = parseFloat(String($('#ef-taxa').value).replace(',', '.')) || 0;
  if (taxa < 0) { err.textContent = 'A taxa não pode ser negativa.'; $('#ef-taxa').focus(); return; }
  const prazo = $('#ef-prazo').value;
  const cur = sheet.id ? D.events.find(x => x.id === sheet.id) : null, old = (cur && cur.participantes) || {};
  const shown = new Set($$('#ef-list .pchk').map(c => c.value)), part = {};
  Object.keys(old).forEach(k => { if (!shown.has(k)) part[k] = old[k]; });
  $$('#ef-list .pchk:checked').forEach(c => { part[c.value] = old[c.value] || {pago:false}; });
  const ev = Object.assign({}, cur || {criado:Date.now()}, {
    id: cur ? cur.id : uid(), titulo:titulo, tipo:$('#ef-tipo').value, date:date, hora:$('#ef-hora').value, local:$('#ef-local').value.trim(),
    taxa:taxa, prazo:/^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : '', obs:$('#ef-obs').value.trim(), participantes:part
  });
  closeSheet();
  state.tab = 'planejamento'; state.planMonth = date.slice(0,7); state.selDay = date; resetLessonForm();
  act.saveEvent(ev);
}
function toggleEvPay(evId, sid){
  const e = data().events.find(x => x.id === evId); if (!e) return Promise.resolve();
  const parts = Object.assign({}, e.participantes || {}), p = parts[sid]; if (!p) return Promise.resolve();
  parts[sid] = p.pago ? {pago:false} : {pago:true, em:isoDate(new Date()), v:+e.taxa || 0};
  return act.saveEvent(Object.assign({}, e, {participantes:parts}));
}
function goToEvent(id){
  const e = data().events.find(x => x.id === id); if (!e) return;
  state.tab = 'planejamento'; state.planMonth = e.date.slice(0,7); state.selDay = e.date;
  try { if (location.hash.slice(1) !== 'planejamento') location.hash = 'planejamento'; } catch(x){}
  resetLessonForm(); render();
  const d = $('#day'); if (d) d.scrollIntoView({block:'start'});
}

/* ---------- turmas: cadastro ---------- */
function turmaSheetHTML(v, isEdit){
  const dias = turmaDias(v);
  return '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">'+
    '<div class="sheet-h"><h3 id="sheet-title">'+(isEdit ? 'Editar turma' : 'Nova turma')+'</h3><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<form id="turma-form" novalidate>'+
      '<fieldset><legend>Turma</legend>'+
        '<div class="field"><label for="tf-nome">Nome da turma</label><input id="tf-nome" type="text" maxlength="60" value="'+esc(v.nome)+'" placeholder="Ex.: Sub 13" autocomplete="off"></div>'+
        '<div class="field"><span class="lbl-s" id="tf-dias-l">Dias da semana</span><div class="dpicks" role="group" aria-labelledby="tf-dias-l">'+
          DIA.map((d, i) => '<label class="dpick"><input type="checkbox" class="dchk" value="'+i+'"'+(dias.indexOf(i) >= 0 ? ' checked' : '')+'><span>'+cap(d)+'</span></label>').join('')+'</div></div>'+
        '<div class="grid2"><div class="field"><label for="tf-hora">Início</label><input id="tf-hora" type="time" value="'+esc(v.hora)+'"></div>'+
        '<div class="field"><label for="tf-fim">Término</label><input id="tf-fim" type="time" value="'+esc(v.fim)+'"></div></div>'+
        '<div class="field"><label for="tf-local">Local</label><input id="tf-local" type="text" maxlength="120" value="'+esc(v.local)+'" autocomplete="off"></div>'+
        '<div class="field"><label for="tf-obs">Observações</label><textarea id="tf-obs" maxlength="500" placeholder="Faixa etária, objetivo da turma">'+esc(v.obs)+'</textarea></div>'+
      '</fieldset>'+
      '<div class="err" id="tf-err" role="alert"></div>'+
      '<div class="form-acts"><button type="submit" class="btn">Salvar turma</button><button type="button" class="btn ghost" data-act="close-sheet">Cancelar</button>'+
      (isEdit ? '<button type="button" class="btn danger" data-act="del-turma">Excluir turma</button>' : '')+'</div>'+
    '</form></div>';
}
function openTurma(id, implName){
  const D = data(), t = id ? (D.turmas || []).find(x => x.id === id) : null;
  if (id && !t) return;
  const v = t || {nome:implName || '', dias:[], hora:'', fim:'', local:'', obs:''};
  openSheet(turmaSheetHTML(v, !!t), t || implName ? '#tf-hora' : '#tf-nome', 'turma', t ? t.id : null);
  sheet.impl = t ? '' : (implName || '');
}
function saveTurmaForm(){
  const D = data(), err = $('#tf-err');
  const nome = $('#tf-nome').value.trim();
  if (!nome) { err.textContent = 'Informe o nome da turma.'; $('#tf-nome').focus(); return; }
  const dup = turmaObjs().find(t => fold(t.nome) === fold(nome) && (sheet.id ? t.id !== sheet.id : fold(t.nome) !== fold(sheet.impl || '')));
  if (dup) { err.textContent = 'Já existe uma turma com esse nome.'; $('#tf-nome').focus(); return; }
  const hora = $('#tf-hora').value, fim = $('#tf-fim').value;
  if (hora && fim && fim <= hora) { err.textContent = 'O término precisa ser depois do início.'; $('#tf-fim').focus(); return; }
  const cur = sheet.id ? (D.turmas || []).find(x => x.id === sheet.id) : null;
  const dias = $$('#turma-form .dchk:checked').map(c => +c.value);
  const t = Object.assign({}, cur || {criado:Date.now()}, {id: cur ? cur.id : uid(), nome:nome, dias:dias, hora:hora, fim:fim, local:$('#tf-local').value.trim(), obs:$('#tf-obs').value.trim()});
  const old = cur ? cur.nome : (sheet.impl && sheet.impl !== nome ? sheet.impl : '');
  closeSheet(); act.saveTurma(t, old);
}

/* ---------- aulas ---------- */
function setLessonTurma(v){
  const sel = $('#lf-turma');
  if (v && !$$('option', sel).some(o => o.value === v)) { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); }
  sel.value = v || '';
}
function fillLessonTurma(){
  const sel = $('#lf-turma'), prev = sel.value, names = turmas();
  sel.innerHTML = '<option value="">Sem turma</option>'+names.map(n => '<option value="'+esc(n)+'">'+esc(n)+'</option>').join('');
  setLessonTurma(prev);
}
function resetLessonForm(){
  state.editLesson = null;
  $('#lf-tema').value = ''; $('#lf-conteudo').value = ''; $('#lf-proxima').value = '';
  setLessonTurma(state.turma || state.lastTurma || '');
  $('#lf-title').textContent = 'Registrar aula'; $('#lf-save').textContent = 'Salvar aula'; $('#lf-cancel').hidden = true; $('#lf-err').textContent = '';
}
function editLesson(id){
  const l = data().lessons.find(x => x.id === id); if (!l) return;
  state.editLesson = id;
  $('#lf-tema').value = l.tema || ''; setLessonTurma(l.turma || ''); $('#lf-conteudo').value = l.conteudo || ''; $('#lf-proxima').value = l.proxima || '';
  $('#lf-title').textContent = 'Editar aula'; $('#lf-save').textContent = 'Salvar alterações'; $('#lf-cancel').hidden = false; $('#lf-err').textContent = '';
  $('#lf-tema').focus(); $('#lesson-form').scrollIntoView({block:'nearest'});
}
function saveLessonForm(){
  if (!state.decided) return;
  const tema = $('#lf-tema').value.trim();
  if (!tema) { $('#lf-err').textContent = 'Informe o tema da aula.'; $('#lf-tema').focus(); return; }
  const cur = state.editLesson ? data().lessons.find(x => x.id === state.editLesson) : null;
  const turma = $('#lf-turma').value;
  const l = Object.assign({}, cur || {}, {id: cur ? cur.id : uid(), date: cur ? cur.date : state.selDay, tema:tema, turma:turma, conteudo:$('#lf-conteudo').value.trim(), proxima:$('#lf-proxima').value.trim(), criado: cur ? (cur.criado || Date.now()) : Date.now()});
  state.lastTurma = turma;
  resetLessonForm(); act.saveLesson(l);
}

/* ---------- resumo, cópia, exportação ---------- */
function monthEvents(){ return data().events.filter(e => e.date.indexOf(state.planMonth) === 0 && evVisible(e)).sort(cmpEvent); }
async function copySummary(){
  const text = summaryText(state.planMonth, monthLessons(), monthEvents());
  try { await navigator.clipboard.writeText(text); toast('Resumo copiado.'); }
  catch(e){
    const ta = $('#copy-fallback');
    if (ta) { ta.classList.remove('sr'); ta.value = text; ta.rows = 8; ta.select(); }
    toast('Não foi possível copiar sozinho. O texto está selecionado abaixo.');
  }
}
function exportCSV(){
  const D = data(), ym = state.finMonth, today = isoDate(new Date());
  const rows = rowsFor(D.students.filter(inTurma), ym).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!rows.length) { toast('Não há mensalidades neste mês para exportar.'); return; }
  const lines = [['Aluno','Turma','Responsável','Telefone','Vencimento','Valor','Situação','Pago em'].map(csvCell).join(';')];
  rows.forEach(s => {
    const p = s.pay && s.pay[ym];
    lines.push([s.nome, s.turma || '', s.mae || s.pai || '', s.tel || '', fmtBR(dueDate(s, ym)), (p ? +p.v || 0 : +s.valor || 0).toFixed(2).replace('.', ','), statusOf(s, ym, today), p && p.d ? fmtBR(p.d) : ''].map(csvCell).join(';'));
  });
  try {
    const blob = new Blob(['﻿'+lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mensalidades-'+ym+'.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { toast('Não foi possível exportar agora.'); }
}

/* ---------- eventos de interface ---------- */
function setTab(t){
  if (TABS.indexOf(t) < 0) return;
  state.tab = t;
  try { if (location.hash.slice(1) !== t) location.hash = t; } catch(e){}
  render();
}
function changeFinMonth(n){ state.finMonth = addMonths(state.finMonth, n); render(); }
function changePlanMonth(n){
  state.planMonth = addMonths(state.planMonth, n);
  const today = isoDate(new Date());
  state.selDay = today.indexOf(state.planMonth) === 0 ? today : state.planMonth+'-01';
  resetLessonForm(); render();
}
const armed = new WeakMap();
function confirmTwice(btn, label){
  if (armed.get(btn)) { clearTimeout(armed.get(btn)); armed.delete(btn); return true; }
  const orig = btn.textContent; btn.textContent = label;
  armed.set(btn, setTimeout(() => { armed.delete(btn); if (document.contains(btn)) btn.textContent = orig; }, 3500));
  return false;
}

document.addEventListener('click', e => {
  const tab = e.target.closest('[data-tab]'); if (tab) { setTab(tab.dataset.tab); return; }
  if (e.target === $('#overlay')) { closeSheet(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  let a = el.dataset.act; const id = el.dataset.id;
  if (a === 'hero-cta') a = el.dataset.target;
  const needsData = ['new-turma','edit-turma','del-turma','plan-reg','new-student','new-event','open-student','toggle-pay','pay-month','del-student','del-lesson','edit-lesson','edit-event','del-event','toggle-ev-pay','open-event'];
  if (needsData.indexOf(a) >= 0 && !state.decided) return;
  switch (a) {
    case 'fin-prev': changeFinMonth(-1); break;
    case 'fin-next': changeFinMonth(1); break;
    case 'plan-prev': changePlanMonth(-1); break;
    case 'plan-next': changePlanMonth(1); break;
    case 'chip': state.finFilter = el.dataset.f; render(); break;
    case 'new-student': openStudent(null); break;
    case 'open-student': openStudent(id); break;
    case 'toggle-pay': togglePay(id, state.finMonth); break;
    case 'pay-month': togglePay(sheet.id, el.dataset.ym); break;
    case 'close-sheet': closeSheet(); break;
    case 'del-student':
      if (confirmTwice(el, 'Confirmar exclusão')) { const sid = sheet.id; closeSheet(); act.delStudent(sid); }
      break;
    case 'new-event': openEvent(null, state.tab === 'planejamento' ? state.selDay : isoDate(new Date())); break;
    case 'edit-event': openEvent(id); break;
    case 'del-event': if (confirmTwice(el, 'Confirmar exclusão')) act.delEvent(id); break;
    case 'toggle-ev-pay': toggleEvPay(el.dataset.ev, el.dataset.sid); break;
    case 'open-event': goToEvent(id); break;
    case 'go-plan': setTab('planejamento'); break;
    case 'go-alunos': setTab('alunos'); break;
    case 'set-turma': state.turma = el.dataset.name || ''; resetLessonForm(); render(); break;
    case 'go-turma-alunos': state.turma = el.dataset.name; state.tab = 'alunos'; try { location.hash = 'alunos'; } catch(x){} render(); window.scrollTo(0, 0); break;
    case 'go-turma-plan': state.turma = el.dataset.name; state.tab = 'planejamento'; try { location.hash = 'planejamento'; } catch(x){} resetLessonForm(); render(); window.scrollTo(0, 0); break;
    case 'new-turma': openTurma(null, ''); break;
    case 'edit-turma': openTurma(id || null, el.dataset.name || ''); break;
    case 'del-turma':
      if (confirmTwice(el, 'Confirmar: alunos ficam sem turma')) { const t = (data().turmas || []).find(x => x.id === sheet.id); closeSheet(); if (t) act.delTurma(t); }
      break;
    case 'plan-reg': setLessonTurma(el.dataset.name); $('#lf-tema').focus(); $('#lesson-form').scrollIntoView({block:'nearest'}); break;
    case 'al-chip': state.alFilter = el.dataset.f; render(); break;
    case 'pick-turma': $$('#ef-list .pick').forEach(r => { if (r.dataset.turma === el.dataset.turma) { const c = $('.pchk', r); if (c && !c.disabled) c.checked = true; } }); updateEfCount(); break;
    case 'day': state.selDay = el.dataset.iso; resetLessonForm(); render(); break;
    case 'edit-lesson': editLesson(id); break;
    case 'del-lesson': if (confirmTwice(el, 'Confirmar exclusão')) { if (state.editLesson === id) resetLessonForm(); act.delLesson(id); } break;
    case 'cancel-edit': resetLessonForm(); break;
    case 'copy-summary': copySummary(); break;
    case 'export': exportCSV(); break;
    case 'logout': logout(); break;
    case 'auth-open': openAuth(el.dataset.mode || 'login'); break;
    case 'auth-mode': authSwitch(el.dataset.mode); break;
    case 'retry-load': if (state.user) enterApp(state.user); break;
  }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'student-form') saveStudentForm();
  else if (e.target.id === 'event-form') saveEventForm();
  else if (e.target.id === 'turma-form') saveTurmaForm();
  else if (e.target.id === 'lesson-form') saveLessonForm();
  else if (e.target.id === 'auth-form') authSubmit();
});
document.addEventListener('input', e => {
  if (e.target.id === 'ef-q') {
    const q = fold(e.target.value).trim();
    $$('#ef-list .pick').forEach(r => { r.hidden = !!q && r.dataset.name.indexOf(q) < 0; });
  }
});
document.addEventListener('change', e => { if (e.target.classList && e.target.classList.contains('pchk')) updateEfCount(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheet.open) { closeSheet(); return; }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.closest && e.target.closest('[role="tablist"]')) {
    const i = TABS.indexOf(state.tab), n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setTab(n); $('#tab-'+n).focus();
  }
});
$('#al-q').addEventListener('input', e => { state.alQuery = e.target.value; renderAlunos(); });
$('#fin-q').addEventListener('input', e => { state.finQuery = e.target.value; renderFinance(); });
window.addEventListener('hashchange', () => { try { const h = location.hash.slice(1); if (TABS.indexOf(h) >= 0 && h !== state.tab) { state.tab = h; render(); } } catch(e){} });

/* ---------- cena do topo: judogi sobre o tatame ---------- */
const SCENE = ['branca','amarela','laranja','verde','azul','marrom','preta'];
function setScene(k){
  const svg = $('#scene'), faixa = SCENE[k], even = k % 2 === 0;
  svg.style.setProperty('--belt', faixa === 'branca' ? '#ffffff' : BELT_COLOR[faixa]);
  svg.style.setProperty('--m-out', even ? '#2f58b8' : '#f3cd3c');
  svg.style.setProperty('--m-in', even ? '#f3cd3c' : '#2f58b8');
  $('#hero-count').textContent = '0'+(k+1)+' / 0'+SCENE.length+' · faixa '+faixa;
}
function startScene(){
  let k = 0; setScene(0);
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calm) setInterval(() => { k = (k + 1) % SCENE.length; setScene(k); }, 2800);
}

/* ---------- início ---------- */
function startDemo(){
  Object.assign(state, emptyData(), {user:null, demo:true, decided:true});
  demoData = makeDemo(); resetLessonForm(); render();
}
function boot(){
  try { const h = location.hash.slice(1); if (TABS.indexOf(h) >= 0) state.tab = h; } catch(e){}
  startScene();
  render();
  try {
    if (/error_code=otp_expired|error=access_denied/.test(location.hash)) { toast('O link expirou ou já foi usado. Peça um novo.'); history.replaceState(null, '', location.pathname+location.search); }
  } catch(e){}
  if (!window.supabase || !window.supabase.createClient) { startDemo(); toast('Não foi possível carregar o sistema de contas. Verifique a conexão e recarregue a página.'); return; }
  sb = window.supabase.createClient(SB_URL, SB_KEY, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((ev, session) => { setTimeout(() => { onAuth(ev, session); }, 0); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !state.user || !state.decided || sheet.open || state.loadError) return;
    if (Date.now() - loadedAt < 30000) return;
    chain.then(() => reload()).catch(() => {});
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
})();
