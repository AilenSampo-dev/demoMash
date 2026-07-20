/* Mash demo — estado compartido ERP ↔ CRM (localStorage) */
const Mash = (function(){
  const STORAGE_KEY = 'mash-demo-v2';
  const BASE = new Date(2026, 6, 13);
  const DURACION = 30, AVISO = 25, HORIZONTE = 30;
  const Q_AVISO = DURACION - AVISO;

  const PRODUCTOS = [
    {id:'reishi',    nom:'Reishi',         nick:'Rei',  theme:'reishi',    sub:'Descanso · inmunidad',  stock:14, min:10, prod:21},
    {id:'melena',    nom:'Melena de León', nick:'Leo',  theme:'melena',    sub:'Foco · memoria',        stock:9,  min:8,  prod:21},
    {id:'cordyceps', nom:'Cordyceps',      nick:'Cory', theme:'cordyceps', sub:'Energía · rendimiento', stock:22, min:15, prod:21},
    {id:'ashwa',     nom:'Ashwagandha',    nick:'Ash',  theme:'ashwa',     sub:'Estrés · cortisol',     stock:6,  min:5,  prod:14},
  ];
  const STOCK_INICIAL = [14, 9, 22, 6];

  const SEED = {
    offset: 0,
    ventasMes: 3,
    lineaSeq: 4,
    clientes: [
      {
        n: 'Lucía Morales', tel: '+54 351 555-0199', z: 'Güemes · Córdoba',
        lineas: [
          {prod:'reishi', d:-5,  para:'propio',  uid:'seed-lucia-propio'},
          {prod:'reishi', d:-30, para:'reserva', uid:'seed-lucia-reserva'}
        ]
      },
      {
        n: 'Marina Fonseca', tel: '+54 351 555-0142', z: 'Alberdi · Córdoba',
        lineas: [
          {prod:'melena', d:-18, para:'propio', uid:'seed-marina-propio'}
        ]
      }
    ],
    ventas: [
      {prod:'Reishi', id:'reishi', cli:'Lucía Morales', zona:'Güemes · Córdoba', cant:1, para:'propio', stock:13, at:-35, remDates:[-10]},
      {prod:'Reishi', id:'reishi', cli:'Lucía Morales', zona:'Güemes · Córdoba', cant:1, para:'reserva', stock:12, at:-35, remDates:[5]},
      {prod:'Melena de León', id:'melena', cli:'Marina Fonseca', zona:'Alberdi · Córdoba', cant:1, para:'propio', stock:8, at:-18, remDates:[7]}
    ],
    log: [
      '<b>08/06</b> Venta · <u>Reishi</u> ×1 (propio) → Lucía · aviso 03/07 · stock: 13',
      '<b>08/06</b> Venta · <u>Reishi</u> ×1 (reserva) → Lucía · aviso 18/07 · stock: 12',
      '<b>25/06</b> Venta · <u>Melena de León</u> ×1 (propio) → Marina · aviso 02/07 · stock: 8',
      '<b>13/07</b> <i>Demo</i> · Lucía y Marina cargadas con historial · probá escribir desde CRM'
    ]
  };

  let offset = 0, ventasMes = 0, lineaSeq = 0;
  let ventasBuscar = '', ventasSoloHoy = false;
  const CLIENTES = [];
  const ventas = [];
  const enviados = new Set();
  const vetados = new Set();

  const P = id => PRODUCTOS.find(p => p.id === id);
  const lineasDe = c => c.lineas || [];
  const quedanLinea = l => DURACION - (l.d + offset);
  const lineaKey = (c, l) => l.uid || (c.n + '|' + l.prod + '|' + l.para + '|' + l.d);
  const fecha = o => { const d = new Date(BASE); d.setDate(d.getDate() + o); return d; };
  const fmt = d => d.toLocaleDateString('es-AR', {day:'numeric', month:'short'});
  const dd = o => { const d = fecha(o); return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0'); };

  function normalizeTel(t){
    return (t || '').replace(/\D/g, '').replace(/^54/, '').replace(/^0/, '');
  }
  function findByTel(tel){
    const n = normalizeTel(tel);
    if (!n) return null;
    return CLIENTES.find(c => {
      const cn = normalizeTel(c.tel);
      return cn === n || cn.endsWith(n) || n.endsWith(cn);
    }) || null;
  }

  function saveState(){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        offset, ventasMes, lineaSeq, ventasBuscar, ventasSoloHoy,
        clientes: CLIENTES,
        ventas,
        enviados: [...enviados],
        vetados: [...vetados],
        stock: PRODUCTOS.map(p => p.stock),
        logHtml: document.getElementById('log') ? document.getElementById('log').innerHTML : ''
      }));
    } catch (e) { /* ignore */ }
  }

  function applySeed(s){
    offset = s.offset;
    ventasMes = s.ventasMes;
    lineaSeq = s.lineaSeq;
    CLIENTES.length = 0;
    s.clientes.forEach(c => CLIENTES.push(JSON.parse(JSON.stringify(c))));
    ventas.length = 0;
    s.ventas.forEach(v => ventas.push({...v, remDates: [...(v.remDates || [])]}));
    enviados.clear();
    vetados.clear();
    PRODUCTOS.forEach((p, i) => { p.stock = STOCK_INICIAL[i]; });
    ventas.forEach(v => {
      const p = P(v.id);
      if (p) p.stock = v.stock;
    });
    ventasBuscar = '';
    ventasSoloHoy = false;
    return s.log || [];
  }

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      offset = s.offset || 0;
      ventasMes = s.ventasMes || 0;
      lineaSeq = s.lineaSeq || 0;
      ventasBuscar = s.ventasBuscar || '';
      ventasSoloHoy = !!s.ventasSoloHoy;
      CLIENTES.length = 0;
      (s.clientes || []).forEach(c => CLIENTES.push(c));
      ventas.length = 0;
      (s.ventas || []).forEach(v => ventas.push(v));
      enviados.clear();
      (s.enviados || []).forEach(k => enviados.add(k));
      vetados.clear();
      (s.vetados || []).forEach(k => vetados.add(k));
      (s.stock || STOCK_INICIAL).forEach((st, i) => { if (PRODUCTOS[i]) PRODUCTOS[i].stock = st; });
      return s.logHtml || '';
    } catch (e) { return false; }
  }

  function offsetRecordatorio(at, para, reservaIdx){
    if (para === 'reserva') return at + AVISO + DURACION * (reservaIdx + 1);
    return at + AVISO;
  }

  function agregarLinea(c, prodId, para){
    const same = lineasDe(c).filter(l => l.prod === prodId && l.para === para).length;
    const d = para === 'reserva' ? -offset - DURACION * (same + 1) : -offset;
    const uid = c.n + '|' + prodId + '|' + para + '|' + offset + '|' + (lineaSeq++);
    c.lineas.push({prod: prodId, d, para, uid});
    return uid;
  }

  function historialCliente(nom, limit){
    return ventas.filter(v => v.cli === nom).slice(0, limit || 5);
  }

  function fichaResumen(c){
    if (!c) return null;
    const lineas = lineasDe(c).map(l => {
      const q = quedanLinea(l);
      const qtxt = q < 0 ? 'vencido' : q + ' d restantes';
      return P(l.prod).nom + ' · ' + l.para + ' · ' + qtxt;
    });
    const hist = historialCliente(c.n, 3).map(v =>
      dd(v.at) + ' · ' + v.prod + (v.cant > 1 ? ' ×' + v.cant : '') + ' (' + v.para + ')'
    );
    return {nombre: c.n, tel: c.tel, zona: c.z, lineas, historial: hist, goteros: lineasDe(c).length};
  }

  function fichaSysText(c){
    const f = fichaResumen(c);
    const ult = f.historial[0] ? ' · última compra: ' + f.historial[0] : '';
    const got = f.lineas.length
      ? f.lineas.join(' · ')
      : 'sin goteros activos';
    return 'Ficha encontrada: ' + f.nombre + ' (' + f.zona + ') · ' + f.goteros + ' gotero' + (f.goteros !== 1 ? 's' : '') + ' activo' + (f.goteros !== 1 ? 's' : '') + ' (' + got + ')' + ult;
  }

  function calcProducto(p){
    const qs = [];
    CLIENTES.forEach(c => lineasDe(c).filter(l => l.prod === p.id).forEach(l => qs.push(quedanLinea(l))));
    const dem = qs.filter(q => q >= 0 && q <= HORIZONTE).length;
    const vencidos = qs.filter(q => q < 0).length;
    const needDays = qs.map(q => Math.max(0, q)).sort((a, b) => a - b);
    const quiebre = needDays.length > p.stock ? needDays[p.stock] : null;
    const arrancar = quiebre === null ? null : quiebre - p.prod;
    const bajoMin = p.stock <= p.min;
    return Object.assign({}, p, {dem, vencidos, quiebre, arrancar, bajoMin, cob: dem === 0 ? 100 : Math.min(100, Math.round(p.stock / dem * 100))});
  }

  function log(html, at){
    const l = document.getElementById('log');
    if (!l) { saveState(); return; }
    const d = document.createElement('div');
    d.innerHTML = '<b>' + dd(at === undefined ? offset : at) + '</b> ' + html;
    l.prepend(d);
    saveState();
  }

  function crearCliente(nom, tel, z){
    nom = (nom || '').trim();
    tel = (tel || '').trim();
    z = (z || '').trim() || '—';
    if (!nom || !tel){ log('<s>Cliente</s> · nombre y WhatsApp son obligatorios'); return false; }
    if (CLIENTES.some(c => c.tel === tel)){ log('<s>Cliente</s> · ya existe un contacto con ese WhatsApp'); return false; }
    CLIENTES.push({n:nom, tel, z, lineas:[]});
    log('Cliente nuevo · <u>' + nom.split(' ')[0] + '</u> · ' + tel + ' · ' + z);
    saveState();
    return true;
  }

  function registrarVenta(id, clienteNom, cant, para){
    const p = P(id);
    if (!p || p.stock <= 0) return false;
    cant = Math.max(1, Math.min(3, parseInt(cant, 10) || 1));
    para = para || 'propio';
    if (p.stock < cant) return false;
    if (!clienteNom){ log('<s>Venta</s> · toda venta debe estar vinculada a un cliente'); return false; }
    const c = CLIENTES.find(x => x.n === clienteNom);
    if (!c){ log('<s>Venta</s> · cliente no encontrado'); return false; }
    const avisos = [], remDates = [];
    for (let i = 0; i < cant; i++){
      p.stock--;
      let reservaIdx = 0;
      if (para === 'reserva') reservaIdx = lineasDe(c).filter(l => l.prod === id && l.para === 'reserva').length;
      agregarLinea(c, id, para);
      const remAt = offsetRecordatorio(offset, para, reservaIdx);
      remDates.push(remAt);
      avisos.push(fmt(fecha(remAt)));
    }
    ventasMes += cant;
    ventas.unshift({prod:p.nom, id, cli:c.n, zona:c.z, cant, para: para === 'propio' ? 'propio' : (para === 'reserva' ? 'reserva' : 'otro'), stock:p.stock, at:offset, remDates});
    log('Venta · <u>' + p.nom + '</u> ×' + cant + ' (' + para + ') → ' + c.n.split(' ')[0]
      + (avisos.length ? ' · aviso' + (avisos.length > 1 ? 's' : '') + ' ' + avisos.join(', ') : '')
      + ' · stock: ' + p.stock);
    saveState();
    return true;
  }

  function esRecordatorioHoy(l){ return l.d + offset === AVISO; }
  function pendientesHoy(){
    const items = [];
    CLIENTES.forEach(c => lineasDe(c).forEach(l => {
      if (esRecordatorioHoy(l) && !enviados.has(lineaKey(c, l))) items.push({c, l, k: lineaKey(c, l)});
    }));
    return items;
  }

  function dispararRecordatorios(){
    let n = 0;
    pendientesHoy().forEach(({c, l, k}) => {
      if (vetados.has(k)) return;
      enviados.add(k);
      log('10:00 · WhatsApp a <u>' + c.n.split(' ')[0] + '</u> · ' + P(l.prod).nom + ' (' + l.para + ')', offset);
      n++;
    });
    if (n) log('<i>Recordatorios</i> · ' + n + ' mensaje' + (n > 1 ? 's' : '') + ' enviado' + (n > 1 ? 's' : ''));
    saveState();
    return n;
  }

  function avanzar(n){
    for (let i = 0; i < n; i++) offset++;
    log('<i>+' + n + ' día' + (n > 1 ? 's' : '') + '</i> — stock, clientes y pedidos recalculados');
    saveState();
  }

  function ultimaVenta(n){
    const v = ventas.find(x => x.cli === n);
    if (!v) return '—';
    return dd(v.at) + ' · ' + v.prod + (v.cant > 1 ? ' ×' + v.cant : '');
  }

  function proxAvisoLinea(l){
    const q = quedanLinea(l);
    if (q < 0) return 'Vencido';
    if (q <= Q_AVISO) return 'Pronto';
    return fmt(fecha(offset + q - Q_AVISO));
  }

  function tagLinea(l){
    const q = quedanLinea(l);
    const cls = 'tag tag-prod-' + l.prod + (l.para === 'reserva' ? ' tag-reserva' : (l.para === 'otro' ? ' tag-otro' : ''));
    return '<span class="linea-tag ' + cls + '">' + P(l.prod).nom + ' · ' + l.para + ' · ' + (q < 0 ? 'vencido' : q + ' d') + '</span>';
  }

  function fmtRecordatorio(remAt){
    if (remAt == null) return '<span class="st">—</span>';
    const cls = remAt === offset ? ' rem-hoy' : (remAt < offset ? ' rem-pas' : '');
    return '<span class="rem-date' + cls + '">' + fmt(fecha(remAt)) + ' · 10:00</span>';
  }

  function fmtRecordatorios(remDates){
    if (!remDates || !remDates.length) return '<span class="st">—</span>';
    const uniq = [...new Set(remDates)];
    if (uniq.length === 1){
      const remAt = uniq[0];
      const cls = remAt === offset ? ' rem-hoy' : (remAt < offset ? ' rem-pas' : '');
      const extra = remDates.length > 1 ? ' · ' + remDates.length + ' goteros' : '';
      return '<span class="rem-date' + cls + '">' + fmt(fecha(remAt)) + ' · 10:00' + extra + '</span>';
    }
    return remDates.map(fmtRecordatorio).join('');
  }

  function clientesDe(id){ return CLIENTES.filter(c => lineasDe(c).some(l => l.prod === id)); }

  function ensureSeed(){
    if (CLIENTES.length) return null;
    return applySeed(SEED);
  }

  function loadDemoSeed(){
    const seedLog = applySeed(SEED);
    const logEl = document.getElementById('log');
    if (logEl){
      logEl.innerHTML = '';
      (seedLog || []).forEach(line => { const d = document.createElement('div'); d.innerHTML = line; logEl.appendChild(d); });
    }
    saveState();
    return true;
  }

  function resetAll(useSeed){
    offset = 0; ventasMes = 0; ventas.length = 0;
    ventasBuscar = ''; ventasSoloHoy = false;
    lineaSeq = 0; enviados.clear(); vetados.clear();
    CLIENTES.length = 0;
    PRODUCTOS.forEach((p, i) => { p.stock = STOCK_INICIAL[i]; });
    const logEl = document.getElementById('log');
    if (logEl) logEl.innerHTML = '';
    if (useSeed !== false){
      const seedLog = applySeed(SEED);
      if (logEl) seedLog.forEach(line => { const d = document.createElement('div'); d.innerHTML = line; logEl.appendChild(d); });
    } else {
      log('Demo reiniciada · 13 jul · sin clientes ni ventas');
    }
    localStorage.removeItem(STORAGE_KEY);
    saveState();
  }

  function init(){
    loadState();
    const seedLog = ensureSeed();
    const logEl = document.getElementById('log');
    if (seedLog && logEl){
      logEl.innerHTML = '';
      seedLog.forEach(line => { const d = document.createElement('div'); d.innerHTML = line; logEl.appendChild(d); });
    } else if (!seedLog && logEl && !logEl.innerHTML){
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw){
          const s = JSON.parse(raw);
          if (s.logHtml) logEl.innerHTML = s.logHtml;
        }
      } catch (e) { /* ignore */ }
    }
    saveState();
  }

  return {
    BASE, DURACION, AVISO, HORIZONTE, Q_AVISO,
    PRODUCTOS, STOCK_INICIAL, CLIENTES, ventas,
    get offset(){ return offset; },
    get ventasMes(){ return ventasMes; },
    get ventasBuscar(){ return ventasBuscar; },
    set ventasBuscar(v){ ventasBuscar = v; saveState(); },
    get ventasSoloHoy(){ return ventasSoloHoy; },
    set ventasSoloHoy(v){ ventasSoloHoy = v; saveState(); },
    enviados, vetados,
    P, lineasDe, quedanLinea, lineaKey, findByTel, fichaResumen, fichaSysText, historialCliente,
    fecha, fmt, dd, calcProducto, crearCliente, registrarVenta, log, avanzar,
    dispararRecordatorios, pendientesHoy, esRecordatorioHoy, ultimaVenta, proxAvisoLinea,
    tagLinea, fmtRecordatorios, clientesDe, resetAll, init, saveState, loadDemoSeed
  };
})();
