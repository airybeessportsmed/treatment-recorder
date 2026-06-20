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

function extractAthleteInfo(lines: string[]): {
  athleteName: string;
  athleteNumber?: number;
  position?: string;
} {
  let athleteName = "";
  let athleteNumber: number | undefined;
  let position: string | undefined;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 選手名と背番号を抽出（「＃」で分割）
    if (line.includes("＃")) {
      const parts = line.split("＃");
      if (parts.length === 2) {
        const namePart = parts[0].trim();
        const numberPart = parts[1].trim();

        const nameParts = namePart.split(/\s+/);
        if (nameParts.length >= 2) {
          athleteName = nameParts.join(" ");
        }

        const num = parseInt(normalizeFullWidthNumber(numberPart));
        if (!isNaN(num)) {
          athleteNumber = num;
        }
      }
    }

    // ポジション情報を抽出（改行で分割されている場合）
    if (
      athleteName &&
      !position &&
      !line.includes("＃") &&
      !line.includes("kg") &&
      line.length > 2 &&
      line.length < 30
    ) {
      const keywords = [
        "ヒッター",
        "セッター",
        "リベロ",
        "ミドル",
        "オポジット",
        "アウト",
      ];
      if (keywords.some((k) => line.includes(k))) {
        position = line;
      }
    }
  }

  return { athleteName, athleteNumber, position };
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

  const sections: ParsedSection[] = [];
  const exercisesBySection: { [key: string]: string[] } = {};

  // 各セクションの行を集める
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // セクション名を検出
    if (SECTION_KEYWORDS.includes(line)) {
      if (!exercisesBySection[line]) {
        exercisesBySection[line] = [];
      }

      // このセクションの次の行から、次のセクションまでを収集
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();

        // 次のセクション、または終了条件に達したら終了
        if (
          SECTION_KEYWORDS.includes(nextLine) ||
          nextLine.includes("TOTAL") ||
          nextLine.startsWith("【")
        ) {
          break;
        }

        // 空行以外を追加
        if (nextLine && !nextLine.includes("SET") && !nextLine.includes("回数")) {
          exercisesBySection[line].push(nextLine);
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
      sections: sections,
    });
  }

  return programs;
}
