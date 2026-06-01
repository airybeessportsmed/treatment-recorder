import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState } from "react";
import { POSITIONS } from "../../../shared/constants";
import { Plus, Pencil, Trash2, Users, Loader2 } from "lucide-react";

export default function Players() {
  const utils = trpc.useUtils();
  const { data: players, isLoading } = trpc.player.list.useQuery();
  const createPlayer = trpc.player.create.useMutation({
    onSuccess: () => {
      toast.success("選手を登録しました");
      utils.player.list.invalidate();
      setAddOpen(false);
      resetAddForm();
    },
    onError: (err) => toast.error("登録に失敗しました: " + err.message),
  });
  const updatePlayer = trpc.player.update.useMutation({
    onSuccess: () => {
      toast.success("選手情報を更新しました");
      utils.player.list.invalidate();
      setEditOpen(false);
    },
    onError: (err) => toast.error("更新に失敗しました: " + err.message),
  });
  const deletePlayer = trpc.player.delete.useMutation({
    onSuccess: () => {
      toast.success("選手を削除しました");
      utils.player.list.invalidate();
    },
    onError: (err) => toast.error("削除に失敗しました: " + err.message),
  });

  // Add form state
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addNumber, setAddNumber] = useState("");
  const [addPosition, setAddPosition] = useState("");

  // Edit form state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editPosition, setEditPosition] = useState("");

  const resetAddForm = () => {
    setAddName("");
    setAddNumber("");
    setAddPosition("");
  };

  const handleAdd = () => {
    if (!addName || !addNumber || !addPosition) return;
    createPlayer.mutate({
      name: addName,
      number: parseInt(addNumber),
      position: addPosition,
    });
  };

  const openEdit = (player: { id: number; name: string; number: number; position: string }) => {
    setEditId(player.id);
    setEditName(player.name);
    setEditNumber(String(player.number));
    setEditPosition(player.position);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editId || !editName || !editNumber || !editPosition) return;
    updatePlayer.mutate({
      id: editId,
      name: editName,
      number: parseInt(editNumber),
      position: editPosition,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">選手管理</h1>
          <p className="text-sm text-muted-foreground mt-1">チームの選手情報を管理</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              選手を追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>選手を追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">選手名</label>
                <Input
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="山田 太郎"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">背番号</label>
                <Input
                  type="number"
                  value={addNumber}
                  onChange={e => setAddNumber(e.target.value)}
                  placeholder="1"
                  min={0}
                  max={999}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">ポジション</label>
                <Select value={addPosition} onValueChange={setAddPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="ポジションを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">キャンセル</Button>
              </DialogClose>
              <Button
                onClick={handleAdd}
                disabled={!addName || !addNumber || !addPosition || createPlayer.isPending}
              >
                {createPlayer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                登録
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : players && players.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {players.map(player => (
                <div key={player.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">#{player.number}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {POSITIONS.find(p => p.key === player.position)?.label ?? player.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(player)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>選手を削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            {player.name}（#{player.number}）を削除します。この操作は取り消せません。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePlayer.mutate({ id: player.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            削除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">まだ選手が登録されていません</p>
            <p className="text-muted-foreground text-xs mt-1">「選手を追加」ボタンから登録してください</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選手情報を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">選手名</label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">背番号</label>
              <Input
                type="number"
                value={editNumber}
                onChange={e => setEditNumber(e.target.value)}
                min={0}
                max={999}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">ポジション</label>
              <Select value={editPosition} onValueChange={setEditPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="ポジションを選択" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">キャンセル</Button>
            </DialogClose>
            <Button
              onClick={handleEdit}
              disabled={!editName || !editNumber || !editPosition || updatePlayer.isPending}
            >
              {updatePlayer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
