import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Copy, PlusCircle, ChevronRight } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import ProgramForm, { type ProgramFormData, SECTION_CATEGORIES } from "@/components/ProgramForm";

// =====================
// 複製元選択ステップ
// =====================
type ClonePickerProps = {
  preAthleteId: string;
  onClone: (programId: number) => void;
  onSkip: () => void;
};

function ClonePicker({ preAthleteId, onClone, onSkip }: ClonePickerProps) {
  const { data: athletes } = trpc.athletes.list.useQuery();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(preAthleteId);

  const { data: programs, isLoading } = trpc.programs.listByAthlete.useQuery(
    { athleteId: parseInt(selectedAthleteId) },
    { enabled: !!selectedAthleteId }
  );

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        過去のプログラムを複製して、重量・セット数・種目を調整することができます。
      </div>

      {/* 選手選択 */}
      <div className="space-y-1.5">
        <div className="text-sm font-medium">複製元の選手を選択</div>
        <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
          <SelectTrigger>
            <SelectValue placeholder="選手を選択..." />
          </SelectTrigger>
          <SelectContent>
            {athletes?.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>
                #{a.number} {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* プログラム一覧 */}
      {selectedAthleteId && (
        <div className="space-y-1.5">
          <div className="text-sm font-medium">複製するプログラムを選択</div>
          {isLoading && (
            <div className="text-sm text-muted-foreground py-4 text-center">読み込み中...</div>
          )}
          {!isLoading && (!programs || programs.length === 0) && (
            <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
              この選手のプログラムはまだありません
            </div>
          )}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {programs?.map(p => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left border rounded-md px-4 py-3 hover:bg-accent hover:border-primary transition-colors flex items-center justify-between group"
                onClick={() => onClone(p.id)}
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">{p.date}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.periodCategory && (
                      <Badge variant="outline" className="text-xs h-5">
                        {p.periodCategory}
                      </Badge>
                    )}
                    {p.phase && (
                      <span className="text-xs text-muted-foreground">{p.phase}</span>
                    )}
                    {p.goal && (
                      <span className="text-xs text-muted-foreground truncate max-w-48">{p.goal}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* スキップ */}
      <div className="pt-2 border-t">
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
          <PlusCircle className="h-4 w-4 mr-2" />
          複製せず一から作成する
        </Button>
      </div>
    </div>
  );
}

// =====================
// Main Page
// =====================
const emptyInitialData = (athleteId: string): ProgramFormData => ({
  athleteId,
  date: new Date().toISOString().slice(0, 10),
  phase: "",
  periodCategory: "",
  goal: "",
  bodyWeight: "",
  totalSets: "",
  sections: SECTION_CATEGORIES.map(cat => ({
    category: cat,
    exercises: [{ name: "", sets: "", reps: "", load: "", attention: "" }],
    collapsed: false,
  })),
});

export default function ProgramCreate() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preAthleteId = params.get("athleteId") ?? "";
  const cloneFromId = params.get("cloneFrom") ? parseInt(params.get("cloneFrom")!) : null;
  const utils = trpc.useUtils();

  // ステップ: "pick"（複製元選択）| "form"（フォーム編集）
  const [step, setStep] = useState<"pick" | "form">(cloneFromId ? "form" : "pick");
  const [cloneSourceId, setCloneSourceId] = useState<number | null>(cloneFromId);
  const [formData, setFormData] = useState<ProgramFormData | null>(
    cloneFromId ? null : null // cloneFromIdがある場合はAPIから取得
  );

  // 複製元プログラムの取得
  const { data: cloneSource } = trpc.programs.getForClone.useQuery(
    { id: cloneSourceId! },
    { enabled: !!cloneSourceId }
  );

  // 複製元データをフォームデータに変換
  useEffect(() => {
    if (!cloneSource) return;

    const today = new Date().toISOString().slice(0, 10);

    // sections/exercises をフォーム形式に変換
    const sections: ProgramFormData["sections"] = SECTION_CATEGORIES.map(cat => {
      const sec = cloneSource.sections?.find((s: { category: string }) => s.category === cat);
      if (!sec) {
        return {
          category: cat,
          exercises: [{ name: "", sets: "", reps: "", load: "", attention: "" }],
          collapsed: false,
        };
      }
      return {
        category: cat,
        exercises:
          sec.exercises && sec.exercises.length > 0
            ? sec.exercises.map((e: {
                name: string;
                sets?: number | null;
                reps?: string | null;
                load?: string | null;
                attention?: string | null;
              }) => ({
                name: e.name ?? "",
                sets: e.sets != null ? String(e.sets) : "",
                reps: e.reps ?? "",
                load: e.load ?? "",
                attention: e.attention ?? "",
              }))
            : [{ name: "", sets: "", reps: "", load: "", attention: "" }],
        collapsed: false,
      };
    });

    setFormData({
      athleteId: String(cloneSource.athleteId ?? preAthleteId),
      date: today,
      phase: cloneSource.phase ?? "",
      periodCategory: cloneSource.periodCategory ?? "",
      goal: cloneSource.goal ?? "",
      bodyWeight: cloneSource.bodyWeight != null ? String(cloneSource.bodyWeight) : "",
      totalSets: cloneSource.totalSets != null ? String(cloneSource.totalSets) : "",
      sections,
    });
    setStep("form");
  }, [cloneSource]);

  const createMutation = trpc.programs.create.useMutation({
    onSuccess: (data) => {
      utils.programs.list.invalidate();
      toast.success("プログラムを作成しました");
      if (data?.id) {
        setLocation(`/training/programs/${data.id}`);
      } else {
        setLocation("/training/programs");
      }
    },
    onError: () => toast.error("作成に失敗しました"),
  });

  const handleClone = (programId: number) => {
    setCloneSourceId(programId);
    // データ取得後に useEffect で step="form" に切り替わる
  };

  const handleSkip = () => {
    setFormData(emptyInitialData(preAthleteId));
    setStep("form");
  };

  const handleSubmit = (form: ProgramFormData) => {
    if (!form.athleteId) {
      toast.error("選手を選択してください");
      return;
    }
    if (!form.date) {
      toast.error("日付を入力してください");
      return;
    }

    const sections = form.sections
      .filter(s => s.exercises.some(e => e.name.trim()))
      .map((s, si) => ({
        category: s.category,
        sortOrder: si,
        exercises: s.exercises
          .filter(e => e.name.trim())
          .map((e, ei) => ({
            name: e.name,
            sets: e.sets ? parseInt(e.sets) : undefined,
            reps: e.reps || undefined,
            load: e.load || undefined,
            attention: e.attention || undefined,
            sortOrder: ei,
          })),
      }));

    createMutation.mutate({
      athleteId: parseInt(form.athleteId),
      date: form.date,
      phase: form.phase || undefined,
      periodCategory: form.periodCategory || undefined,
      goal: form.goal || undefined,
      bodyWeight: form.bodyWeight ? parseFloat(form.bodyWeight) : undefined,
      totalSets: form.totalSets ? parseInt(form.totalSets) : undefined,
      sections,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === "form" && !cloneFromId) {
              setStep("pick");
            } else {
              setLocation("/training/programs");
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">プログラム新規作成</h1>
          {step === "form" && cloneSourceId && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Copy className="h-3 w-3" />
              <span>過去プログラムから複製して編集中</span>
            </div>
          )}
        </div>
      </div>

      {/* Step: 複製元選択 */}
      {step === "pick" && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <Copy className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">過去のプログラムから複製</h2>
            </div>
            <ClonePicker
              preAthleteId={preAthleteId}
              onClone={handleClone}
              onSkip={handleSkip}
            />
          </CardContent>
        </Card>
      )}

      {/* Step: フォーム編集 */}
      {step === "form" && (
        <>
          {/* 複製元読み込み中 */}
          {cloneSourceId && !formData && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              プログラムを読み込み中...
            </div>
          )}
          {/* フォーム表示 */}
          {formData && (
            <ProgramForm
              initialData={formData}
              onSubmit={handleSubmit}
              isSubmitting={createMutation.isPending}
              submitLabel="プログラムを作成"
            />
          )}
        </>
      )}
    </div>
  );
}
