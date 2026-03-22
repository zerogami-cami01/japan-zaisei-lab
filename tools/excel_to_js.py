#!/usr/bin/env python3
"""
総務省「市町村別決算状況調」複数ExcelファイルをJS形式に変換するスクリプト

対応ファイル（都市別・町村別それぞれ）:
  (1) 概況           → --gaikyo <file>
  (2) 歳入内訳       → --sainyu <file>
  (3) 目的別歳出内訳  → --mokuteki <file>
  (4) 性質別歳出内訳  → --seishitsu <file>

使い方:
  # 列名確認（最初に必ず実行）
  python3 tools/excel_to_js.py --inspect *.xlsx

  # 都市別のみ変換
  python3 tools/excel_to_js.py \\
    --gaikyo   都市別_1概況.xlsx \\
    --sainyu   都市別_2歳入.xlsx \\
    --mokuteki 都市別_3目的別.xlsx \\
    --seishitsu 都市別_4性質別.xlsx \\
    -o tools/added.js

  # 都市別＋町村別まとめて変換
  python3 tools/excel_to_js.py \\
    --gaikyo   都市別_1概況.xlsx 町村別_1概況.xlsx \\
    --sainyu   都市別_2歳入.xlsx 町村別_2歳入.xlsx \\
    --mokuteki 都市別_3目的別.xlsx 町村別_3目的別.xlsx \\
    --seishitsu 都市別_4性質別.xlsx 町村別_4性質別.xlsx \\
    -o tools/added.js
"""

import sys
import re
import argparse
import pandas as pd
from pathlib import Path

# ==============================================================================
# 列名マッピング（Excelの実際の列名に合わせて修正してください）
# --inspect で列名を確認してから調整
# ==============================================================================

# 共通: 団体コード・基本情報
COLS_CODE   = ["団体コード", "市区町村コード", "団体コード（6桁）", "コード"]
COLS_NAME   = ["市区町村名", "団体名", "市町村名", "団体名称"]
COLS_PREF   = ["都道府県名", "都道府県"]

# (1) 概況
COLS_JINKOU      = ["人口（人）", "人口", "住民基本台帳人口（人）"]
COLS_MENSEKI     = ["面積（k㎡）", "面積（km2）", "面積（㎢）", "面積"]
COLS_SAINYU      = ["歳入合計", "歳入決算額", "歳入総額"]
COLS_SAISHUTSU   = ["歳出合計", "歳出決算額", "歳出総額"]
COLS_ZAISEI_RYOKU = ["財政力指数", "財政力指数（3ヵ年平均）", "財政力指数（3か年平均）"]
COLS_GINSOKU     = ["経常収支比率", "経常収支比率（％）", "経常収支比率(%)"]
COLS_KOSAI_HI    = ["実質公債費比率", "実質公債費比率（３ヵ年平均）", "実質公債費比率（3ヵ年平均）"]
COLS_RAINENDO    = ["将来負担比率", "将来負担比率（％）"]
COLS_R4_SAINYU   = ["前年度歳入合計", "歳入合計（前年度）", "前年度歳入"]
COLS_R4_SAISHUTSU = ["前年度歳出合計", "歳出合計（前年度）", "前年度歳出"]

# (2) 歳入内訳
COLS_CHIHOZEI  = ["地方税", "地方税合計", "地方税計"]
COLS_KOFUZEI   = ["地方交付税", "地方交付税合計"]
COLS_KOKKO     = ["国庫支出金", "国庫支出金合計"]
COLS_CHISAI    = ["地方債", "地方債合計"]
COLS_KOJIN     = ["個人", "市町村民税個人", "市区町村民税（個人）", "市民税（個人）"]
COLS_HOJIN     = ["法人", "市町村民税法人", "市区町村民税（法人）", "市民税（法人）"]
COLS_KOTEI     = ["固定資産税", "固定資産税合計"]
COLS_TOSHI     = ["都市計画税"]

# (3) 目的別歳出内訳
COLS_MINSEI  = ["民生費"]
COLS_EISEI   = ["衛生費"]
COLS_DOBOKU  = ["土木費"]
COLS_KYOUIKU = ["教育費"]
COLS_SHOBO   = ["消防費"]
COLS_SOMU    = ["総務費"]
COLS_NOUGYO  = ["農林水産業費", "農業費", "農林費"]
COLS_SHOUKOU = ["商工費"]

# (4) 性質別歳出内訳
COLS_JINKEN  = ["人件費"]
COLS_BUKKEN  = ["物件費"]
COLS_ITEN    = ["扶助費"]
COLS_KOKKOSAI = ["公債費"]
COLS_HOJO    = ["補助費等", "補助費"]

# 金額の単位（総務省の市町村別決算状況調は通常「千円」）
UNIT = "千円"

# ==============================================================================

PREF_MAP = {
    "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県",
    "05": "秋田県", "06": "山形県", "07": "福島県", "08": "茨城県",
    "09": "栃木県", "10": "群馬県", "11": "埼玉県", "12": "千葉県",
    "13": "東京都", "14": "神奈川県", "15": "新潟県", "16": "富山県",
    "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県",
    "21": "岐阜県", "22": "静岡県", "23": "愛知県", "24": "三重県",
    "25": "滋賀県", "26": "京都府", "27": "大阪府", "28": "兵庫県",
    "29": "奈良県", "30": "和歌山県", "31": "鳥取県", "32": "島根県",
    "33": "岡山県", "34": "広島県", "35": "山口県", "36": "徳島県",
    "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県",
    "41": "佐賀県", "42": "長崎県", "43": "熊本県", "44": "大分県",
    "45": "宮崎県", "46": "鹿児島県", "47": "沖縄県",
}


# ==============================================================================
# ユーティリティ
# ==============================================================================

def find_col(df, candidates):
    """候補列名リストからDataFrameに存在する列を探す（部分一致も）"""
    for name in candidates:
        if name in df.columns:
            return name
    for name in candidates:
        for col in df.columns:
            if name in str(col):
                return col
    return None


def get_val(row, df, candidates):
    col = find_col(df, candidates)
    return row[col] if col else None


def to_manyen(value):
    """値を万円単位のintに変換"""
    try:
        v = float(value)
        if pd.isna(v):
            return None
        if UNIT == "千円":
            return round(v / 10)
        elif UNIT == "百万円":
            return round(v * 100)
        else:
            return round(v)
    except (TypeError, ValueError):
        return None


def safe_float(value, digits=2):
    try:
        v = float(value)
        return None if pd.isna(v) else round(v, digits)
    except (TypeError, ValueError):
        return None


def safe_int(value):
    try:
        v = float(value)
        return None if pd.isna(v) else int(v)
    except (TypeError, ValueError):
        return None


def normalize_code(raw):
    """団体コードを5桁文字列に正規化"""
    s = str(raw).replace(".0", "").strip()
    # 数字部分だけ取り出す
    digits = re.sub(r"\D", "", s)
    if not digits:
        return None
    # 6桁コードの場合は末尾1桁（支所区分）を除く → 5桁
    if len(digits) == 6:
        digits = digits[:5]
    return digits.zfill(5)


def guess_type(code, name):
    if not code:
        return "一般市"
    if code.startswith("13") and 101 <= int(code[2:]) <= 123:
        return "特別区"
    if code.endswith("100"):
        return "政令指定都市"
    name = str(name)
    if "区" in name:
        return "特別区"
    if "町" in name:
        return "町"
    if "村" in name:
        return "村"
    return "一般市"


# ==============================================================================
# シート読み込み（ヘッダー行を自動検出）
# ==============================================================================

HEADER_KEYWORDS = ["団体コード", "市区町村コード", "市町村名", "団体名", "コード"]


def read_sheet(filepath, sheet_name=None):
    """Excelファイルを読み込む。ヘッダー行を自動検出。"""
    xl = pd.ExcelFile(filepath)
    target = sheet_name or xl.sheet_names[0]

    raw = pd.read_excel(filepath, sheet_name=target, header=None, dtype=str)

    for i, row in raw.head(15).iterrows():
        row_str = " ".join(str(v) for v in row if str(v) != "nan")
        if any(kw in row_str for kw in HEADER_KEYWORDS):
            df = pd.read_excel(filepath, sheet_name=target, header=i, dtype=str)
            # 列名のNaN・Unnamed を除去
            df.columns = [
                str(c).strip() if not str(c).startswith("Unnamed") else f"_col{j}"
                for j, c in enumerate(df.columns)
            ]
            print(f"  [{Path(filepath).name}] シート「{target}」ヘッダー行={i}  ({len(df)}行)", file=sys.stderr)
            return df

    # フォールバック
    df = pd.read_excel(filepath, sheet_name=target, header=0, dtype=str)
    print(f"  [{Path(filepath).name}] シート「{target}」ヘッダー自動検出失敗→先頭行を使用", file=sys.stderr)
    return df


def read_files(filepaths):
    """複数ファイルを読み込んで縦結合"""
    frames = []
    for fp in filepaths:
        xl = pd.ExcelFile(fp)
        # 有効そうなシートを探す
        loaded = False
        for sn in xl.sheet_names:
            raw = pd.read_excel(fp, sheet_name=sn, header=None, nrows=15, dtype=str)
            flat = " ".join(str(v) for v in raw.values.flatten() if str(v) != "nan")
            if any(kw in flat for kw in HEADER_KEYWORDS):
                frames.append(read_sheet(fp, sn))
                loaded = True
                break
        if not loaded:
            frames.append(read_sheet(fp))  # フォールバック

    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


# ==============================================================================
# 各ファイル種別のパース
# ==============================================================================

def parse_gaikyo(df):
    """(1) 概況 → {code: {基本情報, 財政指標, 歳入出合計}}"""
    result = {}
    for _, row in df.iterrows():
        code = normalize_code(get_val(row, df, COLS_CODE))
        if not code:
            continue
        name = get_val(row, df, COLS_NAME)
        if not name or str(name) in ("nan", "None"):
            continue

        pref_raw = get_val(row, df, COLS_PREF)
        pref = str(pref_raw).strip() if pref_raw and str(pref_raw) != "nan" else PREF_MAP.get(code[:2], "不明")

        result[code] = {
            "name": str(name).strip(),
            "pref": pref,
            "jinkou": safe_int(get_val(row, df, COLS_JINKOU)),
            "menseki": safe_float(get_val(row, df, COLS_MENSEKI)),
            "sainyuGokei": to_manyen(get_val(row, df, COLS_SAINYU)),
            "saishutsuGokei": to_manyen(get_val(row, df, COLS_SAISHUTSU)),
            "zaiseiRyoku": safe_float(get_val(row, df, COLS_ZAISEI_RYOKU)),
            "ginsokuHi": safe_float(get_val(row, df, COLS_GINSOKU)),
            "jisshitsuKosaiHi": safe_float(get_val(row, df, COLS_KOSAI_HI)),
            "rainenDoHi": safe_float(get_val(row, df, COLS_RAINENDO)),
            "r4_sainyuGokei": to_manyen(get_val(row, df, COLS_R4_SAINYU)),
            "r4_saishutsuGokei": to_manyen(get_val(row, df, COLS_R4_SAISHUTSU)),
        }
    return result


def parse_sainyu(df):
    """(2) 歳入内訳 → {code: {歳入内訳, 税目別}}"""
    result = {}
    for _, row in df.iterrows():
        code = normalize_code(get_val(row, df, COLS_CODE))
        if not code:
            continue

        chihozei = to_manyen(get_val(row, df, COLS_CHIHOZEI))
        kofuzei  = to_manyen(get_val(row, df, COLS_KOFUZEI))
        kokko    = to_manyen(get_val(row, df, COLS_KOKKO))
        chisai   = to_manyen(get_val(row, df, COLS_CHISAI))

        result[code] = {
            "chihoZei": chihozei or 0,
            "chihoKofuzei": kofuzei or 0,
            "kokkoShishutsukin": kokko or 0,
            "chisaiSai": chisai or 0,
            "zeiByZeimoku": {
                "kojinZei":          to_manyen(get_val(row, df, COLS_KOJIN)) or 0,
                "hojinZei":          to_manyen(get_val(row, df, COLS_HOJIN)) or 0,
                "koteishisan":       to_manyen(get_val(row, df, COLS_KOTEI)) or 0,
                "toshibazeikinnyu":  to_manyen(get_val(row, df, COLS_TOSHI)) or 0,
                "sonota": 0,
            },
        }
    return result


def parse_mokuteki(df):
    """(3) 目的別歳出内訳 → {code: {saishuByMokuteki}}"""
    result = {}
    for _, row in df.iterrows():
        code = normalize_code(get_val(row, df, COLS_CODE))
        if not code:
            continue

        result[code] = {
            "minsei":  to_manyen(get_val(row, df, COLS_MINSEI))  or 0,
            "eisei":   to_manyen(get_val(row, df, COLS_EISEI))   or 0,
            "doboku":  to_manyen(get_val(row, df, COLS_DOBOKU))  or 0,
            "kyouiku": to_manyen(get_val(row, df, COLS_KYOUIKU)) or 0,
            "shobo":   to_manyen(get_val(row, df, COLS_SHOBO))   or 0,
            "somu":    to_manyen(get_val(row, df, COLS_SOMU))    or 0,
            "nougyo":  to_manyen(get_val(row, df, COLS_NOUGYO))  or 0,
            "shoukou": to_manyen(get_val(row, df, COLS_SHOUKOU)) or 0,
            "sonota":  0,  # 残差として後で計算
        }
    return result


def parse_seishitsu(df):
    """(4) 性質別歳出内訳 → {code: {saishuBySeishitsu}}"""
    result = {}
    for _, row in df.iterrows():
        code = normalize_code(get_val(row, df, COLS_CODE))
        if not code:
            continue

        result[code] = {
            "jinken":   to_manyen(get_val(row, df, COLS_JINKEN))   or 0,
            "bukken":   to_manyen(get_val(row, df, COLS_BUKKEN))   or 0,
            "iten":     to_manyen(get_val(row, df, COLS_ITEN))     or 0,
            "kokkosai": to_manyen(get_val(row, df, COLS_KOKKOSAI)) or 0,
            "hojo":     to_manyen(get_val(row, df, COLS_HOJO))     or 0,
            "sonota":   0,
        }
    return result


# ==============================================================================
# データのマージ
# ==============================================================================

def merge_all(gaikyo, sainyu, mokuteki, seishitsu):
    """4種類のデータを団体コードで結合して最終辞書リストを作る"""
    all_codes = set(gaikyo.keys())
    municipalities = []

    for code in sorted(all_codes):
        g = gaikyo.get(code, {})
        s = sainyu.get(code, {})
        m = mokuteki.get(code, {})
        se = seishitsu.get(code, {})

        name = g.get("name", "")
        if not name:
            continue

        sainyu_total = g.get("sainyuGokei")
        saishutsu_total = g.get("saishutsuGokei")

        # 歳入「その他」を残差計算
        components = [s.get("chihoZei", 0), s.get("chihoKofuzei", 0),
                      s.get("kokkoShishutsukin", 0), s.get("chisaiSai", 0)]
        sonota_sainyu = (sainyu_total - sum(components)) if sainyu_total else 0

        # 目的別「その他」を残差計算
        mokuteki_vals = [m.get(k, 0) for k in ["minsei","eisei","doboku","kyouiku","shobo","somu","nougyo","shoukou"]]
        sonota_mokuteki = (saishutsu_total - sum(mokuteki_vals)) if saishutsu_total else 0

        # 性質別「その他」を残差計算
        seishitsu_vals = [se.get(k, 0) for k in ["jinken","bukken","iten","kokkosai","hojo"]]
        sonota_seishitsu = (saishutsu_total - sum(seishitsu_vals)) if saishutsu_total else 0

        muni = {
            "id": code,
            "name": name,
            "pref": g.get("pref", PREF_MAP.get(code[:2], "不明")),
            "type": guess_type(code, name),
            "jinkou": g.get("jinkou"),
            "menseki": g.get("menseki"),
            "sainyuGokei": sainyu_total,
            "saishutsuGokei": saishutsu_total,
            "chihoZei": s.get("chihoZei", 0),
            "chihoKofuzei": s.get("chihoKofuzei", 0),
            "kokkoShishutsukin": s.get("kokkoShishutsukin", 0),
            "chisaiSai": s.get("chisaiSai", 0),
            "sonota": sonota_sainyu,
            "ginsokuHi": g.get("ginsokuHi"),
            "jisshitsuKosaiHi": g.get("jisshitsuKosaiHi"),
            "rainenDoHi": g.get("rainenDoHi"),
            "zaiseiRyoku": g.get("zaiseiRyoku"),
            "saishuByMokuteki": {
                "minsei":  m.get("minsei", 0),
                "eisei":   m.get("eisei", 0),
                "doboku":  m.get("doboku", 0),
                "kyouiku": m.get("kyouiku", 0),
                "shobo":   m.get("shobo", 0),
                "somu":    m.get("somu", 0),
                "nougyo":  m.get("nougyo", 0),
                "shoukou": m.get("shoukou", 0),
                "sonota":  sonota_mokuteki,
            },
            "saishuBySeishitsu": {
                "jinken":   se.get("jinken", 0),
                "bukken":   se.get("bukken", 0),
                "iten":     se.get("iten", 0),
                "kokkosai": se.get("kokkosai", 0),
                "hojo":     se.get("hojo", 0),
                "sonota":   sonota_seishitsu,
            },
            "zeiByZeimoku": s.get("zeiByZeimoku", {
                "kojinZei": 0, "hojinZei": 0, "koteishisan": 0,
                "toshibazeikinnyu": 0, "sonota": 0,
            }),
            "r4_sainyuGokei": g.get("r4_sainyuGokei"),
            "r4_saishutsuGokei": g.get("r4_saishutsuGokei"),
        }
        municipalities.append(muni)

    return municipalities


# ==============================================================================
# JS出力
# ==============================================================================

def val_to_js(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        return f'"{v}"'
    if isinstance(v, dict):
        return dict_to_js(v, indent=6)
    return str(v)


def dict_to_js(d, indent=2):
    lines = ["{"]
    items = list(d.items())
    for i, (k, v) in enumerate(items):
        comma = "," if i < len(items) - 1 else ""
        if isinstance(v, dict):
            lines.append(f"{' ' * indent}{k}: {dict_to_js(v, indent + 2)}{comma}")
        else:
            lines.append(f"{' ' * indent}{k}: {val_to_js(v)}{comma}")
    lines.append(f"{' ' * (indent - 2)}}}")
    return "\n".join(lines)


def municipalities_to_js(municipalities):
    entries = []
    prev_pref = None
    for m in municipalities:
        pref = m.get("pref", "")
        if pref != prev_pref:
            entries.append(f"  // {pref}")
            prev_pref = pref
        entries.append(f"  {dict_to_js(m, indent=4)}")

    js = "// 追加データ: 総務省「令和5年度 市町村別決算状況調」\n"
    js += "// src/data.js の MUNICIPALITIES 配列末尾に追加してください\n\n"
    js += "[\n"
    js += ",\n".join(entries)
    js += "\n]\n"
    return js


# ==============================================================================
# コマンドライン
# ==============================================================================

def inspect_files(filepaths):
    for fp in filepaths:
        print(f"\n{'='*60}")
        print(f"ファイル: {fp}")
        xl = pd.ExcelFile(fp)
        for sn in xl.sheet_names:
            try:
                df = pd.read_excel(fp, sheet_name=sn, nrows=10, header=None, dtype=str)
                # ヘッダー行を探す
                header_row = None
                for i, row in df.iterrows():
                    flat = " ".join(str(v) for v in row if str(v) != "nan")
                    if any(kw in flat for kw in HEADER_KEYWORDS):
                        header_row = i
                        break
                if header_row is not None:
                    df2 = pd.read_excel(fp, sheet_name=sn, header=header_row, nrows=2, dtype=str)
                    cols = [c for c in df2.columns if not str(c).startswith("Unnamed")]
                    print(f"\n  [シート] {sn}  (ヘッダー行={header_row})")
                    # 20列ずつ表示
                    for i in range(0, len(cols), 5):
                        print(f"    {cols[i:i+5]}")
                else:
                    print(f"\n  [シート] {sn}  (ヘッダー行不明)")
            except Exception as e:
                print(f"\n  [シート] {sn}  エラー: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="総務省「市町村別決算状況調」複数ExcelをJS形式に変換",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--inspect", nargs="+", metavar="FILE",
                        help="ファイルのシート・列名を表示して終了")
    parser.add_argument("--gaikyo",    nargs="+", metavar="FILE", help="(1) 概況ファイル（複数可）")
    parser.add_argument("--sainyu",    nargs="+", metavar="FILE", help="(2) 歳入内訳ファイル（複数可）")
    parser.add_argument("--mokuteki", nargs="+", metavar="FILE", help="(3) 目的別歳出ファイル（複数可）")
    parser.add_argument("--seishitsu", nargs="+", metavar="FILE", help="(4) 性質別歳出ファイル（複数可）")
    parser.add_argument("-o", "--output", metavar="FILE",
                        help="出力先JSファイル（省略時は標準出力）")
    parser.add_argument("--unit", choices=["千円", "万円", "百万円"], default="千円",
                        help="Excelの金額単位（デフォルト: 千円）")
    parser.add_argument("--skip-existing", action="store_true", default=True,
                        help="既存data.jsのIDをスキップ（デフォルト: ON）")
    parser.add_argument("--all", dest="skip_existing", action="store_false",
                        help="既存IDも含めて出力")
    args = parser.parse_args()

    global UNIT
    UNIT = args.unit

    # inspectモード
    if args.inspect:
        inspect_files(args.inspect)
        return

    # 最低限 --gaikyo は必須
    if not args.gaikyo:
        parser.error("--gaikyo は必須です。--inspect で列名を確認してから指定してください。")

    # 既存IDの収集
    existing_ids = set()
    if args.skip_existing:
        data_js = Path(__file__).parent.parent / "src" / "data.js"
        if data_js.exists():
            content = data_js.read_text()
            existing_ids = set(re.findall(r'id:\s*"(\d+)"', content))
            print(f"[INFO] 既存データ: {len(existing_ids)} 団体（スキップ）", file=sys.stderr)

    # 各ファイルを読み込む
    print("\n[1/4] 概況を読み込み中...", file=sys.stderr)
    gaikyo_data = parse_gaikyo(read_files(args.gaikyo))
    print(f"      → {len(gaikyo_data)} 団体", file=sys.stderr)

    sainyu_data = {}
    if args.sainyu:
        print("[2/4] 歳入内訳を読み込み中...", file=sys.stderr)
        sainyu_data = parse_sainyu(read_files(args.sainyu))
        print(f"      → {len(sainyu_data)} 団体", file=sys.stderr)

    mokuteki_data = {}
    if args.mokuteki:
        print("[3/4] 目的別歳出を読み込み中...", file=sys.stderr)
        mokuteki_data = parse_mokuteki(read_files(args.mokuteki))
        print(f"      → {len(mokuteki_data)} 団体", file=sys.stderr)

    seishitsu_data = {}
    if args.seishitsu:
        print("[4/4] 性質別歳出を読み込み中...", file=sys.stderr)
        seishitsu_data = parse_seishitsu(read_files(args.seishitsu))
        print(f"      → {len(seishitsu_data)} 団体", file=sys.stderr)

    # マージ
    print("\n[マージ中...]", file=sys.stderr)
    municipalities = merge_all(gaikyo_data, sainyu_data, mokuteki_data, seishitsu_data)

    # 既存IDをスキップ
    if existing_ids:
        before = len(municipalities)
        municipalities = [m for m in municipalities if m["id"] not in existing_ids]
        print(f"[INFO] スキップ後: {len(municipalities)} 団体（除外: {before - len(municipalities)}）", file=sys.stderr)

    if not municipalities:
        print("[ERROR] 出力できるデータがありません。", file=sys.stderr)
        sys.exit(1)

    print(f"[完了] {len(municipalities)} 団体を変換します\n", file=sys.stderr)

    js = municipalities_to_js(municipalities)

    if args.output:
        Path(args.output).write_text(js, encoding="utf-8")
        print(f"[OK] {args.output} に出力しました", file=sys.stderr)
    else:
        print(js)


if __name__ == "__main__":
    main()
