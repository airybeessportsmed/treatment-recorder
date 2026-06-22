import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Edit2, X, UserPlus } from "lucide-react";

interface ParsedProgram {
  athleteName: string;
  athleteNumber?: number;
  position?: string;
  phase?: string;
  date?: string;
  periodCategory?: string;
  goal?: string;
  sections: Array<{
    category: string;
    exercises: Array<{
      name: string;
      sets?: number;
      reps?: string;
      load?: string;
      attention?: string;
    }>;
  }>;
}

interface ProgramFormData {
  athleteId: number;
  date: string;
  phase?: string;
  periodCategory?: string;
  goal?: string;
  bodyWeight?: number;
  totalSets?: number;
  notes?: string;
  sections: Array<{
    category: string;
    sortOrder: number;
    exercises: Array<{
      name: string;
      sets?: number;
      reps?: string;
      load?: string;
      attention?: string;
      sortOrder: number;
    }>;
  }>;
}

interface EditingExercise {
  sectionIdx: number;
  exerciseIdx: number;
  name: string;
  sets?: number;
  reps?: string;
  load?: string;
  attention?: string;
}

interface ProgramWithAthlete extends ParsedProgram {
  selectedAthleteId?: number;
}

export default function ProgramImportConfirm() {
  const [, setLocation] = useLocation();
  const [parsedPrograms, setParsedPrograms] = useState<ProgramWithAthlete[]>([]);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [date, setDate] = useState("");
  const [phase, setPhase] = useState("");
  const [periodCategory, setPeriodCategory] = useState("");
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 重複チェック状態と、アクション選択状態 (i -> action)
  const [duplicateStates, setDuplicateStates] = useState<Record<number, {
    isDuplicate: boolean;
    duplicateType?: "exact" | "partial" | "none";
    existingProgramId?: number;
    existingProgramName?: string;
  }>>({});
  const [importActions, setImportActions] = useState<Record<number, "create" | "overwrite" | "skip">>({});

  // 新規選手クイック作成用および自動マッチング用の状態
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateNumber, setQuickCreateNumber] = useState("");
  const [quickCreatePosition, setQuickCreatePosition] = useState("");
  const [targetProgramIndex, setTargetProgramIndex] = useState<number | null>(null);
  const [autoMatched, setAutoMatched] = useState(false);
  const [batchDateInput, setBatchDateInput] = useState("");

  const utils = trpc.useUtils();
  const { data: athletes } = trpc.athletes.list.useQuery(undefined);
  const { data: exerciseMasters } = trpc.exerciseMaster.list.useQuery({ category: undefined });

  const bulkCreateMutation = trpc.programs.bulkCreate.useMutation({
    onSuccess: (data) => {
      setIsCreating(false);
      toast.success(`${data.results.length}件のプログラムを作成しました`);
      setLocation("/training/programs");
    },
    onError: (e) => {
      setIsCreating(false);
      toast.error("プログラムの作成に失敗しました: " + e.message);
    },
  });

  const createAthleteMutation = trpc.athletes.create.useMutation({
    onSuccess: (data) => {
      toast.success("選手を新規登録しました");
      utils.athletes.list.invalidate();

      // 新しく登録された選手のIDを割り当てる
      if (targetProgramIndex !== null && data.id) {
        const newPrograms = [...parsedPrograms];
        newPrograms[targetProgramIndex].selectedAthleteId = data.id;
        setParsedPrograms(newPrograms);
      }

      setQuickCreateOpen(false);
      setTargetProgramIndex(null);
    },
    onError: (e) => {
      toast.error("選手の登録に失敗しました: " + e.message);
    },
  });

  // sessionStorageから読み込んだプログラムを取得
  useEffect(() => {
    const storedPrograms = sessionStorage.getItem("importedPrograms");
    if (storedPrograms && parsedPrograms.length === 0) {
      try {
        const programs = JSON.parse(storedPrograms);
        setParsedPrograms(programs);
        if (programs.length > 0) {
          setDate(programs[0].date || "");
          setPhase(programs[0].phase || "");
          setPeriodCategory(programs[0].periodCategory || "");
          setBatchDateInput(programs[0].date || "");
        }
      } catch (e) {
        toast.error("セッションデータが無効です");
        setLocation("/training/programs/import");
      }
    }
  }, []);

  // 割り当て選手や日付が変わったときに重複チェックを実行する
  useEffect(() => {
    let active = true;
    const checkAll = async () => {
      if (!athletes || parsedPrograms.length === 0) return;

      const newDuplicateStates: typeof duplicateStates = {};
      const newImportActions = { ...importActions };

      for (let i = 0; i < parsedPrograms.length; i++) {
        const prog = parsedPrograms[i];
        if (!prog.date) {
          continue;
        }

        const exerciseNames = prog.sections.flatMap(sec => sec.exercises.map(ex => ex.name));

        try {
          const res = await utils.client.programs.checkDuplicate.query({
            athleteId: prog.selectedAthleteId,
            athleteNumber: prog.athleteNumber,
            athleteName: prog.athleteName,
            date: prog.date,
            exerciseNames,
          });

          if (res.isDuplicate) {
            newDuplicateStates[i] = {
              isDuplicate: true,
              duplicateType: res.duplicateType,
              existingProgramId: res.existingProgramId,
              existingProgramName: res.existingProgramName,
            };

            if (!importActions[i]) {
              // 完全一致ならデフォルト「スキップ」、部分一致なら「上書き」
              newImportActions[i] = res.duplicateType === "exact" ? "skip" : "overwrite";
            }
          } else {
            newDuplicateStates[i] = { isDuplicate: false };
            if (!importActions[i]) {
              newImportActions[i] = "create";
            }
          }
        } catch (e) {
          console.error("Duplicate check failed for index", i, e);
        }
      }

      if (active) {
        setDuplicateStates(newDuplicateStates);
        setImportActions(newImportActions);
      }
    };

    checkAll();

    return () => {
      active = false;
    };
  }, [parsedPrograms, athletes, utils]);

  // 選手名自動マッチング
  useEffect(() => {
    if (athletes && athletes.length > 0 && parsedPrograms.length > 0 && !autoMatched) {
      const normalize = (s: string) => {
        return s
          .replace(/[\s　・]/g, "")
          .replace(/[﨑𥔎]/g, "崎")
          .replace(/[髙]/g, "高")
          .replace(/[𠮷]/g, "吉")
          .replace(/[澤]/g, "沢")
          .replace(/[嶋]/g, "島")
          .replace(/[眞]/g, "真")
          .replace(/[廣]/g, "広")
          .replace(/[邊邉]/g, "辺")
          .replace(/[齋齋齊]/g, "斉")
          .toLowerCase();
      };
      const updated = parsedPrograms.map((prog) => {
        if (prog.selectedAthleteId) return prog; // すでに割り当てがある場合はそのまま
        const matched = athletes.find(
          (a) => normalize(a.name) === normalize(prog.athleteName)
        );
        return {
          ...prog,
          selectedAthleteId: matched ? matched.id : undefined,
        };
      });
      setParsedPrograms(updated);
      setAutoMatched(true);
    }
  }, [athletes, parsedPrograms, autoMatched]);

  const handleApplyBatchDate = () => {
    if (!batchDateInput) {
      toast.error("日付を選択してください");
      return;
    }
    const updated = parsedPrograms.map((p) => ({
      ...p,
      date: batchDateInput,
    }));
    setParsedPrograms(updated);
    setDate(batchDateInput);
    toast.success("全選手の日付を一括更新しました");
  };

  if (parsedPrograms.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-600" />
          <h2 className="text-lg font-semibold mb-2">データが見つかりません</h2>
          <p className="text-muted-foreground mb-4">
            Excelから読み込んだプログラムデータがセッションに保存されていません
          </p>
          <Button onClick={() => setLocation("/training/programs/import")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            インポートに戻る
          </Button>
        </div>
      </div>
    );
  }

  const currentProgram = parsedPrograms[selectedTabIndex];

  const handleOpenQuickCreate = (index: number) => {
    const prog = parsedPrograms[index];
    setQuickCreateName(prog.athleteName);
    setQuickCreateNumber(prog.athleteNumber ? prog.athleteNumber.toString() : "");
    setQuickCreatePosition(prog.position || "");
    setTargetProgramIndex(index);
    setQuickCreateOpen(true);
  };

  const handleQuickCreateSubmit = () => {
    if (!quickCreateName.trim()) {
      toast.error("選手名を入力してください");
      return;
    }
    createAthleteMutation.mutate({
      name: quickCreateName.trim(),
      number: quickCreateNumber ? parseInt(quickCreateNumber) : undefined,
      position: quickCreatePosition || undefined,
    });
  };

  const handleEditExercise = (sectionIdx: number, exerciseIdx: number) => {
    const exercise = currentProgram.sections[sectionIdx].exercises[exerciseIdx];
    setEditingExercise({
      sectionIdx,
      exerciseIdx,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      load: exercise.load,
      attention: exercise.attention,
    });
    setEditDialogOpen(true);
  };

  const handleSaveExercise = () => {
    if (!editingExercise || !editingExercise.name.trim()) {
      toast.error("種目名を入力してください");
      return;
    }

    const newPrograms = [...parsedPrograms];
    const exercise = newPrograms[selectedTabIndex].sections[editingExercise.sectionIdx].exercises[editingExercise.exerciseIdx];
    exercise.name = editingExercise.name;
    exercise.sets = editingExercise.sets;
    exercise.reps = editingExercise.reps;
    exercise.load = editingExercise.load;
    exercise.attention = editingExercise.attention;

    setParsedPrograms(newPrograms);
    setEditDialogOpen(false);
    setEditingExercise(null);
    toast.success("種目を更新しました");
  };

  const handleAthleteChange = (athleteId: string) => {
    const newPrograms = [...parsedPrograms];
    newPrograms[selectedTabIndex].selectedAthleteId = parseInt(athleteId);
    setParsedPrograms(newPrograms);
  };

  const handleDeleteExercise = (sectionIdx: number, exerciseIdx: number) => {
    const newPrograms = [...parsedPrograms];
    newPrograms[selectedTabIndex].sections[sectionIdx].exercises.splice(exerciseIdx, 1);
    setParsedPrograms(newPrograms);
    toast.success("種目を削除しました");
  };

  const handleCreateAll = () => {
    // スキップ対象外のプログラムのみをインポート対象とする
    const activePrograms = parsedPrograms.filter((_, idx) => importActions[idx] !== "skip");

    if (activePrograms.length === 0) {
      toast.error("作成対象のプログラムがありません（すべてスキップに設定されています）");
      return;
    }

    // 作成対象の中に選手未割り当てのものがないかチェック
    const unassignedCount = activePrograms.filter(p => !p.selectedAthleteId).length;
    if (unassignedCount > 0) {
      toast.error(`作成対象のプログラムのうち、${unassignedCount}件に選手が割り当てられていません`);
      return;
    }

    const programsToCreate: ProgramFormData[] = parsedPrograms
      .map((prog, idx) => {
        const action = importActions[idx] || "create";
        if (action === "skip") return null;

        const dup = duplicateStates[idx];
        const overwriteProgramId = action === "overwrite" ? dup?.existingProgramId : undefined;

        return {
          athleteId: prog.selectedAthleteId!,
          date: prog.date || date,
          phase: prog.phase || phase,
          periodCategory: prog.periodCategory || periodCategory,
          goal: prog.goal,
          overwriteProgramId, // 上書き対象のIDを付与
          sections: prog.sections.map((sec, secIdx) => ({
            category: sec.category,
            sortOrder: secIdx,
            exercises: sec.exercises.map((ex, exIdx) => ({
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              load: ex.load,
              attention: ex.attention,
              sortOrder: exIdx,
            })),
          })),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    setIsCreating(true);
    bulkCreateMutation.mutate(programsToCreate);
  };

  const allAssigned = parsedPrograms.every((p, idx) => importActions[idx] === "skip" || p.selectedAthleteId);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/training/programs/import")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-3xl font-bold mb-2">プログラムを確認・修正</h1>
        <p className="text-muted-foreground">
          {parsedPrograms.length}名のプログラムを確認・修正して、一括作成します
        </p>
      </div>

      {/* 日付一括修正エリア */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">全選手の日付を一括修正</h3>
            <p className="text-xs text-muted-foreground">
              インポートしたすべての選手プログラムの日付を指定した日に一括で上書き変更します。
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <Input
              type="date"
              value={batchDateInput}
              onChange={(e) => setBatchDateInput(e.target.value)}
              className="w-full sm:w-48 bg-background"
            />
            <Button onClick={handleApplyBatchDate} type="button" variant="secondary" className="shrink-0">
              一括適用
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Program List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">プログラム一覧</CardTitle>
              <CardDescription>{parsedPrograms.length}件</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2 pr-4">
                  {parsedPrograms.map((prog, idx) => {
                    const dup = duplicateStates[idx];
                    const action = importActions[idx] || "create";

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedTabIndex(idx)}
                        className={`w-full text-left p-3 rounded-lg border transition relative ${
                          selectedTabIndex === idx
                            ? "bg-primary text-primary-foreground border-primary"
                            : action === "skip"
                            ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-500 opacity-60"
                            : dup?.isDuplicate
                            ? "border-amber-400 bg-amber-50/30 hover:bg-amber-50/50"
                            : "hover:bg-muted border-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{prog.athleteName}</div>
                          {dup?.isDuplicate && (
                            <Badge 
                              className={`text-[9px] px-1.5 py-0 h-4 border-0 font-medium shrink-0 ${
                                dup.duplicateType === "exact"
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : "bg-amber-500 text-white hover:bg-amber-600"
                              }`}
                            >
                              {dup.duplicateType === "exact" ? "完全重複" : "同一日重複"}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] opacity-75 mt-1 flex justify-between items-center">
                          <span>
                            {prog.selectedAthleteId ? "✓ 選手割り当て済" : "選手未割り当て"}
                          </span>
                          {action === "skip" && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">スキップ</span>
                          )}
                          {action === "overwrite" && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">上書き</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Program Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{currentProgram.athleteName}</CardTitle>
              <CardDescription>
                {currentProgram.position && `${currentProgram.position} / `}
                背番号: {currentProgram.athleteNumber || "未設定"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 重複警告とアクション選択 */}
              {duplicateStates[selectedTabIndex]?.isDuplicate && (
                <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  duplicateStates[selectedTabIndex].duplicateType === "exact"
                    ? "bg-red-50/40 border-red-200 text-red-900"
                    : "bg-amber-50/40 border-amber-200 text-amber-900"
                }`}>
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${
                      duplicateStates[selectedTabIndex].duplicateType === "exact" ? "text-red-600" : "text-amber-600"
                    }`} />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-sm">
                        {duplicateStates[selectedTabIndex].duplicateType === "exact"
                          ? "すでに全く同じ日付・種目構成のプログラムが登録されています（完全重複）"
                          : "同一日付にこの選手への別プログラムがすでに登録されています（同一日重複）"}
                      </p>
                      <p className="opacity-80">
                        既存プログラム: {duplicateStates[selectedTabIndex].existingProgramName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t pt-3 mt-1">
                    <label className="text-xs font-bold shrink-0">このプログラムのインポート処理方法:</label>
                    <Select
                      value={importActions[selectedTabIndex] || "create"}
                      onValueChange={(val: "create" | "overwrite" | "skip") => {
                        setImportActions(prev => ({ ...prev, [selectedTabIndex]: val }));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">インポートをスキップする</SelectItem>
                        <SelectItem value="overwrite">既存データを上書きする</SelectItem>
                        <SelectItem value="create">新規プログラムとして追加する</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Athlete Assignment */}
              <div className="space-y-2">
                <Label>選手割り当て</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value={currentProgram.selectedAthleteId?.toString() || ""}
                      onValueChange={handleAthleteChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選手を選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {athletes?.map((athlete) => (
                          <SelectItem key={athlete.id} value={athlete.id.toString()}>
                            {athlete.name} ({athlete.position})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenQuickCreate(selectedTabIndex)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    新規登録
                  </Button>
                </div>
              </div>

              {/* Program Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>日付</Label>
                  <Input
                    type="date"
                    value={currentProgram.date || date}
                    onChange={(e) => {
                      const newPrograms = [...parsedPrograms];
                      newPrograms[selectedTabIndex].date = e.target.value;
                      setParsedPrograms(newPrograms);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>フェーズ</Label>
                  <Input
                    value={currentProgram.phase || phase}
                    onChange={(e) => {
                      const newPrograms = [...parsedPrograms];
                      newPrograms[selectedTabIndex].phase = e.target.value;
                      setParsedPrograms(newPrograms);
                    }}
                  />
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-4">
                <h3 className="font-semibold">セクション</h3>
                {currentProgram.sections.map((section, sectionIdx) => (
                  <Card key={sectionIdx} className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{section.category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {section.exercises.map((exercise, exerciseIdx) => (
                          <div
                            key={exerciseIdx}
                            className="flex items-center justify-between p-3 bg-background rounded-lg border"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">{exercise.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {exercise.sets && `${exercise.sets}SET`}
                                {exercise.reps && ` × ${exercise.reps}`}
                                {exercise.load && ` / ${exercise.load}`}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditExercise(sectionIdx, exerciseIdx)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteExercise(sectionIdx, exerciseIdx)}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom: Create Button */}
      <div className="mt-8 flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => setLocation("/training/programs/import")}
        >
          キャンセル
        </Button>
        <Button
          onClick={handleCreateAll}
          disabled={isCreating || !allAssigned}
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              作成中...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              全員一括作成
            </>
          )}
        </Button>
      </div>

      {/* Edit Exercise Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>種目を編集</DialogTitle>
          </DialogHeader>
          {editingExercise && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>種目名</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="手書き入力"
                    value={editingExercise.name}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        name: e.target.value,
                      })
                    }
                  />
                  <Select
                    value={editingExercise.name}
                    onValueChange={(value) =>
                      setEditingExercise({
                        ...editingExercise,
                        name: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="マスタから選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {exerciseMasters?.map((master) => (
                        <SelectItem key={master.id} value={master.name}>
                          {master.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SET数</Label>
                  <Input
                    type="number"
                    value={editingExercise.sets || ""}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        sets: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>回数</Label>
                  <Input
                    value={editingExercise.reps || ""}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        reps: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>負荷</Label>
                <Input
                  value={editingExercise.load || ""}
                  onChange={(e) =>
                    setEditingExercise({
                      ...editingExercise,
                      load: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>注意点</Label>
                <Input
                  value={editingExercise.attention || ""}
                  onChange={(e) =>
                    setEditingExercise({
                      ...editingExercise,
                      attention: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveExercise}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Create Athlete Dialog */}
      <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選手を新規登録</DialogTitle>
            <DialogDescription>
              Excelのデータを元に選手をシステムへ新規登録します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>氏名</Label>
              <Input
                value={quickCreateName}
                onChange={(e) => setQuickCreateName(e.target.value)}
                placeholder="選手名"
              />
            </div>
            <div className="space-y-2">
              <Label>背番号</Label>
              <Input
                type="number"
                value={quickCreateNumber}
                onChange={(e) => setQuickCreateNumber(e.target.value)}
                placeholder="背番号（任意）"
              />
            </div>
            <div className="space-y-2">
              <Label>ポジション</Label>
              <Input
                value={quickCreatePosition}
                onChange={(e) => setQuickCreatePosition(e.target.value)}
                placeholder="ポジション（任意）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickCreateOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleQuickCreateSubmit}
              disabled={createAthleteMutation.isPending}
            >
              {createAthleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              登録
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
