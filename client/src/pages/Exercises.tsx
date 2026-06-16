import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dumbbell,
  Calendar,
  User,
  Plus,
  Trash2,
  Pencil,
  Upload,
  Play,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  X,
  PlusCircle,
  Video
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { key: "self_care", label: "セルフケア", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { key: "collective", label: "コレクティブエクササイズ", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { key: "rehab", label: "リコンディショニング", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { key: "other", label: "その他", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
];

export default function Exercises() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Selected state
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Queries
  const { data: players, isLoading: playersLoading } = trpc.player.list.useQuery();
  const { data: exercises, isLoading: exercisesLoading } = trpc.exercise.list.useQuery({
    playerId: selectedPlayerId === "all" ? undefined : selectedPlayerId,
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  // Dialog & Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("self_care");
  const [type, setType] = useState("");
  const [frequency, setFrequency] = useState("");
  const [points, setPoints] = useState("");
  const [providedDate, setProvidedDate] = useState(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 10);
  });
  
  // Media upload state
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Mutations
  const createExercise = trpc.exercise.create.useMutation({
    onSuccess: () => {
      toast.success("エクササイズを登録しました");
      resetForm();
      setIsDialogOpen(false);
      utils.exercise.list.invalidate();
    },
    onError: (err) => {
      toast.error("登録に失敗しました: " + err.message);
    }
  });

  const updateExercise = trpc.exercise.update.useMutation({
    onSuccess: () => {
      toast.success("エクササイズを更新しました");
      resetForm();
      setIsDialogOpen(false);
      utils.exercise.list.invalidate();
    },
    onError: (err) => {
      toast.error("更新に失敗しました: " + err.message);
    }
  });

  const deleteExercise = trpc.exercise.delete.useMutation({
    onSuccess: () => {
      toast.success("エクササイズを削除しました");
      setDeletingId(null);
      utils.exercise.list.invalidate();
    },
    onError: (err) => {
      toast.error("削除に失敗しました: " + err.message);
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setCategory("self_care");
    setType("");
    setFrequency("");
    setPoints("");
    setMediaUrls([]);
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    setProvidedDate(localDate.toISOString().slice(0, 10));
  };

  const handleEditClick = (ex: any) => {
    setEditingId(ex.id);
    setTitle(ex.title);
    setCategory(ex.category);
    setType(ex.type || "");
    setFrequency(ex.frequency || "");
    setPoints(ex.points || "");
    setMediaUrls(ex.mediaUrls || []);
    setProvidedDate(ex.providedDate ? new Date(ex.providedDate).toISOString().slice(0, 10) : "");
    setIsDialogOpen(true);
  };

  // Base64 file upload helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Convert file to Base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            // Remove MIME prefix (e.g. "data:image/png;base64,")
            const base64String = result.split(",")[1];
            resolve(base64String);
          };
          reader.onerror = (error) => reject(error);
        });

        // call /api/upload endpoint
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            base64: base64,
          }),
        });

        if (!response.ok) {
          throw new Error("アップロードに失敗しました");
        }

        const data = await response.json();
        setMediaUrls(prev => [...prev, data.url]);
      }
      toast.success("ファイルをアップロードしました");
    } catch (err: any) {
      toast.error(err.message || "ファイルのアップロード中にエラーが発生しました");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  const handleRemoveMedia = (urlToRemove: string) => {
    setMediaUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error("エクササイズ名を入力してください");
      return;
    }

    const payload = {
      playerId: Number(selectedPlayerId === "all" ? players?.[0]?.id : selectedPlayerId),
      title,
      category,
      type: type || null,
      frequency: frequency || null,
      points: points || null,
      mediaUrls,
      providedDate: new Date(providedDate + "T00:00:00.000Z"),
    };

    // If selectedPlayerId is "all", we require a specific player target
    if (selectedPlayerId === "all") {
      toast.error("登録する選手を左のリストから選択してください");
      return;
    }

    if (editingId) {
      updateExercise.mutate({ id: editingId, ...payload });
    } else {
      createExercise.mutate(payload);
    }
  };

  const getPlayerName = (id: number) => {
    return players?.find(p => p.id === id)?.name ?? "不明";
  };

  const getPlayerNumber = (id: number) => {
    return players?.find(p => p.id === id)?.number;
  };

  // Check file type helper (simple check based on extension)
  const isVideo = (url: string) => {
    const lower = url.toLowerCase();
    return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov") || lower.includes("video");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary animate-pulse" />
            エクササイズ共有
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            各トレーナーが選手に提供したセルフケアやリコンディショニング、トレーニングメニューを写真・動画付きで共有します。
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button disabled={selectedPlayerId === "all"} className="rounded-xl font-semibold gap-1.5 shadow-md self-start sm:self-center">
              <Plus className="h-4 w-4" />
              メニューを登録する
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto pr-1 custom-scrollbar">
            <DialogHeader className="border-b pb-2">
              <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                {editingId ? "📝 エクササイズを編集" : "🏋️ 新しいエクササイズを提供"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">対象選手</label>
                <div className="text-sm font-semibold bg-accent/20 px-3 py-2 rounded-xl border">
                  #{getPlayerNumber(Number(selectedPlayerId))} {getPlayerName(Number(selectedPlayerId))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">提供日</label>
                  <input
                    type="date"
                    value={providedDate}
                    onChange={(e) => setProvidedDate(e.target.value)}
                    className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">カテゴリ</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">エクササイズ名</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: クラムシェル, キャット＆カウ..."
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">タイプ (種類)</label>
                  <Input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="例: 臀筋活性, 胸椎可動性..."
                    className="rounded-xl text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">頻度・量</label>
                  <Input
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="例: 毎日練習前 10回3セット..."
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">目的・ポイント</label>
                <Textarea
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="意識するポイント、注意点、動作の目的などを記載します..."
                  className="resize-none h-20 text-xs rounded-xl"
                />
              </div>

              {/* Media Upload Area */}
              <div className="space-y-2 border-t pt-3">
                <label className="text-xs font-semibold text-muted-foreground block">写真・動画の添付</label>
                
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs rounded-xl relative"
                    disabled={uploading}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    ファイルを選択
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                  </Button>
                  {uploading && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      アップロード中...
                    </span>
                  )}
                </div>

                {/* Uploaded Previews */}
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {mediaUrls.map((url, idx) => {
                      const isVid = isVideo(url);
                      return (
                        <div key={idx} className="relative aspect-square border rounded-lg overflow-hidden group bg-accent/20">
                          {isVid ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                              <Video className="h-6 w-6" />
                              <span className="text-[8px] mt-1 font-bold">動画</span>
                            </div>
                          ) : (
                            <img src={url} alt="preview" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(url)}
                            className="absolute top-1 right-1 bg-destructive/80 text-destructive-foreground hover:bg-destructive rounded-full p-0.5 shadow transition-all opacity-90 group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} className="rounded-xl text-xs h-8">
                  キャンセル
                </Button>
                <Button type="submit" size="sm" disabled={createExercise.isPending || updateExercise.isPending} className="rounded-xl text-xs h-8 px-5">
                  {(createExercise.isPending || updateExercise.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  {editingId ? "変更を保存する" : "登録する"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Side: Player List */}
        <Card className="shadow-md">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">選手を選択</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedPlayerId("all")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-between",
                selectedPlayerId === "all"
                  ? "bg-primary/5 text-primary border-primary/30"
                  : "border-transparent hover:bg-accent/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <span>👥 全選手のエクササイズ</span>
            </button>

            {playersLoading ? (
              <div className="py-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : (
              players?.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayerId(p.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all border flex items-center gap-2",
                    selectedPlayerId === p.id
                      ? "bg-primary/5 text-primary border-primary/30 font-bold"
                      : "border-transparent hover:bg-accent/40 text-foreground"
                  )}
                >
                  <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] shrink-0 font-bold">
                    #{p.number}
                  </span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Side: Main Exercise Content */}
        <div className="md:col-span-3 space-y-4">
          {/* Category Filter Tab Header */}
          <div className="flex flex-wrap gap-1.5 border-b pb-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-accent"
              )}
            >
              全部表示
            </button>
            {CATEGORY_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSelectedCategory(opt.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  selectedCategory === opt.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Exercise List */}
          {exercisesLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-semibold">メニューを読み込み中...</p>
            </div>
          ) : exercises && exercises.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {exercises.map(ex => {
                const catInfo = CATEGORY_OPTIONS.find(c => c.key === ex.category);
                return (
                  <Card
                    key={ex.id}
                    className="overflow-hidden hover:shadow-md transition-all duration-200 border border-border/80 flex flex-col bg-card"
                  >
                    <CardHeader className="pb-3 border-b bg-muted/5 p-4 relative">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={cn("text-[9px] font-bold px-2 py-0 border shrink-0", catInfo?.color)}>
                          {catInfo?.label || ex.category}
                        </Badge>
                        
                        {/* Provided date */}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(ex.providedDate), "yyyy/MM/dd", { locale: ja })}
                        </span>
                      </div>

                      <CardTitle className="text-sm font-bold mt-2 text-foreground line-clamp-2 pr-12">
                        {ex.title}
                      </CardTitle>
                      
                      {selectedPlayerId === "all" && (
                        <CardDescription className="text-[10px] mt-1 font-semibold flex items-center gap-1">
                          <User className="h-3 w-3 text-primary" />
                          #{getPlayerNumber(ex.playerId)} {getPlayerName(ex.playerId)} 選手向け
                        </CardDescription>
                      )}

                      {/* Actions */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEditClick(ex)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingId(ex.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 flex-1 flex flex-col gap-3">
                      {/* Specs */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-accent/10 p-2 rounded-xl border border-border/60">
                        <div>
                          <span className="text-muted-foreground block">タイプ</span>
                          <span className="font-bold text-foreground line-clamp-1">{ex.type || "未設定"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">頻度・量</span>
                          <span className="font-bold text-foreground line-clamp-1">{ex.frequency || "未設定"}</span>
                        </div>
                      </div>

                      {/* Points */}
                      {ex.points && (
                        <div className="text-xs">
                          <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">目的・ポイント</span>
                          <p className="text-foreground leading-relaxed bg-accent/5 p-2 rounded-lg border border-border/40 whitespace-pre-wrap">
                            {ex.points}
                          </p>
                        </div>
                      )}

                      {/* Media gallery */}
                      {ex.mediaUrls && ex.mediaUrls.length > 0 && (
                        <div className="space-y-1.5 pt-1 mt-auto">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">添付メディア</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {ex.mediaUrls.map((url: string, idx: number) => {
                              const isVid = isVideo(url);
                              return (
                                <div
                                  key={idx}
                                  className="relative aspect-video rounded-lg overflow-hidden bg-black/5 flex items-center justify-center border border-border/60 group cursor-pointer shadow-sm"
                                  onClick={() => {
                                    if (!isVid) setLightboxUrl(url);
                                  }}
                                >
                                  {isVid ? (
                                    <video src={url} className="w-full h-full object-cover opacity-80" />
                                  ) : (
                                    <img src={url} alt="media" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-all">
                                    {isVid ? (
                                      <Play className="h-5 w-5 text-white filter drop-shadow-md fill-white" />
                                    ) : (
                                      <ImageIcon className="h-4 w-4 text-white filter drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Trainer metadata */}
                      <div className="text-[9px] text-muted-foreground border-t pt-2 mt-auto flex justify-between items-center">
                        <span className="flex items-center gap-1 font-semibold">
                          <User className="h-2.5 w-2.5" />
                          担当: {ex.createdByName || "不明"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border border-dashed py-16 flex flex-col items-center justify-center text-center bg-accent/5 rounded-2xl">
              <Dumbbell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                {selectedPlayerId === "all" ? "エクササイズがまだ登録されていません。" : "この選手にはまだエクササイズが提供されていません。"}
              </p>
              {selectedPlayerId !== "all" && (
                <Button onClick={() => setIsDialogOpen(true)} variant="link" className="text-xs text-primary font-semibold mt-1.5 p-0">
                  最初のエクササイズを登録する
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>エクササイズを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。登録されたメニュー情報および添付ファイル情報が削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => {
                if (deletingId) deleteExercise.mutate({ id: deletingId });
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <Dialog open={lightboxUrl !== null} onOpenChange={(open) => { if (!open) setLightboxUrl(null); }}>
          <DialogContent className="max-w-3xl p-1 bg-black/90 border-0 flex items-center justify-center outline-none">
            <img src={lightboxUrl} alt="full-size" className="max-w-full max-h-[85vh] object-contain rounded" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
