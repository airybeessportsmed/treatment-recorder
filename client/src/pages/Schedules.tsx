import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Save, Users, Clock, AlertCircle, Sun, Moon, Plus, Trash2, X } from "lucide-react";

const SCHEDULE_OPTIONS = [
  "Ball",
  "S&C(WT)",
  "S&C(Floor)",
  "OFF",
  "EVENT",
  "Free",
  "Other"
];

export default function Schedules() {
  const utils = trpc.useUtils();

  // Selected date for editing
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  });

  // Load existing players list
  const { data: players, isLoading: playersLoading } = trpc.player.list.useQuery();

  // Load registered trainers (users)
  const { data: trainers, isLoading: trainersLoading } = trpc.auth.listTrainers.useQuery();

  // Selected trainer for adding to assignment
  const [newTrainerName, setNewTrainerName] = useState<string>("");

  // Visual state for assignments: Array<{ trainerName: string; playerNumbers: number[] }>
  const [assignmentRows, setAssignmentRows] = useState<Array<{ trainerName: string; playerNumbers: number[] }>>([]);

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
  const { data: schedulesData } = trpc.schedule.list.useQuery({
    dateFrom: dateRange[0],
    dateTo: dateRange[dateRange.length - 1],
  });

  // Current schedule form state
  const [practiceAm, setPracticeAm] = useState<string>("");
  const [practicePm, setPracticePm] = useState<string>("");

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

  // Parse text format "TrainerName #14,#13" into structured array
  const parseAssignmentsText = (text: string | null | undefined): Array<{ trainerName: string; playerNumbers: number[] }> => {
    if (!text) return [];
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
      const match = line.match(/^([^#\s：:]+)(?:\s*[:：]\s*|\s+)?(.*)$/);
      if (!match) return { trainerName: line, playerNumbers: [] };
      const trainerName = match[1];
      const playerText = match[2];
      const numbers: number[] = [];
      const regex = /#(\d+)/g;
      let m;
      while ((m = regex.exec(playerText)) !== null) {
        numbers.push(parseInt(m[1], 10));
      }
      return { trainerName, playerNumbers: numbers };
    });
  };

  // Convert structured array back to text format for saving
  const serializeAssignments = (rows: Array<{ trainerName: string; playerNumbers: number[] }>): string => {
    return rows
      .filter(row => row.trainerName)
      .map(row => `${row.trainerName} ${row.playerNumbers.map(n => `#${n}`).join(",")}`)
      .join("\n");
  };

  // Handle selectedDate changes to populate form fields
  useMemo(() => {
    const current = schedulesMap[selectedDate];
    if (current) {
      setPracticeAm(current.practiceAm || "");
      setPracticePm(current.practicePm || "");
      const parsed = parseAssignmentsText(current.assignments);
      setAssignmentRows(parsed);
    } else {
      setPracticeAm("");
      setPracticePm("");
      setAssignmentRows([]);
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
      practiceAm: practiceAm || null,
      practicePm: practicePm || null,
      assignments: serializeAssignments(assignmentRows) || null,
    });
  };

  // Handler to add a trainer row
  const handleAddTrainer = () => {
    if (!newTrainerName) {
      toast.error("スタッフを選択してください");
      return;
    }
    // Prevent duplicates
    if (assignmentRows.some(row => row.trainerName === newTrainerName)) {
      toast.error("このスタッフは既に追加されています");
      return;
    }
    setAssignmentRows(prev => [...prev, { trainerName: newTrainerName, playerNumbers: [] }]);
    setNewTrainerName("");
  };

  // Handler to remove a trainer row
  const handleRemoveTrainerRow = (trainerName: string) => {
    setAssignmentRows(prev => prev.filter(row => row.trainerName !== trainerName));
  };

  // Handler to add a player to a trainer
  const handleAddPlayerToTrainer = (trainerName: string, playerNumber: number) => {
    setAssignmentRows(prev =>
      prev.map(row => {
        if (row.trainerName === trainerName) {
          if (row.playerNumbers.includes(playerNumber)) {
            toast.error("この選手は既にこのスタッフに割り当てられています");
            return row;
          }
          return { ...row, playerNumbers: [...row.playerNumbers, playerNumber] };
        }
        return row;
      })
    );
  };

  // Handler to remove a player from a trainer
  const handleRemovePlayerFromTrainer = (trainerName: string, playerNumber: number) => {
    setAssignmentRows(prev =>
      prev.map(row => {
        if (row.trainerName === trainerName) {
          return { ...row, playerNumbers: row.playerNumbers.filter(num => num !== playerNumber) };
        }
        return row;
      })
    );
  };

  // Quick template helpers
  const handleApplyTemplate = (type: "SC_BALL" | "OFF" | "MATCH") => {
    if (type === "SC_BALL") {
      setPracticeAm("S&C(WT)");
      setPracticePm("Ball");
    } else if (type === "OFF") {
      setPracticeAm("OFF");
      setPracticePm("OFF");
    } else if (type === "MATCH") {
      setPracticeAm("EVENT");
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
        {/* Left 2 Columns: Edit Form */}
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
                  イベント
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* AM Schedule */}
                  <div className="space-y-2">
                    <Label htmlFor="practice-am" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      午前練習予定 (AM)
                    </Label>
                    <select
                      id="practice-am"
                      value={practiceAm}
                      onChange={(e) => setPracticeAm(e.target.value)}
                      className="rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full text-foreground"
                    >
                      <option value="">-- スケジュールを選択 --</option>
                      {SCHEDULE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* PM Schedule */}
                  <div className="space-y-2">
                    <Label htmlFor="practice-pm" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                      <Moon className="h-3.5 w-3.5 text-indigo-400" />
                      午後練習予定 (PM)
                    </Label>
                    <select
                      id="practice-pm"
                      value={practicePm}
                      onChange={(e) => setPracticePm(e.target.value)}
                      className="rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full text-foreground"
                    >
                      <option value="">-- スケジュールを選択 --</option>
                      {SCHEDULE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rich Treatment Assignment Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Label className="text-sm font-bold text-foreground">
                      トリートメント割り当て
                    </Label>
                    
                    {/* Add Trainer Form */}
                    <div className="flex items-center gap-2">
                      <select
                        value={newTrainerName}
                        onChange={(e) => setNewTrainerName(e.target.value)}
                        className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-48 text-foreground"
                        disabled={trainersLoading}
                      >
                        <option value="">-- スタッフを選択 --</option>
                        {trainers && trainers.map(t => (
                          <option key={t.id} value={t.name || ""}>{t.name || "名称未設定"}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        onClick={handleAddTrainer}
                        size="sm"
                        className="h-8 rounded-xl text-xs gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        スタッフ追加
                      </Button>
                    </div>
                  </div>

                  {/* Registered Trainer Rows list */}
                  <div className="space-y-3">
                    {assignmentRows.length === 0 ? (
                      <div className="text-center py-8 border border-dashed rounded-2xl bg-muted/20">
                        <AlertCircle className="h-6 w-6 text-muted-foreground/45 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">トリートメント予定はまだありません</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">右上の「スタッフ追加」から開始してください</p>
                      </div>
                    ) : (
                      assignmentRows.map((row, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border rounded-2xl bg-card shadow-sm hover:shadow-md transition-all">
                          {/* Left Side: Trainer Name & Assigned Players list */}
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-indigo-500" />
                              <h4 className="text-sm font-bold text-indigo-500 dark:text-indigo-400">{row.trainerName}</h4>
                            </div>
                            
                            {/* Assigned Players list as badges */}
                            <div className="flex flex-wrap gap-1.5 min-h-[26px] items-center">
                              {row.playerNumbers.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">担当選手なし</span>
                              ) : (
                                row.playerNumbers.map((num) => {
                                  const name = players?.find(p => p.number === num)?.name;
                                  return (
                                    <span
                                      key={num}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                    >
                                      #{num} {name ? `(${name})` : ""}
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePlayerFromTrainer(row.trainerName, num)}
                                        className="hover:bg-indigo-500/20 rounded-full p-0.5 text-indigo-500 transition-colors"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Right Side: Select Player to Add & Delete staff button */}
                          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                            {/* Select Player Dropdown */}
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleAddPlayerToTrainer(row.trainerName, parseInt(val, 10));
                                  e.target.value = ""; // Reset
                                }
                              }}
                              className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-40 text-foreground"
                              disabled={playersLoading}
                            >
                              <option value="">-- 選手を追加 --</option>
                              {players && players.map(p => (
                                <option key={p.id} value={p.number}>#{p.number} {p.name}</option>
                              ))}
                            </select>

                            {/* Delete Trainer Button */}
                            <Button
                              type="button"
                              onClick={() => handleRemoveTrainerRow(row.trainerName)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={saveSchedule.isPending}
                  className="w-full rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 pt-3"
                >
                  <Save className="h-4 w-4" />
                  {saveSchedule.isPending ? "保存中..." : "スケジュールを保存する"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Date List Range Preview */}
        <div className="space-y-6">
          <Card className="shadow-md h-full">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                前後1週間のプレビュー
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                選択した日付の前後3日間の登録予定を確認できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {dateRange.map(dStr => {
                const isSelected = dStr === selectedDate;
                const sched = schedulesMap[dStr];
                return (
                  <div
                    key={dStr}
                    onClick={() => setSelectedDate(dStr)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/[0.02] ring-1 ring-primary/30 font-bold"
                        : "border-border/60 hover:bg-accent/20 bg-background"
                    }`}
                  >
                    <div className="flex justify-between items-center pb-1.5 border-b border-border/30">
                      <span className={`text-xs ${isSelected ? "text-primary font-bold" : "text-foreground"}`}>{dStr}</span>
                      {isSelected && <span className="text-[9px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">選択中</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] text-muted-foreground">
                      <div>AM: <span className="font-bold text-foreground">{sched?.practiceAm || "OFF"}</span></div>
                      <div>PM: <span className="font-bold text-foreground">{sched?.practicePm || "OFF"}</span></div>
                    </div>
                    {sched?.assignments && (
                      <div className="pt-1.5 text-[9px] text-muted-foreground flex flex-wrap gap-1">
                        {parseAssignmentsText(sched.assignments).map((row, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-accent rounded text-[8px] truncate max-w-[80px]">
                            {row.trainerName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

