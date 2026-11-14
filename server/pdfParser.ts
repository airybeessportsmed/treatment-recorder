import * as pdf from "pdf-parse";

interface ParsedSection {
  category: string;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: string;
    load?: string;
    attention?: string;
  }>;
}

interface ParsedProgram {
  athleteName: string;
  athleteNumber?: number;
  position?: string;
  phase?: string;
  date?: string;
  periodCategory?: string;
  goal?: string;
  sections: ParsedSection[];
}

function normalizeFullWidthNumber(str: string): string {
  return str
    .replace(/０/g, "0")
    .replace(/１/g, "1")
    .replace(/２/g, "2")
    .replace(/３/g, "3")
    .replace(/４/g, "4")
    .replace(/５/g, "5")
    .replace(/６/g, "6")
    .replace(/７/g, "7")
    .replace(/８/g, "8")
    .replace(/９/g, "9");
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parseFunc = (pdf as any).default || pdf;
  const result = await parseFunc(buffer);
  return result.text;
}

function cleanExtractedName(raw: string): string {
  return raw
    .replace(/Strength\s*Training\s*Program/gi, "")
    .replace(/【\s*(氏名|選手名|name|player|athlete)\s*】/gi, "")
    .replace(/\[\s*(name|player|athlete)\s*\]/gi, "")
    .replace(/^(氏名|選手名|name|player|athlete)\s*[:：]?\s*/i, "")
    .trim();
}

function isMetadataOrHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^(strength\s*training\s*program|preparation|core(\s*training)?|power|lower\s*body|upper\s*body|specific|set|sets|種目|回数|負荷|注意点|total)$/i.test(trimmed)) {
    return true;
  }
  if (/^(【.*】|phase|期間|期分け|目的|体重|date|period|goal)/i.test(trimmed)) {
    return true;
  }
  if (/^\d+(\.\d+)?\s*(kg|cm|%)?$/i.test(normalizeFullWidthNumber(trimmed))) {
    return true;
  }
  if (/^\d{4}[\/\-年.]\d{1,2}[\/\-月.]\d{1,2}/.test(normalizeFullWidthNumber(trimmed))) {
    return true;
  }
  const posKeywords = [
    "ヒッター",
    "セッター",
    "リベロ",
    "ミドル",
    "オポジット",
    "アウト",
    "ブロッカー",
    "Outside",
    "Middle",
    "Opposite",
    "Setter",
    "Libero",
  ];
  if (posKeywords.some((k) => trimmed.toLowerCase().includes(k.toLowerCase()))) {
    return true;
  }
  return false;
}

function extractAthleteInfo(lines: string[]): {
  athleteName: string;
  athleteNumber?: number;
  position?: string;
  phase?: string;
  date?: string;
  periodCategory?: string;
  goal?: string;
} {
  let athleteName = "";
  let athleteNumber: number | undefined;
  let position: string | undefined;
  let phase: string | undefined;
  let date: string | undefined;
  let periodCategory: string | undefined;
  let goal: string | undefined;

  const headerLimit = Math.min(lines.length, 15);

  for (let i = 0; i < headerLimit; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. 【氏名】や【Name】ラベルがある場合
    if (/^(【\s*(氏名|選手名|name)\s*】|\[\s*name\s*\]|(氏名|選手名)\s*[:：])/i.test(line)) {
      const withoutHash = line.split(/[＃#]/)[0];
      const candidate = cleanExtractedName(withoutHash);
      if (candidate) {
        athleteName = candidate.split(/\s+/).join(" ");
      } else if (i + 1 < headerLimit) {
        const nextCandidate = cleanExtractedName(lines[i + 1].split(/[＃#]/)[0]);
        if (nextCandidate && !isMetadataOrHeaderLine(nextCandidate)) {
          athleteName = nextCandidate.split(/\s+/).join(" ");
        }
      }
    }

    // 2. 選手名と背番号を抽出（「＃」または「#」で分割、1単語の外国人選手名 Amand / Thea 等にも対応）
    if (line.includes("＃") || line.includes("#")) {
      const parts = line.split(/[＃#]/);
      if (parts.length >= 2) {
        const namePart = cleanExtractedName(parts[0]);
        const numberPart = parts.slice(1).join("").trim();

        if (namePart.length >= 1) {
          const nameParts = namePart.split(/\s+/).filter(Boolean);
          athleteName = nameParts.join(" ");
        } else if (!athleteName) {
          // 「＃12」が単独行にある場合、直前の非空行から選手名を探す
          for (let prev = i - 1; prev >= 0; prev--) {
            const prevLine = cleanExtractedName(lines[prev]);
            if (prevLine && !isMetadataOrHeaderLine(prevLine)) {
              athleteName = prevLine.split(/\s+/).join(" ");
              break;
            }
          }
        }

        const numMatch = normalizeFullWidthNumber(numberPart).match(/^(\d+)/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (!isNaN(num)) {
            athleteNumber = num;
          }
        }
      }
    }

    // 3. ポジション情報を抽出
    if (
      !position &&
      !line.includes("＃") &&
      !line.includes("#") &&
      !line.includes("kg") &&
      line.length >= 2 &&
      line.length < 30
    ) {
      const keywords = [
        "ヒッター",
        "セッター",
        "リベロ",
        "ミドル",
        "オポジット",
        "アウト",
        "Outside",
        "Middle",
        "Opposite",
        "Setter",
        "Libero",
      ];
      if (keywords.some((k) => line.toLowerCase().includes(k.toLowerCase()))) {
        position = line;
      }
    }

    // 4. PHASE / 期間 / 期分け / 目的 の抽出（PDF内に含まれる場合）
    if (line.toUpperCase().includes("PHASE") && !phase) {
      const cleaned = line.replace(/【?\s*PHASE\s*】?[:：]?/i, "").trim();
      if (cleaned) phase = cleaned;
    }
    if (line.includes("期間") && !date) {
      const cleaned = normalizeFullWidthNumber(line.replace(/【?\s*期間\s*】?[:：]?/, "").trim());
      const dateMatch = cleaned.match(/(\d{4})[\/\-年.](\d{1,2})[\/\-月.](\d{1,2})/);
      if (dateMatch) {
        date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
      }
    }
    if (line.includes("期分け") && !periodCategory) {
      const cleaned = line.replace(/【?\s*期分け\s*】?[:：]?/, "").trim();
      if (cleaned) periodCategory = cleaned;
    }
  }

  // 5. 背番号（「＃」）も【氏名】ラベルも無いページの場合、先頭付近の独立行から選手名を補完
  if (!athleteName) {
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (/^(preparation|core|種目|set)$/i.test(line)) break;
      const cleaned = cleanExtractedName(line);
      if (cleaned && cleaned.length >= 2 && cleaned.length <= 30 && !isMetadataOrHeaderLine(cleaned)) {
        athleteName = cleaned.split(/\s+/).join(" ");
        break;
      }
    }
  }

  return { athleteName, athleteNumber, position, phase, date, periodCategory, goal };
}

function extractSections(lines: string[]): ParsedSection[] {
  const SECTION_KEYWORDS = [
    "Preparation",
    "Core Training",
    "Power",
    "Lower Body",
    "Upper Body",
    "Specific",
  ];

  function normalizeSectionHeader(line: string): string | null {
    const trimmed = line.trim();
    if (SECTION_KEYWORDS.includes(trimmed)) return trimmed;
    if (/^core$/i.test(trimmed)) return "Core Training";
    const found = SECTION_KEYWORDS.find((k) => k.toLowerCase() === trimmed.toLowerCase());
    return found || null;
  }

  const sections: ParsedSection[] = [];
  const exercisesBySection: { [key: string]: string[] } = {};

  // 各セクションの行を集める
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const matchedSection = normalizeSectionHeader(line);

    // セクション名を検出
    if (matchedSection) {
      if (!exercisesBySection[matchedSection]) {
        exercisesBySection[matchedSection] = [];
      }

      // このセクションの次の行から、次のセクションまでを収集
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();

        // 次のセクション、または終了条件に達したら終了
        if (
          normalizeSectionHeader(nextLine) !== null ||
          nextLine.toUpperCase().includes("TOTAL") ||
          nextLine.startsWith("【")
        ) {
          break;
        }

        // 空行以外を追加
        if (nextLine && !nextLine.includes("SET") && !nextLine.includes("回数")) {
          exercisesBySection[matchedSection].push(nextLine);
        }

        j++;
      }
    }
  }

  // 各セクションから種目情報を抽出
  for (const sectionName of SECTION_KEYWORDS) {
    if (!exercisesBySection[sectionName]) continue;

    const section: ParsedSection = {
      category: sectionName,
      exercises: [],
    };

    const lines = exercisesBySection[sectionName];
    let currentExerciseName = "";

    for (const line of lines) {
      const parts = line.split(/[\s\t]+/).filter((p) => p.length > 0);

      if (parts.length === 0) continue;

      // 最初の要素が数字かどうかを確認
      const firstNormalized = normalizeFullWidthNumber(parts[0]);
      const isFirstNumber = /^\d+$/.test(firstNormalized);

      if (isFirstNumber) {
        // 数字で始まる行 = SET数と回数の行
        const sets = parseInt(firstNormalized);
        const reps = parts[1] || "";
        const load = parts[2] || "";
        const attention = parts.slice(3).join(" ");

        // 種目名を使用（前の行から取得）
        if (currentExerciseName) {
          section.exercises.push({
            name: currentExerciseName,
            sets: sets,
            reps: reps || undefined,
            load: load || undefined,
            attention: attention || undefined,
          });
        }
      } else {
        // 数字で始まらない行 = 種目名
        currentExerciseName = line;
      }
    }

    if (section.exercises.length > 0) {
      sections.push(section);
    }
  }

  return sections;
}

export type { ParsedProgram };

export async function parseProgramsFromPDF(
  buffer: Buffer
): Promise<ParsedProgram[]> {
  const fullText = await extractTextFromPDF(buffer);

  // ページを分割（「-- X of Y --」パターン）
  const pages = fullText.split(/-- \d+ of \d+ --/);

  const programs: ParsedProgram[] = [];

  for (const pageText of pages) {
    if (!pageText.trim()) continue;

    const lines = pageText.split("\n");

    // 選手情報を抽出
    const athleteInfo = extractAthleteInfo(lines);
    if (!athleteInfo.athleteName) continue;

    // セクション情報を抽出
    const sections = extractSections(lines);

    programs.push({
      athleteName: athleteInfo.athleteName,
      athleteNumber: athleteInfo.athleteNumber,
      position: athleteInfo.position,
      phase: athleteInfo.phase,
      date: athleteInfo.date,
      periodCategory: athleteInfo.periodCategory,
      goal: athleteInfo.goal,
      sections: sections,
    });
  }

  return programs;
}
