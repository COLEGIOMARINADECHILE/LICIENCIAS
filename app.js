/* =========================================================================
   Generador de Licencias — Frontend (GitHub Pages)
   ========================================================================= */
(function () {
  'use strict';

  var DEMO = !window.API_URL;
  var YEAR = String(new Date().getFullYear());
  var S = {
    token: ss('get', 'lic_token'), user: null, config: {}, assets: null,
    nivel: '4M', anio: YEAR, students: [], selected: {},
    archNivel: '4M', archAnio: YEAR, licencias: [], pendingImport: null
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- utilidades ---------------- */
  function ss(op, k, v) { try { return op === 'get' ? sessionStorage.getItem(k) : op === 'set' ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, err) {
    var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
    $('#toast').appendChild(t); setTimeout(function () { t.remove(); }, err ? 6000 : 3200);
  }
  function busy(on, txt) { $('#busy').classList.toggle('hidden', !on); $('#busyText').textContent = txt || 'Procesando…'; }
  function fmtDate(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); }
  function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, ''); }
  // orden de la lista: por N° de registro (los vacíos al final, por nombre)
  function porRegistro(a, b) {
    var x = parseFloat(a.registro), y = parseFloat(b.registro);
    if (isNaN(x) && isNaN(y)) return a.nombre.localeCompare(b.nombre);
    if (isNaN(x)) return 1; if (isNaN(y)) return -1;
    return x - y || a.nombre.localeCompare(b.nombre);
  }
  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o[k]) r[k] = o[k]; }); return r; }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  // R.U.N. chileno: formato y dígito verificador
  function runClean(r) { return String(r || '').toUpperCase().replace(/[^0-9K]/g, ''); }
  function runFormat(r) {
    var c = runClean(r); if (c.length < 2) return String(r || '').trim();
    var body = c.slice(0, -1), dv = c.slice(-1);
    return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
  }
  function runValid(r) {
    var c = runClean(r); if (c.length < 2) return false;
    var body = c.slice(0, -1), dv = c.slice(-1), sum = 0, m = 2;
    for (var i = body.length - 1; i >= 0; i--) { sum += Number(body[i]) * m; m = m === 7 ? 2 : m + 1; }
    var res = 11 - (sum % 11), exp = res === 11 ? '0' : res === 10 ? 'K' : String(res);
    return exp === dv;
  }

  /* ---------------- API (Apps Script o demo) ---------------- */
  function api(action, data) {
    var body = Object.assign({ action: action, token: S.token }, data || {});
    var p = DEMO ? Demo.call(body) : fetch(window.API_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
    return p.then(function (j) {
      if (!j.ok) {
        if (j.error === 'SESION_EXPIRADA') { logoutLocal(); throw new Error('Su sesión expiró. Ingrese nuevamente.'); }
        throw new Error(j.error);
      }
      return j.data;
    });
  }

  /* Modo demo: misma API, guardada en localStorage */
  var Demo = (function () {
    var KEY = 'lic_demo_db';
    function load() {
      var d; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
      return d || { users: [{ id: 'u-admin', nombre: 'Leandro Bascuñán', email: 'leandro.bascunan@andaliensur.cl', rol: 'admin', activo: true }], config: {}, students: [], lic: [], tokens: {} };
    }
    function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
    function id(p) { return p + Math.random().toString(36).slice(2, 10); }
    function listStud(d, q) {
      var em = {}; d.lic.forEach(function (l) { em[l.studentId] = l.emitida; });
      return d.students.filter(function (s) { return s.nivel === q.nivel && s.anio === String(q.anio); })
        .map(function (s) { return Object.assign({}, s, { emitida: em[s.id] || '' }); })
        .sort(porRegistro);
    }
    function imp(d, q, u) {
      var seen = {}, add = 0, om = 0;
      d.students.forEach(function (s) { if (s.nivel === q.nivel && s.anio === String(q.anio)) seen[runClean(s.run)] = 1; });
      (q.students || []).forEach(function (r) {
        var n = String(r.nombre || '').replace(/\s+/g, ' ').trim(), k = runClean(r.run);
        if (!n || (k && seen[k])) { om++; return; }
        if (k) seen[k] = 1; add++;
        d.students.push({ id: id('s-'), nivel: q.nivel, anio: String(q.anio), nombre: n, run: String(r.run || '').trim().toUpperCase(),
          sexo: /^f/i.test(r.sexo || '') ? 'F' : /^m/i.test(r.sexo || '') ? 'M' : '', registro: String(r.registro == null ? '' : r.registro).trim(), creadoPor: u.nombre });
      });
      return { agregados: add, omitidos: om, lista: listStud(d, q) };
    }
    var A = {
      listUsers: function (d) { return d.users.filter(function (u) { return u.activo; }).map(function (u) { return { id: u.id, nombre: u.nombre }; }); },
      login: function (d, q) {
        var u = d.users.filter(function (x) { return x.id === q.userId && x.activo; })[0];
        if (!u || !q.password) throw new Error('Usuario o clave incorrectos');
        var t = id('t-'); d.tokens[t] = u.id; return { token: t, user: u };
      },
      logout: function () { return true; },
      me: function (d, q, u) { return u; },
      getConfig: function (d) { return d.config; },
      saveConfig: function (d, q) { Object.assign(d.config, q.config); return d.config; },
      saveLogo: function (d, q) { d.config[q.tipo === 'ministerio' ? 'logoMinisterio' : 'logoColegio'] = q.dataUrl || ''; return d.config; },
      listStudents: function (d, q) { return listStud(d, q); },
      importStudents: imp,
      addStudent: function (d, q, u) { return imp(d, { nivel: q.nivel, anio: q.anio, students: [q.student] }, u); },
      updateStudent: function (d, q) { var s = d.students.filter(function (x) { return x.id === q.id; })[0]; Object.assign(s, q.student); return true; },
      deleteStudent: function (d, q) { d.students = d.students.filter(function (x) { return x.id !== q.id; }); return true; },
      emitir: function (d, q, u) {
        var c = d.config, faltan = ['colegio', 'rbd', 'region', 'provincia', 'comuna', 'directora', 'fecha'].filter(function (k) { return !c[k]; });
        if (faltan.length) throw new Error('Complete los datos del colegio antes de emitir: ' + faltan.join(', '));
        var st = d.students.filter(function (s) { return q.ids.indexOf(s.id) >= 0; });
        var sin = st.filter(function (s) { return !s.registro; });
        if (sin.length) throw new Error('Falta N° de registro para: ' + sin.map(function (s) { return s.nombre; }).join(', '));
        var now = new Date().toISOString();
        return st.map(function (s) {
          var rec = { nivel: s.nivel, anio: s.anio, registro: s.registro, nombre: s.nombre, run: s.run, sexo: s.sexo,
            colegio: c.colegio, rbd: c.rbd, region: c.region, provincia: c.provincia, comuna: c.comuna, anioEscolar: c.anioEscolar || s.anio,
            directora: c.directora, cargo: c.cargo || 'Director(a) del Establecimiento', ciudad: c.ciudad, fecha: c.fecha };
          d.lic = d.lic.filter(function (l) { return l.studentId !== s.id; });
          d.lic.push({ id: id('l-'), studentId: s.id, nivel: s.nivel, anio: s.anio, registro: s.registro, nombre: s.nombre, run: s.run, emitida: now, emitidaPor: u.nombre, datos: rec });
          return rec;
        });
      },
      listLicencias: function (d, q) {
        return d.lic.filter(function (l) { return l.nivel === q.nivel && l.anio === String(q.anio); })
          .sort(function (a, b) { return (Number(a.registro) || 0) - (Number(b.registro) || 0); });
      },
      deleteLicencia: function (d, q) { d.lic = d.lic.filter(function (l) { return l.id !== q.id; }); return true; },
      changePassword: function () { return true; },
      adminListUsers: function (d) { return d.users; },
      createUser: function (d, q) { d.users.push({ id: id('u-'), nombre: q.nombre, email: q.email, rol: q.rol, activo: true }); return d.users; },
      updateUser: function (d, q) { var u = d.users.filter(function (x) { return x.id === q.id; })[0]; ['nombre', 'email', 'rol', 'activo'].forEach(function (k) { if (q[k] != null) u[k] = q[k]; }); return d.users; },
      deleteUser: function (d, q) { d.users = d.users.filter(function (x) { return x.id !== q.id; }); return d.users; }
    };
    return {
      call: function (q) {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = load();
            try {
              var u = null;
              if (q.action !== 'listUsers' && q.action !== 'login') {
                var uid = d.tokens[q.token]; u = d.users.filter(function (x) { return x.id === uid; })[0];
                if (!u) throw new Error('SESION_EXPIRADA');
              }
              var out = A[q.action](d, q, u); save(d); res({ ok: true, data: JSON.parse(JSON.stringify(out)) });
            } catch (e) { res({ ok: false, error: e.message }); }
          }, 120);
        });
      }
    };
  })();

  /* ---------------- login ---------------- */
  function loadUsers() {
    return api('listUsers').then(function (list) {
      $('#loginUser').innerHTML = '<option value="">Seleccione su nombre…</option>' +
        list.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.nombre) + '</option>'; }).join('');
    }).catch(function (e) { $('#loginError').textContent = 'No se pudo conectar: ' + e.message; });
  }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#loginError').textContent = '';
    busy(true, 'Ingresando…');
    api('login', { userId: $('#loginUser').value, password: $('#loginPass').value }).then(function (r) {
      S.token = r.token; ss('set', 'lic_token', r.token); $('#loginPass').value = '';
      return startApp(r.user);
    }).catch(function (err) { $('#loginError').textContent = err.message; }).then(function () { busy(false); });
  });

  function logoutLocal() {
    S.token = null; ss('del', 'lic_token');
    $('#app').classList.add('hidden'); $('#login').classList.remove('hidden');
    loadUsers();
  }
  $('#btnLogout').addEventListener('click', function () { api('logout').catch(function () {}); logoutLocal(); });

  function startApp(user) {
    S.user = user;
    document.body.classList.toggle('is-admin', user.rol === 'admin');
    $('#meName').textContent = user.nombre;
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    $('#anio').value = S.anio; $('#archAnio').value = S.archAnio;
    return loadConfig().then(loadStudents);
  }

  /* ---------------- navegación ---------------- */
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-view]'); if (!b) return;
    $$('#tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
    $$('.view').forEach(function (v) { v.classList.toggle('hidden', v.id !== 'view-' + b.dataset.view); });
    $('.actionbar').classList.toggle('hidden', b.dataset.view !== 'emitir');
    if (b.dataset.view === 'archivo') loadArchivo();
    if (b.dataset.view === 'usuarios') loadUsersAdmin();
    if (b.dataset.view === 'colegio') fillConfigForm();
  });

  $$('.seg').forEach(function (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', seg).forEach(function (x) { x.classList.toggle('on', x === b); });
      if (seg.dataset.bind === 'nivel') { S.nivel = b.dataset.v; loadStudents(); }
      else { S.archNivel = b.dataset.v; loadArchivo(); }
    });
  });
  $('#anio').addEventListener('change', function () { S.anio = this.value; loadStudents(); });
  $('#archAnio').addEventListener('change', function () { S.archAnio = this.value; loadArchivo(); });

  /* ---------------- configuración del colegio ---------------- */
  function loadConfig() {
    return api('getConfig').then(function (c) { S.config = c || {}; return refreshAssets(); });
  }
  function refreshAssets() {
    $('#brandSchool').textContent = S.config.colegio || 'Configure los datos del colegio';
    var def = window.LICENCIA_ASSETS || {};
    var pre = (def.insignias || []).filter(function (x) { return x.id === S.config.insignia; })[0];
    $('#brandLogo').src = S.config.logoColegio || (pre && pre.src) || def.colegio || '';
    var faltan = !S.config.colegio || !S.config.directora || !S.config.fecha;
    $('#cfgHint').innerHTML = faltan ? '<span class="chip warn">Faltan datos del colegio</span>'
      : 'Fecha de impresión: <b>' + esc((S.config.ciudad ? S.config.ciudad + ', ' : '') + Licencia.fechaLarga(S.config.fecha)) + '</b>';
    return Licencia.prepareAssets(S.config).then(function (a) { S.assets = a; });
  }
  function bordeOn(c) { return String((c || S.config).borde) !== 'false'; }
  function printOpts(c) {
    c = c || S.config;
    return { borde: bordeOn(c), ajusteX: c.ajusteX || 0, ajusteY: c.ajusteY || 0 };
  }

  function fillConfigForm() {
    var f = $('#cfgForm'), c = S.config;
    ['colegio', 'rbd', 'region', 'provincia', 'comuna', 'anioEscolar', 'directora', 'cargo', 'ciudad', 'fecha', 'ajusteX', 'ajusteY'].forEach(function (k) {
      f.elements[k].value = c[k] || (k === 'anioEscolar' ? YEAR : k === 'cargo' ? 'Directora del Establecimiento' : /^ajuste/.test(k) ? '0' : '');
    });
    f.elements.borde.checked = bordeOn(c);
    renderInsignias();
  }
  function readConfigForm() {
    var f = $('#cfgForm'), o = {};
    ['colegio', 'rbd', 'region', 'provincia', 'comuna', 'anioEscolar', 'directora', 'cargo', 'ciudad', 'fecha', 'ajusteX', 'ajusteY'].forEach(function (k) { o[k] = f.elements[k].value.trim(); });
    o.borde = f.elements.borde.checked ? 'true' : 'false';
    return o;
  }
  $('#cfgForm').addEventListener('submit', function (e) {
    e.preventDefault(); busy(true, 'Guardando…');
    api('saveConfig', { config: readConfigForm() }).then(function (c) { S.config = c; return refreshAssets(); })
      .then(function () { toast('Datos del colegio guardados'); }).catch(function (err) { toast(err.message, true); })
      .then(function () { busy(false); });
  });
  $('#btnCfgPreview').addEventListener('click', function () {
    var c = Object.assign({}, S.config, readConfigForm());
    var s = S.students[0] || { nombre: 'Nombre Apellido Apellido', run: '12.345.678-5', registro: '1', sexo: '' };
    openPdf([recordFor(s, c)], c);
  });
  $('#btnPrueba').addEventListener('click', function () {
    var c = Object.assign({}, S.config, readConfigForm());
    Licencia.pruebaAlineacion(printOpts(c)).save('Prueba_alineacion.pdf');
  });
  $$('input[data-logo]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      var f = inp.files[0]; if (!f) return;
      if (f.size > 4 * 1024 * 1024) { toast('La imagen debe pesar menos de 4 MB', true); inp.value = ''; return; }
      var rd = new FileReader();
      rd.onload = function () { saveLogo(inp.dataset.logo, rd.result); inp.value = ''; };
      rd.readAsDataURL(f);
    });
  });
  /* ---- Selector de insignias (el escudo de Chile es fijo) ---- */
  function renderInsignias() {
    var def = window.LICENCIA_ASSETS || {}, list = def.insignias || [], c = S.config;
    var actual = c.logoColegio ? 'custom' : (c.insignia || (list[0] && list[0].id));
    var cards = list.map(function (x) {
      return '<button type="button" class="insignia' + (actual === x.id ? ' on' : '') + '" data-ins="' + esc(x.id) + '">' +
        '<img src="' + esc(x.src) + '" alt="">' + esc(x.nombre) + '</button>';
    });
    if (c.logoColegio) cards.push('<button type="button" class="insignia on" data-ins="custom"><img src="' + c.logoColegio + '" alt="">Insignia subida</button>');
    $('#insignias').innerHTML = cards.join('');
  }
  $('#insignias').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ins]'); if (!b || b.dataset.ins === 'custom' || b.classList.contains('on')) return;
    var id = b.dataset.ins;
    busy(true, 'Cambiando insignia…');
    (S.config.logoColegio ? api('saveLogo', { tipo: 'colegio', dataUrl: '' }) : Promise.resolve())
      .then(function () { return api('saveConfig', { config: { insignia: id } }); })
      .then(function (c) { S.config = c; renderInsignias(); return refreshAssets(); })
      .then(function () { toast('Insignia actualizada'); })
      .catch(function (err) { toast(err.message, true); }).then(function () { busy(false); });
  });
  function saveLogo(tipo, dataUrl) {
    busy(true, 'Guardando logo…');
    api('saveLogo', { tipo: tipo, dataUrl: dataUrl }).then(function (c) { S.config = c; renderInsignias(); return refreshAssets(); })
      .then(function () { toast('Logo actualizado'); }).catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
  }

  /* ---------------- estudiantes ---------------- */
  function loadStudents() {
    S.selected = {};
    return api('listStudents', { nivel: S.nivel, anio: S.anio }).then(function (l) { S.students = l; renderStudents(); })
      .catch(function (e) { toast(e.message, true); });
  }

  function renderStudents() {
    var regs = {};
    S.students.forEach(function (s) { if (s.registro) regs[s.registro] = (regs[s.registro] || 0) + 1; });
    $('#studTable tbody').innerHTML = S.students.map(function (s) {
      var dup = s.registro && regs[s.registro] > 1;
      return '<tr data-id="' + esc(s.id) + '">' +
        '<td><input type="checkbox" class="sel"' + (S.selected[s.id] ? ' checked' : '') + '></td>' +
        '<td class="name">' + esc(s.nombre) + '</td>' +
        '<td>' + esc(runFormat(s.run)) + (runValid(s.run) ? '' : '<span class="badrun">R.U.N. no válido</span>') + '</td>' +
        '<td><input class="reg' + (dup ? ' dup' : '') + '" value="' + esc(s.registro) + '" inputmode="numeric" title="' + (dup ? 'N° repetido' : '') + '"></td>' +
        '<td>' + (s.emitida ? '<span class="chip ok">Emitida ' + esc(fmtDate(s.emitida).split(' ')[0]) + '</span>' : '<span class="chip pend">Pendiente</span>') + '</td>' +
        '<td class="actions"><button class="link" data-act="pdf">PDF</button><button class="link" data-act="edit">Editar</button><button class="link danger" data-act="del">Eliminar</button></td></tr>';
    }).join('');
    $('#studEmpty').classList.toggle('hidden', S.students.length > 0);
    $('#studCount').textContent = S.students.length ? '· ' + S.students.length + ' estudiantes · ' + Licencia.NIVELES[S.nivel].curso : '';
    updateSel();
  }

  function updateSel() {
    var n = Object.keys(S.selected).length;
    $('#selInfo').textContent = n + ' seleccionado' + (n === 1 ? '' : 's');
    $('#chkAll').checked = n > 0 && n === S.students.length;
    $('#btnEmitir').disabled = n === 0; $('#btnPreview').disabled = n === 0;
  }

  $('#chkAll').addEventListener('change', function () {
    var on = this.checked; S.selected = {};
    if (on) S.students.forEach(function (s) { S.selected[s.id] = true; });
    $$('#studTable .sel').forEach(function (c) { c.checked = on; }); updateSel();
  });

  $('#studTable tbody').addEventListener('change', function (e) {
    var tr = e.target.closest('tr'); if (!tr) return;
    var s = S.students.filter(function (x) { return x.id === tr.dataset.id; })[0];
    if (e.target.classList.contains('sel')) {
      if (e.target.checked) S.selected[s.id] = true; else delete S.selected[s.id];
      updateSel();
    } else if (e.target.classList.contains('reg')) {
      var v = e.target.value.trim(); if (v === s.registro) return;
      s.registro = v;
      api('updateStudent', { id: s.id, student: { registro: v } }).then(function () { renderStudents(); })
        .catch(function (err) { toast(err.message, true); });
    }
  });
  $('#studTable tbody').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('reg')) {
      var inputs = $$('#studTable .reg'), i = inputs.indexOf(e.target);
      e.target.blur(); if (inputs[i + 1]) inputs[i + 1].focus();
    }
  });
  $('#studTable tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var s = S.students.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    if (b.dataset.act === 'pdf') {
      if (!s.registro) return toast('Ingrese el N° de registro primero', true);
      emitir([s.id], 'download');
    } else if (b.dataset.act === 'del') {
      confirmDlg('Eliminar estudiante', '¿Eliminar a <b>' + esc(s.nombre) + '</b> de la lista? Las licencias ya guardadas en el archivo no se borran.').then(function (ok) {
        if (!ok) return;
        api('deleteStudent', { id: s.id }).then(loadStudents).catch(function (err) { toast(err.message, true); });
      });
    } else if (b.dataset.act === 'edit') {
      formDlg('Editar estudiante', [
        { name: 'nombre', label: 'Nombre completo', value: s.nombre, required: true },
        { name: 'run', label: 'R.U.N.', value: s.run, required: true },
        { name: 'sexo', label: 'Trato', type: 'select', value: s.sexo, options: [['', 'Don(a)'], ['F', 'Doña'], ['M', 'Don']] },
        { name: 'registro', label: 'N° de registro', value: s.registro }
      ]).then(function (v) {
        if (!v) return;
        v.run = runFormat(v.run);
        api('updateStudent', { id: s.id, student: v }).then(loadStudents).then(function () { toast('Estudiante actualizado'); })
          .catch(function (err) { toast(err.message, true); });
      });
    }
  });

  $('#addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, st = { nombre: f.nombre.value, run: runFormat(f.run.value), sexo: f.sexo.value, registro: f.registro.value };
    if (!runValid(st.run) && !window.confirm('El R.U.N. ' + st.run + ' no parece válido. ¿Agregar de todas formas?')) return;
    api('addStudent', { nivel: S.nivel, anio: S.anio, student: st }).then(function (r) {
      if (!r.agregados) toast('Ese R.U.N. ya existe en este curso', true); else { toast('Estudiante agregado'); f.reset(); }
      S.students = r.lista; renderStudents();
    }).catch(function (err) { toast(err.message, true); });
  });

  $('#btnAuto').addEventListener('click', function () {
    var n = parseInt($('#autoFrom').value, 10);
    if (!(n > 0)) return toast('Indique el número inicial', true);
    var vacios = S.students.filter(function (s) { return !s.registro; });
    if (!vacios.length) return toast('Todos los estudiantes ya tienen N° de registro');
    busy(true, 'Numerando…');
    Promise.all(vacios.map(function (s, i) {
      s.registro = String(n + i);
      return api('updateStudent', { id: s.id, student: { registro: s.registro } });
    })).then(function () { renderStudents(); toast(vacios.length + ' registros asignados (orden alfabético)'); })
      .catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
  });

  /* ---------------- importación de Excel/CSV ---------------- */
  var drop = $('#drop');
  ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('over'); }); });
  $('#file').addEventListener('change', function () { if (this.files[0]) parseFile(this.files[0]); this.value = ''; });

  // Detecta PDF por su contenido (los PDF empiezan con "%PDF"), aunque el nombre no termine en .pdf
  function parseFile(file) {
    file.slice(0, 5).arrayBuffer().then(function (b) {
      var head = String.fromCharCode.apply(null, new Uint8Array(b));
      parseFileTipo(file, head.indexOf('%PDF') === 0 || /\.pdf$/i.test(file.name) || file.type === 'application/pdf');
    }).catch(function () { parseFileTipo(file, /\.pdf$/i.test(file.name)); });
  }

  function parseFileTipo(file, esPdf) {
    if (esPdf) {
      busy(true, 'Leyendo la nómina PDF…');
      file.arrayBuffer().then(parsePdf).then(function (r) {
        if (!r.students.length) throw new Error('No se encontraron estudiantes en el PDF. ¿Es la "Nómina de Alumnos Licenciados" del Mineduc?');
        if (r.meta.nivel && r.meta.nivel !== S.nivel) setNivel(r.meta.nivel);
        if (r.meta.anio && r.meta.anio !== S.anio) { S.anio = r.meta.anio; $('#anio').value = S.anio; loadStudents(); }
        showPreview(r.students, file.name, r.meta);
      }).catch(function (e) { toast(e.message || 'No se pudo leer el PDF', true); }).then(function () { busy(false); });
      return;
    }
    var isCsv = /\.csv$/i.test(file.name);
    var p = isCsv ? file.text().then(function (t) { return XLSX.read(t.replace(/^﻿/, ''), { type: 'string', raw: true }); })
      : file.arrayBuffer().then(function (b) { return XLSX.read(b, { type: 'array' }); });
    p.then(function (wb) {
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
      var out = mapRows(rows);
      if (!out.length) throw new Error('No se encontraron estudiantes en el Excel/CSV. Revise que exista una columna "nombre" (o suba la nómina en PDF).');
      showPreview(out, file.name, null);
    }).catch(function (e) { toast(e.message || 'No se pudo leer el archivo', true); });
  }

  function setNivel(n) {
    S.nivel = n;
    $$('.seg[data-bind="nivel"] button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === n); });
    loadStudents();
  }

  /* Vista previa: cantidad, curso, N° de registro inicial y datos del colegio detectados */
  function showPreview(out, fileName, meta) {
    var nums = out.map(function (s) { return /^\d+$/.test(s.registro) ? Number(s.registro) : null; });
    var firstN = nums[0] != null ? nums[0] : 1;
    S.pendingImport = { students: out, meta: meta, firstN: firstN };
    var malos = out.filter(function (s) { return !runValid(s.run); }).length;
    var cfgRows = '';
    if (meta) {
      var campos = [['colegio', 'Establecimiento'], ['rbd', 'RBD'], ['region', 'Región'], ['comuna', 'Comuna'], ['directora', 'Director(a)'], ['ciudad', 'Lugar']];
      // la fecha de impresión solo se toma de la nómina si aún no hay una definida
      if (meta.fecha && !S.config.fecha) campos.push(['fecha', 'Fecha de impresión']);
      cfgRows = campos.filter(function (c) { return meta[c[0]]; }).map(function (c) {
        var v = c[0] === 'fecha' ? Licencia.fechaLarga(meta.fecha) : meta[c[0]];
        return '<span class="kv"><small>' + c[1] + '</small>' + esc(v) + '</span>';
      }).join('');
    }
    $('#importInfo').innerHTML =
      '<div class="imp-head"><b>' + out.length + '</b> estudiantes detectados en <i>' + esc(fileName) + '</i><br>Se agregarán a <b>' +
      Licencia.NIVELES[S.nivel].curso + ' ' + esc(S.anio) + '</b>' + (malos ? ' <span class="chip warn">' + malos + ' con R.U.N. a revisar</span>' : '') + '</div>' +
      '<label class="inline mt-s">N° de registro inicial <input type="number" id="regIni" min="1" value="' + firstN + '" style="width:90px"></label>' +
      '<p class="muted small">Se numeran en el <b>mismo orden de la lista</b> (' + esc(out[0].nombre) + ' = ' + firstN + ', …). Después puede editar cualquier número.</p>' +
      (cfgRows ? '<div class="kvs">' + cfgRows + '</div><label class="check"><input type="checkbox" id="updCfg" checked> Usar estos datos en "Datos del colegio"</label>' : '') +
      '<div class="imp-list">' + out.slice(0, 5).map(function (s, i) {
        return '<div><span>' + (nums[i] != null ? nums[i] : firstN + i) + '</span>' + esc(s.nombre) + ' <small>' + esc(runFormat(s.run)) + '</small></div>';
      }).join('') + (out.length > 5 ? '<div class="muted">… y ' + (out.length - 5) + ' más</div>' : '') + '</div>';
    $('#importPreview').classList.remove('hidden');
  }

  /* ---------- Lectura de la "Nómina de Alumnos Licenciados" (PDF Mineduc) ---------- */
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = function () { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(); };
      s.onerror = function () { rej(new Error('No se pudo cargar el lector de PDF (revise su conexión)')); };
      document.head.appendChild(s);
    });
  }

  // Convierte cada página en líneas; cada línea en "celdas" (texto separado por espacios grandes)
  function pdfLines(buf) {
    return loadPdfJs().then(function () { return pdfjsLib.getDocument({ data: buf }).promise; }).then(function (pdf) {
      var jobs = [];
      for (var i = 1; i <= pdf.numPages; i++) jobs.push(pdf.getPage(i).then(function (p) { return p.getTextContent(); }));
      return Promise.all(jobs);
    }).then(function (pages) {
      var lines = [];
      pages.forEach(function (tc) {
        var items = tc.items.filter(function (it) { return it.str && it.str.trim(); }).map(function (it) {
          return { x: it.transform[4], y: it.transform[5], w: it.width, s: it.str };
        }).sort(function (a, b) { return b.y - a.y || a.x - b.x; });
        var cur = null;
        items.forEach(function (it) {
          if (!cur || Math.abs(cur.y - it.y) > 2.5) { cur = { y: it.y, items: [] }; lines.push(cur); }
          cur.items.push(it);
        });
      });
      return lines.map(function (l) {
        var its = l.items.sort(function (a, b) { return a.x - b.x; }), cells = [], last = null;
        its.forEach(function (it) {
          var gap = last ? it.x - (last.x + last.w) : 999;
          if (!last || gap > 7) cells.push(it.s.trim());
          else cells[cells.length - 1] += (gap > 0.8 ? ' ' : '') + it.s.trim();
          last = it;
        });
        return { cells: cells, text: cells.join(' ') };
      });
    });
  }

  function parsePdf(buf) {
    return pdfLines(buf).then(function (lines) {
      var meta = {}, students = [], RUN = /^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/;
      var tc = function (s) { return titleCase(String(s || '').replace(/\s+/g, ' ').trim()); };
      lines.forEach(function (l, li) {
        var t = l.text;
        // datos del encabezado ("Etiqueta:" seguida de su valor)
        l.cells.forEach(function (c, i) {
          var m = /^([A-Za-zÁÉÍÓÚáéíóúñÑ\/ ]+):\s*(.*)$/.exec(c);
          if (!m) return;
          var key = norm(m[1]), val = (m[2] || l.cells[i + 1] || '').trim();
          if (!val || /:$/.test(val)) return;
          if (key === 'establecimiento') meta.colegio = tc(val);
          else if (key === 'region') meta.region = tc(val.replace(/^(DE LA|DEL|DE)\s+/i, ''));
          else if (key === 'comuna') { meta.comuna = tc(val); meta.ciudad = meta.ciudad || tc(val); }
          else if (key === 'rbd') meta.rbd = val;
          else if (key === 'ano' && /^\d{4}$/.test(val)) meta.anio = val;
        });
        var fe = /Fecha de emisi[óo]n:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(t);
        if (fe && !meta.fecha) meta.fecha = fe[3] + '-' + ('0' + fe[2]).slice(-2) + '-' + ('0' + fe[1]).slice(-2);
        if (!meta.nivel) {
          if (/ense[ñn]anza media/i.test(t)) meta.nivel = '4M';
          else if (/(ense[ñn]anza|educaci[óo]n) b[áa]sica/i.test(t)) meta.nivel = '8B';
        }
        if (/Director\(a\) del Establecimiento/i.test(t)) {
          for (var k = li - 1; k >= Math.max(0, li - 3) && !meta.directora; k--) {
            lines[k].cells.forEach(function (c) {
              if (!meta.directora && /^[A-ZÁÉÍÓÚÑÜ ]{6,}$/.test(c) && c.trim().split(/\s+/).length >= 2) meta.directora = tc(c);
            });
          }
        }
        // filas de alumnos: N° | Apellidos | Nombres | RUN | Especialidad
        var r = -1;
        l.cells.forEach(function (c, i) { if (r < 0 && RUN.test(c.replace(/\s/g, ''))) r = i; });
        if (r >= 2 && /^\d{1,4}$/.test(l.cells[0])) {
          var apellidos = r >= 3 ? l.cells.slice(1, r - 1).join(' ') : '';
          var nombres = r >= 3 ? l.cells[r - 1] : l.cells[1];
          students.push({ nombre: (tc(nombres) + ' ' + tc(apellidos)).trim(), run: runFormat(l.cells[r]), sexo: '', registro: l.cells[0] });
        }
      });
      return { students: students, meta: meta };
    });
  }

  function mapRows(rows) {
    // busca la fila de encabezados dentro de las primeras 10 filas
    var hi = -1, idx = {};
    for (var i = 0; i < Math.min(rows.length, 10) && hi < 0; i++) {
      var h = rows[i].map(norm), m = {};
      h.forEach(function (c, j) {
        if (/^(nombrecompleto|nombre|estudiante|alumno|alumna|nombreestudiante|nombrealumno)$/.test(c)) m.nombre = j;
        else if (/^(nombres)$/.test(c)) m.nombres = j;
        else if (/^(apellidopaterno|paterno|primerapellido)$/.test(c)) m.pat = j;
        else if (/^(apellidomaterno|materno|segundoapellido)$/.test(c)) m.mat = j;
        else if (/^(apellidos)$/.test(c)) m.apes = j;
        else if (/^(run|rut|runestudiante|rutestudiante|rutalumno)$/.test(c)) m.run = j;
        else if (/^(dv|digitoverificador)$/.test(c)) m.dv = j;
        else if (/^(sexo|genero)$/.test(c)) m.sexo = j;
        else if (/registro/.test(c)) m.registro = j;
      });
      if (m.nombre != null || m.nombres != null) { hi = i; idx = m; }
    }
    if (hi < 0) return [];
    return rows.slice(hi + 1).map(function (r) {
      var nombre = idx.nombre != null ? r[idx.nombre] :
        [r[idx.nombres], idx.pat != null ? r[idx.pat] : r[idx.apes], idx.mat != null ? r[idx.mat] : ''].filter(Boolean).join(' ');
      var run = String(r[idx.run] || '') + (idx.dv != null && r[idx.dv] !== '' ? '-' + r[idx.dv] : '');
      return {
        nombre: titleCase(String(nombre || '').replace(/\s+/g, ' ').trim()),
        run: runFormat(run), sexo: idx.sexo != null ? String(r[idx.sexo]) : '',
        registro: idx.registro != null ? String(r[idx.registro]).trim() : ''
      };
    }).filter(function (s) { return s.nombre; });
  }
  // Solo corrige nombres escritos completamente en MAYÚSCULAS o minúsculas
  function titleCase(s) {
    if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s;
    var low = { de: 1, del: 1, la: 1, las: 1, los: 1, y: 1 };
    return s.toLowerCase().split(' ').map(function (w, i) {
      return i > 0 && low[w] ? w : w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  $('#btnCancelImport').addEventListener('click', function () { S.pendingImport = null; $('#importPreview').classList.add('hidden'); });
  $('#btnImport').addEventListener('click', function () {
    var P = S.pendingImport; if (!P) return;
    var ini = parseInt($('#regIni') && $('#regIni').value, 10); if (!(ini > 0)) ini = P.firstN;
    // N° correlativo en el orden de la lista; respeta saltos de la nómina y los N° no numéricos del archivo
    var students = P.students.map(function (s, i) {
      var reg = /^\d+$/.test(s.registro) ? String(ini + Number(s.registro) - P.firstN)
        : s.registro ? s.registro : String(ini + i);
      return Object.assign({}, s, { registro: reg });
    });
    var upd = P.meta && $('#updCfg') && $('#updCfg').checked;
    busy(true, 'Importando…');
    (upd ? api('saveConfig', { config: pick(P.meta, ['colegio', 'rbd', 'region', 'comuna', 'directora', 'ciudad'].concat(S.config.fecha ? [] : ['fecha'])) })
      .then(function (c) { S.config = c; return refreshAssets(); }) : Promise.resolve())
    .then(function () { return api('importStudents', { nivel: S.nivel, anio: S.anio, students: students }); }).then(function (r) {
      S.students = r.lista; renderStudents(); $('#importPreview').classList.add('hidden'); S.pendingImport = null;
      toast(r.agregados + ' estudiantes importados' + (r.omitidos ? ' · ' + r.omitidos + ' omitidos (repetidos o sin nombre)' : ''));
    }).catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
  });

  /* ---------------- generación de PDF ---------------- */
  function recordFor(s, c) {
    c = c || S.config;
    return { nivel: S.nivel, anio: S.anio, registro: s.registro, nombre: s.nombre, run: runFormat(s.run), sexo: s.sexo,
      colegio: c.colegio, rbd: c.rbd, region: c.region, provincia: c.provincia, comuna: c.comuna, anioEscolar: c.anioEscolar || S.anio,
      directora: c.directora, cargo: c.cargo, ciudad: c.ciudad, fecha: c.fecha };
  }
  function openPdf(records, c) {
    var w = window.open('', '_blank');
    Licencia.prepareAssets(c || S.config).then(function (assets) {
      var url = Licencia.build(records, assets, printOpts(c)).output('bloburl');
      if (w) w.location.href = url; else window.location.href = url;
    });
  }
  function filename(records) {
    var r = records[0], niv = r.nivel === '8B' ? '8Basico' : '4Medio';
    return records.length === 1 ? 'Licencia_' + niv + '_Reg' + r.registro + '_' + slug(r.nombre) + '.pdf'
      : 'Licencias_' + niv + '_' + r.anio + '_' + records.length + '.pdf';
  }
  function savePdf(records) {
    Licencia.build(records, S.assets, printOpts()).save(filename(records));
  }

  $('#btnPreview').addEventListener('click', function () {
    var recs = S.students.filter(function (s) { return S.selected[s.id]; }).map(function (s) { return recordFor(s); });
    openPdf(recs);
  });
  $('#btnEmitir').addEventListener('click', function () { emitir(Object.keys(S.selected), 'download'); });

  function emitir(ids) {
    var studs = S.students.filter(function (s) { return ids.indexOf(s.id) >= 0; });
    var sin = studs.filter(function (s) { return !s.registro; });
    if (sin.length) return toast('Falta N° de registro para ' + sin.length + ' estudiante(s)', true);
    busy(true, 'Guardando y generando ' + ids.length + ' licencia(s)…');
    api('emitir', { ids: ids }).then(function (recs) {
      recs.forEach(function (r) { r.run = runFormat(r.run); });
      recs.sort(function (a, b) { return (Number(a.registro) || 0) - (Number(b.registro) || 0); });
      savePdf(recs);
      toast(recs.length + ' licencia(s) guardadas en el archivo de ' + Licencia.NIVELES[S.nivel].curso);
      return loadStudents();
    }).catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
  }

  /* ---------------- archivo ---------------- */
  function loadArchivo() {
    return api('listLicencias', { nivel: S.archNivel, anio: S.archAnio }).then(function (l) { S.licencias = l; renderArchivo(); })
      .catch(function (e) { toast(e.message, true); });
  }
  function filteredLic() {
    var q = norm($('#archSearch').value);
    return S.licencias.filter(function (l) { return !q || norm(l.nombre + l.run + l.registro).indexOf(q) >= 0; });
  }
  function renderArchivo() {
    var list = filteredLic();
    $('#archTable tbody').innerHTML = list.map(function (l) {
      return '<tr data-id="' + esc(l.id) + '"><td><b>' + esc(l.registro) + '</b></td><td class="name">' + esc(l.nombre) + '</td><td>' + esc(runFormat(l.run)) +
        '</td><td>' + esc(fmtDate(l.emitida)) + '</td><td>' + esc(l.emitidaPor) + '</td><td class="actions"><button class="link" data-act="dl">Descargar PDF</button>' +
        (S.user.rol === 'admin' ? '<button class="link danger" data-act="del">Quitar</button>' : '') + '</td></tr>';
    }).join('');
    $('#archEmpty').classList.toggle('hidden', list.length > 0);
    $('#btnArchAll').disabled = !list.length;
  }
  $('#archSearch').addEventListener('input', renderArchivo);
  // Re-descarga: usa los datos guardados al emitir (misma fecha, directora y colegio)
  function licRecords(list) { return list.map(function (l) { var d = Object.assign({}, l.datos); d.run = runFormat(d.run); return d; }); }
  $('#archTable tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var l = S.licencias.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    if (b.dataset.act === 'dl') savePdf(licRecords([l]));
    else confirmDlg('Quitar del archivo', '¿Quitar la licencia de <b>' + esc(l.nombre) + '</b> del archivo?').then(function (ok) {
      if (ok) api('deleteLicencia', { id: l.id }).then(loadArchivo).catch(function (err) { toast(err.message, true); });
    });
  });
  $('#btnArchAll').addEventListener('click', function () { var l = filteredLic(); if (l.length) savePdf(licRecords(l)); });

  /* ---------------- usuarios ---------------- */
  function loadUsersAdmin() { return api('adminListUsers').then(renderUsers).catch(function (e) { toast(e.message, true); }); }
  function renderUsers(list) {
    S.users = list;
    $('#userTable tbody').innerHTML = list.map(function (u) {
      var me = u.id === S.user.id;
      return '<tr data-id="' + esc(u.id) + '"><td class="name">' + esc(u.nombre) + (me ? ' <span class="chip pend">usted</span>' : '') + '</td><td>' + esc(u.email) + '</td><td>' +
        (u.rol === 'admin' ? 'Administrador' : 'Usuario') + '</td><td>' + (u.activo ? '<span class="chip ok">Sí</span>' : '<span class="chip pend">No</span>') +
        '</td><td class="actions"><button class="link" data-act="pass">Clave</button>' +
        (me ? '' : '<button class="link" data-act="toggle">' + (u.activo ? 'Desactivar' : 'Activar') + '</button><button class="link danger" data-act="del">Eliminar</button>') + '</td></tr>';
    }).join('');
  }
  $('#userForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    busy(true, 'Creando usuario…');
    api('createUser', { nombre: f.nombre.value, email: f.email.value, password: f.password.value, rol: f.rol.value })
      .then(function (l) { renderUsers(l); f.reset(); toast('Usuario creado'); })
      .catch(function (err) { toast(err.message, true); }).then(function () { busy(false); });
  });
  $('#userTable tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var u = S.users.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    var p;
    if (b.dataset.act === 'pass') p = formDlg('Nueva clave para ' + u.nombre, [{ name: 'password', label: 'Nueva clave (mín. 8 caracteres)', type: 'password', required: true, minlength: 8 }])
      .then(function (v) { return v && api('updateUser', { id: u.id, password: v.password }); });
    else if (b.dataset.act === 'toggle') p = api('updateUser', { id: u.id, activo: !u.activo });
    else p = confirmDlg('Eliminar usuario', '¿Eliminar a <b>' + esc(u.nombre) + '</b>?').then(function (ok) { return ok && api('deleteUser', { id: u.id }); });
    p.then(function (l) { if (l) { renderUsers(l); toast('Cambios guardados'); } }).catch(function (err) { toast(err.message, true); });
  });

  $('#btnPass').addEventListener('click', function () {
    formDlg('Cambiar mi clave', [
      { name: 'actual', label: 'Clave actual', type: 'password', required: true },
      { name: 'nueva', label: 'Nueva clave (mín. 8 caracteres)', type: 'password', required: true, minlength: 8 },
      { name: 'repite', label: 'Repita la nueva clave', type: 'password', required: true }
    ]).then(function (v) {
      if (!v) return;
      if (v.nueva !== v.repite) return toast('Las claves nuevas no coinciden', true);
      api('changePassword', { actual: v.actual, nueva: v.nueva }).then(function () { toast('Clave actualizada'); }).catch(function (e) { toast(e.message, true); });
    });
  });

  /* ---------------- diálogos ---------------- */
  function openDlg(title, html) {
    var d = $('#dlg'); $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = html; d.returnValue = '';
    return new Promise(function (res) {
      d.addEventListener('close', function h() { d.removeEventListener('close', h); res(d.returnValue === 'ok'); });
      d.showModal();
      var first = $('#dlgBody input, #dlgBody select'); if (first) first.focus();
    });
  }
  function confirmDlg(title, html) { return openDlg(title, '<p>' + html + '</p>'); }
  function formDlg(title, fields) {
    var html = fields.map(function (f) {
      if (f.type === 'select') return '<label>' + esc(f.label) + '<select name="' + f.name + '">' + f.options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (o[0] === (f.value || '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
      return '<label>' + esc(f.label) + '<input name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(f.value || '') + '"' +
        (f.required ? ' required' : '') + (f.minlength ? ' minlength="' + f.minlength + '"' : '') + '></label>';
    }).join('');
    return openDlg(title, html).then(function (ok) {
      if (!ok) return null;
      var v = {}; fields.forEach(function (f) { v[f.name] = $('#dlgBody [name="' + f.name + '"]').value.trim(); });
      return v;
    });
  }

  /* ---------------- inicio ---------------- */
  (function portada() {
    var def = window.LICENCIA_ASSETS || {};
    $('#heroLogo').src = def.colegio || '';
    $('#brandLogo').src = def.colegio || '';
    $('#heroSchool').textContent = window.COLEGIO_NOMBRE || 'Generador de Licencias';
  })();
  if (DEMO) $('#demoNote').classList.remove('hidden');
  if (S.token) {
    busy(true, 'Cargando…');
    api('me').then(startApp).catch(function () { logoutLocal(); }).then(function () { busy(false); });
  } else {
    $('#login').classList.remove('hidden'); loadUsers();
  }
})();
