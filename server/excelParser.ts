import * as XLSX from "xlsx";

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

function extractAthleteInfo(
  sheet: XLSX.WorkSheet
): {
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

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      if (!cell || !cell.v) continue;

      const value = String(cell.v).trim();

      // 選手名を抽出（【氏名】の隣のセル）
      if (value === "【氏名】") {
        const nameCellAddress = XLSX.utils.encode_cell({ r: row, c: col + 2 });
        const nameCell = sheet[nameCellAddress];
        if (nameCell && nameCell.v) {
          athleteName = String(nameCell.v).trim();
        }
      }

      // 背番号を抽出
      if (value.includes("＃")) {
        const numberPart = value.replace("＃", "").trim();
        const num = parseInt(normalizeFullWidthNumber(numberPart));
        if (!isNaN(num)) {
          athleteNumber = num;
        }
      }

      // ポジション情報を抽出
      if (
        athleteName &&
        !position &&
        !value.includes("＃") &&
        !value.includes("kg") &&
        value.length > 2 &&
        value.length < 30
      ) {
        const keywords = [
          "ヒッター",
          "セッター",
          "リベロ",
          "ミドル",
          "オポジット",
          "アウト",
        ];
        if (keywords.some((k) => value.includes(k))) {
          position = value;
        }
      }

      // PHASE を抽出
      if (value.includes("PHASE")) {
        const nextCell = sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
        if (nextCell && nextCell.v) {
          phase = String(nextCell.v).trim();
        }
      }

      // 期間を抽出
      if (value.includes("期間")) {
        const nextCell = sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
        if (nextCell && nextCell.v) {
          date = String(nextCell.v).trim();
        }
      }

      // 期分けを抽出
      if (value.includes("期分け")) {
        const nextCell = sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
        if (nextCell && nextCell.v) {
          periodCategory = String(nextCell.v).trim();
        }
      }

      // 目的を抽出
      if (value.includes("目的")) {
        const nextCell = sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
        if (nextCell && nextCell.v) {
          goal = String(nextCell.v).trim();
        }
      }
    }
  }

  return {
    athleteName,
    athleteNumber,
    position,
    phase,
    date,
    periodCategory,
    goal,
  };
}

function extractSections(sheet: XLSX.WorkSheet): ParsedSection[] {
  const SECTION_KEYWORDS = [
    "Preparation",
    "Core Training",
    "Power",
    "Lower Body",
    "Upper Body",
    "Specific",
  ];

  const sections: ParsedSection[] = [];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  for (const sectionName of SECTION_KEYWORDS) {
    const section: ParsedSection = {
      category: sectionName,
      exercises: [],
    };

    let inSection = false;
    let lastExerciseName = "";

    for (let row = range.s.r; row <= range.e.r; row++) {
      let rowData: string[] = [];

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        const value = cell && cell.v ? String(cell.v).trim() : "";
        rowData.push(value);
      }

      let firstCell = rowData[0];

      if (firstCell === sectionName || firstCell.startsWith(sectionName)) {
        inSection = true;
        continue;
      }

      if (inSection && SECTION_KEYWORDS.some((k) => firstCell === k)) {
        break;
      }

      if (!inSection) continue;

      if (rowData.every((cell) => !cell)) continue;

      if (firstCell === "種目" || firstCell === "SET" || firstCell === "回数") {
        continue;
      }

      if (firstCell.includes("TOTAL") || firstCell.startsWith("【")) {
        break;
      }

      // セル結合の対応: 種目名が空で、セット数がある場合、直前の種目名を引き継ぐ
      if (!firstCell && lastExerciseName && rowData[3]) {
        const setsStr = normalizeFullWidthNumber(String(rowData[3]));
        const sets = parseInt(setsStr);
        if (!isNaN(sets) && sets > 0) {
          firstCell = lastExerciseName;
        }
      }

      if (firstCell && rowData[3]) {
        const setsStr = normalizeFullWidthNumber(String(rowData[3]));
        const sets = parseInt(setsStr);

        if (!isNaN(sets) && sets > 0) {
          const reps = rowData[4] || "";
          const load = rowData[5] || "";
          const attention = rowData.slice(6).join(" ").trim();

          lastExerciseName = firstCell;

          section.exercises.push({
            name: firstCell,
            sets: sets,
            reps: reps || undefined,
            load: load || undefined,
            attention: attention || undefined,
          });
        }
      }
    }

    if (section.exercises.length > 0) {
      sections.push(section);
    }
  }

  return sections;
}

export type { ParsedProgram };

export async function parseProgramsFromExcel(
  buffer: Buffer
): Promise<ParsedProgram[]> {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const programs: ParsedProgram[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    const athleteInfo = extractAthleteInfo(sheet);
    if (!athleteInfo.athleteName) continue;

    const sections = extractSections(sheet);

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
