import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, User, Search } from "lucide-react";
import { useLocation } from "wouter";

type AthleteForm = {
  name: string;
  number: string;
  position: string;
  bodyWeight: string;
  notes: string;
};

const emptyForm: AthleteForm = { name: "", number: "", position: "", bodyWeight: "", notes: "" };

export default function Athletes() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AthleteForm>(emptyForm);
  const utils = trpc.useUtils();

  const { data: athletes, isLoading } = trpc.athletes.list.useQuery();
  const createMutation = trpc.athletes.create.useMutation({
    onSuccess: () => {
      utils.athletes.list.invalidate();
      toast.success("選手を登録しました");
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("登録に失敗しました"),
  });
  const updateMutation = trpc.athletes.update.useMutation({
    onSuccess: () => {
      utils.athletes.list.invalidate();
      toast.success("選手情報を更新しました");
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("更新に失敗しました"),
  });
  const deleteMutation = trpc.athletes.delete.useMutation({
    onSuccess: () => {
      utils.athletes.list.invalidate();
      toast.success("選手を削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const filtered = athletes?.filter(a =>
    a.name.includes(search) || String(a.number ?? "").includes(search) || (a.position ?? "").includes(search)
  ) ?? [];

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: typeof athletes extends (infer T)[] | undefined ? T : never) => {
    if (!a) return;
    setEditId((a as any).id);
    setForm({
      name: (a as any).name,
      number: String((a as any).number ?? ""),
      position: (a as any).position ?? "",
      bodyWeight: String((a as any).bodyWeight ?? ""),
      notes: (a as any).notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("氏名は必須です");
      return;
    }
    const data = {
      name: form.name,
      number: form.number ? parseInt(form.number) : undefined,
      position: form.position || undefined,
      bodyWeight: form.bodyWeight ? parseFloat(form.bodyWeight) : undefined,
      notes: form.notes || undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">選手管理</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> 選手を追加
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="氏名・番号・ポジションで検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>選手が登録されていません</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
            最初の選手を登録する
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(athlete => (
            <Card
              key={athlete.id}
              className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(`/training/athletes/${athlete.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {athlete.number ?? "#"}
                    </div>
                    <div>
                      <p className="font-semibold">{athlete.name}</p>
                      <p className="text-sm text-muted-foreground">{athlete.position ?? "ポジション未設定"}</p>
                      {athlete.bodyWeight && (
                        <p className="text-xs text-muted-foreground">{athlete.bodyWeight} kg</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(athlete)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`${athlete.name}を削除しますか？`)) {
                          deleteMutation.mutate({ id: athlete.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "選手情報を編集" : "選手を新規登録"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>氏名 *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="山田 太郎" />
              </div>
              <div className="space-y-1.5">
                <Label>背番号</Label>
                <Input type="number" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="8" />
              </div>
              <div className="space-y-1.5">
                <Label>体重 (kg)</Label>
                <Input type="number" step="0.1" value={form.bodyWeight} onChange={e => setForm(f => ({ ...f, bodyWeight: e.target.value }))} placeholder="85.0" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>ポジション</Label>
                <Input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="アウトサイドヒッター" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>メモ</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="備考など" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "更新" : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
