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
    var x = parseFloat(a.registro), y = parseFloat(b.registro), o = (a.orden || 1e9) - (b.orden || 1e9);
    if (isNaN(x) && isNaN(y)) return o || a.nombre.localeCompare(b.nombre);
    if (isNaN(x)) return 1; if (isNaN(y)) return -1;
    return x - y || o;
  }
  /* Cursos: nombre uniforme y orden escolar (Pre-Kínder, Kínder, 1°–8° Básico, 1°–4° Medio; luego la letra).
     Las mismas reglas están en Code.gs (cursoCanonico_ / ordenCurso_). */
  function sinTildes(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function cursoCanonico(s) {
    var t = String(s || '').replace(/\s+/g, ' ').trim(), n = sinTildes(t).toLowerCase();
    var L = /(?:^|[\s°º\-])([a-h])\s*$/i.exec(t), letra = L ? ' ' + L[1].toUpperCase() : '';
    if (/pre\s*-?\s*kinder|prekinder|primer nivel de transicion|\bnt1\b|\bpk\b/.test(n)) return 'Pre-Kínder' + letra;
    if (/kinder|segundo nivel de transicion|\bnt2\b|^k\b/.test(n)) return 'Kínder' + letra;
    var g = /(\d{1,2})\s*(?:°|º|ro|do|to|vo|no|mo|er)?\s*(?:ano\s+)?(basico|basica|medio|media|b\b|m\b)/.exec(n);
    if (g) return g[1] + '° ' + (/^b/.test(g[2]) ? 'Básico' : 'Medio') + letra;
    return t;
  }
  function rangoCurso(c) {
    var n = sinTildes(c).toLowerCase(), g;
    if (/pre-?kinder/.test(n)) return 0;
    if (/kinder/.test(n)) return 1;
    if ((g = /(\d{1,2})° basico/.exec(n))) return 1 + Number(g[1]);
    if ((g = /(\d{1,2})° medio/.exec(n))) return 9 + Number(g[1]);
    return 99;
  }
  function ordenCurso(a, b) { return rangoCurso(a) - rangoCurso(b) || String(a).localeCompare(String(b), 'es', { numeric: true }); }
  // Cursos del colegio (para elegir al agregar un alumno a mano)
  var CURSOS_COLEGIO = ['Pre-Kínder A', 'Pre-Kínder B', 'Kínder A', 'Kínder B']
    .concat([1, 2, 3, 4, 5, 6, 7, 8].reduce(function (a, n) { return a.concat([n + '° Básico A', n + '° Básico B']); }, []))
    .concat([1, 2, 3, 4].reduce(function (a, n) { return a.concat([n + '° Medio A', n + '° Medio B', n + '° Medio C']); }, []));
  function maxOrden(list) { return list.reduce(function (m, x) { return Math.max(m, Number(x.orden) || 0); }, 0); }
  function penBtn() { return ' <button class="pen" data-act="nom" title="Corregir el nombre" aria-label="Corregir el nombre">✎</button>'; }
  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o[k]) r[k] = o[k]; }); return r; }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  // R.U.N. chileno: formato y dígito verificador
  function runClean(r) { return String(r || '').toUpperCase().replace(/[^0-9K]/g, ''); }
  /* IPE (Identificador Provisorio Escolar): alumnos sin RUN chileno, números desde 100.000.000
     (o el genérico "100.000-000"). Se aceptan y no se usan para detectar repetidos. */
  function runEsIPE(r) {
    var s = String(r || '').trim(), c = runClean(s);
    return /^\d{3}\.?\d{3}-\d{3}$/.test(s) || (c.length >= 10 && Number(c.slice(0, -1)) >= 100000000);
  }
  // clave para detectar repetidos: el RUN solo si es real y válido; si no, el nombre (y curso)
  function claveAlumno(run, nombre, extra) {
    return runValid(run) && !runEsIPE(run) ? 'r' + runClean(run) : 'n' + (extra || '') + '|' + String(nombre || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function runChip(r) {
    if (runEsIPE(r)) return '<span class="chip ipe" title="Identificador Provisorio Escolar (alumno sin RUN chileno)">IPE</span>';
    return runValid(r) ? '' : '<span class="badrun">R.U.N. no válido</span>';
  }
  function runFormat(r) {
    if (/^\s*\d{3}\.?\d{3}-\d{3}\s*$/.test(String(r || ''))) return String(r).trim(); // "100.000-000" tal cual
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
    }).then(function (r) { return r.json(); }).catch(function () {
      // "Failed to fetch" o respuesta no-JSON: Google devolvió una página de error en vez de datos
      var e = new Error(/^(enviarInvitacion|solicitarCodigo|enviarBienvenida)$/.test(action)
        ? 'Google no permitió enviar el correo: falta autorizar el permiso de correo en Apps Script (en el editor ejecute la función "setup" y acepte "Enviar correo electrónico en su nombre").'
        : 'No se pudo conectar con Apps Script. Revise su conexión a internet e intente de nuevo.');
      e.red = true; throw e;
    });
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
      var del = d.students.filter(function (s) { return s.nivel === q.nivel && s.anio === String(q.anio); }), orden = maxOrden(del);
      del.forEach(function (s) { seen[claveAlumno(s.run, s.nombre)] = 1; });
      (q.students || []).forEach(function (r) {
        var n = String(r.nombre || '').replace(/\s+/g, ' ').trim(), k = claveAlumno(r.run, n);
        if (!n || seen[k]) { om++; return; }
        seen[k] = 1; add++;
        d.students.push({ id: id('s-'), nivel: q.nivel, anio: String(q.anio), nombre: n, run: String(r.run || '').trim().toUpperCase(),
          sexo: /^f/i.test(r.sexo || '') ? 'F' : /^m/i.test(r.sexo || '') ? 'M' : '', registro: String(r.registro == null ? '' : r.registro).trim(), creadoPor: u.nombre, orden: ++orden });
      });
      return { agregados: add, omitidos: om, lista: listStud(d, q) };
    }
    var DEMO_PDF = {};
    function soloAdmin(u) { if (u.rol !== 'admin') throw new Error('Solo un administrador puede hacer esto'); }
    var A = {
      portada: function (d) { return { colegio: d.config.colegio || '', logo: d.config.logoPortada || '' }; },
      listUsers: function (d) { return d.users.filter(function (u) { return u.activo && u.conClave !== false; }).map(function (u) { return { id: u.id, nombre: u.nombre }; }); },
      login: function (d, q) {
        var u = d.users.filter(function (x) { return x.id === q.userId && x.activo; })[0];
        if (!u || !q.password || (u.clave && q.password !== u.clave)) throw new Error('Usuario o clave incorrectos');
        var t = id('t-'); d.tokens[t] = u.id; return { token: t, user: u };
      },
      logout: function () { return true; },
      me: function (d, q, u) { return u; },
      getConfig: function (d) { return d.config; },
      saveConfig: function (d, q, u) {
        if (u.rol !== 'admin' && Object.keys(q.config || {}).some(function (k) { return k !== 'anios'; })) throw new Error('Solo un administrador puede modificar los datos del colegio');
        Object.assign(d.config, q.config); return d.config;
      },
      saveLogo: function (d, q, u) {
        if (u.rol !== 'admin') throw new Error('Solo un administrador puede hacer esto');
        if (q.tipo === 'portada') { d.config.logoPortada = q.dataUrl || ''; return d.config; } d.config[q.tipo === 'ministerio' ? 'logoMinisterio' : 'logoColegio'] = q.dataUrl || ''; return d.config; },
      listStudents: function (d, q) { return listStud(d, q); },
      importStudents: imp,
      addStudent: function (d, q, u) { return imp(d, { nivel: q.nivel, anio: q.anio, students: [q.student] }, u); },
      updateStudent: function (d, q) { var s = d.students.filter(function (x) { return x.id === q.id; })[0]; Object.assign(s, q.student); return true; },
      deleteStudent: function (d, q, u) { soloAdmin(u); var ids = q.ids || [q.id]; d.students = d.students.filter(function (x) { return ids.indexOf(x.id) < 0; }); return ids.length; },
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
            directora: c.directora, cargo: c.cargo || 'Director(a) del Establecimiento', ciudad: c.ciudad, fecha: c.fecha, modeloId: q.modeloId || '' };
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
          .sort(function (a, b) { return ordenCurso(a.curso, b.curso) || (a.orden || 1e9) - (b.orden || 1e9) || a.nombre.localeCompare(b.nombre); });
      },
      importAlumnos: function (d, q, u) {
        soloAdmin(u); d.alumnos = d.alumnos || []; var seen = {}, add = 0, om = 0;
        var del = d.alumnos.filter(function (a) { return a.anio === String(q.anio); }), orden = maxOrden(del);
        del.forEach(function (a) { seen[claveAlumno(a.run, a.nombre, a.curso)] = 1; });
        (q.alumnos || []).forEach(function (r) {
          r = Object.assign({}, r, { curso: cursoCanonico(r.curso) });
          var k = claveAlumno(r.run, r.nombre, r.curso);
          if (!r.nombre || !r.curso || seen[k]) { om++; return; }
          seen[k] = 1; add++;
          d.alumnos.push({ id: id('a-'), anio: String(q.anio), curso: String(r.curso).trim(), nombre: String(r.nombre).trim(), run: String(r.run || ''), creadoPor: u.nombre, orden: ++orden });
        });
        return { agregados: add, omitidos: om };
      },
      deleteAlumno: function (d, q, u) { soloAdmin(u); var ids = q.ids || [q.id]; d.alumnos = (d.alumnos || []).filter(function (a) { return ids.indexOf(a.id) < 0; }); return ids.length; },
      deleteCurso: function (d, q, u) { soloAdmin(u); d.alumnos = (d.alumnos || []).filter(function (a) { return !(a.anio === String(q.anio) && a.curso === q.curso); }); return true; },
      emitirDiplomas: function (d, q, u) {
        d.dips = d.dips || []; var c = d.config, now = new Date().toISOString();
        if (!q.motivo) throw new Error('Indique el motivo del diploma');
        if (!c.directora) throw new Error('Complete el nombre de la directora en "Datos del colegio"');
        return (d.alumnos || []).filter(function (a) { return q.ids.indexOf(a.id) >= 0; }).map(function (a) {
          var rec = { tipo: 'diploma', nombre: a.nombre, curso: a.curso, run: a.run, motivo: q.motivo, fecha: q.fecha, colegio: c.colegio || '',
            directora: c.directora, cargo: c.cargo || 'Director(a) del Establecimiento', ciudad: c.ciudad || '', modeloId: q.modeloId || '', firmas: (q.firmas || []).filter(function (f) { return f && f.nombre; }) };
          d.dips.push({ id: id('d-'), anio: a.anio, alumnoId: a.id, curso: a.curso, nombre: a.nombre, run: a.run, motivo: q.motivo, fecha: q.fecha, datos: rec, emitido: now, emitidoPor: u.nombre, emitidoPorId: u.id });
          return rec;
        });
      },
      listDiplomas: function (d, q) {
        return (d.dips || []).filter(function (x) { return x.anio === String(q.anio); })
          .sort(function (a, b) { return String(b.emitido).localeCompare(String(a.emitido)) || a.nombre.localeCompare(b.nombre); });
      },
      deleteDiploma: function (d, q, u) { var x0 = (d.dips || []).filter(function (x) { return x.id === q.id; })[0]; if (u.rol !== 'admin' && x0 && x0.emitidoPorId !== u.id) throw new Error('Solo puede eliminar los diplomas que usted emitió'); d.dips = (d.dips || []).filter(function (x) { return x.id !== q.id; }); return true; },
      updateAlumno: function (d, q, u) { soloAdmin(u);
        var a = (d.alumnos || []).filter(function (x) { return x.id === q.id; })[0]; Object.assign(a, q.alumno);
        if (q.alumno.curso !== undefined) a.curso = cursoCanonico(q.alumno.curso);
        return true;
      },
      renombrarDocumento: function (d, q) {
        var dip = q.tipo === 'diploma', r = (dip ? d.dips : d.lic).filter(function (x) { return x.id === q.id; })[0];
        r.nombre = q.nombre; r.datos = Object.assign({}, r.datos, { nombre: q.nombre });
        if (q.enLista) (dip ? d.alumnos : d.students).forEach(function (x) { if (x.id === (dip ? r.alumnoId : r.studentId)) x.nombre = q.nombre; });
        return true;
      },
      marcarImpresa: function (d, q) {
        d.lic.forEach(function (l) { if ((q.ids || []).indexOf(l.id) >= 0) l.impresa = !!q.impresa; }); return true;
      },
      deleteLicencia: function (d, q) { d.lic = d.lic.filter(function (l) { return l.id !== q.id; }); return true; },
      // demo: no envía correos; muestra la clave/código en pantalla
      changePassword: function (d, q, u) { u.cambiarClave = false; u.clave = q.nueva; return true; },
      adminListUsers: function (d) { return d.users; },
      createUser: function (d, q) {
        var dom = '@' + (window.DOMINIO_CORREO || 'andaliensur.cl');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email || '') || q.email.slice(-dom.length) !== dom) throw new Error('El correo debe ser institucional: …' + dom);
        if (d.users.some(function (x) { return x.email === q.email; })) throw new Error('Ya existe un usuario con ese correo');
        var clave = 'Demo' + Math.floor(1000 + Math.random() * 9000), nu = { id: id('u-'), nombre: q.nombre, email: q.email, rol: q.rol, activo: true, cambiarClave: true, clave: clave };
        d.users.push(nu);
        return { lista: d.users, id: nu.id, email: q.email, clave: clave };
      },
      reenviarInvitacion: function (d, q) {
        var u = d.users.filter(function (x) { return x.id === q.id; })[0], clave = 'Demo' + Math.floor(1000 + Math.random() * 9000);
        u.cambiarClave = true; u.clave = clave;
        return { lista: d.users, id: u.id, email: u.email, clave: clave };
      },
      enviarInvitacion: function () { return { enviado: false }; },
      listModelos: function (d) { return d.modelos || []; },
      getModeloArchivo: function (d, q) {
        var u = DEMO_PDF[q.id] || (function () { try { return localStorage.getItem('lic_demo_pdf_' + q.id); } catch (e) { return null; } })();
        if (!u) throw new Error('El PDF de este modelo no está en este navegador (modo demostración)');
        return { dataUrl: u };
      },
      subirModelo: function (d, q, u) {
        soloAdmin(u); d.modelos = d.modelos || [];
        var m = { id: id('m-'), tipo: q.tipo, nombre: q.nombre, modo: q.modo, orient: q.orient, logos: !!q.logos, campos: q.campos || [], creado: new Date().toISOString(), creadoPor: u.nombre, zona: q.zona, aclarar: q.aclarar || 0 };
        DEMO_PDF[m.id] = q.dataUrl; try { localStorage.setItem('lic_demo_pdf_' + m.id, q.dataUrl); } catch (e) {}
        d.modelos.push(m); return m;
      },
      guardarModelo: function (d, q, u) {
        soloAdmin(u); var m = (d.modelos || []).filter(function (x) { return x.id === q.id; })[0];
        ['nombre', 'modo', 'logos', 'campos', 'zona', 'aclarar'].forEach(function (k) { if (q[k] != null) m[k] = q[k]; }); return d.modelos;
      },
      eliminarModelo: function (d, q, u) { soloAdmin(u); d.modelos = (d.modelos || []).filter(function (x) { return x.id !== q.id; }); return d.modelos; },
      // demo: simula Google con el correo escrito (en producción lo valida Google)
      loginGoogle: function (d, q) {
        var email = String(q.demoEmail || '').toLowerCase(), dom = '@' + (window.DOMINIO_CORREO || 'andaliensur.cl');
        if (email.slice(-dom.length) !== dom) throw new Error('Use su cuenta institucional ' + dom + ' (ingresó con ' + email + ').');
        var u = d.users.filter(function (x) { return String(x.email).toLowerCase() === email; })[0];
        if (!u) throw new Error('El correo ' + email + ' no está autorizado. Pida al administrador que lo agregue a la lista.');
        if (!u.activo) throw new Error('Su acceso está desactivado. Consulte al administrador.');
        u.ultimoIngreso = new Date().toISOString();
        var t = id('t-'); d.tokens[t] = u.id;
        return { token: t, user: Object.assign({}, u, { cambiarClave: false }) };
      },
      autorizarCorreos: function (d, q) {
        var dom = '@' + (window.DOMINIO_CORREO || 'andaliensur.cl'), add = 0, om = [], inv = [];
        (q.personas || []).forEach(function (x) {
          var e = String(x.email || '').trim().toLowerCase(); if (e && e.indexOf('@') < 0) e += dom;
          if (!e || e.slice(-dom.length) !== dom || !/^[^\s@]+@/.test(e)) return inv.push(x.email || x.nombre);
          if (d.users.some(function (u) { return u.email === e; })) return om.push(e);
          d.users.push({ id: id('u-'), nombre: x.nombre || e.split('@')[0], email: e, rol: q.rol, activo: true, conClave: false }); add++;
        });
        String(q.texto || '').split(/\r?\n|;/).forEach(function (l) {
          l = l.trim(); if (!l) return;
          var p = l.split(/[,\t]/), partes = p.length === 2 && /\s/.test(p[1].trim()) && p[1].indexOf('@') < 0 ? [[p[0], p[1].trim()]]
            : l.split(/[\s,]+/).filter(Boolean).map(function (e) { return [e, '']; });
          partes.forEach(function (x) {
            var e = x[0].trim().toLowerCase(); if (e.indexOf('@') < 0) e += dom;
            if (e.slice(-dom.length) !== dom || !/^[^\s@]+@/.test(e)) return inv.push(x[0]);
            if (d.users.some(function (u) { return u.email === e; })) return om.push(e);
            d.users.push({ id: id('u-'), nombre: x[1] || e.split('@')[0], email: e, rol: q.rol, activo: true, conClave: false }); add++;
          });
        });
        return { lista: d.users, agregados: add, omitidos: om, invalidos: inv, nuevosIds: d.users.slice(-add).map(function (u) { return u.id; }).slice(0, add) };
      },
      enviarBienvenida: function () { return { enviados: [], fallidos: [], demo: true };
      },
      solicitarCodigo: function (d, q) {
        var u = d.users.filter(function (x) { return x.id === q.userId; })[0];
        if (!u) throw new Error('Seleccione su nombre');
        if (!u.email) throw new Error('Su usuario no tiene correo registrado. Pida al administrador que le envíe una clave provisoria.');
        d.codigo = String(Math.floor(100000 + Math.random() * 900000));
        return { correo: u.email.slice(0, 2) + '•••@' + u.email.split('@')[1], demoCodigo: d.codigo };
      },
      restablecerClave: function (d, q) {
        if (!d.codigo || q.codigo !== d.codigo) throw new Error('Código incorrecto');
        var u = d.users.filter(function (x) { return x.id === q.userId; })[0]; u.clave = q.nueva; u.cambiarClave = false; d.codigo = null;
        return true;
      },
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
              if (['listUsers', 'login', 'loginGoogle', 'solicitarCodigo', 'restablecerClave', 'portada'].indexOf(q.action) < 0) {
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
  /* ---- Selector visual de usuario: tarjetas con iniciales; recuerda al último que ingresó en este equipo ---- */
  var AV_COLORS = ['#19305e', '#6d1f3a', '#1d5c46', '#7a4b12', '#4a2f6b', '#245a7a', '#7a2a2a', '#3d5a1e'];
  function iniciales(n) {
    var w = String(n || '').trim().split(/\s+/).filter(function (x) { return x.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(x); });
    return ((w[0] || '?').charAt(0) + (w.length > 1 ? w[w.length > 2 ? 2 : 1].charAt(0) : '')).toUpperCase();
  }
  function avatarHtml(n, size) {
    var h = 0; String(n).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    return '<span class="avatar' + (size ? ' ' + size : '') + '" style="background:' + AV_COLORS[h % AV_COLORS.length] + '">' + esc(iniciales(n)) + '</span>';
  }
  S.loginUsers = [];
  function loadUsers() {
    return api('listUsers').then(function (list) {
      S.loginUsers = list;
      $('#userSearch').classList.toggle('hidden', list.length <= 6);
      renderUserPick();
      var last = ''; try { last = localStorage.getItem('lic_last_user') || ''; } catch (e) {}
      if (list.length === 1) last = list[0].id;
      if (last && list.some(function (u) { return u.id === last; })) elegirUsuario(last, true);
    }).catch(function (e) { $('#loginError').textContent = 'No se pudo conectar: ' + e.message; });
  }
  function renderUserPick() {
    var q = norm($('#userSearch').value), sel = $('#loginUser').value;
    var list = S.loginUsers.filter(function (u) { return !q || norm(u.nombre).indexOf(q) >= 0; });
    $('#userPick').innerHTML = list.length ? list.map(function (u) {
      return '<button type="button" role="radio" aria-checked="' + (u.id === sel) + '" class="user-card' + (u.id === sel ? ' on' : '') + '" data-uid="' + esc(u.id) + '">' +
        avatarHtml(u.nombre) + '<span class="uc-name">' + esc(u.nombre) + '</span><span class="uc-check">✓</span></button>';
    }).join('') : '<p class="muted">No hay usuarios con ese nombre.</p>';
  }
  function elegirUsuario(id, sinFoco) {
    var u = S.loginUsers.filter(function (x) { return x.id === id; })[0]; if (!u) return;
    $('#loginUser').value = id;
    $('#passWho').textContent = 'de ' + u.nombre.split(' ')[0];
    $('#loginPass').disabled = false; $('#loginPass').placeholder = 'Escriba su clave'; $('#btnIngresar').disabled = false;
    $('#loginError').textContent = '';
    renderUserPick();
    if (!sinFoco) $('#loginPass').focus();
  }
  $('#userPick').addEventListener('click', function (e) { var b = e.target.closest('[data-uid]'); if (b) elegirUsuario(b.dataset.uid); });
  $('#userSearch').addEventListener('input', renderUserPick);
  $('#btnEye').addEventListener('click', function () {
    var p = $('#loginPass'); p.type = p.type === 'password' ? 'text' : 'password';
  });

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#loginError').textContent = '';
    var uid = $('#loginUser').value, pass = $('#loginPass').value;
    if (!uid) { $('#loginError').textContent = 'Toque su nombre en la lista.'; return; }
    if (!pass) { $('#loginError').textContent = 'Escriba su clave.'; $('#loginPass').focus(); return; }
    busy(true, 'Ingresando…');
    api('login', { userId: uid, password: pass }).then(function (r) {
      S.token = r.token; ss('set', 'lic_token', r.token); $('#loginPass').value = '';
      try { localStorage.setItem('lic_last_user', uid); } catch (e2) {}
      return startApp(r.user, pass);
    }).catch(function (err) { $('#loginError').textContent = err.message; }).then(function () { busy(false); });
  });

  /* ---- Recuperar clave: código de 6 dígitos al correo del usuario (su clave actual sigue válida hasta usarlo) ---- */
  $('#btnOlvide').addEventListener('click', function () {
    var uid = $('#loginUser').value;
    if (!uid) { $('#loginError').textContent = 'Primero toque su nombre en la lista y luego "¿Olvidó su clave?".'; return; }
    var u = S.loginUsers.filter(function (x) { return x.id === uid; })[0];
    confirmDlg('Recuperar clave', 'Enviaremos un <b>código de 6 dígitos</b> al correo registrado de <b>' + esc(u.nombre) + '</b> para que cree una nueva clave.').then(function (ok) {
      if (!ok) return;
      busy(true, 'Enviando código…');
      api('solicitarCodigo', { userId: uid, pageUrl: location.origin + location.pathname }).then(function (r) {
        busy(false);
        if (r.demoCodigo) toast('Modo demostración: el código es ' + r.demoCodigo);
        return pedirCodigo(uid, r.correo);
      }).catch(function (e) { busy(false); $('#loginError').textContent = e.message; });
    });
  });
  function pedirCodigo(uid, correo, msg) {
    return formDlg('Crear nueva clave', [
      { name: 'codigo', label: 'Código enviado a ' + correo + (msg ? ' — ' + msg : ''), required: true, minlength: 6 },
      { name: 'nueva', label: 'Nueva clave (mín. 8 caracteres)', type: 'password', required: true, minlength: 8 },
      { name: 'repite', label: 'Repita la nueva clave', type: 'password', required: true, minlength: 8 }
    ]).then(function (v) {
      if (!v) return;
      if (v.nueva !== v.repite) return pedirCodigo(uid, correo, 'las claves no coincidían');
      busy(true, 'Guardando…');
      return api('restablecerClave', { userId: uid, codigo: v.codigo, nueva: v.nueva }).then(function () {
        busy(false); toast('Clave actualizada. Ya puede ingresar.');
        $('#loginPass').value = ''; $('#loginPass').focus();
      }).catch(function (e) {
        busy(false);
        if (/incorrecto/i.test(e.message)) return pedirCodigo(uid, correo, 'código incorrecto');
        $('#loginError').textContent = e.message;
      });
    });
  }

  /* ---- Ingreso con Google (cuentas @andaliensur.cl autorizadas por el administrador) ----
     Google muestra su propia pantalla de ingreso; la página solo recibe un comprobante firmado (ID token)
     que Apps Script valida con Google. La clave del correo nunca pasa por esta página. */
  var GID = window.GOOGLE_CLIENT_ID || '';
  function ingresoGoogle(datos) {
    busy(true, 'Verificando su cuenta…');
    $('#loginError').textContent = '';
    return api('loginGoogle', datos).then(function (r) {
      S.token = r.token; ss('set', 'lic_token', r.token);
      return startApp(r.user);
    }).catch(function (e) { $('#loginError').textContent = e.message; }).then(function () { busy(false); });
  }
  function mostrarClave(on) {
    $('#claveWrap').classList.toggle('hidden', !on);
    $('#btnUsarClave').textContent = on ? 'Ocultar ingreso con usuario y clave ▴' : 'Ingresar con usuario y clave de esta página ▾';
  }
  (function initGoogle() {
    if (!GID && !DEMO) return; // sin configurar: solo usuario y clave
    $('#gWrap').classList.remove('hidden'); mostrarClave(false);
    $('#btnUsarClave').addEventListener('click', function () { mostrarClave($('#claveWrap').classList.contains('hidden')); });
    if (!GID) { // modo demostración: simula el ingreso con Google pidiendo el correo
      $('#btnGoogleDemo').classList.remove('hidden');
      $('#btnGoogleDemo').addEventListener('click', function () {
        formDlg('Ingresar con Google (demostración)', [{ name: 'email', label: 'Correo institucional', value: '', required: true }]).then(function (v) {
          if (v) ingresoGoogle({ demoEmail: correoCompleto(v.email) });
        });
      });
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = function () {
      google.accounts.id.initialize({
        client_id: GID, hd: DOMINIO, auto_select: false, cancel_on_tap_outside: true, ux_mode: 'popup',
        callback: function (resp) { ingresoGoogle({ credential: resp.credential }); }
      });
      google.accounts.id.renderButton($('#gBtn'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es', width: 300 });
    };
    s.onerror = function () { $('#gBtn').innerHTML = '<p class="error">No se pudo cargar el ingreso con Google. Revise su conexión.</p>'; mostrarClave(true); };
    document.head.appendChild(s);
  })();

  /* ---- Primer ingreso con clave provisoria: obliga a crear la clave personal ---- */
  function crearClavePersonal(provisoria, msg) {
    var campos = (provisoria ? [] : [{ name: 'actual', label: 'Clave provisoria (la del correo)', type: 'password', required: true }]).concat([
      { name: 'nueva', label: 'Su nueva clave personal (mín. 8 caracteres)', type: 'password', required: true, minlength: 8 },
      { name: 'repite', label: 'Repita la nueva clave', type: 'password', required: true, minlength: 8 }
    ]);
    return formDlg('Bienvenido(a): cree su clave personal' + (msg ? ' — ' + msg : ''), campos).then(function (v) {
      if (!v) return toast('Deberá crear su clave personal la próxima vez que ingrese', true);
      if (v.nueva !== v.repite) return crearClavePersonal(provisoria, 'las claves no coinciden');
      return api('changePassword', { actual: provisoria || v.actual, nueva: v.nueva }).then(function () {
        S.user.cambiarClave = false; toast('Clave personal creada');
      }).catch(function (e) { return crearClavePersonal(provisoria, e.message); });
    });
  }

  function logoutLocal() {
    S.token = null; ss('del', 'lic_token');
    document.body.classList.remove('modo-dip', 'en-inicio');
    try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
    $('#app').classList.add('hidden'); $('#login').classList.remove('hidden');
    loadUsers();
  }
  /* Salir: cierra la sesión en el servidor, en esta pestaña y en las demás pestañas abiertas, y recarga la página
     para que no quede ningún dato en memoria. motivo: 'salir' | 'inactividad' */
  var saliendo = false;
  function salir(motivo) {
    if (saliendo) return; saliendo = true;
    busy(true, 'Cerrando sesión…');
    var fin = function () {
      ss('del', 'lic_token'); S.token = null;
      try { localStorage.removeItem('lic_last_user'); localStorage.setItem('lic_logout', String(Date.now())); } catch (e) {}
      try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
      location.replace(location.pathname + '?salio=' + (motivo || 'salir'));
    };
    (S.token ? api('logout') : Promise.resolve()).then(fin, fin);
  }
  $('#btnLogout').addEventListener('click', function () { salir('salir'); });
  // si se cierra sesión en otra pestaña, esta también se cierra
  window.addEventListener('storage', function (e) {
    if (e.key === 'lic_logout' && S.token) { ss('del', 'lic_token'); S.token = null; location.replace(location.pathname + '?salio=salir'); }
  });
  // cierre automático tras 30 minutos sin actividad (computadores compartidos)
  (function () {
    var MIN = 30, ultimo = Date.now();
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { ultimo = Date.now(); }, { passive: true }); });
    setInterval(function () { if (S.token && Date.now() - ultimo > MIN * 60000) salir('inactividad'); }, 30000);
  })();
  // aviso en la pantalla de ingreso después de salir
  (function () {
    var m = /[?&]salio=(\w+)/.exec(location.search); if (!m) return;
    history.replaceState(null, '', location.pathname);
    $('#loginAviso').innerHTML = '<span class="salio">' + (m[1] === 'inactividad' ? 'Su sesión se cerró por inactividad.' : '✓ Sesión cerrada.') +
      ' Si usa un computador compartido, cierre también su cuenta de Google: <a href="https://accounts.google.com/Logout" target="_blank" rel="noopener">cerrar sesión de Google</a>.</span>';
  })();

  function startApp(user, claveIngresada) {
    S.user = user;
    if (user.cambiarClave) setTimeout(function () { crearClavePersonal(claveIngresada); }, 400);
    document.body.classList.toggle('is-admin', user.rol === 'admin');
    $('#meName').textContent = user.nombre;
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    aplicarCurso();
    irA('inicio');
    loadModelos();
    return loadConfig().then(function () { renderAnios(); resumenInicio(); return loadStudents(); });
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
    if (S.view === 'diplomas' || S.view === 'dipArchivo') loadDiplomas();
    if (S.view === 'inicio') resumenInicio();
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
  /* Dos módulos separados: Licencias (lic) y Diplomas (dip). Cada uno con sus pestañas, datos y colores.
     "Datos del colegio" y "Usuarios" son comunes y se muestran dentro del módulo activo. */
  S.view = 'inicio'; S.archFiltro = 'todas'; S.modulo = '';
  var VISTA_MOD = { emitir: 'lic', archivo: 'lic', diplomas: 'dip', dipArchivo: 'dip' };
  function irModulo(mod) {
    S.modulo = mod;
    try { localStorage.setItem('lic_modulo', mod); } catch (e) {}
    irA(mod === 'dip' ? 'diplomas' : 'emitir');
  }
  function irA(view) {
    if ((view === 'colegio' || view === 'usuarios' || view === 'modelos') && !(S.user && S.user.rol === 'admin')) view = S.modulo === 'dip' ? 'diplomas' : S.modulo === 'lic' ? 'emitir' : 'inicio';
    if (VISTA_MOD[view]) S.modulo = VISTA_MOD[view];
    S.view = view;
    var enInicio = view === 'inicio', dip = S.modulo === 'dip' && !enInicio;
    document.body.classList.toggle('en-inicio', enInicio);
    document.body.classList.toggle('modo-dip', dip);
    $$('#modswitch button').forEach(function (x) { x.classList.toggle('on', !enInicio && x.dataset.mod === S.modulo); });
    $$('#tabs button').forEach(function (x) {
      x.classList.toggle('hidden', enInicio || (x.dataset.mod && x.dataset.mod !== S.modulo) || false);
      x.classList.toggle('active', x.dataset.view === view);
    });
    $('#brandTitle').textContent = enInicio ? 'Licencias y Diplomas' : dip ? 'Diplomas' : 'Licencias';
    $$('.view').forEach(function (v) { v.classList.toggle('hidden', v.id !== 'view-' + view); });
    $('.actionbar').classList.toggle('hidden', view !== 'emitir');
    // el curso activo (4° Medio / 8° Básico) es solo de Licencias
    $('#coursebar').classList.toggle('hidden', view !== 'emitir' && view !== 'archivo');
    if (view === 'archivo') loadArchivo();
    if (view === 'diplomas' || view === 'dipArchivo') loadDiplomas();
    if (view !== 'diplomas') $('#dipActionbar').classList.add('hidden'); else updDipSel();
    if (view === 'usuarios') loadUsersAdmin();
    if (view === 'colegio') fillConfigForm();
    if (view === 'modelos') { renderModelos(); loadModelos(); }
    if (enInicio) resumenInicio();
    window.scrollTo(0, 0);
  }
  function resumenInicio() {
    Promise.all([api('listStudents', { nivel: '4M', anio: S.anio }), api('listStudents', { nivel: '8B', anio: S.anio }), api('listAlumnos', { anio: S.anio })])
      .then(function (r) {
        var lic = r[0].length + r[1].length, em = r[0].concat(r[1]).filter(function (s) { return s.emitida; }).length;
        var dips = r[2].reduce(function (n, a) { return n + (a.diplomas || 0); }, 0);
        $('#homeLic').textContent = lic ? S.anio + ': ' + lic + ' estudiantes · ' + em + ' licencias emitidas →' : 'Entrar →';
        $('#homeDip').textContent = r[2].length ? S.anio + ': ' + r[2].length + ' alumnos · ' + dips + ' diplomas →' : 'Entrar →';
      }).catch(function () {});
  }
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-view]'); if (b) irA(b.dataset.view);
  });
  $('#modswitch').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-mod]'); if (b) irModulo(b.dataset.mod);
  });
  $('#view-inicio').addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (b) irModulo(b.dataset.go);
  });
  $('.brand').addEventListener('click', function () { irA('inicio'); });

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
    aplicarPortada(S.config.logoPortada);
    var faltan = !S.config.colegio || !S.config.directora || !S.config.fecha;
    $('#cfgHint').innerHTML = faltan ? '<span class="chip warn">' + (S.user && S.user.rol === 'admin' ? 'Faltan datos del colegio' : 'Faltan datos del colegio: avise a un administrador') + '</span>'
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
      rd.onload = function () {
        var tipo = inp.dataset.logo; inp.value = '';
        // el logo de portada se reduce a 600 px (carga rápida de la portada y correos livianos)
        (tipo === 'portada' ? achicarImagen(rd.result, 600) : Promise.resolve(rd.result)).then(function (u) { saveLogo(tipo, u); });
      };
      rd.readAsDataURL(f);
    });
  });
  function achicarImagen(dataUrl, max) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        var g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/png'));
      };
      im.onerror = function () { res(dataUrl); };
      im.src = dataUrl;
    });
  }
  $('#btnPortadaDef').addEventListener('click', function () { saveLogo('portada', ''); });
  /* Logo de la portada: el subido por el administrador o el predeterminado de config.js */
  function logoPortada() { return S.config.logoPortada || (window.LICENCIA_ASSETS || {}).colegio || ''; }
  function aplicarPortada(logo, colegio) {
    var src = logo || (window.LICENCIA_ASSETS || {}).colegio || '';
    $('#heroLogo').src = src; $('#brandLogo').src = src; if ($('#portadaPrev')) $('#portadaPrev').src = src;
    if (colegio) $('#heroSchool').textContent = colegio;
    try { if (logo) localStorage.setItem('lic_portada_logo', logo); else localStorage.removeItem('lic_portada_logo'); } catch (e) {}
  }
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
    api('saveLogo', { tipo: tipo, dataUrl: dataUrl }).then(function (c) { S.config = c; renderInsignias(); aplicarPortada(c.logoPortada); return refreshAssets(); })
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
        '<td class="name">' + esc(s.nombre) + penBtn() + '</td>' +
        '<td>' + esc(runFormat(s.run)) + runChip(s.run) + '</td>' +
        '<td><input class="reg' + (dup ? ' dup' : '') + '" value="' + esc(s.registro) + '" inputmode="numeric" title="' + (dup ? 'N° repetido' : '') + '"></td>' +
        '<td>' + (s.emitida ? '<span class="chip ok">Emitida ' + esc(fmtDate(s.emitida).split(' ')[0]) + '</span>' : '<span class="chip pend">Pendiente</span>') + '</td>' +
        '<td class="actions"><button class="link" data-act="pdf">PDF</button><button class="link" data-act="edit">Editar</button>' + (esAdmin() ? '<button class="link danger" data-act="del">Eliminar</button>' : '') + '</td></tr>';
    }).join('');
    $('#studEmpty').classList.toggle('hidden', S.students.length > 0);
    $('#studCount').textContent = S.students.length ? '· ' + S.students.length + ' estudiantes · ' + Licencia.NIVELES[S.nivel].curso : '';
    updateSel();
  }

  function updateSel() {
    var n = Object.keys(S.selected).length;
    $('#selInfo').textContent = n + ' seleccionado' + (n === 1 ? '' : 's');
    $('#chkAll').checked = n > 0 && n === S.students.length;
    $('#btnEmitir').disabled = n === 0; $('#btnPreview').disabled = n === 0; $('#btnDelSel').disabled = n === 0;
  }
  $('#btnDelSel').addEventListener('click', function () {
    var ids = Object.keys(S.selected); if (!ids.length) return;
    var nom = S.students.filter(function (s) { return S.selected[s.id]; }).map(function (s) { return s.nombre; });
    confirmDlg('Eliminar estudiantes', '¿Eliminar de la lista a <b>' + ids.length + '</b> estudiante' + (ids.length > 1 ? 's' : '') + '?<br><small class="muted">' +
      esc(nom.slice(0, 6).join(', ')) + (nom.length > 6 ? '…' : '') + '</small><br>Las licencias ya guardadas en el archivo no se borran.').then(function (ok) {
      if (!ok) return;
      busy(true, 'Eliminando…');
      api('deleteStudent', { ids: ids }).then(function () { S.selected = {}; toast(ids.length + ' eliminado(s)'); return loadStudents(); })
        .catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
    });
  });

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
    if (b.dataset.act === 'nom') {
      dlgNombre('Corregir nombre', s.nombre, { nota: s.emitida ? 'Esta licencia ya fue emitida: vuelva a generarla para que salga con el nombre corregido (o corríjalo en el Archivo).' : '' }).then(function (v) {
        if (!v) return;
        api('updateStudent', { id: s.id, student: { nombre: v.nombre } }).then(loadStudents).then(function () { toast('Nombre corregido'); })
          .catch(function (err) { toast(err.message, true); });
      });
    } else if (b.dataset.act === 'pdf') {
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
    if (!runValid(st.run) && !runEsIPE(st.run) && !window.confirm('El R.U.N. ' + st.run + ' no parece válido. ¿Agregar de todas formas?')) return;
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
  $('#file').addEventListener('change', function () { if (this.files.length) parseFiles(Array.prototype.slice.call(this.files)); this.value = ''; });

  // Detecta PDF por su contenido (los PDF empiezan con "%PDF"), aunque el nombre no termine en .pdf
  function esPdfFile(file) {
    return file.slice(0, 5).arrayBuffer().then(function (b) {
      return String.fromCharCode.apply(null, new Uint8Array(b)).indexOf('%PDF') === 0 || /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    }).catch(function () { return /\.pdf$/i.test(file.name); });
  }
  /* Lee un archivo (PDF Mineduc/SIGE, Excel o CSV) -> { students, meta, cursos[] }.
     Excel: lee todas las hojas; si hay varias, el nombre de la hoja sirve como curso. */
  function leerArchivo(file) {
    return esPdfFile(file).then(function (pdf) {
      if (pdf) return file.arrayBuffer().then(parsePdf).then(function (r) {
        r.students.forEach(function (s) { s.curso = r.meta.curso || ''; });
        return r;
      });
      var isCsv = /\.csv$/i.test(file.name);
      return (isCsv ? file.text().then(function (t) { return XLSX.read(t.replace(/^﻿/, ''), { type: 'string', raw: true }); })
        : file.arrayBuffer().then(function (b) { return XLSX.read(b, { type: 'array' }); })).then(function (wb) {
        var out = [];
        wb.SheetNames.forEach(function (sn) {
          mapRows(XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: false })).forEach(function (s) {
            if (!s.curso && wb.SheetNames.length > 1) s.curso = sn;
            out.push(s);
          });
        });
        return { students: out, meta: null };
      });
    });
  }
  /* Varios archivos a la vez (p. ej. las Listas de Curso de 4° A, 4° B y 4° C): se juntan en el orden elegido */
  function leerArchivos(files) {
    files = files.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'es', { numeric: true }); });
    var all = [], meta = null;
    return files.reduce(function (p, f) {
      return p.then(function () { return leerArchivo(f); }).then(function (r) {
        all = all.concat(r.students);
        if (r.meta) meta = Object.assign({}, r.meta, meta || {}); // los datos del primer archivo mandan
      });
    }, Promise.resolve()).then(function () {
      return { students: all, meta: meta, nombre: files.length === 1 ? files[0].name : files.length + ' archivos' };
    });
  }

  function parseFiles(files) {
    busy(true, 'Leyendo ' + (files.length > 1 ? files.length + ' archivos' : 'el archivo') + '…');
    leerArchivos(files).then(function (r) {
      if (!r.students.length) throw new Error('No se encontraron estudiantes. Suba la "Nómina de Alumnos Licenciados", la "Lista de Curso" del SIGE, o un Excel/CSV con columna "nombre".');
      if (r.meta && r.meta.nivel && r.meta.nivel !== S.nivel) setNivel(r.meta.nivel);
      if (r.meta && r.meta.anio && r.meta.anio !== S.anio) cambiarAnio(r.meta.anio);
      showPreview(r.students, r.nombre, r.meta);
    }).catch(function (e) { toast(e.message || 'No se pudo leer el archivo', true); }).then(function () { busy(false); });
  }

  // Opción de la vista previa: "Nombres Apellidos" (recomendado) o tal como viene en la lista
  function ordenNombresHtml(list, grp) {
    var inv = list.filter(function (s) { return s.invertido; });
    if (!inv.length) return '';
    return '<div class="name-order"><b>Los nombres vienen como APELLIDOS NOMBRES.</b> ¿Cómo deben aparecer en el documento?' +
      '<label class="check"><input type="radio" name="' + grp + '" value="nom" checked> Nombres y luego apellidos <small>(' + esc(inv[0].nombre) + ')</small></label>' +
      '<label class="check"><input type="radio" name="' + grp + '" value="ape"> Tal como viene <small>(' + esc(inv[0].original) + ')</small></label>' +
      '<small class="muted">Si algún nombre queda mal ordenado, corríjalo después con el lápiz ✎.</small></div>';
  }
  function aplicarOrden(list, grp) {
    var r = $('input[name="' + grp + '"]:checked'), ape = r && r.value === 'ape';
    return list.map(function (s) { return Object.assign({}, s, { nombre: ape && s.original ? s.original : s.nombre }); });
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
    var malos = out.filter(function (s) { return !runValid(s.run) && !runEsIPE(s.run); }).length;
    var ipes = out.filter(function (s) { return runEsIPE(s.run); }).length;
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
    var cursos = cursosDe(out);
    var otroCurso = meta && meta.nivelCurso === 'otro';
    $('#importInfo').innerHTML =
      '<div class="imp-head"><b>' + out.length + '</b> estudiantes detectados en <i>' + esc(fileName) + '</i><br>Se agregarán a <b>' +
      Licencia.NIVELES[S.nivel].curso + ' ' + esc(S.anio) + '</b>' + (malos ? ' <span class="chip warn">' + malos + ' con R.U.N. a revisar</span>' : '') +
      (ipes ? ' <span class="chip ipe">' + ipes + ' con IPE (100.000.000…)</span>' : '') + '</div>' +
      (cursos.length ? '<div class="kvs mt-s">' + cursos.map(function (c) { return '<span class="kv"><small>' + c[1] + ' estudiantes</small>' + esc(c[0]) + '</span>'; }).join('') + '</div>' : '') +
      (otroCurso ? '<p class="chip warn mt-s">Esta lista es de ' + esc(meta.curso) + ': las licencias son solo para 4° Medio y 8° Básico. Para diplomas use el módulo Diplomas.</p>' : '') +
      ordenNombresHtml(out, 'ordenLic') +
      '<label class="inline mt-s">N° de registro inicial <input type="number" id="regIni" min="1" value="' + firstN + '" style="width:90px"></label>' +
      '<p class="muted small">Se numeran en el <b>mismo orden de la lista</b> (' + esc(out[0].nombre) + ' = ' + firstN + ', …). Después puede editar cualquier número.</p>' +
      (cfgRows && S.user.rol === 'admin' ? '<div class="kvs">' + cfgRows + '</div><label class="check"><input type="checkbox" id="updCfg" checked> Usar estos datos en "Datos del colegio"</label>' : '') +
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
      // RUN normal (hasta 99.999.999-9), IPE (100.000.000 o más) o el genérico "100.000-000"
      var meta = {}, students = [], RUN = /^(\d{1,3}\.?\d{3}\.?\d{3}-?[\dkK]|\d{3}\.?\d{3}-\d{3})$/;
      var tc = function (s) { return titleCase(String(s || '').replace(/\s+/g, ' ').trim()); };
      lines.forEach(function (l, li) {
        var t = l.text;
        // datos del encabezado ("Etiqueta:" seguida de su valor, o "Etiqueta" | ": valor" en la Lista de Curso SIGE)
        l.cells.forEach(function (c, i) {
          var m = /^([A-Za-zÁÉÍÓÚáéíóúñÑ\/ ]+?)\s*:\s*(.*)$/.exec(c);
          if (!m && /^[A-Za-zÁÉÍÓÚáéíóúñÑ\/ ]{3,30}$/.test(c) && /^:/.test(l.cells[i + 1] || '')) m = [c, c, l.cells[i + 1].replace(/^:\s*/, '')];
          if (!m) return;
          var key = norm(m[1]), val = (m[2] || (/:$/.test(c) ? l.cells[i + 1] : '') || '').trim();
          if (!val || /:$/.test(val)) return;
          if (key === 'establecimiento') {
            var rb = /^(\d{3,6}(?:-[\dkK])?)\s+(.+)$/.exec(val); // "4531 COLEGIO MARINA DE CHILE"
            if (rb) { meta.rbd = meta.rbd || rb[1]; val = rb[2]; }
            meta.colegio = tc(val);
          }
          else if (key === 'curso') {
            // "310 Enseñanza Media H-C niños y jóvenes 4° medio C", "… Primer Nivel de Transición (Pre-kínder) A", etc.
            var g = /(\d{1,2})\s*°?\s*(?:a[ñn]o\s+)?(medio|b[áa]sico)\s*([A-Z])?\b/i.exec(val);
            var parv = /pre\s*-?\s*k[ií]nder|primer nivel de transici[óo]n|k[ií]nder|segundo nivel de transici[óo]n/i.exec(val);
            if (g) {
              meta.curso = g[1] + '° ' + (/^m/i.test(g[2]) ? 'Medio' : 'Básico') + (g[3] ? ' ' + g[3].toUpperCase() : '');
              meta.nivelCurso = g[1] === '4' && /^m/i.test(g[2]) ? '4M' : g[1] === '8' && /^b/i.test(g[2]) ? '8B' : 'otro';
            } else if (parv) {
              var lp = /\b([A-H])\s*$/.exec(val.trim());
              meta.curso = cursoCanonico(parv[0] + (lp ? ' ' + lp[1] : ''));
              meta.nivelCurso = 'otro';
            }
          }
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
        } else if (r === 1 && /^\d{1,3}$/.test(l.cells[0]) && l.cells[2] && /[A-Za-zÁÉÍÓÚÑ]/.test(l.cells[2])) {
          // Lista de Curso SIGE: N/L | RUN | APELLIDOS NOMBRES | Edad | … (el N/L es solo el orden de lista, no el registro)
          var orig = String(l.cells[2]).replace(/\s+/g, ' ').trim();
          students.push({ nombre: nombreDesdeApellidos(orig), original: tc(orig), invertido: true, run: runFormat(l.cells[1]), sexo: '', registro: '' });
        }
      });
      if (meta.nivelCurso) { meta.nivel = meta.nivelCurso === 'otro' ? '' : meta.nivelCurso; }
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
  /* "ACUÑA BUSTOS AGUSTÍN ALFONSO" -> "Agustín Alfonso Acuña Bustos".
     Toma los dos primeros apellidos (respetando partículas: DE LA, DEL, SAN, VAN…); el resto son los nombres.
     Si algún caso sale mal (apellidos compuestos poco comunes), se corrige con el lápiz ✎. */
  function nombreDesdeApellidos(s) {
    var w = String(s || '').replace(/\s+/g, ' ').trim().split(' ');
    var PART = { DE: 1, DEL: 1, LA: 1, LAS: 1, LOS: 1, SAN: 1, SANTA: 1, VAN: 1, VON: 1, DA: 1, DI: 1, MC: 1, MAC: 1, LE: 1 };
    function apellido(i) { var j = i; while (j < w.length - 1 && PART[w[j].toUpperCase()]) j++; return j + 1; }
    if (w.length < 3) return titleCase(w.slice(1).concat(w.slice(0, 1)).join(' '));
    var a1 = apellido(0), a2 = a1 < w.length - 1 ? apellido(a1) : a1;
    if (a2 >= w.length) a2 = a1; // no dejar sin nombre de pila
    return titleCase(w.slice(a2).concat(w.slice(0, a2)).join(' '));
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
    var students = aplicarOrden(P.students, 'ordenLic').map(function (s, i) {
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

  /* ======================= Modelos (diseños en PDF cargados por el administrador) ======================= */
  S.modelos = [];
  var FONDOS = {}; // id -> Promise del fondo ya dibujado (imagen), para no descargarlo dos veces
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function loadModelos() {
    return api('listModelos').then(function (l) {
      S.modelos = l || []; renderModeloSelects();
      if (S.view === 'modelos') renderModelos();
    }).catch(function () {});
  }
  function modeloElegido(tipo) { var sel = $(tipo === 'diploma' ? '#modDip' : '#modLic'); return sel ? sel.value : ''; }
  // Selectores "Modelo" en Emitir (licencias) y en Diplomas; recuerda el último elegido en este equipo
  function renderModeloSelects() {
    [['licencia', '#modLic'], ['diploma', '#modDip']].forEach(function (t) {
      var sel = $(t[1]); if (!sel) return;
      var prev = sel.value || lsGet('lic_mod_' + t[0]);
      var ms = S.modelos.filter(function (m) { return m.tipo === t[0]; });
      sel.innerHTML = '<option value="">Diseño del sistema</option>' + ms.map(function (m) {
        return '<option value="' + esc(m.id) + '">' + esc(m.nombre) + '</option>'; }).join('');
      sel.value = ms.some(function (m) { return m.id === prev; }) ? prev : '';
      sel.closest('.mod-pick').classList.toggle('hidden', !ms.length);
    });
  }
  ['#modLic', '#modDip'].forEach(function (s, i) {
    $(s).addEventListener('change', function () { lsSet('lic_mod_' + (i ? 'diploma' : 'licencia'), this.value); });
  });
  // Dibuja la 1ª página de un PDF como imagen (fondo del modelo). maxPx ≈ 2600 px de ancho: ~235 ppp en carta.
  function pdfAImagen(buf, maxPx) {
    return loadPdfJs().then(function () { return pdfjsLib.getDocument({ data: buf }).promise; }).then(function (pdf) {
      return pdf.getPage(1);
    }).then(function (page) {
      var v0 = page.getViewport({ scale: 1 }), k = maxPx / Math.max(v0.width, v0.height), vp = page.getViewport({ scale: k });
      var c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
      return page.render({ canvasContext: g, viewport: vp }).promise.then(function () {
        return { data: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height, fmt: 'JPEG', orient: c.width >= c.height ? 'landscape' : 'portrait' };
      });
    });
  }
  function fondoDe(id) {
    if (!FONDOS[id]) {
      FONDOS[id] = api('getModeloArchivo', { id: id }).then(function (r) { return fetch(r.dataUrl); })
        .then(function (x) { return x.arrayBuffer(); })
        .then(function (buf) { return pdfAImagen(buf, 2600); })
        .then(function (img) { img.alias = 'fondo' + id; return img; })
        .catch(function (e) { delete FONDOS[id]; throw e; });
    }
    return FONDOS[id];
  }
  // "Aclarar el diseño": se cubre el fondo con blanco semitransparente (imagen opaca: se imprime parejo)
  var ACLARADOS = {};
  function aclararFondo(img, a) {
    a = Number(a) || 0; if (!a) return Promise.resolve(img);
    var key = img.alias + '_' + a;
    if (!ACLARADOS[key]) ACLARADOS[key] = new Promise(function (res) {
      var el = new Image();
      el.onload = function () {
        var c = document.createElement('canvas'); c.width = img.w; c.height = img.h;
        var g = c.getContext('2d'); g.drawImage(el, 0, 0, c.width, c.height);
        g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.fillRect(0, 0, c.width, c.height);
        res(Object.assign({}, img, { data: c.toDataURL('image/jpeg', 0.9), alias: key.replace(/\./g, '_') }));
      };
      el.onerror = function () { res(img); };
      el.src = img.data;
    });
    return ACLARADOS[key];
  }
  // Modelo listo para dibujar: con su fondo (aclarado si corresponde). cambios: ajustes aún no guardados (editor)
  function modeloListo(m, cambios) {
    var mm = Object.assign({}, m, cambios || {});
    return fondoDe(m.id).then(function (f) { return aclararFondo(f, mm.aclarar); }).then(function (f) { return Object.assign(mm, { fondo: f }); });
  }
  // Modelos que usan estos documentos (r.modeloId), con su fondo listo. Los eliminados se omiten (diseño del sistema).
  function modelosPara(records) {
    var ids = {}; records.forEach(function (r) { if (r.modeloId) ids[r.modeloId] = 1; });
    var lista = Object.keys(ids).map(function (id) { return S.modelos.filter(function (m) { return m.id === id; })[0]; }).filter(Boolean);
    if (!lista.length) return Promise.resolve({});
    busy(true, 'Preparando el modelo…');
    return Promise.all(lista.map(function (m) { return modeloListo(m); }))
      .then(function (ms) { busy(false); var o = {}; ms.forEach(function (m) { o[m.id] = m; }); return o; },
        function (e) { busy(false); toast('No se pudo cargar el modelo: ' + e.message + '. Se usará el diseño del sistema.', true); return {}; });
  }
  function pdfLic(records, c) {
    return Promise.all([c ? Licencia.prepareAssets(c) : Promise.resolve(S.assets), modelosPara(records)]).then(function (r) {
      return Licencia.build(records, r[0], Object.assign(printOpts(c), { modelos: r[1] }));
    });
  }
  function pdfDip(records) {
    return modelosPara(records).then(function (ms) { return Licencia.buildDiplomas(records, S.assets, Object.assign(printOpts(), { modelos: ms })); });
  }
  function abrirDoc(promesa) {
    var w = window.open('', '_blank');
    promesa.then(function (doc) { var url = doc.output('bloburl'); if (w) w.location.href = url; else window.location.href = url; })
      .catch(function (e) { if (w) w.close(); toast(e.message, true); });
  }

  /* ---- Administrador: subir modelos y ajustarlos ----
     Dos tipos de modelo:
       · 'campos': el PDF ya trae sus textos; se ubican solo los datos (nombre, fecha…). Cada dato puede llevar
                   "fondo blanco detrás" para que no se mezcle con líneas o letras del diseño.
       · 'fondo':  el PDF es solo un marco; el texto del sistema se dibuja reducido dentro de la "zona del texto".
     En ambos se puede "aclarar el diseño" para que los datos resalten. */
  var TIPO_TXT = { licencia: 'Licencia', diploma: 'Diploma' };
  var ZONA_DEF = { x: 0.08, y: 0.1, w: 0.84, h: 0.8 };
  // Ubicación inicial razonable de los datos (el administrador la ajusta arrastrando)
  var CAMPOS_INICIALES = {
    diploma: [{ k: 'nombre', x: .5, y: .5, s: 36, f: 'script' }, { k: 'curso', x: .5, y: .58, s: 12, f: 'serif', st: 'bold' },
      { k: 'motivo', x: .5, y: .67, s: 15, f: 'serif', st: 'bold' }, { k: 'lugarFecha', x: .29, y: .85, s: 12, f: 'serif', st: 'italic', w: .32 },
      { k: 'directora', x: .71, y: .85, s: 12, f: 'serif', st: 'bold', w: .32 }],
    licencia: [{ k: 'registro', x: .5, y: .42, s: 13, f: 'serif', st: 'bold' }, { k: 'nombre', x: .5, y: .55, s: 34, f: 'script' },
      { k: 'run', x: .5, y: .64, s: 14, f: 'serif', st: 'bold' }, { k: 'lugarFecha', x: .29, y: .85, s: 12, f: 'serif', st: 'italic', w: .32 },
      { k: 'directora', x: .71, y: .85, s: 12, f: 'serif', st: 'bold', w: .32 }]
  };
  function campoNuevo(k, i) { return { k: k, x: .5, y: Math.min(.9, .3 + i * .06), s: 14, f: 'serif', st: 'normal', c: '#081e48', a: 'center', w: .8, bg: false }; }
  function completarCampo(c) { return Object.assign({ st: 'normal', c: '#081e48', a: 'center', w: .8, bg: false }, c); }

  function renderModelos() {
    $('#modCount').textContent = S.modelos.length ? '· ' + S.modelos.length : '';
    $('#modList').innerHTML = S.modelos.length ? S.modelos.map(function (m) {
      return '<div class="mod-item" data-id="' + esc(m.id) + '"><div class="mod-thumb"><img alt="" data-thumb="' + esc(m.id) + '"></div><div class="mod-info">' +
        '<b>' + esc(m.nombre) + '</b><span><span class="chip curso">' + TIPO_TXT[m.tipo] + '</span> ' +
        (m.modo === 'campos' ? m.campos.length + ' datos ubicados' : 'Marco con textos del sistema') + ' · ' + (m.orient === 'portrait' ? 'vertical' : 'horizontal') +
        (m.aclarar ? ' · aclarado ' + Math.round(m.aclarar * 100) + '%' : '') + '</span>' +
        '<div class="mod-acts"><button class="link" data-act="ajustar">Ajustar</button>' +
        '<button class="link" data-act="prev">Vista previa</button><button class="link" data-act="ren">Renombrar</button><button class="link danger" data-act="del">Eliminar</button></div></div></div>';
    }).join('') : '<p class="empty">Aún no hay modelos. Suba el primero con el formulario.</p>';
    S.modelos.forEach(function (m) {
      fondoDe(m.id).then(function (f) { var im = $('img[data-thumb="' + m.id + '"]'); if (im) im.src = f.data; }).catch(function () {});
    });
  }
  function muestra(tipo) {
    var c = S.config, s = S.students[0] || {};
    return tipo === 'diploma'
      ? { nombre: (S.alumnos[0] || {}).nombre || 'María José Fuentes Rojas', curso: (S.alumnos[0] || {}).curso || '5° Básico A', motivo: motivoActual() || 'Su destacada participación',
        fecha: $('#dipFecha').value || hoyISO(), ciudad: c.ciudad || 'Concepción', colegio: c.colegio || window.COLEGIO_NOMBRE || '', directora: c.directora || 'Nombre de la Directora', cargo: c.cargo,
        firmas: S.firmas.length ? S.firmas : [{ nombre: 'Nombre Apellido', cargo: 'Profesor(a) Jefe' }, { nombre: 'Nombre Apellido', cargo: 'Inspector(a) General' }] }
      : { nivel: S.nivel, anio: S.anio, registro: s.registro || '123', nombre: s.nombre || 'María José Fuentes Rojas', run: runFormat(s.run || '12.345.678-5'), sexo: s.sexo || 'F',
        colegio: c.colegio || window.COLEGIO_NOMBRE || '', rbd: c.rbd || '4531', region: c.region || 'Biobío', provincia: c.provincia || 'Concepción', comuna: c.comuna || 'Concepción',
        anioEscolar: S.anio, directora: c.directora || 'Nombre de la Directora', cargo: c.cargo, ciudad: c.ciudad || 'Concepción', fecha: c.fecha || hoyISO() };
  }
  function construirMuestra(mod) {
    var rec = muestra(mod.tipo);
    return (mod.tipo === 'diploma' ? Licencia.buildDiplomas : Licencia.build)([rec], S.assets, Object.assign(printOpts(), { modelo: mod }));
  }
  function vistaModelo(m, cambios) { abrirDoc(modeloListo(m, cambios).then(construirMuestra)); }
  function leerDataUrl(file) {
    return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(file); });
  }
  $('#modForm').addEventListener('change', function (e) {
    if (e.target.name === 'modo') $('#modLogosWrap').classList.toggle('hidden', e.target.value !== 'fondo');
  });
  $('#modLogosWrap').classList.add('hidden');
  $('#modForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, file = f.archivo.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return toast('El PDF debe pesar menos de 15 MB', true);
    var modo = f.querySelector('input[name="modo"]:checked').value, img;
    busy(true, 'Leyendo el diseño…');
    file.arrayBuffer().then(function (buf) {
      if (String.fromCharCode.apply(null, new Uint8Array(buf.slice(0, 5))).indexOf('%PDF') !== 0) throw new Error('El archivo no es un PDF');
      return pdfAImagen(buf, 2600);
    }).then(function (im) {
      img = im;
      if (modo === 'fondo' && img.orient === 'portrait') { modo = 'campos'; toast('El PDF es vertical: se usará "ubicar datos"', true); }
      return leerDataUrl(file);
    }).then(function (dataUrl) {
      busy(true, 'Guardando el modelo en Drive…');
      return api('subirModelo', { tipo: f.tipo.value, nombre: f.nombre.value.trim(), modo: modo, orient: img.orient, logos: f.logos.checked,
        campos: CAMPOS_INICIALES[f.tipo.value].map(completarCampo), zona: ZONA_DEF, aclarar: 0,
        dataUrl: dataUrl.replace(/^data:[^;]*;/, 'data:application/pdf;') });
    }).then(function (m) {
      img.alias = 'fondo' + m.id; FONDOS[m.id] = Promise.resolve(img);
      S.modelos.push(m); renderModeloSelects(); renderModelos(); f.reset(); $('#modLogosWrap').classList.add('hidden');
      busy(false); toast('Modelo "' + m.nombre + '" guardado. Ahora ajústelo para que todo se lea bien.');
      abrirEditor(m);
    }).catch(function (err) { busy(false); toast(err.message || 'No se pudo leer el PDF', true); });
  });
  $('#modList').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var m = S.modelos.filter(function (x) { return x.id === b.closest('.mod-item').dataset.id; })[0];
    if (b.dataset.act === 'ajustar') abrirEditor(m);
    else if (b.dataset.act === 'prev') vistaModelo(m);
    else if (b.dataset.act === 'ren') formDlg('Renombrar modelo', [{ name: 'nombre', label: 'Nombre', value: m.nombre, required: true }]).then(function (v) {
      if (v) api('guardarModelo', { id: m.id, nombre: v.nombre }).then(function (l) { S.modelos = l; renderModeloSelects(); renderModelos(); }).catch(function (err) { toast(err.message, true); });
    });
    else confirmDlg('Eliminar modelo', '¿Eliminar el modelo <b>' + esc(m.nombre) + '</b>? Lo ya emitido con él se volverá a descargar con el diseño del sistema.').then(function (ok) {
      if (ok) api('eliminarModelo', { id: m.id }).then(function (l) { S.modelos = l; delete FONDOS[m.id]; renderModeloSelects(); renderModelos(); toast('Modelo eliminado'); })
        .catch(function (err) { toast(err.message, true); });
    });
  });

  /* ---- Editor del modelo ---- */
  var ED = null;
  var LETRAS = [['serif|normal', 'Serif'], ['serif|bold', 'Serif negrita'], ['serif|italic', 'Serif cursiva'], ['script|normal', 'Caligráfica'], ['title|bold', 'Título decorativo']];
  var FAMILIA = { serif: "'Crimson Text', Georgia, serif", script: "'Great Vibes', cursive", title: "'Cinzel Decorative', Georgia, serif" };
  function abrirEditor(m) {
    busy(true, 'Abriendo el diseño…');
    fondoDe(m.id).then(function (img) {
      busy(false);
      ED = { m: m, modo: m.modo, aclarar: Number(m.aclarar) || 0, logos: !!m.logos, zona: Object.assign({}, ZONA_DEF, m.zona || {}),
        campos: (m.campos && m.campos.length ? m.campos : CAMPOS_INICIALES[m.tipo]).map(completarCampo), sel: null, rec: muestra(m.tipo), overlay: null };
      var pg = m.orient === 'portrait' ? [Licencia.PAGINA.H, Licencia.PAGINA.W] : [Licencia.PAGINA.W, Licencia.PAGINA.H];
      $('#mdPage').style.aspectRatio = pg[0] + ' / ' + pg[1]; ED.pgW = pg[0];
      $('#mdImg').src = img.data;
      $('#mdTitulo').textContent = 'Ajustar modelo · ' + m.nombre;
      ED.sel = ED.campos[0] ? ED.campos[0].k : null;
      $('#modDlg').showModal();
      requestAnimationFrame(function () { renderEditor(); });
    }).catch(function (e) { busy(false); toast('No se pudo abrir el modelo: ' + e.message, true); });
  }
  function campoSel() { return ED.campos.filter(function (c) { return c.k === ED.sel; })[0]; }
  // Imagen transparente con el texto del sistema (para ver cómo queda dentro de la zona, en modo 'fondo')
  function overlaySistema() {
    if (ED.overlay) return ED.overlay;
    var mod = { tipo: ED.m.tipo, modo: 'fondo', orient: 'landscape', logos: ED.logos, zona: { x: 0, y: 0, w: 1, h: 1 }, fondo: null };
    var doc = construirMuestra(mod);
    ED.overlay = loadPdfJs().then(function () { return pdfjsLib.getDocument({ data: new Uint8Array(doc.output('arraybuffer')) }).promise; })
      .then(function (pdf) { return pdf.getPage(1); }).then(function (page) {
        var vp = page.getViewport({ scale: 1400 / page.getViewport({ scale: 1 }).width });
        var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        return page.render({ canvasContext: c.getContext('2d'), viewport: vp, background: 'rgba(0,0,0,0)' }).promise.then(function () { return c.toDataURL('image/png'); });
      });
    return ED.overlay;
  }
  function solapados() {
    var cajas = $$('.md-f').map(function (n) { return { k: n.dataset.k, r: n.getBoundingClientRect() }; }), mal = {};
    cajas.forEach(function (a, i) {
      cajas.slice(i + 1).forEach(function (b) {
        if (a.r.left < b.r.right - 2 && b.r.left < a.r.right - 2 && a.r.top < b.r.bottom - 2 && b.r.top < a.r.bottom - 2) { mal[a.k] = 1; mal[b.k] = 1; }
      });
    });
    return mal;
  }
  function renderEditor(soloPagina) {
    if (!ED) return;
    var page = $('#mdPage'), pxMm = page.clientWidth / ED.pgW, fondo = ED.modo === 'fondo';
    $('#mdImg').style.opacity = String(1 - ED.aclarar);
    $$('.md-f, .md-zona', page).forEach(function (n) { n.remove(); });
    if (fondo) {
      var z = ED.zona, zd = document.createElement('div');
      zd.className = 'md-zona';
      zd.style.left = (z.x * 100) + '%'; zd.style.top = (z.y * 100) + '%'; zd.style.width = (z.w * 100) + '%'; zd.style.height = (z.h * 100) + '%';
      zd.innerHTML = '<img alt=""><span>Zona del texto</span>';
      page.appendChild(zd);
      overlaySistema().then(function (u) { var i = $('.md-zona img'); if (i) i.src = u; });
    } else {
      ED.campos.forEach(function (c) {
        var d = document.createElement('div');
        d.className = 'md-f' + (c.k === ED.sel ? ' on' : '') + (c.bg ? ' bg' : ''); d.dataset.k = c.k; d.tabIndex = 0;
        d.textContent = Licencia.valorCampo(ED.rec, c.k) || '[' + c.k + ']';
        d.style.left = (c.x * 100) + '%'; d.style.top = (c.y * 100) + '%';
        d.style.transform = 'translate(' + (c.a === 'left' ? '0' : c.a === 'right' ? '-100%' : '-50%') + ',-50%)';
        d.style.fontFamily = FAMILIA[c.f] || FAMILIA.serif;
        d.style.fontWeight = c.st === 'bold' || c.f === 'title' ? '700' : '400';
        d.style.fontStyle = c.st === 'italic' ? 'italic' : 'normal';
        d.style.fontSize = (c.s * 0.3528 * pxMm) + 'px';
        d.style.color = c.c; d.style.maxWidth = (c.w * 100) + '%';
        page.appendChild(d);
      });
      var mal = solapados();
      $$('.md-f', page).forEach(function (n) { n.classList.toggle('choca', !!mal[n.dataset.k]); });
      var aviso = $('#mdAviso'); if (aviso) aviso.classList.toggle('hidden', !Object.keys(mal).length);
    }
    if (soloPagina) return;
    var vertical = ED.m.orient === 'portrait';
    var cab = '<div class="md-modo"><b>¿Qué trae el PDF?</b>' +
      '<label class="check"><input type="radio" name="mdModo" value="campos"' + (fondo ? '' : ' checked') + '> El diseño completo: ubico solo los datos</label>' +
      '<label class="check' + (vertical ? ' muted' : '') + '"><input type="radio" name="mdModo" value="fondo"' + (fondo ? ' checked' : '') + (vertical ? ' disabled' : '') + '> Solo el marco: la página escribe todo el texto</label></div>' +
      '<label>Aclarar el diseño de fondo: <b id="mdAclVal">' + Math.round(ED.aclarar * 100) + '%</b> <small class="muted">(hace que los datos resalten)</small>' +
      '<input type="range" data-g="aclarar" min="0" max="70" step="5" value="' + Math.round(ED.aclarar * 100) + '"></label>';
    if (fondo) {
      var z = ED.zona, pct = function (v) { return Math.round(v * 100); };
      $('#mdCampos').innerHTML = cab +
        '<p class="muted small">Ajuste la <b>zona del texto</b> para que quede dentro del marco, sin tocar sus adornos. El texto se achica para caber.</p>' +
        '<label>Margen izquierdo: <b>' + pct(z.x) + '%</b><input type="range" data-z="izq" min="0" max="35" value="' + pct(z.x) + '"></label>' +
        '<label>Margen derecho: <b>' + pct(1 - z.x - z.w) + '%</b><input type="range" data-z="der" min="0" max="35" value="' + pct(1 - z.x - z.w) + '"></label>' +
        '<label>Margen superior: <b>' + pct(z.y) + '%</b><input type="range" data-z="sup" min="0" max="35" value="' + pct(z.y) + '"></label>' +
        '<label>Margen inferior: <b>' + pct(1 - z.y - z.h) + '%</b><input type="range" data-z="inf" min="0" max="35" value="' + pct(1 - z.y - z.h) + '"></label>' +
        '<label class="check"><input type="checkbox" data-g="logos"' + (ED.logos ? ' checked' : '') + '> Incluir escudo de Chile e insignia del colegio</label>';
      $('#mdProps').innerHTML = '';
      return;
    }
    var lista = Licencia.CAMPOS[ED.m.tipo];
    $('#mdCampos').innerHTML = cab + '<p class="inv-err small hidden" id="mdAviso">Hay datos encimados (marcados en rojo). Sepárelos o achíquelos para que se lean bien.</p>' +
      '<div class="md-lista">' + lista.map(function (x) {
        var on = ED.campos.some(function (c) { return c.k === x[0]; });
        return '<label class="check' + (x[0] === ED.sel ? ' sel' : '') + '"><input type="checkbox" data-k="' + x[0] + '"' + (on ? ' checked' : '') + '> ' + esc(x[1]) + '</label>';
      }).join('') + '</div>';
    var mal = solapados(); $('#mdAviso').classList.toggle('hidden', !Object.keys(mal).length);
    var c = campoSel();
    $('#mdProps').innerHTML = !c ? '<p class="muted small">Seleccione un dato en el diseño para cambiar su tamaño, letra y color.</p>' :
      '<h4>' + esc((lista.filter(function (x) { return x[0] === c.k; })[0] || [0, c.k])[1]) + '</h4>' +
      '<div class="form-grid">' +
      '<label>Tamaño (pt)<input type="number" data-p="s" min="5" max="72" step="0.5" value="' + c.s + '"></label>' +
      '<label>Color<input type="color" data-p="c" value="' + esc(c.c) + '"></label>' +
      '<label class="span2">Letra<select data-p="letra">' + LETRAS.map(function (l) {
        return '<option value="' + l[0] + '"' + (l[0] === c.f + '|' + (c.f === 'script' ? 'normal' : c.f === 'title' ? 'bold' : c.st) ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="span2">Alineación<select data-p="a"><option value="left"' + (c.a === 'left' ? ' selected' : '') + '>Desde la izquierda</option><option value="center"' + (c.a === 'center' ? ' selected' : '') + '>Centrado</option><option value="right"' + (c.a === 'right' ? ' selected' : '') + '>Hasta la derecha</option></select></label>' +
      '<label class="span2">Ancho máximo: <b>' + Math.round(c.w * 100) + '%</b> de la hoja <small class="muted">(si el texto es más largo, se achica)</small><input type="range" data-p="w" min="10" max="100" value="' + Math.round(c.w * 100) + '"></label>' +
      '<label class="check span2"><input type="checkbox" data-p="bg"' + (c.bg ? ' checked' : '') + '> Fondo blanco detrás <small class="muted">(tapa líneas o letras del diseño que queden debajo)</small></label>' +
      '</div><p class="muted small">Posición: ' + Math.round(c.x * 1000) / 10 + '% · ' + Math.round(c.y * 1000) / 10 + '%</p>';
  }
  $('#mdCampos').addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'mdModo') { ED.modo = t.value; return renderEditor(); }
    if (t.dataset.g === 'logos') { ED.logos = t.checked; ED.overlay = null; return renderEditor(); }
    var k = t.dataset.k; if (!k) return;
    if (t.checked) { ED.campos.push(campoNuevo(k, ED.campos.length)); ED.sel = k; }
    else { ED.campos = ED.campos.filter(function (c) { return c.k !== k; }); if (ED.sel === k) ED.sel = ED.campos[0] ? ED.campos[0].k : null; }
    renderEditor();
  });
  $('#mdCampos').addEventListener('input', function (e) {
    var t = e.target, v = Number(t.value) / 100;
    if (t.dataset.g === 'aclarar') { ED.aclarar = v; $('#mdAclVal').textContent = t.value + '%'; return renderEditor(true); }
    var zz = t.dataset.z; if (!zz) return;
    var z = ED.zona, der = 1 - z.x - z.w, inf = 1 - z.y - z.h;
    if (zz === 'izq') z.x = v; if (zz === 'der') der = v; if (zz === 'sup') z.y = v; if (zz === 'inf') inf = v;
    z.w = Math.max(0.2, 1 - z.x - der); z.h = Math.max(0.2, 1 - z.y - inf);
    var lb = t.closest('label').querySelector('b'); if (lb) lb.textContent = t.value + '%';
    renderEditor(true);
  });
  $('#mdProps').addEventListener('input', function (e) {
    var c = campoSel(), p = e.target.dataset.p; if (!c || !p) return;
    if (p === 's') c.s = Math.max(5, Math.min(72, Number(e.target.value) || c.s));
    else if (p === 'w') c.w = Number(e.target.value) / 100;
    else if (p === 'bg') c.bg = e.target.checked;
    else if (p === 'letra') { var v = e.target.value.split('|'); c.f = v[0]; c.st = v[1]; }
    else c[p] = e.target.value;
    renderEditor(true);
    if (p === 'w') { var lb = e.target.closest('label').querySelector('b'); if (lb) lb.textContent = Math.round(c.w * 100) + '%'; }
  });
  // Arrastrar los datos sobre el diseño
  (function () {
    var drag = null;
    $('#mdPage').addEventListener('pointerdown', function (e) {
      var d = e.target.closest('.md-f'); if (!d) return;
      e.preventDefault();
      ED.sel = d.dataset.k; var c = campoSel(), r = $('#mdPage').getBoundingClientRect();
      drag = { c: c, r: r, dx: e.clientX - (r.left + c.x * r.width), dy: e.clientY - (r.top + c.y * r.height) };
      try { d.setPointerCapture(e.pointerId); } catch (err) {}
      $$('.md-f').forEach(function (n) { n.classList.toggle('on', n === d); });
    });
    $('#mdPage').addEventListener('pointermove', function (e) {
      if (!drag) return;
      drag.c.x = Math.max(0, Math.min(1, (e.clientX - drag.dx - drag.r.left) / drag.r.width));
      drag.c.y = Math.max(0, Math.min(1, (e.clientY - drag.dy - drag.r.top) / drag.r.height));
      var n = $('.md-f[data-k="' + drag.c.k + '"]'); if (n) { n.style.left = (drag.c.x * 100) + '%'; n.style.top = (drag.c.y * 100) + '%'; }
    });
    var fin = function () { if (drag) { drag = null; renderEditor(); var n = $('.md-f[data-k="' + ED.sel + '"]'); if (n) n.focus(); } };
    $('#mdPage').addEventListener('pointerup', fin); $('#mdPage').addEventListener('pointercancel', fin);
    $('#mdPage').addEventListener('keydown', function (e) {
      var c = ED && campoSel(); if (!c || !/^Arrow/.test(e.key)) return;
      e.preventDefault(); var st = e.shiftKey ? 0.01 : 0.002;
      if (e.key === 'ArrowLeft') c.x = Math.max(0, c.x - st); if (e.key === 'ArrowRight') c.x = Math.min(1, c.x + st);
      if (e.key === 'ArrowUp') c.y = Math.max(0, c.y - st); if (e.key === 'ArrowDown') c.y = Math.min(1, c.y + st);
      renderEditor(); var n = $('.md-f[data-k="' + c.k + '"]'); if (n) n.focus();
    });
  })();
  window.addEventListener('resize', function () { if ($('#modDlg').open) renderEditor(); });
  function cambiosEditor() { return { modo: ED.modo, campos: ED.campos, zona: ED.zona, aclarar: ED.aclarar, logos: ED.logos }; }
  $('#mdCancel').addEventListener('click', function () { $('#modDlg').close(); ED = null; });
  $('#mdPrev').addEventListener('click', function () { if (ED) vistaModelo(ED.m, cambiosEditor()); });
  $('#mdSave').addEventListener('click', function () {
    if (!ED) return;
    if (ED.modo === 'campos' && !ED.campos.some(function (c) { return c.k === 'nombre'; }) && !window.confirm('El modelo no tiene el nombre del estudiante. ¿Guardar de todas formas?')) return;
    if (ED.modo === 'campos' && Object.keys(solapados()).length && !window.confirm('Hay datos encimados que podrían no leerse bien. ¿Guardar de todas formas?')) return;
    busy(true, 'Guardando…');
    api('guardarModelo', Object.assign({ id: ED.m.id }, cambiosEditor())).then(function (l) {
      S.modelos = l; renderModeloSelects(); renderModelos(); $('#modDlg').close(); ED = null; toast('Modelo guardado');
    }).catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
  });

  /* ---------------- generación de PDF ---------------- */
  function recordFor(s, c) {
    c = c || S.config;
    return { nivel: S.nivel, anio: S.anio, registro: s.registro, nombre: s.nombre, run: runFormat(s.run), sexo: s.sexo,
      colegio: c.colegio, rbd: c.rbd, region: c.region, provincia: c.provincia, comuna: c.comuna, anioEscolar: S.anio,
      directora: c.directora, cargo: c.cargo, ciudad: c.ciudad, fecha: c.fecha, modeloId: modeloElegido('licencia') };
  }
  function openPdf(records, c) { abrirDoc(pdfLic(records, c)); }
  function filename(records) {
    var r = records[0], niv = r.nivel === '8B' ? '8Basico' : '4Medio';
    return records.length === 1 ? 'Licencia_' + niv + '_Reg' + r.registro + '_' + slug(r.nombre) + '.pdf'
      : 'Licencias_' + niv + '_' + r.anio + '_' + records.length + '.pdf';
  }
  function savePdf(records) {
    return pdfLic(records).then(function (doc) { doc.save(filename(records)); }).catch(function (e) { toast(e.message, true); });
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
    api('emitir', { ids: ids, modeloId: modeloElegido('licencia') }).then(function (recs) {
      recs.forEach(function (r) { r.run = runFormat(r.run); });
      recs.sort(function (a, b) { return (Number(a.registro) || 0) - (Number(b.registro) || 0); });
      busy(false); savePdf(recs);
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
        '<td><b>' + esc(l.registro) + '</b></td><td class="name">' + esc(l.nombre) + penBtn() + '</td><td>' + esc(runFormat(l.run)) +
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
  /* Corrige el nombre impreso en una licencia o diploma ya guardado (doc = registro del archivo) */
  function renombrar(tipo, doc, lista, recargar, despues) {
    dlgNombre('Corregir nombre en ' + (tipo === 'diploma' ? 'el diploma' : 'la licencia'), doc.nombre, { lista: lista }).then(function (v) {
      if (!v || v.nombre === doc.nombre && !v.enLista) return;
      busy(true, 'Guardando…');
      api('renombrarDocumento', { tipo: tipo, id: doc.id, nombre: v.nombre, enLista: v.enLista }).then(function () {
        doc.nombre = v.nombre; doc.datos = Object.assign({}, doc.datos, { nombre: v.nombre });
        busy(false); toast('Nombre corregido');
        recargar();
        return despues && despues();
      }).catch(function (e) { busy(false); toast(e.message, true); });
    });
  }
  // Re-descarga: usa los datos guardados al emitir (misma fecha, directora y colegio)
  function licRecords(list) { return list.map(function (l) { var d = Object.assign({}, l.datos); d.run = runFormat(d.run); return d; }); }
  $('#archTable tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var l = S.licencias.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    if (b.dataset.act === 'nom') renombrar('licencia', l, 'estudiantes de ' + Licencia.NIVELES[S.nivel].curso, function () { loadArchivo(); loadStudents(); }, function () {
      return confirmDlg('Nombre corregido', '¿Descargar ahora la licencia de <b>' + esc(l.nombre) + '</b> con el nombre corregido?').then(function (ok) { if (ok) savePdf(licRecords([l])); });
    });
    else if (b.dataset.act === 'dl') savePdf(licRecords([l]));
    else confirmDlg('Quitar del archivo', '¿Quitar la licencia de <b>' + esc(l.nombre) + '</b> del archivo?').then(function (ok) {
      if (ok) api('deleteLicencia', { id: l.id }).then(loadArchivo).catch(function (err) { toast(err.message, true); });
    });
  });
  $('#btnArchAll').addEventListener('click', function () { var l = filteredLic(); if (l.length) savePdf(licRecords(l)); });

  /* ======================= DIPLOMAS DE RECONOCIMIENTO ======================= */
  S.alumnos = []; S.dipSel = {}; S.diplomas = []; S.dipCurso = ''; S.dipPending = null;
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  $('#dipFecha').value = hoyISO();
  var porCurso = ordenCurso;

  function loadDiplomas() {
    var anio = S.anio;
    $('#dipTitle').textContent = 'Todos los cursos · ' + anio;
    $('#dipTitle2').textContent = 'Diplomas emitidos · ' + anio;
    return Promise.all([api('listAlumnos', { anio: anio }), api('listDiplomas', { anio: anio })]).then(function (r) {
      if (anio !== S.anio) return;
      S.alumnos = r[0].sort(function (a, b) { return ordenCurso(a.curso, b.curso) || (a.orden || 1e9) - (b.orden || 1e9) || a.nombre.localeCompare(b.nombre); });
      S.diplomas = r[1]; renderCursosList();
      var ids = {}; S.alumnos.forEach(function (a) { ids[a.id] = 1; });
      Object.keys(S.dipSel).forEach(function (k) { if (!ids[k]) delete S.dipSel[k]; });
      renderAlumnos(); renderDiplomas();
    }).catch(function (e) { toast(e.message, true); });
  }

  function cursosDe(list) {
    var c = {}; list.forEach(function (a) { if (a.curso) c[a.curso] = (c[a.curso] || 0) + 1; });
    return Object.keys(c).sort(porCurso).map(function (k) { return [k, c[k]]; });
  }

  function esAdmin() { return !!(S.user && S.user.rol === 'admin'); }
  /* Paso 3: primero se elige el curso (botones ordenados de Pre-Kínder a 4° Medio) y luego aparece su lista,
     en el mismo orden en que se cargó. El buscador busca en todos los cursos. */
  var NIVELES_ESC = [['Educación Parvularia', 0, 1], ['Educación Básica', 2, 9], ['Enseñanza Media', 10, 13], ['Otros', 14, 999]];
  function renderAlumnos() {
    var cursos = cursosDe(S.alumnos), admin = esAdmin(), q = $('#dipSearch').value.trim();
    if (S.dipCurso && !cursos.some(function (c) { return c[0] === S.dipCurso; })) S.dipCurso = '';
    var selPorCurso = {};
    S.alumnos.forEach(function (a) { if (S.dipSel[a.id]) selPorCurso[a.curso] = (selPorCurso[a.curso] || 0) + 1; });
    var verCursos = !S.dipCurso && !q;
    $('#dipCursos').classList.toggle('hidden', !verCursos);
    $('#dipCursos').innerHTML = !cursos.length ? '' : NIVELES_ESC.map(function (n) {
      var cs = cursos.filter(function (c) { var r = rangoCurso(c[0]); return r >= n[1] && r <= n[2]; });
      if (!cs.length) return '';
      return '<div class="cp-grupo"><small>' + n[0] + '</small><div class="cp-botones">' + cs.map(function (c) {
        return '<button type="button" class="cp-btn" data-curso="' + esc(c[0]) + '"><b>' + esc(c[0]) + '</b><span>' + c[1] + ' alumnos</span>' +
          (selPorCurso[c[0]] ? '<em>' + selPorCurso[c[0]] + ' ✓</em>' : '') + '</button>';
      }).join('') + '</div></div>';
    }).join('');
    $('#dipCursoHead').classList.toggle('hidden', !S.dipCurso || !!q);
    $('#dipCursoTitulo').textContent = S.dipCurso ? S.dipCurso + ' · ' + S.alumnos.filter(function (a) { return a.curso === S.dipCurso; }).length + ' alumnos' : '';
    var list = alumnosFiltrados();
    $('#alumWrap').classList.toggle('hidden', verCursos && cursos.length > 0);
    $('#alumTable tbody').innerHTML = list.map(function (a, i) {
      return '<tr data-id="' + esc(a.id) + '" class="' + (S.dipSel[a.id] ? 'row-sel' : '') + '"><td><input type="checkbox" class="dsel"' + (S.dipSel[a.id] ? ' checked' : '') + '></td>' +
        '<td class="muted">' + (i + 1) + '</td>' +
        '<td class="name">' + esc(a.nombre) + (admin ? penBtn() : '') + '</td><td><span class="chip curso">' + esc(a.curso) + '</span></td><td>' + esc(runFormat(a.run)) + (runEsIPE(a.run) ? runChip(a.run) : '') + '</td>' +
        '<td>' + (a.diplomas ? '<span class="chip ok">' + a.diplomas + ' diploma' + (a.diplomas > 1 ? 's' : '') + '</span>' : '<span class="muted">—</span>') + '</td>' +
        (admin ? '<td class="actions"><button class="link" data-act="edit">Editar</button><button class="link danger" data-act="del">Eliminar</button></td>' : '') + '</tr>';
    }).join('');
    $('#alumEmpty').classList.toggle('hidden', list.length > 0 || (verCursos && cursos.length > 0));
    $('#alumEmpty').textContent = S.alumnos.length ? 'No hay alumnos con esa búsqueda.'
      : 'Aún no hay alumnos cargados para ' + S.anio + '.' + (admin ? ' Cargue la lista de todos los cursos.' : ' Un administrador debe cargar la lista.');
    $('#alumCount').textContent = S.alumnos.length ? '· ' + S.alumnos.length + ' alumnos en ' + cursos.length + ' cursos' : '';
    $('#dipStats').innerHTML = $('#dipStats2').innerHTML = '<span><b>' + S.alumnos.length + '</b> alumnos</span><span><b>' + cursos.length + '</b> cursos</span><span><b>' + S.diplomas.length + '</b> diplomas</span>';
    updDipSel();
  }
  function alumnosFiltrados() {
    var q = norm($('#dipSearch').value);
    if (!q && !S.dipCurso) return [];
    return S.alumnos.filter(function (a) {
      return q ? norm(a.nombre + a.run + a.curso).indexOf(q) >= 0 : a.curso === S.dipCurso;
    });
  }
  function updDipSel() {
    var n = Object.keys(S.dipSel).length, vis = alumnosFiltrados();
    $('#dipSelInfo').textContent = n + ' alumno' + (n === 1 ? '' : 's') + ' seleccionado' + (n === 1 ? '' : 's');
    $('#dipActionbar').classList.toggle('hidden', !(n > 0 && S.view === 'diplomas'));
    $('#dipChkAll').checked = vis.length > 0 && vis.every(function (a) { return S.dipSel[a.id]; });
  }
  $('#dipCursos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-curso]'); if (!b) return;
    S.dipCurso = b.dataset.curso; renderAlumnos();
    $('#dipCursoHead').scrollIntoView({ block: 'nearest' });
  });
  $('#btnVolverCursos').addEventListener('click', function () { S.dipCurso = ''; renderAlumnos(); });
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
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var a = S.alumnos.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    var guardar = function (patch) {
      return api('updateAlumno', { id: a.id, alumno: patch }).then(loadDiplomas).then(function () { toast('Alumno actualizado'); })
        .catch(function (err) { toast(err.message, true); });
    };
    if (b.dataset.act === 'nom') return dlgNombre('Corregir nombre', a.nombre, {
      nota: a.diplomas ? 'Los diplomas ya emitidos se corrigen desde "Diplomas emitidos" (lápiz ✎ junto al nombre).' : ''
    }).then(function (v) { if (v) guardar({ nombre: v.nombre }); });
    if (b.dataset.act === 'edit') return formDlg('Editar alumno', [
      { name: 'nombre', label: 'Nombre completo (como saldrá en el diploma)', value: a.nombre, required: true },
      { name: 'curso', label: 'Curso', value: a.curso, required: true },
      { name: 'run', label: 'R.U.N.', value: runFormat(a.run) }
    ]).then(function (v) { if (v) { v.run = v.run ? runFormat(v.run) : ''; guardar(v); } });
    confirmDlg('Eliminar alumno', '¿Eliminar a <b>' + esc(a.nombre) + '</b> de la lista? Sus diplomas ya emitidos se mantienen en el archivo.').then(function (ok) {
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
  $('#btnDipDel').addEventListener('click', function () {
    var ids = Object.keys(S.dipSel); if (!ids.length) return;
    var nom = S.alumnos.filter(function (a) { return S.dipSel[a.id]; }).map(function (a) { return a.nombre; });
    confirmDlg('Eliminar alumnos', '¿Eliminar de la lista a <b>' + ids.length + '</b> alumno' + (ids.length > 1 ? 's' : '') + '?<br><small class="muted">' +
      esc(nom.slice(0, 6).join(', ')) + (nom.length > 6 ? '…' : '') + '</small><br>Los diplomas ya emitidos se mantienen en el archivo.').then(function (ok) {
      if (!ok) return;
      busy(true, 'Eliminando…');
      api('deleteAlumno', { ids: ids }).then(function () { S.dipSel = {}; toast(ids.length + ' alumno(s) eliminado(s)'); return loadDiplomas(); })
        .catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
    });
  });

  // --- carga de la lista (Excel/CSV con curso, o nómina PDF de un curso) ---
  var dDrop = $('#dipDrop');
  ['dragover', 'dragenter'].forEach(function (ev) { dDrop.addEventListener(ev, function () { dDrop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dDrop.addEventListener(ev, function () { dDrop.classList.remove('over'); }); });
  $('#dipFile').addEventListener('change', function () { if (this.files.length) leerListaDiplomas(Array.prototype.slice.call(this.files)); this.value = ''; });

  // Acepta varios archivos a la vez: Listas de Curso SIGE (una por curso), nóminas PDF, Excel o CSV
  function leerListaDiplomas(files) {
    busy(true, 'Leyendo ' + (files.length > 1 ? files.length + ' archivos' : 'el archivo') + '…');
    leerArchivos(files).then(function (r) {
      var lista = r.students.map(function (s) {
        var curso = s.curso || (r.meta && r.meta.nivel === '8B' ? '8° Básico' : r.meta && r.meta.nivel === '4M' && !r.meta.curso ? '4° Medio' : '');
        return { nombre: s.nombre, original: s.original, invertido: s.invertido, run: s.run, curso: curso ? cursoCanonico(curso) : '' };
      });
      if (!lista.length) throw new Error('No se encontraron alumnos. Suba la "Lista de Curso" del SIGE, la nómina PDF, o un Excel/CSV con columnas "curso" y "nombre".');
      S.dipPending = lista;
      var sinCurso = lista.filter(function (a) { return !a.curso; }).length;
      var cursos = cursosDe(lista);
      // Cotejo con los alumnos ya cargados este año: solo se agregarán los que no están (mismo RUN, o mismo nombre y curso si no tiene RUN real)
      var ya = {};
      S.alumnos.forEach(function (a) { ya[claveAlumno(a.run, a.nombre, a.curso)] = 1; });
      var nuevos = lista.filter(function (a) {
        var k1 = claveAlumno(a.run, a.nombre, a.curso), k2 = a.original ? claveAlumno(a.run, a.original, a.curso) : k1;
        return !ya[k1] && !ya[k2];
      });
      var repetidos = lista.length - nuevos.length;
      $('#dipImportInfo').innerHTML = '<div class="imp-head"><b>' + lista.length + '</b> alumnos en <i>' + esc(r.nombre) + '</i> para el año <b>' + esc(S.anio) + '</b></div>' +
        '<div class="cotejo"><span class="chip ok">' + nuevos.length + ' nuevo' + (nuevos.length === 1 ? '' : 's') + ' se agregará' + (nuevos.length === 1 ? '' : 'n') + '</span>' +
        (repetidos ? '<span class="chip pend">' + repetidos + ' ya estaba' + (repetidos === 1 ? '' : 'n') + ' en la lista (se omite' + (repetidos === 1 ? '' : 'n') + ')</span>' : '') + '</div>' +
        (nuevos.length && repetidos ? '<div class="imp-list">' + nuevos.slice(0, 8).map(function (a) {
          return '<div><span>+</span>' + esc(a.nombre) + ' <small>' + esc(a.curso) + '</small></div>'; }).join('') +
          (nuevos.length > 8 ? '<div class="muted">… y ' + (nuevos.length - 8) + ' más</div>' : '') + '</div>' : '') +
        (cursos.length ? '<div class="kvs mt-s">' + cursos.map(function (c) { return '<span class="kv"><small>' + c[1] + ' alumnos</small>' + esc(c[0]) + '</span>'; }).join('') + '</div>' : '') +
        (sinCurso ? '<label class="mt-s">Curso para los ' + sinCurso + ' alumnos sin curso<input id="dipCursoDef" list="cursosList" placeholder="Ej.: 3° Básico A"></label>' : '') +
        ordenNombresHtml(lista, 'ordenDip');
      $('#dipImport').classList.remove('hidden');
    }).catch(function (e) { toast(e.message || 'No se pudo leer el archivo', true); }).then(function () { busy(false); });
  }
  // Lista de cursos para elegir (los del colegio + los que ya existan en la base)
  function renderCursosList() {
    var set = {}; CURSOS_COLEGIO.concat(S.alumnos.map(function (a) { return a.curso; })).forEach(function (c) { if (c) set[c] = 1; });
    $('#cursosList').innerHTML = Object.keys(set).sort(ordenCurso).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  }
  renderCursosList();
  /* Agregar un alumno a mano (p. ej. uno que llegó a mitad de año) */
  $('#dipAddForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    var a = { nombre: f.nombre.value.replace(/\s+/g, ' ').trim(), curso: cursoCanonico(f.curso.value), run: f.run.value.trim() ? runFormat(f.run.value) : '' };
    if (a.run && !runValid(a.run) && !runEsIPE(a.run) && !window.confirm('El R.U.N. ' + a.run + ' no parece válido. ¿Agregar de todas formas?')) return;
    var k = claveAlumno(a.run, a.nombre, a.curso);
    var ya = S.alumnos.filter(function (x) { return claveAlumno(x.run, x.nombre, x.curso) === k; })[0];
    if (ya) return toast(ya.nombre + ' ya está en la lista (' + ya.curso + ')', true);
    busy(true, 'Agregando…');
    api('importAlumnos', { anio: S.anio, alumnos: [a] }).then(function (r) {
      if (!r.agregados) toast('Ese alumno ya está en la lista', true);
      else { toast(a.nombre + ' agregado a ' + a.curso); f.nombre.value = ''; f.run.value = ''; f.nombre.focus(); }
      return loadDiplomas();
    }).catch(function (err) { toast(err.message, true); }).then(function () { busy(false); });
  });
  $('#btnDipCancel').addEventListener('click', function () { S.dipPending = null; $('#dipImport').classList.add('hidden'); });
  $('#btnDipImport').addEventListener('click', function () {
    var def = $('#dipCursoDef') ? $('#dipCursoDef').value.trim() : '';
    var lista = aplicarOrden(S.dipPending || [], 'ordenDip').map(function (a) { return { nombre: a.nombre, run: a.run, curso: a.curso || def }; });
    if (lista.some(function (a) { return !a.curso; })) return toast('Indique el curso de los alumnos que no lo tienen', true);
    busy(true, 'Agregando alumnos…');
    api('importAlumnos', { anio: S.anio, alumnos: lista }).then(function (r) {
      S.dipPending = null; $('#dipImport').classList.add('hidden');
      toast(r.agregados + ' alumno' + (r.agregados === 1 ? '' : 's') + ' nuevo' + (r.agregados === 1 ? '' : 's') + ' agregado' + (r.agregados === 1 ? '' : 's') +
        (r.omitidos ? ' · ' + r.omitidos + ' ya estaba' + (r.omitidos === 1 ? '' : 'n') + ' en la lista' : ''));
      return loadDiplomas();
    }).catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
  });

  // --- motivo, fecha, generación ---
  $('#dipMotivoSel').addEventListener('change', function () { $('#dipOtroWrap').classList.toggle('hidden', this.value !== 'otro'); });
  function motivoActual() { var v = $('#dipMotivoSel').value; return v === 'otro' ? $('#dipMotivoOtro').value.trim() : v; }
  function dipRecord(a, motivo, fecha) {
    var c = S.config;
    return { tipo: 'diploma', nombre: a.nombre, curso: a.curso, motivo: motivo, fecha: fecha, colegio: c.colegio || window.COLEGIO_NOMBRE || '',
      directora: c.directora, cargo: c.cargo, ciudad: c.ciudad, modeloId: modeloElegido('diploma'), firmas: S.firmas };
  }

  /* ---- Firmas adicionales de los diplomas (cualquier usuario). La directora firma siempre. ---- */
  S.firmas = (function () { try { return JSON.parse(lsGet('lic_firmas') || '[]').filter(function (f) { return f && f.nombre; }); } catch (e) { return []; } })();
  function renderFirmasRes() {
    var n = S.firmas.length;
    $('#firmasRes').innerHTML = n ? 'Firman: la directora y <b>' + n + ' persona' + (n > 1 ? 's' : '') + ' más</b> (' + esc(S.firmas.map(function (f) { return f.nombre; }).join(', ')) + ')'
      : 'Firma: solo la directora';
  }
  renderFirmasRes();
  function filaFirmaHtml(f) {
    return '<div class="firma-row"><input data-f="nombre" placeholder="Nombre completo" value="' + esc(f.nombre || '') + '">' +
      '<input data-f="cargo" placeholder="Cargo (ej.: Profesor(a) Jefe)" value="' + esc(f.cargo || '') + '">' +
      '<button type="button" class="link danger" data-quitar title="Quitar esta firma">✕</button></div>';
  }
  // Pregunta quiénes firman además de la directora. okLabel: texto del botón (p. ej. "Generar diplomas").
  function editarFirmas(okLabel) {
    var c = S.config, ok = $('#dlgOk'), prevTxt = ok.textContent;
    ok.textContent = okLabel || 'Guardar';
    var html = '<p>¿Se requiere que <b>firmen más personas</b> además de la directora? Agregue todas las que necesite; si no, continúe.</p>' +
      '<div class="firma-fija"><b>' + esc(c.directora || 'Directora') + '</b><small>' + esc(c.cargo || 'Director(a) del Establecimiento') + ' · firma siempre</small></div>' +
      '<div id="firmasDlg" class="firmas-dlg">' + S.firmas.map(filaFirmaHtml).join('') + '</div>' +
      '<button type="button" class="btn ghost sm mt-s" id="btnAddFirma">+ Agregar firma</button>';
    var p = openDlg('Firmas del diploma', html);
    var cont = $('#firmasDlg');
    $('#dlgBody').onclick = function (e) {
      if (e.target.id === 'btnAddFirma') { cont.insertAdjacentHTML('beforeend', filaFirmaHtml({})); cont.lastElementChild.querySelector('input').focus(); }
      if (e.target.hasAttribute('data-quitar')) e.target.closest('.firma-row').remove();
    };
    return p.then(function (aceptado) {
      ok.textContent = prevTxt;
      if (!aceptado) return false;
      S.firmas = $$('.firma-row', cont).map(function (r) {
        return { nombre: r.querySelector('[data-f="nombre"]').value.replace(/\s+/g, ' ').trim(), cargo: r.querySelector('[data-f="cargo"]').value.replace(/\s+/g, ' ').trim() };
      }).filter(function (f) { return f.nombre; });
      lsSet('lic_firmas', JSON.stringify(S.firmas)); renderFirmasRes();
      return true;
    });
  }
  $('#btnFirmas').addEventListener('click', function () { editarFirmas('Guardar firmas'); });
  $('#btnDipPreview').addEventListener('click', function () {
    var a = S.alumnos.filter(function (x) { return S.dipSel[x.id]; })[0] || S.alumnos[0] || { nombre: 'Nombre Apellido Apellido', curso: '3° Básico A' };
    abrirDoc(pdfDip([dipRecord(a, motivoActual() || 'Su destacada participación', $('#dipFecha').value || hoyISO())]));
  });
  $('#btnDipEmitir').addEventListener('click', function () {
    var ids = Object.keys(S.dipSel), motivo = motivoActual(), fecha = $('#dipFecha').value;
    if (!ids.length) return toast('Seleccione al menos un alumno', true);
    if (!motivo) return toast('Escriba el motivo del diploma', true);
    if (!fecha) return toast('Indique la fecha del diploma', true);
    // antes de generar: ¿firman más personas?
    editarFirmas('Generar ' + ids.length + ' diploma' + (ids.length > 1 ? 's' : '')).then(function (seguir) {
    if (!seguir) return;
    busy(true, 'Generando ' + ids.length + ' diploma(s)…');
    api('emitirDiplomas', { anio: S.anio, ids: ids, motivo: motivo, fecha: fecha, modeloId: modeloElegido('diploma'), firmas: S.firmas }).then(function (recs) {
      recs.sort(function (a, b) { return porCurso(a.curso, b.curso) || a.nombre.localeCompare(b.nombre); });
      busy(false);
      pdfDip(recs).then(function (doc) { doc.save('Diplomas_' + slug(motivo).slice(0, 40) + '_' + fecha + '.pdf'); });
      toast(recs.length + ' diploma(s) generados y guardados');
      S.dipSel = {};
      return loadDiplomas();
    }).catch(function (e) { toast(e.message, true); }).then(function () { busy(false); });
    });
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
    // Todos ven y descargan todos los diplomas; corregir o eliminar: el administrador, o quien lo emitió
    $('#dipTable tbody').innerHTML = list.map(function (d) {
      var puede = esAdmin() || esPropio(d);
      return '<tr data-id="' + esc(d.id) + '"><td>' + esc(Licencia.fechaLarga(d.fecha)) + '</td><td class="name">' + esc(d.nombre) + (puede ? penBtn() : '') + '</td><td><span class="chip curso">' + esc(d.curso) +
        '</span></td><td>' + esc(d.motivo) + '</td><td>' + esc(d.emitidoPor) + (esPropio(d) ? ' <span class="chip pend">usted</span>' : '') + '<br><small class="muted">' + esc(fmtDate(d.emitido)) + '</small></td>' +
        '<td class="actions"><button class="link" data-act="dl">Descargar PDF</button>' + (puede ? '<button class="link danger" data-act="del">Eliminar</button>' : '') + '</td></tr>';
    }).join('');
    $('#dipEmpty').classList.toggle('hidden', list.length > 0);
    $('#dipCount').textContent = S.diplomas.length ? '· ' + S.diplomas.length + ' en ' + S.anio : '';
    $('#btnDipAll').disabled = !list.length;
  }
  $('#dipArchCurso').addEventListener('change', renderDiplomas);
  $('#dipArchMotivo').addEventListener('change', renderDiplomas);
  function esPropio(d) { return d.emitidoPorId ? d.emitidoPorId === S.user.id : d.emitidoPor === S.user.nombre; }
  function dipDatos(d) { return Object.assign({ nombre: d.nombre, curso: d.curso, motivo: d.motivo, fecha: d.fecha }, d.datos || {}); }
  $('#dipTable tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var d = S.diplomas.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    if (b.dataset.act === 'nom') renombrar('diploma', d, esAdmin() ? 'alumnos' : '', loadDiplomas, function () {
      return confirmDlg('Nombre corregido', '¿Descargar ahora el diploma de <b>' + esc(d.nombre) + '</b> con el nombre corregido?').then(function (ok) {
        if (ok) pdfDip([dipDatos(d)]).then(function (doc) { doc.save('Diploma_' + slug(d.nombre) + '.pdf'); });
      });
    });
    else if (b.dataset.act === 'dl') pdfDip([dipDatos(d)]).then(function (doc) { doc.save('Diploma_' + slug(d.nombre) + '.pdf'); });
    else confirmDlg('Eliminar diploma', '¿Eliminar el diploma de <b>' + esc(d.nombre) + '</b> (' + esc(d.motivo) + ') del archivo?').then(function (ok) {
      if (ok) api('deleteDiploma', { id: d.id }).then(loadDiplomas).catch(function (err) { toast(err.message, true); });
    });
  });
  $('#btnDipAll').addEventListener('click', function () {
    var l = diplomasFiltrados(); if (!l.length) return;
    pdfDip(l.map(dipDatos)).then(function (doc) { doc.save('Diplomas_' + S.anio + '_' + l.length + '.pdf'); });
  });

  /* ---------------- usuarios ---------------- */
  function loadUsersAdmin() { return api('adminListUsers').then(renderUsers).catch(function (e) { toast(e.message, true); }); }
  function renderUsers(list) {
    S.users = list;
    $('#userTable tbody').innerHTML = list.map(function (u) {
      var me = u.id === S.user.id;
      return '<tr data-id="' + esc(u.id) + '"><td class="name">' + avatarHtml(u.nombre, 'sm') + esc(u.nombre) + (me ? ' <span class="chip pend">usted</span>' : '') + '</td><td>' +
        (u.email ? esc(u.email) : '<span class="chip warn">sin correo</span>') + '</td><td>' +
        (u.conClave === false ? '<span class="chip g-chip">Google</span>' : '<span class="chip pend">Clave</span>' + (/@/.test(u.email || '') ? ' <span class="chip g-chip">Google</span>' : '')) + '</td><td>' +
        (u.rol === 'admin' ? 'Administrador' : 'Usuario') + '</td><td>' +
        (!u.activo ? '<span class="chip pend">Inactivo</span>'
          : u.conClave === false ? (u.ultimoIngreso ? '<span class="chip ok" title="Último ingreso">Ingresó ' + esc(fmtDate(u.ultimoIngreso).split(' ')[0]) + '</span>' : '<span class="chip warn">Autorizado · aún no ingresa</span>')
          : u.cambiarClave ? '<span class="chip warn" title="Aún no crea su clave personal">Invitación pendiente</span>' : '<span class="chip ok">Activo</span>') +
        '</td><td class="actions"><button class="link" data-act="edit">Editar</button>' +
        (me ? '' : (u.conClave === false ? '<button class="link" data-act="bienv" title="Reenvía el correo de bienvenida con las instrucciones de ingreso">Enviar bienvenida</button>' : '<button class="link" data-act="inv" title="Genera una nueva clave provisoria y la envía a su correo">Enviar clave provisoria</button>') +
          '<button class="link" data-act="toggle">' + (u.activo ? 'Desactivar' : 'Activar') + '</button><button class="link danger" data-act="del">Eliminar</button>') + '</td></tr>';
    }).join('');
  }
  function paginaUrl() { return location.origin + location.pathname; }
  var DOMINIO = window.DOMINIO_CORREO || 'andaliensur.cl';
  $$('.email-dom .dom').forEach(function (s) { s.textContent = '@' + DOMINIO; });
  // "juan.perez" -> "juan.perez@andaliensur.cl" (si pegan el correo completo, se respeta)
  function correoCompleto(v) { v = String(v || '').trim().toLowerCase().replace(/\s+/g, ''); return !v ? '' : v.indexOf('@') < 0 ? v + '@' + DOMINIO : v; }
  $('#userForm').elements.email.addEventListener('input', function () {
    var i = this.value.indexOf('@'); if (i >= 0 && this.value.slice(i + 1).toLowerCase() === DOMINIO) this.value = this.value.slice(0, i);
  });

  /* ---- Correo institucional propuesto desde el nombre: "Juan Pérez Soto" -> juan.perez ----
     2-3 palabras: primer nombre + primer apellido; 4 o más: primer nombre + 3ª palabra (dos nombres y dos apellidos).
     Es solo una propuesta: el administrador puede corregirla. */
  function correoDesdeNombre(nombre) {
    var PART = { de: 1, del: 1, la: 1, las: 1, los: 1, y: 1, da: 1, van: 1, von: 1 };
    var w = sinTildes(nombre).toLowerCase().replace(/[^a-z\s'-]/g, ' ').replace(/['-]/g, '').split(/\s+/)
      .filter(function (x) { return x && !PART[x]; });
    if (!w.length) return '';
    var ape = w.length >= 4 ? w[2] : w[1];
    return w[0] + (ape ? '.' + ape : '');
  }
  // Conecta un campo "nombre" con su campo "correo": se completa solo mientras el usuario no lo haya editado a mano
  function autoCorreo(f) {
    var tocado = false;
    f.elements.nombre.addEventListener('input', function () { if (!tocado) f.elements.email.value = correoDesdeNombre(this.value); });
    f.elements.email.addEventListener('input', function () {
      var i = this.value.indexOf('@'); if (i >= 0 && this.value.slice(i + 1).toLowerCase() === DOMINIO) this.value = this.value.slice(0, i);
      tocado = this.value.trim() !== '';
    });
    f.addEventListener('reset', function () { tocado = false; });
  }

  /* Correo de bienvenida (paso aparte: si el correo falla, la autorización ya quedó hecha) */
  function bienvenida(ids) {
    if (!ids || !ids.length) return Promise.resolve();
    busy(true, 'Enviando correo de bienvenida…');
    return api('enviarBienvenida', { ids: ids, pageUrl: paginaUrl() }).then(function (r) {
      busy(false);
      if (r.demo) toast('Modo demostración: no se envían correos');
      else if (r.fallidos.length) toast('No se pudo enviar la bienvenida a: ' + r.fallidos.join(', '), true);
      else toast('✉ Correo de bienvenida enviado a ' + r.enviados.length + ' funcionario' + (r.enviados.length === 1 ? '' : 's'));
    }).catch(function (e) { busy(false); toast('Quedaron autorizados, pero ' + e.message, true); });
  }
  function autorizar(personas, rol) {
    busy(true, 'Autorizando…');
    var conBienvenida = $('#autForm').elements.bienvenida.checked;
    return api('autorizarCorreos', { personas: personas, rol: rol }).then(function (r) {
      renderUsers(r.lista); busy(false);
      if (conBienvenida) bienvenida(r.nuevosIds);
      var una = personas.length === 1 && r.agregados === 1;
      if (una) toast('✓ ' + personas[0].nombre + ' autorizado(a): ' + personas[0].email);
      else openDlg('Funcionarios autorizados', '<p class="inv-ok">✓ ' + r.agregados + ' funcionario' + (r.agregados === 1 ? '' : 's') + ' autorizado' + (r.agregados === 1 ? '' : 's') + '.</p>' +
        (r.omitidos.length ? '<p class="muted small">Ya estaban en la lista: ' + esc(r.omitidos.join(', ')) + '</p>' : '') +
        (r.invalidos.length ? '<p class="inv-err">No se agregaron (deben ser @' + esc(DOMINIO) + '): <b>' + esc(r.invalidos.join(', ')) + '</b></p>' : '') +
        '<p class="muted small">Ya pueden entrar con el botón <b>"Acceder con Google"</b> usando su correo y la clave de su correo.</p>');
      return r;
    }).catch(function (err) { busy(false); toast(err.message, true); throw err; });
  }
  autoCorreo($('#autForm'));
  autoCorreo($('#userForm'));
  // Autorizar a una persona: nombre -> correo propuesto (editable) -> Autorizar
  $('#autForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    var p = { nombre: f.nombre.value.replace(/\s+/g, ' ').trim(), email: correoCompleto(f.email.value) };
    if (S.users && S.users.some(function (u) { return String(u.email).toLowerCase() === p.email; })) return toast(p.email + ' ya está en la lista', true);
    autorizar([p], f.rol.value).then(function (r) {
      if (r.agregados) { f.nombre.value = ''; f.email.value = ''; f.dispatchEvent(new Event('reset')); f.nombre.focus(); }
    }).catch(function () {});
  });
  // Varios a la vez: cada línea puede ser un nombre, un correo o "correo, nombre". Se revisan los correos antes de autorizar.
  $('#btnBulkAut').addEventListener('click', function () {
    var f = $('#autForm'), filas = [];
    f.texto.value.split(/\r?\n/).forEach(function (l) {
      l = l.trim(); if (!l) return;
      var p = l.split(/[,;\t]/).map(function (x) { return x.trim(); }).filter(Boolean), email = '', nombre = '';
      p.forEach(function (x) { if (/@/.test(x) || (!/\s/.test(x) && /\./.test(x))) email = x; else nombre = nombre || x; });
      if (!email) email = correoDesdeNombre(nombre);
      filas.push({ nombre: nombre, email: email.replace('@' + DOMINIO, '') });
    });
    if (!filas.length) return toast('Escriba al menos un funcionario', true);
    openDlg('Revisar ' + filas.length + ' funcionario' + (filas.length === 1 ? '' : 's'),
      '<p class="muted small">Revise los correos propuestos y corrija los que haga falta.</p><div class="bulk-list">' + filas.map(function (x, i) {
        return '<div class="bulk-row"><span>' + esc(x.nombre || '—') + '</span><span class="email-dom"><input data-i="' + i + '" value="' + esc(x.email) + '"><span class="dom">@' + esc(DOMINIO) + '</span></span></div>';
      }).join('') + '</div>').then(function (ok) {
      if (!ok) return;
      var personas = filas.map(function (x, i) { return { nombre: x.nombre, email: correoCompleto($('#dlgBody input[data-i="' + i + '"]').value) }; });
      autorizar(personas, f.rol.value).then(function () { f.texto.value = ''; }).catch(function () {});
    });
  });
  // Aviso para el administrador mientras el ingreso con Google no esté configurado
  if (!GID) $('#gSetup').classList.remove('hidden');
  if (!GID) $('#gSetup').innerHTML =
    '<b>Falta un paso para activar el botón de Google</b> (se hace una vez): crear el "ID de cliente" en Google Cloud con el origen ' +
    '<code>' + esc(location.origin) + '</code> y pegarlo en <code>config.js</code> y en <code>Code.gs</code>. Vea INSTRUCCIONES_GOOGLE.txt. ' +
    'Mientras tanto puede ir armando la lista.';

  /* Invitación en 2 pasos: (1) se crea el usuario con clave automática; (2) se envía el correo.
     Si el correo falla, el usuario ya existe y el administrador ve la clave para entregarla en persona. */
  function invitar(r, nombre) {
    renderUsers(r.lista);
    busy(true, 'Enviando invitación a ' + r.email + '…');
    return api('enviarInvitacion', { id: r.id, pageUrl: paginaUrl() }).then(function (s) {
      busy(false); mostrarInvitacion(r, nombre, s.enviado ? '' : 'demo');
    }, function (e) {
      busy(false); mostrarInvitacion(r, nombre, e.message);
    });
  }
  function mostrarInvitacion(r, nombre, error) {
    var ok = !error;
    var cab = ok ? '<p class="inv-ok">✓ Se envió la invitación a <b>' + esc(r.email) + '</b>, con la clave provisoria y la dirección de la página.</p>'
      : error === 'demo' ? '<p>Modo demostración: no se envían correos.</p>'
      : '<p class="inv-err">El usuario quedó creado, pero <b>no se pudo enviar el correo</b>.<br><small>' + esc(error) + '</small></p>';
    openDlg(ok ? 'Invitación enviada' : 'Usuario creado', cab +
      '<p>Clave provisoria de <b>' + esc(nombre) + '</b> (creada automáticamente):</p><p class="temp-pass">' + esc(r.clave) + '</p>' +
      '<p class="muted small">Página: <a href="' + esc(paginaUrl()) + '" target="_blank" rel="noopener">' + esc(paginaUrl()) + '</a><br>' +
      (ok ? 'Si no le llega, pídale revisar la carpeta de spam.' : 'Entréguele la clave y la dirección; cuando el correo funcione puede usar "Enviar clave provisoria".') +
      ' Al ingresar deberá crear su clave personal.</p>');
  }
  $('#userForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, nombre = f.nombre.value.replace(/\s+/g, ' ').trim();
    busy(true, 'Creando usuario…');
    api('createUser', { nombre: nombre, email: correoCompleto(f.email.value), rol: f.rol.value, pageUrl: paginaUrl() })
      .then(function (r) { f.reset(); return invitar(r, nombre); })
      .catch(function (err) { toast(err.message, true); }).then(function () { busy(false); });
  });
  $('#userTable tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var u = S.users.filter(function (x) { return x.id === b.closest('tr').dataset.id; })[0];
    var p;
    if (b.dataset.act === 'bienv') return bienvenida([u.id]);
    if (b.dataset.act === 'inv') {
      return confirmDlg('Enviar clave provisoria', 'Se generará una <b>nueva clave provisoria</b> para <b>' + esc(u.nombre) + '</b> y se enviará a <b>' + esc(u.email || '(sin correo)') +
        '</b>. Su clave actual dejará de funcionar.').then(function (ok) {
        if (!ok) return;
        busy(true, 'Generando clave provisoria…');
        api('reenviarInvitacion', { id: u.id, pageUrl: paginaUrl() }).then(function (r) { return invitar(r, u.nombre); })
          .catch(function (err) { toast(err.message, true); }).then(function () { busy(false); });
      });
    }
    if (b.dataset.act === 'edit') p = formDlg('Editar usuario', [
      { name: 'nombre', label: 'Nombre completo', value: u.nombre, required: true },
      { name: 'email', label: 'Correo (se completa con @' + DOMINIO + ')', value: String(u.email || '').replace('@' + DOMINIO, '') },
      { name: 'rol', label: 'Rol', type: 'select', value: u.rol, options: [['usuario', 'Usuario'], ['admin', 'Administrador']] }
    ]).then(function (v) { return v && api('updateUser', { id: u.id, nombre: v.nombre, email: correoCompleto(v.email), rol: v.rol }); });
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
  /* Corregir el nombre tal como saldrá impreso. opts.lista: muestra la casilla "corregir también en la lista" */
  function dlgNombre(titulo, nombre, opts) {
    opts = opts || {};
    var html = '<label>Nombre como aparecerá en el documento<input name="nombre" value="' + esc(nombre) + '" required maxlength="90"></label>' +
      '<div class="row mt-s"><button type="button" class="btn ghost sm" data-fmt="tc">Mayúscula inicial</button>' +
      '<button type="button" class="btn ghost sm" data-fmt="inv">Pasar primer(os) apellido(s) al final</button></div>' +
      (opts.lista ? '<label class="check mt-s"><input type="checkbox" name="enLista" checked> Corregir también en la lista de ' + esc(opts.lista) + '</label>' : '') +
      (opts.nota ? '<p class="muted small mt-s">' + opts.nota + '</p>' : '');
    var p = openDlg(titulo, html);
    var inp = $('#dlgBody [name="nombre"]');
    $('#dlgBody').onclick = function (e) {
      var b = e.target.closest('[data-fmt]'); if (!b) return;
      inp.value = b.dataset.fmt === 'tc' ? titleCase(inp.value.toUpperCase()) : nombreDesdeApellidos(inp.value);
      inp.focus();
    };
    setTimeout(function () { inp.select(); }, 30);
    return p.then(function (ok) {
      var v = inp.value.replace(/\s+/g, ' ').trim();
      if (!ok || !v) return null;
      var c = $('#dlgBody [name="enLista"]');
      return { nombre: v, enLista: c ? c.checked : false };
    });
  }
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
    // se muestra al tiro el último logo conocido (guardado en este equipo) y luego se confirma con el servidor
    var guardado = ''; try { guardado = localStorage.getItem('lic_portada_logo') || ''; } catch (e) {}
    $('#heroSchool').textContent = window.COLEGIO_NOMBRE || 'Generador de Licencias';
    aplicarPortada(guardado);
    api('portada').then(function (p) { aplicarPortada(p.logo); }).catch(function () {});
  })();
  if (DEMO) $('#demoNote').classList.remove('hidden');
  if (S.token) {
    busy(true, 'Cargando…');
    api('me').then(startApp).catch(function () { logoutLocal(); }).then(function () { busy(false); });
  } else {
    $('#login').classList.remove('hidden'); loadUsers();
  }
})();
