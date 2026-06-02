import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import {
  getBodyPartLabel,
  getTreatmentTypeLabel,
  getTimingLabel,
  BODY_PARTS,
  TREATMENT_TYPES,
  TIMING_OPTIONS,
} from "../../../shared/constants";
import { ClipboardList, Loader2, Trash2, Eye, Filter, X, Calendar, Pencil, User, RotateCcw, Save } from "lucide-react";
import AnnotationViewer from "@/components/AnnotationViewer";
import type { AnnotationData } from "@/components/AnnotationCanvas";

export default function Records() {
  const utils = trpc.useUtils();
  const { data: players } = trpc.player.list.useQuery();

  // Filter state
  const [filterPlayerId, setFilterPlayerId] = useState<string>("all");
  const [filterBodyPart, setFilterBodyPart] = useState<string>("all");
  const [filterTreatmentType, setFilterTreatmentType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const queryInput = useMemo(() => ({
    playerId: filterPlayerId !== "all" ? parseInt(filterPlayerId) : undefined,
    bodyPart: filterBodyPart !== "all" ? filterBodyPart : undefined,
    treatmentType: filterTreatmentType !== "all" ? filterTreatmentType : undefined,
    dateFrom: filterDateFrom ? new Date(filterDateFrom + "T00:00:00") : undefined,
    dateTo: filterDateTo ? new Date(filterDateTo + "T23:59:59") : undefined,
    limit: 50,
  }), [filterPlayerId, filterBodyPart, filterTreatmentType, filterDateFrom, filterDateTo]);

  const { data, isLoading } = trpc.treatment.list.useQuery(queryInput);
  const deleteTreatment = trpc.treatment.delete.useMutation({
    onSuccess: () => {
      toast.success("記録を削除しました");
      utils.treatment.list.invalidate();
    },
    onError: (err) => toast.error("削除に失敗しました: " + err.message),
  });

  // Detail dialog
  const [detailId, setDetailId] = useState<number | null>(null);
  const { data: detailData, isLoading: detailLoading, error: detailError } = trpc.treatment.getById.useQuery(
    { id: detailId ?? 0 },
    { enabled: detailId !== null && detailId > 0 }
  );

  // Detail Dialog Edit Mode States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTiming, setEditTiming] = useState<string>("");
  const [editDuration, setEditDuration] = useState<number>(15);
  const [editSeverity, setEditSeverity] = useState<string>("normal");
  const [editSoapS, setEditSoapS] = useState<string>("");
  const [editSoapO, setEditSoapO] = useState<string>("");
  const [editSoapA, setEditSoapA] = useState<string>("");
  const [editSoapP, setEditSoapP] = useState<string>("");
  const [editComment, setEditComment] = useState<string>("");

  // tRPC update treatment mutation
  const updateTreatment = trpc.treatment.update.useMutation({
    onSuccess: () => {
      toast.success("記録を更新しました");
      setIsEditing(false);
      utils.treatment.list.invalidate();
      if (detailId) {
        utils.treatment.getById.invalidate({ id: detailId });
      }
    },
    onError: (err) => {
      toast.error("更新に失敗しました: " + err.message);
    },
  });

  // Reset editing state and populate form values when detailData is loaded
  useEffect(() => {
    if (detailData) {
      setEditTiming(detailData.timing || "");
      setEditDuration(detailData.duration || 15);
      setEditSeverity(detailData.severity || "normal");
      setEditSoapS(detailData.soapS || "");
      setEditSoapO(detailData.soapO || "");
      setEditSoapA(detailData.soapA || "");
      setEditSoapP(detailData.soapP || "");
      setEditComment(detailData.comment || "");
    }
    setIsEditing(false);
  }, [detailData]);

  const getPlayerName = (playerId: number) => {
    return players?.find(p => p.id === playerId)?.name ?? "不明";
  };

  const getPlayerNumber = (playerId: number) => {
    return players?.find(p => p.id === playerId)?.number;
  };

  const activeFilterCount = [
    filterPlayerId !== "all",
    filterBodyPart !== "all",
    filterTreatmentType !== "all",
    filterDateFrom !== "",
    filterDateTo !== "",
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setFilterPlayerId("all");
    setFilterBodyPart("all");
    setFilterTreatmentType("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">記録一覧</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${data.total}件の記録` : "読み込み中..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
              <X className="h-3 w-3" />
              クリア
            </Button>
          )}
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            フィルター
            {hasActiveFilters && (
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">選手</label>
                <Select value={filterPlayerId} onValueChange={setFilterPlayerId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="全選手" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全選手</SelectItem>
                    {players?.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>#{p.number} {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">部位</label>
                <Select value={filterBodyPart} onValueChange={setFilterBodyPart}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="全部位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部位</SelectItem>
                    {BODY_PARTS.map(b => (
                      <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">処置内容</label>
                <Select value={filterTreatmentType} onValueChange={setFilterTreatmentType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="全処置" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全処置</SelectItem>
                    {TREATMENT_TYPES.map(t => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">日付（From）</label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">日付（To）</label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.rows.length > 0 ? (
        <div className="space-y-2">
          {data.rows.map(record => (
            <Card
              key={record.id}
              className={cn(
                "hover:shadow-md transition-all duration-200 border",
                ((record as any).severity || "normal") === "out" ? "border-red-500/70 bg-gradient-to-r from-red-500/5 to-transparent shadow-[0_0_10px_-4px_rgba(239,68,68,0.15)]"
                  : ((record as any).severity || "normal") === "limited" ? "border-amber-500/70 bg-gradient-to-r from-amber-500/5 to-transparent shadow-[0_0_10px_-4px_rgba(245,158,11,0.1)]"
                  : ((record as any).severity || "normal") === "caution" ? "border-blue-500/70 bg-gradient-to-r from-blue-500/5 to-transparent"
                  : "hover:border-border/80"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                          ((record as any).severity || "normal") === "out" ? "bg-red-500/15 text-red-500 font-extrabold"
                            : ((record as any).severity || "normal") === "limited" ? "bg-amber-500/15 text-amber-500 font-extrabold"
                            : ((record as any).severity || "normal") === "caution" ? "bg-blue-500/15 text-blue-500 font-extrabold"
                            : "bg-primary/10 text-primary"
                        )}>
                          <span className="text-[10px] font-semibold">
                            #{getPlayerNumber(record.playerId)}
                          </span>
                        </div>
                        <span className="font-medium text-sm">{getPlayerName(record.playerId)}</span>
                        {((record as any).severity || "normal") !== "normal" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0 border-0 font-bold tracking-tight rounded-md shrink-0",
                              ((record as any).severity || "normal") === "out" ? "bg-red-500/10 text-red-500"
                                : ((record as any).severity || "normal") === "limited" ? "bg-amber-500/10 text-amber-500"
                                : "bg-blue-500/10 text-blue-500"
                            )}
                          >
                            {((record as any).severity || "normal") === "out" ? "離脱" : ((record as any).severity || "normal") === "limited" ? "要制限" : "要注意"}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {getTimingLabel(record.timing)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{record.duration}分</span>
                    </div>

                    {/* Per-body-part treatments */}
                    <div className="space-y-1.5 pt-1">
                      {record.treatmentDetails && typeof record.treatmentDetails === "object" ? (
                        <div className="flex flex-col gap-1.5">
                          {Object.entries(record.treatmentDetails as Record<string, { treatmentTypes: string[]; duration: number }>).map(([partKey, details]) => (
                            <div key={partKey} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="font-semibold px-2 py-0.5 shrink-0 bg-accent/20">
                                {getBodyPartLabel(partKey)}
                              </Badge>
                              <span className="text-muted-foreground/60 shrink-0">→</span>
                              <div className="flex flex-wrap gap-1 items-center">
                                {details.treatmentTypes.map(tt => (
                                  <span key={tt} className="text-[11px] text-primary bg-primary/5 px-2 py-0.5 rounded-full font-medium">
                                    {getTreatmentTypeLabel(tt)}
                                  </span>
                                ))}
                                <span className="text-[11px] text-muted-foreground/80 ml-1">({details.duration}分)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Fallback for older data
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            {(record.bodyParts as string[]).map(bp => (
                              <Badge key={bp} variant="outline" className="text-xs font-normal px-2 py-0">
                                {getBodyPartLabel(bp)}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(record.treatmentTypes as string[]).map(tt => (
                              <span key={tt} className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                                {getTreatmentTypeLabel(tt)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Date + annotation indicator */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(record.treatmentDate), "yyyy/MM/dd (EEE) HH:mm", { locale: ja })}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <User className="h-3 w-3" />
                        担当: {(record as any).createdByName ?? "不明"}
                      </span>
                      {record.annotations && Object.keys(record.annotations as Record<string, unknown>).length > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <Pencil className="h-3 w-3" />
                          マーカーあり
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(record.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>記録を削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            この操作は取り消せません。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTreatment.mutate({ id: record.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            削除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters ? "条件に一致する記録がありません" : "まだ記録がありません"}
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              {hasActiveFilters ? "フィルター条件を変更してください" : "「記録する」から施術記録を追加してください"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailId !== null} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="flex flex-row items-center justify-between pr-8 border-b pb-2">
            <DialogTitle className="text-base font-bold">
              {isEditing ? "📝 治療記録を修正" : "📋 記録詳細"}
            </DialogTitle>
            {detailData && !detailLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 gap-1 text-xs shrink-0"
              >
                {isEditing ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    キャンセル
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" />
                    編集する
                  </>
                )}
              </Button>
            )}
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : detailError ? (
            <div className="py-8 text-center text-sm text-destructive">
              記録の読み込みに失敗しました
            </div>
          ) : detailData ? (
            isEditing ? (
              /* 📝 Edit Mode Form View */
              <div className="space-y-4 py-1.5 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3 border-b pb-2.5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">選手</p>
                    <p className="text-sm font-semibold">#{getPlayerNumber(detailData.playerId)} {getPlayerName(detailData.playerId)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">日時</p>
                    <p className="text-sm">{format(new Date(detailData.treatmentDate), "yyyy/MM/dd HH:mm", { locale: ja })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Timing */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">タイミング</label>
                    <select
                      value={editTiming}
                      onChange={(e) => setEditTiming(e.target.value)}
                      className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground"
                    >
                      {TIMING_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">処置時間 (分)</label>
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value, 10) || 15)}
                      className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground font-mono"
                      min="1"
                      max="300"
                    />
                  </div>

                  {/* Severity */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">重症度</label>
                    <select
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value)}
                      className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground"
                    >
                      <option value="normal">🟢 通常</option>
                      <option value="caution">🔵 要注意</option>
                      <option value="limited">🟡 要制限</option>
                      <option value="out">🔴 離脱</option>
                    </select>
                  </div>
                </div>

                {/* SOAP Form */}
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">SOAP記録</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">S (主観的情報)</label>
                      <Textarea
                        value={editSoapS}
                        onChange={e => setEditSoapS(e.target.value)}
                        placeholder="痛みや違和感の主観..."
                        className="resize-none h-14 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">O (客観的情報)</label>
                      <Textarea
                        value={editSoapO}
                        onChange={e => setEditSoapO(e.target.value)}
                        placeholder="圧痛、可動域、テスト結果など..."
                        className="resize-none h-14 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">A (評価)</label>
                      <Textarea
                        value={editSoapA}
                        onChange={e => setEditSoapA(e.target.value)}
                        placeholder="状態評価・アセスメント..."
                        className="resize-none h-14 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">P (計画)</label>
                      <Textarea
                        value={editSoapP}
                        onChange={e => setEditSoapP(e.target.value)}
                        placeholder="治療計画・次回方針..."
                        className="resize-none h-14 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-1 border-t pt-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">その他メモ（コメント）</label>
                  <Textarea
                    value={editComment}
                    onChange={e => setEditComment(e.target.value)}
                    placeholder="その他特記事項..."
                    className="resize-none h-14 text-xs rounded-xl"
                  />
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="text-xs h-8 rounded-xl"
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      updateTreatment.mutate({
                        id: detailData.id,
                        timing: editTiming,
                        duration: editDuration,
                        severity: editSeverity,
                        soapS: editSoapS || null,
                        soapO: editSoapO || null,
                        soapA: editSoapA || null,
                        soapP: editSoapP || null,
                        comment: editComment || null,
                      });
                    }}
                    disabled={updateTreatment.isPending}
                    className="text-xs h-8 px-5 rounded-xl"
                  >
                    {updateTreatment.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    変更を保存する
                  </Button>
                </div>
              </div>
            ) : (
              /* 📋 High-Fidelity Static View Mode */
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">選手</p>
                    <p className="text-sm font-medium">#{getPlayerNumber(detailData.playerId)} {getPlayerName(detailData.playerId)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">日時</p>
                    <p className="text-sm">{format(new Date(detailData.treatmentDate), "yyyy/MM/dd HH:mm", { locale: ja })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">タイミング</p>
                    <p className="text-sm">{getTimingLabel(detailData.timing)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">処置時間</p>
                    <p className="text-sm">{detailData.duration}分</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">重症度</p>
                    <p className="text-sm">
                      {detailData.severity === "out" ? "🔴 離脱"
                        : detailData.severity === "limited" ? "🟡 要制限"
                        : detailData.severity === "caution" ? "🔵 要注意"
                        : "🟢 通常"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">記録者</p>
                    <p className="text-sm font-medium">{(detailData as any).createdByName ?? "不明"}</p>
                  </div>
                </div>

                {detailData.treatmentDetails && typeof detailData.treatmentDetails === "object" ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground border-b pb-1">部位別施術内容</p>
                    <div className="space-y-2">
                      {Object.entries(detailData.treatmentDetails as Record<string, { treatmentTypes: string[]; duration: number }>).map(([partKey, details]) => (
                        <div key={partKey} className="p-3 rounded-xl border border-border bg-accent/10 flex items-start justify-between gap-4">
                          <div className="space-y-1.5">
                            <span className="font-semibold text-xs text-foreground block">
                              {getBodyPartLabel(partKey)}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {details.treatmentTypes.map(tt => (
                                <Badge key={tt} className="text-[11px] bg-primary/10 text-primary border-0 px-2 py-0.5">
                                  {getTreatmentTypeLabel(tt)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">{details.duration}分</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Fallback for older data
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">部位</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(detailData.bodyParts as string[]).map(bp => (
                          <Badge key={bp} variant="outline" className="text-xs">{getBodyPartLabel(bp)}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">処置内容</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(detailData.treatmentTypes as string[]).map(tt => (
                          <Badge key={tt} className="text-xs bg-primary/10 text-primary border-0">{getTreatmentTypeLabel(tt)}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* SOAP */}
                {(detailData.soapS || detailData.soapO || detailData.soapA || detailData.soapP) && (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">SOAP記録</p>
                    {detailData.soapS && (
                      <div>
                        <p className="text-xs text-muted-foreground">S（主観的情報）</p>
                        <p className="text-sm mt-0.5">{detailData.soapS}</p>
                      </div>
                    )}
                    {detailData.soapO && (
                      <div>
                        <p className="text-xs text-muted-foreground">O（客観的情報）</p>
                        <p className="text-sm mt-0.5">{detailData.soapO}</p>
                      </div>
                    )}
                    {detailData.soapA && (
                      <div>
                        <p className="text-xs text-muted-foreground">A（評価）</p>
                        <p className="text-sm mt-0.5">{detailData.soapA}</p>
                      </div>
                    )}
                    {detailData.soapP && (
                      <div>
                        <p className="text-xs text-muted-foreground">P（計画）</p>
                        <p className="text-sm mt-0.5">{detailData.soapP}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailData.comment && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-1">コメント</p>
                    <p className="text-sm">{detailData.comment}</p>
                  </div>
                )}

                {/* Annotations */}
                {detailData.annotations && Object.keys(detailData.annotations as Record<string, AnnotationData>).length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Pencil className="h-3 w-3" />
                      マーカー描画
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(detailData.annotations as Record<string, AnnotationData>).map(([partKey, annotData]) => (
                        <div key={partKey} className="space-y-1">
                          <p className="text-xs text-muted-foreground text-center">{getBodyPartLabel(partKey)}</p>
                          <AnnotationViewer
                            bodyPartKey={partKey}
                            data={annotData}
                            size={180}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
