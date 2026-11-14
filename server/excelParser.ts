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
  sheetName?: string;
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

function formatDateCellValue(cell: XLSX.CellObject): string {
  if (typeof cell.v === "number" && cell.v > 40000 && cell.v < 60000) {
    const parsed = XLSX.SSF.parse_date_code(cell.v);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const raw = String(cell.v).trim();
  const normalized = normalizeFullWidthNumber(raw);
  const match = normalized.match(/^(\d{4})[\/\-年.](\d{1,2})[\/\-月.](\d{1,2})日?$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }
  return raw;
}

function findRightCell(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
  maxCol: number,
  maxOffset = 5
): XLSX.CellObject | undefined {
  for (let offset = 1; offset <= maxOffset && col + offset <= maxCol; offset++) {
    const addr = XLSX.utils.encode_cell({ r: row, c: col + offset });
    const cell = sheet[addr];
    if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== "") {
      return cell;
    }
  }
  return undefined;
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
  let hashRow: number | undefined;
  let hashCol: number | undefined;

  for (let row = range.s.r; row <= Math.min(range.e.r, 15); row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      if (!cell || cell.v === undefined || cell.v === null) continue;

      const value = String(cell.v).trim();
      if (!value) continue;

      // 選手名を抽出（【氏名】や Name ラベルの隣のセル、または同一セル内）
      const isNameLabel =
        value === "【氏名】" ||
        value.includes("【氏名】") ||
        value === "氏名" ||
        value === "【選手名】" ||
        /^(【|\[)?\s*(name|player|athlete)\s*(】|\]|:|：)?$/i.test(value);

      if (isNameLabel && !athleteName) {
        const inlineName = value
          .replace(
            /^(【\s*(氏名|選手名|name|player|athlete)\s*】|\[\s*(name|player|athlete)\s*\]|(氏名|選手名|name|player|athlete)\s*[:：]?)/i,
            ""
          )
          .split(/[＃#]/)[0]
          .trim();

        if (inlineName) {
          athleteName = inlineName;
        } else {
          const nameCell = findRightCell(sheet, row, col, range.e.c, 5);
          if (nameCell && nameCell.v) {
            const candidate = String(nameCell.v).split(/[＃#]/)[0].trim();
            if (candidate && !candidate.startsWith("【")) {
              athleteName = candidate;
            }
          }
        }
      }

      // 背番号を抽出（全角「＃」・半角「#」両対応）
      if (value.includes("＃") || value.includes("#")) {
        const numMatch = value.match(/[＃#]\s*([0-9０-９]+)/);
        if (numMatch) {
          const num = parseInt(normalizeFullWidthNumber(numMatch[1]), 10);
          if (!isNaN(num)) {
            athleteNumber = num;
          }
        }
        if (hashRow === undefined) {
          hashRow = row;
          hashCol = col;
        }
        const beforeHash = value
          .split(/[＃#]/)[0]
          .replace(/【.*?】/g, "")
          .trim();
        if (!athleteName && beforeHash && beforeHash.length >= 1) {
          athleteName = beforeHash;
        }
      }

      // ポジション情報を抽出
      if (
        !position &&
        !value.includes("＃") &&
        !value.includes("#") &&
        !value.includes("kg") &&
        value.length >= 2 &&
        value.length < 30
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
        if (keywords.some((k) => value.toLowerCase().includes(k.toLowerCase()))) {
          position = value;
        }
      }

      // PHASE を抽出
      if (value.toUpperCase().includes("PHASE") && !phase) {
        const nextCell = findRightCell(sheet, row, col, range.e.c, 4);
        if (nextCell && nextCell.v) {
          phase = String(nextCell.v).trim();
        }
      }

      // 期間 / Date を抽出
      if ((value.includes("期間") || /^(【|\[)?\s*(date|period)\s*(】|\]|:|：)?$/i.test(value)) && !date) {
        const nextCell = findRightCell(sheet, row, col, range.e.c, 4);
        if (nextCell && nextCell.v) {
          date = formatDateCellValue(nextCell);
        }
      }

      // 期分けを抽出
      if (value.includes("期分け") && !periodCategory) {
        const nextCell = findRightCell(sheet, row, col, range.e.c, 4);
        if (nextCell && nextCell.v) {
          periodCategory = String(nextCell.v).trim();
        }
      }

      // 目的 / Goal を抽出
      if ((value.includes("目的") || /^(【|\[)?\s*(goal|objective)\s*(】|\]|:|：)?$/i.test(value)) && !goal) {
        const nextCell = findRightCell(sheet, row, col, range.e.c, 4);
        if (nextCell && nextCell.v) {
          goal = String(nextCell.v).trim();
        }
      }
    }
  }

  // 【氏名】ラベルが見つからなかった場合、背番号セル（＃/#）の左側のセルから選手名を探す
  if (!athleteName && hashRow !== undefined && hashCol !== undefined) {
    const ignorePatterns = /^(【.*】|氏名|選手名|name|player|athlete|strength\s*training\s*program|phase|期間|期分け|目的|体重|.*kg.*)$/i;
    for (let c = hashCol - 1; c >= range.s.c; c--) {
      const addr = XLSX.utils.encode_cell({ r: hashRow, c });
      const cell = sheet[addr];
      if (!cell || !cell.v) continue;
      const val = String(cell.v).trim();
      if (val && !ignorePatterns.test(val)) {
        athleteName = val;
        break;
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
  const SECTION_DEFS = [
    { category: "Preparation", prefixes: ["preparation"] },
    { category: "Core Training", prefixes: ["core training", "core"] },
    { category: "Power", prefixes: ["power"] },
    { category: "Lower Body", prefixes: ["lower body"] },
    { category: "Upper Body", prefixes: ["upper body"] },
    { category: "Specific", prefixes: ["specific"] },
  ];

  const sections: ParsedSection[] = [];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  // 全行データを0列目から取得し、SET列の位置を自動検出（デフォルトは3列目=D列）
  const allRows: string[][] = [];
  let setColIdx = 3;
  let foundSetHeader = false;

  for (let row = range.s.r; row <= range.e.r; row++) {
    const rowData: string[] = [];
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      const value = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : "";
      rowData.push(value);

      if (!foundSetHeader && (value.toUpperCase() === "SET" || value.toUpperCase() === "SETS")) {
        setColIdx = col;
        foundSetHeader = true;
      }
    }
    allRows.push(rowData);
  }

  const repsColIdx = setColIdx + 1;
  const loadColIdx = setColIdx + 2;

  function matchSectionCategory(text: string): string | null {
    const lower = text.trim().toLowerCase();
    if (!lower) return null;
    for (const def of SECTION_DEFS) {
      if (def.prefixes.some((p) => lower === p || lower.startsWith(p + " ") || lower.startsWith(p + "（") || lower.startsWith(p + "("))) {
        return def.category;
      }
    }
    return null;
  }

  for (const sectionDef of SECTION_DEFS) {
    const section: ParsedSection = {
      category: sectionDef.category,
      exercises: [],
    };

    let inSection = false;
    let lastExerciseName = "";

    for (const rowData of allRows) {
      // 種目名列（0 〜 setColIdx - 1）の最初の非空セルを取得
      let firstCell = "";
      for (let c = 0; c < setColIdx; c++) {
        if (rowData[c]) {
          firstCell = rowData[c];
          break;
        }
      }

      const rawSetsStr = rowData[setColIdx] ? normalizeFullWidthNumber(String(rowData[setColIdx])) : "";
      const parsedSets = parseInt(rawSetsStr, 10);
      const hasValidSets = !isNaN(parsedSets) && parsedSets > 0;

      const matchedCat = !hasValidSets ? matchSectionCategory(firstCell) : null;

      if (matchedCat === sectionDef.category) {
        inSection = true;
        lastExerciseName = "";
        continue;
      }

      if (inSection && matchedCat && matchedCat !== sectionDef.category) {
        break;
      }

      if (!inSection) continue;

      if (rowData.every((cell) => !cell)) continue;

      if (
        firstCell === "種目" ||
        firstCell.toUpperCase() === "EXERCISE" ||
        firstCell.toUpperCase() === "SET" ||
        firstCell === "回数"
      ) {
        continue;
      }

      if (firstCell.toUpperCase().includes("TOTAL") || firstCell.startsWith("【")) {
        break;
      }

      // セル結合の対応: 種目名が空で、セット数がある場合、直前の種目名を引き継ぐ
      if (!firstCell && lastExerciseName && hasValidSets) {
        firstCell = lastExerciseName;
      }

      if (firstCell && hasValidSets) {
        const reps = rowData[repsColIdx] || "";
        const load = rowData[loadColIdx] || "";
        const attention = rowData.slice(loadColIdx + 1).join(" ").trim();

        lastExerciseName = firstCell;

        section.exercises.push({
          name: firstCell,
          sets: parsedSets,
          reps: reps || undefined,
          load: load || undefined,
          attention: attention || undefined,
        });
      }
    }

    if (section.exercises.length > 0) {
      sections.push(section);
    }
  }

  return sections;
}

export type { ParsedProgram };

function doesSheetNameMatchExtractedName(sheetName: string, extractedName: string): boolean {
  const normSheet = sheetName.toLowerCase().replace(/[\s　・._\-]/g, "");
  const normExtracted = extractedName.toLowerCase().replace(/[\s　・._\-]/g, "");
  if (!normSheet || !normExtracted) return false;
  if (normExtracted.includes(normSheet) || normSheet.includes(normExtracted)) return true;

  const aliases: Array<[string[], string[]]> = [
    [["amand", "amanda"], ["アマンダ", "アマンド", "amand", "amanda"]],
    [["thea"], ["テア", "ティア", "シア", "thea"]],
    [["rosamaria", "montibeller"], ["ロザマリア", "rosamaria", "montibeller"]],
    [["mya", "ayemon", "yemon"], ["イェー", "モン", "ミャ", "mya", "ayemon"]],
  ];
  for (const [keys, vals] of aliases) {
    if (keys.some((k) => normSheet.includes(k)) && vals.some((v) => normExtracted.includes(v))) {
      return true;
    }
  }
  return false;
}

export async function parseProgramsFromExcel(
  buffer: Buffer
): Promise<ParsedProgram[]> {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const programs: ParsedProgram[] = [];

  for (const rawSheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[rawSheetName];
    const cleanSheetName = rawSheetName.trim();
    const isGenericSheetName =
      /^(sheet\d*|template|master|list|summary|blank|sample|テンプレート|マスタ|原本|一覧|集計|見本|印刷)$/i.test(
        cleanSheetName
      );

    const athleteInfo = extractAthleteInfo(sheet);
    const sections = extractSections(sheet);

    let resolvedAthleteName = athleteInfo.athleteName;
    let resolvedAthleteNumber = athleteInfo.athleteNumber;

    if (!resolvedAthleteName) {
      // シート内から氏名が取得できなかった場合、種目データがあるシートならシート名を選手名として採用
      if (!isGenericSheetName && sections.length > 0) {
        resolvedAthleteName = cleanSheetName;
      }
    } else if (
      !isGenericSheetName &&
      /^[A-Za-z][A-Za-z\s._-]*$/.test(cleanSheetName) &&
      !doesSheetNameMatchExtractedName(cleanSheetName, resolvedAthleteName)
    ) {
      // シート名が「Amand」「Thea」等のローマ字選手名でありながら、
      // セル内の氏名が別選手（シート複製元の選手名など）のままになっている場合はシート名を優先する
      resolvedAthleteName = cleanSheetName;
      resolvedAthleteNumber = undefined;
    }

    if (!resolvedAthleteName) continue;

    programs.push({
      athleteName: resolvedAthleteName,
      sheetName: cleanSheetName,
      athleteNumber: resolvedAthleteNumber,
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
