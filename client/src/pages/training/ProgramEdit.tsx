import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import ProgramForm, { type ProgramFormData } from "@/components/ProgramForm";

export default function ProgramEdit() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const programId = parseInt(id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  if (user?.trainingRole === "read") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>この機能にアクセスする権限がありません。</p>
      </div>
    );
  }

  const { data: program, isLoading } = trpc.programs.get.useQuery({ id: programId });

  const updateMutation = trpc.programs.update.useMutation({
    onSuccess: () => {
      utils.programs.get.invalidate({ id: programId });
      utils.programs.list.invalidate();
      toast.success("プログラムを更新しました");
      setLocation(`/training/programs/${programId}`);
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  const handleSubmit = (form: ProgramFormData) => {
    if (!form.athleteId) {
      toast.error("選手を選択してください");
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

    updateMutation.mutate({
      id: programId,
      data: {
        athleteId: parseInt(form.athleteId),
        date: form.date,
        phase: form.phase || undefined,
        periodCategory: form.periodCategory || undefined,
        goal: form.goal || undefined,
        bodyWeight: form.bodyWeight ? parseFloat(form.bodyWeight) : undefined,
        totalSets: form.totalSets ? parseInt(form.totalSets) : undefined,
        sections,
      },
    });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">読み込み中...</div>;
  if (!program) return <div className="text-center py-8 text-muted-foreground">プログラムが見つかりません</div>;

  const initialData: ProgramFormData = {
    athleteId: String(program.athleteId),
    date: program.date,
    phase: program.phase ?? "",
    periodCategory: program.periodCategory ?? "",
    goal: program.goal ?? "",
    bodyWeight: program.bodyWeight ? String(program.bodyWeight) : "",
    totalSets: program.totalSets ? String(program.totalSets) : "",
    sections: program.sections.map(s => ({
      id: s.id,
      category: s.category,
      collapsed: false,
      exercises: s.exercises.map(e => ({
        id: e.id,
        name: e.name,
        sets: e.sets ? String(e.sets) : "",
        reps: e.reps ?? "",
        load: e.load ?? "",
        attention: e.attention ?? "",
      })),
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/training/programs/${programId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">プログラム編集</h1>
      </div>

      <ProgramForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
        submitLabel="プログラムを更新"
      />
    </div>
  );
}
