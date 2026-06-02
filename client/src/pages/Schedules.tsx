import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Save, Users, Clock, AlertCircle, ArrowLeft, Sun, Moon } from "lucide-react";

export default function Schedules() {
  const utils = trpc.useUtils();

  // Selected date for editing
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  });

  // Load existing players list for the helper panel
  const { data: players, isLoading: playersLoading } = trpc.player.list.useQuery();

  // Calculate standard 7 days date range from selectedDate for preview list
  const dateRange = useMemo(() => {
    const dates = [];
    const baseDate = new Date(selectedDate);
    for (let i = -3; i <= 3; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const offset = d.getTimezoneOffset();
      const localD = new Date(d.getTime() - (offset * 60 * 1000));
      dates.push(localD.toISOString().split("T")[0]);
    }
    return dates;
  }, [selectedDate]);

  // Load schedules for the 7 days range
  const { data: schedulesData, isLoading: schedulesLoading } = trpc.schedule.list.useQuery({
    dateFrom: dateRange[0],
    dateTo: dateRange[dateRange.length - 1],
  });

  // Current schedule form state
  const [practiceAm, setPracticeAm] = useState<string>("");
  const [practicePm, setPracticePm] = useState<string>("");
  const [assignments, setAssignments] = useState<string>("");

  // Map Loaded Schedule Data
  const schedulesMap = useMemo(() => {
    const map: Record<string, typeof schedulesData[0]> = {};
    if (schedulesData) {
      schedulesData.forEach((s) => {
        map[s.date] = s;
      });
    }
    return map;
  }, [schedulesData]);

  // Handle selectedDate changes to populate form fields
  useMemo(() => {
    const current = schedulesMap[selectedDate];
    if (current) {
      setPracticeAm(current.practiceAm || "");
      setPracticePm(current.practicePm || "");
      setAssignments(current.assignments || "");
    } else {
      setPracticeAm("");
      setPracticePm("");
      setAssignments("");
    }
  }, [selectedDate, schedulesMap]);

  // Save Schedule mutation
  const saveSchedule = trpc.schedule.save.useMutation({
    onSuccess: () => {
      toast.success("スケジュールを保存しました");
      utils.schedule.list.invalidate();
    },
    onError: (err) => {
      toast.error("保存に失敗しました: " + err.message);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSchedule.mutate({
      date: selectedDate,
      practiceAm: practiceAm.trim() || null,
      practicePm: practicePm.trim() || null,
      assignments: assignments.trim() || null,
    });
  };

  // Click handler to insert player number at the cursor position
  const handleInsertPlayer = (number: number) => {
    const textarea = document.getElementById("assignments-input") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const insertText = `#${number}`;

    const newText = text.substring(0, start) + insertText + text.substring(end);
    setAssignments(newText);

    // Refocus and place cursor after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertText.length, start + insertText.length);
    }, 10);
  };

  // Quick template helpers
  const handleApplyTemplate = (type: "SC_BALL" | "OFF" | "MATCH") => {
    if (type === "SC_BALL") {
      setPracticeAm("S&C");
      setPracticePm("Ball");
    } else if (type === "OFF") {
      setPracticeAm("OFF");
      setPracticePm("OFF");
    } else if (type === "MATCH") {
      setPracticeAm("GAME");
      setPracticePm("OFF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">スケジュール管理</h1>
        <p className="text-muted-foreground text-sm">
          練習予定とトリートメントの担当者・選手割り当てをカレンダーから登録・編集します。
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Edit Form & Weeks list */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Calendar className="h-5 w-5 text-primary" />
                予定を登録する日付の選択
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/50 focus:border-primary focus:outline-none text-sm transition-all shadow-sm max-w-xs w-full text-foreground"
                />
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() - 1);
                      const offset = d.getTimezoneOffset();
                      const prevD = new Date(d.getTime() - (offset * 60 * 1000));
                      setSelectedDate(prevD.toISOString().split("T")[0]);
                    }}
                    className="text-xs"
                  >
                    前日
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date();
                      const offset = d.getTimezoneOffset();
                      const localD = new Date(d.getTime() - (offset * 60 * 1000));
                      setSelectedDate(localD.toISOString().split("T")[0]);
                    }}
                    className="text-xs"
                  >
                    今日
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() + 1);
                      const offset = d.getTimezoneOffset();
                      const nextD = new Date(d.getTime() - (offset * 60 * 1000));
                      setSelectedDate(nextD.toISOString().split("T")[0]);
                    }}
                    className="text-xs"
                  >
                    翌日
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  スケジュール編集 ({selectedDate})
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  選択した日付の練習スケジュールと担当トリートメントを編集します。
                </CardDescription>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleApplyTemplate("SC_BALL")}
                  className="text-[10px] h-7 px-2"
                >
                  練習日
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleApplyTemplate("OFF")}
                  className="text-[10px] h-7 px-2"
                >
                  OFF
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleApplyTemplate("MATCH")}
                  className="text-[10px] h-7 px-2"
                >
                  試合日
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="practice-am" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      午前練習予定 (AM)
                    </Label>
                    <Input
                      id="practice-am"
                      placeholder="例: S&C"
                      value={practiceAm}
                      onChange={(e) => setPracticeAm(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practice-pm" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                      <Moon className="h-3.5 w-3.5 text-indigo-400" />
                      午後練習予定 (PM)
                    </Label>
                    <Input
                      id="practice-pm"
                      placeholder="例: Ball"
                      value={practicePm}
                      onChange={(e) => setPracticePm(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignments-input" className="text-xs font-semibold text-muted-foreground">
                    トリートメント割り当て
                  </Label>
                  <Textarea
                    id="assignments-input"
                    placeholder={`例:\nMiya #14,#13,#22\nShima #1,#10,#19\nToshi #6,#18`}
                    value={assignments}
                    onChange={(e) => setAssignments(e.target.value)}
                    rows={6}
                    className="font-mono text-sm rounded-xl leading-relaxed"
                  />
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5 bg-accent/30 p-2.5 rounded-lg border">
                    <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      <strong>書式ルール:</strong> <code>担当者名 #背番号,#背番号</code> の形式で改行して入力してください。右側の選手一覧からワンクリックで背番号を挿入することもできます。
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saveSchedule.isPending}
                  className="w-full rounded-xl font-semibold shadow-md flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveSchedule.isPending ? "保存中..." : "スケジュールを保存する"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Player Checklist Helper */}
        <div className="space-y-6">
          <Card className="shadow-md h-full">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                選手背番号アシスタント
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                クリックすると、左側の入力欄のカーソル位置に背番号が自動で挿入されます。
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              {playersLoading ? (
                <p className="text-sm text-muted-foreground">選手データをロード中...</p>
              ) : players && players.length > 0 ? (
                <div className="grid grid-cols-1 gap-1.5">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleInsertPlayer(p.number)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-primary/5 hover:border-primary/40 text-left transition-all text-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 w-10 text-center shrink-0">
                          #{p.number}
                        </span>
                        <span className="font-medium group-hover:text-primary transition-colors truncate">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium bg-muted px-2 py-0.5 rounded border">
                        {p.position}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  選手が登録されていません。先に「選手管理」から追加してください。
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
