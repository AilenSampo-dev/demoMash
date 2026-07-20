/* ERP — ventas, clientes, stock */
(function(){
  const M = Mash;

  function prodCell(id, nom){
    return '<span class="dot-prod dot-'+id+'"></span>'+nom;
  }

  function renderSaleForm(){
    const sel = document.getElementById('sale-client');
    const submit = document.getElementById('sale-submit');
    if (!M.CLIENTES.length){
      sel.innerHTML = '<option value="" disabled selected>Sin clientes</option>';
      submit.disabled = true;
    } else {
      sel.innerHTML = '<option value="" disabled selected>Elegir…</option>'
        + M.CLIENTES.map(c => '<option value="'+c.n+'">'+c.n+'</option>').join('');
      submit.disabled = false;
    }
    document.getElementById('sale-product').innerHTML = M.PRODUCTOS.map(p =>
      '<option value="'+p.id+'">'+p.nom+' ('+p.stock+')</option>'
    ).join('');
  }

  function renderVentasTable(){
    document.getElementById('ventas-table').innerHTML = M.ventas.length
      ? M.ventas.map(v => '<tr>'
        + '<td class="mono">'+M.dd(v.at)+'</td>'
        + '<td><span class="cli">'+v.cli+'</span></td>'
        + '<td>'+prodCell(v.id, v.prod)+'</td>'
        + '<td class="r">'+ (v.cant||1) +'</td>'
        + '<td class="hide-sm">'+M.fmtRecordatorios(v.remDates)+'</td>'
        + '</tr>').join('')
      : '<tr><td colspan="5"><div class="empty">Sin ventas todavía — probá desde Canales.</div></td></tr>';
  }

  function renderClientesTable(){
    if (!M.CLIENTES.length){
      document.getElementById('clientes-table').innerHTML =
        '<tr><td colspan="4"><div class="empty">Sin clientes.</div></td></tr>';
      return;
    }
    document.getElementById('clientes-table').innerHTML = M.CLIENTES.map(c => {
      const lineas = M.lineasDe(c).map(l =>
        '<span class="linea-simple">'+M.P(l.prod).nom+'</span>'
      ).join(', ') || '—';
      return '<tr>'
        + '<td><span class="cli">'+c.n+'<small>'+c.z+'</small></span></td>'
        + '<td class="hide-sm"><span class="st">'+c.tel+'</span></td>'
        + '<td>'+lineas+'</td>'
        + '<td class="r"><span class="st">'+M.ultimaVenta(c.n)+'</span></td>'
        + '</tr>';
    }).join('');
  }

  function render(){
    const todayEl = document.getElementById('today');
    if (todayEl) todayEl.textContent = M.fmt(M.fecha(M.offset));

    renderSaleForm();
    renderVentasTable();
    renderClientesTable();

    const calc = M.PRODUCTOS.map(M.calcProducto);
    document.getElementById('productos').innerHTML = calc.map(p => {
      let status = '<div class="prod-ok">OK</div>';
      if (p.stock === 0) status = '<div class="prod-warn">Sin stock</div>';
      else if (p.bajoMin) status = '<div class="prod-warn">Bajo mínimo</div>';
      return '<div class="prod prod-'+p.id+'">'
        + '<div class="prod-name">'+p.nom+'</div>'
        + '<div class="prod-stock">'+p.stock+'</div>'
        + '<div class="prod-meta">'+p.dem+' pedidos en 30d · mín. '+p.min+'</div>'
        + status + '</div>';
    }).join('');

    const colaEl = document.getElementById('cola');
    if (colaEl){
      const items = M.pendientesHoy().filter(({k}) => !M.vetados.has(k));
      colaEl.innerHTML = items.length
        ? items.map(({c,l}) => '<div class="q">'+c.n+' · '+M.P(l.prod).nom+'</div>').join('')
        : '<div class="empty">Nadie hoy</div>';
    }

    const demandaEl = document.getElementById('demanda');
    if (demandaEl){
      demandaEl.innerHTML = calc.map(p =>
        '<div class="lote">'+p.nom+': '+p.dem+' en 30d</div>'
      ).join('');
    }

    M.saveState();
  }

  document.getElementById('sale-submit').onclick = () => {
    const cli = document.getElementById('sale-client').value;
    if (!cli) return;
    M.registrarVenta(
      document.getElementById('sale-product').value,
      cli,
      document.getElementById('sale-cant').value,
      document.getElementById('sale-para').value
    );
    render();
  };

  const d7 = document.getElementById('d7');
  if (d7) d7.onclick = () => { M.avanzar(7); render(); };
  const d1 = document.getElementById('d1');
  if (d1) d1.onclick = () => { M.avanzar(1); render(); };
  const reset = document.getElementById('reset');
  if (reset) reset.onclick = () => { M.resetAll(true); render(); };

  M.init();
  render();
})();
