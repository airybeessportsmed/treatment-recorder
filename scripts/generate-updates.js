import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '../dist/public');
const outputJsonPath = join(outputDir, 'updates.json');

const clientPublicDir = join(__dirname, '../client/public');
const clientPublicJsonPath = join(clientPublicDir, 'updates.json');

// 過去の手動アップデート履歴（日本語）
const staticUpdates = [
  {
    id: "update-20260616-3",
    date: "2026-06-16",
    version: "v1.6.0",
    title: "📈 選手クイック・カルテ（自動経過サマリー）機能の新規実装",
    details: [
      "選手選択の長押し起動：新規トリートメント記録の選手ボタンを「長押し（ロングプレス）」することで、その選手の過去30日間の自動傾向カルテがすりガラス調ポップアップで起動します。",
      "1秒で全体像を把握：過去30日の合計治療回数、最も治療している部位（プログレスバー表示）、主な処置内容、直近3件のSOAP経過履歴、現在処方中のアクティブなエクササイズが一目で確認可能です。",
      "📈（カルテ）アイコンの連動：ダッシュボードの履歴タイムライン、レポート一覧、エクササイズ共有の選手選択に `📈` アイコンを新設。クリックするだけで同じサマリーを開くことができます。"
    ],
    isImportant: true
  },
  {
    id: "update-20260616-2",
    date: "2026-06-16",
    version: "v1.5.0",
    title: "🏋️ エクササイズ共有機能の洗練アップデート",
    details: [
      "表（テーブル）形式入力：複数メニューをスプレッドシート感覚で並列にサクサク入力できるようになりました。",
      "セッション全体のメディア添付：写真や動画ファイルを各メニュー個別ではなく、セッション全体に対して一括で複数添付できるように簡素化しました。",
      "担当トレーナーカラーの連動：スケジュール管理と同期された固有カラーで「担当トレーナー」を色分けバッジ＆左アクセントボーダーで明示しました。",
      "「新規」「更新」バッジ：24時間以内の新規登録には「新規」、編集更新には「更新」とカードに表示し、最近のアクションを区別しやすくしました。",
      "「完了・非表示（アーカイブ）」：各カードのチェックをクリックするだけで完了に切り替え可能。右上の「完了分を表示/非表示」トグルで, アクティブなものだけをスッキリ一覧表示できます。"
    ],
    isImportant: true
  },
  {
    id: "update-20260616-1",
    date: "2026-06-16",
    version: "v1.4.0",
    title: "🏋️ 選手個別エクササイズ共有ページの新規開設",
    details: [
      "各トレーナーが選手に処方したセルフケアやリハビリプログラム（カテゴリ、目的、ポイント）を、写真や動画を添付して記録・共有できる専用ページをサイドメニューに新設しました。"
    ]
  },
  {
    id: "update-20260615",
    date: "2026-06-15",
    version: "v1.3.1",
    title: "📋 記録詳細ダイアログのスクロール対応",
    details: [
      "治療した部位が非常に多いときや、SOAP記録・コメントが長い場合に、画面サイズによってダイアログの上下が見切れて操作できなくなる問題をスクロール対応により解決しました。"
    ]
  },
  {
    id: "update-20260614",
    date: "2026-06-14",
    version: "v1.3.0",
    title: "📊 スケジュールヒートマップの範囲最適化",
    details: [
      "ヒートマップの範囲を「過去10日前〜当日〜3日後」の計14日間に拡張。未来のトリートメント予定と過去の実績を同時にマッピングしやすくなりました。"
    ]
  },
  {
    id: "update-20260613",
    date: "2026-06-13",
    version: "v1.2.0",
    title: "📅 施術日の遡り記録対応 ＆ チームスケジュール管理機能",
    details: [
      "施術記録を当日に限らず、カレンダーから過去の日付を選択して遡り登録できるよう連動しました。",
      "☀️AM練習/🌙PM練習予定や、担当トレーナーごとのトリートメント割り当てを入力・共有できる「スケジュール管理」画面を新設。",
      "ダッシュボード最上部に1週間のスケジュール盤を配置。Miya #14,#13 のような入力テキストから選手情報を自動解析し、バッジ表示するスマート描画を搭載しました。"
    ],
    isImportant: true
  },
  {
    id: "update-20260610",
    date: "2026-06-10",
    version: "v1.1.0",
    title: "👥 チーム内データ共有 ＆ 個別ログイン・メンバー管理",
    details: [
      "トレーナー間での選手一覧やトリートメント履歴のフィルターを解除し、チーム全員でデータをリアルタイム共有・共同編集可能にしました。",
      "ログイン画面を刷新し、アバターを選択してワンクリックで個別ログイン（担当者名が施術履歴に自動 JOIN 反射）できる仕組みを導入。プロフィールの名前変更や、不要なメンバーの非表示（論理削除）にも対応しました。"
    ]
  },
  {
    id: "update-20260605",
    date: "2026-06-05",
    version: "v1.0.1",
    title: "🔒 ベーシック認証によるセキュリティロック",
    details: [
      "選手たちの個人情報・コンディショニング情報を保護するため、アプリ全体への合い言葉ロック（ベーシック認証）を適用しました。"
    ]
  },
  {
    id: "update-20260528",
    date: "2026-05-28",
    version: "v1.0.0",
    title: "🎨 前面触診マーク付きハイブリッド解剖図キャンバス",
    details: [
      "全身30箇所の全部位で前面・背面切り替えを可能に。フルカラー筋肉解剖図（透過ペン書き込み対応）と、膝蓋骨やPSISなどの前面触診マークを重ね合わせた高性能アノテーションキャンバスを搭載しました。"
    ]
  }
];

try {
  console.log("[Updates] Generating updates.json from git logs...");
  
  // 直近30件のコミットログを取得
  const gitLog = execSync('git log -n 30 --date=short --format="%ad|%h|%s|%b"').toString();
  const lines = gitLog.trim().split('\n');
  
  const dynamicUpdates = [];
  
  for (const line of lines) {
    if (!line) continue;
    
    // パイプでパース
    const parts = line.split('|');
    const date = parts[0];
    const hash = parts[1];
    const subject = parts[2];
    const body = parts.slice(3).join('|').trim();
    
    // システム系・自動マイグレーションコミット等はスキップ
    const skipKeywords = [
      'Update _journal.json',
      'Update package-lock.json',
      'Update pnpm-lock.yaml',
      'Update package.json',
      'Update env.ts',
      'Merge branch',
      'Update walkthrough.md',
      'Update task.md',
      'Update implementation_plan.md'
    ];
    
    const shouldSkip = skipKeywords.some(keyword => subject.startsWith(keyword) || subject.includes(keyword));
    if (shouldSkip) {
      continue;
    }
    
    // コミットボディ（body）があれば行ごとにパースしてディテール配列にする
    const details = body ? body.split('\n').map(d => d.trim()).filter(Boolean) : [];
    
    dynamicUpdates.push({
      id: `update-${hash}`,
      date,
      version: `commit-${hash}`,
      title: subject,
      details: details.length > 0 ? details : [subject],
      isImportant: subject.includes('📈') || subject.includes('🏋️') || subject.includes('✨') || subject.includes('🆕')
    });
  }

  // 静的アップデート（過去データ）と動的アップデートを結合
  // 重複はタイトルやIDで排除
  const mergedUpdates = [...dynamicUpdates];
  
  for (const staticItem of staticUpdates) {
    const isDuplicate = mergedUpdates.some(
      item => item.title === staticItem.title || item.id === staticItem.id
    );
    if (!isDuplicate) {
      mergedUpdates.push(staticItem);
    }
  }

  // 日付順に降順ソート (最新が先頭)
  mergedUpdates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // 1. Vite開発環境のpublicディレクトリへ書き出し
  if (!existsSync(clientPublicDir)) {
    mkdirSync(clientPublicDir, { recursive: true });
  }
  writeFileSync(clientPublicJsonPath, JSON.stringify(mergedUpdates, null, 2));
  console.log(`[Updates] Saved updates.json to client/public/updates.json (${mergedUpdates.length} items)`);

  // 2. 本番ビルド成果物ディレクトリ（dist/public）が存在すれば、そこへも直接コピー
  if (existsSync(outputDir)) {
    writeFileSync(outputJsonPath, JSON.stringify(mergedUpdates, null, 2));
    console.log(`[Updates] Saved updates.json to dist/public/updates.json`);
  }
  
} catch (error) {
  console.error("[Updates] Failed to generate updates.json. Using fallback empty array.", error);
  if (!existsSync(clientPublicDir)) {
    mkdirSync(clientPublicDir, { recursive: true });
  }
  writeFileSync(clientPublicJsonPath, JSON.stringify([], null, 2));
}
