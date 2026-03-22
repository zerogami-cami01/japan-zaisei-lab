// UI Components for 令和5年度 地方自治体決算ターミナル

/** helper: null-safe percent string */
function fmtPct(v) {
  return (v === null || v === undefined) ? '―' : v.toFixed(1) + '%';
}

/** KPI Card */
function renderKpiCard({ label, value, valueClass = '', r4Value = null, unit = '' }) {
  let deltaHtml = '';
  if (r4Value !== null && r4Value !== undefined) {
    const diff = value - r4Value;
    const pct = r4Value !== 0 ? (diff / Math.abs(r4Value)) * 100 : 0;
    const cls = diff > 0 ? 'delta-up' : diff < 0 ? 'delta-down' : 'delta-flat';
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '―';
    deltaHtml = `<div class="kpi-delta">
      <span class="${cls}">${arrow} ${Math.abs(pct).toFixed(1)}%</span>
      <span style="color:var(--text-muted)">前年比</span>
    </div>`;
  }
  return `<div class="kpi-card">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value ${valueClass}">${value}${unit}</div>
    ${deltaHtml}
  </div>`;
}

/** KPI Group */
function renderKpiGroup(title, cards) {
  return `<div class="kpi-group">
    <div class="kpi-group-title">${title}</div>
    <div class="kpi-cards">${cards.join('')}</div>
  </div>`;
}

/** Entity Card for browse */
function renderEntityCard(item) {
  const r4Base = item.r4_sainyuGokei || 0;
  const r4Diff = (item.sainyuGokei || 0) - r4Base;
  const r4DiffPct = r4Base !== 0 ? ((r4Diff / r4Base) * 100).toFixed(1) : '0.0';
  const diffClass = r4Diff >= 0 ? 'positive' : 'negative';
  const diffArrow = r4Diff >= 0 ? '▲' : '▼';
  const zaiseiW = item.zaiseiRyoku != null ? Math.min(100, Math.max(0, item.zaiseiRyoku * 60)) : 0;

  return `<div class="entity-card" data-id="${item.id}" onclick="navigateDetail('${item.id}')">
    <div class="card-header">
      <div class="card-name">${item.name}</div>
      <div class="card-type-badge">${item.type}</div>
    </div>
    <div class="card-pref">${item.pref}</div>
    <div class="card-stats">
      <div class="card-stat">
        <div class="stat-label">歳入総額</div>
        <div class="stat-value">${formatManyen(item.sainyuGokei)}</div>
      </div>
      <div class="card-stat">
        <div class="stat-label">歳出総額</div>
        <div class="stat-value">${formatManyen(item.saishutsuGokei)}</div>
      </div>
      <div class="card-stat">
        <div class="stat-label">人口</div>
        <div class="stat-value">${formatNumber(item.jinkou)}人</div>
      </div>
      <div class="card-stat">
        <div class="stat-label">前年比</div>
        <div class="stat-value ${diffClass}">${diffArrow}${Math.abs(r4DiffPct)}%</div>
      </div>
    </div>
    <div class="card-zaisei-bar">
      <div class="card-zaisei-fill" style="width:${zaiseiW}%"></div>
    </div>
  </div>`;
}

/** Detail Header */
function renderDetailHeader(item) {
  const mensekiStr = item.menseki != null ? item.menseki.toLocaleString('ja-JP') + 'km²' : '―';
  return `<div class="detail-header">
    <div class="detail-trail">決算ターミナル / ${item.pref} / ${item.name}</div>
    <div class="detail-title">${item.name}</div>
    <div class="detail-meta">
      <div class="detail-meta-item">
        <span>都道府県:</span>
        <span class="detail-meta-value">${item.pref}</span>
      </div>
      <div class="detail-meta-item">
        <span>区分:</span>
        <span class="detail-meta-value">${item.type}</span>
      </div>
      <div class="detail-meta-item">
        <span>人口:</span>
        <span class="detail-meta-value">${formatNumber(item.jinkou)}人</span>
      </div>
      <div class="detail-meta-item">
        <span>面積:</span>
        <span class="detail-meta-value">${mensekiStr}</span>
      </div>
      <div class="detail-meta-item">
        <span>団体コード:</span>
        <span class="detail-meta-value">${item.id}</span>
      </div>
    </div>
  </div>`;
}

/** 人口・産業構造 */
function renderJinkouSangyo(item) {
  if (!item.jinkou) return '';

  const rows = [];

  rows.push(`<tr><td>住民基本台帳人口</td><td class="num">${formatNumber(item.jinkou)}人</td><td></td></tr>`);
  if (item.jinkouNipponji != null)
    rows.push(`<tr><td>　うち日本人</td><td class="num">${formatNumber(item.jinkouNipponji)}人</td><td></td></tr>`);
  if (item.jinkouKokusei != null)
    rows.push(`<tr><td>国勢調査人口</td><td class="num">${formatNumber(item.jinkouKokusei)}人</td><td></td></tr>`);

  if (item.sangyo1 != null || item.sangyo2 != null || item.sangyo3 != null) {
    rows.push(`<tr><td colspan="3" style="padding-top:8px;color:var(--text-muted);font-size:10px">産業別就業者構成比</td></tr>`);
    if (item.sangyo1 != null) rows.push(`<tr><td>第1次産業</td><td class="num">${fmtPct(item.sangyo1)}</td><td style="width:100px"><div class="indicator-bar"><div class="indicator-fill fill-good" style="width:${Math.min(100,item.sangyo1)}%"></div></div></td></tr>`);
    if (item.sangyo2 != null) rows.push(`<tr><td>第2次産業</td><td class="num">${fmtPct(item.sangyo2)}</td><td style="width:100px"><div class="indicator-bar"><div class="indicator-fill fill-warn" style="width:${Math.min(100,item.sangyo2)}%"></div></div></td></tr>`);
    if (item.sangyo3 != null) rows.push(`<tr><td>第3次産業</td><td class="num">${fmtPct(item.sangyo3)}</td><td style="width:100px"><div class="indicator-bar"><div class="indicator-fill fill-bad" style="width:${Math.min(100,item.sangyo3)}%"></div></div></td></tr>`);
  }

  if (!rows.length) return '';

  return `<table class="data-table">
    <thead><tr><th>項目</th><th style="text-align:right">数値</th><th>内訳</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

/** 収支状況セクション */
function renderShushiSection(item) {
  const rows = [
    { label: '歳入歳出差引額 (A)',   value: item.sainyuSaishutsuSa,   note: '' },
    { label: '翌年度繰越財源 (B)',    value: item.yokunen,             note: '' },
    { label: '実質収支 (C=A-B)',      value: item.jisshitsuShushiGaku, note: '黒字が望ましい' },
    { label: '単年度収支 (F)',        value: item.tannenDo,            note: '' },
    { label: '積立金 (G)',            value: item.tsumitateKin,        note: '' },
    { label: '繰上償還金 (H)',        value: item.kuriageShokkan,      note: '' },
    { label: '積立金取崩し (I)',      value: item.tsumitateTorikuzushi,note: '' },
    { label: '実質単年度収支 (F+G+H-I)', value: item.jisshitsuTannen, note: '赤字継続は要注意' },
  ].filter(r => r.value != null);

  if (!rows.length) return '';

  const tableRows = rows.map(r => {
    const cls = r.value >= 0 ? 'positive' : 'negative';
    return `<tr>
      <td>${r.label}</td>
      <td class="num ${cls}">${formatManyen(r.value)}</td>
      <td style="font-size:10px;color:var(--text-muted)">${r.note}</td>
    </tr>`;
  }).join('');

  return `<table class="data-table">
    <thead><tr><th>収支項目</th><th style="text-align:right">金額</th><th>参考</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>`;
}

/** Expenditure by purpose table */
function renderMokutekiTable(item) {
  const data = [
    { label: '民生費', value: item.saishuByMokuteki.minsei },
    { label: '衛生費', value: item.saishuByMokuteki.eisei },
    { label: '土木費', value: item.saishuByMokuteki.doboku },
    { label: '教育費', value: item.saishuByMokuteki.kyouiku },
    { label: '消防費', value: item.saishuByMokuteki.shobo },
    { label: '総務費', value: item.saishuByMokuteki.somu },
    { label: '農業費', value: item.saishuByMokuteki.nougyo },
    { label: '商工費', value: item.saishuByMokuteki.shoukou },
    { label: 'その他', value: item.saishuByMokuteki.sonota },
  ];
  const total = Object.values(item.saishuByMokuteki).reduce((a,b)=>a+b,0);

  const rows = data.map(d => {
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
    const barW = Math.max(0, parseFloat(pct));
    return `<tr>
      <td>${d.label}</td>
      <td class="num">${formatManyen(d.value)}</td>
      <td class="num">${pct}%</td>
      <td style="width:100px">
        <div class="indicator-bar"><div class="indicator-fill fill-good" style="width:${barW}%"></div></div>
      </td>
    </tr>`;
  }).join('');

  return `<table class="data-table">
    <thead><tr>
      <th>目的別</th>
      <th style="text-align:right">金額</th>
      <th style="text-align:right">構成比</th>
      <th>内訳</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Expenditure by nature table */
function renderSeishitsuTable(item) {
  const se = item.saishuBySeishitsu;
  const data = [
    { label: '人件費',         value: se.jinken },
    { label: '物件費',         value: se.bukken },
    { label: '扶助費',         value: se.iten },
    { label: '公債費',         value: se.kokkosai },
    { label: '補助費等',       value: se.hojo },
    { label: '維持補修費',     value: se.ijiHoshu },
    { label: '繰出金',         value: se.kuridashi },
    { label: '普通建設事業費', value: se.fututsuKen },
    { label: '災害復旧事業費', value: se.saigaiKen },
    { label: '積立金',         value: se.tsumitate },
    { label: 'その他',         value: se.sonota },
  ].filter(d => d.value > 0);

  const total = data.reduce((a,b) => a + b.value, 0);

  const rows = data.map(d => {
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
    const barW = Math.max(0, parseFloat(pct));
    return `<tr>
      <td>${d.label}</td>
      <td class="num">${formatManyen(d.value)}</td>
      <td class="num">${pct}%</td>
      <td style="width:100px">
        <div class="indicator-bar"><div class="indicator-fill fill-good" style="width:${barW}%"></div></div>
      </td>
    </tr>`;
  }).join('');

  return `<table class="data-table">
    <thead><tr>
      <th>性質別</th>
      <th style="text-align:right">金額</th>
      <th style="text-align:right">構成比</th>
      <th>内訳</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Financial indicators table (expanded) */
function renderZaiseiShihyoTable(item) {
  const zr = item.zaiseiRyoku ?? 0;
  const gi = item.ginsokuHi ?? 0;
  const ki = item.jisshitsuKosaiHi ?? 0;
  const rn = item.rainenDoHi ?? 0;

  const indicators = [
    {
      label: '財政力指数',
      value: zr.toFixed(2),
      note: '1.0以上が自立度高',
      barW: Math.min(100, zr * 80),
      fillClass: zr >= 1.0 ? 'fill-good' : zr >= 0.7 ? 'fill-warn' : 'fill-bad'
    },
    {
      label: '経常収支比率',
      value: fmtPct(item.ginsokuHi),
      note: '75〜80%が理想、90%超は硬直',
      barW: Math.min(100, gi),
      fillClass: gi <= 80 ? 'fill-good' : gi <= 90 ? 'fill-warn' : 'fill-bad'
    },
    {
      label: '実質公債費比率',
      value: fmtPct(item.jisshitsuKosaiHi),
      note: '18%未満が目安',
      barW: Math.min(100, ki * 4),
      fillClass: ki < 12 ? 'fill-good' : ki < 18 ? 'fill-warn' : 'fill-bad'
    },
    {
      label: '実質収支比率',
      value: fmtPct(item.jisshitsuShushiHi),
      note: '黒字が望ましい',
      barW: Math.min(100, Math.max(0, (item.jisshitsuShushiHi ?? 0) * 10)),
      fillClass: (item.jisshitsuShushiHi ?? 0) >= 0 ? 'fill-good' : 'fill-bad'
    },
    {
      label: '公債費負担比率',
      value: fmtPct(item.kosaiHiHi),
      note: '15%以下が目安',
      barW: Math.min(100, (item.kosaiHiHi ?? 0) * 5),
      fillClass: (item.kosaiHiHi ?? 0) <= 15 ? 'fill-good' : (item.kosaiHiHi ?? 0) <= 20 ? 'fill-warn' : 'fill-bad'
    },
    {
      label: '実質赤字比率',
      value: item.jisshitsuAkaji != null ? fmtPct(item.jisshitsuAkaji) : '―（黒字）',
      note: '赤字なしが理想',
      barW: Math.min(100, (item.jisshitsuAkaji ?? 0) * 5),
      fillClass: (item.jisshitsuAkaji ?? 0) <= 0 ? 'fill-good' : 'fill-bad'
    },
    {
      label: '連結実質赤字比率',
      value: item.renketsuAkaji != null ? fmtPct(item.renketsuAkaji) : '―（黒字）',
      note: '赤字なしが理想',
      barW: Math.min(100, (item.renketsuAkaji ?? 0) * 5),
      fillClass: (item.renketsuAkaji ?? 0) <= 0 ? 'fill-good' : 'fill-bad'
    },
    {
      label: '将来負担比率',
      value: rn > 0 ? fmtPct(item.rainenDoHi) : '―（該当なし）',
      note: '350%未満が目安',
      barW: Math.min(100, rn / 3.5),
      fillClass: rn < 200 ? 'fill-good' : rn < 350 ? 'fill-warn' : 'fill-bad'
    },
  ];

  const rows = indicators.map(ind => `<tr>
    <td>${ind.label}</td>
    <td class="num">${ind.value}</td>
    <td style="font-size:10px;color:var(--text-muted)">${ind.note}</td>
    <td style="width:100px">
      <div class="indicator-bar"><div class="indicator-fill ${ind.fillClass}" style="width:${ind.barW}%"></div></div>
    </td>
  </tr>`).join('');

  return `<table class="data-table">
    <thead><tr>
      <th>指標</th><th style="text-align:right">数値</th><th>参考</th><th>状況</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** 財政規模テーブル */
function renderZaiseiKiboTable(item) {
  if (!item.kijunJuyou && !item.kijunShunyu && !item.hyojunKibo) return '';

  const rows = [];
  if (item.hyojunKibo != null)  rows.push({ label: '標準財政規模',   value: item.hyojunKibo });
  if (item.kijunJuyou != null)  rows.push({ label: '基準財政需要額', value: item.kijunJuyou });
  if (item.kijunShunyu != null) rows.push({ label: '基準財政収入額', value: item.kijunShunyu });

  if (!rows.length) return '';

  const maxVal = Math.max(...rows.map(r => r.value));
  const tableRows = rows.map(r => {
    const barW = maxVal > 0 ? Math.min(100, (r.value / maxVal) * 100) : 0;
    return `<tr>
      <td>${r.label}</td>
      <td class="num">${formatManyen(r.value)}</td>
      <td style="width:120px"><div class="indicator-bar"><div class="indicator-fill fill-good" style="width:${barW}%"></div></div></td>
    </tr>`;
  }).join('');

  return `<table class="data-table">
    <thead><tr><th>財政規模</th><th style="text-align:right">金額</th><th>規模感</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>`;
}

/** Tax breakdown table */
function renderZeiTable(item) {
  const data = [
    { label: '個人住民税', value: item.zeiByZeimoku.kojinZei },
    { label: '法人住民税', value: item.zeiByZeimoku.hojinZei },
    { label: '固定資産税', value: item.zeiByZeimoku.koteishisan },
    { label: '都市計画税', value: item.zeiByZeimoku.toshibazeikinnyu },
  ].filter(d => d.value > 0);

  const total = data.reduce((a,b)=>a+b.value, 0);
  const rows = data.map(d => {
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
    return `<tr>
      <td>${d.label}</td>
      <td class="num">${formatManyen(d.value)}</td>
      <td class="num">${pct}%</td>
      <td style="width:100px">
        <div class="indicator-bar"><div class="indicator-fill fill-good" style="width:${pct}%"></div></div>
      </td>
    </tr>`;
  }).join('');

  return `<table class="data-table">
    <thead><tr>
      <th>税目</th><th style="text-align:right">金額</th><th style="text-align:right">構成比</th><th>内訳</th>
    </tr></thead>
    <tbody>${rows}
      <tr style="border-top:1px solid var(--border-accent)">
        <td><strong>合計</strong></td>
        <td class="num"><strong>${formatManyen(total)}</strong></td>
        <td class="num">100.0%</td>
        <td></td>
      </tr>
    </tbody>
  </table>`;
}

/** Revenue structure */
function renderSainyuTable(item) {
  const data = [
    { label: '地方税', value: item.chihoZei },
    { label: '地方交付税', value: item.chihoKofuzei },
    { label: '国庫支出金', value: item.kokkoShishutsukin },
    { label: '地方債', value: item.chisaiSai },
    { label: 'その他', value: item.sonota },
  ];
  const total = item.sainyuGokei;
  const rows = data.map(d => {
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
    return `<tr>
      <td>${d.label}</td>
      <td class="num">${formatManyen(d.value)}</td>
      <td class="num">${pct}%</td>
      <td style="width:100px">
        <div class="indicator-bar"><div class="indicator-fill fill-good" style="width:${pct}%"></div></div>
      </td>
    </tr>`;
  }).join('');

  return `<table class="data-table">
    <thead><tr>
      <th>歳入区分</th><th style="text-align:right">金額</th><th style="text-align:right">構成比</th><th>内訳</th>
    </tr></thead>
    <tbody>${rows}
      <tr style="border-top:1px solid var(--border-accent)">
        <td><strong>歳入合計</strong></td>
        <td class="num"><strong>${formatManyen(total)}</strong></td>
        <td class="num">100.0%</td>
        <td></td>
      </tr>
    </tbody>
  </table>`;
}
