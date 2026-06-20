import { trpc } from "@/lib/trpc";
import { useSearch } from "wouter";
import { useEffect } from "react";

const SECTION_ORDER = ["Preparation", "Core", "Power", "Lower Body", "Upper Body", "Specific"];

// 共通スタイル文字列
const PRINT_STYLES = `
  @media print {
    body { margin: 0; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 10mm; }
    .page-break { page-break-after: always; break-after: page; }
    .page-break:last-child { page-break-after: avoid; break-after: avoid; }
  }
  body { font-family: "Noto Sans JP", "Helvetica Neue", Arial, sans-serif; font-size: 11px; color: #111; }
  .print-container { max-width: 210mm; margin: 0 auto; padding: 8mm; }
  .header-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
  .logo-area { border: 2px solid #333; padding: 4px 8px; font-weight: 900; font-size: 16px; font-style: italic; letter-spacing: 1px; }
  .title-area { flex: 1; }
  .title-main { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
  .title-sub { font-size: 11px; font-weight: 700; letter-spacing: 1px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 10px; border-top: 2px solid #333; padding-top: 6px; }
  .info-row { display: flex; gap: 8px; align-items: baseline; }
  .info-label { font-weight: 700; font-size: 10px; white-space: nowrap; }
  .info-value { font-size: 11px; font-weight: 500; border-bottom: 1px solid #999; min-width: 80px; }
  .section-title { font-size: 12px; font-weight: 900; font-style: italic; margin: 8px 0 2px; text-decoration: underline; }
  .subsection-title { font-size: 10px; font-weight: 700; color: #e07000; margin: 4px 0 2px; font-style: italic; }

  /* テーブル共通 */
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 10px; }
  th { background: #f5c842; padding: 3px 4px; text-align: center; font-weight: 700; border: 1px solid #ccc; font-size: 9px; }
  td { padding: 2px 4px; border: 1px solid #ddd; vertical-align: middle; }
  td.name-cell { font-weight: 500; }
  td.center { text-align: center; }
  td.plan-val { text-align: center; color: #555; font-size: 9px; }

  /* 5マス記録欄 */
  .record-cells { display: flex; gap: 0; }
  .record-cell {
    width: 28px;
    height: 22px;
    border: 1px solid #bbb;
    border-right: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: #aaa;
    background: #fafafa;
  }
  .record-cell:last-child { border-right: 1px solid #bbb; }
  .record-cell-label {
    font-size: 7px;
    color: #999;
    text-align: center;
    line-height: 1;
  }
  td.record-td { padding: 1px 2px; }

  .total-row td { background: #f5c842; font-weight: 700; }
  .batch-header { background: #1a1a2e; color: #fff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
  .print-btn { padding: 8px 20px; background: #4f46e5; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; }
  .back-btn { padding: 8px 16px; background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.4); border-radius: 6px; cursor: pointer; font-size: 13px; }
  .page-break { page-break-after: always; break-after: page; }
  .page-break:last-child { page-break-after: avoid; break-after: avoid; }
`;

// S1〜S5の5マス記録欄コンポーネント
function RecordCells() {
  return (
    <div className="record-cells">
      {["S1", "S2", "S3", "S4", "S5"].map((label) => (
        <div key={label} className="record-cell">
          <div className="record-cell-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

// 1選手分のプログラムレイアウト
function ProgramPage({ program }: { program: any }) {
  const sortedSections = [...(program.sections ?? [])].sort(
    (a: any, b: any) => SECTION_ORDER.indexOf(a.category) - SECTION_ORDER.indexOf(b.category)
  );
  const athlete = program.athlete;

  return (
    <div className="print-container">
      {/* Header */}
      <div className="header-top">
        <div className="logo-area">
          <div style={{ fontSize: 9, letterSpacing: 2 }}>DENSO</div>
          <div>AIRYBEES</div>
        </div>
        <div className="title-area">
          <div className="title-sub">Strength Training Program</div>
          <div className="title-main">Strength Training Program</div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="info-grid">
        <div className="info-row">
          <span className="info-label">【PHASE】</span>
          <span className="info-value">{program.phase ?? ""}</span>
        </div>
        <div className="info-row">
          <span className="info-label">【期分け】</span>
          <span className="info-value" style={{ fontWeight: 900 }}>{program.periodCategory ?? ""}</span>
        </div>
        <div className="info-row">
          <span className="info-label">【期間】</span>
          <span className="info-value">{program.date}</span>
        </div>
        <div className="info-row">
          <span className="info-label">【目的】</span>
          <span className="info-value">{program.goal ?? ""}</span>
        </div>
        <div className="info-row">
          <span className="info-label">【氏名】</span>
          <span className="info-value">{athlete?.name ?? ""}</span>
          <span style={{ marginLeft: 8 }}>#{athlete?.number ?? ""}</span>
        </div>
        <div className="info-row">
          <span className="info-label">【体重】</span>
          <span className="info-value">{program.bodyWeight ? `${program.bodyWeight} kg` : "　　　kg"}</span>
        </div>
        <div className="info-row">
          <span className="info-label">【ポジション】</span>
          <span className="info-value">{athlete?.position ?? ""}</span>
        </div>
      </div>

      {/* Sections */}
      {sortedSections.map((section: any) => {
        const isPreparationOrCore = section.category === "Preparation" || section.category === "Core";
        return (
          <div key={section.id}>
            {isPreparationOrCore ? (
              <>
                {section.category === "Preparation" && (
                  <div className="section-title">Preparation &amp; Core Training</div>
                )}
                <div className="subsection-title">{section.category}</div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "28%", textAlign: "left" }}>種目</th>
                      <th style={{ width: "6%" }}>SET</th>
                      <th style={{ width: "9%" }}>回数</th>
                      <th style={{ width: "13%" }}>負荷(計画)</th>
                      <th style={{ width: "32%", textAlign: "center" }}>実施記録（kg）</th>
                      <th style={{ width: "12%", textAlign: "left" }}>Attention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(section.exercises ?? []).map((ex: any) => (
                      <tr key={ex.id}>
                        <td className="name-cell">{ex.name}</td>
                        <td className="plan-val">{ex.sets ?? ""}</td>
                        <td className="plan-val">{ex.reps ?? ""}</td>
                        <td className="plan-val">{ex.load ?? ""}</td>
                        <td className="record-td"><RecordCells /></td>
                        <td style={{ fontSize: 9 }}>{ex.attention ?? ""}</td>
                      </tr>
                    ))}
                    {/* 空行（手書き用） */}
                    {[...Array(Math.max(0, 3 - (section.exercises?.length ?? 0)))].map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td>&nbsp;</td><td></td><td></td><td></td>
                        <td className="record-td"><RecordCells /></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                {section.category === "Power" && (
                  <div className="section-title">Basic Weight Training</div>
                )}
                <div className="subsection-title">{section.category}</div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "28%", textAlign: "left" }}>種目</th>
                      <th style={{ width: "6%" }}>SET</th>
                      <th style={{ width: "9%" }}>回数</th>
                      <th style={{ width: "13%" }}>負荷(計画)</th>
                      <th style={{ width: "32%", textAlign: "center" }}>実施記録（kg）</th>
                      <th style={{ width: "12%", textAlign: "left" }}>Attention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(section.exercises ?? []).map((ex: any) => (
                      <tr key={ex.id}>
                        <td className="name-cell">{ex.name}</td>
                        <td className="plan-val">{ex.sets ?? ""}</td>
                        <td className="plan-val">{ex.reps ?? ""}</td>
                        <td className="plan-val">{ex.load ?? ""}</td>
                        <td className="record-td"><RecordCells /></td>
                        <td style={{ fontSize: 9 }}>{ex.attention ?? ""}</td>
                      </tr>
                    ))}
                    {/* 空行（手書き用） */}
                    {[...Array(Math.max(0, 2 - (section.exercises?.length ?? 0)))].map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td>&nbsp;</td><td></td><td></td><td></td>
                        <td className="record-td"><RecordCells /></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        );
      })}

      {/* Total */}
      {program.totalSets && (
        <table>
          <tbody>
            <tr className="total-row">
              <td style={{ width: "28%", fontWeight: 900 }}>TOTAL</td>
              <td className="center" style={{ width: "6%", fontWeight: 900 }}>{program.totalSets}</td>
              <td colSpan={4}></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function BatchPrint() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const date = params.get("date") ?? "";

  const { data: programList, isLoading } = trpc.programs.listByDate.useQuery(
    { date },
    { enabled: !!date }
  );

  useEffect(() => {
    if (programList && programList.length > 0) {
      setTimeout(() => window.print(), 800);
    }
  }, [programList]);

  if (!date) return <div style={{ padding: 20 }}>日付が指定されていません</div>;
  if (isLoading) return <div style={{ padding: 20 }}>読み込み中...</div>;
  if (!programList || programList.length === 0) {
    return <div style={{ padding: 20 }}>{date} のプログラムが見つかりません</div>;
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>

      {/* 印刷ボタンバー（画面表示のみ） */}
      <div className="batch-header no-print">
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>一括印刷</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{date} ・ {programList.length}名分</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="back-btn" onClick={() => window.history.back()}>← 戻る</button>
          <button className="print-btn" onClick={() => window.print()}>
            🖨️ 印刷 ({programList.length}枚)
          </button>
        </div>
      </div>

      {/* 各選手のプログラム（印刷時は1枚ずつ改ページ） */}
      {programList.map((program: any, index: number) => (
        <div
          key={program.id}
          className={index < programList.length - 1 ? "page-break" : ""}
        >
          <ProgramPage program={program} />
        </div>
      ))}
    </>
  );
}
