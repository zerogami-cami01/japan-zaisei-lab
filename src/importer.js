/**
 * ブラウザ用 Excel インポーター
 * SheetJS (XLSX) を使って総務省の市町村別決算状況調を読み込む
 *
 * 対応ファイル:
 *   (1) 概況
 *   (2) 歳入内訳
 *   (3) 目的別歳出内訳
 *   (4) 性質別歳出内訳
 */

// ==============================================================================
// 列名候補（実際のExcelの列名に合わせて調整）
// ==============================================================================
const COLS = {
  // 共通
  code:  ['団体コード', '市区町村コード', 'コード'],
  name:  ['市区町村名', '団体名', '市町村名', '団体名称'],
  pref:  ['都道府県名', '都道府県'],

  // (1) 概況
  jinkou:      ['人口（人）', '人口', '住民基本台帳人口（人）'],
  menseki:     ['面積（k㎡）', '面積（km2）', '面積（㎢）', '面積'],
  sainyu:      ['歳入合計', '歳入決算額', '歳入総額'],
  saishutsu:   ['歳出合計', '歳出決算額', '歳出総額'],
  zaiseiRyoku: ['財政力指数', '財政力指数（3ヵ年平均）', '財政力指数（3か年平均）'],
  ginsoku:     ['経常収支比率', '経常収支比率（％）', '経常収支比率(%)'],
  kosaiHi:     ['実質公債費比率', '実質公債費比率（３ヵ年平均）', '実質公債費比率（3ヵ年平均）'],
  rainendo:    ['将来負担比率', '将来負担比率（％）'],
  r4Sainyu:    ['前年度歳入合計', '歳入合計（前年度）', '前年度歳入'],
  r4Saishutsu: ['前年度歳出合計', '歳出合計（前年度）', '前年度歳出'],

  // (2) 歳入内訳
  chihoZei:  ['地方税', '地方税合計', '地方税計'],
  kofuzei:   ['地方交付税', '地方交付税合計'],
  kokko:     ['国庫支出金', '国庫支出金合計'],
  chisai:    ['地方債', '地方債合計'],
  kojin:     ['個人', '市町村民税個人', '市区町村民税（個人）', '市民税（個人）'],
  hojin:     ['法人', '市町村民税法人', '市区町村民税（法人）', '市民税（法人）'],
  kotei:     ['固定資産税', '固定資産税合計'],
  toshi:     ['都市計画税'],

  // (3) 目的別
  minsei:  ['民生費'],
  eisei:   ['衛生費'],
  doboku:  ['土木費'],
  kyouiku: ['教育費'],
  shobo:   ['消防費'],
  somu:    ['総務費'],
  nougyo:  ['農林水産業費', '農業費', '農林費'],
  shoukou: ['商工費'],

  // (4) 性質別
  jinken:   ['人件費'],
  bukken:   ['物件費'],
  iten:     ['扶助費'],
  kokkosai: ['公債費'],
  hojo:     ['補助費等', '補助費'],
};

const PREF_MAP = {
  '01':'北海道','02':'青森県','03':'岩手県','04':'宮城県','05':'秋田県',
  '06':'山形県','07':'福島県','08':'茨城県','09':'栃木県','10':'群馬県',
  '11':'埼玉県','12':'千葉県','13':'東京都','14':'神奈川県','15':'新潟県',
  '16':'富山県','17':'石川県','18':'福井県','19':'山梨県','20':'長野県',
  '21':'岐阜県','22':'静岡県','23':'愛知県','24':'三重県','25':'滋賀県',
  '26':'京都府','27':'大阪府','28':'兵庫県','29':'奈良県','30':'和歌山県',
  '31':'鳥取県','32':'島根県','33':'岡山県','34':'広島県','35':'山口県',
  '36':'徳島県','37':'香川県','38':'愛媛県','39':'高知県','40':'福岡県',
  '41':'佐賀県','42':'長崎県','43':'熊本県','44':'大分県','45':'宮崎県',
  '46':'鹿児島県','47':'沖縄県',
};

const HEADER_KEYWORDS = ['団体コード', '市区町村コード', '市町村名', '団体名', 'コード'];

// ==============================================================================
// ユーティリティ
// ==============================================================================

/** Excelの1ファイルを ArrayBuffer で読む */
function readFileAsBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** 団体コードを5桁文字列に正規化 */
function normalizeCode(raw) {
  if (!raw && raw !== 0) return null;
  const s = String(raw).replace(/\.0$/, '').trim();
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;
  // 6桁の場合は先頭5桁を使う（末尾は支所区分）
  return digits.slice(0, 5).padStart(5, '0');
}

/** 千円 → 万円（切り捨て）。nullなら null を返す */
function toManyen(v, unit = '千円') {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  if (unit === '千円') return Math.round(n / 10);
  if (unit === '百万円') return Math.round(n * 100);
  return Math.round(n); // 万円
}

/** 安全にfloat変換 */
function safeFloat(v, digits = 2) {
  const n = parseFloat(v);
  return isNaN(n) ? null : +n.toFixed(digits);
}

function safeInt(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : Math.round(n);
}

function guessType(code, name) {
  if (!code) return '一般市';
  if (code.startsWith('13') && +code.slice(2) >= 101 && +code.slice(2) <= 123) return '特別区';
  if (code.endsWith('100')) return '政令指定都市';
  if (name.includes('区')) return '特別区';
  if (name.includes('町')) return '町';
  if (name.includes('村')) return '村';
  return '一般市';
}

// ==============================================================================
// SheetJS を使ったシート読み込み
// ==============================================================================

/**
 * ワークブックから有効なシートを選び、行データ配列を返す
 * @returns { headers: string[], rows: string[][] }
 */
function extractSheet(workbook) {
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

    // ヘッダー行を探す（先頭15行以内）
    for (let i = 0; i < Math.min(raw.length, 15); i++) {
      const rowStr = raw[i].join(' ');
      if (HEADER_KEYWORDS.some(kw => rowStr.includes(kw))) {
        const headers = raw[i].map(h => String(h).trim());
        const rows = raw.slice(i + 1);
        return { headers, rows, sheetName };
      }
    }
  }
  // フォールバック: 最初のシートの先頭行
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  return { headers: raw[0]?.map(h => String(h).trim()) || [], rows: raw.slice(1), sheetName: workbook.SheetNames[0] };
}

/**
 * headers配列から候補列名に一致するインデックスを返す
 */
function findColIdx(headers, candidates) {
  for (const name of candidates) {
    const idx = headers.indexOf(name);
    if (idx >= 0) return idx;
  }
  // 部分一致
  for (const name of candidates) {
    const idx = headers.findIndex(h => h.includes(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * ファイルをSheetJSで読んでシートデータを返す
 */
async function loadFile(file) {
  const buf = await readFileAsBuffer(file);
  const wb = XLSX.read(buf, { type: 'array' });
  return extractSheet(wb);
}

// ==============================================================================
// 各ファイル種別のパース
// ==============================================================================

function parseGaikyo(headers, rows, unit) {
  const ci = key => findColIdx(headers, COLS[key]);
  const idxCode = ci('code'), idxName = ci('name'), idxPref = ci('pref');
  const idxJin = ci('jinkou'), idxMen = ci('menseki');
  const idxSainyu = ci('sainyu'), idxSaishutsu = ci('saishutsu');
  const idxZaisei = ci('zaiseiRyoku'), idxGinsoku = ci('ginsoku');
  const idxKosai = ci('kosaiHi'), idxRainen = ci('rainendo');
  const idxR4S = ci('r4Sainyu'), idxR4E = ci('r4Saishutsu');

  const result = {};
  for (const row of rows) {
    const code = normalizeCode(row[idxCode]);
    if (!code) continue;
    const name = String(row[idxName] || '').trim();
    if (!name) continue;
    const prefRaw = String(row[idxPref] || '').trim();
    const pref = prefRaw || PREF_MAP[code.slice(0, 2)] || '不明';

    result[code] = {
      name, pref,
      jinkou: safeInt(row[idxJin]),
      menseki: safeFloat(row[idxMen]),
      sainyuGokei: toManyen(row[idxSainyu], unit),
      saishutsuGokei: toManyen(row[idxSaishutsu], unit),
      zaiseiRyoku: safeFloat(row[idxZaisei]),
      ginsokuHi: safeFloat(row[idxGinsoku]),
      jisshitsuKosaiHi: safeFloat(row[idxKosai]),
      rainenDoHi: safeFloat(row[idxRainen]),
      r4_sainyuGokei: toManyen(row[idxR4S], unit),
      r4_saishutsuGokei: toManyen(row[idxR4E], unit),
    };
  }
  return result;
}

function parseSainyu(headers, rows, unit) {
  const ci = key => findColIdx(headers, COLS[key]);
  const idxCode = ci('code');
  const idxChiho = ci('chihoZei'), idxKofu = ci('kofuzei');
  const idxKokko = ci('kokko'), idxChisai = ci('chisai');
  const idxKojin = ci('kojin'), idxHojin = ci('hojin');
  const idxKotei = ci('kotei'), idxToshi = ci('toshi');

  const result = {};
  for (const row of rows) {
    const code = normalizeCode(row[idxCode]);
    if (!code) continue;
    result[code] = {
      chihoZei: toManyen(row[idxChiho], unit) ?? 0,
      chihoKofuzei: toManyen(row[idxKofu], unit) ?? 0,
      kokkoShishutsukin: toManyen(row[idxKokko], unit) ?? 0,
      chisaiSai: toManyen(row[idxChisai], unit) ?? 0,
      zeiByZeimoku: {
        kojinZei:         toManyen(row[idxKojin], unit) ?? 0,
        hojinZei:         toManyen(row[idxHojin], unit) ?? 0,
        koteishisan:      toManyen(row[idxKotei], unit) ?? 0,
        toshibazeikinnyu: toManyen(row[idxToshi], unit) ?? 0,
        sonota: 0,
      },
    };
  }
  return result;
}

function parseMokuteki(headers, rows, unit) {
  const ci = key => findColIdx(headers, COLS[key]);
  const idxCode = ci('code');
  const idxMin = ci('minsei'), idxEi = ci('eisei'), idxDo = ci('doboku');
  const idxKy = ci('kyouiku'), idxSho = ci('shobo'), idxSo = ci('somu');
  const idxNo = ci('nougyo'), idxSk = ci('shoukou');

  const result = {};
  for (const row of rows) {
    const code = normalizeCode(row[idxCode]);
    if (!code) continue;
    result[code] = {
      minsei:  toManyen(row[idxMin], unit) ?? 0,
      eisei:   toManyen(row[idxEi],  unit) ?? 0,
      doboku:  toManyen(row[idxDo],  unit) ?? 0,
      kyouiku: toManyen(row[idxKy],  unit) ?? 0,
      shobo:   toManyen(row[idxSho], unit) ?? 0,
      somu:    toManyen(row[idxSo],  unit) ?? 0,
      nougyo:  toManyen(row[idxNo],  unit) ?? 0,
      shoukou: toManyen(row[idxSk],  unit) ?? 0,
    };
  }
  return result;
}

function parseSeishitsu(headers, rows, unit) {
  const ci = key => findColIdx(headers, COLS[key]);
  const idxCode = ci('code');
  const idxJin = ci('jinken'), idxBuk = ci('bukken'), idxIte = ci('iten');
  const idxKok = ci('kokkosai'), idxHoj = ci('hojo');

  const result = {};
  for (const row of rows) {
    const code = normalizeCode(row[idxCode]);
    if (!code) continue;
    result[code] = {
      jinken:   toManyen(row[idxJin], unit) ?? 0,
      bukken:   toManyen(row[idxBuk], unit) ?? 0,
      iten:     toManyen(row[idxIte], unit) ?? 0,
      kokkosai: toManyen(row[idxKok], unit) ?? 0,
      hojo:     toManyen(row[idxHoj], unit) ?? 0,
    };
  }
  return result;
}

// ==============================================================================
// マージ
// ==============================================================================

function mergeAll(gaikyo, sainyu, mokuteki, seishitsu) {
  const result = [];
  for (const code of Object.keys(gaikyo).sort()) {
    const g = gaikyo[code];
    const s = sainyu[code] || {};
    const m = mokuteki[code] || {};
    const se = seishitsu[code] || {};

    const sainyuTotal    = g.sainyuGokei    ?? 0;
    const saishutsuTotal = g.saishutsuGokei ?? 0;

    // 残差計算
    const sonotaSainyu = sainyuTotal
      - (s.chihoZei ?? 0) - (s.chihoKofuzei ?? 0)
      - (s.kokkoShishutsukin ?? 0) - (s.chisaiSai ?? 0);

    const mokutekiSum = ['minsei','eisei','doboku','kyouiku','shobo','somu','nougyo','shoukou']
      .reduce((acc, k) => acc + (m[k] ?? 0), 0);
    const sonotaMokuteki = saishutsuTotal - mokutekiSum;

    const seishitsuSum = ['jinken','bukken','iten','kokkosai','hojo']
      .reduce((acc, k) => acc + (se[k] ?? 0), 0);
    const sonotaSeishitsu = saishutsuTotal - seishitsuSum;

    result.push({
      id: code,
      name: g.name,
      pref: g.pref,
      type: guessType(code, g.name),
      jinkou: g.jinkou,
      menseki: g.menseki,
      sainyuGokei: g.sainyuGokei,
      saishutsuGokei: g.saishutsuGokei,
      chihoZei: s.chihoZei ?? 0,
      chihoKofuzei: s.chihoKofuzei ?? 0,
      kokkoShishutsukin: s.kokkoShishutsukin ?? 0,
      chisaiSai: s.chisaiSai ?? 0,
      sonota: sonotaSainyu,
      ginsokuHi: g.ginsokuHi,
      jisshitsuKosaiHi: g.jisshitsuKosaiHi,
      rainenDoHi: g.rainenDoHi,
      zaiseiRyoku: g.zaiseiRyoku,
      saishuByMokuteki: {
        minsei:  m.minsei  ?? 0,
        eisei:   m.eisei   ?? 0,
        doboku:  m.doboku  ?? 0,
        kyouiku: m.kyouiku ?? 0,
        shobo:   m.shobo   ?? 0,
        somu:    m.somu    ?? 0,
        nougyo:  m.nougyo  ?? 0,
        shoukou: m.shoukou ?? 0,
        sonota:  sonotaMokuteki,
      },
      saishuBySeishitsu: {
        jinken:   se.jinken   ?? 0,
        bukken:   se.bukken   ?? 0,
        iten:     se.iten     ?? 0,
        kokkosai: se.kokkosai ?? 0,
        hojo:     se.hojo     ?? 0,
        sonota:   sonotaSeishitsu,
      },
      zeiByZeimoku: s.zeiByZeimoku ?? {
        kojinZei: 0, hojinZei: 0, koteishisan: 0, toshibazeikinnyu: 0, sonota: 0,
      },
      r4_sainyuGokei: g.r4_sainyuGokei,
      r4_saishutsuGokei: g.r4_saishutsuGokei,
    });
  }
  return result;
}

// ==============================================================================
// メイン: 複数ファイルを受け取って団体リストを返す
// ==============================================================================

/**
 * @param {Object} files - { gaikyo: File[], sainyu: File[], mokuteki: File[], seishitsu: File[] }
 * @param {string} unit  - '千円' | '万円' | '百万円'
 * @param {Set<string>} skipIds - スキップするIDセット
 * @returns {Promise<{municipalities: Object[], log: string[]}>}
 */
export async function importFromExcel(files, unit = '千円', skipIds = new Set()) {
  const log = [];

  async function loadAll(fileList, label) {
    const combined = { headers: [], rows: [] };
    for (const file of (fileList || [])) {
      const { headers, rows, sheetName } = await loadFile(file);
      log.push(`📄 ${file.name} → シート「${sheetName}」(${rows.length}行)`);
      if (!combined.headers.length) combined.headers = headers;
      combined.rows.push(...rows);
    }
    log.push(`   ${label}: 合計 ${combined.rows.length} 行`);
    return combined;
  }

  log.push('--- (1) 概況 ---');
  const g = await loadAll(files.gaikyo, '概況');
  const gaikyoData = g.headers.length ? parseGaikyo(g.headers, g.rows, unit) : {};
  log.push(`   団体数: ${Object.keys(gaikyoData).length}`);

  log.push('--- (2) 歳入内訳 ---');
  const s = await loadAll(files.sainyu, '歳入内訳');
  const sainyuData = s.headers.length ? parseSainyu(s.headers, s.rows, unit) : {};
  log.push(`   団体数: ${Object.keys(sainyuData).length}`);

  log.push('--- (3) 目的別歳出 ---');
  const m = await loadAll(files.mokuteki, '目的別歳出');
  const mokutekiData = m.headers.length ? parseMokuteki(m.headers, m.rows, unit) : {};
  log.push(`   団体数: ${Object.keys(mokutekiData).length}`);

  log.push('--- (4) 性質別歳出 ---');
  const se = await loadAll(files.seishitsu, '性質別歳出');
  const seishitsuData = se.headers.length ? parseSeishitsu(se.headers, se.rows, unit) : {};
  log.push(`   団体数: ${Object.keys(seishitsuData).length}`);

  log.push('--- マージ ---');
  let merged = mergeAll(gaikyoData, sainyuData, mokutekiData, seishitsuData);

  const before = merged.length;
  merged = merged.filter(m => !skipIds.has(m.id));
  log.push(`✅ 新規追加: ${merged.length} 団体（スキップ: ${before - merged.length}）`);

  return { municipalities: merged, log };
}
