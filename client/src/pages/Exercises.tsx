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
import { AnimatePresence, motion } from "framer-motion";
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
  X,
  PlusCircle,
  Video,
  ChevronRight
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { key: "self_care", label: "セルフケア", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { key: "collective", label: "コレクティブエクササイズ", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { key: "rehab", label: "リコンディショニング", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { key: "other", label: "その他", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
];

interface ExerciseFormItem {
  title: string;
  points: string;
  mediaUrls: string[];
}

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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  
  const [category, setCategory] = useState("self_care");
  const [providedDate, setProvidedDate] = useState(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 10);
  });

  // Dynamic exercise inputs for the session
  const [exercisesFormList, setExercisesFormList] = useState<ExerciseFormItem[]>([
    { title: "", points: "", mediaUrls: [] }
  ]);

  // Upload state per input index
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Delete State
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Group exercises by sessionId / legacy group
  const groupedSessions = useMemo(() => {
    if (!exercises) return [];
    const groups: { [key: string]: any } = {};

    exercises.forEach(ex => {
      // Legacy compatibility: group by providedDate, playerId and category if sessionId is empty
      const key = ex.sessionId || `legacy-${new Date(ex.providedDate).getTime()}-${ex.playerId}-${ex.category}`;

      if (!groups[key]) {
        groups[key] = {
          sessionId: ex.sessionId || key,
          isLegacy: !ex.sessionId,
          playerId: ex.playerId,
          category: ex.category,
          providedDate: ex.providedDate,
          createdBy: ex.createdBy,
          createdByName: ex.createdByName,
          exercises: []
        };
      }
      groups[key].exercises.push({
        id: ex.id,
        title: ex.title,
        points: ex.points,
        mediaUrls: ex.mediaUrls || []
      });
    });

    // Sort by providedDate desc
    return Object.values(groups).sort((a: any, b: any) => {
      return new Date(b.providedDate).getTime() - new Date(a.providedDate).getTime();
    });
  }, [exercises]);

  // Mutations
  const createExercise = trpc.exercise.create.useMutation({
    onSuccess: () => {
      toast.success("エクササイズセッションを登録しました");
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
      toast.success("エクササイズセッションを更新しました");
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
      toast.success("エクササイズセッションを削除しました");
      setDeletingSessionId(null);
      utils.exercise.list.invalidate();
    },
    onError: (err) => {
      toast.error("削除に失敗しました: " + err.message);
    }
  });

  const resetForm = () => {
    setEditingSessionId(null);
    setCategory("self_care");
    setExercisesFormList([{ title: "", points: "", mediaUrls: [] }]);
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    setProvidedDate(localDate.toISOString().slice(0, 10));
    setUploadingIndex(null);
  };

  const handleEditClick = (session: any) => {
    setEditingSessionId(session.sessionId);
    setCategory(session.category);
    setProvidedDate(session.providedDate ? new Date(session.providedDate).toISOString().slice(0, 10) : "");
    
    // Map exercises to form items
    const list = session.exercises.map((ex: any) => ({
      title: ex.title,
      points: ex.points || "",
      mediaUrls: ex.mediaUrls || []
    }));
    setExercisesFormList(list);
    setIsDialogOpen(true);
  };

  // Add exercise field in the form
  const addExerciseField = () => {
    setExercisesFormList(prev => [...prev, { title: "", points: "", mediaUrls: [] }]);
  };

  // Remove exercise field in the form
  const removeExerciseField = (indexToRemove: number) => {
    if (exercisesFormList.length <= 1) return;
    setExercisesFormList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle form change
  const handleFormChange = (index: number, key: keyof ExerciseFormItem, value: any) => {
    setExercisesFormList(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [key]: value
      };
      return updated;
    });
  };

  // Base64 file upload helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingIndex(index);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Convert file to Base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
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
        urls.push(data.url);
      }
      
      // Update specific exercise item's mediaUrls
      setExercisesFormList(prev => {
        const updated = [...prev];
        updated[index].mediaUrls = [...updated[index].mediaUrls, ...urls];
        return updated;
      });

      toast.success("ファイルをアップロードしました");
    } catch (err: any) {
      toast.error(err.message || "ファイルのアップロード中にエラーが発生しました");
    } finally {
      setUploadingIndex(null);
      e.target.value = ""; // reset input
    }
  };

  const handleRemoveMedia = (index: number, urlToRemove: string) => {
    setExercisesFormList(prev => {
      const updated = [...prev];
      updated[index].mediaUrls = updated[index].mediaUrls.filter(url => url !== urlToRemove);
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (selectedPlayerId === "all") {
      toast.error("登録する選手を左のリストから選択してください");
      return;
    }

    const invalid = exercisesFormList.some(item => !item.title.trim());
    if (invalid) {
      toast.error("すべてのメニューにエクササイズ名を入力してください");
      return;
    }

    const payload = {
      playerId: Number(selectedPlayerId),
      category,
      providedDate: new Date(providedDate + "T00:00:00.000Z"),
      exercises: exercisesFormList.map(item => ({
        title: item.title,
        points: item.points || null,
        mediaUrls: item.mediaUrls,
      }))
    };

    if (editingSessionId) {
      updateExercise.mutate({ sessionId: editingSessionId, ...payload });
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
            トリートメントやリハビリ、コンディションチェックの1セッションで処方した、複数のエクササイズメニューをまとめて登録・共有できます。
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button disabled={selectedPlayerId === "all"} className="rounded-xl font-semibold gap-1.5 shadow-md self-start sm:self-center">
              <Plus className="h-4 w-4" />
              セッションを登録する
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto pr-1 custom-scrollbar">
            <DialogHeader className="border-b pb-2">
              <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                {editingSessionId ? "📝 セッションを編集" : "🏋️ 新しいセッションを提供"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">対象選手</label>
                <div className="text-sm font-semibold bg-accent/20 px-3 py-2 rounded-xl border">
                  #{getPlayerNumber(Number(selectedPlayerId))} {getPlayerName(Number(selectedPlayerId))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-accent/5 p-3 rounded-2xl border">
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

              {/* Dynamic Exercises Form List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-xs font-bold text-foreground">エクササイズメニュー</span>
                  <span className="text-[10px] text-muted-foreground">追加した分が一括で登録されます</span>
                </div>

                <AnimatePresence initial={false}>
                  {exercisesFormList.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative bg-card p-4 rounded-2xl border shadow-sm space-y-3"
                    >
                      {/* Remove Button */}
                      {exercisesFormList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExerciseField(idx)}
                          className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      <div className="pr-6">
                        <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                          メニュー #{idx + 1}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground block">エクササイズ名 *</label>
                        <Input
                          value={item.title}
                          onChange={(e) => handleFormChange(idx, "title", e.target.value)}
                          placeholder="例: キャット＆カウ, プランク 30秒..."
                          className="rounded-xl text-xs h-9"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground block">目的・ポイント</label>
                        <Textarea
                          value={item.points}
                          onChange={(e) => handleFormChange(idx, "points", e.target.value)}
                          placeholder="意識するポイントや注意点などを記載..."
                          className="resize-none h-14 text-xs rounded-xl"
                        />
                      </div>

                      {/* File upload for this index */}
                      <div className="space-y-2 border-t pt-2.5">
                        <label className="text-[10px] font-semibold text-muted-foreground block">写真・動画の添付</label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[10px] rounded-lg relative"
                            disabled={uploadingIndex !== null}
                          >
                            <Upload className="h-3 w-3" />
                            ファイルを選択
                            <input
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              onChange={(e) => handleFileUpload(e, idx)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              disabled={uploadingIndex !== null}
                            />
                          </Button>
                          {uploadingIndex === idx && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              アップロード中...
                            </span>
                          )}
                        </div>

                        {/* Uploaded media preview */}
                        {item.mediaUrls.length > 0 && (
                          <div className="grid grid-cols-5 gap-1.5 pt-1">
                            {item.mediaUrls.map((url, mediaIdx) => {
                              const isVid = isVideo(url);
                              return (
                                <div key={mediaIdx} className="relative aspect-square border rounded-lg overflow-hidden group bg-accent/10">
                                  {isVid ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-black/5">
                                      <Video className="h-4 w-4" />
                                      <span className="text-[6px] mt-0.5 font-bold">動画</span>
                                    </div>
                                  ) : (
                                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedia(idx, url)}
                                    className="absolute top-0.5 right-0.5 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-0.5 shadow transition-all opacity-85 group-hover:opacity-100"
                                  >
                                    <X className="h-2 w-2" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExerciseField}
                  className="w-full h-9 gap-1.5 text-xs rounded-xl border-dashed border-2 hover:border-solid hover:bg-accent/10"
                >
                  <PlusCircle className="h-4 w-4 text-primary" />
                  メニューを追加する
                </Button>
              </div>

              <DialogFooter className="border-t pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} className="rounded-xl text-xs h-8">
                  キャンセル
                </Button>
                <Button type="submit" size="sm" disabled={createExercise.isPending || updateExercise.isPending} className="rounded-xl text-xs h-8 px-5">
                  {(createExercise.isPending || updateExercise.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  {editingSessionId ? "変更を保存する" : "登録する"}
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

          {/* Grouped Exercise List */}
          {exercisesLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-semibold">メニューを読み込み中...</p>
            </div>
          ) : groupedSessions.length > 0 ? (
            <div className="space-y-4">
              {groupedSessions.map((session: any) => {
                const catInfo = CATEGORY_OPTIONS.find(c => c.key === session.category);
                return (
                  <Card
                    key={session.sessionId}
                    className="overflow-hidden hover:shadow-md transition-all duration-200 border border-border/80 flex flex-col bg-card"
                  >
                    <CardHeader className="pb-3 border-b bg-muted/5 p-4 relative flex flex-row items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[9px] font-bold px-2 py-0 border shrink-0", catInfo?.color)}>
                            {catInfo?.label || session.category}
                          </Badge>
                          
                          {/* Provided date */}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(session.providedDate), "yyyy/MM/dd (E)", { locale: ja })}
                          </span>
                        </div>

                        {selectedPlayerId === "all" && (
                          <div className="text-[11px] font-semibold flex items-center gap-1 mt-1 text-muted-foreground">
                            <User className="h-3.5 w-3.5 text-primary" />
                            #{getPlayerNumber(session.playerId)} {getPlayerName(session.playerId)} 選手向け
                          </div>
                        )}
                      </div>

                      {/* Trainer metadata & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium bg-accent/20 px-2 py-1 rounded-lg border">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                          担当: {session.createdByName || "不明"}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditClick(session)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingSessionId(session.sessionId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                      {/* Exercises in this session */}
                      <div className="space-y-3">
                        {session.exercises.map((ex: any, idx: number) => (
                          <div key={ex.id || idx} className="bg-accent/5 p-3 rounded-2xl border border-border/40 relative space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                {ex.title}
                              </span>
                            </div>

                            {ex.points && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed pl-5 whitespace-pre-wrap">
                                {ex.points}
                              </p>
                            )}

                            {/* Media gallery inside this individual exercise */}
                            {ex.mediaUrls && ex.mediaUrls.length > 0 && (
                              <div className="pl-5 pt-1.5 flex flex-wrap gap-2">
                                {ex.mediaUrls.map((url: string, mediaIdx: number) => {
                                  const isVid = isVideo(url);
                                  return (
                                    <div
                                      key={mediaIdx}
                                      className="relative w-20 h-16 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center border border-border/60 group cursor-pointer shadow-sm"
                                      onClick={() => {
                                        if (!isVid) setLightboxUrl(url);
                                      }}
                                    >
                                      {isVid ? (
                                        <video src={url} className="w-full h-full object-cover opacity-85" />
                                      ) : (
                                        <img src={url} alt="media" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                      )}
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/25 transition-all">
                                        {isVid ? (
                                          <Play className="h-4 w-4 text-white filter drop-shadow fill-white" />
                                        ) : (
                                          <ImageIcon className="h-3.5 w-3.5 text-white filter drop-shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
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
      <AlertDialog open={deletingSessionId !== null} onOpenChange={(open) => { if (!open) setDeletingSessionId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>エクササイズセッションを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。セッションに含まれるすべてのエクササイズメニューおよび添付ファイル情報が削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => {
                if (deletingSessionId) deleteExercise.mutate({ sessionId: deletingSessionId });
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
