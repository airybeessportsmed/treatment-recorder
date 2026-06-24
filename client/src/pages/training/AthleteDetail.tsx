import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardList, Plus, BarChart2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AthleteDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const athleteId = parseInt(id);
  const [, setLocation] = useLocation();

  const { data: athlete } = trpc.athletes.get.useQuery({ id: athleteId });
  const { data: programs } = trpc.programs.list.useQuery({ athleteId });

  if (!athlete) {
    return <div className="text-center py-8 text-muted-foreground">読み込み中...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/training/athletes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">選手詳細</h1>
      </div>

      {/* Athlete Info Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
              {athlete.number ?? "#"}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{athlete.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {athlete.position && <Badge variant="secondary">{athlete.position}</Badge>}
                {athlete.bodyWeight && (
                  <span className="text-sm text-muted-foreground">{athlete.bodyWeight} kg</span>
                )}
              </div>
              {athlete.notes && (
                <p className="text-sm text-muted-foreground mt-2">{athlete.notes}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Programs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            プログラム履歴 ({programs?.length ?? 0}件)
          </h2>
          {user?.trainingRole !== "read" && (
            <Button
              size="sm"
              onClick={() => setLocation(`/training/programs/create?athleteId=${athleteId}`)}
            >
              <Plus className="h-4 w-4 mr-1" /> 新規作成
            </Button>
          )}
        </div>

        {!programs || programs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>プログラムがありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {programs.map(program => (
              <Card
                key={program.id}
                className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(`/training/programs/${program.id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{program.date}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        {program.periodCategory && (
                          <Badge variant="outline" className="text-xs">{program.periodCategory}</Badge>
                        )}
                        {program.phase && (
                          <span className="text-xs text-muted-foreground">{program.phase}</span>
                        )}
                      </div>
                      {program.goal && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{program.goal}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {program.totalSets && (
                        <p className="text-sm font-medium">{program.totalSets} sets</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Records Link */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setLocation(`/training/records?athleteId=${athleteId}`)}
      >
        <BarChart2 className="h-4 w-4 mr-2" />
        記録・推移グラフを見る
      </Button>
    </div>
  );
}
