/* ==========================================================================
   Motor de licencias — PDF tamaño CARTA horizontal (279,4 × 215,9 mm)
   para imprimir en opalina. Requiere jsPDF 2.x (window.jspdf).

   Diseño "diploma": marco azul con banda guilloché, roseta de seguridad
   al fondo, título en Cinzel Decorative, nombre caligráfico (Great Vibes)
   y texto en Crimson Text. Si las tipografías no cargan, usa Times.
   ========================================================================== */
(function (global) {
  'use strict';

  var W = 279.4, H = 215.9, CX = W / 2;
  var C = {
    // Colores pensados para impresión: dorado y gris más oscuros para que no se laven en opalina
    navy:   [8, 30, 72],       // azul profundo: texto nítido al imprimir
    navy2:  [36, 66, 120],
    gold:   [154, 116, 36],
    goldT:  [128, 92, 18],     // dorado oscuro para TEXTO (más contraste que el de las líneas)
    goldL:  [188, 156, 88],
    rose:   [218, 226, 240],
    ink:    [12, 12, 18],      // casi negro
    gray:   [48, 50, 60]       // gris oscuro para rótulos pequeños
  };
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var NIVELES = {
    '4M': { linea1: 'LICENCIA DE', titulo: 'Enseñanza Media', otorga: 'LICENCIA DE ENSEÑANZA MEDIA', curso: '4° Año Medio' },
    '8B': { linea1: 'LICENCIA DE', titulo: 'Educación Básica', otorga: 'LICENCIA DE EDUCACIÓN BÁSICA', curso: '8° Año Básico' }
  };

  function fechaLarga(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-').map(Number);
    if (p.length < 3 || !p[0]) return String(iso);
    return p[2] + ' de ' + MESES[p[1] - 1] + ' de ' + p[0];
  }

  /* ======================= Tipografías ======================= */
  var FONT_BASE = global.LICENCIA_FONT_BASE || 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/';
  var FONT_FILES = {
    CrimsonText: {
      normal: 'crimsontext/CrimsonText-Regular.ttf', bold: 'crimsontext/CrimsonText-SemiBold.ttf',
      italic: 'crimsontext/CrimsonText-Italic.ttf', bolditalic: 'crimsontext/CrimsonText-SemiBoldItalic.ttf'
    },
    CinzelDecorative: { bold: 'cinzeldecorative/CinzelDecorative-Bold.ttf' },
    GreatVibes: { normal: 'greatvibes/GreatVibes-Regular.ttf' }
  };
  var fontCache = {}, fontPromise = null;

  function abToB64(buf) {
    var bytes = new Uint8Array(buf), s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }

  function loadFonts() {
    if (fontPromise) return fontPromise;
    var jobs = [];
    Object.keys(FONT_FILES).forEach(function (fam) {
      Object.keys(FONT_FILES[fam]).forEach(function (style) {
        var path = FONT_FILES[fam][style];
        jobs.push(fetch(FONT_BASE + path).then(function (r) {
          if (!r.ok) throw new Error('font'); return r.arrayBuffer();
        }).then(function (b) {
          fontCache[fam] = fontCache[fam] || {};
          fontCache[fam][style] = { file: path.split('/').pop(), b64: abToB64(b) };
        }).catch(function () { /* se usará Times */ }));
      });
    });
    fontPromise = Promise.all(jobs);
    return fontPromise;
  }

  function registerFonts(doc) {
    Object.keys(fontCache).forEach(function (fam) {
      Object.keys(fontCache[fam]).forEach(function (style) {
        var f = fontCache[fam][style];
        doc.addFileToVFS(f.file, f.b64);
        doc.addFont(f.file, fam, style);
      });
    });
  }

  // tipo: 'serif' | 'title' | 'script'
  function fnt(tipo, style) {
    if (tipo === 'title') return fontCache.CinzelDecorative && fontCache.CinzelDecorative.bold ? ['CinzelDecorative', 'bold'] : ['times', 'bold'];
    if (tipo === 'script') return fontCache.GreatVibes && fontCache.GreatVibes.normal ? ['GreatVibes', 'normal'] : ['times', 'bolditalic'];
    style = style || 'normal';
    return fontCache.CrimsonText && fontCache.CrimsonText[style] ? ['CrimsonText', style] : ['times', style];
  }

  function setF(doc, tipo, style, size, color) {
    var f = fnt(tipo, style);
    doc.setFont(f[0], f[1]); doc.setFontSize(size);
    doc.setTextColor.apply(doc, color || C.ink);
  }

  /* ======================= Imágenes ======================= */
  // Se leen los bytes originales (sin canvas) para no perder resolución.
  function toDataUrl(src) {
    if (!src || /^data:/i.test(src)) return Promise.resolve(src);
    return fetch(src).then(function (r) { if (!r.ok) throw new Error(); return r.blob(); }).then(function (b) {
      return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); });
    }).catch(function () { return ''; });
  }

  function decodeImage(dataUrl) {
    return new Promise(function (resolve) {
      if (!dataUrl) return resolve(null);
      var img = new Image();
      img.onload = function () {
        resolve({ data: dataUrl, w: img.naturalWidth, h: img.naturalHeight,
          fmt: /^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG',
          alias: 'img' + Math.random().toString(36).slice(2) });
      };
      img.onerror = function () { resolve(null); };
      img.src = dataUrl;
    });
  }

  /* Prepara un logo para IMPRESIÓN:
     - Aplana la transparencia sobre blanco: las impresoras suelen imprimir las imágenes
       con transparencia (SMask) a baja resolución y con colores lavados.
     - Amplía en pasos de 2× con suavizado de alta calidad hasta ~1800 px, para que el
       driver de la impresora no la amplíe con pixelado.
     - Refuerza levemente saturación y contraste (la opalina absorbe tinta y apaga el color).
     Nota: ampliar no agrega detalle real; la mejor calidad se obtiene con un original grande. */
  var PRINT_PX = 1800;

  // Enfoque (máscara de enfoque 3×3) sobre el canvas
  function sharpen(ctx, w, h, a) {
    var src = ctx.getImageData(0, 0, w, h), s = src.data, out = ctx.createImageData(w, h), d = out.data;
    var cw = 1 + 4 * a;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var up = y > 0 ? i - w * 4 : i, dn = y < h - 1 ? i + w * 4 : i;
        var lf = x > 0 ? i - 4 : i, rt = x < w - 1 ? i + 4 : i;
        for (var c = 0; c < 3; c++) {
          var v = cw * s[i + c] - a * (s[up + c] + s[dn + c] + s[lf + c] + s[rt + c]);
          d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }
  function printReady(img) {
    if (!img) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var el = new Image();
      el.onload = function () {
        var w = el.naturalWidth, h = el.naturalHeight, src = el;
        var target = Math.max(1, PRINT_PX / Math.max(w, h)), upscale = target;
        while (target > 1.01) {
          var k = Math.min(2, target), c = document.createElement('canvas');
          c.width = Math.round(w * k); c.height = Math.round(h * k);
          var g = c.getContext('2d');
          g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
          g.drawImage(src, 0, 0, c.width, c.height);
          src = c; w = c.width; h = c.height; target /= k;
        }
        var out = document.createElement('canvas'); out.width = w; out.height = h;
        var o = out.getContext('2d');
        o.fillStyle = '#ffffff'; o.fillRect(0, 0, w, h);
        try { o.filter = 'saturate(1.18) contrast(1.06)'; } catch (e) {}
        o.drawImage(src, 0, 0);
        // si la imagen se amplió mucho, se enfoca para recuperar bordes definidos
        if (upscale >= 1.5) sharpen(o, w, h, Math.min(0.9, 0.35 * upscale));
        resolve({ data: out.toDataURL('image/jpeg', 1.0), w: w, h: h, fmt: 'JPEG', alias: img.alias });
      };
      el.onerror = function () { resolve(img); };
      el.src = img.data;
    });
  }

  function loadImage(src) { return toDataUrl(src).then(decodeImage).then(printReady); }

  /* Marca de agua: la insignia ya "desteñida" sobre blanco (imagen opaca, sin transparencia
     PDF), para que se imprima pareja en cualquier impresora. */
  function watermark(img, strength) {
    if (!img) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var el = new Image();
      el.onload = function () {
        var k = Math.min(1, 1100 / Math.max(img.w, img.h));
        var c = document.createElement('canvas');
        c.width = Math.round(img.w * k); c.height = Math.round(img.h * k);
        var g = c.getContext('2d');
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
        g.globalAlpha = strength;
        g.drawImage(el, 0, 0, c.width, c.height);
        resolve({ data: c.toDataURL('image/jpeg', 0.92), w: c.width, h: c.height, fmt: 'JPEG',
          alias: 'wm' + Math.random().toString(36).slice(2) });
      };
      el.onerror = function () { resolve(null); };
      el.src = img.data;
    });
  }

  function prepareAssets(cfg) {
    cfg = cfg || {};
    var base = global.LICENCIA_ASSETS || {};
    var preset = (base.insignias || []).filter(function (x) { return x.id === cfg.insignia; })[0];
    return Promise.all([
      // insignia: la subida por el usuario, o la elegida de la lista, o la predeterminada
      loadImage(cfg.logoColegio || (preset && preset.src) || base.colegio),
      // el escudo de la República es fijo
      loadImage(base.escudo),
      loadFonts()
    ]).then(function (r) {
      // ~15 % de tinta: bajo ~10 % muchas impresoras simplemente no imprimen el tono
      return watermark(r[0], 0.15).then(function (wm) { return { colegio: r[0], ministerio: r[1], marcaAgua: wm }; });
    });
  }

  function drawImageFit(doc, img, x, y, bw, bh, align) {
    var ratio = Math.min(bw / img.w, bh / img.h);
    var w = img.w * ratio, h = img.h * ratio;
    var dx = align === 'c' ? (bw - w) / 2 : align === 'r' ? bw - w : 0;
    // alias: la imagen se incrusta una sola vez aunque haya muchas páginas; compresión sin pérdida
    doc.addImage(img.data, img.fmt, x + dx, y + (bh - h) / 2, w, h, img.alias, 'SLOW');
    return { w: w, h: h };
  }

  /* ======================= Ornamentos ======================= */
  function poly(doc, pts, closed) {
    var segs = [];
    for (var i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'S', !!closed);
  }

  // onda sinusoidal a lo largo de un lado
  function wave(doc, x0, y0, len, amp, period, phase, vertical) {
    var n = Math.ceil(len / 0.7), pts = [];
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * len, o = amp * Math.sin((2 * Math.PI * t) / period + phase);
      pts.push(vertical ? [x0 + o, y0 + t] : [x0 + t, y0 + o]);
    }
    poly(doc, pts);
  }

  // anillo guilloché: varias circunferencias onduladas desfasadas
  function ring(doc, cx, cy, R, A, lobes, copies, steps) {
    steps = steps || 360;
    for (var j = 0; j < copies; j++) {
      var ph = (j / copies) * (2 * Math.PI / lobes), pts = [];
      for (var i = 0; i <= steps; i++) {
        var t = (i / steps) * 2 * Math.PI, r = R + A * Math.sin(lobes * t + ph * lobes);
        pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
      }
      poly(doc, pts, true);
    }
  }

  function diamond(doc, cx, cy, r, color) {
    doc.setFillColor.apply(doc, color);
    doc.lines([[r, r], [-r, r], [-r, -r], [r, -r]], cx, cy - r, [1, 1], 'F', true);
  }

  function rosetaFondo(doc, cx, cy) {
    doc.setDrawColor.apply(doc, C.rose); doc.setLineWidth(0.13);
    ring(doc, cx, cy, 62, 5.5, 30, 10, 540);
    ring(doc, cx, cy, 46, 5, 24, 9, 480);
    ring(doc, cx, cy, 30, 4, 16, 8, 360);
    ring(doc, cx, cy, 15, 3, 10, 6, 240);
  }

  function marco(doc) {
    // banda exterior azul sólida
    doc.setFillColor.apply(doc, C.navy);
    doc.rect(8, 8, W - 16, H - 16, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(10, 10, W - 20, H - 20, 'F');
    // filete dorado
    doc.setDrawColor.apply(doc, C.gold); doc.setLineWidth(0.45);
    doc.rect(10.9, 10.9, W - 21.8, H - 21.8);

    // banda guilloché (angosta)
    var b0 = 11.8, b1 = 16.8, mid = (b0 + b1) / 2, lenH = W - 2 * b1, lenV = H - 2 * b1;
    [[C.goldL, 1, 3.5, 0, 0.24], [C.navy2, 1.9, 7, 0, 0.3], [C.gold, 1.9, 7, Math.PI, 0.3]].forEach(function (s) {
      doc.setDrawColor.apply(doc, s[0]); doc.setLineWidth(s[4]);
      wave(doc, b1, mid, lenH, s[1], s[2], s[3], false);
      wave(doc, b1, H - mid, lenH, s[1], s[2], s[3], false);
      wave(doc, mid, b1, lenV, s[1], s[2], s[3], true);
      wave(doc, W - mid, b1, lenV, s[1], s[2], s[3], true);
    });

    // filetes interiores
    doc.setDrawColor.apply(doc, C.navy); doc.setLineWidth(0.4);
    doc.rect(b1 + 0.3, b1 + 0.3, W - 2 * (b1 + 0.3), H - 2 * (b1 + 0.3));
    doc.setDrawColor.apply(doc, C.gold); doc.setLineWidth(0.24);
    doc.rect(b1 + 1.2, b1 + 1.2, W - 2 * (b1 + 1.2), H - 2 * (b1 + 1.2));

    // rosetas en las esquinas
    [[mid, mid], [W - mid, mid], [mid, H - mid], [W - mid, H - mid]].forEach(function (p) {
      doc.setFillColor(255, 255, 255);
      doc.circle(p[0], p[1], 3.3, 'F');
      doc.setDrawColor.apply(doc, C.gold); doc.setLineWidth(0.2);
      ring(doc, p[0], p[1], 2.2, 0.6, 8, 4, 140);
      doc.setDrawColor.apply(doc, C.navy); doc.setLineWidth(0.3);
      doc.circle(p[0], p[1], 3.1);
      doc.setFillColor.apply(doc, C.navy);
      doc.circle(p[0], p[1], 0.7, 'F');
    });
  }

  function separador(doc, cx, y, half, r) {
    r = r || 1.9;
    doc.setDrawColor.apply(doc, C.gold); doc.setLineWidth(0.35);
    doc.line(cx - half, y, cx - r - 2.2, y);
    doc.line(cx + r + 2.2, y, cx + half, y);
    doc.setLineWidth(0.15);
    doc.line(cx - half * 0.7, y + 1, cx - r - 2.2, y + 1);
    doc.line(cx + r + 2.2, y + 1, cx + half * 0.7, y + 1);
    diamond(doc, cx, y + 0.5, r, C.gold);
    diamond(doc, cx - r - 1.2, y + 0.5, 0.6, C.navy);
    diamond(doc, cx + r + 1.2, y + 0.5, 0.6, C.navy);
    doc.setFillColor.apply(doc, C.gold);
    doc.circle(cx - half - 1, y, 0.55, 'F');
    doc.circle(cx + half + 1, y, 0.55, 'F');
  }

  /* ======================= Texto ======================= */
  // texto con espaciado entre letras, centrado
  function tracked(doc, t, cx, y, cs) {
    var chars = String(t).split(''), widths = chars.map(function (c) { return doc.getTextWidth(c); });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + cs * (chars.length - 1);
    var x = cx - total / 2;
    chars.forEach(function (c, i) { doc.text(c, x, y); x += widths[i] + cs; });
    return total;
  }

  // línea con tramos de distinto estilo, centrada y reducida si no cabe
  function rich(doc, segs, cx, y, maxW) {
    function measure(k) {
      return segs.reduce(function (acc, s) {
        setF(doc, s.f, s.st, s.s * k, s.c); return acc + doc.getTextWidth(s.t);
      }, 0);
    }
    var k = 1, w = measure(1);
    if (w > maxW) { k = maxW / w; w = measure(k); }
    var x = cx - w / 2;
    segs.forEach(function (s) { setF(doc, s.f, s.st, s.s * k, s.c); doc.text(s.t, x, y); x += doc.getTextWidth(s.t); });
  }

  function fit(doc, t, maxW, size, min) {
    doc.setFontSize(size);
    while (doc.getTextWidth(t) > maxW && size > min) { size -= 0.5; doc.setFontSize(size); }
    return size;
  }

  /* ======================= Página ======================= */
  function drawLicense(doc, r, assets, opts) {
    opts = opts || {};
    var nv = NIVELES[r.nivel] || NIVELES['4M'];

    if (opts.borde !== false) marco(doc);
    if (assets.marcaAgua) drawImageFit(doc, assets.marcaAgua, CX - 50, 98, 100, 78, 'c');

    // ---------- Encabezado ----------
    if (assets.colegio) drawImageFit(doc, assets.colegio, 28, 27, 32, 33, 'c');
    if (assets.ministerio) drawImageFit(doc, assets.ministerio, CX - 19, 26, 38, 25, 'c');
    setF(doc, 'serif', 'bold', 10, C.navy);  tracked(doc, 'REPÚBLICA DE CHILE', CX, 55.5, 0.55);
    setF(doc, 'serif', 'bold', 8.5, C.navy); tracked(doc, 'MINISTERIO DE EDUCACIÓN', CX, 59.3, 0.35);
    setF(doc, 'serif', 'bold', 7, C.gray);   tracked(doc, 'DIVISIÓN DE EDUCACIÓN GENERAL', CX, 62.6, 0.3);

    // ficha del establecimiento
    var fx = 194, fw = 59, fy = 27;
    doc.setDrawColor.apply(doc, C.goldL); doc.setLineWidth(0.3);
    doc.roundedRect(fx, fy, fw, 33, 1.5, 1.5);
    setF(doc, 'serif', 'bold', 7, C.goldT); tracked(doc, 'ESTABLECIMIENTO', fx + fw / 2, fy + 4.6, 0.5);
    [['Región', r.region], ['Provincia', r.provincia], ['Comuna', r.comuna],
     ['RBD', r.rbd], ['Año Escolar', r.anioEscolar]].forEach(function (row, i) {
      var y = fy + 10.4 + i * 5;
      setF(doc, 'serif', 'normal', 8, C.gray); doc.text(row[0], fx + 3, y);
      setF(doc, 'serif', 'bold', 9.5, C.navy);
      var v = String(row[1] || ''); fit(doc, v, fw - 22, 9.5, 6);
      doc.text(v, fx + fw - 3, y, { align: 'right' });
      if (i < 4) { doc.setDrawColor(230, 224, 208); doc.setLineWidth(0.15); doc.line(fx + 3, y + 1.6, fx + fw - 3, y + 1.6); }
    });

    // ---------- Título ----------
    setF(doc, 'serif', 'bold', 12.5, C.goldT); tracked(doc, nv.linea1, CX, 74, 1.8);
    setF(doc, 'title', 'bold', 31, C.navy);
    doc.text(nv.titulo, CX, 87, { align: 'center' });
    separador(doc, CX, 92.5, 58);

    // ---------- Cuerpo ----------
    var N = function (t) { return { t: t, f: 'serif', st: 'normal', s: 12.5, c: C.ink }; };
    var B = function (t) { return { t: t, f: 'serif', st: 'bold', s: 13.5, c: C.navy }; };
    rich(doc, [N('Certifico que, según consta en el Registro respectivo N° '), B(String(r.registro || '')),
      N(' del año '), B(String(r.anio || ''))], CX, 104, 205);
    rich(doc, [N('del '), B(String(r.colegio || '')), N(', se otorgó la '), B(nv.otorga), N(' a')], CX, 112, 205);

    // nombre
    var trat = r.sexo === 'F' ? 'Doña' : r.sexo === 'M' ? 'Don' : 'Don(a)';
    setF(doc, 'serif', 'italic', 13, C.ink);
    var tw = doc.getTextWidth(trat + '  ');
    setF(doc, 'script', 'normal', 40, C.navy);
    var ns = fit(doc, String(r.nombre || ''), 200 - tw, 40, 22);
    var nw = doc.getTextWidth(String(r.nombre || ''));
    var x0 = CX - (tw + nw) / 2;
    setF(doc, 'serif', 'italic', 13, C.ink); doc.text(trat, x0, 130);
    setF(doc, 'script', 'normal', ns, C.navy); doc.text(String(r.nombre || ''), x0 + tw, 130);
    separador(doc, CX, 135.5, 85, 1.3);

    // R.U.N.
    setF(doc, 'serif', 'bold', 10, C.gray);
    var lw = 0, lab = 'R.U.N.';
    lw = doc.getTextWidth(lab) + 2.5;
    setF(doc, 'serif', 'bold', 14, C.navy);
    var rw = doc.getTextWidth(String(r.run || ''));
    var rx = CX - (lw + rw) / 2;
    setF(doc, 'serif', 'bold', 10, C.gray); doc.text(lab, rx, 145);
    setF(doc, 'serif', 'bold', 14, C.navy); doc.text(String(r.run || ''), rx + lw, 145);

    setF(doc, 'serif', 'italic', 12.5, C.ink);
    doc.text('quien aprobó los estudios correspondientes a este nivel.', CX, 154, { align: 'center' });

    // ---------- Pie ----------
    var fyL = 180;
    var lcx = 80, scx = 199;
    setF(doc, 'serif', 'italic', 13, C.navy);
    var lugar = (r.ciudad ? r.ciudad + ', ' : '') + fechaLarga(r.fecha);
    fit(doc, lugar, 84, 13, 9);
    doc.text(lugar, lcx, fyL - 2, { align: 'center' });
    doc.setDrawColor.apply(doc, C.gold); doc.setLineWidth(0.3);
    doc.line(lcx - 42, fyL, lcx + 42, fyL);
    setF(doc, 'serif', 'bold', 7.5, C.gray); tracked(doc, 'LUGAR Y FECHA', lcx, fyL + 4.4, 0.6);

    doc.setDrawColor.apply(doc, C.navy); doc.setLineWidth(0.35);
    doc.line(scx - 44, fyL, scx + 44, fyL);
    setF(doc, 'serif', 'bold', 12.5, C.navy);
    var nd = String(r.directora || ''); fit(doc, nd, 88, 12.5, 8);
    doc.text(nd, scx, fyL + 4.8, { align: 'center' });
    setF(doc, 'serif', 'bold', 7.5, C.gray);
    tracked(doc, String(r.cargo || 'Director(a) del Establecimiento').toUpperCase(), scx, fyL + 8.6, 0.45);
  }

  /* ======================= API pública ======================= */
  function build(records, assets, opts) {
    var jsPDF = global.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter', compress: true });
    registerFonts(doc);
    records.forEach(function (r, i) {
      if (i > 0) doc.addPage('letter', 'landscape');
      conAjuste(doc, opts, function () { drawLicense(doc, r, assets || {}, opts); });
    });
    finalizar(doc, 'Licencias');
    return doc;
  }

  /* Indica al visor que imprima a tamaño real (sin "Ajustar a la página"),
     que es la causa más común de que la licencia salga corrida o torcida. */
  function finalizar(doc, titulo) {
    try { doc.viewerPreferences({ PrintScaling: 'None', PickTrayByPDFSize: true }); } catch (e) {}
    doc.setProperties({ title: titulo, creator: 'Generador de Licencias' });
  }

  /* Ajuste de alineación de la impresora (mm). X positivo = a la derecha; Y positivo = hacia abajo. */
  function conAjuste(doc, opts, fn) {
    var ax = parseFloat(String((opts || {}).ajusteX || 0).replace(',', '.')) || 0;
    var ay = parseFloat(String((opts || {}).ajusteY || 0).replace(',', '.')) || 0;
    if (!ax && !ay) return fn();
    var k = 72 / 25.4;
    doc.internal.write('q 1 0 0 1 ' + (ax * k).toFixed(2) + ' ' + (-ay * k).toFixed(2) + ' cm');
    fn();
    doc.internal.write('Q');
  }

  /* Hoja de prueba de alineación: marco exacto a 10 mm del borde, cruz central y reglas. */
  function pruebaAlineacion(opts) {
    var jsPDF = global.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter', compress: true });
    registerFonts(doc);
    conAjuste(doc, opts, function () {
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
      doc.rect(10, 10, W - 20, H - 20);
      doc.setLineWidth(0.2);
      doc.line(CX - 15, H / 2, CX + 15, H / 2); doc.line(CX, H / 2 - 15, CX, H / 2 + 15);
      doc.circle(CX, H / 2, 5);
      // reglas en los cuatro bordes (cada 1 mm, rótulo cada 5 mm)
      setF(doc, 'serif', 'bold', 6, [0, 0, 0]);
      for (var m = 1; m <= 25; m++) {
        var L = m % 5 === 0 ? 4 : 2;
        doc.line(CX - 20, m, CX - 20 + L, m); doc.line(CX + 20, H - m, CX + 20 - L, H - m);
        doc.line(m, H / 2 + 20, m, H / 2 + 20 - L); doc.line(W - m, H / 2 - 20, W - m, H / 2 - 20 + L);
        if (m % 5 === 0) {
          doc.text(String(m), CX - 14.5, m + 0.8); doc.text(String(m), CX + 14.5, H - m + 0.8, { align: 'right' });
          doc.text(String(m), m, H / 2 + 23, { align: 'center' }); doc.text(String(m), W - m, H / 2 - 21.5, { align: 'center' });
        }
      }
      setF(doc, 'serif', 'bold', 15, C.navy);
      doc.text('Hoja de prueba de alineación', CX, 42, { align: 'center' });
      setF(doc, 'serif', 'normal', 11, C.ink);
      [
        'Imprima esta hoja en papel normal, tamaño Carta, horizontal y a escala 100 % ("Tamaño real").',
        'El rectángulo debe quedar exactamente a 10 mm de cada borde. Use las reglas para medir.',
        'Si arriba mide más que abajo, la impresión está corrida hacia abajo: anote la diferencia ÷ 2.',
        'Ejemplo: arriba 13 mm y abajo 7 mm → Ajuste vertical = -3 mm (subir). Igual para izquierda/derecha.',
        'Ingrese esos valores en "Datos del colegio → Ajuste de impresión" y vuelva a imprimir la prueba.',
        'Si el rectángulo sale torcido (no paralelo al borde), es el arrastre del papel: use la bandeja',
        'manual o trasera, ajuste las guías al ancho de la opalina e introduzca una hoja a la vez.'
      ].forEach(function (t, i) { doc.text(t, CX, 56 + i * 6.5, { align: 'center' }); });
      var ax = (opts && opts.ajusteX) || 0, ay = (opts && opts.ajusteY) || 0;
      setF(doc, 'serif', 'italic', 10, C.gray);
      doc.text('Ajuste aplicado: horizontal ' + ax + ' mm · vertical ' + ay + ' mm', CX, H - 40, { align: 'center' });
    });
    finalizar(doc, 'Prueba de alineación');
    return doc;
  }

  global.Licencia = {
    NIVELES: NIVELES,
    fechaLarga: fechaLarga,
    loadFonts: loadFonts,
    prepareAssets: prepareAssets,
    build: build,
    pruebaAlineacion: pruebaAlineacion
  };
})(window);
