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
import { Plus, Search, ClipboardList, ArrowRight, Printer, Upload, Calendar as CalendarIcon } from "lucide-react";
import { useLocation } from "wouter";

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
          <Button variant="outline" size="sm" onClick={() => setLocation("/programs/import")}>
            <Upload className="h-4 w-4 mr-1" /> PDFから読み込み
          </Button>
          <Button onClick={() => setLocation("/programs/new")} size="sm">
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
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/programs/new")}>
            最初のプログラムを作成する
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(program => {
            const athlete = athletes?.find(a => a.id === program.athleteId);
            return (
              <Card
                key={program.id}
                className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(`/programs/${program.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {athlete?.number ?? "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{athlete?.name ?? "不明"}</p>
                          {program.periodCategory && (
                            <Badge variant="secondary" className="text-xs">{program.periodCategory}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-sm text-muted-foreground">{program.date}</p>
                          {program.phase && (
                            <span className="text-xs text-muted-foreground">· {program.phase}</span>
                          )}
                        </div>
                        {program.goal && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{program.goal}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {program.totalSets && (
                        <span className="text-sm font-medium text-muted-foreground">{program.totalSets} sets</span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
    </div>
  );
}
