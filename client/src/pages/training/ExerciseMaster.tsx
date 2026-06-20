import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Dumbbell, Info, Upload, FileSpreadsheet, CheckCircle2, SkipForward } from "lucide-react";

const CATEGORIES = ["Preparation", "Core", "Power", "Lower Body", "Upper Body", "Specific"] as const;
type Category = typeof CATEGORIES[number];

type ExerciseMasterItem = {
  id: number;
  name: string;
  category: string;
  defaultSets: number | null;
  defaultReps: string | null;
  defaultLoad: string | null;
  attention: string | null;
  usageCount: number;
};

type FormState = {
  name: string;
  category: Category;
  defaultSets: string;
  defaultReps: string;
  defaultLoad: string;
  attention: string;
};

type PreviewItem = {
  name: string;
  category: string;
  defaultSets?: number;
  defaultReps?: string;
  defaultLoad?: string;
  isNew: boolean;
};

const emptyForm = (category: Category = "Preparation"): FormState => ({
  name: "",
  category,
  defaultSets: "",
  defaultReps: "",
  defaultLoad: "",
  attention: "",
});

export default function ExerciseMaster() {
  const [activeTab, setActiveTab] = useState<Category>("Preparation");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExerciseMasterItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<ExerciseMasterItem | null>(null);

  // Excel インポート用 state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: grouped, isLoading } = trpc.exerciseMaster.grouped.useQuery();

  const createMutation = trpc.exerciseMaster.create.useMutation({
    onSuccess: () => {
      utils.exerciseMaster.grouped.invalidate();
      utils.exerciseMaster.list.invalidate();
      toast.success("種目を追加しました");
      setDialogOpen(false);
    },
    onError: (e) => toast.error("追加に失敗しました: " + e.message),
  });

  const updateMutation = trpc.exerciseMaster.update.useMutation({
    onSuccess: () => {
      utils.exerciseMaster.grouped.invalidate();
      utils.exerciseMaster.list.invalidate();
      toast.success("種目を更新しました");
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: (e) => toast.error("更新に失敗しました: " + e.message),
  });

  const deleteMutation = trpc.exerciseMaster.delete.useMutation({
    onSuccess: () => {
      utils.exerciseMaster.grouped.invalidate();
      utils.exerciseMaster.list.invalidate();
      toast.success("種目を削除しました");
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error("削除に失敗しました: " + e.message),
  });

  const parseExcelMutation = trpc.exerciseMaster.parseExcel.useMutation({
    onSuccess: (data) => {
      setPreviewItems(data.preview);
      setIsParsing(false);
    },
    onError: (e) => {
      toast.error("ファイルの解析に失敗しました: " + e.message);
      setIsParsing(false);
    },
  });

  const bulkImportMutation = trpc.exerciseMaster.bulkImport.useMutation({
    onSuccess: (data) => {
      utils.exerciseMaster.grouped.invalidate();
      utils.exerciseMaster.list.invalidate();
      toast.success(`${data.inserted.length}件の種目を追加しました（${data.skipped.length}件はスキップ）`);
      setImportDialogOpen(false);
      setPreviewItems([]);
      setSelectedFileName("");
    },
    onError: (e) => toast.error("インポートに失敗しました: " + e.message),
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm(activeTab));
    setDialogOpen(true);
  };

  const openEdit = (item: ExerciseMasterItem) => {
    setEditTarget(item);
    setForm({
      name: item.name,
      category: item.category as Category,
      defaultSets: item.defaultSets?.toString() ?? "",
      defaultReps: item.defaultReps ?? "",
      defaultLoad: item.defaultLoad ?? "",
      attention: item.attention ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("種目名を入力してください");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      defaultSets: form.defaultSets ? parseInt(form.defaultSets) : undefined,
      defaultReps: form.defaultReps || undefined,
      defaultLoad: form.defaultLoad || undefined,
      attention: form.attention || undefined,
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // data:...;base64, の後ろだけ取り出す
      const base64 = dataUrl.split(",")[1];
      parseExcelMutation.mutate({ fileBase64: base64 });
    };
    reader.readAsDataURL(file);
    // 同じファイルを再選択できるようリセット
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    const newItems = previewItems.filter((item) => item.isNew);
    if (newItems.length === 0) {
      toast.info("追加する新規種目がありません");
      return;
    }
    bulkImportMutation.mutate({ items: newItems });
  };

  const currentList: ExerciseMasterItem[] = (grouped as Record<string, ExerciseMasterItem[]> | undefined)?.[activeTab] ?? [];
  const totalCount = grouped
    ? Object.values(grouped as Record<string, ExerciseMasterItem[]>).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const newCount = previewItems.filter((i) => i.isNew).length;
  const skipCount = previewItems.filter((i) => !i.isNew).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">種目マスター</h1>
            <p className="text-sm text-muted-foreground">全カテゴリー合計 {totalCount} 種目</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Excelから一括インポート
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            種目を追加
          </Button>
        </div>
      </div>

      {/* 仕様説明バナー */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <div>
          <p className="font-semibold mb-0.5">種目マスターについて</p>
          <p className="text-blue-700 leading-relaxed">
            ここで管理するのは<strong>種目名の一覧</strong>です。SET数・回数・負荷は<strong>プリセット（初期値）</strong>として設定でき、プログラム作成時に種目を選ぶと自動入力されます。
            プリセットはあくまで参照用であり、各プログラムで選手ごとに自由に変更できます。同じ種目でも選手によって異なる負荷・セット数を設定することが可能です。
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Category)}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted p-1 rounded-lg">
          {CATEGORIES.map((cat) => {
            const count = (grouped as Record<string, ExerciseMasterItem[]> | undefined)?.[cat]?.length ?? 0;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5 text-sm">
                {cat}
                {count > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat}>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">
                  {cat} カテゴリーに種目がありません
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  「種目を追加」ボタンから登録してください
                </p>
                <Button variant="outline" className="mt-4 gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {cat} の種目を追加
                </Button>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[220px]">種目名</TableHead>
                      <TableHead className="text-center w-20">
                        <div className="flex flex-col items-center leading-tight">
                          <span>SET</span>
                          <span className="text-[10px] font-normal text-muted-foreground">プリセット</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-24">
                        <div className="flex flex-col items-center leading-tight">
                          <span>回数</span>
                          <span className="text-[10px] font-normal text-muted-foreground">プリセット</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-28">
                        <div className="flex flex-col items-center leading-tight">
                          <span>負荷</span>
                          <span className="text-[10px] font-normal text-muted-foreground">プリセット</span>
                        </div>
                      </TableHead>
                      <TableHead>Attention</TableHead>
                      <TableHead className="text-center w-20">使用回数</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentList.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center">
                          {item.defaultSets != null ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {item.defaultSets}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">未設定</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.defaultReps ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {item.defaultReps}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">未設定</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.defaultLoad ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {item.defaultLoad}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">未設定</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.attention ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.usageCount > 5 ? "default" : "secondary"} className="text-xs">
                            {item.usageCount}回
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "種目を編集" : "種目を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 種目名・カテゴリー */}
            <div className="space-y-1.5">
              <Label>種目名 <span className="text-destructive">*</span></Label>
              <Input
                placeholder="例: ベンチプレス"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>カテゴリー <span className="text-destructive">*</span></Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* プリセット説明 */}
            <div className="bg-muted/60 rounded-lg px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">プリセット（初期値）</span> —
              プログラム作成時にこの種目を選択すると、下記の値が自動入力されます。
              各プログラムで選手ごとに自由に変更できます。空欄にしても構いません。
            </div>

            {/* プリセット入力 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">SET数（プリセット）</Label>
                <Input
                  type="number"
                  placeholder="例: 3"
                  value={form.defaultSets}
                  onChange={(e) => setForm({ ...form, defaultSets: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">回数（プリセット）</Label>
                <Input
                  placeholder="例: 8"
                  value={form.defaultReps}
                  onChange={(e) => setForm({ ...form, defaultReps: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">負荷（プリセット）</Label>
                <Input
                  placeholder="例: BWT"
                  value={form.defaultLoad}
                  onChange={(e) => setForm({ ...form, defaultLoad: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Attention（注意事項）</Label>
              <Input
                placeholder="例: 深くで実施"
                value={form.attention}
                onChange={(e) => setForm({ ...form, attention: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditTarget(null); }}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editTarget ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>種目を削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            「{deleteConfirm?.name}」を種目マスターから削除します。
            過去のプログラムや記録には影響しません。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>キャンセル</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm.id })}
              disabled={deleteMutation.isPending}
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) { setPreviewItems([]); setSelectedFileName(""); }
      }}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Excelから種目を一括インポート
            </DialogTitle>
            <DialogDescription>
              昨シーズンのExcelファイルをアップロードすると、種目名・カテゴリー・プリセット値を自動で読み取ります。
              既存の種目はそのまま保持し、新規種目のみ追加します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* ファイル選択エリア */}
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              {isParsing ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">ファイルを解析中...</p>
                </div>
              ) : selectedFileName ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <p className="font-medium text-sm">{selectedFileName}</p>
                  <p className="text-xs text-muted-foreground">別のファイルを選択する場合はクリック</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <p className="font-medium text-sm">クリックしてExcelファイルを選択</p>
                  <p className="text-xs">.xlsx / .xls 形式に対応</p>
                </div>
              )}
            </div>

            {/* プレビューテーブル */}
            {previewItems.length > 0 && (
              <div className="space-y-3">
                {/* サマリー */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-medium">新規追加: {newCount}件</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground bg-muted rounded-full px-3 py-1">
                    <SkipForward className="h-3.5 w-3.5" />
                    <span>既存スキップ: {skipCount}件</span>
                  </div>
                </div>

                <ScrollArea className="h-64 border rounded-xl">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8"></TableHead>
                        <TableHead>種目名</TableHead>
                        <TableHead className="w-28">カテゴリー</TableHead>
                        <TableHead className="text-center w-14">SET</TableHead>
                        <TableHead className="w-24">回数</TableHead>
                        <TableHead className="w-28">負荷</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewItems.map((item, i) => (
                        <TableRow
                          key={i}
                          className={item.isNew ? "bg-green-50/50" : "opacity-50"}
                        >
                          <TableCell className="text-center">
                            {item.isNew ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <SkipForward className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal">
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">{item.defaultSets ?? "—"}</TableCell>
                          <TableCell className="text-sm">{item.defaultReps ?? "—"}</TableCell>
                          <TableCell className="text-sm">{item.defaultLoad ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  ✅ 緑色の行が新規追加されます。グレーの行は既存種目のためスキップされます。
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button
              variant="outline"
              onClick={() => { setImportDialogOpen(false); setPreviewItems([]); setSelectedFileName(""); }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={newCount === 0 || bulkImportMutation.isPending}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {newCount}件を追加する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
