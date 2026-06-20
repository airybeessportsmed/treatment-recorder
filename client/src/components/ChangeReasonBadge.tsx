import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ChangeReason = "condition" | "injury" | "technique" | "plan" | "other";

export const CHANGE_REASON_CONFIG: Record<
  ChangeReason,
  { label: string; shortLabel: string; color: string; dotColor: string }
> = {
  condition: {
    label: "コンディション",
    shortLabel: "体調",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    dotColor: "bg-yellow-400",
  },
  injury: {
    label: "怪我・痛み",
    shortLabel: "怪我",
    color: "bg-red-100 text-red-800 border-red-300",
    dotColor: "bg-red-500",
  },
  technique: {
    label: "技術調整",
    shortLabel: "技術",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    dotColor: "bg-blue-500",
  },
  plan: {
    label: "計画変更",
    shortLabel: "計画",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    dotColor: "bg-purple-500",
  },
  other: {
    label: "その他",
    shortLabel: "他",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    dotColor: "bg-gray-400",
  },
};

type Props = {
  reason: ChangeReason;
  note?: string | null;
  /** compact=true のときはドット＋短縮ラベルで表示（ホバーで詳細） */
  compact?: boolean;
};

export function ChangeReasonBadge({ reason, note, compact = false }: Props) {
  const cfg = CHANGE_REASON_CONFIG[reason];
  if (!cfg) return null;

  const badge = (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs font-medium cursor-default ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotColor}`} />
      {compact ? cfg.shortLabel : cfg.label}
    </span>
  );

  const tooltipContent = note ? `${cfg.label}：${note}` : cfg.label;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** 変更理由選択ボタングループ（フォーム用） */
type SelectorProps = {
  value: ChangeReason | null;
  onChange: (v: ChangeReason | null) => void;
};

export function ChangeReasonSelector({ value, onChange }: SelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(CHANGE_REASON_CONFIG) as ChangeReason[]).map(key => {
        const cfg = CHANGE_REASON_CONFIG[key];
        const isSelected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(isSelected ? null : key)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
              isSelected
                ? `${cfg.color} ring-2 ring-offset-1 ring-current shadow-sm`
                : "bg-background border-border text-muted-foreground hover:border-current hover:text-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSelected ? cfg.dotColor : "bg-muted-foreground/50"}`} />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
