import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '../dist/public');
const outputJsonPath = join(outputDir, 'updates.json');

const clientPublicDir = join(__dirname, '../client/public');
const clientPublicJsonPath = join(clientPublicDir, 'updates.json');

try {
  console.log("[Updates] Generating updates.json from git logs...");
  
  // 直近30件のコミットログを取得
  const gitLog = execSync('git log -n 30 --date=short --format="%ad|%h|%s|%b"').toString();
  const lines = gitLog.trim().split('\n');
  
  const updates = [];
  
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
    
    updates.push({
      id: `update-${hash}`,
      date,
      version: `commit-${hash}`,
      title: subject,
      details: details.length > 0 ? details : [subject],
      isImportant: subject.includes('📈') || subject.includes('🏋️') || subject.includes('✨') || subject.includes('🆕')
    });
  }
  
  // 1. Vite開発環境のpublicディレクトリへ書き出し
  if (!existsSync(clientPublicDir)) {
    mkdirSync(clientPublicDir, { recursive: true });
  }
  writeFileSync(clientPublicJsonPath, JSON.stringify(updates, null, 2));
  console.log(`[Updates] Saved updates.json to client/public/updates.json (${updates.length} items)`);

  // 2. 本番ビルド成果物ディレクトリ（dist/public）が存在すれば、そこへも直接コピー
  if (existsSync(outputDir)) {
    writeFileSync(outputJsonPath, JSON.stringify(updates, null, 2));
    console.log(`[Updates] Saved updates.json to dist/public/updates.json`);
  }
  
} catch (error) {
  console.error("[Updates] Failed to generate updates.json. Using fallback empty array.", error);
  if (!existsSync(clientPublicDir)) {
    mkdirSync(clientPublicDir, { recursive: true });
  }
  writeFileSync(clientPublicJsonPath, JSON.stringify([], null, 2));
}
