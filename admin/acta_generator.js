// ══════════════════════════════════════════════
// acta_generator.js
// Generador de Actas Finales — Sistema Electoral
// ══════════════════════════════════════════════

const actaGenerator = (function() {
  let _sb = null;
  let _plancha = null;
  let _miembros = [];
  let _cuotas = {};
  let _votos = [];
  let _actaData = null;

  function getMecanismos() {
    const citaMec = window.configLoader?.getCitaActa('mecanismoElectoral');
    const refMec = citaMec ? citaMec.textoEstatuto : 'estatutos del partido';
    return {
      CONSENSO: {
        titulo: 'ACTA DE CONSENSO',
        desc: 'La presente plancha fue propuesta por consenso de las partes interesadas y ratificada por la dirigencia de conformidad con los estatutos del partido. No se realizó votación.'
      },
      ELECCION_INTERNA: {
        titulo: 'ACTA DE ELECCIÓN INTERNA',
        desc: 'Se realizó votación interna entre los miembros habilitados de {alcance} según el ' + refMec + '.'
      },
      PROCESO_ABIERTO: {
        titulo: 'ACTA DE PROCESO ABIERTO',
        desc: 'Se abrió el proceso de elección a todos los militantes registrados en {alcance}, de conformidad con los estatutos del partido.'
      },
      PROCESO_CERRADO: {
        titulo: 'ACTA DE PROCESO CERRADO',
        desc: 'La votación fue restringida a los niveles y dirigentes habilitados de {alcance} según los estatutos del partido.'
      }
    };
  }

  const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  function init(sb) {
    _sb = sb;
  }

  // ── Cargar datos de la plancha ──
  async function cargarPlancha(planchaId) {
    const { data: plancha, error: e1 } = await _sb
      .from('planchas')
      .select('*')
      .eq('id', planchaId)
      .single();
    if (e1) throw new Error('Error cargando plancha: ' + e1.message);

    const { data: miembros, error: e2 } = await _sb
      .from('plancha_miembros')
      .select('*')
      .eq('plancha_id', planchaId)
      .order('posicion');
    if (e2) throw new Error('Error cargando miembros: ' + e2.message);

    _plancha = plancha;
    _miembros = miembros || [];
    _cuotas = {
      genero_ok: plancha.cuota_genero_ok,
      juventud_ok: plancha.cuota_juventud_ok,
      militancia_ok: plancha.militancia_ok,
      porcentaje_mujeres: plancha.porcentaje_mujeres,
      porcentaje_jovenes: plancha.porcentaje_jovenes,
      total_mujeres: plancha.total_mujeres,
      total_hombres: plancha.total_hombres,
      total_jovenes: plancha.total_jovenes,
      total_miembros: plancha.total_miembros
    };

    return { plancha, miembros };
  }

  // ── Cargar votos (si existen) ──
  async function cargarVotos(actaId) {
    const { data } = await _sb
      .from('votos_eleccion')
      .select('*')
      .eq('acta_id', actaId);
    _votos = data || [];
    return _votos;
  }

  // ── Formatear fecha en español ──
  function formatearFecha(fecha) {
    const d = new Date(fecha);
    return d.getDate() + ' de ' + MESES_ES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function formatearFechaCorta(fecha) {
    const d = new Date(fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return dd + '/' + mm + '/' + yyyy + ', ' + hh + ':' + min + ':' + ss + ' AST';
  }

  // ── Construir HTML del mecanismo ──
  function buildMecanismo(mecanismo, alcance) {
    const mecanismos = getMecanismos();
    const cfg = mecanismos[mecanismo];
    if (!cfg) return '';
    const desc = cfg.desc.replace('{alcance}', alcance || '');
    return '<strong>' + cfg.titulo + '</strong>\n' + desc;
  }

  // ── Construir HTML de planchas ──
  function buildPlanchas() {
    let html = '';
    html += '<table class="acta-table">';
    html += '<thead><tr><th>#</th><th>Posición</th><th>Nombre</th><th>Cédula</th></tr></thead>';
    html += '<tbody>';
    _miembros.forEach((m, i) => {
      html += '<tr>';
      html += '<td>' + (i + 1) + '</td>';
      html += '<td>' + (m.cargo_nombre || m.cargo_id || '') + '</td>';
      html += '<td>' + (m.nombre_titular || '') + '</td>';
      html += '<td>' + (m.cedula_titular || '') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  // ── Construir HTML de cuotas ──
  function buildCuotas() {
    const genClass = _cuotas.genero_ok ? 'cumple' : 'no-cumple';
    const juvClass = _cuotas.juventud_ok ? 'cumple' : 'no-cumple';
    const milClass = _cuotas.militancia_ok ? 'cumple' : 'no-cumple';

    const citaGen = window.configLoader?.buildCitaDual('cuotaGenero') || 'Art. 155 — 40% a 60%';
    const citaJuv = window.configLoader?.buildCitaDual('cuotaJuventud') || 'Art. 154 — mínimo 10%';
    const citaMil = window.configLoader?.buildCitaDual('militancia') || 'Según reglamento electoral';

    return `
      <div class="cuota-card ${genClass}" id="cuota-genero">
        <div class="cuota-icon">${_cuotas.genero_ok ? '&#10003;' : '&#10007;'}</div>
        <div class="cuota-label">Género</div>
        <div class="cuota-valor">${_cuotas.porcentaje_mujeres || 0}%</div>
        <div class="cuota-status">${_cuotas.genero_ok ? 'CUMPLE' : 'NO CUMPLE'}</div>
        <div class="cuota-base">${_cuotas.total_mujeres || 0}M / ${_cuotas.total_hombres || 0}H de ${_cuotas.total_miembros || 0}</div>
        <div class="cuota-base">${citaGen}</div>
      </div>
      <div class="cuota-card ${juvClass}" id="cuota-juventud">
        <div class="cuota-icon">${_cuotas.juventud_ok ? '&#10003;' : '&#10007;'}</div>
        <div class="cuota-label">Juventud</div>
        <div class="cuota-valor">${_cuotas.porcentaje_jovenes || 0}%</div>
        <div class="cuota-status">${_cuotas.juventud_ok ? 'CUMPLE' : 'NO CUMPLE'}</div>
        <div class="cuota-base">${_cuotas.total_jovenes || 0} jóvenes (18-35)</div>
        <div class="cuota-base">${citaJuv}</div>
      </div>
      <div class="cuota-card ${milClass}" id="cuota-militancia">
        <div class="cuota-icon">${_cuotas.militancia_ok ? '&#10003;' : '&#10007;'}</div>
        <div class="cuota-label">Militancia</div>
        <div class="cuota-valor">${_cuotas.militancia_ok ? '3+ años' : 'No verificado'}</div>
        <div class="cuota-status">${_cuotas.militancia_ok ? 'CUMPLE' : 'NO CUMPLE'}</div>
        <div class="cuota-base">${citaMil}</div>
      </div>
    `;
  }

  // ── Construir HTML de resultado ──
  function buildResultado(mecanismo, votosData) {
    if (mecanismo === 'CONSENSO') {
      return `
        <div class="resultado-box ratificacion">
          <div class="resultado-tipo">PLANCHA RATIFICADA POR CONSENSO</div>
          <p>En virtud de que la plancha fue propuesta sin oposición y ratificada por las partes interesadas,
          se declara ratificada la plancha inscrita con código <strong>${_plancha.codigo}</strong>.</p>
          <p>Total de miembros ratificados: <strong>${_cuotas.total_miembros || _miembros.length}</strong></p>
        </div>
      `;
    }

    // Elección con votación
    if (!votosData || votosData.length === 0) {
      return '<div class="resultado-box"><p>No se registraron resultados de votación para esta elección.</p></div>';
    }

    const v0 = votosData[0];
    const totalHabiles = v0.total_electores_habiles || 0;
    const emitidos = v0.votos_emitidos || 0;
    const blancos = v0.votos_blancos || 0;
    const nulos = v0.votos_nulos || 0;
    const validos = emitidos - blancos - nulos;
    const pctParticipacion = totalHabiles > 0 ? ((emitidos / totalHabiles) * 100).toFixed(1) : '0.0';

    // Ordenar por votos descendente
    const sorted = [...votosData].sort((a, b) => b.votos_obtenidos - a.votos_obtenidos);
    const maxVotos = sorted[0]?.votos_obtenidos || 0;
    const empate = sorted.length > 1 && sorted[0].votos_obtenidos === sorted[1].votos_obtenidos;

    let html = '<div class="resultado-box">';

    // Stats
    html += '<div class="resultado-stats">';
    html += '<div class="resultado-stat"><div class="stat-num">' + totalHabiles + '</div><div class="stat-label">Electores habilitados</div></div>';
    html += '<div class="resultado-stat"><div class="stat-num">' + emitidos + ' (' + pctParticipacion + '%)</div><div class="stat-label">Votos emitidos</div></div>';
    html += '<div class="resultado-stat"><div class="stat-num">' + blancos + '</div><div class="stat-label">Votos blancos</div></div>';
    html += '<div class="resultado-stat"><div class="stat-num">' + nulos + '</div><div class="stat-label">Votos nulos</div></div>';
    html += '</div>';

    // Tabla de resultados
    html += '<table class="acta-table">';
    html += '<thead><tr><th>#</th><th>Plancha</th><th>Votos</th><th>Porcentaje</th><th>Estado</th></tr></thead>';
    html += '<tbody>';
    sorted.forEach((v, i) => {
      const pct = validos > 0 ? ((v.votos_obtenidos / validos) * 100).toFixed(1) : '0.0';
      const esGanadora = v.votos_obtenidos === maxVotos && !empate;
      const rowClass = empate ? 'empate' : (esGanadora ? 'ganadora' : '');
      const estado = empate ? 'EMPATE' : (esGanadora ? 'GANADORA' : '');
      html += '<tr class="' + rowClass + '">';
      html += '<td>' + (i + 1) + '</td>';
      html += '<td>' + (v.plancha_nombre || v.plancha_id) + '</td>';
      html += '<td>' + v.votos_obtenidos + '</td>';
      html += '<td>' + pct + '%</td>';
      html += '<td>' + estado + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';

    // Declaración
    if (empate) {
      html += '<div class="resultado-box empate" style="margin-top:14px;border:none;padding:14px 0 0">';
      html += '<p><strong>Se produce EMPATE</strong> entre las planchas. El resultado será resuelto conforme a los estatutos del partido.</p>';
      html += '</div>';
    } else {
      const ganadora = sorted[0];
      const pctGanadora = validos > 0 ? ((ganadora.votos_obtenidos / validos) * 100).toFixed(1) : '0.0';
      html += '<p style="margin-top:14px"><strong>Se declara GANADORA</strong> la plancha con código <strong>' + (ganadora.plancha_codigo || _plancha.codigo) + '</strong> con el ' + pctGanadora + '% de los votos válidos.</p>';
    }

    html += '</div>';
    return html;
  }

  // ── Construir acta completa ──
  function buildHTML(mecanismo, votosData) {
    const alcance = _plancha.nivel === 'ZONA'
      ? 'Zona ' + (_plancha.zona_nombre || _plancha.zona || '')
      : _plancha.nivel === 'MUNICIPIO'
        ? 'Municipio ' + (_plancha.municipio || '')
        : typeof APP_CONFIG !== 'undefined' && APP_CONFIG ? APP_CONFIG.branding?.territorio || 'Provincia' : 'Provincia';

    const tituloNivel = _plancha.nivel === 'ZONA'
      ? (_plancha.zona_nombre || _plancha.zona || '') + ' · ' + (_plancha.municipio || '')
      : _plancha.nivel === 'MUNICIPIO'
        ? (_plancha.municipio || '')
        : typeof APP_CONFIG !== 'undefined' && APP_CONFIG ? APP_CONFIG.branding?.territorio || 'Provincia' : 'Provincia';

    const ahora = new Date();
    const fechaLarga = formatearFecha(ahora);

    // Actualizar encabezado
    document.getElementById('acta-tipo-eleccion').textContent = getMecanismos()[mecanismo]?.titulo || 'ACTA';
    document.getElementById('acta-meta-nivel').innerHTML = '<i class="fa-solid fa-location-dot"></i> ' + tituloNivel;
    document.getElementById('acta-meta-fecha').innerHTML = '<i class="fa-regular fa-calendar"></i> ' + fechaLarga;

    // Mecanismo
    document.getElementById('acta-mecanismo-box').innerHTML = buildMecanismo(mecanismo, alcance);

    // Planchas
    document.getElementById('acta-planchas-container').innerHTML = buildPlanchas();

    // Cuotas
    document.getElementById('acta-cuotas-grid').innerHTML = buildCuotas();

    // Resultado
    document.getElementById('acta-resultado-box').innerHTML = buildResultado(mecanismo, votosData);

    return document.getElementById('acta-printable').innerHTML;
  }

  // ── Abrir modal de firmantes ──
  function abrirModal(mecanismo, votosData) {
    if (!_plancha) { alert('Primero cargue una plancha'); return; }
    if (_plancha.estatus !== 'PROCLAMADA') {
      alert('Solo se pueden generar actas para planchas con estatus PROCLAMADA.\nEstatus actual: ' + _plancha.estatus);
      return;
    }

    _actaData = { mecanismo, votosData };

    // Pre-llenar presidente y secretario si existen en el padrón
    document.getElementById('acta-firm-pres-nombre').value = '';
    document.getElementById('acta-firm-pres-cedula').value = '';
    document.getElementById('acta-firm-sec-nombre').value = '';
    document.getElementById('acta-firm-sec-cedula').value = '';
    document.getElementById('acta-firm-test1-nombre').value = '';
    document.getElementById('acta-firm-test1-cedula').value = '';
    document.getElementById('acta-firm-test2-nombre').value = '';
    document.getElementById('acta-firm-test2-cedula').value = '';

    document.getElementById('acta-modal-overlay').classList.add('visible');
  }

  function cerrarModal() {
    document.getElementById('acta-modal-overlay').classList.remove('visible');
  }

  // ── Generar PDF ──
  async function generarPDF() {
    const firmantes = obtenerFirmantes();
    if (!firmantes) return;

    cerrarModal();
    _showToast('Generando acta...', 'info');

    try {
      // Construir HTML
      buildHTML(_actaData.mecanismo, _actaData.votosData);

      // Generar número de acta
      const { data: numData } = await _sb.rpc('fn_generar_numero_acta');
      const numeroActa = numData || 'ACTA-TEMP';

      // Actualizar sello
      const ahora = new Date();
      document.getElementById('acta-sello-numero').textContent = numeroActa;
      document.getElementById('acta-sello-fecha').textContent = 'Generada: ' + formatearFechaCorta(ahora);
      document.getElementById('acta-sello-usuario').textContent = 'Por: ' + (firmantes.presNombre || '—') + ' (' + (firmantes.presCedula || '—') + ')';
      document.getElementById('acta-meta-numero').innerHTML = '<i class="fa-solid fa-hashtag"></i> ' + numeroActa;

      // Renderizar a imagen con html2canvas
      const element = document.getElementById('acta-printable');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Crear PDF con jsPDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Descargar
      pdf.save(numeroActa + '.pdf');

      // Guardar en la DB
      const session = (await _sb.auth.getSession()).data.session;
      const user = session?.user;
      const jsonContenido = {
        mecanismo: _actaData.mecanismo,
        plancha: _plancha,
        miembros: _miembros,
        cuotas: _cuotas,
        votos: _actaData.votosData,
        firmantes: firmantes,
        numero_acta: numeroActa,
        generated_at: ahora.toISOString()
      };

      const { data: actaResult, error: actaErr } = await _sb.rpc('fn_registrar_acta', {
        p_mecanismo: _actaData.mecanismo,
        p_nivel: _plancha.nivel,
        p_zona: _plancha.zona_nombre || _plancha.zona || null,
        p_municipio: _plancha.municipio || null,
        p_plancha_id: _plancha.id,
        p_resultado_tipo: _actaData.mecanismo === 'CONSENSO' ? 'RATIFICACION' : 'VOTACION_GANADOR',
        p_ganadora_plancha_id: _plancha.id,
        p_json_contenido: jsonContenido,
        p_presidente_nombre: firmantes.presNombre,
        p_presidente_cedula: firmantes.presCedula,
        p_secretario_nombre: firmantes.secNombre,
        p_secretario_cedula: firmantes.secCedula,
        p_testigos_json: JSON.stringify(firmantes.testigos),
        p_generado_por_cedula: user?.user_metadata?.cedula || ''
      });

      if (actaErr) {
        console.warn('Error guardando acta:', actaErr);
      }

      _showToast('Acta generada: ' + numeroActa + '.pdf', 'success');

    } catch (err) {
      console.error('Error generando PDF:', err);
      _showToast('Error: ' + err.message, 'error');
    }
  }

  // ── Imprimir ──
  function imprimir() {
    if (!_plancha) return;
    const firmantes = obtenerFirmantes();
    if (!firmantes) return;

    cerrarModal();
    buildHTML(_actaData.mecanismo, _actaData.votosData);

    // Actualizar firmas en el template
    document.getElementById('firma-pres-nombre').textContent = 'Nombre: ' + (firmantes.presNombre || '____________________');
    document.getElementById('firma-pres-cedula').textContent = 'Cédula: ' + (firmantes.presCedula || '____________________');
    document.getElementById('firma-sec-nombre').textContent = 'Nombre: ' + (firmantes.secNombre || '____________________');
    document.getElementById('firma-sec-cedula').textContent = 'Cédula: ' + (firmantes.secCedula || '____________________');
    if (firmantes.testigos[0]) {
      document.getElementById('firma-test1-nombre').textContent = 'Nombre: ' + firmantes.testigos[0].nombre;
      document.getElementById('firma-test1-cedula').textContent = 'Cédula: ' + firmantes.testigos[0].cedula;
    }
    if (firmantes.testigos[1]) {
      document.getElementById('firma-test2-nombre').textContent = 'Nombre: ' + firmantes.testigos[1].nombre;
      document.getElementById('firma-test2-cedula').textContent = 'Cédula: ' + firmantes.testigos[1].cedula;
    }

    setTimeout(() => window.print(), 300);
  }

  // ── Obtener datos del formulario de firmantes ──
  function obtenerFirmantes() {
    const presNombre = document.getElementById('acta-firm-pres-nombre').value.trim();
    const presCedula = document.getElementById('acta-firm-pres-cedula').value.trim();
    const secNombre = document.getElementById('acta-firm-sec-nombre').value.trim();
    const secCedula = document.getElementById('acta-firm-sec-cedula').value.trim();

    if (!presNombre || !presCedula || !secNombre || !secCedula) {
      alert('Complete nombre y cédula del Presidente y Secretario');
      return null;
    }

    const testigos = [];
    const t1Nombre = document.getElementById('acta-firm-test1-nombre').value.trim();
    const t1Cedula = document.getElementById('acta-firm-test1-cedula').value.trim();
    if (t1Nombre && t1Cedula) {
      testigos.push({ nombre: t1Nombre, cedula: t1Cedula, verificado: false });
    }

    const t2Nombre = document.getElementById('acta-firm-test2-nombre').value.trim();
    const t2Cedula = document.getElementById('acta-firm-test2-cedula').value.trim();
    if (t2Nombre && t2Cedula) {
      testigos.push({ nombre: t2Nombre, cedula: t2Cedula, verificado: false });
    }

    return { presNombre, presCedula, secNombre, secCedula, testigos };
  }

  // ── Toast ──
  function _showToast(msg, tipo) {
    const el = document.getElementById('acta-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'acta-toast show ' + (tipo || '');
    setTimeout(() => el.classList.remove('show'), 4000);
  }

  // ── Verificar si ya existe acta para una plancha ──
  async function verificarActaExistente(planchaId) {
    const { data } = await _sb
      .from('actas_generadas')
      .select('numero_acta, generated_at')
      .eq('plancha_id', planchaId)
      .maybeSingle();
    return data;
  }

  // ── API pública ──
  return {
    init,
    cargarPlancha,
    cargarVotos,
    buildHTML,
    abrirModal,
    cerrarModal,
    generarPDF,
    imprimir,
    verificarActaExistente,
    get plancha() { return _plancha; },
    get miembros() { return _miembros; },
    get cuotas() { return _cuotas; }
  };
})();

// Exponer globalmente
window.actaGenerator = actaGenerator;
