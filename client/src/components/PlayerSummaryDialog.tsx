import React from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Activity, ClipboardList, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface PlayerSummaryDialogProps {
  playerId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerSummaryDialog({
  playerId,
  isOpen,
  onClose,
}: PlayerSummaryDialogProps) {
  // playerId が存在し、ダイアログが開いているときのみクエリを有効化
  const { data: summary, isLoading, error } = trpc.player.getSummary.useQuery(
    { playerId: playerId || 0 },
    { enabled: !!playerId && isOpen }
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-background/80 backdrop-blur-md border border-white/20 shadow-2xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">サマリーデータを読み込み中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            データの読み込みに失敗しました。
          </div>
        ) : summary ? (
          <>
            <DialogHeader className="border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <span>{summary.playerName}</span>
                    <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      #{summary.playerNumber} {summary.playerPosition}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    過去30日間の治療経過とアクティブなセルフエクササイズの自動サマリー
                  </DialogDescription>
                </div>
                <div className="bg-primary/10 text-primary px-3 py-2 rounded-xl text-center">
                  <div className="text-xl font-bold">{summary.totalTreatments} 回</div>
                  <div className="text-[10px] text-muted-foreground">過去30日の治療</div>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* 左側: 統計情報 */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span>治療部位の傾向 (過去30日)</span>
                  </h3>
                  {summary.bodyPartStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground">期間中の治療部位のデータはありません。</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.bodyPartStats.slice(0, 5).map((stat) => {
                        const percent = summary.totalTreatments > 0
                          ? Math.round((stat.count / summary.totalTreatments) * 100)
                          : 0;
                        return (
                          <div key={stat.part} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{stat.part}</span>
                              <span className="text-muted-foreground">{stat.count}回 ({percent}%)</span>
                            </div>
                            <Progress value={percent} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <span>主な処置内容 (過去30日)</span>
                  </h3>
                  {summary.treatmentTypeStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground">期間中の処置内容のデータはありません。</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {summary.treatmentTypeStats.map((stat) => (
                        <Badge key={stat.type} variant="secondary" className="px-2.5 py-1 text-xs bg-secondary/50 backdrop-blur-xs">
                          {stat.type} ({stat.count}回)
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 右側: 直近の経過 (SOAP) & アクティブなエクササイズ */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <span>直近の経過 (SOAP 履歴)</span>
                  </h3>
                  {summary.recentSOAP.length === 0 ? (
                    <p className="text-sm text-muted-foreground">直近のSOAP記録はありません。</p>
                  ) : (
                    <ScrollArea className="h-[250px] pr-3">
                      <div className="space-y-4">
                        {summary.recentSOAP.map((soap: any, idx: number) => {
                          const dateStr = format(new Date(soap.date), "yyyy/MM/dd");
                          return (
                            <div key={idx} className="border-l-2 border-primary/30 pl-3 py-1 space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="font-medium flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {dateStr}
                                </span>
                                <span>担当: {soap.createdByName || "未設定"}</span>
                              </div>
                              {soap.severity && (
                                <Badge
                                  variant={
                                    soap.severity === "severe" ? "destructive" : "outline"
                                  }
                                  className={`text-[10px] scale-90 origin-left ${
                                    soap.severity === "mild"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : ""
                                  }`}
                                >
                                  {soap.severity === "severe" ? "重度" :
                                   soap.severity === "mild" ? "軽度" : "普通"}
                                </Badge>
                              )}
                              <div className="text-xs text-foreground space-y-1 mt-1">
                                {soap.soapS && <div><span className="font-bold text-primary/70 mr-1">S:</span>{soap.soapS}</div>}
                                {soap.soapO && <div><span className="font-bold text-primary/70 mr-1">O:</span>{soap.soapO}</div>}
                                {soap.soapA && <div><span className="font-bold text-primary/70 mr-1">A:</span>{soap.soapA}</div>}
                                {soap.soapP && <div><span className="font-bold text-primary/70 mr-1">P:</span>{soap.soapP}</div>}
                                {soap.comment && !soap.soapS && !soap.soapO && !soap.soapA && !soap.soapP && (
                                  <div className="italic text-muted-foreground">{soap.comment}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <span>処方中のエクササイズメニュー</span>
                  </h3>
                  {summary.activeExercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">現在処方されているエクササイズはありません。</p>
                  ) : (
                    <ScrollArea className="h-[150px] pr-3">
                      <div className="space-y-2">
                        {summary.activeExercises.map((ex, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-muted/40 p-2 rounded text-xs border border-white/5">
                            <div className="font-medium">{ex.title}</div>
                            <div className="text-[10px] text-muted-foreground flex gap-2">
                              <span>{ex.category}</span>
                              {ex.points && <span>({ex.points})</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
