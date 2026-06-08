import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Save, Users, Clock, AlertCircle, Sun, Moon, Plus, Trash2, Star, RefreshCw } from "lucide-react";

const SCHEDULE_OPTIONS = [
  "Ball",
  "S&C(WT)",
  "S&C(Floor)",
  "OFF",
  "EVENT",
  "Free",
  "Other"
];

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

  // Selected trainer for adding to assignment manually
  const [newTrainerName, setNewTrainerName] = useState<string>("");

  // Visual state for assignments: Array<{ trainerName: string; playerNumbers: number[] }>
  const [assignmentRows, setAssignmentRows] = useState<Array<{ trainerName: string; playerNumbers: number[] }>>([]);

  // Filter unique players by number to prevent double entries (e.g. Haruna Yamashita duplicate data bug)
  const uniquePlayers = useMemo(() => {
    if (!players) return [];
    const seen = new Set<number>();
    return players.filter(p => {
      const duplicate = seen.has(p.number);
      seen.add(p.number);
      return !duplicate;
    });
  }, [players]);

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

  // Calculate 14 days date range for statistics (from -10 to +3 relative to today)
  const statsDateRange = useMemo(() => {
    const dates = [];
    const baseDate = new Date();
    for (let i = -10; i <= 3; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const offset = d.getTimezoneOffset();
      const localD = new Date(d.getTime() - (offset * 60 * 1000));
      dates.push(localD.toISOString().split("T")[0]);
    }
    return dates;
  }, []);

  // Load schedules for the 14 days stats range
  const { data: statsSchedulesData, isLoading: statsSchedulesLoading } = trpc.schedule.list.useQuery({
    dateFrom: statsDateRange[0],
    dateTo: statsDateRange[statsDateRange.length - 1],
  });

  // Load treatments for the 14 days stats range
  const { data: statsTreatmentsData, isLoading: statsTreatmentsLoading } = trpc.treatment.list.useQuery({
    dateFrom: new Date(statsDateRange[0] + "T00:00:00.000Z"),
    dateTo: new Date(statsDateRange[statsDateRange.length - 1] + "T23:59:59.999Z"),
    limit: 500,
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

  // Color configuration mapping for trainers
  const trainerColorMap = useMemo(() => {
    const colors = [
      { name: "red", bgStrong: "bg-red-500", bgLight: "bg-red-200 dark:bg-red-950/40", text: "text-red-700 dark:text-red-300", bgBadge: "bg-red-500 text-white" },
      { name: "emerald", bgStrong: "bg-emerald-500", bgLight: "bg-emerald-200 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", bgBadge: "bg-emerald-500 text-white" },
      { name: "amber", bgStrong: "bg-amber-500", bgLight: "bg-amber-200 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", bgBadge: "bg-amber-500 text-black font-bold" },
      { name: "blue", bgStrong: "bg-blue-500", bgLight: "bg-blue-200 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", bgBadge: "bg-blue-500 text-white" },
      { name: "indigo", bgStrong: "bg-indigo-500", bgLight: "bg-indigo-200 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", bgBadge: "bg-indigo-500 text-white" },
      { name: "violet", bgStrong: "bg-violet-500", bgLight: "bg-violet-200 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", bgBadge: "bg-violet-500 text-white" },
    ];

    const map: Record<string, typeof colors[0]> = {};
    const standardTrainers = ["Miya", "Shima", "Toshi"];
    
    standardTrainers.forEach((name, idx) => {
      map[name] = colors[idx];
    });

    if (trainers) {
      trainers.forEach((t, index) => {
        const name = t.name || "";
        if (standardTrainers.includes(name)) return; // skip fixed
        const lower = name.toLowerCase();
        if (lower.includes("miya")) {
          map[name] = colors[0];
        } else if (lower.includes("shima")) {
          map[name] = colors[1];
        } else if (lower.includes("toshi")) {
          map[name] = colors[2];
        } else {
          map[name] = colors[(index + 3) % colors.length];
        }
      });
    }

    return map;
  }, [trainers]);

  // Aggregate matrix statistics for the 14-day heatmap
  const statsMatrix = useMemo(() => {
    if (!uniquePlayers || !statsDateRange) return { rows: [], dateTotals: {}, activeTrainers: ["Miya", "Shima", "Toshi"] };

    // 1. Build schedule assignments lookup (date -> playerNumber -> trainerName)
    const schedLookup: Record<string, Record<number, string>> = {};
    statsDateRange.forEach(date => {
      schedLookup[date] = {};
    });

    if (statsSchedulesData) {
      statsSchedulesData.forEach(s => {
        const assignments = parseAssignmentsText(s.assignments);
        assignments.forEach(row => {
          row.playerNumbers.forEach(num => {
            if (schedLookup[s.date]) {
              schedLookup[s.date][num] = row.trainerName;
            }
          });
        });
      });
    }

    // 2. Build actual treatment lookup (date -> playerNumber -> trainerName)
    const actualLookup: Record<string, Record<number, string>> = {};
    statsDateRange.forEach(date => {
      actualLookup[date] = {};
    });

    if (statsTreatmentsData && statsTreatmentsData.rows) {
      statsTreatmentsData.rows.forEach(r => {
        const dateStr = new Date(r.treatmentDate).toISOString().split("T")[0];
        const player = players?.find(p => p.id === r.playerId);
        if (dateStr && player && actualLookup[dateStr]) {
          actualLookup[dateStr][player.number] = (r as any).createdByName || "不明";
        }
      });
    }

    // 3. Define active trainers list for column counts (Miya, Shima, Toshi, etc.)
    const activeTrainers = ["Miya", "Shima", "Toshi"];
    if (trainers) {
      trainers.forEach(t => {
        if (t.name && !activeTrainers.includes(t.name)) {
          activeTrainers.push(t.name);
        }
      });
    }

    // 4. Compute row data for each player
    const rows = uniquePlayers.map(player => {
      const cells = statsDateRange.map(date => {
        const scheduledTrainer = schedLookup[date]?.[player.number] || null;
        const actualTrainer = actualLookup[date]?.[player.number] || null;
        return {
          date,
          scheduledTrainer,
          actualTrainer,
          hasScheduled: !!scheduledTrainer,
          hasActual: !!actualTrainer,
        };
      });

      // Scheduled counts by trainer for this player
      const scheduledCounts: Record<string, number> = {};
      activeTrainers.forEach(t => {
        scheduledCounts[t] = 0;
      });
      cells.forEach(c => {
        if (c.scheduledTrainer && scheduledCounts[c.scheduledTrainer] !== undefined) {
          scheduledCounts[c.scheduledTrainer]++;
        }
      });

      // Total actual treatment count for this player within 14 days (scheduled + unscheduled)
      let totalActualCount = 0;
      if (statsTreatmentsData && statsTreatmentsData.rows) {
        totalActualCount = statsTreatmentsData.rows.filter(r => {
          const dateStr = new Date(r.treatmentDate).toISOString().split("T")[0];
          return r.playerId === player.id && statsDateRange.includes(dateStr);
        }).length;
      }

      return {
        player,
        cells,
        scheduledCounts,
        totalActualCount,
      };
    });

    // 5. Compute date totals (bottom row of table: date -> trainer -> count)
    const dateTotals: Record<string, Record<string, number>> = {};
    activeTrainers.forEach(t => {
      dateTotals[t] = {};
      statsDateRange.forEach(date => {
        dateTotals[t][date] = 0;
      });
    });

    statsDateRange.forEach(date => {
      rows.forEach(r => {
        const cell = r.cells.find(c => c.date === date);
        if (cell && cell.scheduledTrainer && dateTotals[cell.scheduledTrainer]) {
          dateTotals[cell.scheduledTrainer][date]++;
        }
      });
    });

    return {
      rows,
      dateTotals,
      activeTrainers,
    };
  }, [uniquePlayers, statsDateRange, statsSchedulesData, statsTreatmentsData, trainers, players]);



  // Handle selectedDate changes to populate form fields & set default trainers
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
      
      // Load default trainers config from localStorage if available
      const savedDefaults = localStorage.getItem("default_trainers");
      if (savedDefaults) {
        try {
          const names = JSON.parse(savedDefaults) as string[];
          if (names.length > 0) {
            setAssignmentRows(names.map(name => ({ trainerName: name, playerNumbers: [] })));
            return;
          }
        } catch (e) {
          console.error("Failed to parse saved default trainers", e);
        }
      }

      // Fallback: If no localStorage configuration, pre-register the first 3 trainers as defaults.
      if (trainers && trainers.length > 0) {
        const defaultRows = trainers.slice(0, 3).map(t => ({
          trainerName: t.name || "名称未設定",
          playerNumbers: []
        }));
        setAssignmentRows(defaultRows);
      } else {
        setAssignmentRows([]);
      }
    }
  }, [selectedDate, schedulesMap, trainers]);

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

  // Save current trainers structure as the default configuration
  const handleSaveDefaultTrainers = () => {
    const trainerNames = assignmentRows.map(row => row.trainerName).filter(Boolean);
    if (trainerNames.length === 0) {
      toast.error("デフォルトとして保存するスタッフが登録されていません");
      return;
    }
    localStorage.setItem("default_trainers", JSON.stringify(trainerNames));
    toast.success("現在のスタッフ構成をデフォルトとして保存しました！", {
      description: "以降、新規の日付を選択した際にこのスタッフ構成が自動表示されます。"
    });
  };

  // Reset default trainers config to system fallback (first 3 trainers)
  const handleResetDefaultTrainers = () => {
    localStorage.removeItem("default_trainers");
    toast.success("デフォルトのスタッフ構成を初期状態にリセットしました");
    
    // Immediately apply system fallback if current date is empty
    const current = schedulesMap[selectedDate];
    if (!current && trainers && trainers.length > 0) {
      const defaultRows = trainers.slice(0, 3).map(t => ({
        trainerName: t.name || "名称未設定",
        playerNumbers: []
      }));
      setAssignmentRows(defaultRows);
    }
  };

  // Handler to add a trainer row manually
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
          if (row.playerNumbers.includes(playerNumber)) return row;
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-foreground">
                        トリートメント割り当て
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        スタッフごとに割り当てを設定します。
                      </p>
                    </div>
                    
                    {/* Top action bar: Add Trainer & Set Default */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Set Default config button */}
                      <Button
                        type="button"
                        onClick={handleSaveDefaultTrainers}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl text-xs gap-1 border-primary/40 hover:bg-primary/5 text-primary font-medium"
                        title="現在のスタッフ構成をデフォルトとして保存します"
                      >
                        <Star className="h-3.5 w-3.5 fill-primary/10" />
                        デフォルトに設定
                      </Button>

                      {/* Reset defaults button */}
                      <Button
                        type="button"
                        onClick={handleResetDefaultTrainers}
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl text-[10px] text-muted-foreground hover:bg-muted font-medium"
                        title="デフォルト構成を初期設定に戻します"
                      >
                        初期化
                      </Button>

                      <div className="h-4 w-[1px] bg-border/80 mx-1 hidden sm:block" />

                      {/* Select/Add Trainer Form */}
                      <select
                        value={newTrainerName}
                        onChange={(e) => setNewTrainerName(e.target.value)}
                        className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-40 text-foreground"
                        disabled={trainersLoading}
                      >
                        <option value="">-- スタッフを追加 --</option>
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
                        追加
                      </Button>
                    </div>
                  </div>

                  {/* Registered Trainer Rows list */}
                  <div className="space-y-4">
                    {assignmentRows.length === 0 ? (
                      <div className="text-center py-8 border border-dashed rounded-2xl bg-muted/20">
                        <AlertCircle className="h-6 w-6 text-muted-foreground/45 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">トリートメント予定はまだありません</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">右上の「追加」からスタッフを追加するか、「デフォルトに設定」を行ってください</p>
                      </div>
                    ) : (
                      assignmentRows.map((row, idx) => (
                        <div key={idx} className="flex flex-col p-4 border rounded-2xl bg-card shadow-sm hover:shadow-md transition-all gap-3 relative">
                          
                          {/* Row Header: Trainer Name & Delete staff button */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                              <h4 className="text-sm font-extrabold text-indigo-500 dark:text-indigo-400">{row.trainerName}</h4>
                            </div>
                            
                            {/* Delete Trainer Button */}
                            <Button
                              type="button"
                              onClick={() => handleRemoveTrainerRow(row.trainerName)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg absolute top-3 right-3"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Quick selection grid: One-tap Player buttons */}
                          <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                              選手割り当て (クリックで追加 / 解除)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {playersLoading ? (
                                <span className="text-xs text-muted-foreground italic">選手データを読み込み中...</span>
                              ) : uniquePlayers && uniquePlayers.length > 0 ? (
                                uniquePlayers.map((p) => {
                                  const isAssigned = row.playerNumbers.includes(p.number);
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        if (isAssigned) {
                                          handleRemovePlayerFromTrainer(row.trainerName, p.number);
                                        } else {
                                          handleAddPlayerToTrainer(row.trainerName, p.number);
                                        }
                                      }}
                                      className={`h-7 px-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 border ${
                                        isAssigned
                                          ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                                          : "bg-background text-muted-foreground border-border hover:bg-accent/40"
                                      }`}
                                      title={`${p.name} (${p.position})`}
                                    >
                                      <span className={isAssigned ? "text-white" : "text-primary font-mono text-[10px]"}>
                                        #{p.number}
                                      </span>
                                      <span className="text-[9px] font-normal opacity-90 truncate max-w-[60px]">
                                        {p.name}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-muted-foreground italic">登録されている選手がいません。「選手管理」から追加してください。</span>
                              )}
                            </div>
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

      {/* 📊 トリートメント集計・ヒートマップ (14日間) */}
      <Card className="shadow-lg border border-border/80 overflow-hidden relative mt-6">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-indigo-500" />
              トリートメント集計・ヒートマップ (14日間)
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              10日前から当日、および3日後までの予定（濃い色）と、実際に行った治療（薄い色）をスタッフ別に一覧・集計します。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground bg-background px-3 py-2 rounded-xl border">
            <span className="font-semibold text-foreground uppercase tracking-wider block w-full mb-1 text-[9px]">凡例</span>
            <div className="flex items-center gap-1.5 mr-2">
              <span className="h-3 w-5 bg-red-500 rounded border shadow-sm shrink-0" />
              <span>Miya (予定)</span>
            </div>
            <div className="flex items-center gap-1.5 mr-2">
              <span className="h-3 w-5 bg-red-200 dark:bg-red-950/40 rounded border shrink-0" />
              <span>Miya (予定外)</span>
            </div>
            <div className="flex items-center gap-1.5 mr-2">
              <span className="h-3 w-5 bg-emerald-500 rounded border shadow-sm shrink-0" />
              <span>Shima (予定)</span>
            </div>
            <div className="flex items-center gap-1.5 mr-2">
              <span className="h-3 w-5 bg-emerald-200 dark:bg-emerald-950/40 rounded border shrink-0" />
              <span>Shima (予定外)</span>
            </div>
            <div className="flex items-center gap-1.5 mr-2">
              <span className="h-3 w-5 bg-amber-500 rounded border shadow-sm shrink-0" />
              <span>Toshi (予定)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-5 bg-amber-200 dark:bg-amber-950/40 rounded border shrink-0" />
              <span>Toshi (予定外)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {statsSchedulesLoading || statsTreatmentsLoading || playersLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-semibold">データを集計中...</p>
            </div>
          ) : statsMatrix.rows.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">表示する選手またはデータがありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-[11px] border-collapse min-w-[980px]">
                <thead>
                  {/* ヘッダー1行目：選手、日付相対、トレーナー名、合計 */}
                  <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold text-center">
                    <th className="py-2.5 px-3 text-left w-36 bg-background/50 border-r shrink-0">選手</th>
                    {statsDateRange.map((_, idx) => {
                      const rel = idx - 10;
                      const label = rel === 0 ? "今日" : rel > 0 ? `+${rel}` : `${rel}`;
                      return (
                        <th key={idx} className="p-1.5 text-center min-w-[32px] font-mono border-r text-[9px]">
                          {label}
                        </th>
                      );
                    })}
                    {statsMatrix.activeTrainers.map(t => {
                      const colorConfig = trainerColorMap[t];
                      return (
                        <th key={t} className={`p-1.5 text-center min-w-[48px] border-r font-extrabold ${colorConfig?.text}`}>
                          {t}
                        </th>
                      );
                    })}
                    <th className="p-2 w-16 text-center font-extrabold text-foreground bg-accent/20">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 選手行のループ */}
                  {statsMatrix.rows.map(({ player, cells, scheduledCounts, totalActualCount }) => (
                    <tr key={player.id} className="border-b hover:bg-muted/5 transition-all text-center">
                      {/* 選手名と背番号 */}
                      <td className="py-2 px-3 text-left font-bold text-foreground bg-background/30 border-r flex items-center gap-1.5 truncate h-[38px]">
                        <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md min-w-[24px] text-center shrink-0">
                          #{player.number}
                        </span>
                        <span className="truncate text-xs">{player.name}</span>
                      </td>

                      {/* 14日間のセル */}
                      {cells.map((cell, idx) => {
                        let bgColorClass = "bg-transparent hover:bg-muted/10";
                        let titleText = `${cell.date}`;
                        
                        // 予定と実績のマッピングから色を決定
                        const trainerName = cell.scheduledTrainer || cell.actualTrainer;
                        if (trainerName) {
                          const config = trainerColorMap[trainerName];
                          if (config) {
                            if (cell.hasScheduled) {
                              bgColorClass = config.bgStrong + " text-white shadow-sm ring-1 ring-white/10";
                              titleText += ` - ${trainerName} (予定あり)`;
                            } else if (cell.hasActual) {
                              bgColorClass = config.bgLight + ` ${config.text} border border-dashed`;
                              titleText += ` - ${trainerName} (予定外実績)`;
                            }
                          }
                        }

                        return (
                          <td
                            key={idx}
                            title={titleText}
                            className={`p-1 border-r relative h-[38px] transition-all font-bold ${bgColorClass}`}
                          >
                            {/* セル内の中身は空、またはツールチップで情報を提示 */}
                          </td>
                        );
                      })}

                      {/* トレーナーごとのスケジュール（予定）アサインカウント */}
                      {statsMatrix.activeTrainers.map(t => {
                        const count = scheduledCounts[t] || 0;
                        const config = trainerColorMap[t];
                        return (
                          <td key={t} className={`p-1.5 border-r font-mono font-bold text-center ${count > 0 ? `${config?.text} bg-muted/10` : 'text-muted-foreground/30'}`}>
                            {count > 0 ? count : "-"}
                          </td>
                        );
                      })}

                      {/* すべての治療実施回数の合計 */}
                      <td className="p-1.5 font-mono font-extrabold text-center bg-accent/15 text-foreground text-xs">
                        {totalActualCount}
                      </td>
                    </tr>
                  ))}

                  {/* 下側の集計：トレーナーごとのアサイン数合計行 */}
                  {statsMatrix.activeTrainers.map(t => {
                    const config = trainerColorMap[t];
                    const dateTotalsForTrainer = statsMatrix.dateTotals[t] || {};
                    const totalScheduledAllPlayers = Object.values(dateTotalsForTrainer).reduce((sum, c) => sum + c, 0);

                    return (
                      <tr key={t} className="bg-muted/20 border-t font-semibold text-center h-[32px]">
                        {/* 左端：トレーナー名 */}
                        <td className="py-1 px-3 text-left border-r bg-background/50 h-[32px] flex items-center shrink-0">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0 ${config?.bgBadge}`}>
                            {t}
                          </span>
                        </td>

                        {/* 各日付の合計値 */}
                        {statsDateRange.map((date, idx) => {
                          const val = dateTotalsForTrainer[date] || 0;
                          return (
                            <td key={idx} className={`p-1 border-r font-mono text-[10px] text-center ${val > 0 ? 'font-extrabold bg-muted/30 text-foreground' : 'text-muted-foreground/30'}`}>
                              {val > 0 ? val : ""}
                            </td>
                          );
                        })}

                        {/* 空白セル（右側トレーナー列）と、アサイン総計 */}
                        {statsMatrix.activeTrainers.map(oth => (
                          <td key={oth} className="p-1 border-r bg-background/20" />
                        ))}

                        {/* そのトレーナーの14日間スケジュール全選手合計 */}
                        <td className={`p-1.5 font-mono font-bold text-center ${config?.text} bg-accent/5`}>
                          {totalScheduledAllPlayers > 0 ? totalScheduledAllPlayers : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
