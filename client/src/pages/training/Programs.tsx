import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Plus,
  Search,
  ClipboardList,
  ArrowRight,
  Printer,
  Upload,
  Calendar as CalendarIcon,
  Camera,
  CheckCircle2,
  Clock,
  Trash2
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Programs() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filterAthleteId, setFilterAthleteId] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [batchDate, setBatchDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const { data: athletes } = trpc.athletes.list.useQuery();
  const { data: programs, isLoading } = trpc.programs.list.useQuery({
    athleteId: filterAthleteId !== "all" ? parseInt(filterAthleteId) : undefined,
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const bulkDeleteMutation = trpc.programs.bulkDelete.useMutation({
    onSuccess: () => {
      toast.success("選択したプログラムを削除しました");
      utils.programs.list.invalidate();
      setSelectedIds([]);
      setDeleteDialogOpen(false);
    },
    onError: (e) => {
      toast.error("削除に失敗しました: " + e.message);
    }
  });

  const handleDeleteSelected = () => {
    bulkDeleteMutation.mutate({ ids: selectedIds });
  };

  const filtered = programs?.filter(p => {
    const athlete = athletes?.find(a => a.id === p.athleteId);

    // 日付での絞り込み
    if (filterDate) {
      const formattedFilterDate = format(filterDate, "yyyy-MM-dd");
      if (p.date !== formattedFilterDate) return false;
    }

    return (
      search === "" ||
      p.date.includes(search) ||
      (athlete?.name ?? "").includes(search) ||
      (p.periodCategory ?? "").includes(search) ||
      (p.phase ?? "").includes(search)
    );
  }) ?? [];

  // 全選択・個別選択の判定とハンドラ
  const isAllSelected = filtered.length > 0 && filtered.every(p => selectedIds.includes(p.id));
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  // 一括印刷実行
  const handleBatchPrint = () => {
    if (!batchDate) return;
    window.open(`/print/batch?date=${batchDate}`, "_blank");
    setBatchPrintOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">プログラム一覧</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBatchPrintOpen(true)}>
            <Printer className="h-4 w-4 mr-1" /> 一括印刷
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/training/programs/import")}>
            <Upload className="h-4 w-4 mr-1" /> PDFから読み込み
          </Button>
          <Button onClick={() => setLocation("/training/programs/create")} size="sm">
            <Plus className="h-4 w-4 mr-1" /> 新規作成
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="選手名・期分けで検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-[180px] justify-start text-left font-normal ${!filterDate && "text-muted-foreground"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "yyyy-MM-dd") : "日付で絞り込み"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                initialFocus
                locale={ja}
              />
            </PopoverContent>
          </Popover>
          {filterDate && (
            <Button variant="ghost" onClick={() => setFilterDate(undefined)} className="shrink-0 text-xs px-2 h-9">
              クリア
            </Button>
          )}
          <Select value={filterAthleteId} onValueChange={setFilterAthleteId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="選手を絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全選手</SelectItem>
              {athletes?.map(a => (
                <SelectItem key={a.id} value={String(a.id)}>
                  #{a.number} {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>プログラムがありません</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/training/programs/create")}>
            最初のプログラムを作成する
          </Button>
        </div>
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-3 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-sm font-semibold text-red-700">
                {selectedIds.length}件 のプログラムを選択中
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-lg shadow-sm h-8"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                選択したプログラムを削除
              </Button>
            </div>
          )}
          <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[50px] text-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="すべて選択"
                    />
                  </TableHead>
                  <TableHead className="w-[80px] text-center font-semibold">背番号</TableHead>
                  <TableHead className="w-[180px] font-semibold">選手</TableHead>
                  <TableHead className="w-[120px] font-semibold">日付</TableHead>
                  <TableHead className="w-[150px] font-semibold">期分け (フェーズ)</TableHead>
                  <TableHead className="w-[100px] text-center font-semibold">セット数</TableHead>
                  <TableHead className="w-[200px] font-semibold">実施ステータス (OCR/実績)</TableHead>
                  <TableHead className="text-right font-semibold">操作</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filtered.map(program => {
                const athlete = athletes?.find(a => a.id === program.athleteId);
                
                // 集計値を取得（サーバー側で追加したプロパティ）
                const recordCount = (program as any).recordCount ?? 0;
                const status = (program as any).status ?? "pending";
                
                return (
                  <TableRow
                    key={program.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setLocation(`/training/programs/${program.id}`)}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(program.id)}
                        onCheckedChange={(checked) => handleSelectRow(program.id, !!checked)}
                        aria-label={`プログラム ${program.id} を選択`}
                      />
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-700">
                      #{athlete?.number ?? "?"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{athlete?.name ?? "不明"}</p>
                        {athlete?.position && (
                          <p className="text-[10px] text-muted-foreground uppercase">{athlete.position}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-slate-600">{program.date}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {program.periodCategory ? (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0">
                            {program.periodCategory}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {program.phase && (
                          <p className="text-[10px] text-muted-foreground pl-0.5">{program.phase}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-sm">
                      {program.totalSets ? `${program.totalSets} sets` : "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {status === "ocr" ? (
                        <Badge className="bg-sky-500 hover:bg-sky-600 text-white border-0 flex items-center gap-1.5 w-fit font-medium text-[11px] py-0.5 px-2.5 shadow-sm">
                          <Camera className="h-3.5 w-3.5 shrink-0" />
                          OCR解析済 ({recordCount}件)
                        </Badge>
                      ) : status === "manual" ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 flex items-center gap-1.5 w-fit font-medium text-[11px] py-0.5 px-2.5 shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          手動記録済 ({recordCount}件)
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-muted-foreground bg-slate-50 border-slate-200 flex items-center gap-1.5 w-fit font-normal text-[11px] py-0.5 px-2.5">
                            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            計画のみ
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-primary hover:text-primary-hover hover:bg-primary/5 px-2 font-medium"
                            onClick={() => setLocation(`/training/ocr?programId=${program.id}&athleteId=${program.athleteId}`)}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            OCR取り込み
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs px-3"
                          onClick={() => setLocation(`/training/programs/${program.id}`)}
                        >
                          詳細
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
                          onClick={() => setLocation(`/training/programs/${program.id}/edit`)}
                        >
                          編集
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </>
      )}

      {/* 一括印刷ダイアログ */}
      <Dialog open={batchPrintOpen} onOpenChange={setBatchPrintOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>一括印刷</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              指定した日付のプログラムを全選手分まとめて印刷します。
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">日付を選択</label>
              <Input
                type="date"
                value={batchDate}
                onChange={e => setBatchDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchPrintOpen(false)}>キャンセル</Button>
            <Button onClick={handleBatchPrint} disabled={!batchDate}>
              <Printer className="h-4 w-4 mr-1" />
              印刷プレビューを開く
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-bold">プログラムの一括削除</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              選択された {selectedIds.length}件 のプログラムを削除します。
              この操作を行うと、プログラム内のセクション、種目計画、および紐づくすべての実施実績データ（OCR読み取り結果や手動記録）が完全に削除されます。
              この操作は取り消せません。本当によろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500 text-white rounded-xl"
              onClick={handleDeleteSelected}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
