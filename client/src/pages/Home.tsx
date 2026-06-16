import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PlayerSummaryDialog } from "@/components/PlayerSummaryDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import AnnotationViewer from "@/components/AnnotationViewer";
import { toast } from "sonner";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import BodyMap from "@/components/BodyMap";
import AnnotationCanvas, { type AnnotationData } from "@/components/AnnotationCanvas";
import { motion, AnimatePresence } from "framer-motion";
import {
  BODY_PARTS,
  TREATMENT_TYPES,
  TREATMENT_CATEGORIES,
  TIMING_OPTIONS,
  TIMING_DEFAULT_HOURS,
  DURATION_PRESETS,
  getBodyPartLabel,
  getTreatmentTypeLabel,
  getTimingLabel,
} from "../../../shared/constants";
import {
  ChevronDown,
  Clock,
  Save,
  Hand,
  Bandage,
  Syringe,
  Flame,
  Zap,
  Radio,
  Wifi,
  Activity,
  Snowflake,
  ThermometerSun,
  Droplets,
  Dumbbell,
  RefreshCw,
  HeartPulse,
  Cross,
  MessageCircle,
  ClipboardCheck,
  Shield,
  Scissors,
  Package,
  MoreHorizontal,
  Layers,
  Move,
  StretchHorizontal,
  Sunrise,
  Sun,
  Moon,
  Sunset,
  Trophy,
  Medal,
  Loader2,
  RotateCcw,
  Pencil,
  Check,
  Plus,
  Trash2,
  Calendar,
  Eye,
  User,
  Users,
  Download,
  Printer,
  FileText,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Hand, StretchHorizontal, Move, Layers, Bandage, Syringe, Flame, Zap, Radio, Wifi, Activity,
  Snowflake, Bath: Droplets, // Fallback for Bath
  ThermometerSun, Droplets, Dumbbell, RefreshCw, HeartPulse,
  Cross, MessageCircle, ClipboardCheck, Shield, Scissors, Package, MoreHorizontal,
  Sunrise, Sun, Sunset, Trophy, Medal, Clock,
};

const SEVERITY_OPTIONS = [
  { key: "caution", label: "要注意", icon: "🔵" },
  { key: "limited", label: "要制限", icon: "🟡" },
  { key: "out", label: "離脱", icon: "🔴" },
];

interface UpdateItem {
  id: string;
  date: string;
  version: string;
  title: string;
  details: string[];
  isImportant?: boolean;
}

const UPDATE_HISTORY: UpdateItem[] = [
  {
    id: "update-20260616-3",
    date: "2026-06-16",
    version: "v1.6.0",
    title: "📈 選手クイック・カルテ（自動経過サマリー）機能の新規実装",
    details: [
      "選手選択の長押し起動：新規トリートメント記録の選手ボタンを「長押し（ロングプレス）」することで、その選手の過去30日間の自動傾向カルテがすりガラス調ポップアップで起動します。",
      "1秒で全体像を把握：過去30日の合計治療回数、最も治療している部位（プログレスバー表示）、主な処置内容、直近3件のSOAP経過履歴、現在処方中のアクティブなエクササイズが一目で確認可能です。",
      "📈（カルテ）アイコンの連動：ダッシュボードの履歴タイムライン、レポート一覧、エクササイズ共有の選手選択に `📈` アイコンを新設。クリックするだけで同じサマリーを開くことができます。"
    ],
    isImportant: true
  },
  {
    id: "update-20260616-2",
    date: "2026-06-16",
    version: "v1.5.0",
    title: "🏋️ エクササイズ共有機能の洗練アップデート",
    details: [
      "表（テーブル）形式入力：複数メニューをスプレッドシート感覚で並列にサクサク入力できるようになりました。",
      "セッション全体のメディア添付：写真や動画ファイルを各メニュー個別ではなく、セッション全体に対して一括で複数添付できるように簡素化しました。",
      "担当トレーナーカラーの連動：スケジュール管理と同期された固有カラーで「担当トレーナー」を色分けバッジ＆左アクセントボーダーで明示しました。",
      "「新規」「更新」バッジ：24時間以内の新規登録には「新規」、編集更新には「更新」とカードに表示し、最近のアクションを区別しやすくしました。",
      "「完了・非表示（アーカイブ）」：各カードのチェックをクリックするだけで完了に切り替え可能。右上の「完了分を表示/非表示」トグルで、アクティブなものだけをスッキリ一覧表示できます。"
    ],
    isImportant: true
  },
  {
    id: "update-20260616-1",
    date: "2026-06-16",
    version: "v1.4.0",
    title: "🏋️ 選手個別エクササイズ共有ページの新規開設",
    details: [
      "各トレーナーが選手に処方したセルフケアやリハビリプログラム（カテゴリ、目的、ポイント）を、写真や動画を添付して記録・共有できる専用ページをサイドメニューに新設しました。"
    ]
  },
  {
    id: "update-20260615",
    date: "2026-06-15",
    version: "v1.3.1",
    title: "📋 記録詳細ダイアログのスクロール対応",
    details: [
      "治療した部位が非常に多いときや、SOAP記録・コメントが長い場合に、画面サイズによってダイアログの上下が見切れて操作できなくなる問題をスクロール対応により解決しました。"
    ]
  },
  {
    id: "update-20260614",
    date: "2026-06-14",
    version: "v1.3.0",
    title: "📊 スケジュールヒートマップの範囲最適化",
    details: [
      "ヒートマップの範囲を「過去10日前〜当日〜3日後」の計14日間に拡張。未来のトリートメント予定と過去の実績を同時にマッピングしやすくなりました。"
    ]
  },
  {
    id: "update-20260613",
    date: "2026-06-13",
    version: "v1.2.0",
    title: "📅 施術日の遡り記録対応 ＆ チームスケジュール管理機能",
    details: [
      "施術記録を当日に限らず、カレンダーから過去の日付を選択して遡り登録できるよう連動しました。",
      "☀️AM練習/🌙PM練習予定や、担当トレーナーごとのトリートメント割り当てを入力・共有できる「スケジュール管理」画面を新設。",
      "ダッシュボード最上部に1週間のスケジュール盤を配置。Miya #14,#13 のような入力テキストから選手情報を自動解析し、バッジ表示するスマート描画を搭載しました。"
    ],
    isImportant: true
  },
  {
    id: "update-20260610",
    date: "2026-06-10",
    version: "v1.1.0",
    title: "👥 チーム内データ共有 ＆ 個別ログイン・メンバー管理",
    details: [
      "トレーナー間での選手一覧やトリートメント履歴のフィルターを解除し、チーム全員でデータをリアルタイム共有・共同編集可能にしました。",
      "ログイン画面を刷新し、アバターを選択してワンクリックで個別ログイン（担当者名が施術履歴に自動 JOIN 反射）できる仕組みを導入。プロフィールの名前変更や、不要なメンバーの非表示（論理削除）にも対応しました。"
    ]
  },
  {
    id: "update-20260605",
    date: "2026-06-05",
    version: "v1.0.1",
    title: "🔒 ベーシック認証によるセキュリティロック",
    details: [
      "選手たちの個人情報・コンディショニング情報を保護するため、アプリ全体への合い言葉ロック（ベーシック認証）を適用しました。"
    ]
  },
  {
    id: "update-20260528",
    date: "2026-05-28",
    version: "v1.0.0",
    title: "🎨 前面触診マーク付きハイブリッド解剖図キャンバス",
    details: [
      "全身30箇所の全部位で前面・背面切り替えを可能に。フルカラー筋肉解剖図（透過ペン書き込み対応）と、膝蓋骨やPSISなどの前面触診マークを重ね合わせた高性能アノテーションキャンバスを搭載しました。"
    ]
  }
];

export default function Home() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  // Dashboard / Statistics queries
  const { data: players, isLoading: playersLoading } = trpc.player.list.useQuery();
  const { data: treatmentsData, isLoading: treatmentsLoading } = trpc.treatment.list.useQuery({
    limit: 100,
  });
  const { data: trainers } = trpc.auth.listTrainers.useQuery();

  // Color configuration mapping for trainers (sync with Schedules.tsx heatmap colors)
  const trainerColorMap = useMemo(() => {
    const colors = [
      { name: "red", bgLight: "bg-red-500/10 dark:bg-red-500/15", text: "text-red-600 dark:text-red-400", border: "border-red-500/20", dotColor: "bg-red-400" },
      { name: "emerald", bgLight: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", dotColor: "bg-emerald-400" },
      { name: "amber", bgLight: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", dotColor: "bg-amber-400" },
      { name: "blue", bgLight: "bg-blue-500/10 dark:bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", dotColor: "bg-blue-400" },
      { name: "indigo", bgLight: "bg-indigo-500/10 dark:bg-indigo-500/15", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20", dotColor: "bg-indigo-400" },
      { name: "violet", bgLight: "bg-violet-500/10 dark:bg-violet-500/15", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20", dotColor: "bg-violet-400" },
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

  // Render custom trainer name badge with corresponding colors
  const renderTrainerBadge = (name: string) => {
    const colorConfig = trainerColorMap[name] || {
      bgLight: "bg-muted",
      text: "text-muted-foreground",
      border: "border-border"
    };
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[9px] px-1.5 py-0 border font-semibold flex items-center gap-0.5 shrink-0 rounded-md shadow-sm",
          colorConfig.bgLight,
          colorConfig.text,
          colorConfig.border
        )}
      >
        <User className="h-2.5 w-2.5 shrink-0" />
        {name}
      </Badge>
    );
  };

  // Calculate 7-day range starting from today for dashboard schedule
  const dashboardDateRange = useMemo(() => {
    const dates = [];
    const baseDate = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const offset = d.getTimezoneOffset();
      const localD = new Date(d.getTime() - (offset * 60 * 1000));
      dates.push(localD.toISOString().split("T")[0]);
    }
    return dates;
  }, []);

  // Fetch schedules for 7 days
  const { data: dashboardSchedules, isLoading: dashboardSchedulesLoading } = trpc.schedule.list.useQuery({
    dateFrom: dashboardDateRange[0],
    dateTo: dashboardDateRange[dashboardDateRange.length - 1],
  });

  // Map schedules by date
  const dashboardSchedulesMap = useMemo(() => {
    const map: Record<string, typeof dashboardSchedules[0]> = {};
    if (dashboardSchedules) {
      dashboardSchedules.forEach((s) => {
        map[s.date] = s;
      });
    }
    return map;
  }, [dashboardSchedules]);

  // Map player names by number
  const playerNumberMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (players) {
      players.forEach((p) => {
        map[p.number] = p.name;
      });
    }
    return map;
  }, [players]);

  // Format date helper (e.g. 6/2 (火))
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const day = dayLabels[d.getDay()];
    return `${month}/${date} (${day})`;
  };

  // Parser helper to convert trainer assignments into rich badges with names
  const parseAssignments = (assignmentsText: string | null | undefined) => {
    if (!assignmentsText) return <p className="text-[10px] text-muted-foreground italic mt-1">予定なし</p>;
    const lines = assignmentsText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return <p className="text-[10px] text-muted-foreground italic mt-1">予定なし</p>;
    
    return (
      <div className="space-y-0.5 mt-0.5 overflow-y-auto max-h-[115px] pr-0.5 custom-scrollbar">
        {lines.map((line, idx) => {
          const match = line.match(/^([^#\s：:]+)(?:\s*[:：]\s*|\s+)?(.*)$/);
          if (!match) {
            return (
              <div key={idx} className="text-[10px] text-muted-foreground bg-accent/20 px-1 py-0.5 rounded">
                {line}
              </div>
            );
          }
          const trainerName = match[1];
          const playerText = match[2];
          
          const numbers: number[] = [];
          const regex = /#(\d+)/g;
          let m;
          while ((m = regex.exec(playerText)) !== null) {
            numbers.push(parseInt(m[1], 10));
          }

          const colorConfig = trainerColorMap[trainerName] || {
            bgLight: "bg-accent/20",
            text: "text-indigo-500 dark:text-indigo-400",
            border: "border-accent-foreground/5",
            dotColor: "bg-indigo-400"
          };

          return (
            <div key={idx} className={cn("border py-0.5 px-1 rounded text-left space-y-0.5", colorConfig.bgLight, colorConfig.border)}>
              <div className={cn("text-[8px] font-bold flex items-center gap-0.5 truncate", colorConfig.text)}>
                <span className={cn("h-1 w-1 rounded-full shrink-0", colorConfig.dotColor)} />
                {trainerName}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {numbers.length > 0 ? (
                  numbers.map((num) => {
                    return (
                      <Badge key={num} variant="outline" className="text-[7.5px] px-0.5 py-0 font-bold bg-background border hover:bg-accent/40 text-foreground transition-all shrink-0">
                        #{num}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-[8px] text-muted-foreground truncate">{playerText}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const createTreatment = trpc.treatment.create.useMutation({
    onSuccess: () => {
      toast.success("記録を保存しました");
      resetForm();
      utils.treatment.list.invalidate();
    },
    onError: (err) => {
      toast.error("保存に失敗しました: " + err.message);
    },
  });

  // Active Tab State: 'dashboard' or 'record' or 'report'
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Report Date Range State
  const [reportDateFrom, setReportDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const offset = d.getTimezoneOffset();
    const localD = new Date(d.getTime() - (offset * 60 * 1000));
    return localD.toISOString().split("T")[0];
  });
  const [reportDateTo, setReportDateTo] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localD = new Date(d.getTime() - (offset * 60 * 1000));
    return localD.toISOString().split("T")[0];
  });

  // Load report data within selected date range
  const { data: reportTreatments, isLoading: reportTreatmentsLoading } = trpc.treatment.list.useQuery({
    dateFrom: new Date(reportDateFrom + "T00:00:00.000Z"),
    dateTo: new Date(reportDateTo + "T23:59:59.999Z"),
    limit: 1500,
  }, {
    enabled: activeTab === "report",
  });

  const { data: reportSchedules, isLoading: reportSchedulesLoading } = trpc.schedule.list.useQuery({
    dateFrom: reportDateFrom,
    dateTo: reportDateTo,
  }, {
    enabled: activeTab === "report",
  });

  // Calculate report statistics based on loaded treatments data
  const reportStats = useMemo(() => {
    if (!reportTreatments || !reportTreatments.rows) {
      return { count: 0, totalDuration: 0, uniquePlayers: 0, partCounts: [], trainerCounts: [], typeCounts: [] };
    }

    const rows = reportTreatments.rows;
    const count = rows.length;
    const totalDuration = rows.reduce((sum, r) => sum + r.duration, 0);
    const uniquePlayersSet = new Set(rows.map(r => r.playerId));

    // Aggregate counts
    const parts: Record<string, number> = {};
    const trainersMap: Record<string, number> = {};
    const types: Record<string, number> = {};

    rows.forEach(r => {
      // Body parts counts
      if (r.bodyParts && Array.isArray(r.bodyParts)) {
        r.bodyParts.forEach((bp: string) => {
          parts[bp] = (parts[bp] || 0) + 1;
        });
      }
      // Trainer counts
      const trainer = (r as any).createdByName || "不明";
      trainersMap[trainer] = (trainersMap[trainer] || 0) + 1;
      // Treatment type counts
      if (r.treatmentDetails && typeof r.treatmentDetails === "object") {
        Object.values(r.treatmentDetails as Record<string, { treatmentTypes: string[] }>).forEach(d => {
          if (d.treatmentTypes) {
            d.treatmentTypes.forEach(t => {
              types[t] = (types[t] || 0) + 1;
            });
          }
        });
      } else if (r.treatmentTypes && Array.isArray(r.treatmentTypes)) {
        r.treatmentTypes.forEach((t: string) => {
          types[t] = (types[t] || 0) + 1;
        });
      }
    });

    const partCounts = Object.entries(parts)
      .map(([key, value]) => ({ name: getBodyPartLabel(key), value }))
      .sort((a, b) => b.value - a.value);

    const trainerCounts = Object.entries(trainersMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const typeCounts = Object.entries(types)
      .map(([key, value]) => ({ name: getTreatmentTypeLabel(key), value }))
      .sort((a, b) => b.value - a.value);

    return {
      count,
      totalDuration,
      uniquePlayers: uniquePlayersSet.size,
      partCounts,
      trainerCounts,
      typeCounts,
    };
  }, [reportTreatments]);

  // Aggregate trainer schedule count stats
  const reportScheduleStats = useMemo(() => {
    const trainerScheduleCounts: Record<string, number> = {};
    if (reportSchedules) {
      reportSchedules.forEach(s => {
        const text = s.assignments;
        if (!text) return;
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
          const match = line.match(/^([^#\s：:]+)(?:\s*[:：]\s*|\s+)?(.*)$/);
          if (!match) return;
          const trainerName = match[1];
          const playerText = match[2];
          
          const numbers: number[] = [];
          const regex = /#(\d+)/g;
          let m;
          while ((m = regex.exec(playerText)) !== null) {
            numbers.push(parseInt(m[1], 10));
          }
          
          trainerScheduleCounts[trainerName] = (trainerScheduleCounts[trainerName] || 0) + numbers.length;
        });
      });
    }

    return Object.entries(trainerScheduleCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [reportSchedules]);

  // Handle CSV export of date-ranged data
  const handleExportCSV = () => {
    if (!reportTreatments || !reportTreatments.rows || reportTreatments.rows.length === 0) {
      toast.error("エクスポートするデータがありません");
      return;
    }

    const headers = ["日付", "背番号", "選手名", "トレーナー", "部位", "処置内容", "所要時間(分)", "要注意度", "SOAP(S)", "SOAP(O)", "SOAP(A)", "SOAP(P)", "コメント"];
    
    const csvRows = [headers.join(",")];

    reportTreatments.rows.forEach(r => {
      const dateStr = format(new Date(r.treatmentDate), "yyyy-MM-dd HH:mm", { locale: ja });
      const playerNum = getPlayerNumber(r.playerId) !== undefined ? `#${getPlayerNumber(r.playerId)}` : "";
      const playerName = getPlayerName(r.playerId);
      const trainerName = (r as any).createdByName ?? "不明";
      
      const bpLabels = r.bodyParts ? (r.bodyParts as string[]).map(bp => getBodyPartLabel(bp)).join("; ") : "";
      
      let txLabels = "";
      if (r.treatmentDetails && typeof r.treatmentDetails === "object") {
        txLabels = Object.entries(r.treatmentDetails as Record<string, { treatmentTypes: string[] }>)
          .map(([bp, d]) => `${getBodyPartLabel(bp)}: ${d.treatmentTypes.map(t => getTreatmentTypeLabel(t)).join("+")}`)
          .join("; ");
      } else if (r.treatmentTypes && Array.isArray(r.treatmentTypes)) {
        txLabels = (r.treatmentTypes as string[]).map(t => getTreatmentTypeLabel(t)).join("; ");
      }

      const duration = r.duration;
      const severityLabel = r.severity === "out" ? "離脱" : r.severity === "limited" ? "要制限" : r.severity === "caution" ? "要注意" : "通常";
      
      const escapeCsv = (str: any) => {
        if (str === null || str === undefined) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };

      const row = [
        escapeCsv(dateStr),
        escapeCsv(playerNum),
        escapeCsv(playerName),
        escapeCsv(trainerName),
        escapeCsv(bpLabels),
        escapeCsv(txLabels),
        escapeCsv(duration),
        escapeCsv(severityLabel),
        escapeCsv(r.soapS),
        escapeCsv(r.soapO),
        escapeCsv(r.soapA),
        escapeCsv(r.soapP),
        escapeCsv(r.comment)
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `treatment_report_${reportDateFrom}_to_${reportDateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSVをエクスポートしました！");
  };

  // Quick range button handler
  const handleSetQuickPeriod = (type: "7days" | "30days" | "thisMonth" | "lastMonth") => {
    const today = new Date();
    let fromDate = new Date();
    
    if (type === "7days") {
      fromDate.setDate(today.getDate() - 7);
    } else if (type === "30days") {
      fromDate.setDate(today.getDate() - 30);
    } else if (type === "thisMonth") {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === "lastMonth") {
      fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const toDate = new Date(today.getFullYear(), today.getMonth(), 0);
      
      const offsetFrom = fromDate.getTimezoneOffset();
      const localFrom = new Date(fromDate.getTime() - (offsetFrom * 60 * 1000));
      setReportDateFrom(localFrom.toISOString().split("T")[0]);

      const offsetTo = toDate.getTimezoneOffset();
      const localTo = new Date(toDate.getTime() - (offsetTo * 60 * 1000));
      setReportDateTo(localTo.toISOString().split("T")[0]);
      return;
    }

    const offsetFrom = fromDate.getTimezoneOffset();
    const localFrom = new Date(fromDate.getTime() - (offsetFrom * 60 * 1000));
    setReportDateFrom(localFrom.toISOString().split("T")[0]);

    const offsetTo = today.getTimezoneOffset();
    const localTo = new Date(today.getTime() - (offsetTo * 60 * 1000));
    setReportDateTo(localTo.toISOString().split("T")[0]);
  };

  // Update History Dialog State
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // Detail dialog state for timeline items
  const [detailId, setDetailId] = useState<number | null>(null);
  const { data: detailData, isLoading: detailLoading, error: detailError } = trpc.treatment.getById.useQuery(
    { id: detailId ?? 0 },
    { enabled: detailId !== null && detailId > 0 }
  );

  // Detail Dialog Edit Mode States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editDate, setEditDate] = useState<string>("");
  const [editTiming, setEditTiming] = useState<string>("");
  const [editDuration, setEditDuration] = useState<number>(15);
  const [editSeverity, setEditSeverity] = useState<string>("normal");
  const [editSoapS, setEditSoapS] = useState<string>("");
  const [editSoapO, setEditSoapO] = useState<string>("");
  const [editSoapA, setEditSoapA] = useState<string>("");
  const [editSoapP, setEditSoapP] = useState<string>("");
  const [editComment, setEditComment] = useState<string>("");
  const [editBodyParts, setEditBodyParts] = useState<string[]>([]);
  const [editTreatmentDetails, setEditTreatmentDetails] = useState<Record<string, { treatmentTypes: string[]; duration: number }>>({});

  // tRPC update treatment mutation
  const updateTreatment = trpc.treatment.update.useMutation({
    onSuccess: () => {
      toast.success("記録を更新しました");
      setIsEditing(false);
      utils.treatment.list.invalidate();
      if (detailId) {
        utils.treatment.getById.invalidate({ id: detailId });
      }
    },
    onError: (err) => {
      toast.error("更新に失敗しました: " + err.message);
    },
  });

  // Reset editing state and populate form values when detailData is loaded
  useEffect(() => {
    if (detailData) {
      setEditDate(detailData.treatmentDate ? format(new Date(detailData.treatmentDate), "yyyy-MM-dd'T'HH:mm") : "");
      setEditTiming(detailData.timing || "");
      setEditDuration(detailData.duration || 15);
      setEditSeverity(detailData.severity || "normal");
      setEditSoapS(detailData.soapS || "");
      setEditSoapO(detailData.soapO || "");
      setEditSoapA(detailData.soapA || "");
      setEditSoapP(detailData.soapP || "");
      setEditComment(detailData.comment || "");
      setEditBodyParts(detailData.bodyParts || []);
      setEditTreatmentDetails((detailData.treatmentDetails as Record<string, { treatmentTypes: string[]; duration: number }>) || {});
    }
    setIsEditing(false);
  }, [detailData]);

  const handleEditToggleBodyPart = (key: string) => {
    setEditBodyParts(prev => {
      const isRemoving = prev.includes(key);
      if (isRemoving) {
        setEditTreatmentDetails(d => {
          const next = { ...d };
          delete next[key];
          return next;
        });
        return prev.filter(k => k !== key);
      } else {
        setEditTreatmentDetails(d => ({
          ...d,
          [key]: { treatmentTypes: [], duration: 15 }
        }));
        return [...prev, key];
      }
    });
  };

  const handleReplaceEditBodyPart = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    if (editBodyParts.includes(newKey)) {
      toast.error("その部位は既に選択されています");
      return;
    }
    setEditBodyParts(prev => prev.map(k => k === oldKey ? newKey : k));
    setEditTreatmentDetails(prev => {
      const next = { ...prev };
      if (next[oldKey]) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });
  };

  // Form state
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [treatmentDate, setTreatmentDate] = useState<string>(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  });
  
  // Per-body-part details: Record<bodyPartKey, { treatmentTypes: string[], duration: number }>
  const [treatmentDetails, setTreatmentDetails] = useState<Record<string, { treatmentTypes: string[]; duration: number }>>({});
  
  // Category tabs active selections for hybrid mode (key: bodyPartKey, value: categoryKey)
  const [selectedCategoryForPart, setSelectedCategoryForPart] = useState<Record<string, string>>({});

  // 選手サマリーダイアログ用の状態
  const [summaryPlayerId, setSummaryPlayerId] = useState<number | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);

  // 選手名ボタンのロングプレス（長押し）イベントハンドラ
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const handleStartLongPress = (pId: number) => {
    isLongPressRef.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSummaryPlayerId(pId);
      setIsSummaryOpen(true);
    }, 500);
  };

  const handleEndLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handlePlayerClick = (pId: number, e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }
    setPlayerId(pId);
  };

  // 3日以内のアップデート項目を抽出するロジック（なければ最新1件を表示）
  const updatesToShow = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recent = UPDATE_HISTORY.filter(item => {
      const updateDate = new Date(item.date);
      updateDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - updateDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    });

    return recent.length > 0 ? recent : [UPDATE_HISTORY[0]];
  }, []);

  // 5大固定処置ベース + 自動頻度上位3項目のハイブリッドクイック処置リスト
  const FIXED_QUICK_TREATMENTS = ["massage", "mobilization", "electrotherapy", "acupuncture", "reconditioning"];
  const quickTreatments = useMemo(() => {
    if (!treatmentsData || !treatmentsData.rows) {
      return FIXED_QUICK_TREATMENTS;
    }

    const typeCounts: Record<string, number> = {};
    treatmentsData.rows.forEach(r => {
      if (r.treatmentDetails && typeof r.treatmentDetails === "object") {
        Object.values(r.treatmentDetails as Record<string, { treatmentTypes: string[] }>).forEach(d => {
          if (d.treatmentTypes) {
            d.treatmentTypes.forEach(t => {
              typeCounts[t] = (typeCounts[t] || 0) + 1;
            });
          }
        });
      } else if (r.treatmentTypes && Array.isArray(r.treatmentTypes)) {
        r.treatmentTypes.forEach((t: string) => {
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
      }
    });

    const dynamicTypes = Object.entries(typeCounts)
      .filter(([key]) => !FIXED_QUICK_TREATMENTS.includes(key))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);

    return [...FIXED_QUICK_TREATMENTS, ...dynamicTypes];
  }, [treatmentsData]);

  const [timing, setTiming] = useState<string>("");
  const [severity, setSeverity] = useState<string>("normal");
  const [soapS, setSoapS] = useState("");
  const [soapO, setSoapO] = useState("");
  const [soapA, setSoapA] = useState("");
  const [soapP, setSoapP] = useState("");
  const [comment, setComment] = useState("");
  const [soapOpen, setSoapOpen] = useState(false);

  // Annotation state
  const [annotations, setAnnotations] = useState<Record<string, AnnotationData>>({});
  const [annotatingPart, setAnnotatingPart] = useState<string | null>(null);

  const resetForm = () => {
    setPlayerId(null);
    setBodyParts([]);
    setTreatmentDetails({});
    setTiming("");
    setSeverity("normal");
    setSoapS("");
    setSoapO("");
    setSoapA("");
    setSoapP("");
    setComment("");
    setSoapOpen(false);
    setAnnotations({});
    setAnnotatingPart(null);
    setSelectedCategoryForPart({});
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    setTreatmentDate(localDate.toISOString().slice(0, 16));
  };

  const handleTimingSelect = (key: string) => {
    setTiming(key);
    const defaultTime = TIMING_DEFAULT_HOURS[key];
    if (defaultTime && treatmentDate) {
      const datePart = treatmentDate.split("T")[0];
      setTreatmentDate(`${datePart}T${defaultTime}`);
    }
  };

  const handleToggleBodyPart = (key: string) => {
    setBodyParts(prev => {
      const isRemoving = prev.includes(key);
      if (isRemoving) {
        // Also remove details and annotation for this part
        setTreatmentDetails(d => {
          const next = { ...d };
          delete next[key];
          return next;
        });
        setAnnotations(a => {
          const next = { ...a };
          delete next[key];
          return next;
        });
        return prev.filter(k => k !== key);
      } else {
        // Initialize default values for the new part
        setTreatmentDetails(d => ({
          ...d,
          [key]: { treatmentTypes: [], duration: 15 }
        }));
        return [...prev, key];
      }
    });
  };

  const handleReplaceBodyPart = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    if (bodyParts.includes(newKey)) {
      toast.error("その部位は既に選択されています");
      return;
    }
    setBodyParts(prev => prev.map(k => k === oldKey ? newKey : k));
    setTreatmentDetails(prev => {
      const next = { ...prev };
      if (next[oldKey]) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });
    setAnnotations(prev => {
      const next = { ...prev };
      if (next[oldKey]) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });
    setSelectedCategoryForPart(prev => {
      const next = { ...prev };
      if (next[oldKey]) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });
  };

  const handleUpdatePartTreatment = (partKey: string, types: string[]) => {
    setTreatmentDetails(prev => ({
      ...prev,
      [partKey]: {
        ...prev[partKey],
        treatmentTypes: types
      }
    }));
  };

  const handleUpdatePartDuration = (partKey: string, duration: number) => {
    setTreatmentDetails(prev => ({
      ...prev,
      [partKey]: {
        ...prev[partKey],
        duration
      }
    }));
  };

  const handleAnnotationSave = (data: AnnotationData) => {
    if (annotatingPart) {
      setAnnotations(prev => ({ ...prev, [annotatingPart]: data }));
    }
    setAnnotatingPart(null);
  };

  // Requirement: playerId, bodyParts are selected, timing is selected, AND every selected bodyPart has at least 1 treatment type selected
  const canSubmit = 
    playerId && 
    bodyParts.length > 0 && 
    timing && 
    bodyParts.every(part => treatmentDetails[part]?.treatmentTypes?.length > 0);

  const handleSubmit = () => {
    if (!canSubmit || !playerId) return;

    // Collect all unique treatment types across all body parts for global fallback compatibility
    const allTypes = Array.from(
      new Set(Object.values(treatmentDetails).flatMap(d => d.treatmentTypes))
    );
    // Get the maximum duration across all body parts as global duration fallback
    const maxDuration = Object.values(treatmentDetails).reduce(
      (max, d) => Math.max(max, d.duration),
      15
    );

    createTreatment.mutate({
      playerId,
      bodyParts,
      treatmentTypes: allTypes.length > 0 ? allTypes : ["other"],
      timing,
      duration: maxDuration,
      soapS: soapS || undefined,
      soapO: soapO || undefined,
      soapA: soapA || undefined,
      soapP: soapP || undefined,
      comment: comment || undefined,
      annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
      treatmentDetails: treatmentDetails,
      severity,
      treatmentDate: new Date(treatmentDate),
    });
  };

  const groupedTreatments = useMemo(() => {
    return TREATMENT_CATEGORIES.map(cat => ({
      ...cat,
      types: TREATMENT_TYPES.filter(t => t.category === cat.key),
    }));
  }, []);

  const getPlayerName = (playerId: number) => {
    return players?.find(p => p.id === playerId)?.name ?? "不明";
  };

  const getPlayerNumber = (playerId: number) => {
    return players?.find(p => p.id === playerId)?.number;
  };

  const todayStats = useMemo(() => {
    if (!treatmentsData || !treatmentsData.rows) return { count: 0, totalDuration: 0, uniquePlayers: 0 };
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todays = treatmentsData.rows.filter(r => {
      const dateStr = format(new Date(r.treatmentDate), "yyyy-MM-dd");
      return dateStr === todayStr;
    });
    const uniquePlayersSet = new Set(todays.map(r => r.playerId));
    const totalDuration = todays.reduce((sum, r) => sum + r.duration, 0);
    return {
      count: todays.length,
      totalDuration,
      uniquePlayers: uniquePlayersSet.size
    };
  }, [treatmentsData]);

  const chartData = useMemo(() => {
    if (!treatmentsData || !treatmentsData.rows) return [];
    const partCounts: Record<string, number> = {};
    treatmentsData.rows.forEach(r => {
      if (r.bodyParts && Array.isArray(r.bodyParts)) {
        r.bodyParts.forEach((bp: string) => {
          partCounts[bp] = (partCounts[bp] || 0) + 1;
        });
      }
    });
    return Object.entries(partCounts)
      .map(([partKey, count]) => ({
        name: getBodyPartLabel(partKey),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // 上位5部位
  }, [treatmentsData]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">施術ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-1">施術記録の入力および統計の見える化</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-[500px] mb-4 bg-muted/80 p-1 rounded-xl print:hidden">
          <TabsTrigger value="dashboard" className="rounded-lg py-2 text-xs font-semibold">
            📊 ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="record" className="rounded-lg py-2 text-xs font-semibold">
            ✍️ 新しく記録する
          </TabsTrigger>
          <TabsTrigger value="report" className="rounded-lg py-2 text-xs font-semibold">
            📁 期間集計・出力
          </TabsTrigger>
        </TabsList>

        {/* 📊 Dashboard Tab Content */}
        <TabsContent value="dashboard" className="space-y-6 outline-none">
          {/* 最新のアップデート情報バナー */}
          <div className="bg-sky-500/5 border border-sky-500/15 dark:border-sky-500/10 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex-1 space-y-1.5 overflow-hidden">
              {updatesToShow.map((item) => (
                <div key={item.id} className="flex items-center gap-2 truncate">
                  <span className="flex h-2 w-2 rounded-full bg-sky-500 shrink-0 animate-ping" />
                  <span className="font-bold text-sky-700 dark:text-sky-400 shrink-0 bg-sky-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {item.version}
                  </span>
                  <p className="text-sky-850 dark:text-sky-300 truncate font-semibold">
                    アップデート：{item.title}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsUpdateDialogOpen(true)}
              className="text-primary hover:underline font-bold shrink-0 flex items-center gap-1 text-[11px] self-end sm:self-center pt-1 sm:pt-0"
            >
              更新履歴を見る ➔
            </button>
          </div>

          {/* 📅 1週間スケジュールボード */}
          <Card className="shadow-md border border-border/85 bg-gradient-to-br from-card to-background overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  1週間のスケジュール ＆ トリートメント予定
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  チーム練習スケジュールと、各トレーナーのトリートメント割り当て（向こう1週間）
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = "/schedules";
                }}
                className="text-xs shrink-0 h-8 font-medium rounded-xl hover:bg-accent/80 hover:text-accent-foreground"
              >
                予定を編集する
              </Button>
            </CardHeader>
            <CardContent className="p-3">
              {dashboardSchedulesLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
                  {dashboardDateRange.map((dateStr) => {
                    const schedule = dashboardSchedulesMap[dateStr];
                    
                    // 日付フォーマットの比較のために現在時刻のYYYY-MM-DDを計算
                    const todayLocal = new Date();
                    const offset = todayLocal.getTimezoneOffset();
                    const localD = new Date(todayLocal.getTime() - (offset * 60 * 1000));
                    const currentTodayStr = localD.toISOString().split("T")[0];
                    const isToday = dateStr === currentTodayStr;
                    
                    return (
                      <div
                        key={dateStr}
                        className={cn(
                          "rounded-2xl p-1.5 border transition-all flex flex-col justify-between min-h-[185px] bg-card relative shadow-sm",
                          isToday
                            ? "border-primary bg-primary/[0.02] shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)] ring-1 ring-primary/30"
                            : "border-border/60 hover:border-primary/30"
                        )}
                      >
                        {/* 今日バッジ */}
                        {isToday && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                            今日
                          </div>
                        )}
 
                        {/* 日付ヘッダー */}
                        <div className="text-center pb-0.5 border-b border-border/40">
                          <p className={cn(
                            "text-xs font-bold font-mono tracking-tight",
                            isToday ? "text-primary font-extrabold" : "text-foreground"
                          )}>
                            {formatDateLabel(dateStr)}
                          </p>
                        </div>
 
                        {/* 練習予定 (AM/PM) */}
                        <div className="space-y-0.5 py-1 border-b border-dashed border-border/40">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground flex items-center gap-1 font-medium">
                              <Sun className="h-3 w-3 text-amber-500" />
                              AM
                            </span>
                            <span className="font-bold text-foreground truncate max-w-[70px]">
                              {schedule?.practiceAm || "OFF"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground flex items-center gap-1 font-medium">
                              <Moon className="h-3 w-3 text-indigo-400" />
                              PM
                            </span>
                            <span className="font-bold text-foreground truncate max-w-[70px]">
                              {schedule?.practicePm || "OFF"}
                            </span>
                          </div>
                        </div>
 
                        {/* トリートメント担当予定 */}
                        <div className="flex-1 pt-1 flex flex-col justify-start min-h-[90px]">
                          {parseAssignments(schedule?.assignments)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 本日の施術実績 (3連カード) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20 shadow-sm hover:shadow transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-indigo-500 tracking-wider uppercase">本日ののべ施術数</p>
                    <h3 className="text-3xl font-extrabold tracking-tight font-mono">{todayStats.count} <span className="text-sm font-medium text-muted-foreground">件</span></h3>
                  </div>
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20 shadow-sm hover:shadow transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-emerald-500 tracking-wider uppercase">本日の治療時間</p>
                    <h3 className="text-3xl font-extrabold tracking-tight font-mono">{todayStats.totalDuration} <span className="text-sm font-medium text-muted-foreground">分</span></h3>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20 shadow-sm hover:shadow transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-500 tracking-wider uppercase">本日治療した選手</p>
                    <h3 className="text-3xl font-extrabold tracking-tight font-mono">{todayStats.uniquePlayers} <span className="text-sm font-medium text-muted-foreground">人</span></h3>
                  </div>
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 部位別施術件数 (Recharts BarChart) */}
            <Card className="shadow-sm hover:shadow transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  部位別施術件数 (上位5部位)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                {treatmentsLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                        width={60}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(0, 0, 0, 0.03)" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-md text-xs font-medium">
                                <p className="text-foreground">{payload[0].name} : {payload[0].value} 回</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={6} barSize={12}>
                        {chartData.map((entry, index) => {
                          const colors = [
                            "rgba(99, 102, 241, 0.85)", // Indigo
                            "rgba(16, 185, 129, 0.85)", // Emerald
                            "rgba(245, 158, 11, 0.85)", // Amber
                            "rgba(239, 68, 68, 0.85)",  // Red
                            "rgba(139, 92, 246, 0.85)", // Violet
                          ];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-accent/10">
                    <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-medium text-muted-foreground">施術データがありません</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 最近治療を受けた選手 (タイムライン) */}
            <Card className="shadow-sm hover:shadow transition-all duration-200 flex flex-col">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  最近治療を受けた選手
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("record")} className="text-xs text-primary font-medium gap-1 h-7 px-2">
                  <Plus className="h-3 w-3" />
                  記録する
                </Button>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-y-auto max-h-[280px] space-y-3">
                {treatmentsLoading ? (
                  <div className="h-full flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : treatmentsData && treatmentsData.rows && treatmentsData.rows.length > 0 ? (
                  <div className="space-y-2">
                    {treatmentsData.rows.slice(0, 5).map(record => {
                      const sev = (record as any).severity || "normal";
                      const trainerName = (record as any).createdByName ?? "不明";
                      const colorConfig = trainerColorMap[trainerName] || {
                        bgLight: "bg-primary/10",
                        text: "text-primary",
                        border: "border-border/40"
                      };
                      return (
                        <div
                          key={record.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group",
                            sev === "out" ? "border-red-500/70 bg-gradient-to-r from-red-500/5 to-transparent hover:from-red-500/10 shadow-[0_0_12px_-4px_rgba(239,68,68,0.15)]"
                              : sev === "limited" ? "border-amber-500/70 bg-gradient-to-r from-amber-500/5 to-transparent hover:from-amber-500/10 shadow-[0_0_12px_-4px_rgba(245,158,11,0.1)]"
                              : sev === "caution" ? "border-blue-500/70 bg-gradient-to-r from-blue-500/5 to-transparent hover:from-blue-500/10"
                              : "border-border/60 bg-card hover:bg-accent/20"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors border",
                              sev === "out" ? "bg-red-500/15 text-red-500 border-red-500/20 font-extrabold"
                                : sev === "limited" ? "bg-amber-500/15 text-amber-500 border-amber-500/20 font-extrabold"
                                : sev === "caution" ? "bg-blue-500/15 text-blue-500 border-blue-500/20 font-extrabold"
                                : cn(colorConfig.bgLight, colorConfig.text, colorConfig.border)
                            )}>
                              <span className="text-[10px] font-bold">
                                #{getPlayerNumber(record.playerId)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm truncate">{getPlayerName(record.playerId)}</p>
                                {sev !== "normal" && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] px-1.5 py-0 border-0 font-bold tracking-tight rounded-md shrink-0",
                                      sev === "out" ? "bg-red-500/10 text-red-500"
                                        : sev === "limited" ? "bg-amber-500/10 text-amber-500"
                                        : "bg-blue-500/10 text-blue-500"
                                    )}
                                  >
                                    {sev === "out" ? "離脱" : sev === "limited" ? "要制限" : "要注意"}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {format(new Date(record.treatmentDate), "MM/dd HH:mm", { locale: ja })}
                                </span>
                                {renderTrainerBadge(trainerName)}
                                {record.bodyParts && (record.bodyParts as string[]).slice(0, 2).map((bp: string) => (
                                  <Badge 
                                    key={bp} 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] px-1 py-0 font-normal border",
                                      colorConfig.bgLight,
                                      colorConfig.text,
                                      colorConfig.border
                                    )}
                                  >
                                    {getBodyPartLabel(bp)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1"
                            onClick={() => {
                              setSummaryPlayerId(record.playerId);
                              setIsSummaryOpen(true);
                            }}
                            title="経過サマリーを表示"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => setDetailId(record.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 border border-dashed border-border rounded-xl bg-accent/10">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-medium text-muted-foreground">治療履歴がありません</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ✍️ Form Tab Content */}
        <TabsContent value="record" className="space-y-5 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Player + Body Map */}
            <div className="space-y-5">
              {/* Date Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">施術日</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <input
                      type="datetime-local"
                      value={treatmentDate}
                      onChange={(e) => setTreatmentDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/50 focus:border-primary focus:outline-none text-sm transition-all shadow-sm max-w-xs w-full text-foreground"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const local = new Date();
                        const offset = local.getTimezoneOffset();
                        const localDate = new Date(local.getTime() - (offset * 60 * 1000));
                        setTreatmentDate(localDate.toISOString().slice(0, 16));
                      }}
                      className="text-xs shrink-0"
                    >
                      今日に設定
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Player Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">選手</CardTitle>
                </CardHeader>
                <CardContent>
                  {playersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      読み込み中...
                    </div>
                  ) : players && players.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {players.map(p => (
                        <button
                          key={p.id}
                          onMouseDown={() => handleStartLongPress(p.id)}
                          onMouseUp={handleEndLongPress}
                          onMouseLeave={handleEndLongPress}
                          onTouchStart={() => handleStartLongPress(p.id)}
                          onTouchEnd={handleEndLongPress}
                          onClick={(e) => handlePlayerClick(p.id, e)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left select-none",
                            playerId === p.id
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-border hover:border-primary/30 hover:bg-accent/50"
                          )}
                        >
                          <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">#{p.number}</span>
                          <span className="font-medium truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      選手が登録されていません。「選手管理」から登録してください。
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Body Map */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    部位
                    {bodyParts.length > 0 && (
                      <span className="ml-2 text-primary font-normal normal-case">
                        {bodyParts.length}箇所選択中
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BodyMap selectedParts={bodyParts} onTogglePart={handleToggleBodyPart} />
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Treatment Details (Per Body Part) */}
            <div className="space-y-5">
              {/* Dynamic Body Part Cards */}
              <Card className="min-h-[300px] flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    施術詳細 (部位別)
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-4">
                  {bodyParts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-accent/10">
                      <Activity className="h-10 w-10 text-muted-foreground/30 mb-3 animate-pulse" />
                      <p className="text-sm font-medium text-muted-foreground">施術する部位が選択されていません</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">左側の人体図をタップして、部位を選択してください。</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <AnimatePresence initial={false}>
                        {bodyParts.map(partKey => {
                          const details = treatmentDetails[partKey] || { treatmentTypes: [], duration: 15 };
                          const hasAnnotation = !!annotations[partKey]?.strokes?.length;
                          
                          return (
                            <motion.div
                              key={partKey}
                              initial={{ opacity: 0, y: 12, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.97, y: -12 }}
                              transition={{ duration: 0.18 }}
                              className="p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow transition-shadow relative overflow-hidden"
                            >
                              {/* Card Header */}
                              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                  <select
                                    value={partKey}
                                    onChange={(e) => handleReplaceBodyPart(partKey, e.target.value)}
                                    className="font-semibold text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                                  >
                                    {BODY_PARTS.map(part => (
                                      <option key={part.key} value={part.key}>
                                        {part.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {/* Hand-draw button */}
                                  <button
                                    onClick={() => setAnnotatingPart(partKey)}
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all",
                                      hasAnnotation
                                        ? "border-primary/30 bg-primary/10 text-primary"
                                        : "border-border hover:border-primary/20 hover:bg-accent text-muted-foreground"
                                    )}
                                  >
                                    <Pencil className="h-3 w-3" />
                                    <span>マーカー</span>
                                    {hasAnnotation && (
                                      <span className="flex h-1 w-1 rounded-full bg-primary" />
                                    )}
                                  </button>

                                  {/* Remove button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleToggleBodyPart(partKey)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Card Body: Treatments & Duration (HYBRID STYLE) */}
                              <div className="space-y-3.5">
                                {/* Quick Toggles (Top 5 common) */}
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">よく使う処置 (直接タップ)</label>
                                  <div className="flex flex-wrap gap-1">
                                    {quickTreatments
                                      .map(key => TREATMENT_TYPES.find(t => t.key === key))
                                      .filter((t): t is any => !!t)
                                      .map(t => {
                                      const isChecked = details.treatmentTypes.includes(t.key);
                                      return (
                                        <button
                                          key={t.key}
                                          onClick={() => {
                                            const nextTypes = isChecked
                                              ? details.treatmentTypes.filter(k => k !== t.key)
                                              : [...details.treatmentTypes, t.key];
                                            handleUpdatePartTreatment(partKey, nextTypes);
                                          }}
                                          className={cn(
                                            "px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1",
                                            isChecked
                                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                                              : "border-border hover:border-primary/20 hover:bg-accent text-muted-foreground"
                                          )}
                                        >
                                          {isChecked && <Check className="h-3 w-3 shrink-0" />}
                                          {t.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Category Mini Tabs */}
                                <div className="border-t border-border/40 pt-3">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">その他のカテゴリ</label>
                                  <div className="flex bg-muted/60 rounded-lg p-0.5 gap-0.5 overflow-x-auto scrollbar-none">
                                    {TREATMENT_CATEGORIES.map(cat => {
                                      const isSelected = selectedCategoryForPart[partKey] === cat.key;
                                      return (
                                        <button
                                          key={cat.key}
                                          onClick={() => setSelectedCategoryForPart(prev => ({ ...prev, [partKey]: isSelected ? "" : cat.key }))}
                                          className={cn(
                                            "px-2 py-1 rounded text-[10px] font-semibold transition-all whitespace-nowrap flex-1 text-center",
                                            isSelected
                                              ? "bg-white text-foreground shadow-sm border border-border/30"
                                              : "text-muted-foreground hover:text-foreground"
                                          )}
                                        >
                                          {cat.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Dynamic items list for selected category */}
                                {selectedCategoryForPart[partKey] && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-2 rounded-lg border border-border bg-accent/5 grid grid-cols-2 gap-1"
                                  >
                                    {TREATMENT_TYPES.filter(t => t.category === selectedCategoryForPart[partKey]).map(t => {
                                      const isChecked = details.treatmentTypes.includes(t.key);
                                      return (
                                        <button
                                          key={t.key}
                                          onClick={() => {
                                            const nextTypes = isChecked
                                              ? details.treatmentTypes.filter(k => k !== t.key)
                                              : [...details.treatmentTypes, t.key];
                                            handleUpdatePartTreatment(partKey, nextTypes);
                                          }}
                                          className={cn(
                                            "px-2 py-1.5 rounded-md border text-[11px] font-medium transition-all text-left flex items-center justify-between",
                                            isChecked
                                              ? "border-primary bg-primary/5 text-primary"
                                              : "border-border hover:border-primary/20 hover:bg-accent text-muted-foreground"
                                          )}
                                        >
                                          <span className="truncate">{t.label}</span>
                                          {isChecked && <Check className="h-3 w-3 text-primary shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                )}

                                {/* Duration Presets */}
                                <div className="border-t border-border/40 pt-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      処置時間
                                    </label>
                                    <span className="text-xs font-semibold text-primary">{details.duration}分</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {DURATION_PRESETS.map(d => (
                                      <button
                                        key={d}
                                        onClick={() => handleUpdatePartDuration(partKey, d)}
                                        className={cn(
                                          "px-2 py-1 rounded-lg border text-[11px] font-medium transition-all flex-1 min-w-[36px] text-center",
                                          details.duration === d
                                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                                            : "border-border hover:border-primary/20 hover:bg-accent text-muted-foreground"
                                        )}
                                      >
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Severity Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">重症度 / コンディション</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {SEVERITY_OPTIONS.map(opt => {
                      const isSelected = severity === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setSeverity(prev => prev === opt.key ? "normal" : opt.key)}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all duration-200",
                            isSelected
                              ? opt.key === "out" ? "border-red-500 bg-red-500/10 text-red-500 shadow-sm shadow-red-500/10 font-bold"
                                : opt.key === "limited" ? "border-amber-500 bg-amber-500/10 text-amber-500 shadow-sm shadow-amber-500/10 font-bold"
                                : "border-blue-500 bg-blue-500/10 text-blue-500 shadow-sm shadow-blue-500/10 font-bold"
                              : "border-border hover:border-muted-foreground/30 hover:bg-accent/50 text-muted-foreground"
                          )}
                        >
                          <span className="text-sm">{opt.icon}</span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Timing */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">タイミング</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {TIMING_OPTIONS.map(t => {
                      const Icon = iconMap[t.icon];
                      const isSelected = timing === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() => handleTimingSelect(t.key)}
                          className={cn(
                            "flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-border hover:border-primary/30 hover:bg-accent/50 text-muted-foreground"
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* SOAP Notes (Collapsible) */}
              <Collapsible open={soapOpen} onOpenChange={setSoapOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-accent/30 transition-colors rounded-t-lg">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>SOAP記録・コメント</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", soapOpen && "rotate-180")} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">S（主観的情報）</label>
                        <Textarea
                          value={soapS}
                          onChange={e => setSoapS(e.target.value)}
                          placeholder="選手の訴え・自覚症状..."
                          className="resize-none h-16 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">O（客観的情報）</label>
                        <Textarea
                          value={soapO}
                          onChange={e => setSoapO(e.target.value)}
                          placeholder="検査所見・触診結果..."
                          className="resize-none h-16 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">A（評価）</label>
                        <Textarea
                          value={soapA}
                          onChange={e => setSoapA(e.target.value)}
                          placeholder="評価・アセスメント..."
                          className="resize-none h-16 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">P（計画）</label>
                        <Textarea
                          value={soapP}
                          onChange={e => setSoapP(e.target.value)}
                          placeholder="治療計画・次回の方針..."
                          className="resize-none h-16 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">コメント</label>
                        <Textarea
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          placeholder="その他メモ..."
                          className="resize-none h-16 text-sm"
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pb-8">
            <Button variant="outline" onClick={resetForm} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              リセット
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || createTreatment.isPending}
              className="gap-2 px-8"
              size="lg"
            >
              {createTreatment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              記録を保存
            </Button>
          </div>
        </TabsContent>

        {/* 📁 Report Tab Content */}
        <TabsContent value="report" className="space-y-6 outline-none">
          {/* 📅 Date Range Filter Card & Actions */}
          <Card className="shadow-md border border-border/85 bg-gradient-to-br from-card to-background overflow-hidden relative print:hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  集計対象期間の選択と出力
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  任意の期間を指定して、その間の全トリートメント実績の統計と一覧をPDF/CSVで出力します。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={reportTreatmentsLoading || !reportTreatments?.rows?.length}
                  className="text-xs h-8 gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSVで出力
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  disabled={reportTreatmentsLoading || !reportTreatments?.rows?.length}
                  className="text-xs h-8 gap-1.5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 font-semibold"
                >
                  <Printer className="h-3.5 w-3.5" />
                  レポートを印刷
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">開始日</span>
                  <input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-border bg-background hover:border-primary/50 focus:border-primary focus:outline-none text-xs transition-all shadow-sm text-foreground w-40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">終了日</span>
                  <input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-border bg-background hover:border-primary/50 focus:border-primary focus:outline-none text-xs transition-all shadow-sm text-foreground w-40"
                  />
                </div>
                
                <div className="h-8 w-[1px] bg-border mx-1 mt-5 hidden sm:block" />

                <div className="flex flex-wrap gap-1.5 mt-5">
                  <Button variant="ghost" size="sm" onClick={() => handleSetQuickPeriod("7days")} className="text-[10px] h-7 px-2 bg-accent/40">直近7日間</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleSetQuickPeriod("30days")} className="text-[10px] h-7 px-2 bg-accent/40">過去30日間</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleSetQuickPeriod("thisMonth")} className="text-[10px] h-7 px-2 bg-accent/40">今月</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleSetQuickPeriod("lastMonth")} className="text-[10px] h-7 px-2 bg-accent/40">先月</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 🖨️ 印刷専用のレポートヘッダー (画面上は非表示) */}
          <div className="hidden print:block space-y-2 border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-center">トリートメント実績集計レポート</h1>
            <p className="text-xs text-center text-muted-foreground font-mono">
              対象期間: {reportDateFrom} 〜 {reportDateTo} (作成日: {format(new Date(), "yyyy年MM月dd日", { locale: ja })})
            </p>
          </div>

          {reportTreatmentsLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-semibold">レポートデータを集計中...</p>
            </div>
          ) : !reportTreatments || reportTreatments.rows?.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-2xl bg-accent/5">
              <AlertCircle className="h-8 w-8 text-muted-foreground/45 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-semibold">指定された期間にトリートメント記録がありません</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">上の日付範囲を変更してデータを検索してください</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 📊 期間集計 3連カード */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase">期間中総施術数</p>
                      <h3 className="text-2xl font-extrabold font-mono text-foreground">{reportStats.count} <span className="text-xs font-semibold text-muted-foreground">件</span></h3>
                    </div>
                    <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-500 shrink-0">
                      <Activity className="h-4.5 w-4.5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase">期間中総治療時間</p>
                      <h3 className="text-2xl font-extrabold font-mono text-foreground">{reportStats.totalDuration} <span className="text-xs font-semibold text-muted-foreground">分</span></h3>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500 shrink-0">
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">治療を受けた選手</p>
                      <h3 className="text-2xl font-extrabold font-mono text-foreground">{reportStats.uniquePlayers} <span className="text-xs font-semibold text-muted-foreground">人</span></h3>
                    </div>
                    <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 統計視覚化エリア */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2">
                {/* 1. 部位別施術回数 */}
                <Card className="shadow-sm border border-border/70 print:break-inside-avoid">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      部位別の施術頻度 (上位5部位)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[200px] pt-3">
                    {reportStats.partCounts.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportStats.partCounts.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }}
                            width={50}
                          />
                          <Bar dataKey="value" radius={4} barSize={10} fill="rgba(99, 102, 241, 0.85)">
                            {reportStats.partCounts.slice(0, 5).map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={idx === 0 ? "rgba(99, 102, 241, 0.85)" : "rgba(99, 102, 241, 0.6)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">データなし</div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. トレーナー別実績 (予定/実績) */}
                <Card className="shadow-sm border border-border/70 print:break-inside-avoid">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      スタッフ別 治療実績数
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {reportStats.trainerCounts.length > 0 ? (
                      <div className="space-y-2">
                        {reportStats.trainerCounts.map((tc) => (
                          <div key={tc.name} className="flex items-center justify-between p-2 rounded-xl bg-accent/20 border text-xs">
                            <span className="font-bold flex items-center gap-1">
                              <span className="h-2 w-2 bg-indigo-500 rounded-full shrink-0" />
                              {tc.name}
                            </span>
                            <span className="font-bold font-mono text-foreground">{tc.value} 回</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">データなし</div>
                    )}
                  </CardContent>
                </Card>

                {/* 3. 処置方法頻度 (上位) */}
                <Card className="shadow-sm border border-border/70 print:break-inside-avoid">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      処置内容別の頻度
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {reportStats.typeCounts.length > 0 ? (
                      <div className="space-y-1.5">
                        {reportStats.typeCounts.slice(0, 5).map((tc, idx) => (
                          <div key={tc.name} className="flex items-center justify-between text-xs py-1 border-b border-dashed border-border/60">
                            <span className="text-muted-foreground flex items-center gap-2">
                              <span className="h-5 w-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[9px] font-bold">
                                {idx + 1}
                              </span>
                              {tc.name}
                            </span>
                            <span className="font-bold font-mono">{tc.value} 回</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">データなし</div>
                    )}
                  </CardContent>
                </Card>

                {/* 4. スケジュール割り当て（予定数合計） */}
                <Card className="shadow-sm border border-border/70 print:break-inside-avoid">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      スタッフ別 スケジュール割当数（予定数）
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {reportScheduleStats.length > 0 ? (
                      <div className="space-y-2">
                        {reportScheduleStats.map((sc) => (
                          <div key={sc.name} className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs">
                            <span className="font-bold flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                              <span className="h-2 w-2 bg-indigo-400 rounded-full shrink-0" />
                              {sc.name}
                            </span>
                            <span className="font-bold font-mono text-indigo-700 dark:text-indigo-300">{sc.value} 名分</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">データなし (この期間の予定はありません)</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 📋 詳細治療記録一覧テーブル */}
              <Card className="shadow-md border border-border/80 overflow-hidden print:border-0 print:shadow-none print:mt-8">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-muted/15 print:bg-transparent print:pb-1">
                  <div>
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-indigo-500 print:hidden" />
                      期間内の詳細治療記録一覧
                    </CardTitle>
                  </div>
                  <span className="text-[10px] font-bold font-mono text-muted-foreground tracking-tight bg-background border px-2 py-0.5 rounded-lg shrink-0 print:hidden">
                    {reportTreatments.rows.length} 件取得
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto custom-scrollbar print:overflow-x-visible">
                    <table className="w-full text-xs text-left border-collapse min-w-[850px] print:min-w-0">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold">
                          <th className="py-2.5 px-3 w-28 shrink-0">日時</th>
                          <th className="py-2.5 px-2 w-20 text-center">選手</th>
                          <th className="py-2.5 px-2 w-24">担当スタッフ</th>
                          <th className="py-2.5 px-3 w-36">部位</th>
                          <th className="py-2.5 px-3">処置内容およびメモ</th>
                          <th className="py-2.5 px-3 w-16 text-center print:hidden">詳細</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportTreatments.rows.map(record => {
                          let txText = "";
                          if (record.treatmentDetails && typeof record.treatmentDetails === "object") {
                            txText = Object.entries(record.treatmentDetails as Record<string, { treatmentTypes: string[] }>)
                              .map(([bp, d]) => `${getBodyPartLabel(bp)}: ${d.treatmentTypes.map(t => getTreatmentTypeLabel(t)).join("+")}`)
                              .join("; ");
                          } else if (record.treatmentTypes && Array.isArray(record.treatmentTypes)) {
                            txText = (record.treatmentTypes as string[]).map(t => getTreatmentTypeLabel(t)).join("; ");
                          }

                          return (
                            <tr key={record.id} className="border-b hover:bg-muted/5 transition-all align-top print:break-inside-avoid">
                              <td className="py-2.5 px-3 font-mono font-bold text-muted-foreground whitespace-nowrap">
                                {format(new Date(record.treatmentDate), "yy/MM/dd HH:mm", { locale: ja })}
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                <span className="font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] tracking-tight">
                                  #{getPlayerNumber(record.playerId)}
                                </span>
                                <span className="block font-semibold text-[10.5px] mt-0.5">{getPlayerName(record.playerId)}</span>
                              </td>
                              <td className="py-2.5 px-2 font-semibold text-foreground whitespace-nowrap">
                                {(record as any).createdByName ?? "不明"}
                              </td>
                              <td className="py-2.5 px-3 flex flex-wrap gap-1 w-36">
                                {record.bodyParts && (record.bodyParts as string[]).map((bp: string) => (
                                  <Badge key={bp} variant="secondary" className="text-[9px] px-1 py-0 border font-normal shrink-0">
                                    {getBodyPartLabel(bp)}
                                  </Badge>
                                ))}
                              </td>
                              <td className="py-2.5 px-3 space-y-1">
                                <p className="font-semibold text-foreground leading-relaxed text-[11px]">{txText}</p>
                                {(record.comment || record.soapS || record.soapO || record.soapA || record.soapP) && (
                                  <div className="text-[10px] text-muted-foreground bg-accent/15 border rounded-lg p-1.5 space-y-1 leading-relaxed">
                                    {record.comment && <p><span className="font-bold text-foreground">メモ:</span> {record.comment}</p>}
                                    {record.soapS && <p><span className="font-bold font-mono text-[9px] text-foreground bg-muted px-1 rounded-sm mr-1">S</span>{record.soapS}</p>}
                                    {record.soapO && <p><span className="font-bold font-mono text-[9px] text-foreground bg-muted px-1 rounded-sm mr-1">O</span>{record.soapO}</p>}
                                    {record.soapA && <p><span className="font-bold font-mono text-[9px] text-foreground bg-muted px-1 rounded-sm mr-1">A</span>{record.soapA}</p>}
                                    {record.soapP && <p><span className="font-bold font-mono text-[9px] text-foreground bg-muted px-1 rounded-sm mr-1">P</span>{record.soapP}</p>}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center print:hidden">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setSummaryPlayerId(record.playerId);
                                      setIsSummaryOpen(true);
                                    }}
                                    title="経過サマリーを表示"
                                  >
                                    <TrendingUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => setDetailId(record.id)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Annotation Dialog */}
      <Dialog open={annotatingPart !== null} onOpenChange={(open) => { if (!open) setAnnotatingPart(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              {annotatingPart ? getBodyPartLabel(annotatingPart) : ""} — マーカー描画
            </DialogTitle>
          </DialogHeader>
          {annotatingPart && (
            <AnnotationCanvas
              bodyPartKey={annotatingPart}
              bodyPartLabel={getBodyPartLabel(annotatingPart)}
              initialData={annotations[annotatingPart]}
              onSave={handleAnnotationSave}
              onCancel={() => setAnnotatingPart(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailId !== null} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="flex flex-row items-center justify-between pr-8 border-b pb-2">
            <DialogTitle className="text-base font-bold">
              {isEditing ? "📝 治療記録を修正" : "📋 記録詳細"}
            </DialogTitle>
            {detailData && !detailLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 gap-1 text-xs shrink-0"
              >
                {isEditing ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    キャンセル
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" />
                    編集する
                  </>
                )}
              </Button>
            )}
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : detailError ? (
            <div className="py-8 text-center text-sm text-destructive">
              記録の読み込みに失敗しました
            </div>
          ) : detailData ? (
            isEditing ? (
              /* 📝 Edit Mode Form View */
              <div className="space-y-4 py-1.5 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b pb-2.5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">選手</p>
                    <p className="text-sm font-semibold">#{getPlayerNumber(detailData.playerId)} {getPlayerName(detailData.playerId)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">日時</label>
                    <input
                      type="datetime-local"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Timing */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">タイミング</label>
                    <select
                      value={editTiming}
                      onChange={(e) => {
                        const newTiming = e.target.value;
                        setEditTiming(newTiming);
                        const defaultTime = TIMING_DEFAULT_HOURS[newTiming];
                        if (defaultTime && editDate) {
                          const datePart = editDate.split("T")[0];
                          setEditDate(`${datePart}T${defaultTime}`);
                        }
                      }}
                      className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground"
                    >
                      {TIMING_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">処置時間 (分)</label>
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value, 10) || 15)}
                      className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground font-mono"
                      min="1"
                      max="300"
                    />
                  </div>

                  {/* Severity */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">重症度</label>
                    <select
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value)}
                      className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-ring w-full text-foreground"
                    >
                      <option value="normal">🟢 通常</option>
                      <option value="caution">🔵 要注意</option>
                      <option value="limited">🟡 要制限</option>
                      <option value="out">🔴 離脱</option>
                    </select>
                  </div>
                </div>

                {/* SOAP Form */}
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">SOAP記録</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">S (主観的情報)</label>
                      <Textarea
                        value={editSoapS}
                        onChange={e => setEditSoapS(e.target.value)}
                        placeholder="痛みや違和感の主観..."
                        className="resize-none h-14 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">O (客観的情報)</label>
                      <Textarea
                        value={editSoapO}
                        onChange={e => setEditSoapO(e.target.value)}
                        placeholder="圧痛、可動域、テスト結果など..."
                        className="resize-none h-14 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">A (評価)</label>
                      <Textarea
                        value={editSoapA}
                        onChange={e => setEditSoapA(e.target.value)}
                        placeholder="状態評価・アセスメント..."
                        className="resize-none h-14 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">P (計画)</label>
                      <Textarea
                        value={editSoapP}
                        onChange={e => setEditSoapP(e.target.value)}
                        placeholder="治療計画・次回方針..."
                        className="resize-none h-14 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-1 border-t pt-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">その他メモ（コメント）</label>
                  <Textarea
                    value={editComment}
                    onChange={e => setEditComment(e.target.value)}
                    placeholder="その他特記事項..."
                    className="resize-none h-14 text-xs rounded-xl"
                  />
                </div>

                {/* 部位と施術内容の編集 */}
                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">部位と施術内容</p>
                  
                  {/* Body Map in Dialog */}
                  <div className="p-3 border rounded-xl bg-accent/5">
                    <BodyMap selectedParts={editBodyParts} onTogglePart={handleEditToggleBodyPart} />
                  </div>

                  {/* Per Body Part Details Form */}
                  <div className="space-y-3">
                    {editBodyParts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-xl">
                        部位を選択してください
                      </p>
                    ) : (
                      editBodyParts.map(partKey => {
                        const details = editTreatmentDetails[partKey] || { treatmentTypes: [], duration: 15 };
                        return (
                          <div key={partKey} className="p-3 border rounded-xl bg-card space-y-2.5 relative">
                            <div className="flex items-center justify-between border-b pb-1.5">
                              <select
                                value={partKey}
                                onChange={(e) => handleReplaceEditBodyPart(partKey, e.target.value)}
                                className="font-bold text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                              >
                                {BODY_PARTS.map(part => (
                                  <option key={part.key} value={part.key}>
                                    {part.label}
                                  </option>
                                ))}
                              </select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleEditToggleBodyPart(partKey)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Treatment Types for this Part */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-muted-foreground uppercase">処置内容</label>
                              <div className="flex flex-wrap gap-1">
                                {TREATMENT_TYPES.map(type => {
                                  const isChecked = details.treatmentTypes.includes(type.key);
                                  return (
                                    <button
                                      key={type.key}
                                      onClick={() => {
                                        setEditTreatmentDetails(prev => {
                                          const next = { ...prev };
                                          const currentTypes = next[partKey]?.treatmentTypes || [];
                                          const newTypes = currentTypes.includes(type.key)
                                            ? currentTypes.filter(t => t !== type.key)
                                            : [...currentTypes, type.key];
                                          next[partKey] = {
                                            ...next[partKey],
                                            treatmentTypes: newTypes,
                                            duration: next[partKey]?.duration || 15,
                                          };
                                          return next;
                                        });
                                      }}
                                      className={cn(
                                        "px-2 py-1 rounded-lg border text-[10px] transition-all",
                                        isChecked
                                          ? "border-primary bg-primary/5 text-primary"
                                          : "border-border text-muted-foreground hover:bg-accent"
                                      )}
                                    >
                                      {type.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Duration for this Part */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-muted-foreground uppercase block">処置時間 (分)</label>
                              <input
                                type="number"
                                value={details.duration}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 15;
                                  setEditTreatmentDetails(prev => ({
                                    ...prev,
                                    [partKey]: {
                                      ...prev[partKey],
                                      duration: val,
                                    }
                                  }));
                                }}
                                className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs focus:ring-2 focus:ring-ring w-24 text-foreground font-mono"
                                min="1"
                                max="180"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="text-xs h-8 rounded-xl"
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const allTreatmentTypes = Array.from(
                        new Set(Object.values(editTreatmentDetails).flatMap(d => d.treatmentTypes))
                      );
                      const totalDuration = Object.values(editTreatmentDetails).reduce(
                        (sum, d) => sum + d.duration,
                        0
                      );
                      updateTreatment.mutate({
                        id: detailData.id,
                        timing: editTiming,
                        duration: totalDuration || editDuration,
                        severity: editSeverity,
                        soapS: editSoapS || null,
                        soapO: editSoapO || null,
                        soapA: editSoapA || null,
                        soapP: editSoapP || null,
                        comment: editComment || null,
                        treatmentDate: editDate ? new Date(editDate) : undefined,
                        bodyParts: editBodyParts,
                        treatmentTypes: allTreatmentTypes,
                        treatmentDetails: editTreatmentDetails,
                      });
                    }}
                    disabled={updateTreatment.isPending}
                    className="text-xs h-8 px-5 rounded-xl"
                  >
                    {updateTreatment.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    変更を保存する
                  </Button>
                </div>
              </div>
            ) : (
              /* 📋 High-Fidelity Static View Mode */
              <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">選手</p>
                    <p className="text-sm font-medium">#{getPlayerNumber(detailData.playerId)} {getPlayerName(detailData.playerId)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">日時</p>
                    <p className="text-sm">{format(new Date(detailData.treatmentDate), "yyyy/MM/dd HH:mm", { locale: ja })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">タイミング</p>
                    <p className="text-sm">{getTimingLabel(detailData.timing)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">処置時間</p>
                    <p className="text-sm">{detailData.duration}分</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">重症度</p>
                    <p className="text-sm">
                      {detailData.severity === "out" ? "🔴 離脱"
                        : detailData.severity === "limited" ? "🟡 要制限"
                        : detailData.severity === "caution" ? "🔵 要注意"
                        : "🟢 通常"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">記録者</p>
                    <p className="text-sm font-medium">{(detailData as any).createdByName ?? "不明"}</p>
                  </div>
                </div>

                {detailData.treatmentDetails && typeof detailData.treatmentDetails === "object" ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground border-b pb-1">部位別施術内容</p>
                    <div className="space-y-2">
                      {Object.entries(detailData.treatmentDetails as Record<string, { treatmentTypes: string[]; duration: number }>).map(([partKey, details]) => (
                        <div key={partKey} className="p-3 rounded-xl border border-border bg-accent/10 flex items-start justify-between gap-4">
                          <div className="space-y-1.5">
                            <span className="font-semibold text-xs text-foreground block">
                              {getBodyPartLabel(partKey)}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {details.treatmentTypes.map(tt => (
                                <Badge key={tt} className="text-[11px] bg-primary/10 text-primary border-0 px-2 py-0.5">
                                  {getTreatmentTypeLabel(tt)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">{details.duration}分</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Fallback for older data
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">部位</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(detailData.bodyParts as string[]).map(bp => (
                          <Badge key={bp} variant="outline" className="text-xs">{getBodyPartLabel(bp)}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">処置内容</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(detailData.treatmentTypes as string[]).map(tt => (
                          <Badge key={tt} className="text-xs bg-primary/10 text-primary border-0">{getTreatmentTypeLabel(tt)}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* SOAP */}
                {(detailData.soapS || detailData.soapO || detailData.soapA || detailData.soapP) && (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">SOAP記録</p>
                    {detailData.soapS && (
                      <div>
                        <p className="text-xs text-muted-foreground">S（主観的情報）</p>
                        <p className="text-sm mt-0.5">{detailData.soapS}</p>
                      </div>
                    )}
                    {detailData.soapO && (
                      <div>
                        <p className="text-xs text-muted-foreground">O（客観的情報）</p>
                        <p className="text-sm mt-0.5">{detailData.soapO}</p>
                      </div>
                    )}
                    {detailData.soapA && (
                      <div>
                        <p className="text-xs text-muted-foreground">A（評価）</p>
                        <p className="text-sm mt-0.5">{detailData.soapA}</p>
                      </div>
                    )}
                    {detailData.soapP && (
                      <div>
                        <p className="text-xs text-muted-foreground">P（計画）</p>
                        <p className="text-sm mt-0.5">{detailData.soapP}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailData.comment && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-1">コメント</p>
                    <p className="text-sm">{detailData.comment}</p>
                  </div>
                )}

                {/* Annotations */}
                {detailData.annotations && Object.keys(detailData.annotations as Record<string, AnnotationData>).length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Pencil className="h-3 w-3" />
                      マーカー描画
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(detailData.annotations as Record<string, AnnotationData>).map(([partKey, annotData]) => (
                        <div key={partKey} className="space-y-1">
                          <p className="text-xs text-muted-foreground text-center">{getBodyPartLabel(partKey)}</p>
                          <AnnotationViewer
                            bodyPartKey={partKey}
                            data={annotData}
                            size={180}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 📢 アップデート履歴ダイアログ */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-3 shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              機能アップデート履歴
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar py-4 space-y-6">
            {UPDATE_HISTORY.map((item) => (
              <div key={item.id} className="relative pl-6 border-l-2 border-primary/20 last:border-l-transparent pb-1">
                {/* Timeline Dot */}
                <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background shrink-0" />
                
                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="font-mono text-muted-foreground">{item.date}</span>
                  <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 border-primary/25 text-primary bg-primary/5">
                    {item.version}
                  </Badge>
                  {item.isImportant && (
                    <Badge className="bg-sky-500 hover:bg-sky-500 text-white text-[9px] font-bold px-1.5 py-0">
                      注目
                    </Badge>
                  )}
                </div>

                <h3 className="text-xs font-bold text-foreground mt-2">
                  {item.title}
                </h3>

                <ul className="mt-2 space-y-1.5 pl-4 list-disc text-[11px] text-muted-foreground leading-relaxed">
                  {item.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <DialogFooter className="border-t pt-3 shrink-0">
            <Button size="sm" onClick={() => setIsUpdateDialogOpen(false)} className="rounded-xl text-xs h-8">
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
