// 令和5年度 地方自治体決算データ（サンプルデータ）
// 出典：総務省「令和5年度 市町村別決算状況調」

const PREFS = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県"
];

const MUNICIPALITIES = [
  // 北海道
  {
    id: "01100", name: "札幌市", pref: "北海道", type: "政令指定都市",
    jinkou: 1973395, menseki: 1121.12,
    sainyuGokei: 1210300, saishutsuGokei: 1201100,
    chihoZei: 245000, chihoKofuzei: 310000, kokkoShishutsukin: 180000,
    chisaiSai: 120000, sonota: 355300,
    ginsokuHi: 48.5, jisshitsuKosaiHi: 8.2, rainenDoHi: 95.2,
    zaiseiRyoku: 0.82,
    saishuByMokuteki: {
      minsei: 280000, eisei: 95000, doboku: 145000, kyouiku: 135000,
      shobo: 28000, somu: 98000, nougyo: 12000, shoukou: 35000, sonota: 373100
    },
    saishuBySeishitsu: {
      jinken: 320000, bukken: 180000, iten: 420000, kokkosai: 95000,
      hojo: 68000, sonota: 118100
    },
    zeiByZeimoku: {
      kojinZei: 128000, hojinZei: 45000, koteishisan: 62000, toshibazeikinnyu: 10000, sonota: 0
    },
    r4_sainyuGokei: 1190000, r4_saishutsuGokei: 1182000
  },
  {
    id: "01202", name: "函館市", pref: "北海道", type: "中核市",
    jinkou: 243427, menseki: 677.87,
    sainyuGokei: 165400, saishutsuGokei: 162300,
    chihoZei: 23000, chihoKofuzei: 52000, kokkoShishutsukin: 38000,
    chisaiSai: 18000, sonota: 34400,
    ginsokuHi: 46.2, jisshitsuKosaiHi: 9.1, rainenDoHi: 94.8,
    zaiseiRyoku: 0.48,
    saishuByMokuteki: {
      minsei: 48000, eisei: 14000, doboku: 22000, kyouiku: 18000,
      shobo: 5000, somu: 16000, nougyo: 3000, shoukou: 6000, sonota: 30300
    },
    saishuBySeishitsu: {
      jinken: 44000, bukken: 26000, iten: 60000, kokkosai: 14000,
      hojo: 9000, sonota: 9300
    },
    zeiByZeimoku: {
      kojinZei: 12000, hojinZei: 4500, koteishisan: 6500, toshibazeikinnyu: 0, sonota: 0
    },
    r4_sainyuGokei: 162000, r4_saishutsuGokei: 159500
  },
  {
    id: "01203", name: "小樽市", pref: "北海道", type: "一般市",
    jinkou: 109278, menseki: 243.83,
    sainyuGokei: 72100, saishutsuGokei: 70800,
    chihoZei: 9500, chihoKofuzei: 25000, kokkoShishutsukin: 16000,
    chisaiSai: 8200, sonota: 13400,
    ginsokuHi: 44.1, jisshitsuKosaiHi: 10.3, rainenDoHi: 93.5,
    zaiseiRyoku: 0.39,
    saishuByMokuteki: {
      minsei: 21000, eisei: 6500, doboku: 9500, kyouiku: 8000,
      shobo: 2200, somu: 7200, nougyo: 800, shoukou: 2500, sonota: 13100
    },
    saishuBySeishitsu: {
      jinken: 19000, bukken: 11000, iten: 26000, kokkosai: 6500,
      hojo: 4200, sonota: 4100
    },
    zeiByZeimoku: {
      kojinZei: 5000, hojinZei: 1800, koteishisan: 2700, toshibazeikinnyu: 0, sonota: 0
    },
    r4_sainyuGokei: 70500, r4_saishutsuGokei: 69200
  },
  // 宮城県
  {
    id: "04100", name: "仙台市", pref: "宮城県", type: "政令指定都市",
    jinkou: 1097244, menseki: 786.35,
    sainyuGokei: 720500, saishutsuGokei: 708300,
    chihoZei: 148000, chihoKofuzei: 155000, kokkoShishutsukin: 115000,
    chisaiSai: 72000, sonota: 230500,
    ginsokuHi: 49.8, jisshitsuKosaiHi: 7.8, rainenDoHi: 96.5,
    zaiseiRyoku: 0.91,
    saishuByMokuteki: {
      minsei: 178000, eisei: 58000, doboku: 88000, kyouiku: 82000,
      shobo: 17000, somu: 58000, nougyo: 8000, shoukou: 22000, sonota: 197300
    },
    saishuBySeishitsu: {
      jinken: 195000, bukken: 108000, iten: 248000, kokkosai: 56000,
      hojo: 42000, sonota: 59300
    },
    zeiByZeimoku: {
      kojinZei: 78000, hojinZei: 28000, koteishisan: 38000, toshibazeikinnyu: 4000, sonota: 0
    },
    r4_sainyuGokei: 705000, r4_saishutsuGokei: 693000
  },
  // 埼玉県
  {
    id: "11100", name: "さいたま市", pref: "埼玉県", type: "政令指定都市",
    jinkou: 1337804, menseki: 217.43,
    sainyuGokei: 885200, saishutsuGokei: 868400,
    chihoZei: 192000, chihoKofuzei: 158000, kokkoShishutsukin: 145000,
    chisaiSai: 88000, sonota: 302200,
    ginsokuHi: 50.3, jisshitsuKosaiHi: 7.2, rainenDoHi: 97.8,
    zaiseiRyoku: 1.02,
    saishuByMokuteki: {
      minsei: 225000, eisei: 72000, doboku: 102000, kyouiku: 98000,
      shobo: 20000, somu: 70000, nougyo: 6000, shoukou: 28000, sonota: 247400
    },
    saishuBySeishitsu: {
      jinken: 238000, bukken: 132000, iten: 305000, kokkosai: 68000,
      hojo: 52000, sonota: 73400
    },
    zeiByZeimoku: {
      kojinZei: 102000, hojinZei: 35000, koteishisan: 48000, toshibazeikinnyu: 7000, sonota: 0
    },
    r4_sainyuGokei: 865000, r4_saishutsuGokei: 849000
  },
  {
    id: "11201", name: "川越市", pref: "埼玉県", type: "中核市",
    jinkou: 353767, menseki: 109.12,
    sainyuGokei: 228500, saishutsuGokei: 223100,
    chihoZei: 42000, chihoKofuzei: 58000, kokkoShishutsukin: 42000,
    chisaiSai: 22000, sonota: 64500,
    ginsokuHi: 47.5, jisshitsuKosaiHi: 8.5, rainenDoHi: 95.8,
    zaiseiRyoku: 0.78,
    saishuByMokuteki: {
      minsei: 65000, eisei: 20000, doboku: 28000, kyouiku: 25000,
      shobo: 7000, somu: 19000, nougyo: 3000, shoukou: 8000, sonota: 48100
    },
    saishuBySeishitsu: {
      jinken: 62000, bukken: 36000, iten: 82000, kokkosai: 18000,
      hojo: 14000, sonota: 11100
    },
    zeiByZeimoku: {
      kojinZei: 22000, hojinZei: 8000, koteishisan: 12000, toshibazeikinnyu: 0, sonota: 0
    },
    r4_sainyuGokei: 223000, r4_saishutsuGokei: 218000
  },
  // 千葉県
  {
    id: "12100", name: "千葉市", pref: "千葉県", type: "政令指定都市",
    jinkou: 978218, menseki: 271.77,
    sainyuGokei: 645800, saishutsuGokei: 632400,
    chihoZei: 135000, chihoKofuzei: 138000, kokkoShishutsukin: 108000,
    chisaiSai: 64000, sonota: 200800,
    ginsokuHi: 49.2, jisshitsuKosaiHi: 8.9, rainenDoHi: 96.1,
    zaiseiRyoku: 0.94,
    saishuByMokuteki: {
      minsei: 162000, eisei: 52000, doboku: 75000, kyouiku: 72000,
      shobo: 15000, somu: 52000, nougyo: 5000, shoukou: 18000, sonota: 181400
    },
    saishuBySeishitsu: {
      jinken: 175000, bukken: 96000, iten: 222000, kokkosai: 50000,
      hojo: 38000, sonota: 51400
    },
    zeiByZeimoku: {
      kojinZei: 72000, hojinZei: 25000, koteishisan: 35000, toshibazeikinnyu: 3000, sonota: 0
    },
    r4_sainyuGokei: 630000, r4_saishutsuGokei: 618000
  },
  // 東京都
  {
    id: "13101", name: "千代田区", pref: "東京都", type: "特別区",
    jinkou: 70122, menseki: 11.66,
    sainyuGokei: 172300, saishutsuGokei: 165800,
    chihoZei: 95000, chihoKofuzei: 12000, kokkoShishutsukin: 18000,
    chisaiSai: 8000, sonota: 39300,
    ginsokuHi: 52.8, jisshitsuKosaiHi: 3.1, rainenDoHi: 102.5,
    zaiseiRyoku: 2.15,
    saishuByMokuteki: {
      minsei: 38000, eisei: 12000, doboku: 22000, kyouiku: 18000,
      shobo: 4000, somu: 28000, nougyo: 0, shoukou: 8000, sonota: 35800
    },
    saishuBySeishitsu: {
      jinken: 38000, bukken: 28000, iten: 62000, kokkosai: 8000,
      hojo: 12000, sonota: 17800
    },
    zeiByZeimoku: {
      kojinZei: 35000, hojinZei: 42000, koteishisan: 15000, toshibazeikinnyu: 3000, sonota: 0
    },
    r4_sainyuGokei: 165000, r4_saishutsuGokei: 159000
  },
  {
    id: "13102", name: "中央区", pref: "東京都", type: "特別区",
    jinkou: 176414, menseki: 10.21,
    sainyuGokei: 195800, saishutsuGokei: 188200,
    chihoZei: 98000, chihoKofuzei: 14000, kokkoShishutsukin: 22000,
    chisaiSai: 9500, sonota: 52300,
    ginsokuHi: 53.5, jisshitsuKosaiHi: 3.8, rainenDoHi: 103.2,
    zaiseiRyoku: 2.08,
    saishuByMokuteki: {
      minsei: 42000, eisei: 14000, doboku: 25000, kyouiku: 20000,
      shobo: 5000, somu: 32000, nougyo: 0, shoukou: 9000, sonota: 41200
    },
    saishuBySeishitsu: {
      jinken: 42000, bukken: 32000, iten: 68000, kokkosai: 9500,
      hojo: 14000, sonota: 22700
    },
    zeiByZeimoku: {
      kojinZei: 38000, hojinZei: 40000, koteishisan: 17000, toshibazeikinnyu: 3000, sonota: 0
    },
    r4_sainyuGokei: 188000, r4_saishutsuGokei: 180500
  },
  {
    id: "13113", name: "渋谷区", pref: "東京都", type: "特別区",
    jinkou: 238614, menseki: 15.11,
    sainyuGokei: 242500, saishutsuGokei: 232800,
    chihoZei: 128000, chihoKofuzei: 16000, kokkoShishutsukin: 28000,
    chisaiSai: 12000, sonota: 58500,
    ginsokuHi: 54.2, jisshitsuKosaiHi: 3.5, rainenDoHi: 104.1,
    zaiseiRyoku: 2.35,
    saishuByMokuteki: {
      minsei: 52000, eisei: 18000, doboku: 28000, kyouiku: 22000,
      shobo: 6000, somu: 38000, nougyo: 0, shoukou: 11000, sonota: 57800
    },
    saishuBySeishitsu: {
      jinken: 52000, bukken: 40000, iten: 85000, kokkosai: 12000,
      hojo: 18000, sonota: 25800
    },
    zeiByZeimoku: {
      kojinZei: 52000, hojinZei: 52000, koteishisan: 20000, toshibazeikinnyu: 4000, sonota: 0
    },
    r4_sainyuGokei: 232000, r4_saishutsuGokei: 222500
  },
  // 神奈川県
  {
    id: "14100", name: "横浜市", pref: "神奈川県", type: "政令指定都市",
    jinkou: 3764074, menseki: 437.56,
    sainyuGokei: 2285600, saishutsuGokei: 2241200,
    chihoZei: 485000, chihoKofuzei: 412000, kokkoShishutsukin: 385000,
    chisaiSai: 228000, sonota: 775600,
    ginsokuHi: 51.2, jisshitsuKosaiHi: 7.5, rainenDoHi: 98.2,
    zaiseiRyoku: 1.08,
    saishuByMokuteki: {
      minsei: 598000, eisei: 188000, doboku: 268000, kyouiku: 252000,
      shobo: 52000, somu: 185000, nougyo: 15000, shoukou: 68000, sonota: 615200
    },
    saishuBySeishitsu: {
      jinken: 625000, bukken: 352000, iten: 788000, kokkosai: 178000,
      hojo: 135000, sonota: 163200
    },
    zeiByZeimoku: {
      kojinZei: 258000, hojinZei: 88000, koteishisan: 122000, toshibazeikinnyu: 17000, sonota: 0
    },
    r4_sainyuGokei: 2238000, r4_saishutsuGokei: 2195000
  },
  {
    id: "14130", name: "川崎市", pref: "神奈川県", type: "政令指定都市",
    jinkou: 1546410, menseki: 144.35,
    sainyuGokei: 1025800, saishutsuGokei: 1005200,
    chihoZei: 228000, chihoKofuzei: 168000, kokkoShishutsukin: 172000,
    chisaiSai: 102000, sonota: 355800,
    ginsokuHi: 51.8, jisshitsuKosaiHi: 7.1, rainenDoHi: 98.8,
    zaiseiRyoku: 1.22,
    saishuByMokuteki: {
      minsei: 265000, eisei: 82000, doboku: 118000, kyouiku: 112000,
      shobo: 22000, somu: 82000, nougyo: 5000, shoukou: 28000, sonota: 291200
    },
    saishuBySeishitsu: {
      jinken: 278000, bukken: 158000, iten: 352000, kokkosai: 78000,
      hojo: 62000, sonota: 76200
    },
    zeiByZeimoku: {
      kojinZei: 122000, hojinZei: 55000, koteishisan: 45000, toshibazeikinnyu: 6000, sonota: 0
    },
    r4_sainyuGokei: 1005000, r4_saishutsuGokei: 985000
  },
  // 大阪府
  {
    id: "27100", name: "大阪市", pref: "大阪府", type: "政令指定都市",
    jinkou: 2750999, menseki: 225.33,
    sainyuGokei: 2185400, saishutsuGokei: 2142100,
    chihoZei: 425000, chihoKofuzei: 385000, kokkoShishutsukin: 358000,
    chisaiSai: 218000, sonota: 799400,
    ginsokuHi: 48.8, jisshitsuKosaiHi: 9.2, rainenDoHi: 95.5,
    zaiseiRyoku: 0.98,
    saishuByMokuteki: {
      minsei: 582000, eisei: 178000, doboku: 252000, kyouiku: 238000,
      shobo: 48000, somu: 175000, nougyo: 8000, shoukou: 58000, sonota: 603100
    },
    saishuBySeishitsu: {
      jinken: 598000, bukken: 338000, iten: 752000, kokkosai: 168000,
      hojo: 128000, sonota: 157100
    },
    zeiByZeimoku: {
      kojinZei: 228000, hojinZei: 85000, koteishisan: 105000, toshibazeikinnyu: 7000, sonota: 0
    },
    r4_sainyuGokei: 2138000, r4_saishutsuGokei: 2095000
  },
  {
    id: "27140", name: "堺市", pref: "大阪府", type: "政令指定都市",
    jinkou: 818271, menseki: 149.99,
    sainyuGokei: 548200, saishutsuGokei: 535800,
    chihoZei: 102000, chihoKofuzei: 118000, kokkoShishutsukin: 92000,
    chisaiSai: 54000, sonota: 182200,
    ginsokuHi: 47.2, jisshitsuKosaiHi: 9.8, rainenDoHi: 94.8,
    zaiseiRyoku: 0.85,
    saishuByMokuteki: {
      minsei: 142000, eisei: 45000, doboku: 62000, kyouiku: 58000,
      shobo: 12000, somu: 44000, nougyo: 4000, shoukou: 15000, sonota: 153800
    },
    saishuBySeishitsu: {
      jinken: 148000, bukken: 82000, iten: 188000, kokkosai: 42000,
      hojo: 32000, sonota: 43800
    },
    zeiByZeimoku: {
      kojinZei: 54000, hojinZei: 20000, koteishisan: 26000, toshibazeikinnyu: 2000, sonota: 0
    },
    r4_sainyuGokei: 535000, r4_saishutsuGokei: 523000
  },
  // 愛知県
  {
    id: "23100", name: "名古屋市", pref: "愛知県", type: "政令指定都市",
    jinkou: 2332982, menseki: 326.45,
    sainyuGokei: 1685200, saishutsuGokei: 1652800,
    chihoZei: 368000, chihoKofuzei: 278000, kokkoShishutsukin: 282000,
    chisaiSai: 168000, sonota: 589200,
    ginsokuHi: 51.5, jisshitsuKosaiHi: 8.1, rainenDoHi: 97.5,
    zaiseiRyoku: 1.15,
    saishuByMokuteki: {
      minsei: 438000, eisei: 135000, doboku: 195000, kyouiku: 182000,
      shobo: 38000, somu: 135000, nougyo: 12000, shoukou: 45000, sonota: 472800
    },
    saishuBySeishitsu: {
      jinken: 458000, bukken: 258000, iten: 582000, kokkosai: 128000,
      hojo: 98000, sonota: 128800
    },
    zeiByZeimoku: {
      kojinZei: 195000, hojinZei: 98000, koteishisan: 68000, toshibazeikinnyu: 7000, sonota: 0
    },
    r4_sainyuGokei: 1648000, r4_saishutsuGokei: 1615000
  },
  // 福岡県
  {
    id: "40130", name: "福岡市", pref: "福岡県", type: "政令指定都市",
    jinkou: 1631327, menseki: 343.39,
    sainyuGokei: 1085500, saishutsuGokei: 1062800,
    chihoZei: 228000, chihoKofuzei: 195000, kokkoShishutsukin: 182000,
    chisaiSai: 108000, sonota: 372500,
    ginsokuHi: 50.2, jisshitsuKosaiHi: 8.4, rainenDoHi: 97.2,
    zaiseiRyoku: 1.05,
    saishuByMokuteki: {
      minsei: 278000, eisei: 88000, doboku: 125000, kyouiku: 118000,
      shobo: 25000, somu: 88000, nougyo: 8000, shoukou: 35000, sonota: 297800
    },
    saishuBySeishitsu: {
      jinken: 295000, bukken: 165000, iten: 372000, kokkosai: 82000,
      hojo: 65000, sonota: 83800
    },
    zeiByZeimoku: {
      kojinZei: 122000, hojinZei: 58000, koteishisan: 42000, toshibazeikinnyu: 6000, sonota: 0
    },
    r4_sainyuGokei: 1062000, r4_saishutsuGokei: 1040000
  },
  {
    id: "40202", name: "北九州市", pref: "福岡県", type: "政令指定都市",
    jinkou: 926434, menseki: 491.95,
    sainyuGokei: 648300, saishutsuGokei: 634500,
    chihoZei: 112000, chihoKofuzei: 148000, kokkoShishutsukin: 108000,
    chisaiSai: 64000, sonota: 216300,
    ginsokuHi: 46.8, jisshitsuKosaiHi: 9.5, rainenDoHi: 94.5,
    zaiseiRyoku: 0.78,
    saishuByMokuteki: {
      minsei: 168000, eisei: 52000, doboku: 75000, kyouiku: 72000,
      shobo: 15000, somu: 52000, nougyo: 6000, shoukou: 22000, sonota: 172500
    },
    saishuBySeishitsu: {
      jinken: 178000, bukken: 98000, iten: 222000, kokkosai: 50000,
      hojo: 38000, sonota: 48500
    },
    zeiByZeimoku: {
      kojinZei: 58000, hojinZei: 22000, koteishisan: 30000, toshibazeikinnyu: 2000, sonota: 0
    },
    r4_sainyuGokei: 634000, r4_saishutsuGokei: 621000
  },
  // 京都府
  {
    id: "26100", name: "京都市", pref: "京都府", type: "政令指定都市",
    jinkou: 1459640, menseki: 827.90,
    sainyuGokei: 958500, saishutsuGokei: 938200,
    chihoZei: 188000, chihoKofuzei: 178000, kokkoShishutsukin: 158000,
    chisaiSai: 95000, sonota: 339500,
    ginsokuHi: 48.5, jisshitsuKosaiHi: 9.8, rainenDoHi: 95.1,
    zaiseiRyoku: 0.88,
    saishuByMokuteki: {
      minsei: 248000, eisei: 78000, doboku: 112000, kyouiku: 105000,
      shobo: 22000, somu: 78000, nougyo: 8000, shoukou: 28000, sonota: 258200
    },
    saishuBySeishitsu: {
      jinken: 262000, bukken: 148000, iten: 328000, kokkosai: 72000,
      hojo: 58000, sonota: 69200
    },
    zeiByZeimoku: {
      kojinZei: 98000, hojinZei: 45000, koteishisan: 42000, toshibazeikinnyu: 3000, sonota: 0
    },
    r4_sainyuGokei: 938000, r4_saishutsuGokei: 918500
  },
  // 兵庫県
  {
    id: "28100", name: "神戸市", pref: "兵庫県", type: "政令指定都市",
    jinkou: 1525152, menseki: 557.02,
    sainyuGokei: 1005200, saishutsuGokei: 982800,
    chihoZei: 195000, chihoKofuzei: 188000, kokkoShishutsukin: 168000,
    chisaiSai: 100000, sonota: 354200,
    ginsokuHi: 47.8, jisshitsuKosaiHi: 9.2, rainenDoHi: 95.5,
    zaiseiRyoku: 0.92,
    saishuByMokuteki: {
      minsei: 258000, eisei: 82000, doboku: 115000, kyouiku: 108000,
      shobo: 22000, somu: 82000, nougyo: 8000, shoukou: 28000, sonota: 278800
    },
    saishuBySeishitsu: {
      jinken: 272000, bukken: 152000, iten: 345000, kokkosai: 76000,
      hojo: 58000, sonota: 79800
    },
    zeiByZeimoku: {
      kojinZei: 102000, hojinZei: 45000, koteishisan: 45000, toshibazeikinnyu: 3000, sonota: 0
    },
    r4_sainyuGokei: 985000, r4_saishutsuGokei: 962000
  },
  // 広島県
  {
    id: "34100", name: "広島市", pref: "広島県", type: "政令指定都市",
    jinkou: 1199391, menseki: 906.68,
    sainyuGokei: 785600, saishutsuGokei: 768200,
    chihoZei: 155000, chihoKofuzei: 155000, kokkoShishutsukin: 132000,
    chisaiSai: 78000, sonota: 265600,
    ginsokuHi: 48.2, jisshitsuKosaiHi: 8.8, rainenDoHi: 95.8,
    zaiseiRyoku: 0.88,
    saishuByMokuteki: {
      minsei: 202000, eisei: 65000, doboku: 92000, kyouiku: 85000,
      shobo: 18000, somu: 62000, nougyo: 8000, shoukou: 22000, sonota: 214200
    },
    saishuBySeishitsu: {
      jinken: 212000, bukken: 118000, iten: 268000, kokkosai: 60000,
      hojo: 45000, sonota: 64200
    },
    zeiByZeimoku: {
      kojinZei: 82000, hojinZei: 38000, koteishisan: 32000, toshibazeikinnyu: 3000, sonota: 0
    },
    r4_sainyuGokei: 768000, r4_saishutsuGokei: 751000
  },
  // 静岡県
  {
    id: "22100", name: "静岡市", pref: "静岡県", type: "政令指定都市",
    jinkou: 680018, menseki: 1411.90,
    sainyuGokei: 458200, saishutsuGokei: 448400,
    chihoZei: 88000, chihoKofuzei: 98000, kokkoShishutsukin: 78000,
    chisaiSai: 45000, sonota: 149200,
    ginsokuHi: 47.5, jisshitsuKosaiHi: 8.5, rainenDoHi: 95.5,
    zaiseiRyoku: 0.85,
    saishuByMokuteki: {
      minsei: 118000, eisei: 38000, doboku: 52000, kyouiku: 48000,
      shobo: 10000, somu: 38000, nougyo: 6000, shoukou: 14000, sonota: 124400
    },
    saishuBySeishitsu: {
      jinken: 122000, bukken: 68000, iten: 158000, kokkosai: 35000,
      hojo: 28000, sonota: 37400
    },
    zeiByZeimoku: {
      kojinZei: 46000, hojinZei: 20000, koteishisan: 20000, toshibazeikinnyu: 2000, sonota: 0
    },
    r4_sainyuGokei: 448000, r4_saishutsuGokei: 438500
  }
];

function formatManyen(value) {
  if (value === null || value === undefined) return '—';
  const oku = Math.abs(value) / 10000;
  if (oku >= 10000) {
    return (value / 100000000).toFixed(1) + '兆円';
  } else if (oku >= 1) {
    return oku.toFixed(1) + '億円';
  } else {
    return value.toFixed(0) + '万円';
  }
}

function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  return value.toFixed(1) + '%';
}

function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('ja-JP');
}
