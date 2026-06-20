import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";

export const SECTION_CATEGORIES = [
  "Preparation",
  "Core",
  "Power",
  "Lower Body",
  "Upper Body",
  "Specific",
];

const SECTION_COLORS: Record<string, string> = {
  Preparation: "bg-blue-50 text-blue-700 border-blue-200",
  Core: "bg-green-50 text-green-700 border-green-200",
  Power: "bg-orange-50 text-orange-700 border-orange-200",
  "Lower Body": "bg-purple-50 text-purple-700 border-purple-200",
  "Upper Body": "bg-red-50 text-red-700 border-red-200",
  Specific: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export type ExerciseRow = {
  id?: number;
  /** ドラッグ用の一意キー（内部管理用）。外部から渡す場合は省略可能、ensureKeysで自動付与 */
  _key?: string;
  name: string;
  sets: string;
  reps: string;
  load: string;
  attention: string;
};

export type SectionRow = {
  id?: number;
  category: string;
  exercises: ExerciseRow[];
  collapsed: boolean;
};

export type ProgramFormData = {
  athleteId: string;
  date: string;
  phase: string;
  periodCategory: string;
  goal: string;
  bodyWeight: string;
  totalSets: string;
  sections: SectionRow[];
};

let _keyCounter = 0;
const newKey = () => `ex-${++_keyCounter}-${Date.now()}`;

const emptyExercise = (): ExerciseRow => ({
  _key: newKey(),
  name: "",
  sets: "",
  reps: "",
  load: "",
  attention: "",
});

const defaultSections = (): SectionRow[] =>
  SECTION_CATEGORIES.map(cat => ({
    category: cat,
    exercises: [emptyExercise()],
    collapsed: false,
  }));

// initialData から来た exercises には _key が無い場合があるので付与する
function ensureKeys(sections: SectionRow[]): SectionRow[] {
  return sections.map(s => ({
    ...s,
    exercises: s.exercises.map(e => ({
      ...e,
      _key: e._key ?? newKey(),
    })),
  }));
}

// =====================
// ExerciseNameInput: コンボボックス（テキスト + ドロップダウン候補）
// =====================
type MasterItem = {
  id: number;
  name: string;
  category: string;
  defaultSets: number | null;
  defaultReps: string | null;
  defaultLoad: string | null;
  attention: string | null;
  usageCount: number;
};

type ExerciseNameInputProps = {
  value: string;
  category: string;
  masterList: MasterItem[];
  onChange: (value: string) => void;
  onSelectMaster: (item: MasterItem) => void;
};

function ExerciseNameInput({ value, category, masterList, onChange, onSelectMaster }: ExerciseNameInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 親の value が変わったら同期
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // カテゴリーでフィルタリング後、クエリで絞り込み
  const filtered = masterList.filter(
    item =>
      item.category === category &&
      (query.trim() === "" || item.name.toLowerCase().includes(query.toLowerCase()))
  );

  const handleInput = (v: string) => {
    setQuery(v);
    onChange(v);
    setOpen(true);
  };

  const handleSelect = (item: MasterItem) => {
    setQuery(item.name);
    onChange(item.name);
    onSelectMaster(item);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center">
        <Input
          placeholder="種目名"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          className="h-8 text-sm pr-7"
        />
        <button
          type="button"
          className="absolute right-1.5 text-muted-foreground hover:text-foreground"
          onMouseDown={e => {
            e.preventDefault();
            setOpen(o => !o);
          }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={e => {
                e.preventDefault();
                handleSelect(item);
              }}
            >
              <span className="truncate font-medium">{item.name}</span>
            </button>
          ))}
          {query.trim() !== "" && !filtered.find(i => i.name === query.trim()) && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-t">
              「{query}」を新規入力
            </div>
          )}
        </div>
      )}

      {open && filtered.length === 0 && query.trim() !== "" && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-popover border border-border rounded-md shadow-lg">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            候補なし — 「{query}」を新規入力
          </div>
        </div>
      )}
    </div>
  );
}

// =====================
// SortableExerciseRow: ドラッグ可能な種目行
// =====================
type SortableExerciseRowProps = {
  exercise: ExerciseRow;
  si: number;
  ei: number;
  category: string;
  masterList: MasterItem[];
  onUpdate: (field: keyof ExerciseRow, value: string) => void;
  onApplyMaster: (item: MasterItem) => void;
  onRemove: () => void;
};

function SortableExerciseRow({
  exercise,
  si,
  ei,
  category,
  masterList,
  onUpdate,
  onApplyMaster,
  onRemove,
}: SortableExerciseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise._key ?? "" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-12 gap-1 items-center ${isDragging ? "bg-accent/30 rounded" : ""}`}
    >
      {/* ドラッグハンドル */}
      <div className="col-span-1 flex justify-center">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
          aria-label="ドラッグして並べ替え"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="col-span-3">
        <ExerciseNameInput
          value={exercise.name}
          category={category}
          masterList={masterList}
          onChange={v => onUpdate("name", v)}
          onSelectMaster={onApplyMaster}
        />
      </div>
      <div className="col-span-1">
        <Input
          placeholder="1"
          value={exercise.sets}
          onChange={e => onUpdate("sets", e.target.value)}
          className="h-8 text-sm text-center"
        />
      </div>
      <div className="col-span-2">
        <Input
          placeholder="8回"
          value={exercise.reps}
          onChange={e => onUpdate("reps", e.target.value)}
          className="h-8 text-sm text-center"
        />
      </div>
      <div className="col-span-2">
        <Input
          placeholder="40kg"
          value={exercise.load}
          onChange={e => onUpdate("load", e.target.value)}
          className="h-8 text-sm text-center"
        />
      </div>
      <div className="col-span-2">
        <Input
          placeholder="メモ"
          value={exercise.attention}
          onChange={e => onUpdate("attention", e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="col-span-1 flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// =====================
// Main ProgramForm
// =====================
type Props = {
  initialData?: ProgramFormData;
  onSubmit: (data: ProgramFormData) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export default function ProgramForm({ initialData, onSubmit, isSubmitting, submitLabel = "保存" }: Props) {
  const { data: athletes } = trpc.athletes.list.useQuery();
  const { data: masterGrouped } = trpc.exerciseMaster.grouped.useQuery();

  // 全カテゴリーのマスター一覧をフラット配列に変換
  const masterList: MasterItem[] = masterGrouped
    ? (Object.values(masterGrouped as Record<string, MasterItem[]>).flat() as MasterItem[])
    : [];

  const [form, setForm] = useState<ProgramFormData>(() => {
    const base = initialData ?? {
      athleteId: "",
      date: new Date().toISOString().slice(0, 10),
      phase: "",
      periodCategory: "",
      goal: "",
      bodyWeight: "",
      totalSets: "",
      sections: defaultSections(),
    };
    return { ...base, sections: ensureKeys(base.sections) };
  });

  useEffect(() => {
    if (initialData) {
      setForm({ ...initialData, sections: ensureKeys(initialData.sections) });
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateField = (field: keyof ProgramFormData, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const toggleSection = (si: number) =>
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, i) => (i === si ? { ...s, collapsed: !s.collapsed } : s)),
    }));

  const addExercise = (si: number) =>
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === si ? { ...s, exercises: [...s.exercises, emptyExercise()] } : s
      ),
    }));

  const removeExercise = (si: number, ei: number) =>
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === si ? { ...s, exercises: s.exercises.filter((_, j) => j !== ei) } : s
      ),
    }));

  const updateExercise = (si: number, ei: number, field: keyof ExerciseRow, value: string) =>
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === si
          ? {
              ...s,
              exercises: s.exercises.map((e, j) =>
                j === ei ? { ...e, [field]: value } : e
              ),
            }
          : s
      ),
    }));

  // マスターから種目を選択したとき、デフォルト値を自動入力
  const applyMaster = (si: number, ei: number, item: MasterItem) => {
    setForm(f => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === si
          ? {
              ...s,
              exercises: s.exercises.map((e, j) =>
                j === ei
                  ? {
                      ...e,
                      name: item.name,
                      sets: item.defaultSets ? String(item.defaultSets) : e.sets,
                      reps: item.defaultReps ?? e.reps,
                      load: item.defaultLoad ?? e.load,
                      attention: item.attention ?? e.attention,
                    }
                  : e
              ),
            }
          : s
      ),
    }));
  };

  // ドラッグ終了時に並べ替えを反映
  const handleDragEnd = (si: number, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setForm(f => ({
      ...f,
      sections: f.sections.map((s, i) => {
        if (i !== si) return s;
        const oldIndex = s.exercises.findIndex(e => (e._key ?? "") === active.id);
        const newIndex = s.exercises.findIndex(e => (e._key ?? "") === over.id);
        if (oldIndex === -1 || newIndex === -1) return s;
        return { ...s, exercises: arrayMove(s.exercises, oldIndex, newIndex) };
      }),
    }));
  };

  const addSection = (category: string) => {
    if (form.sections.find(s => s.category === category)) return;
    setForm(f => ({
      ...f,
      sections: [
        ...f.sections,
        { category, exercises: [emptyExercise()], collapsed: false },
      ],
    }));
  };

  const removeSection = (si: number) =>
    setForm(f => ({ ...f, sections: f.sections.filter((_, i) => i !== si) }));

  const handleSubmit = () => onSubmit(form);

  const availableCategories = SECTION_CATEGORIES.filter(
    c => !form.sections.find(s => s.category === c)
  );

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1 space-y-1.5">
              <Label>選手 *</Label>
              <Select value={form.athleteId} onValueChange={v => updateField("athleteId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="選手を選択" />
                </SelectTrigger>
                <SelectContent>
                  {athletes?.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      #{a.number} {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>日付 *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => updateField("date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>体重 (kg)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="85.0"
                value={form.bodyWeight}
                onChange={e => updateField("bodyWeight", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>期分け</Label>
              <Input
                placeholder="専門的準備期"
                value={form.periodCategory}
                onChange={e => updateField("periodCategory", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>PHASE</Label>
              <Input
                placeholder="PHASE 1"
                value={form.phase}
                onChange={e => updateField("phase", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>TOTAL sets</Label>
              <Input
                type="number"
                placeholder="23"
                value={form.totalSets}
                onChange={e => updateField("totalSets", e.target.value)}
              />
            </div>
            <div className="col-span-2 md:col-span-3 space-y-1.5">
              <Label>目的</Label>
              <Input
                placeholder="パワー発揮の向上、特異的動作の強化"
                value={form.goal}
                onChange={e => updateField("goal", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {form.sections.map((section, si) => (
        <Card key={section.category} className="border shadow-sm">
          <CardHeader className="pb-0 pt-3 px-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-2"
                onClick={() => toggleSection(si)}
              >
                <Badge
                  variant="outline"
                  className={`${SECTION_COLORS[section.category] ?? "bg-gray-50 text-gray-700"} font-semibold`}
                >
                  {section.category}
                </Badge>
                <span className="text-xs text-muted-foreground">{section.exercises.length}種目</span>
                {section.collapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeSection(si)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>

          {!section.collapsed && (
            <CardContent className="px-4 pb-4 pt-3">
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium px-1">
                  <div className="col-span-1"></div>
                  <div className="col-span-3">種目名</div>
                  <div className="col-span-1 text-center">SET</div>
                  <div className="col-span-2 text-center">回数</div>
                  <div className="col-span-2 text-center">負荷</div>
                  <div className="col-span-2">Attention</div>
                  <div className="col-span-1"></div>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(si, event)}
                >
                  <SortableContext
                    items={section.exercises.map(e => e._key ?? "")}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {section.exercises.map((ex, ei) => (
                        <SortableExerciseRow
                          key={ex._key}
                          exercise={ex}
                          si={si}
                          ei={ei}
                          category={section.category}
                          masterList={masterList}
                          onUpdate={(field, value) => updateExercise(si, ei, field, value)}
                          onApplyMaster={item => applyMaster(si, ei, item)}
                          onRemove={() => removeExercise(si, ei)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full border border-dashed h-8 text-muted-foreground hover:text-foreground"
                  onClick={() => addExercise(si)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> 種目を追加
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Add Section */}
      {availableCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">セクションを追加:</span>
          {availableCategories.map(cat => (
            <Button
              key={cat}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => addSection(cat)}
            >
              <Plus className="h-3 w-3 mr-1" /> {cat}
            </Button>
          ))}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : submitLabel}
      </Button>
    </div>
  );
}
