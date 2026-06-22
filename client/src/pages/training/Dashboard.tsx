import { useState, useMemo } from "react";
import { ChangeReasonBadge, type ChangeReason } from "@/components/ChangeReasonBadge";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  ClipboardList,
  BarChart2,
  Camera,
  ArrowRight,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  ChevronDown,
  ChevronUp,
  Activity,
  Database,
  Filter,
} from "lucide-react";
import { useLocation } from "wouter";

// セクションの表示順
const SECTION_ORDER = ["Preparation", "Core", "Power", "Lower Body", "Upper Body", "Specific"];

function LoadChangeBadge({ diff, pct }: { diff: number | null; pct: number | null }) {
  if (diff === null) return null;
  const isUp = diff > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
        isUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      <Icon className="h-3 w-3" />
      {isUp ? "+" : ""}{diff.toFixed(1)}kg
      {pct !== null && ` (${isUp ? "+" : ""}${pct}%)`}
    </span>
  );
}

function AthleteReportCard({
  athlete,
  changesOnly = false,
}: {
  changesOnly?: boolean;
  athlete: {
    athleteId: number;
    athleteName: string;
    athleteNumber: number | null;
    sections: Record<string, Array<{
      exerciseName: string;
      sectionCategory: string;
      plannedSets: number | null;
      plannedReps: string | null;
      plannedLoad: string | null;
      actualSets: number | null;
      actualReps: string | null;
      actualLoad: string | null;
      notes: string | null;
      hasLoadChange: boolean;
      loadDiff: number | null;
      loadDiffPct: number | null;
      changeReason: string | null;
      changeNote: string | null;
    }>>;
    loadChangedCount: number;
    totalExercises: number;
  };
}) {
  const [expanded, setExpanded] = useState(true);
  const [, setLocation] = useLocation();

  // 変更点のみ表示モードのとき、各セクション内も重量変更ありの種目だけ絞り込む
  const filterExercises = (exs: typeof athlete.sections[string]) =>
    changesOnly ? exs.filter(e => e.hasLoadChange) : exs;

  const orderedSections = SECTION_ORDER.filter(s => athlete.sections[s]);
  const otherSections = Object.keys(athlete.sections).filter(s => !SECTION_ORDER.includes(s));
  const allSections = [...orderedSections, ...otherSections];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {athlete.athleteNumber ?? "?"}
            </div>
            <div>
              <p className="font-semibold text-sm">{athlete.athleteName}</p>
              <p className="text-xs text-muted-foreground">
                {athlete.totalExercises}種目記録
                {athlete.loadChangedCount > 0 && (
                  <span className="ml-1 text-orange-600 font-medium">
                    · {athlete.loadChangedCount}種目で重量変更
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {athlete.loadChangedCount > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs">
                重量変更 {athlete.loadChangedCount}件
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          {allSections.map(sectionName => {
            const exercises = filterExercises(athlete.sections[sectionName]);
            if (exercises.length === 0) return null;
            return (
              <div key={sectionName}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 border-b pb-1">
                  {sectionName}
                </p>
                <div className="space-y-1">
                  {exercises.map((ex, i) => (
                    <div
                      key={i}
                      className={`flex items-start justify-between gap-2 text-xs rounded-md px-2 py-1.5 ${
                        ex.hasLoadChange ? "bg-orange-50 border border-orange-200" : "bg-muted/20"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{ex.exerciseName}</span>
                        {ex.changeReason && (
                          <span className="ml-1 inline-block">
                            <ChangeReasonBadge
                              reason={ex.changeReason as ChangeReason}
                              note={ex.changeNote}
                              compact
                            />
                          </span>
                        )}
                        {ex.notes && (
                          <span className="ml-1 text-muted-foreground">— {ex.notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-right">
                        {/* 計画値 */}
                        <div className="text-muted-foreground text-xs">
                          {ex.plannedSets && <span>{ex.plannedSets}set</span>}
                          {ex.plannedReps && <span> × {ex.plannedReps}</span>}
                          {ex.plannedLoad && <span> / {ex.plannedLoad}</span>}
                        </div>
                        {/* 矢印 */}
                        {ex.actualLoad && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            {/* 実績値 */}
                            <span className={`font-bold ${ex.hasLoadChange ? "text-orange-700" : "text-green-700"}`}>
                              {ex.actualLoad}
                            </span>
                            <LoadChangeBadge diff={ex.loadDiff} pct={ex.loadDiffPct} />
                          </>
                        )}
                        {!ex.actualLoad && ex.actualReps && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-green-700">{ex.actualReps}</span>
                          </>
                        )}
                        {!ex.actualLoad && !ex.actualReps && (
                          <span className="text-muted-foreground text-xs italic">記録なし</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  // 統計
  const { data: stats } = trpc.reports.dashboardStats.useQuery();
  const { data: programs } = trpc.programs.list.useQuery({ athleteId: undefined });
  const { data: athletes } = trpc.athletes.list.useQuery();

  // レポート
  const { data: recentDates } = trpc.reports.recentDates.useQuery({ limit: 10 });
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [changesOnly, setChangesOnly] = useState(false);

  // 日付が取得できたら最新日付を自動選択
  const effectiveDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    return recentDates?.[0] ?? "";
  }, [selectedDate, recentDates]);

  const { data: report, isLoading: reportLoading } = trpc.reports.byDate.useQuery(
    { date: effectiveDate },
    { enabled: !!effectiveDate }
  );

  const statCards = [
    {
      title: "登録選手数",
      value: stats?.athleteCount ?? athletes?.length ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "プログラム総数",
      value: stats?.programCount ?? programs?.length ?? 0,
      icon: ClipboardList,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "記録総数",
      value: stats?.recordCount ?? 0,
      icon: Activity,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "OCR読み取り数",
      value: stats?.ocrCount ?? 0,
      icon: Camera,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const quickActions = [
    {
      label: "選手を管理する",
      description: "選手の登録・編集・詳細確認",
      icon: Users,
      path: "/training/athletes",
      color: "bg-blue-600",
    },
    {
      label: "プログラムを作成する",
      description: "新しいトレーニングプログラムを作成",
      icon: ClipboardList,
      path: "/training/programs/create",
      color: "bg-green-600",
    },
    {
      label: "記録・履歴を確認する",
      description: "種目別の重量・回数の推移を確認",
      icon: BarChart2,
      path: "/training/records",
      color: "bg-purple-600",
    },
    {
      label: "写真からOCR読み取り",
      description: "手書き修正した記録用紙を撮影して自動入力",
      icon: Camera,
      path: "/training/ocr",
      color: "bg-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <Dumbbell className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Training Manager</h1>
          <p className="text-sm text-muted-foreground">ラグビーチーム トレーニング記録管理システム</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

        {/* ========== トレーニングレポート ========== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">トレーニングレポート</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* 変更点のみ表示トグル */}
            <button
              onClick={() => setChangesOnly(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                changesOnly
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-muted-foreground border-border hover:border-orange-400 hover:text-orange-600"
              }`}
            >
              <Filter className="h-3 w-3" />
              変更点のみ
            </button>
            {/* 日付セレクター */}
            <Select
              value={effectiveDate}
              onValueChange={setSelectedDate}
            >
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="日付を選択" />
              </SelectTrigger>
              <SelectContent>
                {recentDates?.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!effectiveDate && (
          <Card className="border shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">まだ記録がありません。</p>
              <p className="text-xs mt-1">写真OCRでトレーニング記録を取り込むと、ここにレポートが表示されます。</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setLocation("/training/ocr")}
              >
                <Camera className="h-4 w-4 mr-1" /> OCRで記録を取り込む
              </Button>
            </CardContent>
          </Card>
        )}

        {effectiveDate && reportLoading && (
          <Card className="border shadow-sm">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              読み込み中...
            </CardContent>
          </Card>
        )}

        {effectiveDate && !reportLoading && report && (
          <>
            {/* サマリーバー */}
            <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-muted/30 rounded-lg border text-sm">
              <span className="font-semibold">{report.date}</span>
              <span className="text-muted-foreground">|</span>
              <span>{report.athletes.length}名のデータ</span>
              <span className="text-muted-foreground">|</span>
              <span>{report.totalRecords}種目記録</span>
              {report.totalLoadChanges > 0 && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-orange-600 font-semibold flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {report.totalLoadChanges}種目で重量変更あり
                  </span>
                </>
              )}
              {report.totalLoadChanges === 0 && report.totalRecords > 0 && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <Minus className="h-4 w-4" />
                    重量変更なし（計画通り）
                  </span>
                </>
              )}
            </div>

            {report.athletes.length === 0 && (
              <Card className="border shadow-sm">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  この日付の記録はありません。
                </CardContent>
              </Card>
            )}

            {/* 選手別レポートカード */}
            <div className="space-y-3">
              {report.athletes
                .filter(a => !changesOnly || a.loadChangedCount > 0)
                .map(athlete => (
                  <AthleteReportCard
                    key={athlete.athleteId}
                    athlete={athlete}
                    changesOnly={changesOnly}
                  />
                ))
              }
              {changesOnly && report.athletes.filter(a => a.loadChangedCount > 0).length === 0 && (
                <Card className="border shadow-sm">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    <Minus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    この日は重量変更のある種目がありません（計画通りに実施）。
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* クイックアクション */}
      <div>
        <h2 className="text-lg font-semibold mb-3">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(action.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center shrink-0`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 最近のプログラム */}
      {programs && programs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">最近のプログラム</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/training/programs")}>
              すべて表示 <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {programs.slice(0, 5).map((program) => {
              const athlete = athletes?.find(a => a.id === program.athleteId);
              return (
                <Card
                  key={program.id}
                  className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/training/programs/${program.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {athlete?.number ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{athlete?.name ?? "不明"}</p>
                          <p className="text-xs text-muted-foreground">
                            {program.date} · {program.periodCategory ?? program.phase ?? ""}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
