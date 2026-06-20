import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Printer, Camera, Trash2, CheckCircle2, Circle, Copy, Edit2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { ChangeReasonBadge, ChangeReasonSelector, type ChangeReason } from "@/components/ChangeReasonBadge";

const SECTION_ORDER = ["Preparation", "Core", "Power", "Lower Body", "Upper Body", "Specific"];
const SECTION_COLORS: Record<string, string> = {
  Preparation: "bg-blue-50 text-blue-700 border-blue-200",
  Core: "bg-green-50 text-green-700 border-green-200",
  Power: "bg-orange-50 text-orange-700 border-orange-200",
  "Lower Body": "bg-purple-50 text-purple-700 border-purple-200",
  "Upper Body": "bg-red-50 text-red-700 border-red-200",
  Specific: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

type EditTarget = {
  exerciseId: number;
  exerciseName: string;
  programId: number;
  athleteId: number;
  date: string;
};

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const programId = parseInt(id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: program, isLoading } = trpc.programs.get.useQuery({ id: programId });
  const { data: records } = trpc.records.listByProgram.useQuery({ programId });

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editLoad, setEditLoad] = useState("");
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editChangeReason, setEditChangeReason] = useState<ChangeReason | null>(null);
  const [editChangeNote, setEditChangeNote] = useState("");

  const deleteMutation = trpc.programs.delete.useMutation({
    onSuccess: () => {
      toast.success("プログラムを削除しました");
      const athleteId = program?.athleteId;
      if (athleteId) {
        setLocation(`/athletes/${athleteId}`);
      } else {
        setLocation("/programs");
      }
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const upsertMutation = trpc.records.upsert.useMutation({
    onSuccess: () => {
      toast.success("記録を保存しました");
      utils.records.listByProgram.invalidate({ programId });
      setEditTarget(null);
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  const recordsByExerciseId = useMemo(() => {
    if (!records) return new Map<string, typeof records>();
    const map = new Map<string, typeof records>();
    for (const rec of records) {
      const key = String(rec.exerciseId);
      const list = map.get(key) ?? [];
      list.push(rec);
      map.set(key, list);
    }
    return map;
  }, [records]);

  const hasRecords = records && records.length > 0;

  const handlePrint = () => {
    window.open(`/print/${programId}`, "_blank");
  };

  const openEditDialog = (
    ex: { id: number; name: string },
    exRecords: NonNullable<typeof records>
  ) => {
    if (!program) return;
    const firstRec = exRecords[0];
    setEditTarget({
      exerciseId: ex.id,
      exerciseName: ex.name,
      programId,
      athleteId: program.athleteId,
      date: program.date,
    });
    setEditLoad(exRecords.map(r => r.actualLoad ?? "").filter(Boolean).join(" / "));
    setEditSets(firstRec?.actualSets != null ? String(firstRec.actualSets) : "");
    setEditReps(firstRec?.actualReps ?? "");
    setEditNotes(firstRec?.notes ?? "");
    setEditChangeReason((firstRec?.changeReason as ChangeReason | null) ?? null);
    setEditChangeNote(firstRec?.changeNote ?? "");
  };

  const handleSaveEdit = () => {
    if (!editTarget) return;
    upsertMutation.mutate({
      programId: editTarget.programId,
      exerciseId: editTarget.exerciseId,
      athleteId: editTarget.athleteId,
      date: editTarget.date,
      actualLoad: editLoad || undefined,
      actualSets: editSets ? parseInt(editSets) : undefined,
      actualReps: editReps || undefined,
      notes: editNotes || undefined,
      source: "manual",
      changeReason: editChangeReason ?? undefined,
      changeNote: editChangeNote || undefined,
    });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">読み込み中...</div>;
  if (!program) return <div className="text-center py-8 text-muted-foreground">プログラムが見つかりません</div>;

  const sortedSections = [...(program.sections ?? [])].sort(
    (a, b) => SECTION_ORDER.indexOf(a.category) - SECTION_ORDER.indexOf(b.category)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              program.athleteId
                ? setLocation(`/athletes/${program.athleteId}`)
                : setLocation("/programs")
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">プログラム詳細</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setLocation(`/ocr?programId=${programId}&athleteId=${program.athleteId}`)
            }
          >
            <Camera className="h-4 w-4 mr-1" /> OCR
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> 印刷
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/programs/create?cloneFrom=${programId}&athleteId=${program.athleteId}`)}
            title="このプログラムを複製して新規作成"
          >
            <Copy className="h-4 w-4 mr-1" /> 複製
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/programs/${programId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" /> 編集
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("このプログラムを削除しますか？")) {
                deleteMutation.mutate({ id: programId });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Header Info */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">選手</p>
              <p className="font-semibold">
                {program.athlete
                  ? `#${program.athlete.number} ${program.athlete.name}`
                  : "不明"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">日付</p>
              <p className="font-semibold">{program.date}</p>
            </div>
            {program.periodCategory && (
              <div>
                <p className="text-xs text-muted-foreground">期分け</p>
                <p className="font-semibold">{program.periodCategory}</p>
              </div>
            )}
            {program.phase && (
              <div>
                <p className="text-xs text-muted-foreground">PHASE</p>
                <p className="font-semibold">{program.phase}</p>
              </div>
            )}
            {program.goal && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">目的</p>
                <p className="font-semibold">{program.goal}</p>
              </div>
            )}
            {program.bodyWeight && (
              <div>
                <p className="text-xs text-muted-foreground">体重</p>
                <p className="font-semibold">{program.bodyWeight} kg</p>
              </div>
            )}
            {program.totalSets && (
              <div>
                <p className="text-xs text-muted-foreground">TOTAL</p>
                <p className="font-semibold">{program.totalSets} sets</p>
              </div>
            )}
          </div>

          {/* 実績記録ステータス */}
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            {hasRecords ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  実績記録あり（{records.length}件）
                </span>
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  実績記録なし —
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-sm"
                  onClick={() =>
                    setLocation(
                      `/ocr?programId=${programId}&athleteId=${program.athleteId}`
                    )
                  }
                >
                  写真を撮影して記録を追加
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {sortedSections.map(section => (
        <Card key={section.id} className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">
              <Badge
                variant="outline"
                className={`${
                  SECTION_COLORS[section.category] ?? "bg-gray-50 text-gray-700"
                } font-semibold`}
              >
                {section.category}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">
                      種目
                    </th>
                    <th className="text-center py-1.5 px-2 font-medium text-muted-foreground w-12">
                      SET
                    </th>
                    <th className="text-center py-1.5 px-2 font-medium text-muted-foreground w-16">
                      回数
                    </th>
                    <th className="text-center py-1.5 px-2 font-medium text-muted-foreground w-20">
                      計画負荷
                    </th>
                    <th className="text-center py-1.5 px-2 font-medium text-green-700 w-28">
                      実績
                    </th>
                    <th className="text-left py-1.5 pl-2 font-medium text-muted-foreground">
                      Attention
                    </th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {section.exercises.map(ex => {
                    const exRecords = recordsByExerciseId.get(String(ex.id)) ?? [];
                    const actualLoads = exRecords
                      .map(r => r.actualLoad)
                      .filter(Boolean) as string[];
                    const hasActual = actualLoads.length > 0;
                    const firstRec = exRecords[0];
                    const changeReason = firstRec?.changeReason as ChangeReason | null | undefined;
                    const changeNote = firstRec?.changeNote;

                    return (
                      <tr
                        key={ex.id}
                        className={`border-b last:border-0 ${
                          hasActual ? "bg-green-50/40" : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="py-1.5 pr-3 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{ex.name}</span>
                            {changeReason && (
                              <ChangeReasonBadge
                                reason={changeReason}
                                note={changeNote}
                                compact
                              />
                            )}
                          </div>
                        </td>
                        <td className="text-center py-1.5 px-2 text-muted-foreground">
                          {ex.sets ?? ""}
                        </td>
                        <td className="text-center py-1.5 px-2 text-muted-foreground">
                          {ex.reps ?? ""}
                        </td>
                        <td className="text-center py-1.5 px-2 text-muted-foreground">
                          {ex.load ?? ""}
                        </td>
                        <td className="text-center py-1.5 px-2">
                          {hasActual ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {actualLoads.map((load, i) => (
                                <span
                                  key={i}
                                  className="font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-xs"
                                >
                                  {load}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-1.5 pl-2 text-muted-foreground text-xs">
                          {ex.attention ?? ""}
                        </td>
                        <td className="py-1.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="実績を記録・修正"
                            onClick={() => openEditDialog(ex, exRecords)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 記録編集ダイアログ */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              実績を記録・修正
              {editTarget && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {editTarget.exerciseName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 実績値 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">SET数</Label>
                <Input
                  type="number"
                  placeholder="3"
                  value={editSets}
                  onChange={e => setEditSets(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">回数</Label>
                <Input
                  placeholder="8回"
                  value={editReps}
                  onChange={e => setEditReps(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">負荷</Label>
                <Input
                  placeholder="60kg"
                  value={editLoad}
                  onChange={e => setEditLoad(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* 変更理由 */}
            <div className="space-y-2">
              <Label className="text-xs">
                変更理由
                <span className="ml-1 text-muted-foreground font-normal">（任意 — 計画値と異なる場合に記録）</span>
              </Label>
              <ChangeReasonSelector value={editChangeReason} onChange={setEditChangeReason} />
            </div>

            {/* 変更メモ */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                変更メモ
                <span className="ml-1 text-muted-foreground font-normal">（任意）</span>
              </Label>
              <Textarea
                placeholder="例: 右肩の違和感あり、軽めに調整"
                value={editChangeNote}
                onChange={e => setEditChangeNote(e.target.value)}
                className="text-sm resize-none"
                rows={2}
              />
            </div>

            {/* 全体メモ */}
            <div className="space-y-1.5">
              <Label className="text-xs">全体メモ</Label>
              <Input
                placeholder="種目全体のメモ"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
