import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart2, TrendingUp, Search } from "lucide-react";
import { ChangeReasonBadge, type ChangeReason } from "@/components/ChangeReasonBadge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useSearch } from "wouter";

export default function Records() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preAthleteId = params.get("athleteId") ?? "all";

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(preAthleteId);
  const [exerciseFilter, setExerciseFilter] = useState("");

  const { data: athletes } = trpc.athletes.list.useQuery();
  const { data: history } = trpc.records.history.useQuery(
    { athleteId: parseInt(selectedAthleteId) },
    { enabled: selectedAthleteId !== "all" }
  );

  // Group by exercise name
  const exerciseGroups = useMemo(() => {
    if (!history) return {};
    const groups: Record<string, typeof history> = {};
    for (const r of history) {
      if (!groups[r.exerciseName]) groups[r.exerciseName] = [];
      groups[r.exerciseName].push(r);
    }
    return groups;
  }, [history]);

  const filteredExercises = Object.entries(exerciseGroups).filter(([name]) =>
    exerciseFilter === "" || name.includes(exerciseFilter)
  );

  // Parse load value to number for charting
  const parseLoad = (load: string | null): number | null => {
    if (!load) return null;
    const match = load.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">記録・履歴</h1>
      </div>

      <div className="flex gap-2">
        <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="選手を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">選手を選択してください</SelectItem>
            {athletes?.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>
                #{a.number} {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedAthleteId !== "all" && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="種目名で絞り込み..."
              value={exerciseFilter}
              onChange={e => setExerciseFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {selectedAthleteId === "all" ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>選手を選択すると記録履歴が表示されます</p>
        </div>
      ) : !history || history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>記録がまだありません</p>
          <p className="text-sm mt-1">プログラム実施後、写真OCRや手動入力で記録を追加してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {filteredExercises.length}種目の記録
          </p>
          {filteredExercises.map(([exerciseName, records]) => {
            const chartData = records.map(r => ({
              date: r.date,
              load: parseLoad(r.actualLoad),
              reps: r.actualReps,
              sets: r.actualSets,
            })).filter(d => d.load !== null);

            const hasLoadData = chartData.length > 0;

            return (
              <Card key={exerciseName} className="border shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {exerciseName}
                    <Badge variant="secondary" className="text-xs">{records.length}回</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {hasLoadData && chartData.length >= 2 ? (
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickFormatter={v => v.slice(5)}
                          />
                          <YAxis tick={{ fontSize: 10 }} unit="kg" />
                          <Tooltip
                            formatter={(value, name) => [`${value}kg`, "重量"]}
                            labelFormatter={l => `日付: ${l}`}
                          />
                          <Line
                            type="monotone"
                            dataKey="load"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}

                  {/* Records Table */}
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 text-muted-foreground font-medium">日付</th>
                          <th className="text-center py-1 text-muted-foreground font-medium">SET</th>
                          <th className="text-center py-1 text-muted-foreground font-medium">回数</th>
                          <th className="text-center py-1 text-muted-foreground font-medium">重量</th>
                          <th className="text-left py-1 text-muted-foreground font-medium">変更理由 / メモ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-1">{r.date}</td>
                            <td className="text-center py-1">{r.actualSets ?? "-"}</td>
                            <td className="text-center py-1">{r.actualReps ?? "-"}</td>
                            <td className="text-center py-1 font-medium">{r.actualLoad ?? "-"}</td>
                            <td className="py-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                {r.changeReason && (
                                  <ChangeReasonBadge
                                    reason={r.changeReason as ChangeReason}
                                    note={r.changeNote}
                                    compact
                                  />
                                )}
                                {r.notes && (
                                  <span className="text-muted-foreground text-xs">{r.notes}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
