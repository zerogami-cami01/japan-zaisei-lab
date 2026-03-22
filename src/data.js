// 令和5年度 地方自治体決算データ
// Excelインポート前は空。「データ取込」ボタンから総務省Excelを読み込んでください。

const PREFS = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県"
];

const MUNICIPALITIES = [];

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
