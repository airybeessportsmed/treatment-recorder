import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Edit2, X, UserPlus, FileText, Filter } from "lucide-react";

interface ParsedProgram {
  athleteName: string;
  sheetName?: string;
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

function normalizeAthleteName(s: string): string {
  return s
    .replace(/[\s　・._\-()（）]/g, "")
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
}

const ATHLETE_ALIASES: Array<{ patterns: string[]; targets: string[] }> = [
  {
    patterns: ["amand", "amanda", "アマンダ", "アマンド"],
    targets: ["amand", "amanda", "アマンダ", "アマンド"],
  },
  {
    patterns: ["thea", "テア", "ティア", "シア"],
    targets: ["thea", "テア", "ティア", "シア"],
  },
  {
    patterns: ["rosamariamontibeller", "rosamaria", "montibeller", "ロザマリア"],
    targets: ["rosamaria", "montibeller", "ロザマリア"],
  },
  {
    patterns: ["ayemonmya", "yemonmya", "mya", "ayemon", "イェーモンミャ", "モンミャ"],
    targets: ["イェーモンミャ", "モンミャ", "ayemonmya", "yemonmya"],
  },
  {
    patterns: ["yamashitaharuna", "harunayamashita", "yamashitahaluna", "halunayamashita"],
    targets: ["山下晴奈"],
  },
  {
    patterns: ["kawabataharuna", "harunakawabata", "kawabatahaluna", "halunakawabata"],
    targets: ["川畑遥奈"],
  },
  {
    patterns: ["fukumotohitomi", "hitomifukumoto", "fukumotohitomy"],
    targets: ["福本眸"],
  },
  {
    patterns: ["nakamotominami", "minaminakamoto"],
    targets: ["中元南"],
  },
  {
    patterns: ["ishikurasaki", "sakiishikura"],
    targets: ["石倉沙姫"],
  },
  {
    patterns: ["yamazakinonoka", "nonokayamazaki"],
    targets: ["山崎のの花"],
  },
  {
    patterns: ["yanagichika", "chikayanagi"],
    targets: ["柳千嘉"],
  },
  {
    patterns: ["nodayuki", "yukinoda"],
    targets: ["野田祐希"],
  },
  {
    patterns: ["yamagamiyuki", "yukiyamagami"],
    targets: ["山上有紀"],
  },
  {
    patterns: ["kawagishiyusa", "yusakawagishi"],
    targets: ["川岸夕紗"],
  },
  {
    patterns: ["wadakanna", "kannawada"],
    targets: ["和田栞菜"],
  },
  {
    patterns: ["osakikotomi", "kotomiosaki", "ohsakikotomi", "kotomiohsaki"],
    targets: ["大崎琴未"],
  },
  {
    patterns: ["setokyoka", "kyokaseto"],
    targets: ["瀬戸杏華"],
  },
];

function findMatchingAthlete<T extends { id: number; name: string; number?: number | null }>(
  prog: { athleteName: string; sheetName?: string; athleteNumber?: number },
  athletes: T[]
): T | undefined {
  const candidates = [prog.athleteName, prog.sheetName].filter((c): c is string => Boolean(c && c.trim()));

  // 1. 正規化後の完全一致
  for (const cand of candidates) {
    const normCand = normalizeAthleteName(cand);
    if (!normCand) continue;
    const exact = athletes.find((a) => normalizeAthleteName(a.name) === normCand);
    if (exact) return exact;
  }

  // 2. ローマ字・カタカナ・英語名エイリアス一致 (Amand, Thea 等)
  for (const cand of candidates) {
    const normCand = normalizeAthleteName(cand);
    if (!normCand) continue;
    for (const entry of ATHLETE_ALIASES) {
      const isMatch = entry.patterns.some(
        (p) => normCand === p || (p.length >= 4 && normCand.includes(p)) || (normCand.length >= 4 && p.includes(normCand))
      );
      if (isMatch) {
        const found = athletes.find((a) => {
          const normA = normalizeAthleteName(a.name);
          return entry.targets.some((t) => normA === t || normA.includes(t) || t.includes(normA));
        });
        if (found) return found;
      }
    }
  }

  // 3. 部分一致・前方一致（"Amand" -> "Amanda ..."、"Thea" -> "Thea ..." など）
  for (const cand of candidates) {
    const normCand = normalizeAthleteName(cand);
    if (normCand.length < 2) continue;
    const partial = athletes.find((a) => {
      const normA = normalizeAthleteName(a.name);
      return normA.length >= 2 && (normA.includes(normCand) || (normCand.length >= 3 && normCand.includes(normA)));
    });
    if (partial) return partial;
  }

  // 4. 背番号による一致
  if (prog.athleteNumber && prog.athleteNumber > 0) {
    const byNumber = athletes.find((a) => a.number === prog.athleteNumber);
    if (byNumber) return byNumber;
  }

  return undefined;
}

function extractDateFromFileName(fileName: string): string {
  const m1 = fileName.match(/(20\d{2})[\-_/.年](\d{1,2})[\-_/.月](\d{1,2})/);
  if (m1) {
    return `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;
  }
  const m2 = fileName.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (m2) {
    return `${m2[1]}-${m2[2]}-${m2[3]}`;
  }
  return "";
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
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (user?.trainingRole === "read") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>この機能にアクセスする権限がありません。</p>
      </div>
    );
  }
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
  const [manualActionOverrides, setManualActionOverrides] = useState<Record<number, boolean>>({});
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showOnlyUnregistered, setShowOnlyUnregistered] = useState(false);

  // 新規選手クイック作成用および自動マッチング用の状態
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateNumber, setQuickCreateNumber] = useState("");
  const [quickCreatePosition, setQuickCreatePosition] = useState("");
  const [targetProgramIndex, setTargetProgramIndex] = useState<number | null>(null);
  const [autoMatched, setAutoMatched] = useState(false);
  const [batchDateInput, setBatchDateInput] = useState("");
  const [importedFileName, setImportedFileName] = useState("");
  const [batchPhaseInput, setBatchPhaseInput] = useState("");

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
    const storedFileName = sessionStorage.getItem("importedFileName");
    if (storedFileName) {
      setImportedFileName(storedFileName);
    }
    if (storedPrograms && parsedPrograms.length === 0) {
      try {
        const programs: ProgramWithAthlete[] = JSON.parse(storedPrograms);
        const fallbackFileDate = storedFileName ? extractDateFromFileName(storedFileName) : "";
        const initialDate = programs[0]?.date || fallbackFileDate || "";
        const normalizedPrograms = initialDate
          ? programs.map((p) => ({ ...p, date: p.date || initialDate }))
          : programs;

        setParsedPrograms(normalizedPrograms);
        if (normalizedPrograms.length > 0) {
          setDate(initialDate);
          setPhase(normalizedPrograms[0].phase || "");
          setPeriodCategory(normalizedPrograms[0].periodCategory || "");
          setBatchDateInput(initialDate);
          setBatchPhaseInput(normalizedPrograms[0].phase || "");
        }
      } catch (e) {
        toast.error("セッションデータが無効です");
        setLocation("/training/programs/import");
      }
    }
  }, []);

  // 選手名自動マッチング（ローマ字・カタカナ・部分一致・背番号対応）
  useEffect(() => {
    if (athletes && athletes.length > 0 && parsedPrograms.length > 0 && !autoMatched) {
      const updated = parsedPrograms.map((prog) => {
        if (prog.selectedAthleteId) return prog;
        const matched = findMatchingAthlete(prog, athletes);
        return {
          ...prog,
          selectedAthleteId: matched ? matched.id : undefined,
        };
      });
      setParsedPrograms(updated);
      setAutoMatched(true);
    }
  }, [athletes, parsedPrograms, autoMatched]);

  // 割り当て選手や日付が変わったときに重複チェックを実行する
  useEffect(() => {
    let active = true;
    const checkAll = async () => {
      if (!athletes || parsedPrograms.length === 0 || !autoMatched) return;

      const hasAnyDate = parsedPrograms.some((p) => Boolean(p.date || date));
      if (!hasAnyDate) return;

      setIsCheckingDuplicates(true);
      const newDuplicateStates: typeof duplicateStates = {};
      const newImportActions: Record<number, "create" | "overwrite" | "skip"> = {};

      await Promise.all(
        parsedPrograms.map(async (prog, i) => {
          const targetDate = prog.date || date;
          if (!targetDate) {
            newDuplicateStates[i] = { isDuplicate: false };
            newImportActions[i] = manualActionOverrides[i] ? (importActions[i] || "create") : "create";
            return;
          }

          const exerciseNames = prog.sections.flatMap((sec) => sec.exercises.map((ex) => ex.name));

          try {
            const res = await utils.client.programs.checkDuplicate.query({
              athleteId: prog.selectedAthleteId,
              athleteNumber: prog.athleteNumber,
              athleteName: prog.athleteName,
              date: targetDate,
              exerciseNames,
            });

            if (res.isDuplicate) {
              newDuplicateStates[i] = {
                isDuplicate: true,
                duplicateType: res.duplicateType,
                existingProgramId: res.existingProgramId,
                existingProgramName: res.existingProgramName,
              };

              // すでに同じ日付にプログラムが登録されている選手は、手動変更がない限り自動的に「スキップ」にする
              if (manualActionOverrides[i] && importActions[i]) {
                newImportActions[i] = importActions[i];
              } else {
                newImportActions[i] = "skip";
              }
            } else {
              newDuplicateStates[i] = { isDuplicate: false };
              if (manualActionOverrides[i] && importActions[i]) {
                newImportActions[i] = importActions[i];
              } else {
                newImportActions[i] = "create";
              }
            }
          } catch (e) {
            console.error("Duplicate check failed for index", i, e);
            newDuplicateStates[i] = { isDuplicate: false };
            newImportActions[i] = importActions[i] || "create";
          }
        })
      );

      if (active) {
        setDuplicateStates(newDuplicateStates);
        setImportActions(newImportActions);
        setIsCheckingDuplicates(false);
      }
    };

    checkAll();

    return () => {
      active = false;
    };
  }, [parsedPrograms, athletes, autoMatched, date, utils]);

  const applyBatchDateValue = (newDate: string, showToast = false) => {
    setBatchDateInput(newDate);
    if (!newDate) return;
    setManualActionOverrides({});
    const updated = parsedPrograms.map((p) => ({
      ...p,
      date: newDate,
    }));
    setParsedPrograms(updated);
    setDate(newDate);
    if (showToast) {
      toast.success("全選手の日付を一括更新し、登録済みプログラムの重複チェックを行いました");
    }
  };

  const handleApplyBatchDate = () => {
    if (!batchDateInput) {
      toast.error("日付を選択してください");
      return;
    }
    applyBatchDateValue(batchDateInput, true);
  };

  const handleSelectOnlyUnregistered = () => {
    const nextActions: Record<number, "create" | "overwrite" | "skip"> = {};
    const nextOverrides: Record<number, boolean> = {};
    let createCount = 0;
    let skipCount = 0;

    parsedPrograms.forEach((_, idx) => {
      if (duplicateStates[idx]?.isDuplicate) {
        nextActions[idx] = "skip";
        skipCount++;
      } else {
        nextActions[idx] = "create";
        createCount++;
      }
      nextOverrides[idx] = true;
    });

    setImportActions(nextActions);
    setManualActionOverrides(nextOverrides);
    // 最初の未登録選手にタブを移動
    const firstUnregisteredIdx = parsedPrograms.findIndex((_, idx) => !duplicateStates[idx]?.isDuplicate);
    if (firstUnregisteredIdx !== -1) {
      setSelectedTabIndex(firstUnregisteredIdx);
    }
    toast.success(`登録済みの${skipCount}名をスキップし、未登録の${createCount}名のみを追加対象にしました`);
  };

  const handleApplyBatchPhase = () => {
    if (!batchPhaseInput.trim()) {
      toast.error("フェーズを入力してください");
      return;
    }
    const updated = parsedPrograms.map((p) => ({
      ...p,
      phase: batchPhaseInput.trim(),
    }));
    setParsedPrograms(updated);
    setPhase(batchPhaseInput.trim());
    toast.success("全選手のフェーズを一括更新しました");
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

    // 日付未設定のチェック
    const missingDateCount = activePrograms.filter((p) => !(p.date || date)).length;
    if (missingDateCount > 0) {
      toast.error("日付が設定されていません。上部の「全選手の日付を一括修正」から日付を選択してください");
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

  const activeCount = parsedPrograms.filter((_, idx) => (importActions[idx] || "create") !== "skip").length;
  const skippedCount = parsedPrograms.length - activeCount;
  const duplicateCount = parsedPrograms.filter((_, idx) => duplicateStates[idx]?.isDuplicate).length;
  const unregisteredPrograms = parsedPrograms
    .map((prog, idx) => ({ prog, idx }))
    .filter(({ idx }) => !duplicateStates[idx]?.isDuplicate);
  const hasAnyDate = parsedPrograms.some((p) => Boolean(p.date || date));
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

      {/* インポート情報 ＆ 一括修正エリア */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="p-5 space-y-4">
          {/* ファイル名表示 */}
          {importedFileName && (
            <div className="flex items-center gap-2 pb-3 border-b border-primary/10">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground">インポート元ファイル:</span>
              <Badge variant="secondary" className="font-mono text-xs bg-background border border-primary/10 px-2 py-0.5">
                {importedFileName}
              </Badge>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 日付一括適用 */}
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">全選手の日付を一括設定・修正</h3>
                <p className="text-xs text-muted-foreground">
                  日付を選択すると全選手に適用され、同じ日付の登録済みプログラムが自動判定（スキップ）されます。
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Input
                  type="date"
                  value={batchDateInput}
                  onChange={(e) => applyBatchDateValue(e.target.value, false)}
                  className="bg-background"
                />
                <Button onClick={handleApplyBatchDate} type="button" variant="secondary" className="shrink-0">
                  一括適用
                </Button>
              </div>
              {!hasAnyDate && (
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  日付を選択すると、登録済み選手の自動スキップ判定が行われます
                </p>
              )}
            </div>

            {/* フェーズ一括適用 */}
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">全選手のフェーズを一括修正</h3>
                <p className="text-xs text-muted-foreground">
                  すべての選手プログラムのフェーズを一括で上書き変更します。
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Input
                  placeholder="例: 筋肥大期, Phase 1"
                  value={batchPhaseInput}
                  onChange={(e) => setBatchPhaseInput(e.target.value)}
                  className="bg-background"
                />
                <Button onClick={handleApplyBatchPhase} type="button" variant="secondary" className="shrink-0">
                  一括適用
                </Button>
              </div>
            </div>
          </div>

          {/* 同じ日付の登録状況サマリー＆「登録がない選手のみ読込み」コントロール */}
          {hasAnyDate && (
            <div className="pt-3 border-t border-primary/10 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {isCheckingDuplicates ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      同じ日付の登録状況を確認中...
                    </span>
                  ) : (
                    <>
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-white">
                        作成対象: {activeCount}名
                      </Badge>
                      <Badge variant="secondary">
                        スキップ: {skippedCount}名（うち同日登録済 {duplicateCount}名）
                      </Badge>
                      {duplicateCount > 0 && unregisteredPrograms.length > 0 && (
                        <span className="text-muted-foreground">
                          未登録の選手:{" "}
                          <strong className="text-foreground">
                            {unregisteredPrograms.map(({ prog }) => prog.athleteName).join(", ")}
                          </strong>
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {duplicateCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs bg-background"
                      onClick={handleSelectOnlyUnregistered}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      未登録の選手（{unregisteredPrograms.length}名）のみ追加にする
                    </Button>
                  )}
                  {duplicateCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant={showOnlyUnregistered ? "default" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => setShowOnlyUnregistered((prev) => !prev)}
                    >
                      <Filter className="h-3.5 w-3.5 mr-1.5" />
                      {showOnlyUnregistered ? "全員を表示" : "未登録・追加対象のみ表示"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Program List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">プログラム一覧</CardTitle>
              <CardDescription>
                全{parsedPrograms.length}件（作成対象: {activeCount}件 / スキップ: {skippedCount}件）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2 pr-4">
                  {parsedPrograms.map((prog, idx) => {
                    const dup = duplicateStates[idx];
                    const action = importActions[idx] || "create";

                    if (showOnlyUnregistered && action === "skip") {
                      return null;
                    }

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
                        <div className="flex items-center justify-between gap-1">
                          <div className="font-medium text-sm truncate">
                            {prog.athleteName}
                            {prog.sheetName && prog.sheetName !== prog.athleteName && (
                              <span className="ml-1 text-xs opacity-75">({prog.sheetName})</span>
                            )}
                          </div>
                          {dup?.isDuplicate ? (
                            <Badge 
                              className={`text-[9px] px-1.5 py-0 h-4 border-0 font-medium shrink-0 ${
                                dup.duplicateType === "exact"
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : "bg-amber-500 text-white hover:bg-amber-600"
                              }`}
                            >
                              {dup.duplicateType === "exact" ? "登録済(完全一致)" : "同日登録済"}
                            </Badge>
                          ) : hasAnyDate ? (
                            <Badge className="text-[9px] px-1.5 py-0 h-4 border-0 font-medium shrink-0 bg-emerald-600 text-white hover:bg-emerald-600">
                              未登録
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-[11px] opacity-75 mt-1 flex justify-between items-center">
                          <span>
                            {prog.selectedAthleteId ? "✓ 選手割り当て済" : "⚠ 選手未割り当て"}
                          </span>
                          {action === "skip" ? (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">スキップ</span>
                          ) : action === "overwrite" ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">上書き</span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">追加対象</span>
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
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>{currentProgram.athleteName}</CardTitle>
                  <CardDescription>
                    {currentProgram.position && `${currentProgram.position} / `}
                    背番号: {currentProgram.athleteNumber || "未設定"}
                    {currentProgram.sheetName && ` / シート名: ${currentProgram.sheetName}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">インポート動作:</Label>
                  <Select
                    value={importActions[selectedTabIndex] || "create"}
                    onValueChange={(val: "create" | "overwrite" | "skip") => {
                      setManualActionOverrides((prev) => ({ ...prev, [selectedTabIndex]: true }));
                      setImportActions((prev) => ({ ...prev, [selectedTabIndex]: val }));
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">新規追加する</SelectItem>
                      <SelectItem value="skip">スキップする（読込まない）</SelectItem>
                      {duplicateStates[selectedTabIndex]?.isDuplicate && (
                        <SelectItem value="overwrite">既存データを上書きする</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                          : "同一日付にこの選手のプログラムがすでに登録されています（同日登録済）"}
                      </p>
                      <p className="opacity-80">
                        既存プログラム: {duplicateStates[selectedTabIndex].existingProgramName}（デフォルトで「スキップ」に設定されています）
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t pt-3 mt-1">
                    <label className="text-xs font-bold shrink-0">このプログラムのインポート処理方法:</label>
                    <Select
                      value={importActions[selectedTabIndex] || "create"}
                      onValueChange={(val: "create" | "overwrite" | "skip") => {
                        setManualActionOverrides(prev => ({ ...prev, [selectedTabIndex]: true }));
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
          disabled={isCreating || !allAssigned || activeCount === 0}
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              作成中...
            </>
          ) : skippedCount > 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              対象 {activeCount}名を一括作成（{skippedCount}名スキップ）
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              全員一括作成（{activeCount}名）
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
