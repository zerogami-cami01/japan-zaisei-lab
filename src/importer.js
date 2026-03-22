/**
 * ブラウザ用 Excel インポーター（改訂版）
 * SheetJS (XLSX) を使って総務省の市町村別決算状況調を読み込む
 *
 * 対応ファイル:
 *   (1) 概況
 *   (2) 歳入内訳
 *   (3) 目的別歳出内訳
 *   (4) 性質別歳出内訳
 */

// ==============================================================================
// 列名候補（部分一致で検索）
// ==============================================================================
const COLS = {
  // 共通
  code:  ['団体コード', '市区町村コード', 'コード', '市町村コード', '団体番号'],
  name:  ['市区町村名', '団体名', '市町村名', '団体名称', '市区町村'],
  pref:  ['都道府県名', '都道府県', '県名', '府県名'],

  // (1) 概況
  jinkou:      ['人口', '住民基本台帳人口'],
  menseki:     ['面積'],
  sainyu:      ['歳入合計', '歳入決算額', '歳入総額', '歳入額'],
  saishutsu:   ['歳出合計', '歳出決算額', '歳出総額', '歳出額'],
  zaiseiRyoku: ['財政力指数'],
  ginsoku:     ['経常収支比率'],
  kosaiHi:     ['実質公債費比率'],
  rainendo:    ['将来負担比率'],
  r4Sainyu:    ['前年度歳入', '歳入合計（前年度）', '歳入（前年度）'],
  r4Saishutsu: ['前年度歳出', '歳出合計（前年度）', '歳出（前年度）'],

  // (2) 歳入内訳
  chihoZei:  ['地方税'],
  kofuzei:   ['地方交付税'],
  kokko:     ['国庫支出金'],
  chisai:    ['地方債'],
  kojin:     ['市町村民税個人', '市民税（個人）', '市区町村民税（個人）', '個人均等割', '個人所得割'],
  hojin:     ['市町村民税法人', '市民税（法人）', '市区町村民税（法人）', '法人均等割'],
  kotei:     ['固定資産税'],
  toshi:     ['都市計画税'],

  // (3) 目的別
  minsei:  ['民生費'],
  eisei:   ['衛生費'],
  doboku:  ['土木費'],
  kyouiku: ['教育費'],
  shobo:   ['消防費'],
  somu:    ['総務費'],
  nougyo:  ['農林水産業費', '農業費', '農林費', '農水費'],
  shoukou: ['商工費'],

  // (4) 性質別
  jinken:   ['人件費'],
  bukken:   ['物件費'],
  iten:     ['扶助費', '移転的支出'],
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

// 5桁の団体コードにマッチする正規表現
const CODE_RE = /^\d{5}$/;

// ==============================================================================
// ユーティリティ
// ==============================================================================

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
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).replace(/\.0+$/, '').trim();
  const digits = s.replace(/[\s,]/g, '').replace(/\D/g, '');
  if (!digits || digits.length < 4) return null;
  const code = digits.slice(0, 5).padStart(5, '0');
  // 都道府県合計（下3桁が000）はスキップ — 市区町村のみ
  if (code.endsWith('000')) return null;
  return code;
}

/** 千円 → 万円（切り捨て）*/
function toManyen(v, unit = '千円') {
  if (v === '' || v === null || v === undefined) return null;
  // カンマを除去してパース
  const n = parseFloat(String(v).replace(/,/g, ''));
  if (isNaN(n)) return null;
  if (unit === '千円')  return Math.round(n / 10);
  if (unit === '百万円') return Math.round(n * 100);
  return Math.round(n); // 万円
}

function safeFloat(v, digits = 2) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? null : +n.toFixed(digits);
}

function safeInt(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? null : Math.round(n);
}

function guessType(code, name) {
  if (!code) return '一般市';
  if (code.startsWith('13') && +code.slice(2) >= 101 && +code.slice(2) <= 123) return '特別区';
  if (+code.slice(2) === 100) return '政令指定都市';
  if (name.includes('区') && !name.includes('市')) return '特別区';
  if (name.endsWith('町') || name.includes('町')) return '町';
  if (name.endsWith('村') || name.includes('村')) return '村';
  return '一般市';
}

// ==============================================================================
// SheetJS を使ったシート読み込みと診断
// ==============================================================================

/**
 * 複数行にまたがる可能性のあるヘッダーを結合して1次元配列を作る。
 * 総務省ファイルは2〜3行の結合ヘッダーが多い。
 *
 * @param {string[][]} rawRows - sheet_to_json の全行
 * @param {number} headerRowIdx - 最初のヘッダー行インデックス
 * @param {number} nextDataRow  - データ開始行インデックス
 * @returns {string[]}
 */
function buildHeaders(rawRows, headerRowIdx, nextDataRow) {
  // ヘッダー領域（1〜3行）
  const hRows = rawRows.slice(headerRowIdx, nextDataRow);
  const maxCols = Math.max(...hRows.map(r => r.length));
  const merged = [];
  for (let c = 0; c < maxCols; c++) {
    const parts = hRows.map(r => (r && r[c] !== null && r[c] !== undefined) ? String(r[c]).trim() : '').filter(Boolean);
    merged.push(parts.join(''));
  }
  return merged;
}

/**
 * ワークブックの全シートをスキャンして最適なシートと
 * ヘッダー行を見つける。診断ログも返す。
 */
function extractSheet(workbook, log) {
  const HEADER_KW = ['団体コード', '市区町村コード', '市町村名', '団体名', 'コード', '団体番号'];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];

    // シートの実際のセル範囲と最初のセルを診断ログに出す
    const wsRef = ws['!ref'] || '(なし)';
    const cellA1 = ws['A1'];
    const cellA1Val = cellA1 ? `type=${cellA1.t} v=${cellA1.v} w=${cellA1.w}` : '(空)';
    log.push(`  シート「${sheetName}」 !ref=${wsRef}  A1=${cellA1Val}`);

    // raw:true で数値をそのまま取得（raw:false だと書式次第で空文字になる）
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

    if (raw.length === 0) { log.push(`    → sheet_to_json が空配列を返した`); continue; }

    // 先頭10行をプレビュー（列は12個まで）
    const maxColPreview = Math.max(0, ...raw.slice(0, 10).map(r => (r || []).length));
    log.push(`  (${raw.length}行 × 最大${maxColPreview}列)`);
    raw.slice(0, Math.min(10, raw.length)).forEach((r, i) => {
      const preview = (r || []).slice(0, 12).map(v => (v === null ? '∅' : String(v)).slice(0, 14)).join(' | ');
      log.push(`    行${i}: ${preview}`);
    });

    // ヘッダー行を探す（先頭50行）
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(raw.length, 50); i++) {
      const rowStr = (raw[i] || []).map(v => v === null ? '' : String(v)).join(' ');
      if (HEADER_KW.some(kw => rowStr.includes(kw))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      log.push(`  ⚠ ヘッダー行未検出（先頭50行に「団体コード」等なし）`);
      continue;
    }

    // データ開始行を探す（ヘッダー直後に5桁コードが来る行）
    let dataStartIdx = headerRowIdx + 1;
    for (let i = headerRowIdx + 1; i < Math.min(raw.length, headerRowIdx + 6); i++) {
      const row = raw[i] || [];
      const codeCandidate = String(row[0] ?? row[1] ?? '').replace(/\.0+$/, '').trim();
      if (/^\d{4,6}$/.test(codeCandidate.replace(/\D/g, ''))) {
        dataStartIdx = i;
        break;
      }
      dataStartIdx = i + 1; // ヘッダーが複数行の可能性
    }

    const headers = buildHeaders(raw, headerRowIdx, dataStartIdx);
    const rows = raw.slice(dataStartIdx);

    log.push(`  → ヘッダー行: ${headerRowIdx}, データ開始: ${dataStartIdx}`);
    log.push(`  → 検出ヘッダー: ${headers.slice(0, 10).join(' | ')}`);

    return { headers, rows, sheetName };
  }

  // フォールバック: 先頭シートの先頭行をヘッダー扱い
  log.push(`  ⚠ ヘッダー行未検出。先頭シートの先頭行をヘッダーとして使用します`);
  const wsFb = workbook.Sheets[workbook.SheetNames[0]];
  const rawFb = XLSX.utils.sheet_to_json(wsFb, { header: 1, defval: null, raw: true });
  return {
    headers: (rawFb[0] || []).map(h => h === null ? '' : String(h).trim()),
    rows: rawFb.slice(1),
    sheetName: workbook.SheetNames[0]
  };
}

/**
 * headers配列から候補列名に一致するインデックスを返す。
 * 完全一致 → 前方一致 → 部分一致 の順で試みる。
 */
function findColIdx(headers, candidates) {
  // 完全一致
  for (const name of candidates) {
    const idx = headers.indexOf(name);
    if (idx >= 0) return idx;
  }
  // 前方一致
  for (const name of candidates) {
    const idx = headers.findIndex(h => h.startsWith(name));
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
 * コード列を自動検出する（列名で見つからない場合のフォールバック）。
 * 全データ行をスキャンして、値が5桁の数字に見える列を探す。
 */
function autoDetectCodeCol(headers, rows) {
  // headers が少ない場合でも全列を試す
  const colCount = Math.max(headers.length, 10);
  for (let c = 0; c < Math.min(colCount, 15); c++) {
    const hits = rows.slice(0, 30).filter(r => {
      if (!r) return false;
      const v = String(r[c] ?? '').replace(/\.0+$/, '').trim();
      const digits = v.replace(/\D/g, '');
      return digits.length >= 4 && digits.length <= 6 && /^\d+$/.test(digits);
    }).length;
    if (hits >= 5) return c;
  }
  return -1;
}

async function loadFile(file, log) {
  const buf = await readFileAsBuffer(file);
  const wb = XLSX.read(buf, { type: 'array' });
  log.push(`\n📄 ${file.name}  (シート数: ${wb.SheetNames.length})`);
  return extractSheet(wb, log);
}

// ==============================================================================
// 各ファイル種別のパース
// ==============================================================================

function parseGaikyo(headers, rows, unit, log) {
  const ci = key => findColIdx(headers, COLS[key]);

  let idxCode = ci('code');
  if (idxCode < 0) {
    idxCode = autoDetectCodeCol(headers, rows);
    if (idxCode >= 0) log.push(`  ℹ コード列を自動検出: 列${idxCode}「${headers[idxCode]}」`);
  }

  const idxName = ci('name'), idxPref = ci('pref');
  const idxJin = ci('jinkou'), idxMen = ci('menseki');
  const idxSainyu = ci('sainyu'), idxSaishutsu = ci('saishutsu');
  const idxZaisei = ci('zaiseiRyoku'), idxGinsoku = ci('ginsoku');
  const idxKosai = ci('kosaiHi'), idxRainen = ci('rainendo');
  const idxR4S = ci('r4Sainyu'), idxR4E = ci('r4Saishutsu');

  log.push(`  列マップ: code=${idxCode} name=${idxName} pref=${idxPref} sainyu=${idxSainyu} saishutsu=${idxSaishutsu}`);

  if (idxCode < 0) {
    log.push(`  ❌ 団体コード列が見つかりません`);
    return {};
  }

  const result = {};
  let skipped = 0;
  for (const row of rows) {
    const code = normalizeCode(row[idxCode]);
    if (!code) { skipped++; continue; }
    const name = String(row[idxName] ?? '').trim();
    if (!name && idxName >= 0) { skipped++; continue; }
    const prefRaw = idxPref >= 0 ? String(row[idxPref] || '').trim() : '';
    const pref = prefRaw || PREF_MAP[code.slice(0, 2)] || '不明';

    result[code] = {
      name: name || code,
      pref,
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
  log.push(`  → ${Object.keys(result).length} 団体取得（スキップ: ${skipped}行）`);
  if (Object.keys(result).length > 0) {
    const first = Object.entries(result)[0];
    log.push(`  例: ${first[0]} ${first[1].name} (${first[1].pref}) 歳入=${first[1].sainyuGokei}万円`);
  }
  return result;
}

function parseSainyu(headers, rows, unit, log) {
  const ci = key => findColIdx(headers, COLS[key]);
  let idxCode = ci('code');
  if (idxCode < 0) idxCode = autoDetectCodeCol(headers, rows);

  const idxChiho = ci('chihoZei'), idxKofu = ci('kofuzei');
  const idxKokko = ci('kokko'), idxChisai = ci('chisai');
  const idxKojin = ci('kojin'), idxHojin = ci('hojin');
  const idxKotei = ci('kotei'), idxToshi = ci('toshi');

  log.push(`  列マップ: code=${idxCode} 地方税=${idxChiho} 地方交付税=${idxKofu} 国庫=${idxKokko} 地方債=${idxChisai}`);

  if (idxCode < 0) { log.push(`  ❌ 団体コード列未検出`); return {}; }

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
  log.push(`  → ${Object.keys(result).length} 団体取得`);
  return result;
}

function parseMokuteki(headers, rows, unit, log) {
  const ci = key => findColIdx(headers, COLS[key]);
  let idxCode = ci('code');
  if (idxCode < 0) idxCode = autoDetectCodeCol(headers, rows);

  const idxMin = ci('minsei'), idxEi = ci('eisei'), idxDo = ci('doboku');
  const idxKy = ci('kyouiku'), idxSho = ci('shobo'), idxSo = ci('somu');
  const idxNo = ci('nougyo'), idxSk = ci('shoukou');

  log.push(`  列マップ: code=${idxCode} 民生=${idxMin} 衛生=${idxEi} 土木=${idxDo} 教育=${idxKy}`);

  if (idxCode < 0) { log.push(`  ❌ 団体コード列未検出`); return {}; }

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
  log.push(`  → ${Object.keys(result).length} 団体取得`);
  return result;
}

function parseSeishitsu(headers, rows, unit, log) {
  const ci = key => findColIdx(headers, COLS[key]);
  let idxCode = ci('code');
  if (idxCode < 0) idxCode = autoDetectCodeCol(headers, rows);

  const idxJin = ci('jinken'), idxBuk = ci('bukken'), idxIte = ci('iten');
  const idxKok = ci('kokkosai'), idxHoj = ci('hojo');

  log.push(`  列マップ: code=${idxCode} 人件費=${idxJin} 物件費=${idxBuk} 扶助費=${idxIte} 公債費=${idxKok}`);

  if (idxCode < 0) { log.push(`  ❌ 団体コード列未検出`); return {}; }

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
  log.push(`  → ${Object.keys(result).length} 団体取得`);
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
// メイン export
// ==============================================================================

/**
 * @param {Object} files - { gaikyo: File[], sainyu: File[], mokuteki: File[], seishitsu: File[] }
 * @param {string} unit  - '千円' | '万円' | '百万円'
 * @param {Set<string>} skipIds - スキップするIDセット
 */
async function importFromExcel(files, unit = '千円', skipIds = new Set()) {
  const log = [];

  async function loadAll(fileList, label) {
    const combined = { headers: [], rows: [] };
    log.push(`\n===== ${label} =====`);
    for (const file of (fileList || [])) {
      const { headers, rows, sheetName } = await loadFile(file, log);
      if (!combined.headers.length && headers.length) combined.headers = headers;
      combined.rows.push(...rows);
    }
    if (!combined.headers.length) log.push(`  （ファイル未選択）`);
    return combined;
  }

  const g  = await loadAll(files.gaikyo,    '(1) 概況');
  const gaikyoData   = g.headers.length  ? parseGaikyo(g.headers,   g.rows,   unit, log) : {};

  const s  = await loadAll(files.sainyu,    '(2) 歳入内訳');
  const sainyuData   = s.headers.length  ? parseSainyu(s.headers,   s.rows,   unit, log) : {};

  const m  = await loadAll(files.mokuteki,  '(3) 目的別歳出');
  const mokutekiData = m.headers.length  ? parseMokuteki(m.headers,  m.rows,   unit, log) : {};

  const se = await loadAll(files.seishitsu, '(4) 性質別歳出');
  const seishitsuData = se.headers.length ? parseSeishitsu(se.headers, se.rows, unit, log) : {};

  log.push('\n===== マージ =====');
  const merged = mergeAll(gaikyoData, sainyuData, mokutekiData, seishitsuData);
  const newCount = merged.filter(m => !skipIds.has(m.id)).length;
  const updateCount = merged.length - newCount;
  log.push(`✅ 合計 ${merged.length} 団体（新規: ${newCount}、更新: ${updateCount}）`);

  return { municipalities: merged, log };
}
