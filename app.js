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
    licencias: [], pendingImport: null
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
            colegio: c.colegio, rbd: c.rbd, region: c.region, provincia: c.provincia, comuna: c.comuna, anioEscolar: s.anio,
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
      listAlumnos: function (d, q) {
        d.alumnos = d.alumnos || []; d.dips = d.dips || [];
        var cnt = {}; d.dips.forEach(function (x) { if (x.anio === String(q.anio)) cnt[x.alumnoId] = (cnt[x.alumnoId] || 0) + 1; });
        return d.alumnos.filter(function (a) { return a.anio === String(q.anio); })
          .map(function (a) { return Object.assign({}, a, { diplomas: cnt[a.id] || 0 }); })
          .sort(function (a, b) { return a.curso.localeCompare(b.curso, 'es', { numeric: true }) || a.nombre.localeCompare(b.nombre); });
      },
      importAlumnos: function (d, q, u) {
        d.alumnos = d.alumnos || []; var seen = {}, add = 0, om = 0;
        d.alumnos.forEach(function (a) { if (a.anio === String(q.anio)) seen[runClean(a.run) || a.curso + '|' + a.nombre] = 1; });
        (q.alumnos || []).forEach(function (r) {
          var k = runClean(r.run) || r.curso + '|' + r.nombre;
          if (!r.nombre || !r.curso || seen[k]) { om++; return; }
          seen[k] = 1; add++;
          d.alumnos.push({ id: id('a-'), anio: String(q.anio), curso: String(r.curso).trim(), nombre: String(r.nombre).trim(), run: String(r.run || ''), creadoPor: u.nombre });
        });
        return { agregados: add, omitidos: om };
      },
      deleteAlumno: function (d, q) { d.alumnos = (d.alumnos || []).filter(function (a) { return a.id !== q.id; }); return true; },
      deleteCurso: function (d, q) { d.alumnos = (d.alumnos || []).filter(function (a) { return !(a.anio === String(q.anio) && a.curso === q.curso); }); return true; },
      emitirDiplomas: function (d, q, u) {
        d.dips = d.dips || []; var c = d.config, now = new Date().toISOString();
        if (!q.motivo) throw new Error('Indique el motivo del diploma');
        if (!c.directora) throw new Error('Complete el nombre de la directora en "Datos del colegio"');
        return (d.alumnos || []).filter(function (a) { return q.ids.indexOf(a.id) >= 0; }).map(function (a) {
          var rec = { tipo: 'diploma', nombre: a.nombre, curso: a.curso, run: a.run, motivo: q.motivo, fecha: q.fecha, colegio: c.colegio || '',
            directora: c.directora, cargo: c.cargo || 'Director(a) del Establecimiento', ciudad: c.ciudad || '' };
          d.dips.push({ id: id('d-'), anio: a.anio, alumnoId: a.id, curso: a.curso, nombre: a.nombre, run: a.run, motivo: q.motivo, fecha: q.fecha, datos: rec, emitido: now, emitidoPor: u.nombre });
          return rec;
        });
      },
      listDiplomas: function (d, q) {
        return (d.dips || []).filter(function (x) { return x.anio === String(q.anio); })
          .sort(function (a, b) { return String(b.emitido).localeCompare(String(a.emitido)) || a.nombre.localeCompare(b.nombre); });
      },
      deleteDiploma: function (d, q) { d.dips = (d.dips || []).filter(function (x) { return x.id !== q.id; }); return true; },
      marcarImpresa: function (d, q) {
        d.lic.forEach(function (l) { if ((q.ids || []).indexOf(l.id) >= 0) l.impresa = !!q.impresa; }); return true;
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
    aplicarCurso();
    return loadConfig().then(function () { renderAnios(); return loadStudents(); });
  }

  /* ---------------- año de trabajo ----------------
     Por defecto es el año del calendario: el 1 de enero pasa solo al año nuevo.
     Los datos de cada año quedan guardados y se pueden volver a consultar eligiéndolo. */
  function aniosDisponibles() {
    var set = {};
    String(S.config.anios || '').split(',').forEach(function (a) { if (/^\d{4}$/.test(a.trim())) set[a.trim()] = 1; });
    set[YEAR] = 1; set[S.anio] = 1;
    for (var y = 2026; y < Number(YEAR); y++) set[String(y)] = 1; // años anteriores desde que se usa el sistema
    return Object.keys(set).sort().reverse();
  }
  function renderAnios() {
    $('#anio').innerHTML = aniosDisponibles().map(function (a) {
      return '<option value="' + a + '"' + (a === S.anio ? ' selected' : '') + '>' + a + (a === YEAR ? ' (actual)' : '') + '</option>';
    }).join('') + '<option value="nuevo">+ Crear año nuevo…</option>';
  }
  function cambiarAnio(a) {
    S.anio = String(a); renderAnios(); recargarCurso(); refreshAssets();
    if (S.view === 'diplomas') loadDiplomas();
  }
  $('#anio').addEventListener('change', function () {
    if (this.value !== 'nuevo') return cambiarAnio(this.value);
    var sig = String(Number(aniosDisponibles()[0]) + 1);
    renderAnios();
    confirmDlg('Crear año nuevo', 'Se creará el año <b>' + sig + '</b> para trabajar sus licencias y diplomas. Los datos de los años anteriores quedan guardados y se pueden consultar eligiéndolos en esta lista.').then(function (ok) {
      if (!ok) return;
      var lista = aniosDisponibles().concat([sig]).sort().join(',');
      api('saveConfig', { config: { anios: lista } }).then(function (c) {
        S.config = c; cambiarAnio(sig); toast('Año ' + sig + ' creado');
      }).catch(function (e) { toast(e.message, true); });
    });
  });

  /* ---------------- navegación ---------------- */
  S.view = 'emitir'; S.archFiltro = 'todas';
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-view]'); if (!b) return;
    S.view = b.dataset.view;
    $$('#tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
    $$('.view').forEach(function (v) { v.classList.toggle('hidden', v.id !== 'view-' + S.view); });
    $('.actionbar').classList.toggle('hidden', S.view !== 'emitir');
    // el curso activo solo aplica a Emitir y Archivo
    $('#coursebar').classList.toggle('hidden', S.view !== 'emitir' && S.view !== 'archivo');
    document.body.classList.toggle('modo-dip', S.view === 'diplomas');
    if (S.view === 'archivo') loadArchivo();
    if (S.view === 'diplomas') loadDiplomas();
    else $('#dipActionbar').classList.add('hidden');
    if (S.view === 'usuarios') loadUsersAdmin();
    if (S.view === 'colegio') fillConfigForm();
  });

  $$('.seg').forEach(function (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (seg.dataset.bind === 'nivel') return setNivel(b.dataset.v);
      $$('button', seg).forEach(function (x) { x.classList.toggle('on', x === b); });
      if (seg.dataset.bind === 'archFiltro') { S.archFiltro = b.dataset.v; renderArchivo(); }
    });
  });
  /* Curso activo: cambia el color de toda la página y muestra solo los datos de ese curso */
  function aplicarCurso() {
    document.body.classList.toggle('curso-8B', S.nivel === '8B');
    document.body.classList.toggle('curso-4M', S.nivel !== '8B');
    $$('.seg[data-bind="nivel"] button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === S.nivel); });
    $('#courseBadge').innerHTML = S.nivel === '8B' ? '8°<small>Básico</small>' : '4°<small>Medio</small>';
    $('#courseName').textContent = Licencia.NIVELES[S.nivel].curso + ' · ' + S.anio;
  }
  function recargarCurso() {
    S.selected = {}; S.licencias = []; S.pendingImport = null;
    $('#importPreview').classList.add('hidden');
    aplicarCurso();
    loadStudents();
    if (S.view === 'archivo') loadArchivo();
  }

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
      : 'Fecha de impresión: <b>' + esc((S.config.ciudad ? S.config.ciudad + ', ' : '') + Licencia.fechaLarga(S.config.fecha)) + '</b>' +
        (String(S.config.fecha).slice(0, 4) !== S.anio ? ' <span class="chip warn">La fecha es de otro año: actualícela en "Datos del colegio"</span>' : '');
    return Licencia.prepareAssets(S.config).then(function (a) { S.assets = a; });
  }
  function bordeOn(c) { return String((c || S.config).borde) !== 'false'; }
  function printOpts(c) {
    c = c || S.config;
    return { borde: bordeOn(c), ajusteX: c.ajusteX || 0, ajusteY: c.ajusteY || 0 };
  }

  function fillConfigForm() {
    var f = $('#cfgForm'), c = S.config;
    ['colegio', 'rbd', 'region', 'provincia', 'comuna', 'directora', 'cargo', 'ciudad', 'fecha', 'ajusteX', 'ajusteY'].forEach(function (k) {
      f.elements[k].value = c[k] || (k === 'cargo' ? 'Directora del Establecimiento' : /^ajuste/.test(k) ? '0' : '');
    });
    f.elements.borde.checked = bordeOn(c);
    renderInsignias();
  }
  function readConfigForm() {
    var f = $('#cfgForm'), o = {};
    ['colegio', 'rbd', 'region', 'provincia', 'comuna', 'directora', 'cargo', 'ciudad', 'fecha', 'ajusteX', 'ajusteY'].forEach(function (k) { o[k] = f.elements[k].value.trim(); });
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
    var nivel = S.nivel, anio = S.anio;
    if (!S.students.length || S.students[0].nivel !== nivel) { S.students = []; renderStudents(); } // no mostrar datos del otro curso
    return api('listStudents', { nivel: nivel, anio: anio }).then(function (l) {
      if (nivel !== S.nivel || anio !== S.anio) return; // respuesta tardía de otro curso
      S.students = l; renderStudents();
      if (S.view === 'archivo') renderArchivo();
    }).catch(function (e) { toast(e.message, true); });
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
        if (r.meta.anio && r.meta.anio !== S.anio) cambiarAnio(r.meta.anio);
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
    if (n === S.nivel) return;
    S.nivel = n;
    recargarCurso();
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
        else if (/^(curso|cursos|nombrecurso|cursoalumno)$/.test(c)) m.curso = j;
        else if (/^(grado|nivel|desgrado)$/.test(c)) m.grado = j;
        else if (/^(letra|letracurso|paralelo|seccion)$/.test(c)) m.letra = j;
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
        curso: idx.curso != null ? String(r[idx.curso]).trim()
          : [idx.grado != null ? r[idx.grado] : '', idx.letra != null ? r[idx.letra] : ''].join(' ').trim(),
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
      colegio: c.colegio, rbd: c.rbd, region: c.region, provincia: c.provincia, comuna: c.comuna, anioEscolar: S.anio,
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
    var nivel = S.nivel, anio = S.anio;
    return api('listLicencias', { nivel: nivel, anio: anio }).then(function (l) {
      if (nivel !== S.nivel || anio !== S.anio) return; // llegó tarde de otro curso
      S.licencias = l; renderArchivo();
    }).catch(function (e) { toast(e.message, true); });
  }
  function esImpresa(l) { return l.impresa === true || l.impresa === 'TRUE' || l.impresa === 'true'; }
  function filteredLic() {
    var q = norm($('#archSearch').value), f = S.archFiltro;
    return S.licencias.filter(function (l) {
      if (f === 'imp' && !esImpresa(l)) return false;
      if (f === 'pend' && esImpresa(l)) return false;
      return !q || norm(l.nombre + l.run + l.registro).indexOf(q) >= 0;
    });
  }
  function renderArchivo() {
    var list = filteredLic();
    var tot = S.licencias.length, imp = S.licencias.filter(esImpresa).length, est = S.students.length;
    $('#archStats').innerHTML =
      '<div class="stat"><b>' + est + '</b><span>estudiantes</span></div>' +
      '<div class="stat"><b>' + tot + '</b><span>licencias emitidas</span></div>' +
      '<div class="stat ok"><b>' + imp + '</b><span>impresas</span></div>' +
      '<div class="stat warn"><b>' + (tot - imp) + '</b><span>por imprimir</span></div>' +
      '<div class="stat-bar"><i style="width:' + (tot ? Math.round(imp * 100 / tot) : 0) + '%"></i></div>' +
      (list.length ? '<div class="stat-actions"><button class="link" id="btnMarcarTodas">Marcar las ' + list.length + ' mostradas como impresas</button>' +
        '<button class="link" id="btnDesmarcarTodas">Desmarcar</button></div>' : '');
    $('#archTable tbody').innerHTML = list.map(function (l) {
      var ok = esImpresa(l);
      return '<tr data-id="' + esc(l.id) + '" class="' + (ok ? 'row-ok' : '') + '">' +
        '<td><label class="tick"><input type="checkbox" class="imp"' + (ok ? ' checked' : '') + '><span></span></label></td>' +
        '<td><b>' + esc(l.registro) + '</b></td><td class="name">' + esc(l.nombre) + '</td><td>' + esc(runFormat(l.run)) +
        '</td><td>' + esc(fmtDate(l.emitida)) + '</td><td>' + esc(l.emitidaPor) + '</td><td class="actions"><button class="link" data-act="dl">Descargar PDF</button>' +
        (S.user.rol === 'admin' ? '<button class="link danger" data-act="del">Quitar</button>' : '') + '</td></tr>';
    }).join('');
    $('#archEmpty').classList.toggle('hidden', list.length > 0);
    $('#archEmpty').textContent = S.licencias.length ? 'No hay licencias con este filtro.' : 'No hay licencias guardadas para ' + Licencia.NIVELES[S.nivel].curso + ' ' + S.anio + '.';
    $('#btnArchAll').disabled = !list.length; $('#btnCotejo').disabled = !list.length;
  }
  $('#archSearch').addEventListener('input', renderArchivo);

  function marcar(ids, valor) {
    var set = {}; ids.forEach(function (i) { set[i] = true; });
    S.licencias.forEach(function (l) { if (set[l.id]) l.impresa = valor; });
    renderArchivo();
    return api('marcarImpresa', { ids: ids, impresa: valor }).catch(function (e) { toast(e.message, true); loadArchivo(); });
  }
  $('#archTable tbody').addEventListener('change', function (e) {
    if (!e.target.classList.contains('imp')) return;
    marcar([e.target.closest('tr').dataset.id], e.target.checked);
  });
  $('#archStats').addEventListener('click', function (e) {
    if (e.target.id === 'btnMarcarTodas') marcar(filteredLic().map(function (l) { return l.id; }), true).then(function () { toast('Marcadas como impresas'); });
    if (e.target.id === 'btnDesmarcarTodas') marcar(filteredLic().map(function (l) { return l.id; }), false);
  });

  // Lista de cotejo: PDF tamaño carta vertical con casillas para revisar lo impreso
  $('#btnCotejo').addEventListener('click', function () {
    var list = filteredLic(); if (!list.length) return;
    var filtro = { todas: 'Todas las licencias', pend: 'Licencias por imprimir', imp: 'Licencias impresas' }[S.archFiltro];
    Licencia.listaCotejo(list.map(function (l) {
      return { registro: l.registro, nombre: l.nombre, run: runFormat(l.run), emitida: fmtDate(l.emitida).split(' ')[0], impresa: esImpresa(l) };
    }), {
      nivel: S.nivel, anio: S.anio, colegio: S.config.colegio, rbd: S.config.rbd, filtro: filtro, usuario: S.user.nombre
    }, S.assets).save('Lista_cotejo_' + (S.nivel === '8B' ? '8Basico' : '4Medio') + '_' + S.anio + '.pdf');
  });
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

  /* ======================= DIPLOMAS DE RECONOCIMIENTO ======================= */
  S.alumnos = []; S.dipSel = {}; S.diplomas = []; S.dipCurso = ''; S.dipPending = null;
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  $('#dipFecha').value = hoyISO();
  function porCurso(a, b) { return String(a).localeCompare(String(b), 'es', { numeric: true }); }

  function loadDiplomas() {
    var anio = S.anio;
    $('#dipTitle').textContent = 'Todos los cursos · ' + anio;
    return Promise.all([api('listAlumnos', { anio: anio }), api('listDiplomas', { anio: anio })]).then(function (r) {
      if (anio !== S.anio) return;
      S.alumnos = r[0]; S.diplomas = r[1];
      var ids = {}; S.alumnos.forEach(function (a) { ids[a.id] = 1; });
      Object.keys(S.dipSel).forEach(function (k) { if (!ids[k]) delete S.dipSel[k]; });
      renderAlumnos(); renderDiplomas();
    }).catch(function (e) { toast(e.message, true); });
  }

  function cursosDe(list) {
    var c = {}; list.forEach(function (a) { if (a.curso) c[a.curso] = (c[a.curso] || 0) + 1; });
    return Object.keys(c).sort(porCurso).map(function (k) { return [k, c[k]]; });
  }

  function renderAlumnos() {
    var cursos = cursosDe(S.alumnos);
    if (S.dipCurso && !cursos.some(function (c) { return c[0] === S.dipCurso; })) S.dipCurso = '';
    $('#dipCurso').innerHTML = '<option value="">Todos los cursos (' + S.alumnos.length + ')</option>' + cursos.map(function (c) {
      return '<option value="' + esc(c[0]) + '"' + (c[0] === S.dipCurso ? ' selected' : '') + '>' + esc(c[0]) + ' (' + c[1] + ')</option>';
    }).join('');
    $('#btnDelCurso').classList.toggle('hidden', !S.dipCurso);
    var list = alumnosFiltrados();
    $('#alumTable tbody').innerHTML = list.map(function (a) {
      return '<tr data-id="' + esc(a.id) + '" class="' + (S.dipSel[a.id] ? 'row-sel' : '') + '"><td><input type="checkbox" class="dsel"' + (S.dipSel[a.id] ? ' checked' : '') + '></td>' +
        '<td class="name">' + esc(a.nombre) + '</td><td><span class="chip curso">' + esc(a.curso) + '</span></td><td>' + esc(runFormat(a.run)) + '</td>' +
        '<td>' + (a.diplomas ? '<span class="chip ok">' + a.diplomas + ' diploma' + (a.diplomas > 1 ? 's' : '') + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="actions"><button class="link danger" data-act="del">Quitar</button></td></tr>';
    }).join('');
    $('#alumEmpty').classList.toggle('hidden', list.length > 0);
    $('#alumEmpty').textContent = S.alumnos.length ? 'No hay alumnos con este filtro.' : 'Aún no hay alumnos cargados para ' + S.anio + '. Cargue la lista de todos los cursos.';
    $('#alumCount').textContent = S.alumnos.length ? '· ' + S.alumnos.length + ' alumnos en ' + cursos.length + ' cursos' : '';
    $('#dipStats').innerHTML = '<span><b>' + S.alumnos.length + '</b> alumnos</span><span><b>' + cursos.length + '</b> cursos</span><span><b>' + S.diplomas.length + '</b> diplomas</span>';
    updDipSel();
  }
  function alumnosFiltrados() {
    var q = norm($('#dipSearch').value);
    return S.alumnos.filter(function (a) {
      return (!S.dipCurso || a.curso === S.dipCurso) && (!q || norm(a.nombre + a.run + a.curso).indexOf(q) >= 0);
    });
  }
  function updDipSel() {
    var n = Object.keys(S.dipSel).length, vis = alumnosFiltrados();
    $('#dipSelInfo').textContent = n + ' alumno' + (n === 1 ? '' : 's') + ' seleccionado' + (n === 1 ? '' : 's');
    $('#dipActionbar').classList.toggle('hidden', !(n > 0 && S.view === 'diplomas'));
    $('#dipChkAll').checked = vis.length > 0 && vis.every(function (a) { return S.dipSel[a.id]; });
  }
  $('#dipCurso').addEventListener('change', function () { S.dipCurso = this.value; renderAlumnos(); });
  $('#dipSearch').addEventListener('input', renderAlumnos);
  $('#dipChkAll').addEventListener('change', function () {
    var on = this.checked;
    alumnosFiltrados().forEach(function (a) { if (on) S.dipSel[a.id] = true; else delete S.dipSel[a.id]; });
    renderAlumnos();
  });
  $('#alumTable tbody').addEventListener('change', function (e) {
    if (!e.target.classList.contains('dsel')) return;
    var tr = e.target.closest('tr'), id = tr.dataset.id;
    if (e.target.checked) S.dipSel[id] = true; else delete S.dipSel[id];
    tr.classList.toggle('row-sel', e.target.checked); updDipSel();
  });
  $('#alumTable tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act="del"]'); if (!b) return;
    var a = S.alumnos.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    confirmDlg('Quitar alumno', '¿Quitar a <b>' + esc(a.nombre) + '</b> de la lista? Sus diplomas ya emitidos se mantienen en el archivo.').then(function (ok) {
      if (ok) api('deleteAlumno', { id: a.id }).then(loadDiplomas).catch(function (err) { toast(err.message, true); });
    });
  });
  $('#btnDelCurso').addEventListener('click', function () {
    var c = S.dipCurso; if (!c) return;
    confirmDlg('Eliminar curso', '¿Quitar a todos los alumnos de <b>' + esc(c) + '</b> (' + S.anio + ')? Los diplomas ya emitidos se mantienen.').then(function (ok) {
      if (ok) api('deleteCurso', { anio: S.anio, curso: c }).then(function () { S.dipCurso = ''; return loadDiplomas(); }).catch(function (err) { toast(err.message, true); });
    });
  });
  $('#btnDipClear').addEventListener('click', function () { S.dipSel = {}; renderAlumnos(); });

  // --- carga de la lista (Excel/CSV con curso, o nómina PDF de un curso) ---
  var dDrop = $('#dipDrop');
  ['dragover', 'dragenter'].forEach(function (ev) { dDrop.addEventListener(ev, function () { dDrop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dDrop.addEventListener(ev, function () { dDrop.classList.remove('over'); }); });
  $('#dipFile').addEventListener('change', function () { if (this.files[0]) leerListaDiplomas(this.files[0]); this.value = ''; });

  function leerListaDiplomas(file) {
    file.slice(0, 5).arrayBuffer().then(function (b) {
      var esPdf = String.fromCharCode.apply(null, new Uint8Array(b)).indexOf('%PDF') === 0 || /\.pdf$/i.test(file.name);
      if (esPdf) {
        busy(true, 'Leyendo PDF…');
        return file.arrayBuffer().then(parsePdf).then(function (r) {
          var cursoPdf = r.meta.nivel === '8B' ? '8° Básico' : r.meta.nivel === '4M' ? '4° Medio' : '';
          return r.students.map(function (s) { return { nombre: s.nombre, run: s.run, curso: cursoPdf }; });
        }).then(function (l) { busy(false); return l; }, function (e) { busy(false); throw e; });
      }
      var isCsv = /\.csv$/i.test(file.name);
      return (isCsv ? file.text().then(function (t) { return XLSX.read(t.replace(/^﻿/, ''), { type: 'string', raw: true }); })
        : file.arrayBuffer().then(function (bb) { return XLSX.read(bb, { type: 'array' }); })).then(function (wb) {
        // lee TODAS las hojas (algunos colegios tienen una hoja por curso; el nombre de la hoja sirve como curso)
        var out = [];
        wb.SheetNames.forEach(function (sn) {
          mapRows(XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: false })).forEach(function (s) {
            out.push({ nombre: s.nombre, run: s.run, curso: s.curso || (wb.SheetNames.length > 1 ? sn : '') });
          });
        });
        return out;
      });
    }).then(function (lista) {
      if (!lista.length) throw new Error('No se encontraron alumnos. Revise que existan las columnas "curso" y "nombre".');
      S.dipPending = lista;
      var sinCurso = lista.filter(function (a) { return !a.curso; }).length;
      var cursos = cursosDe(lista);
      $('#dipImportInfo').innerHTML = '<div class="imp-head"><b>' + lista.length + '</b> alumnos detectados en <i>' + esc(file.name) + '</i> para el año <b>' + esc(S.anio) + '</b></div>' +
        (cursos.length ? '<div class="kvs mt-s">' + cursos.map(function (c) { return '<span class="kv"><small>' + c[1] + ' alumnos</small>' + esc(c[0]) + '</span>'; }).join('') + '</div>' : '') +
        (sinCurso ? '<label class="mt-s">Curso para los ' + sinCurso + ' alumnos sin curso<input id="dipCursoDef" placeholder="Ej.: 3° Básico A"></label>' : '');
      $('#dipImport').classList.remove('hidden');
    }).catch(function (e) { toast(e.message || 'No se pudo leer el archivo', true); });
  }
  $('#btnDipCancel').addEventListener('click', function () { S.dipPending = null; $('#dipImport').classList.add('hidden'); });
  $('#btnDipImport').addEventListener('click', function () {
    var def = $('#dipCursoDef') ? $('#dipCursoDef').value.trim() : '';
    var lista = (S.dipPending || []).map(function (a) { return { nombre: a.nombre, run: a.run, curso: a.curso || def }; });
    if (lista.some(function (a) { return !a.curso; })) return toast('Indique el curso de los alumnos que no lo tienen', true);
    busy(true, 'Agregando alumnos…');
    api('importAlumnos', { anio: S.anio, alumnos: lista }).then(function (r) {
      S.dipPending = null; $('#dipImport').classList.add('hidden');
      toast(r.agregados + ' alumnos agregados' + (r.omitidos ? ' · ' + r.omitidos + ' omitidos (repetidos o sin curso)' : ''));
      return loadDiplomas();
    }).catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
  });

  // --- motivo, fecha, generación ---
  $('#dipMotivoSel').addEventListener('change', function () { $('#dipOtroWrap').classList.toggle('hidden', this.value !== 'otro'); });
  function motivoActual() { var v = $('#dipMotivoSel').value; return v === 'otro' ? $('#dipMotivoOtro').value.trim() : v; }
  function dipRecord(a, motivo, fecha) {
    var c = S.config;
    return { tipo: 'diploma', nombre: a.nombre, curso: a.curso, motivo: motivo, fecha: fecha, colegio: c.colegio || window.COLEGIO_NOMBRE || '',
      directora: c.directora, cargo: c.cargo, ciudad: c.ciudad };
  }
  $('#btnDipPreview').addEventListener('click', function () {
    var a = S.alumnos.filter(function (x) { return S.dipSel[x.id]; })[0] || S.alumnos[0] || { nombre: 'Nombre Apellido Apellido', curso: '3° Básico A' };
    var w = window.open('', '_blank');
    var url = Licencia.buildDiplomas([dipRecord(a, motivoActual() || 'Su destacada participación', $('#dipFecha').value || hoyISO())], S.assets, printOpts()).output('bloburl');
    if (w) w.location.href = url; else window.location.href = url;
  });
  $('#btnDipEmitir').addEventListener('click', function () {
    var ids = Object.keys(S.dipSel), motivo = motivoActual(), fecha = $('#dipFecha').value;
    if (!ids.length) return toast('Seleccione al menos un alumno', true);
    if (!motivo) return toast('Escriba el motivo del diploma', true);
    if (!fecha) return toast('Indique la fecha del diploma', true);
    busy(true, 'Generando ' + ids.length + ' diploma(s)…');
    api('emitirDiplomas', { anio: S.anio, ids: ids, motivo: motivo, fecha: fecha }).then(function (recs) {
      recs.sort(function (a, b) { return porCurso(a.curso, b.curso) || a.nombre.localeCompare(b.nombre); });
      Licencia.buildDiplomas(recs, S.assets, printOpts()).save('Diplomas_' + slug(motivo).slice(0, 40) + '_' + fecha + '.pdf');
      toast(recs.length + ' diploma(s) generados y guardados');
      S.dipSel = {};
      return loadDiplomas();
    }).catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
  });

  // --- archivo de diplomas ---
  function diplomasFiltrados() {
    var c = $('#dipArchCurso').value, m = $('#dipArchMotivo').value;
    return S.diplomas.filter(function (d) { return (!c || d.curso === c) && (!m || d.motivo === m); });
  }
  function renderDiplomas() {
    var cSel = $('#dipArchCurso').value, mSel = $('#dipArchMotivo').value;
    var motivos = {}; S.diplomas.forEach(function (d) { motivos[d.motivo] = (motivos[d.motivo] || 0) + 1; });
    $('#dipArchCurso').innerHTML = '<option value="">Todos los cursos</option>' + cursosDe(S.diplomas).map(function (c) {
      return '<option value="' + esc(c[0]) + '"' + (c[0] === cSel ? ' selected' : '') + '>' + esc(c[0]) + ' (' + c[1] + ')</option>'; }).join('');
    $('#dipArchMotivo').innerHTML = '<option value="">Todos los motivos</option>' + Object.keys(motivos).sort().map(function (m) {
      return '<option value="' + esc(m) + '"' + (m === mSel ? ' selected' : '') + '>' + esc(m) + ' (' + motivos[m] + ')</option>'; }).join('');
    var list = diplomasFiltrados();
    $('#dipTable tbody').innerHTML = list.map(function (d) {
      return '<tr data-id="' + esc(d.id) + '"><td>' + esc(Licencia.fechaLarga(d.fecha)) + '</td><td class="name">' + esc(d.nombre) + '</td><td><span class="chip curso">' + esc(d.curso) +
        '</span></td><td>' + esc(d.motivo) + '</td><td>' + esc(d.emitidoPor) + '<br><small class="muted">' + esc(fmtDate(d.emitido)) + '</small></td>' +
        '<td class="actions"><button class="link" data-act="dl">Descargar PDF</button>' + (S.user.rol === 'admin' ? '<button class="link danger" data-act="del">Quitar</button>' : '') + '</td></tr>';
    }).join('');
    $('#dipEmpty').classList.toggle('hidden', list.length > 0);
    $('#dipCount').textContent = S.diplomas.length ? '· ' + S.diplomas.length + ' en ' + S.anio : '';
    $('#btnDipAll').disabled = !list.length;
  }
  $('#dipArchCurso').addEventListener('change', renderDiplomas);
  $('#dipArchMotivo').addEventListener('change', renderDiplomas);
  function dipDatos(d) { return Object.assign({ nombre: d.nombre, curso: d.curso, motivo: d.motivo, fecha: d.fecha }, d.datos || {}); }
  $('#dipTable tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var d = S.diplomas.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    if (b.dataset.act === 'dl') Licencia.buildDiplomas([dipDatos(d)], S.assets, printOpts()).save('Diploma_' + slug(d.nombre) + '.pdf');
    else confirmDlg('Quitar diploma', '¿Quitar el diploma de <b>' + esc(d.nombre) + '</b> (' + esc(d.motivo) + ') del archivo?').then(function (ok) {
      if (ok) api('deleteDiploma', { id: d.id }).then(loadDiplomas).catch(function (err) { toast(err.message, true); });
    });
  });
  $('#btnDipAll').addEventListener('click', function () {
    var l = diplomasFiltrados(); if (!l.length) return;
    Licencia.buildDiplomas(l.map(dipDatos), S.assets, printOpts()).save('Diplomas_' + S.anio + '_' + l.length + '.pdf');
  });

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
