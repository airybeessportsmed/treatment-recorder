import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Undo2, Trash2, Minus, Plus, Check } from "lucide-react";
import { getAnatomyData, getAvailableViews, VIEW_LABELS } from "@/../../shared/anatomyData";

export interface Stroke {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

export interface AnnotationData {
  view: string;
  strokes: Stroke[];
}

interface AnnotationCanvasProps {
  bodyPartKey: string;
  bodyPartLabel: string;
  initialData?: AnnotationData;
  onSave: (data: AnnotationData) => void;
  onCancel: () => void;
}

// Color options for markers
const COLORS = [
  { key: "red", value: "#ef4444", label: "赤" },
  { key: "yellow", value: "#eab308", label: "黄" },
  { key: "green", value: "#22c55e", label: "緑" },
  { key: "blue", value: "#3b82f6", label: "青" },
  { key: "purple", value: "#a855f7", label: "紫" },
];

const ANATOMY_IMAGE_MAP: Record<string, string> = {
  // 骨盤・臀部・腰
  pelvis: "/assets/anatomy/anatomy_pelvis.png",
  hip: "/assets/anatomy/anatomy_pelvis.png",
  left_hip_joint: "/assets/anatomy/anatomy_pelvis.png",
  right_hip_joint: "/assets/anatomy/anatomy_pelvis.png",
  lower_back: "/assets/anatomy/anatomy_pelvis.png",
  
  // 肩
  left_shoulder: "/assets/anatomy/anatomy_shoulder.png",
  right_shoulder: "/assets/anatomy/anatomy_shoulder.png",
  
  // 肘
  left_elbow: "/assets/anatomy/anatomy_elbow.png",
  right_elbow: "/assets/anatomy/anatomy_elbow.png",
  
  // 膝
  left_knee: "/assets/anatomy/anatomy_knee.png",
  right_knee: "/assets/anatomy/anatomy_knee.png",
  
  // 足首
  left_ankle: "/assets/anatomy/anatomy_ankle.png",
  right_ankle: "/assets/anatomy/anatomy_ankle.png",
};

const DEFAULT_PEN_SIZE = 4;

export default function AnnotationCanvas({
  bodyPartKey,
  bodyPartLabel,
  initialData,
  onSave,
  onCancel,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [strokes, setStrokes] = useState<Stroke[]>(initialData?.strokes || []);
  const [currentColor, setCurrentColor] = useState(COLORS[0].value);
  const [penSize, setPenSize] = useState(DEFAULT_PEN_SIZE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentView, setCurrentView] = useState(initialData?.view || "front");
  
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);

  // Get available views for this body part
  const availableViews = getAvailableViews(bodyPartKey);
  const svgData = getAnatomyData(bodyPartKey, currentView);

  // 指定部位と表示角度（ビュー）の組み合わせに応じた精密なアセット画像マッピング
  let bgImageUrl: string | null = null;
  
  if (bodyPartKey.includes("shoulder") && currentView === "front") {
    bgImageUrl = "/assets/anatomy/anatomy_shoulder.png";
  } else if (bodyPartKey.includes("elbow") && currentView === "front") {
    bgImageUrl = "/assets/anatomy/anatomy_elbow.png";
  } else if (bodyPartKey.includes("knee") && currentView === "front") {
    bgImageUrl = "/assets/anatomy/anatomy_knee.png";
  } else if (bodyPartKey.includes("ankle") && currentView === "lateral") {
    bgImageUrl = "/assets/anatomy/anatomy_ankle.png";
  } else if ((bodyPartKey === "pelvis" || bodyPartKey === "hip" || bodyPartKey === "lower_back") && currentView === "back") {
    bgImageUrl = "/assets/anatomy/anatomy_pelvis.png";
  }
  
  // 上記の専用アセット条件に当てはまらない場合（足首の前面/背面、膝の背面、股関節の前面/背面などすべて）は、
  // 自動的に全身の前面全体図（anatomy_front_body.png）または後面全体図（anatomy_back_body.png）を適用！
  if (!bgImageUrl) {
    bgImageUrl = currentView === "back" 
      ? "/assets/anatomy/anatomy_back_body.png" 
      : "/assets/anatomy/anatomy_front_body.png";
  }
  
  const isRightSide = bodyPartKey.startsWith("right_");

  // Initialize canvas when view changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw strokes
    strokes.forEach(stroke => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.7;

      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }, [strokes, currentView]);

  const getCanvasPoint = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    setIsDrawing(true);
    currentStrokeRef.current = [point];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.7;
    ctx.moveTo(point.x, point.y);
  }, [getCanvasPoint, currentColor, penSize]);

  const handlePointerMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    currentStrokeRef.current.push(point);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }, [isDrawing, getCanvasPoint]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 1) {
      setStrokes(prev => [
        ...prev,
        { points: [...currentStrokeRef.current], color: currentColor, width: penSize },
      ]);
    }
    currentStrokeRef.current = [];
  }, [isDrawing, currentColor, penSize]);

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
  };

  const handleSave = () => {
    onSave({
      view: currentView,
      strokes,
    });
  };

  if (!svgData) {
    return (
      <div className="flex flex-col gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-700">このボディパーツのデータが利用できません</p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{bodyPartLabel} — マーカー描画</h3>
        <span className="text-xs text-muted-foreground">タッチまたはペンで描画</span>
      </div>

      {/* View selector */}
      {availableViews.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">表示角度:</span>
          {availableViews.map(view => (
            <Button
              key={view}
              variant={currentView === view ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentView(view)}
              className="text-xs"
            >
              {VIEW_LABELS[view] || view}
            </Button>
          ))}
        </div>
      )}

      {/* Canvas area with SVG background */}
      <div
        ref={containerRef}
        className="relative w-full bg-[#f8fafc] rounded-lg border overflow-hidden"
        style={{ aspectRatio: "1/1", maxHeight: "400px" }}
      >
        {/* フルカラー解剖図背景画像 */}
        {bgImageUrl && (
          <img
            src={bgImageUrl}
            alt={`${bodyPartLabel} background`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            style={{
              opacity: 0.7, // マーカーが描き込みやすい絶妙な透過度に設定
              transform: isRightSide ? "scaleX(-1)" : "none",
            }}
          />
        )}

        {/* SVG anatomical background */}
        <svg
          viewBox={svgData.viewBox}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.95 }}
        >
          {svgData.paths.map((p, i) => (
            <g key={i}>
              <path
                d={p.d}
                fill={bgImageUrl ? (p.landmark ? p.fill : "none") : p.fill}
                stroke={p.stroke}
                strokeWidth={p.strokeWidth || "2"}
                opacity={p.landmark ? "0.9" : (bgImageUrl ? "0.15" : "0.4")}
              />
              {p.label && (
                <>
                  {/* 白い縁取り用のテキスト背景 */}
                  <text
                    x={getPathCenter(p.d).x}
                    y={getPathCenter(p.d).y}
                    fontSize={p.landmark ? "10" : "9"}
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none font-bold"
                  >
                    {p.label}
                  </text>
                  {/* 通常のテキスト前面 */}
                  <text
                    x={getPathCenter(p.d).x}
                    y={getPathCenter(p.d).y}
                    fontSize={p.landmark ? "10" : "9"}
                    fill={p.landmark ? "#0284c7" : "#475569"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    fontWeight={p.landmark ? "700" : "500"}
                  >
                    {p.label}
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Drawing canvas overlay */}
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Tools */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Color picker */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">色:</span>
          {COLORS.map(c => (
            <button
              key={c.key}
              onClick={() => setCurrentColor(c.value)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all",
                currentColor === c.value
                  ? "border-foreground scale-110 shadow-md"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>

        {/* Pen size */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">太さ:</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPenSize(Math.max(1, penSize - 1))}>
            <Minus className="h-3 w-3" />
          </Button>
          <div className="flex items-center justify-center w-8">
            <div
              className="rounded-full bg-foreground"
              style={{ width: penSize * 2, height: penSize * 2 }}
            />
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPenSize(Math.min(12, penSize + 1))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={strokes.length === 0} className="gap-1 text-xs">
            <Undo2 className="h-3.5 w-3.5" />
            戻す
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={strokes.length === 0} className="gap-1 text-xs text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            クリア
          </Button>
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          キャンセル
        </Button>
        <Button size="sm" onClick={handleSave} className="gap-1">
          <Check className="h-3.5 w-3.5" />
          保存
        </Button>
      </div>
    </div>
  );
}

// Helper to get approximate center of an SVG path for label placement
function getPathCenter(d: string): { x: number; y: number } {
  const nums: number[] = [];
  const matches = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
  if (matches) {
    for (const m of matches) {
      nums.push(parseFloat(m));
    }
  }
  if (nums.length < 2) return { x: 150, y: 150 };

  let sumX = 0, sumY = 0, count = 0;
  for (let i = 0; i < nums.length - 1; i += 2) {
    sumX += nums[i];
    sumY += nums[i + 1];
    count++;
  }
  return { x: sumX / count, y: sumY / count };
}
