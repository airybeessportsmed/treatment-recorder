import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { ClipboardPlus, List, Users, LogOut, PanelLeft, Activity, UserPlus, User, ArrowRight, Trash2, Calendar, Dumbbell } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

const menuItems = [
  { icon: ClipboardPlus, label: "記録する", path: "/" },
  { icon: List, label: "記録一覧", path: "/records" },
  { icon: Users, label: "選手管理", path: "/players" },
  { icon: Calendar, label: "スケジュール管理", path: "/schedules" },
  { icon: Dumbbell, label: "エクササイズ共有", path: "/exercises" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return <TrainerLoginView />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  // Profile Edit State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");

  useEffect(() => {
    if (user?.name) {
      setEditName(user.name);
    }
  }, [user?.name]);

  const utils = trpc.useUtils();

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("名前を変更しました！");
      setIsProfileOpen(false);
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "更新に失敗しました");
    }
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("お名前を入力してください");
      return;
    }
    await updateProfileMutation.mutateAsync({ name: editName.trim() });
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="ナビゲーション切替"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Activity className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold tracking-tight truncate text-sm">
                    Treatment Rec
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setIsProfileOpen(true)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>プロフィール編集</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ログアウト</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground font-medium">
                    {activeMenuItem?.label ?? "メニュー"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md bg-background border rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex gap-2 items-center">
              <User className="h-5 w-5 text-primary" />
              プロフィール編集
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-xs font-semibold">お名前</Label>
              <Input
                id="profile-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl bg-background text-foreground"
                disabled={updateProfileMutation.isPending}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-xl font-semibold transition-all shadow-md"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "保存中..." : "変更を保存"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TrainerLoginView() {
  const [isOpen, setIsOpen] = useState(false);
  const [newTrainerName, setNewTrainerName] = useState("");
  
  const utils = trpc.useUtils();
  
  const { data: trainers, isLoading } = trpc.auth.listTrainers.useQuery();
  
  const createTrainerMutation = trpc.auth.createTrainer.useMutation({
    onSuccess: () => {
      toast.success("新しいトレーナーを登録しました！");
      setNewTrainerName("");
      setIsOpen(false);
      utils.auth.listTrainers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "登録に失敗しました");
    }
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrainerName.trim()) {
      toast.error("お名前を入力してください");
      return;
    }
    await createTrainerMutation.mutateAsync({ name: newTrainerName.trim() });
  };

  const deleteTrainerMutation = trpc.auth.deleteTrainer.useMutation({
    onSuccess: () => {
      toast.success("トレーナーを削除しました");
      utils.auth.listTrainers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "削除に失敗しました");
    }
  });

  const handleDelete = async (e: React.MouseEvent, openId: string, name: string) => {
    e.stopPropagation();
    if (confirm(`${name} さんをメンバー一覧から削除しますか？\n（※過去のトリートメント記録は消えずに残ります）`)) {
      await deleteTrainerMutation.mutateAsync({ openId });
    }
  };

  const handleLogin = (openId: string) => {
    window.location.href = `/api/mock-login?openId=${openId}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 relative overflow-hidden text-slate-100 font-sans">
      {/* 輝く美しいグラデーション球 (プレミアム演出) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/25 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />

      <div className="flex flex-col items-center gap-8 p-8 max-w-xl w-full relative z-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-200 to-emerald-400 bg-clip-text text-transparent">
            トリートメント記録
          </h1>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            担当のトレーナーを選択するか、新しくメンバーを登録してログインしてください
          </p>
        </div>

        {/* グラスモーフィズム調のコンテナ */}
        <div className="w-full rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
            <h2 className="text-sm font-semibold text-slate-300">トレーナーを選択</h2>
            
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800 hover:text-white transition-all text-xs flex gap-1.5 items-center text-slate-300">
                  <UserPlus className="h-3.5 w-3.5" />
                  メンバーを追加
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex gap-2 items-center bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
                    <UserPlus className="h-5 w-5 text-violet-400" />
                    トレーナーの追加登録
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300 text-xs font-semibold">お名前 (担当表示用)</Label>
                    <Input
                      id="name"
                      placeholder="例: 下川"
                      value={newTrainerName}
                      onChange={(e) => setNewTrainerName(e.target.value)}
                      className="bg-slate-950 border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus-visible:ring-violet-600"
                      disabled={createTrainerMutation.isPending}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold transition-all shadow-md shadow-violet-600/10"
                    disabled={createTrainerMutation.isPending}
                  >
                    {createTrainerMutation.isPending ? "登録中..." : "登録する"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3 py-8 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
              <span className="text-xs text-slate-500 mt-2">メンバー一覧を読み込み中...</span>
            </div>
          ) : trainers && trainers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {trainers.map((trainer) => (
                <button
                  key={trainer.id}
                  onClick={() => handleLogin(trainer.openId)}
                  className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-800 bg-slate-950/40 hover:bg-gradient-to-r hover:from-slate-900 hover:to-indigo-950/30 hover:border-violet-600/40 text-left transition-all group focus:outline-none focus:ring-2 focus:ring-violet-600/40 animate-in fade-in zoom-in-95 duration-200"
                >
                  <Avatar className="h-10 w-10 border border-slate-800 group-hover:border-violet-500/40 shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 group-hover:text-violet-300 transition-colors">
                      {trainer.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-violet-300 transition-colors text-slate-200">
                      {trainer.name || "ユーザー"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-1 uppercase tracking-wider font-mono">
                      {trainer.openId === "EwkguvxBunXVDhHyyAtN67" ? "OWNER" : "TRAINER"}
                    </p>
                  </div>
                  {trainer.openId !== "EwkguvxBunXVDhHyyAtN67" ? (
                    <button
                      onClick={(e) => handleDelete(e, trainer.openId, trainer.name || "トレーナー")}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                      title="トレーナーを削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col py-12 items-center justify-center text-center">
              <User className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-xs text-slate-400">登録されているメンバーがいません</p>
              <p className="text-[10px] text-slate-600 mt-1">「メンバーを追加」から登録してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
