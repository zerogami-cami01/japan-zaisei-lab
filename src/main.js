// 令和5年度 地方自治体決算ターミナル - Main Application
// (グローバルスクリプト版 — ES module非使用)

// State
let allMunicipalities = [...MUNICIPALITIES]; // mutable: 読み込み後に追加される
let currentPref = null;
let searchQuery = '';
let viewMode = 'grid'; // grid | compact | list
let chartsInitialized = {};

// DOM refs
const searchInput = document.getElementById('searchInput');
const searchCount = document.getElementById('searchCount');
const filterbar = document.getElementById('filterbar');
const searchbar = document.getElementById('searchbar');
const backbar = document.getElementById('backbar');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initFilterBar();
  initSearch();
  initViewBtns();
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
  initImportModal();
  // Simulate loading
  setTimeout(() => {
    showPanel('browse');
    renderBrowse();
  }, 600);
});

// ===== ROUTING =====
function handleRoute() {
  const hash = window.location.hash || '#/';
  if (hash.startsWith('#/detail')) {
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const id = params.get('id');
    if (id) {
      showDetailView(id);
      return;
    }
  }
  showBrowseView();
}

function showBrowseView() {
  searchbar.style.display = 'flex';
  backbar.classList.remove('visible');
  filterbar.style.display = 'flex';
  document.getElementById('main').style.paddingTop =
    `calc(var(--topbar-height) + var(--searchbar-height) + 40px)`;
  showPanel('browse');
  renderBrowse();
}

function showDetailView(id) {
  searchbar.style.display = 'none';
  backbar.classList.add('visible');
  filterbar.style.display = 'none';
  document.getElementById('main').style.paddingTop =
    `calc(var(--topbar-height) + var(--searchbar-height))`;
  const item = allMunicipalities.find(m => m.id === id);
  if (!item) {
    showPanel('empty');
    return;
  }
  showPanel('detail');
  renderDetail(item);
}

function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`panel-${name}`);
  if (panel) panel.classList.add('active');
}

// ===== NAVIGATION =====
window.navigateDetail = function(id) {
  window.location.hash = `#/detail?id=${id}`;
};

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.hash = '#/';
});

// ===== SEARCH =====
function initSearch() {
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    renderBrowse();
  });
}

function getFilteredList() {
  return allMunicipalities.filter(item => {
    const matchPref = !currentPref || item.pref === currentPref;
    const q = searchQuery.toLowerCase();
    const matchQuery = !q ||
      item.name.includes(searchQuery) ||
      item.pref.includes(searchQuery) ||
      item.id.includes(searchQuery) ||
      item.type.includes(searchQuery);
    return matchPref && matchQuery;
  });
}

// ===== FILTER BAR =====
function initFilterBar() {
  const label = document.createElement('span');
  label.className = 'filter-label';
  label.textContent = '都道府県:';
  filterbar.appendChild(label);

  const allBtn = document.createElement('button');
  allBtn.className = 'pref-filter active';
  allBtn.textContent = '全て';
  allBtn.dataset.pref = '';
  allBtn.addEventListener('click', () => setPrefFilter(null, allBtn));
  filterbar.appendChild(allBtn);

  // Only show prefs that have data
  const dataPrefs = [...new Set(allMunicipalities.map(m => m.pref))];
  dataPrefs.forEach(pref => {
    const btn = document.createElement('button');
    btn.className = 'pref-filter';
    btn.textContent = pref;
    btn.dataset.pref = pref;
    btn.addEventListener('click', () => setPrefFilter(pref, btn));
    filterbar.appendChild(btn);
  });
}

function rebuildFilterBar() {
  filterbar.innerHTML = '';
  initFilterBar();
}

function setPrefFilter(pref, btn) {
  currentPref = pref;
  document.querySelectorAll('.pref-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderBrowse();
}

// ===== VIEW BUTTONS =====
function initViewBtns() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view;
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const grid = document.getElementById('entityGrid');
      if (grid) {
        grid.className = `entity-grid ${viewMode !== 'grid' ? viewMode : ''}`;
      }
    });
  });
}

// ===== BROWSE =====
function renderBrowse() {
  const list = getFilteredList();
  searchCount.textContent = `${list.length}件`;
  const grid = document.getElementById('entityGrid');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;font-family:var(--font-mono);color:var(--text-muted)">
      検索結果なし — "${searchQuery}"
    </div>`;
    return;
  }

  grid.innerHTML = list.map(renderEntityCard).join('');
}

// ===== DETAIL =====
function renderDetail(item) {
  const container = document.getElementById('panel-detail');

  // Calculate derived values
  const r4SainyuDiff = item.sainyuGokei - item.r4_sainyuGokei;
  const r4SaishutsuDiff = item.saishutsuGokei - item.r4_saishutsuGokei;
  const jisshitsuShushi = item.sainyuGokei - item.saishutsuGokei;

  const html = `
    ${renderDetailHeader(item)}

    <div class="section-title">歳入歳出概要</div>
    ${renderKpiGroup('主要指標', [
      renderKpiCard({
        label: '歳入総額',
        value: formatManyen(item.sainyuGokei),
        valueClass: 'large orange',
        r4Value: item.r4_sainyuGokei,
      }),
      renderKpiCard({
        label: '歳出総額',
        value: formatManyen(item.saishutsuGokei),
        valueClass: 'large',
        r4Value: item.r4_saishutsuGokei,
      }),
      renderKpiCard({
        label: '実質収支',
        value: formatManyen(jisshitsuShushi),
        valueClass: jisshitsuShushi >= 0 ? 'green' : 'red',
      }),
      renderKpiCard({
        label: '財政力指数',
        value: item.zaiseiRyoku.toFixed(2),
        valueClass: item.zaiseiRyoku >= 1.0 ? 'green' : item.zaiseiRyoku >= 0.7 ? '' : 'red',
      }),
    ])}

    <div class="section-title">財政指標</div>
    ${renderZaiseiShihyoTable(item)}

    <div class="section-title">歳入内訳</div>
    ${renderSainyuTable(item)}

    <div class="section-title">市町村税（税目別）</div>
    ${renderZeiTable(item)}

    <div class="section-title">歳出（目的別）</div>
    ${renderMokutekiTable(item)}

    <div class="section-title">チャート</div>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">歳入構成</div>
        <div class="chart-container" id="chart-sainyu"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">歳出（目的別）構成</div>
        <div class="chart-container" id="chart-mokuteki"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">歳出（性質別）構成</div>
        <div class="chart-container" id="chart-seishitsu"></div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Render charts after DOM update
  requestAnimationFrame(() => renderCharts(item));
}

// ===== CHARTS (ECharts) =====
function renderCharts(item) {
  const orange = '#ff6600';
  const cyan = '#00ccff';
  const green = '#00ff88';
  const yellow = '#ffcc00';
  const purple = '#aa44ff';
  const red = '#ff3366';
  const colors = [orange, cyan, green, yellow, purple, red, '#ff8844', '#44aaff', '#88ff44'];

  const baseOpts = {
    backgroundColor: 'transparent',
    textStyle: { color: '#888888', fontFamily: "'Share Tech Mono', monospace", fontSize: 10 },
    tooltip: {
      backgroundColor: '#1a1a1a',
      borderColor: '#333',
      textStyle: { color: '#e0e0e0', fontSize: 11 }
    }
  };

  // 歳入 pie
  const sainyuEl = document.getElementById('chart-sainyu');
  if (sainyuEl && window.echarts) {
    const sainyuChart = echarts.init(sainyuEl, null, { renderer: 'canvas' });
    const sainyuData = [
      { name: '地方税', value: item.chihoZei },
      { name: '地方交付税', value: item.chihoKofuzei },
      { name: '国庫支出金', value: item.kokkoShishutsukin },
      { name: '地方債', value: item.chisaiSai },
      { name: 'その他', value: item.sonota },
    ];
    sainyuChart.setOption({
      ...baseOpts,
      color: colors,
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        data: sainyuData,
        label: { fontSize: 10, color: '#888' },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(255,102,0,0.5)' } }
      }]
    });
  }

  // 歳出目的別 pie
  const mokutekiEl = document.getElementById('chart-mokuteki');
  if (mokutekiEl && window.echarts) {
    const mc = echarts.init(mokutekiEl, null, { renderer: 'canvas' });
    const mokData = [
      { name: '民生費', value: item.saishuByMokuteki.minsei },
      { name: '衛生費', value: item.saishuByMokuteki.eisei },
      { name: '土木費', value: item.saishuByMokuteki.doboku },
      { name: '教育費', value: item.saishuByMokuteki.kyouiku },
      { name: '消防費', value: item.saishuByMokuteki.shobo },
      { name: '総務費', value: item.saishuByMokuteki.somu },
      { name: 'その他', value: item.saishuByMokuteki.nougyo + item.saishuByMokuteki.shoukou + item.saishuByMokuteki.sonota },
    ];
    mc.setOption({
      ...baseOpts,
      color: colors,
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        data: mokData,
        label: { fontSize: 10, color: '#888' },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,204,255,0.5)' } }
      }]
    });
  }

  // 歳出性質別 bar
  const seishitsuEl = document.getElementById('chart-seishitsu');
  if (seishitsuEl && window.echarts) {
    const sc = echarts.init(seishitsuEl, null, { renderer: 'canvas' });
    const labels = ['人件費', '物件費', '移転的支出', '公債費', '補助費', 'その他'];
    const values = [
      item.saishuBySeishitsu.jinken,
      item.saishuBySeishitsu.bukken,
      item.saishuBySeishitsu.iten,
      item.saishuBySeishitsu.kokkosai,
      item.saishuBySeishitsu.hojo,
      item.saishuBySeishitsu.sonota,
    ];
    sc.setOption({
      ...baseOpts,
      color: [cyan],
      grid: { top: 10, bottom: 50, left: 60, right: 10 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#555', fontSize: 9, formatter: v => formatManyen(v) },
        splitLine: { lineStyle: { color: '#1e1e1e' } }
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#888', fontSize: 10 }
      },
      series: [{
        type: 'bar',
        data: values,
        barMaxWidth: 20,
        itemStyle: { color: cyan, borderRadius: [0, 2, 2, 0] }
      }]
    });
  }
}

// ===== IMPORT MODAL =====
function initImportModal() {
  const modal   = document.getElementById('importModal');
  const openBtn = document.getElementById('importBtn');
  const closeBtn = document.getElementById('importClose');
  const runBtn  = document.getElementById('importRun');
  const status  = document.getElementById('importStatus');
  const logEl   = document.getElementById('importLog');

  // ファイル選択のラベル更新
  ['gaikyo', 'sainyu', 'mokuteki', 'seishitsu'].forEach(key => {
    const input = document.getElementById(`file-${key}`);
    const nameEl = document.getElementById(`name-${key}`);
    input.addEventListener('change', () => {
      nameEl.textContent = input.files.length
        ? [...input.files].map(f => f.name).join(', ')
        : '未選択';
    });
  });

  openBtn.addEventListener('click', () => { modal.hidden = false; });
  closeBtn.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

  runBtn.addEventListener('click', async () => {
    const gaikyoFiles    = [...(document.getElementById('file-gaikyo').files    || [])];
    const sainyuFiles    = [...(document.getElementById('file-sainyu').files    || [])];
    const mokutekiFiles  = [...(document.getElementById('file-mokuteki').files  || [])];
    const seishitsuFiles = [...(document.getElementById('file-seishitsu').files || [])];

    if (!gaikyoFiles.length) {
      status.textContent = '⚠ (1)概況 ファイルは必須です';
      status.style.color = 'var(--accent-red)';
      return;
    }

    const unit = document.querySelector('input[name="unit"]:checked').value;
    const existingIds = new Set(allMunicipalities.map(m => m.id));

    runBtn.disabled = true;
    status.textContent = '処理中...';
    status.style.color = 'var(--text-secondary)';
    logEl.hidden = false;
    logEl.textContent = '';

    try {
      const { municipalities, log } = await importFromExcel(
        { gaikyo: gaikyoFiles, sainyu: sainyuFiles, mokuteki: mokutekiFiles, seishitsu: seishitsuFiles },
        unit,
        existingIds
      );

      logEl.textContent = log.join('\n');

      if (municipalities.length === 0) {
        status.textContent = '⚠ データなし — ログを確認してください';
        status.style.color = 'var(--accent-yellow)';
        logEl.hidden = false;
      } else {
        // Upsert: 既存IDは上書き、新規は追加
        const importedMap = new Map(municipalities.map(m => [m.id, m]));
        let updatedCount = 0;
        allMunicipalities = allMunicipalities.map(m => {
          if (importedMap.has(m.id)) {
            updatedCount++;
            const updated = importedMap.get(m.id);
            importedMap.delete(m.id);
            return updated;
          }
          return m;
        });
        const newOnes = [...importedMap.values()];
        allMunicipalities.push(...newOnes);

        currentPref = null;
        rebuildFilterBar();
        renderBrowse();

        const parts = [];
        if (newOnes.length) parts.push(`新規 ${newOnes.length} 団体`);
        if (updatedCount) parts.push(`更新 ${updatedCount} 団体`);
        status.textContent = `✅ ${parts.join('、')}（合計 ${allMunicipalities.length} 団体）`;
        status.style.color = 'var(--accent-green)';
      }
    } catch (err) {
      logEl.hidden = false;
      logEl.textContent += '\n\n' + String(err) + '\n' + (err.stack || '');
      status.textContent = '❌ エラーが発生しました';
      status.style.color = 'var(--accent-red)';
      console.error(err);
    } finally {
      runBtn.disabled = false;
    }
  });
}
