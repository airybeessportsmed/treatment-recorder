import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, Users, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function UserApproval() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: number; name: string; action: "approved" | "rejected" } | null>(null);
  const [note, setNote] = useState("");

  const utils = trpc.useUtils();
  const { data: approvalList, isLoading } = trpc.approval.list.useQuery();
  const updateMutation = trpc.approval.updateStatus.useMutation({
    onSuccess: () => {
      utils.approval.list.invalidate();
      toast.success(selectedUser?.action === "approved" ? "承認しました" : "拒否しました");
      setDialogOpen(false);
      setNote("");
    },
    onError: () => toast.error("操作に失敗しました"),
  });

  const updatePermissionsMutation = trpc.approval.updatePermissions.useMutation({
    onSuccess: () => {
      utils.approval.list.invalidate();
      toast.success("権限を更新しました");
    },
    onError: () => toast.error("権限の更新に失敗しました"),
  });

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">管理者のみアクセスできます</p>
        </div>
      </DashboardLayout>
    );
  }

  const pendingList = approvalList?.filter(a => a.approval.status === "pending") ?? [];
  const otherList = approvalList?.filter(a => a.approval.status !== "pending") ?? [];

  const openDialog = (userId: number, name: string, action: "approved" | "rejected") => {
    setSelectedUser({ userId, name, action });
    setNote("");
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedUser) return;
    updateMutation.mutate({
      userId: selectedUser.userId,
      status: selectedUser.action,
      note: note || undefined,
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20"><Clock className="h-3 w-3" />承認待ち</Badge>;
      case "approved":
        return <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20"><CheckCircle className="h-3 w-3" />承認済み</Badge>;
      case "rejected":
        return <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20"><XCircle className="h-3 w-3" />拒否</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ユーザー承認管理</h1>
            <p className="text-sm text-muted-foreground">アクセスを申請したユーザーの承認・拒否を管理します</p>
          </div>
        </div>

        {/* 承認待ち */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              承認待ち
              {pendingList.length > 0 && (
                <Badge className="bg-amber-500 text-white text-xs">{pendingList.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingList.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-sm">承認待ちのユーザーはいません</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingList.map(({ approval, user: u }) => (
                  <div key={approval.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{u?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u?.email ?? "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        申請日時: {new Date(approval.createdAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => openDialog(u!.id, u?.name ?? "このユーザー", "rejected")}
                      >
                        <XCircle className="h-3 w-3" />
                        拒否
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => openDialog(u!.id, u?.name ?? "このユーザー", "approved")}
                      >
                        <CheckCircle className="h-3 w-3" />
                        承認
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 承認済み・拒否済み */}
        {otherList.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                処理済みユーザー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {otherList.map(({ approval, user: u }) => {
                  const handlePermissionChange = (
                    targetUserId: number,
                    treatmentRole: "read" | "write" | "admin",
                    trainingRole: "read" | "write" | "admin"
                  ) => {
                    updatePermissionsMutation.mutate({
                      userId: targetUserId,
                      treatmentRole,
                      trainingRole,
                    });
                  };

                  return (
                    <div key={approval.id} className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4 border-b last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{u?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u?.email ?? "—"}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        {approval.status === "approved" && u && (
                          <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-2 rounded-lg border border-muted">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-muted-foreground">施術:</span>
                              <select
                                value={u.treatmentRole || "write"}
                                onChange={(e) => handlePermissionChange(u.id, e.target.value as any, (u.trainingRole || "write") as any)}
                                disabled={updatePermissionsMutation.isPending}
                                className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                              >
                                <option value="read">閲覧のみ</option>
                                <option value="write">書き込み可</option>
                                <option value="admin">全権限 (admin)</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-muted-foreground">練習:</span>
                              <select
                                value={u.trainingRole || "write"}
                                onChange={(e) => handlePermissionChange(u.id, (u.treatmentRole || "write") as any, e.target.value as any)}
                                disabled={updatePermissionsMutation.isPending}
                                className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                              >
                                <option value="read">閲覧のみ</option>
                                <option value="write">書き込み可</option>
                                <option value="admin">全権限 (admin)</option>
                              </select>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          {statusBadge(approval.status)}
                          {approval.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200" onClick={() => openDialog(u!.id, u?.name ?? "このユーザー", "rejected")}>
                                <XCircle className="h-3 w-3" />拒否
                              </Button>
                              <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => openDialog(u!.id, u?.name ?? "このユーザー", "approved")}>
                                <CheckCircle className="h-3 w-3" />承認
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 確認ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUser?.action === "approved" ? (
                <><CheckCircle className="h-5 w-5 text-green-600" />承認の確認</>
              ) : (
                <><XCircle className="h-5 w-5 text-red-600" />拒否の確認</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedUser?.name}</span> を
              {selectedUser?.action === "approved" ? "承認" : "拒否"}しますか？
            </p>
            <div className="space-y-2">
              <Label className="text-sm">メモ（任意）</Label>
              <Textarea
                placeholder="理由や備考を入力..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button
              onClick={handleConfirm}
              disabled={updateMutation.isPending}
              className={selectedUser?.action === "approved" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
            >
              {selectedUser?.action === "approved" ? "承認する" : "拒否する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
