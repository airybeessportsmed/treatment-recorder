import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock, XCircle, LogOut } from "lucide-react";

export default function PendingApproval() {
  const { user } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });
  const { data: statusData, isLoading } = trpc.approval.myStatus.useQuery(undefined, {
    refetchInterval: 30000, // 30秒ごとに再確認
  });

  const status = statusData?.status;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6 text-center">
          {status === "rejected" ? (
            <>
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">アクセスが拒否されました</h1>
                <p className="text-sm text-muted-foreground">
                  このアプリへのアクセスが管理者によって拒否されました。<br />
                  ご不明な点は管理者にお問い合わせください。
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">承認待ちです</h1>
                <p className="text-sm text-muted-foreground">
                  アクセスのリクエストを送信しました。<br />
                  管理者が承認するまでしばらくお待ちください。
                </p>
              </div>
              <div className="w-full rounded-lg bg-muted/50 p-3 text-left space-y-1">
                <p className="text-xs text-muted-foreground font-medium">ログイン中のアカウント</p>
                <p className="text-sm font-medium text-foreground">{user?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{user?.email ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>このページは30秒ごとに自動更新されます</span>
              </div>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
