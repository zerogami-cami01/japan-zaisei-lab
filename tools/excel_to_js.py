#!/usr/bin/env python3
"""
総務省「市町村別決算状況調」ExcelファイルをJS形式に変換するスクリプト

使い方:
  python3 tools/excel_to_js.py --inspect <excel_file>   # シート・列名の確認
  python3 tools/excel_to_js.py <excel_file>              # JS形式に変換して出力
  python3 tools/excel_to_js.py <excel_file> -o src/data_new.js  # ファイルに出力

対応Excelファイル:
  総務省「令和5年度 市町村別決算状況調」
  https://www.soumu.go.jp/iken/zaisei/r05_shichouson.html
"""

import sys
import re
import json
import argparse
import pandas as pd
from pathlib import Path

# ==============================================================================
# 列名マッピング設定（Excelの列名 → JSのフィールド名）
# ファイルによって列名が異なる場合はここを修正してください
# ==============================================================================

# 団体コード・基本情報
COL_CODE     = ["団体コード", "市区町村コード", "団体コード（6桁）"]
COL_NAME     = ["市区町村名", "団体名", "市町村名"]
COL_PREF     = ["都道府県名", "都道府県"]
COL_TYPE     = ["団体区分", "区分"]
COL_JINKOU   = ["人口（人）", "人口", "総人口"]
COL_MENSEKI  = ["面積（k㎡）", "面積", "面積（km2）", "面積（㎢）"]

# 歳入
COL_SAINYU   = ["歳入合計", "歳入決算額（合計）", "歳入総額"]
COL_CHIHOZEI = ["地方税", "地方税（合計）", "地方税計"]
COL_KOFUZEI  = ["地方交付税", "地方交付税（合計）"]
COL_KOKKO    = ["国庫支出金", "国庫支出金（合計）"]
COL_CHISAI   = ["地方債", "地方債（合計）"]

# 歳出
COL_SAISHUTSU = ["歳出合計", "歳出決算額（合計）", "歳出総額"]

# 目的別歳出
COL_MINSEI   = ["民生費", "民生費（合計）"]
COL_EISEI    = ["衛生費", "衛生費（合計）"]
COL_DOBOKU   = ["土木費", "土木費（合計）"]
COL_KYOUIKU  = ["教育費", "教育費（合計）"]
COL_SHOBO    = ["消防費", "消防費（合計）"]
COL_SOMU     = ["総務費", "総務費（合計）"]
COL_NOUGYO   = ["農林水産業費", "農林水産業費（合計）", "農業費"]
COL_SHOUKOU  = ["商工費", "商工費（合計）"]

# 性質別歳出
COL_JINKEN   = ["人件費", "人件費（合計）"]
COL_BUKKEN   = ["物件費", "物件費（合計）"]
COL_ITEN     = ["扶助費", "移転支出（扶助費）", "扶助費（合計）"]
COL_KOKKOSAI = ["公債費", "公債費（合計）"]
COL_HOJO     = ["補助費等", "補助費（合計）", "補助費・負担金"]

# 税目別
COL_KOJINZEI    = ["個人市民税", "個人住民税", "市区町村民税（個人）"]
COL_HOJINZEI    = ["法人市民税", "法人住民税", "市区町村民税（法人）"]
COL_KOTEISHISAN = ["固定資産税", "固定資産税（合計）"]
COL_TOSHI_ZEI   = ["都市計画税", "都市計画税（合計）"]

# 財政指標
COL_GINSOKU    = ["経常収支比率", "経常収支比率（%）"]
COL_KOSAI_HI   = ["実質公債費比率", "実質公債費比率（%）", "実質公債費比率（3ヵ年平均）"]
COL_RAINENDO   = ["将来負担比率", "将来負担比率（%）"]
COL_ZAISEI_RYOKU = ["財政力指数", "財政力指数（3ヵ年平均）"]

# 前年度データ
COL_R4_SAINYU    = ["前年度歳入合計", "前年度歳入", "歳入合計（前年度）"]
COL_R4_SAISHUTSU = ["前年度歳出合計", "前年度歳出", "歳出合計（前年度）"]

# 数値の単位: "千円" or "万円" (Excelの単位に合わせる)
UNIT = "千円"  # 総務省の市町村別決算状況調は通常千円単位

# ==============================================================================

PREF_TYPE_MAP = {
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


def find_col(df, candidates):
    """候補列名リストからDataFrameに存在する列を探す"""
    for name in candidates:
        if name in df.columns:
            return name
    # 部分一致も試みる
    for name in candidates:
        for col in df.columns:
            if name in str(col) or str(col) in name:
                return col
    return None


def to_manyen(value, unit=UNIT):
    """値を万円単位に変換する（NaN/None は None を返す）"""
    try:
        v = float(value)
        if pd.isna(v):
            return None
        if unit == "千円":
            return round(v / 10)   # 千円 → 万円
        elif unit == "百万円":
            return round(v * 100)  # 百万円 → 万円
        else:
            return round(v)        # 既に万円
    except (TypeError, ValueError):
        return None


def safe_float(value):
    """安全にfloatに変換（失敗時はNone）"""
    try:
        v = float(value)
        return None if pd.isna(v) else round(v, 2)
    except (TypeError, ValueError):
        return None


def guess_entity_type(code_str, name):
    """団体コードと名前から団体区分を推測"""
    code = str(code_str).zfill(6)
    # 東京23区: 13101〜13123
    if code.startswith("13") and 101 <= int(code[2:]) <= 123:
        return "特別区"
    # 政令指定都市（末尾100）
    if code.endswith("100"):
        return "政令指定都市"
    # 名前による判定
    if "区" in str(name) and "区役所" not in str(name):
        return "特別区"
    return "一般市"


def inspect_excel(filepath):
    """Excelファイルのシート・列名・データ件数を表示"""
    print(f"\n=== {filepath} の構成 ===\n")
    xl = pd.ExcelFile(filepath)
    for sheet_name in xl.sheet_names:
        try:
            df = pd.read_excel(filepath, sheet_name=sheet_name, nrows=5)
            print(f"[シート] {sheet_name}  ({len(df.columns)} 列)")
            print("  列名:", list(df.columns[:20]))
            print()
        except Exception as e:
            print(f"[シート] {sheet_name} → 読み込みエラー: {e}\n")


def load_sheet(filepath, sheet_hint=None):
    """
    Excelから適切なシートを読み込む。
    sheet_hint が指定されれば優先、なければ団体コードが含まれるシートを探す。
    """
    xl = pd.ExcelFile(filepath)

    if sheet_hint and sheet_hint in xl.sheet_names:
        return pd.read_excel(filepath, sheet_name=sheet_hint, header=0)

    for sheet_name in xl.sheet_names:
        df = pd.read_excel(filepath, sheet_name=sheet_name, header=None)
        # ヘッダー行を探す（「団体コード」や「市区町村コード」を含む行）
        for i, row in df.head(10).iterrows():
            row_str = " ".join(str(v) for v in row)
            if "団体コード" in row_str or "市区町村コード" in row_str or "市町村名" in row_str:
                df_clean = pd.read_excel(filepath, sheet_name=sheet_name, header=i)
                print(f"[INFO] シート「{sheet_name}」を使用（ヘッダー行: {i}）", file=sys.stderr)
                return df_clean

    # フォールバック: 最初のシートを使う
    print(f"[WARNING] 適切なシートが見つかりません。最初のシートを使用します。", file=sys.stderr)
    return pd.read_excel(filepath, sheet_name=0, header=0)


def parse_municipality(row, df):
    """1行分のデータをJS形式の辞書に変換"""

    def get(candidates):
        col = find_col(df, candidates)
        return row[col] if col else None

    code_raw = get(COL_CODE)
    code = str(code_raw).replace(".0", "").zfill(5) if code_raw else None

    name = get(COL_NAME)
    if not name or pd.isna(str(name)):
        return None

    pref_raw = get(COL_PREF)
    if pref_raw and not pd.isna(str(pref_raw)):
        pref = str(pref_raw).strip()
    elif code:
        pref = PREF_TYPE_MAP.get(code[:2], "不明")
    else:
        pref = "不明"

    type_raw = get(COL_TYPE)
    etype = str(type_raw).strip() if type_raw and not pd.isna(str(type_raw)) else guess_entity_type(code, name)

    jinkou = safe_float(get(COL_JINKOU))
    menseki = safe_float(get(COL_MENSEKI))

    sainyu = to_manyen(get(COL_SAINYU))
    saishutsu = to_manyen(get(COL_SAISHUTSU))
    chihozei = to_manyen(get(COL_CHIHOZEI))
    kofuzei = to_manyen(get(COL_KOFUZEI))
    kokko = to_manyen(get(COL_KOKKO))
    chisai = to_manyen(get(COL_CHISAI))

    # 「その他歳入」を残差計算
    components = [chihozei, kofuzei, kokko, chisai]
    if sainyu and all(v is not None for v in components):
        sonota_sainyu = sainyu - sum(components)
    else:
        sonota_sainyu = None

    # 目的別歳出
    minsei = to_manyen(get(COL_MINSEI))
    eisei = to_manyen(get(COL_EISEI))
    doboku = to_manyen(get(COL_DOBOKU))
    kyouiku = to_manyen(get(COL_KYOUIKU))
    shobo = to_manyen(get(COL_SHOBO))
    somu = to_manyen(get(COL_SOMU))
    nougyo = to_manyen(get(COL_NOUGYO))
    shoukou = to_manyen(get(COL_SHOUKOU))

    mokuteki_vals = [minsei, eisei, doboku, kyouiku, shobo, somu, nougyo, shoukou]
    if saishutsu and all(v is not None for v in mokuteki_vals):
        sonota_mokuteki = saishutsu - sum(mokuteki_vals)
    else:
        sonota_mokuteki = None

    # 性質別歳出
    jinken = to_manyen(get(COL_JINKEN))
    bukken = to_manyen(get(COL_BUKKEN))
    iten = to_manyen(get(COL_ITEN))
    kokkosai = to_manyen(get(COL_KOKKOSAI))
    hojo = to_manyen(get(COL_HOJO))

    seishitsu_vals = [jinken, bukken, iten, kokkosai, hojo]
    if saishutsu and all(v is not None for v in seishitsu_vals):
        sonota_seishitsu = saishutsu - sum(seishitsu_vals)
    else:
        sonota_seishitsu = None

    # 税目別
    kojin = to_manyen(get(COL_KOJINZEI))
    hojin = to_manyen(get(COL_HOJINZEI))
    kotei = to_manyen(get(COL_KOTEISHISAN))
    toshi = to_manyen(get(COL_TOSHI_ZEI))

    # 財政指標
    ginsoku = safe_float(get(COL_GINSOKU))
    kosai_hi = safe_float(get(COL_KOSAI_HI))
    rainendo = safe_float(get(COL_RAINENDO))
    zaisei_ryoku = safe_float(get(COL_ZAISEI_RYOKU))

    # 前年度
    r4_sainyu = to_manyen(get(COL_R4_SAINYU))
    r4_saishutsu = to_manyen(get(COL_R4_SAISHUTSU))

    def nv(v):
        return v if v is not None else 0

    return {
        "id": code,
        "name": str(name).strip(),
        "pref": pref,
        "type": etype,
        "jinkou": int(jinkou) if jinkou else None,
        "menseki": menseki,
        "sainyuGokei": sainyu,
        "saishutsuGokei": saishutsu,
        "chihoZei": nv(chihozei),
        "chihoKofuzei": nv(kofuzei),
        "kokkoShishutsukin": nv(kokko),
        "chisaiSai": nv(chisai),
        "sonota": nv(sonota_sainyu),
        "ginsokuHi": ginsoku,
        "jisshitsuKosaiHi": kosai_hi,
        "rainenDoHi": rainendo,
        "zaiseiRyoku": zaisei_ryoku,
        "saishuByMokuteki": {
            "minsei": nv(minsei),
            "eisei": nv(eisei),
            "doboku": nv(doboku),
            "kyouiku": nv(kyouiku),
            "shobo": nv(shobo),
            "somu": nv(somu),
            "nougyo": nv(nougyo),
            "shoukou": nv(shoukou),
            "sonota": nv(sonota_mokuteki),
        },
        "saishuBySeishitsu": {
            "jinken": nv(jinken),
            "bukken": nv(bukken),
            "iten": nv(iten),
            "kokkosai": nv(kokkosai),
            "hojo": nv(hojo),
            "sonota": nv(sonota_seishitsu),
        },
        "zeiByZeimoku": {
            "kojinZei": nv(kojin),
            "hojinZei": nv(hojin),
            "koteishisan": nv(kotei),
            "toshibazeikinnyu": nv(toshi),
            "sonota": 0,
        },
        "r4_sainyuGokei": r4_sainyu,
        "r4_saishutsuGokei": r4_saishutsu,
    }


def obj_to_js(obj, indent=2):
    """Python辞書をJS風のオブジェクトリテラル文字列に変換"""
    lines = ["{"]
    items = list(obj.items())
    for i, (k, v) in enumerate(items):
        comma = "," if i < len(items) - 1 else ""
        if isinstance(v, dict):
            inner = obj_to_js(v, indent + 2)
            lines.append(f"{' ' * indent}{k}: {inner}{comma}")
        elif isinstance(v, str):
            escaped = v.replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'{" " * indent}{k}: "{escaped}"{comma}')
        elif v is None:
            lines.append(f'{" " * indent}{k}: null{comma}')
        else:
            lines.append(f'{" " * indent}{k}: {v}{comma}')
    lines.append(f"{' ' * (indent - 2)}}}")
    return "\n".join(lines)


def convert(filepath, output=None, sheet=None, skip_existing=True, filter_pref=None):
    """ExcelをJS形式に変換して出力"""
    # 既存データのIDを収集（重複スキップ用）
    existing_ids = set()
    if skip_existing:
        data_js = Path(__file__).parent.parent / "src" / "data.js"
        if data_js.exists():
            content = data_js.read_text()
            existing_ids = set(re.findall(r'id:\s*"(\d+)"', content))
            print(f"[INFO] 既存データ: {len(existing_ids)} 団体 (重複スキップ)", file=sys.stderr)

    df = load_sheet(filepath, sheet_hint=sheet)
    print(f"[INFO] 読み込み行数: {len(df)}", file=sys.stderr)

    municipalities = []
    skip_count = 0
    error_count = 0

    for _, row in df.iterrows():
        try:
            m = parse_municipality(row, df)
            if m is None:
                continue
            if not m["name"] or m["name"] in ("nan", "NaN", "None"):
                continue
            if filter_pref and m["pref"] != filter_pref:
                continue
            if skip_existing and m["id"] in existing_ids:
                skip_count += 1
                continue
            municipalities.append(m)
        except Exception as e:
            error_count += 1
            if error_count <= 5:
                print(f"[WARNING] 変換エラー: {e}", file=sys.stderr)

    print(f"[INFO] 変換成功: {len(municipalities)} 団体, スキップ: {skip_count}, エラー: {error_count}", file=sys.stderr)

    if not municipalities:
        print("[ERROR] 変換できたデータがありません。--inspect で列名を確認してください。", file=sys.stderr)
        sys.exit(1)

    # JS出力
    js_entries = []
    for m in municipalities:
        pref_comment = f"  // {m['pref']}"
        js_entries.append(f"{pref_comment}\n  {obj_to_js(m)}")

    js_output = "// 追加データ: 総務省「令和5年度 市町村別決算状況調」より\n"
    js_output += "// data.js の MUNICIPALITIES 配列にコピー＆ペーストしてください\n\n"
    js_output += "[\n"
    js_output += ",\n".join(js_entries)
    js_output += "\n]\n"

    if output:
        Path(output).write_text(js_output, encoding="utf-8")
        print(f"[OK] {output} に出力しました ({len(municipalities)} 団体)", file=sys.stderr)
    else:
        print(js_output)


def main():
    parser = argparse.ArgumentParser(
        description="総務省「市町村別決算状況調」ExcelをJS形式に変換",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("excel", help="Excelファイルのパス")
    parser.add_argument("--inspect", action="store_true", help="シート・列名を表示して終了")
    parser.add_argument("--sheet", help="読み込むシート名（省略時は自動検出）")
    parser.add_argument("-o", "--output", help="出力ファイルパス（省略時は標準出力）")
    parser.add_argument("--unit", choices=["千円", "万円", "百万円"], default="千円",
                        help="Excelの金額単位（デフォルト: 千円）")
    parser.add_argument("--all", dest="include_existing", action="store_true",
                        help="既存データも含めて出力（デフォルト: 既存IDはスキップ）")
    parser.add_argument("--pref", help="特定都道府県のみ変換（例: 大阪府）")
    args = parser.parse_args()

    global UNIT
    UNIT = args.unit

    if args.inspect:
        inspect_excel(args.excel)
        return

    convert(
        args.excel,
        output=args.output,
        sheet=args.sheet,
        skip_existing=not args.include_existing,
        filter_pref=args.pref,
    )


if __name__ == "__main__":
    main()
