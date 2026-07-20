/* Canales — chat + ficha, simple */
(function(){
  const M = Mash;

  const FLUJOS = {
    wa: [
      {t:'in', who:'Lucía', text:'Hola! Me quedan pocas gotas del Reishi, ¿me mandás otro?'},
      {t:'sys', who:'', text:''},
      {t:'out', who:'Mash', text:'¡Hola Lucía! Vi que tomás Reishi. ¿Querés reponer el de uso diario?'},
      {t:'in', who:'Lucía', text:'Sí, uno para ahora. Pago transferencia.'},
      {t:'humano', who:'Joaquín', text:'Reishi, 4 gotas antes de dormir. Te lo preparo hoy.'},
      {t:'sys', who:'', text:''}
    ],
    ig: [
      {t:'in', who:'Sofía', text:'Hola! Vi el Reel del Cordyceps. ¿Lo tienen? Mi WA es 351 555-0288'},
      {t:'sys', who:'', text:''},
      {t:'out', who:'Mash', text:'¡Hola Sofía! Sí, tenemos Cordyceps para energía. ¿Es tu primera compra con nosotros?'},
      {t:'in', who:'Sofía', text:'Sí, quiero uno. Retiro hoy y pago en efectivo.'},
      {t:'humano', who:'Joaquín', text:'Te lo aparto. Al confirmar la venta queda cargada en el ERP con recordatorio al día 25.'},
      {t:'sys', who:'', text:''}
    ]
  };

  const CHAT_DEMO = {
    wa: {tel:'+54 351 555-0199', nom:'Lucía Morales', z:'Güemes · Córdoba', prod:'reishi', cant:1, para:'propio', nuevo:false},
    ig: {tel:'+54 351 555-0288', nom:'Sofía Ríos', z:'Centro · Córdoba', prod:'cordyceps', cant:1, para:'propio', nuevo:true}
  };

  let chatCanal = 'wa', chatIdx = 0, chatRegistrado = false;

  function bubbleHtml(m){
    const cls = m.t === 'sys' ? 'sys' : (m.t === 'humano' ? 'humano' : (m.t === 'out' ? 'out' : 'in'));
    const who = m.who ? '<div class="who">'+m.who+'</div>' : '';
    return '<div class="bubble '+cls+'">'+who+m.text+'</div>';
  }

  function showToast(html){
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(() => t.classList.remove('show'), 7000);
  }

  function renderFichaPanel(){
    const panel = document.getElementById('ficha-panel');
    const demo = CHAT_DEMO[chatCanal];
    const c = chatIdx >= 2 ? M.findByTel(demo.tel) : null;
    if (c) return renderFicha(c);
    if (chatIdx >= 2 && demo.nuevo){
      panel.className = 'ficha empty';
      panel.innerHTML = '<p class="ficha-placeholder"><strong>Contacto nuevo</strong><br>'
        + demo.nom+' · '+demo.tel+' · '+demo.z
        + '<br><span style="display:block;margin-top:8px">No está en el sistema todavía. Confirmá la venta para crearlo en el ERP.</span></p>';
      return;
    }
    panel.className = 'ficha empty';
    panel.innerHTML = '<p class="ficha-placeholder">Acá aparece la ficha cuando el sistema reconoce al cliente.</p>';
  }

  function renderFicha(c){
    const panel = document.getElementById('ficha-panel');
    if (!c){
      panel.className = 'ficha empty';
      panel.innerHTML = '<p class="ficha-placeholder">Acá aparece la ficha cuando el sistema reconoce al cliente.</p>';
      return;
    }
    const goteros = M.lineasDe(c).map(l => {
      const q = M.quedanLinea(l);
      return '<li>'+M.P(l.prod).nom+' · '+l.para+' · '+(q < 0 ? 'vencido' : q+' d restantes')+'</li>';
    }).join('') || '<li>Sin goteros activos</li>';
    const hist = M.historialCliente(c.n, 3).map(v =>
      '<li>'+M.dd(v.at)+' · '+v.prod+(v.cant>1?' ×'+v.cant:'')+'</li>'
    ).join('') || '<li>Sin compras</li>';

    panel.className = 'ficha';
    panel.innerHTML = '<h3>'+c.n+'</h3><div class="meta">'+c.tel+' · '+c.z+'</div>'
      + '<div class="ficha-block"><div class="lbl">Goteros activos</div><ul>'+goteros+'</ul></div>'
      + '<div class="ficha-block"><div class="lbl">Compras anteriores</div><ul>'+hist+'</ul></div>'
      + '<a href="erp.html#clientes" class="btn btn-sm" style="display:inline-block;margin-top:12px;text-decoration:none">Ver en ERP</a>';
  }

  function chatFlujoVisible(){
    const flujo = FLUJOS[chatCanal].map(m => ({...m}));
    const demo = CHAT_DEMO[chatCanal];
    const existente = M.findByTel(demo.tel);
    const prodNom = M.P(demo.prod).nom;
    if (flujo[1] && flujo[1].t === 'sys'){
      flujo[1].text = existente
        ? M.fichaSysText(existente)
        : 'Número no encontrado — se creará al confirmar venta';
    }
    if (flujo[flujo.length - 1] && flujo[flujo.length - 1].t === 'sys'){
      flujo[flujo.length - 1].text = 'Listo: '+prodNom+' ×'+demo.cant+' → '+ (existente ? existente.n : demo.nom);
    }
    return flujo.slice(0, chatIdx);
  }

  function renderChat(){
    document.getElementById('chat-msgs').innerHTML = chatFlujoVisible().map(bubbleHtml).join('');
    document.getElementById('chat-next').disabled = chatIdx >= FLUJOS[chatCanal].length;
    document.getElementById('chat-next').textContent = chatIdx >= FLUJOS[chatCanal].length ? 'Listo' : 'Siguiente';
    const erpBtn = document.getElementById('chat-erp');
    erpBtn.disabled = chatIdx < FLUJOS[chatCanal].length || chatRegistrado;
    erpBtn.textContent = chatRegistrado ? '✓ Registrado' : 'Confirmar venta';
    renderFichaPanel();
  }

  function resetChat(){
    chatIdx = 0;
    chatRegistrado = false;
    renderChat();
  }

  function startDemo(canal){
    chatCanal = canal;
    document.querySelectorAll('.ch-tab').forEach(t => t.classList.toggle('active', t.dataset.ch === canal));
    chatRegistrado = false;
    chatIdx = 2;
    renderChat();
  }

  function confirmarChatERP(){
    const demo = CHAT_DEMO[chatCanal];
    let c = M.findByTel(demo.tel);
    if (!c){
      c = {n: demo.nom, tel: demo.tel, z: demo.z, lineas: []};
      M.CLIENTES.push(c);
      M.log('Nuevo contacto <u>'+c.n+'</u>');
    }
    M.registrarVenta(demo.prod, c.n, demo.cant, demo.para);
    chatRegistrado = true;
    renderFicha(c);
    renderChat();
    M.saveState();
    showToast('Venta registrada. <a href="erp.html#ventas">Ver en ERP →</a>');
  }

  document.querySelectorAll('.ch-tab').forEach(tab => tab.onclick = () => {
    document.querySelectorAll('.ch-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    chatCanal = tab.dataset.ch;
    resetChat();
  });

  document.querySelectorAll('.pick-btn').forEach(btn => btn.onclick = () => startDemo(btn.dataset.start));
  document.getElementById('chat-next').onclick = () => { if (chatIdx < FLUJOS[chatCanal].length){ chatIdx++; renderChat(); } };
  document.getElementById('chat-erp').onclick = confirmarChatERP;
  document.getElementById('chat-reset').onclick = resetChat;

  M.init();
  resetChat();
})();
