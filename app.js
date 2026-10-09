(() => {
  const numberFormat = new Intl.NumberFormat('es-MX');
  const monthOrder = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 };
  const accents = [
    ['#3868e8', '#edf2ff'], ['#1da99a', '#e8f8f5'], ['#8a65cc', '#f2edfc'],
    ['#d28a35', '#fff4e5'], ['#4f91c8', '#eaf5fc'], ['#c6688c', '#fff0f5']
  ];
  const el = (id) => document.getElementById(id);
  let data = null;

  const fmt = (n) => numberFormat.format(n || 0);
  const pct = (n, total) => total ? `${(n / total * 100).toLocaleString('es-MX', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : '0.0%';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const monthKey = (m) => monthOrder[(m || '').toUpperCase()] || 99;
  const compareMonth = (a, b) => monthKey(a) - monthKey(b) || String(a).localeCompare(String(b), 'es');
  const regionLabel = (value) => value === '#N/A' ? 'Sin clasificar (#N/A)' : value;
  const sum = (rows) => rows.reduce((acc, row) => acc + Number(row.conteo || 0), 0);

  function makeOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function setupFilters() {
    const regions = [...new Set(data.regiones || [])].sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
    const determinants = [...new Set(data.determinantes || [])].sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
    const months = [...new Set((data.registrosAgregados || []).map((r) => r.mes))].sort(compareMonth);
    regions.forEach((value) => makeOption(el('regionFilter'), value, regionLabel(value)));
    determinants.forEach((value) => makeOption(el('determinantFilter'), value, value === 'Sin dato' ? 'Sin dato' : value));
    months.forEach((value) => makeOption(el('monthFilter'), value, titleCase(value)));
    ['regionFilter', 'determinantFilter', 'monthFilter'].forEach((id) => el(id).addEventListener('change', renderSelection));
    el('resetFilters').addEventListener('click', () => {
      el('regionFilter').value = '';
      el('determinantFilter').value = '';
      el('monthFilter').value = '';
      renderSelection();
    });
    el('exportCsv').addEventListener('click', exportSummaryCsv);
  }

  function titleCase(s) {
    const value = String(s || '').toLocaleLowerCase('es-MX');
    return value ? value.charAt(0).toLocaleUpperCase('es-MX') + value.slice(1) : 'Sin dato';
  }

  function renderGlobalKpis() {
    const total = Number(data.meta?.totalRegistros || 0);
    el('globalTotal').textContent = fmt(total);
    el('sourceCountLabel').textContent = `${(data.fuentes || []).length} archivos de origen`;
    const sourceTotals = data.fuentes || [];
    el('monthKpis').innerHTML = sourceTotals.map((source, i) => {
      const [accent, soft] = accents[i % accents.length];
      return `<article class="month-card" style="--card-accent:${accent};--card-soft:${soft}">
        <div class="month-card-top"><span class="month-name">${esc(titleCase(source.mes))}</span><span class="month-glyph" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span></div>
        <div class="month-count">${fmt(source.conteo)}</div>
        <span class="month-file" title="${esc(source.archivo)}">${esc(source.archivo)}</span>
        <div class="month-foot"><span>Registros</span><span class="month-share">${pct(source.conteo, total)} del total</span></div>
      </article>`;
    }).join('');

    const validation = el('validationBadge');
    if (data.meta?.validacionDisponible && data.meta?.validacionCoincide) {
      validation.classList.remove('warning');
      validation.innerHTML = '<span class="status-dot"></span>Fuente validada';
      el('dataValidation').textContent = 'Conteos por archivo coinciden con Hoja1';
    } else {
      validation.classList.add('warning');
      validation.innerHTML = '<span class="status-dot"></span>Validación pendiente';
      el('dataValidation').textContent = 'Revisar comparación con Hoja1';
    }
  }

  function selectedFilters() {
    return {
      region: el('regionFilter').value,
      determinant: el('determinantFilter').value,
      month: el('monthFilter').value
    };
  }

  function filterRows(filters) {
    return (data.registrosAgregados || []).filter((row) =>
      (!filters.region || row.region === filters.region) &&
      (!filters.determinant || row.determinante === filters.determinant) &&
      (!filters.month || row.mes === filters.month)
    );
  }

  function renderFilterChips(filters) {
    const chips = [];
    if (filters.region) chips.push(`Región: ${regionLabel(filters.region)}`);
    if (filters.determinant) chips.push(`Determinante: ${filters.determinant}`);
    if (filters.month) chips.push(`Mes: ${titleCase(filters.month)}`);
    el('activeFilters').innerHTML = chips.length
      ? chips.map((chip) => `<span class="filter-chip active">${esc(chip)}</span>`).join('')
      : '<span class="filter-chip">Vista general · Sin filtros</span>';
    el('filterState').textContent = chips.length ? `${chips.length} filtro${chips.length === 1 ? '' : 's'} activo${chips.length === 1 ? '' : 's'}` : 'Vista general';
  }

  function aggregateReasons(rows) {
    const counts = new Map();
    rows.forEach((row) => counts.set(row.razon, (counts.get(row.razon) || 0) + Number(row.conteo || 0)));
    return (data.razones || []).map((reason) => ({ razon: reason, conteo: counts.get(reason) || 0 }))
      .sort((a, b) => b.conteo - a.conteo || a.razon.localeCompare(b.razon, 'es'));
  }

  function renderChart(reasonCounts, total) {
    const positive = reasonCounts.filter((x) => x.conteo > 0).slice(0, 8);
    if (!positive.length) {
      el('reasonChart').innerHTML = '<div class="chart-empty">No hay registros para la combinación de filtros seleccionada.</div>';
      return;
    }
    const max = Math.max(...positive.map((x) => x.conteo), 1);
    el('reasonChart').innerHTML = positive.map((item) => {
      const width = Math.min(100, item.conteo / max * 100);
      return `<div class="bar-row"><div class="bar-label" title="${esc(item.razon)}">${esc(item.razon)}</div><div class="bar-track" role="img" aria-label="${esc(item.razon)}: ${fmt(item.conteo)}"><div class="bar-fill" style="width:${width}%"></div></div><div class="bar-value">${fmt(item.conteo)}</div></div>`;
    }).join('');
  }

  function renderReasonKpis(reasonCounts, total) {
    el('reasonCountLabel').textContent = `${reasonCounts.length} categorías`;
    el('reasonKpis').innerHTML = reasonCounts.map((item, index) => {
      const count = item.conteo;
      const share = total ? (count / total * 100) : 0;
      const initial = item.razon.trim().slice(0, 1).toLocaleUpperCase('es-MX') || '—';
      return `<article class="reason-card ${count ? '' : 'zero'}">
        <div class="reason-card-top"><span class="reason-symbol" aria-hidden="true">${esc(initial)}</span><span class="reason-value">${fmt(count)}</span></div>
        <div class="reason-name">${esc(item.razon)}</div>
        <div class="reason-card-bottom"><span>Del total seleccionado</span><span class="reason-share">${pct(count, total)}</span></div>
        <div class="reason-mini-track" aria-hidden="true"><span style="width:${Math.min(100, share)}%"></span></div>
      </article>`;
    }).join('');
  }

  function renderInsight(reasonCounts, total) {
    const leading = reasonCounts.find((r) => r.conteo > 0);
    if (!leading || !total) {
      el('insightTitle').textContent = 'Sin resultados en esta vista';
      el('insightText').textContent = 'Prueba con otra combinación de filtros o vuelve a la vista general para recuperar todos los registros.';
      el('leadingReason').textContent = '—';
      el('leadingShare').textContent = '0.0%';
      return;
    }
    el('insightTitle').textContent = 'El motivo más frecuente';
    el('insightText').textContent = `“${leading.razon}” concentra la mayor cantidad de rechazos de la selección actual. Usa los filtros para comparar el comportamiento entre regiones, determinantes y meses.`;
    el('leadingReason').textContent = leading.razon;
    el('leadingShare').textContent = pct(leading.conteo, total);
  }

  function renderSelection() {
    const filters = selectedFilters();
    const rows = filterRows(filters);
    const total = sum(rows);
    const reasonCounts = aggregateReasons(rows);
    el('filteredTotal').textContent = fmt(total);
    renderFilterChips(filters);
    renderChart(reasonCounts, total);
    renderReasonKpis(reasonCounts, total);
    renderInsight(reasonCounts, total);
  }

  function exportSummaryCsv() {
    const filters = selectedFilters();
    const rows = filterRows(filters);
    const total = sum(rows);
    const reasons = aggregateReasons(rows).filter((r) => r.conteo > 0);
    const lines = [
      ['RAZÓN AGRUPADA', 'CONTEO', 'PORCENTAJE DEL TOTAL'].join(','),
      ...reasons.map((r) => [csvEscape(r.razon), r.conteo, csvEscape(total ? (r.conteo / total * 100).toFixed(2).replace('.', ',') + '%' : '0,00%')].join(',')),
      [csvEscape('TOTAL SELECCIONADO'), total, '100%'].join(',')
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resumen-rechazos-filtrado.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvEscape(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  async function init() {
    try {
      const response = await fetch('./data.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
      if (!data || !Array.isArray(data.registrosAgregados)) throw new Error('Formato de datos no válido');
      setupFilters();
      renderGlobalKpis();
      renderSelection();
    } catch (error) {
      console.error('Error al cargar data.json:', error);
      el('monthKpis').innerHTML = '';
      el('errorPanel').hidden = false;
      el('validationBadge').classList.add('warning');
      el('validationBadge').innerHTML = '<span class="status-dot"></span>Error de datos';
    }
  }

  init();
})();
