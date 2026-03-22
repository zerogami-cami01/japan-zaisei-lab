// UI Components for 令和5年度 地方自治体決算ターミナル

import { formatManyen, formatPercent, formatNumber } from './data.js';

/** KPI Card */
export function renderKpiCard({ label, value, valueClass = '', r4Value = null, unit = '' }) {
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
export function renderKpiGroup(title, cards) {
  return `<div class="kpi-group">
    <div class="kpi-group-title">${title}</div>
    <div class="kpi-cards">${cards.join('')}</div>
  </div>`;
}

/** Entity Card for browse */
export function renderEntityCard(item) {
  const r4Diff = item.sainyuGokei - item.r4_sainyuGokei;
  const r4DiffPct = ((r4Diff / item.r4_sainyuGokei) * 100).toFixed(1);
  const diffClass = r4Diff >= 0 ? 'positive' : 'negative';
  const diffArrow = r4Diff >= 0 ? '▲' : '▼';
  const zaiseiW = Math.min(100, Math.max(0, item.zaiseiRyoku * 60));

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
export function renderDetailHeader(item) {
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
        <span class="detail-meta-value">${item.menseki.toLocaleString('ja-JP')}km²</span>
      </div>
      <div class="detail-meta-item">
        <span>団体コード:</span>
        <span class="detail-meta-value">${item.id}</span>
      </div>
    </div>
  </div>`;
}

/** Expenditure by purpose table */
export function renderMokutekiTable(item) {
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

/** Financial indicators table */
export function renderZaiseiShihyoTable(item) {
  const indicators = [
    {
      label: '財政力指数',
      value: item.zaiseiRyoku.toFixed(2),
      note: '1.0以上が自立度高',
      good: item.zaiseiRyoku >= 1.0,
      warn: item.zaiseiRyoku >= 0.7 && item.zaiseiRyoku < 1.0,
      barW: Math.min(100, item.zaiseiRyoku * 80),
      fillClass: item.zaiseiRyoku >= 1.0 ? 'fill-good' : item.zaiseiRyoku >= 0.7 ? 'fill-warn' : 'fill-bad'
    },
    {
      label: '経常収支比率',
      value: formatPercent(item.ginsokuHi),
      note: '75〜80%が理想、90%超は硬直',
      barW: item.ginsokuHi,
      fillClass: item.ginsokuHi <= 80 ? 'fill-good' : item.ginsokuHi <= 90 ? 'fill-warn' : 'fill-bad'
    },
    {
      label: '実質公債費比率',
      value: formatPercent(item.jisshitsuKosaiHi),
      note: '18%未満が目安',
      barW: Math.min(100, item.jisshitsuKosaiHi * 4),
      fillClass: item.jisshitsuKosaiHi < 12 ? 'fill-good' : item.jisshitsuKosaiHi < 18 ? 'fill-warn' : 'fill-bad'
    },
    {
      label: '翌年度繰上充用',
      value: formatPercent(item.rainenDoHi),
      note: '100%超は収支不足繰越',
      barW: Math.min(100, item.rainenDoHi),
      fillClass: item.rainenDoHi <= 100 ? 'fill-good' : 'fill-bad'
    }
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

/** Tax breakdown table */
export function renderZeiTable(item) {
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
export function renderSainyuTable(item) {
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
