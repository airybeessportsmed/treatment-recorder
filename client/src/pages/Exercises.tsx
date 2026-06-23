import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PlayerSummaryDialog } from "@/components/PlayerSummaryDialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ChevronRight,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  TrendingUp
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
}

export default function Exercises() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Selected state
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(false); // 完了メニューの表示切替

  // Queries
  const { data: players, isLoading: playersLoading } = trpc.player.list.useQuery();
  const { data: exercises, isLoading: exercisesLoading } = trpc.exercise.list.useQuery({
    playerId: selectedPlayerId === "all" ? undefined : selectedPlayerId,
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });
  
  // Load trainers to build color configuration map
  const { data: trainers } = trpc.auth.listTrainers.useQuery();

  // Dialog & Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [isCompletedState, setIsCompletedState] = useState(false);
  
  const [category, setCategory] = useState("self_care");
  const [providedDate, setProvidedDate] = useState(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 10);
  });

  // Dynamic exercise inputs (Table rows)
  const [exercisesFormList, setExercisesFormList] = useState<ExerciseFormItem[]>([
    { title: "", points: "" }
  ]);

  // Session-wide Media attachments
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Delete State
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Summary Dialog State
  const [summaryPlayerId, setSummaryPlayerId] = useState<number | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);

  // Trainer Color Configuration Map (Synced with Schedules page)
  const trainerColorMap = useMemo(() => {
    const colors = [
      { name: "red", bgStrong: "bg-red-500", bgLight: "bg-red-100 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", border: "border-red-500/20", leftBar: "border-l-red-500" },
      { name: "emerald", bgStrong: "bg-emerald-500", bgLight: "bg-emerald-100 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", leftBar: "border-l-emerald-500" },
      { name: "amber", bgStrong: "bg-amber-500", bgLight: "bg-amber-100 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", leftBar: "border-l-amber-500" },
      { name: "blue", bgStrong: "bg-blue-500", bgLight: "bg-blue-100 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", leftBar: "border-l-blue-500" },
      { name: "indigo", bgStrong: "bg-indigo-500", bgLight: "bg-indigo-100 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/20", leftBar: "border-l-indigo-500" },
      { name: "violet", bgStrong: "bg-violet-500", bgLight: "bg-violet-100 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500/20", leftBar: "border-l-violet-500" },
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

  const getTrainerStyle = (trainerName: string) => {
    return trainerColorMap[trainerName] || {
      bgLight: "bg-muted/40",
      text: "text-muted-foreground",
      border: "border-border",
      leftBar: "border-l-muted-foreground/30"
    };
  };

  // Group exercises by sessionId
  const groupedSessions = useMemo(() => {
    if (!exercises) return [];
    const groups: { [key: string]: any } = {};

    exercises.forEach(ex => {
      const key = ex.sessionId || `legacy-${new Date(ex.providedDate).getTime()}-${ex.playerId}-${ex.category}`;

      if (!groups[key]) {
        groups[key] = {
          sessionId: ex.sessionId || key,
          isLegacy: !ex.sessionId,
          playerId: ex.playerId,
          category: ex.category,
          providedDate: ex.providedDate,
          isCompleted: ex.isCompleted === 1,
          createdBy: ex.createdBy,
          createdByName: ex.createdByName,
          createdAt: ex.createdAt,
          updatedAt: ex.updatedAt,
          exercises: [],
          mediaUrls: []
        };
      }

      // Track the earliest createdAt and latest updatedAt
      const exCreatedAt = new Date(ex.createdAt).getTime();
      const exUpdatedAt = new Date(ex.updatedAt).getTime();
      const groupCreatedAt = new Date(groups[key].createdAt).getTime();
      const groupUpdatedAt = new Date(groups[key].updatedAt).getTime();

      if (exCreatedAt < groupCreatedAt) groups[key].createdAt = ex.createdAt;
      if (exUpdatedAt > groupUpdatedAt) groups[key].updatedAt = ex.updatedAt;

      // Group complete status logic
      if (ex.isCompleted === 1) {
        groups[key].isCompleted = true;
      }

      // Merge unique media URLs
      if (ex.mediaUrls && Array.isArray(ex.mediaUrls)) {
        ex.mediaUrls.forEach((url: string) => {
          if (!groups[key].mediaUrls.includes(url)) {
            groups[key].mediaUrls.push(url);
          }
        });
      }

      groups[key].exercises.push({
        id: ex.id,
        title: ex.title,
        points: ex.points
      });
    });

    // Sort by providedDate desc
    return Object.values(groups).sort((a: any, b: any) => {
      return new Date(b.providedDate).getTime() - new Date(a.providedDate).getTime();
    });
  }, [exercises]);

  // Filter based on completion visibility setting
  const filteredSessions = useMemo(() => {
    return groupedSessions.filter((session: any) => {
      if (!showCompleted && session.isCompleted) {
        return false;
      }
      return true;
    });
  }, [groupedSessions, showCompleted]);

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

  const toggleComplete = trpc.exercise.toggleComplete.useMutation({
    onSuccess: (res, variables) => {
      toast.success(variables.isCompleted ? "エクササイズを完了にしました" : "エクササイズを未完了に戻しました");
      utils.exercise.list.invalidate();
    },
    onError: (err) => {
      toast.error("エラーが発生しました: " + err.message);
    }
  });

  const resetForm = () => {
    setEditingSessionId(null);
    setIsCompletedState(false);
    setCategory("self_care");
    setExercisesFormList([{ title: "", points: "" }]);
    setMediaUrls([]);
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    setProvidedDate(localDate.toISOString().slice(0, 10));
    setUploading(false);
  };

  const handleEditClick = (session: any) => {
    setEditingSessionId(session.sessionId);
    setIsCompletedState(session.isCompleted);
    setCategory(session.category);
    setProvidedDate(session.providedDate ? new Date(session.providedDate).toISOString().slice(0, 10) : "");
    setMediaUrls(session.mediaUrls || []);
    
    // Map exercises to table rows
    const list = session.exercises.map((ex: any) => ({
      title: ex.title,
      points: ex.points || ""
    }));
    setExercisesFormList(list);
    setIsDialogOpen(true);
  };

  // Add a row to the table
  const addExerciseField = () => {
    setExercisesFormList(prev => [...prev, { title: "", points: "" }]);
  };

  // Remove a row from the table
  const removeExerciseField = (indexToRemove: number) => {
    if (exercisesFormList.length <= 1) return;
    setExercisesFormList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle table input change
  const handleFormChange = (index: number, key: keyof ExerciseFormItem, value: string) => {
    setExercisesFormList(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [key]: value
      };
      return updated;
    });
  };

  // Base64 file upload helper for Session
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
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
      
      setMediaUrls(prev => [...prev, ...urls]);
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
    
    // Validations
    if (selectedPlayerId === "all") {
      toast.error("登録する選手を左のリストから選択してください");
      return;
    }

    const invalid = exercisesFormList.some(item => !item.title.trim());
    if (invalid) {
      toast.error("すべての行にエクササイズ名を入力してください");
      return;
    }

    const payload = {
      playerId: Number(selectedPlayerId),
      category,
      providedDate: new Date(providedDate + "T00:00:00.000Z"),
      mediaUrls,
      isCompleted: isCompletedState,
      exercises: exercisesFormList.map(item => ({
        title: item.title,
        points: item.points || null,
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

  // Helper to determine New or Updated Badge
  const getSessionBadge = (session: any) => {
    const now = new Date().getTime();
    const createdTime = new Date(session.createdAt).getTime();
    const updatedTime = new Date(session.updatedAt).getTime();
    
    // 24 hour standard
    const dayInMs = 24 * 60 * 60 * 1000;
    
    const isNew = (now - createdTime) < dayInMs;
    // Over 5 seconds difference to differentiate immediate creations
    const isUpdated = (now - updatedTime) < dayInMs && (updatedTime - createdTime) > 5000;

    if (session.isCompleted) {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-[9px] font-bold px-1.5 py-0.5">
          完了
        </Badge>
      );
    }

    if (isNew && !isUpdated) {
      return (
        <Badge className="bg-sky-500 hover:bg-sky-500 text-white border-0 text-[9px] font-bold px-1.5 py-0.5 shadow-sm">
          新規
        </Badge>
      );
    }
    if (isUpdated) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-500 text-black border-0 text-[9px] font-bold px-1.5 py-0.5 shadow-sm">
          更新
        </Badge>
      );
    }
    return null;
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
            トリートメントやリハビリの1回に処方した、複数のエクササイズを表形式でまとめて登録できます。写真や動画はセッション全体に添付します。
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button
              disabled={selectedPlayerId === "all"}
              onClick={() => resetForm()}
              className="rounded-xl font-semibold gap-1.5 shadow-md self-start sm:self-center"
            >
              <Plus className="h-4 w-4" />
              セッションを登録する
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pr-1 custom-scrollbar">
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

              {/* Date & Category: Changed grid settings to avoid overlap on small screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-accent/5 p-3.5 rounded-2xl border">
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

              {/* Table Input for Exercises */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">エクササイズメニュー（表形式入力）</span>
                  <span className="text-[10px] text-muted-foreground">必要最低限の項目でサクサク登録できます</span>
                </div>

                <div className="overflow-x-auto border rounded-xl max-h-[350px] custom-scrollbar bg-card">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground border-b">
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5 min-w-[180px]">メニュー名 *</th>
                        <th className="p-2.5 min-w-[260px]">目的・ポイント</th>
                        <th className="p-2.5 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {exercisesFormList.map((item, idx) => (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-b last:border-0 hover:bg-accent/5 transition-colors"
                          >
                            <td className="p-2 text-center text-xs text-muted-foreground font-mono font-bold">
                              {idx + 1}
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.title}
                                onChange={(e) => handleFormChange(idx, "title", e.target.value)}
                                placeholder="例: クラムシェル"
                                className="rounded-lg text-xs h-8 bg-background border-input"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.points}
                                onChange={(e) => handleFormChange(idx, "points", e.target.value)}
                                placeholder="例: 10回3セット、骨盤が倒れないように"
                                className="rounded-lg text-xs h-8 bg-background border-input"
                              />
                            </td>
                            <td className="p-2 text-center">
                              {exercisesFormList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeExerciseField(idx)}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExerciseField}
                  className="w-full h-8.5 gap-1.5 text-xs rounded-xl border-dashed border-2 hover:border-solid hover:bg-accent/5"
                >
                  <PlusCircle className="h-4 w-4 text-primary" />
                  行を追加する
                </Button>
              </div>

              {/* Session-wide Media Upload Area */}
              <div className="space-y-2 border-t pt-3 bg-accent/5 p-3 rounded-2xl border">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-foreground">写真・動画の添付（セッション全体）</label>
                  <span className="text-[10px] text-muted-foreground">このリハビリ・トリートメント全体に紐づきます</span>
                </div>
                
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
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {mediaUrls.map((url, idx) => {
                      const isVid = isVideo(url);
                      return (
                        <div key={idx} className="relative aspect-square border rounded-lg overflow-hidden group bg-accent/20">
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
                            onClick={() => handleRemoveMedia(url)}
                            className="absolute top-0.5 right-0.5 bg-destructive/80 text-destructive-foreground hover:bg-destructive rounded-full p-0.5 shadow transition-all opacity-85 group-hover:opacity-100"
                          >
                            <X className="h-2 w-2" />
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
                <div key={p.id} className="flex items-center gap-1 w-full justify-between">
                  <button
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={cn(
                      "flex-1 text-left px-3 py-2 rounded-xl text-xs font-medium transition-all border flex items-center gap-2 truncate",
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-xl"
                    onClick={() => {
                      setSummaryPlayerId(p.id);
                      setIsSummaryOpen(true);
                    }}
                    title="経過サマリーを表示"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Side: Main Exercise Content */}
        <div className="md:col-span-3 space-y-4">
          
          {/* Category Filter Tab Header & Show Completed Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
            <div className="flex flex-wrap gap-1.5">
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

            {/* Visibility Toggle for completed exercises */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className={cn(
                "rounded-xl h-8 gap-1.5 text-xs font-semibold",
                showCompleted ? "bg-primary/5 border-primary/45 text-primary" : "text-muted-foreground"
              )}
            >
              {showCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showCompleted ? "完了分を表示中" : "完了分を非表示"}
            </Button>
          </div>

          {/* Grouped Exercise List */}
          {exercisesLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-semibold">メニューを読み込み中...</p>
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="space-y-4">
              {filteredSessions.map((session: any) => {
                const catInfo = CATEGORY_OPTIONS.find(c => c.key === session.category);
                const trainerStyle = getTrainerStyle(session.createdByName);
                
                return (
                  <Card
                    key={session.sessionId}
                    className={cn(
                      "overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 flex flex-col bg-card",
                      session.isCompleted ? "opacity-60 bg-muted/20" : "",
                      trainerStyle.leftBar
                    )}
                  >
                    <CardHeader className="pb-3 border-b bg-muted/5 p-4 flex flex-row items-center justify-between gap-4">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Completion Toggle checkbox icon */}
                          <button
                            onClick={() => toggleComplete.mutate({ sessionId: session.sessionId, isCompleted: !session.isCompleted })}
                            className={cn(
                              "p-0.5 rounded-full hover:bg-accent/40 transition-colors shrink-0 mr-1",
                              session.isCompleted ? "text-emerald-500" : "text-muted-foreground/45"
                            )}
                            title={session.isCompleted ? "未完了に戻す" : "完了にする"}
                          >
                            {session.isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 fill-emerald-500/10" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>

                          <Badge variant="outline" className={cn("text-[9px] font-bold px-2 py-0 border shrink-0", catInfo?.color)}>
                            {catInfo?.label || session.category}
                          </Badge>
                          
                          {/* Provided date */}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(session.providedDate), "yyyy/MM/dd (E)", { locale: ja })}
                          </span>

                          {/* New / Updated Badge */}
                          {getSessionBadge(session)}
                        </div>

                        {selectedPlayerId === "all" && (
                          <div className="text-[11px] font-semibold flex items-center gap-1 mt-1 text-muted-foreground">
                            <User className="h-3.5 w-3.5 text-primary" />
                            #{getPlayerNumber(session.playerId)} {getPlayerName(session.playerId)} 選手向け
                          </div>
                        )}
                      </div>

                      {/* Trainer name with trainerColor map color styling & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn(
                          "text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded-lg border shadow-sm",
                          trainerStyle.bgLight,
                          trainerStyle.text,
                          trainerStyle.border
                        )}>
                          <User className="h-2.5 w-2.5" />
                          担当: {session.createdByName || "不明"}
                        </span>
                        
                        {/* 編集・削除ボタンは作成者本人または管理者のみ表示 */}
                        {(session.createdBy === user?.id || user?.role === "admin") && (
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
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                      {/* Exercises in this session (Simple clean list) */}
                      <div className="space-y-2">
                        {session.exercises.map((ex: any, idx: number) => (
                          <div key={ex.id || idx} className="bg-accent/5 p-3 rounded-xl border border-border/40 relative space-y-1">
                            <span className={cn(
                              "text-xs font-bold text-foreground flex items-center gap-1.5",
                              session.isCompleted ? "line-through text-muted-foreground/60" : ""
                            )}>
                              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                              {ex.title}
                            </span>
                            {ex.points && (
                              <p className={cn(
                                "text-[11px] text-muted-foreground leading-relaxed pl-5 whitespace-pre-wrap",
                                session.isCompleted ? "line-through text-muted-foreground/50" : ""
                              )}>
                                {ex.points}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Session-wide Media attachments gallery */}
                      {session.mediaUrls && session.mediaUrls.length > 0 && (
                        <div className="space-y-1.5 pt-3 border-t mt-3">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">添付メディア（セッション全体）</span>
                          <div className="flex flex-wrap gap-2">
                            {session.mediaUrls.map((url: string, mediaIdx: number) => {
                              const isVid = isVideo(url);
                              return (
                                <div
                                  key={mediaIdx}
                                  className="relative w-24 h-18 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center border border-border/60 group cursor-pointer shadow-sm"
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
                                      <Play className="h-5 w-5 text-white filter drop-shadow fill-white" />
                                    ) : (
                                      <ImageIcon className="h-4 w-4 text-white filter drop-shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border border-dashed py-16 flex flex-col items-center justify-center text-center bg-accent/5 rounded-2xl">
              <Dumbbell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                {selectedPlayerId === "all" ? "該当するエクササイズがまだ登録されていません。" : "この選手には該当するエクササイズが提供されていません。"}
              </p>
              {selectedPlayerId !== "all" && (
                <Button
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                  variant="link"
                  className="text-xs text-primary font-semibold mt-1.5 p-0"
                >
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

      <PlayerSummaryDialog
        playerId={summaryPlayerId}
        isOpen={isSummaryOpen}
        onClose={() => {
          setIsSummaryOpen(false);
          setSummaryPlayerId(null);
        }}
      />
    </div>
  );
}
