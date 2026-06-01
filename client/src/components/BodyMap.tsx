import { useState } from "react";
import { cn } from "@/lib/utils";

interface BodyMapProps {
  selectedParts: string[];
  onTogglePart: (partKey: string) => void;
}

type View = "front" | "back";

interface BodyRegion {
  key: string;
  label: string;
  front?: string; // SVG path d attribute for front view
  back?: string;  // SVG path d attribute for back view
}

// Refined anatomical regions on a 200x450 canvas
// Using smooth curves for a professional medical illustration feel
const regions: BodyRegion[] = [
  // === Head & Neck ===
  { key: "head", label: "頭",
    front: "M100,12 C88,12 82,22 82,35 C82,48 90,56 100,56 C110,56 118,48 118,35 C118,22 112,12 100,12 Z",
    back: "M100,12 C88,12 82,22 82,35 C82,48 90,56 100,56 C110,56 118,48 118,35 C118,22 112,12 100,12 Z" },
  { key: "face", label: "顔",
    front: "M92,28 C92,24 96,20 100,20 C104,20 108,24 108,28 L108,44 C108,50 104,54 100,54 C96,54 92,50 92,44 Z",
    back: undefined },
  { key: "neck", label: "首/頸椎",
    front: "M93,56 L107,56 L109,70 L91,70 Z",
    back: "M93,56 L107,56 L109,70 L91,70 Z" },

  // === Trunk Front ===
  { key: "chest", label: "胸",
    front: "M68,74 L132,74 L134,118 L66,118 Z",
    back: undefined },
  { key: "ribs", label: "あばら/肋骨",
    front: "M64,88 L72,86 L70,118 L64,118 Z M128,86 L136,88 L136,118 L130,118 Z",
    back: undefined },
  { key: "abdomen", label: "お腹/腹部",
    front: "M70,118 L130,118 L128,158 L72,158 Z",
    back: undefined },

  // === Trunk Back ===
  { key: "upper_back", label: "背中/胸椎",
    back: "M68,74 L132,74 L134,118 L66,118 Z",
    front: undefined },
  { key: "lower_back", label: "腰/腰椎",
    back: "M70,118 L130,118 L128,158 L72,158 Z",
    front: undefined },

  // === Pelvis / Hip ===
  { key: "pelvis", label: "骨盤",
    front: "M72,158 L128,158 L126,176 L74,176 Z",
    back: undefined },
  { key: "hip", label: "臀部",
    back: "M70,158 L130,158 L132,182 L68,182 Z",
    front: undefined },

  // === Left Shoulder & Arm (appears on RIGHT side in front view) ===
  { key: "left_shoulder", label: "左肩",
    front: "M132,72 L152,78 L150,96 L134,90 Z",
    back: "M50,78 L68,72 L66,90 L48,96 Z" },
  { key: "left_upper_arm", label: "左上腕",
    front: "M150,96 L158,98 L160,140 L148,138 Z",
    back: "M40,98 L48,96 L50,138 L38,140 Z" },
  { key: "left_elbow", label: "左肘",
    front: "M148,138 L160,140 L160,154 L148,152 Z",
    back: "M38,140 L50,138 L50,152 L38,154 Z" },
  { key: "left_forearm", label: "左前腕",
    front: "M148,152 L160,154 L157,196 L150,194 Z",
    back: "M41,196 L48,194 L50,152 L38,154 Z" },
  { key: "left_wrist", label: "左手首",
    front: "M150,194 L157,196 L156,206 L151,204 Z",
    back: "M42,206 L47,204 L48,194 L41,196 Z" },
  { key: "left_hand", label: "左手/指",
    front: "M151,204 L156,206 L158,228 L148,226 Z",
    back: "M40,226 L50,228 L47,206 L42,204 Z" },

  // === Right Shoulder & Arm (appears on LEFT side in front view) ===
  { key: "right_shoulder", label: "右肩",
    front: "M48,78 L68,72 L66,90 L50,96 Z",
    back: "M132,72 L152,78 L150,96 L134,90 Z" },
  { key: "right_upper_arm", label: "右上腕",
    front: "M40,98 L50,96 L52,138 L38,140 Z",
    back: "M150,96 L158,98 L160,140 L148,138 Z" },
  { key: "right_elbow", label: "右肘",
    front: "M38,140 L52,138 L52,152 L38,154 Z",
    back: "M148,138 L160,140 L160,154 L148,152 Z" },
  { key: "right_forearm", label: "右前腕",
    front: "M38,154 L52,152 L50,194 L41,196 Z",
    back: "M148,152 L160,154 L157,196 L150,194 Z" },
  { key: "right_wrist", label: "右手首",
    front: "M41,196 L50,194 L49,204 L42,206 Z",
    back: "M150,194 L157,196 L156,206 L151,204 Z" },
  { key: "right_hand", label: "右手/指",
    front: "M42,206 L49,204 L50,228 L40,226 Z",
    back: "M148,226 L158,228 L156,206 L151,204 Z" },

  // === Left Lower Limb ===
  { key: "left_hip_joint", label: "左股関節",
    front: "M100,172 L126,172 L124,190 L100,190 Z",
    back: "M74,172 L100,172 L100,190 L76,190 Z" },
  { key: "left_thigh", label: "左もも/大腿",
    front: "M100,190 L124,190 L118,272 L104,272 Z",
    back: "M76,190 L100,190 L96,272 L82,272 Z" },
  { key: "left_knee", label: "左膝",
    front: "M104,272 L118,272 L117,292 L105,292 Z",
    back: "M82,272 L96,272 L95,292 L83,292 Z" },
  { key: "left_shin", label: "左下腿",
    front: "M105,292 L117,292 L115,370 L107,370 Z",
    back: "M83,292 L95,292 L93,370 L85,370 Z" },
  { key: "left_achilles", label: "左アキレス腱",
    front: undefined,
    back: "M86,358 L92,358 L91,378 L87,378 Z" },
  { key: "left_ankle", label: "左足首",
    front: "M107,370 L115,370 L114,384 L108,384 Z",
    back: "M85,370 L93,370 L92,384 L86,384 Z" },
  { key: "left_foot", label: "左足/足趾",
    front: "M105,384 L118,384 L120,404 L103,404 Z",
    back: "M80,384 L95,384 L97,404 L78,404 Z" },

  // === Right Lower Limb ===
  { key: "right_hip_joint", label: "右股関節",
    front: "M74,172 L100,172 L100,190 L76,190 Z",
    back: "M100,172 L126,172 L124,190 L100,190 Z" },
  { key: "right_thigh", label: "右もも/大腿",
    front: "M76,190 L100,190 L96,272 L82,272 Z",
    back: "M100,190 L124,190 L118,272 L104,272 Z" },
  { key: "right_knee", label: "右膝",
    front: "M82,272 L96,272 L95,292 L83,292 Z",
    back: "M104,272 L118,272 L117,292 L105,292 Z" },
  { key: "right_shin", label: "右下腿",
    front: "M83,292 L95,292 L93,370 L85,370 Z",
    back: "M105,292 L117,292 L115,370 L107,370 Z" },
  { key: "right_achilles", label: "右アキレス腱",
    front: undefined,
    back: "M108,358 L114,358 L113,378 L109,378 Z" },
  { key: "right_ankle", label: "右足首",
    front: "M85,370 L93,370 L92,384 L86,384 Z",
    back: "M107,370 L115,370 L114,384 L108,384 Z" },
  { key: "right_foot", label: "右足/足趾",
    front: "M80,384 L95,384 L97,404 L78,404 Z",
    back: "M105,384 L118,384 L120,404 L103,404 Z" },
];

// Professional body silhouette outline
const bodyOutline = `
  M100,10 C86,10 80,22 80,36 C80,50 89,58 100,58 C111,58 120,50 120,36 C120,22 114,10 100,10 Z
  M92,58 L90,70 L68,74 L48,80 L40,100 L36,140 L36,154 L38,196 L40,206 L38,230 L52,230 L50,206 L50,152 L52,96 L66,86 L66,172 L74,190 L76,272 L82,292 L82,370 L80,384 L76,406 L80,412 L100,412
  L100,412 L120,412 L124,406 L120,384 L118,370 L118,292 L124,272 L126,190 L134,172 L134,86 L148,96 L150,152 L150,206 L148,230 L162,230 L160,206 L162,154 L164,140 L160,100 L152,80 L132,74 L110,70 L108,58 Z
`;

export default function BodyMap({ selectedParts, onTogglePart }: BodyMapProps) {
  const [view, setView] = useState<View>("front");
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  const visibleRegions = regions.filter(r =>
    view === "front" ? r.front : r.back
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {/* View Toggle */}
      <div className="flex bg-muted rounded-lg p-1 gap-1">
        <button
          onClick={() => setView("front")}
          className={cn(
            "px-5 py-1.5 rounded-md text-sm font-medium transition-all",
            view === "front"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          前面
        </button>
        <button
          onClick={() => setView("back")}
          className={cn(
            "px-5 py-1.5 rounded-md text-sm font-medium transition-all",
            view === "back"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          背面
        </button>
      </div>

      {/* Label */}
      <p className="text-xs text-muted-foreground">
        {view === "front" ? "前面" : "背面"} — タップして部位を選択
      </p>

      {/* SVG Body Map */}
      <div className="relative w-full max-w-[260px] mx-auto select-none">
        <svg
          viewBox="0 0 200 420"
          className="w-full h-auto"
          style={{ touchAction: "manipulation" }}
        >
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.94 0.008 240)" />
              <stop offset="100%" stopColor="oklch(0.89 0.012 240)" />
            </linearGradient>
            {/* Vibrant primary neon gradient for selected parts */}
            <linearGradient id="selectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.18 240 / 0.45)" />
              <stop offset="100%" stopColor="oklch(0.56 0.18 240 / 0.55)" />
            </linearGradient>
            {/* Dynamic, clean glow filter for medical-tech aesthetic */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComponentTransfer in="blur" result="boost">
                <feFuncA type="linear" slope="1.4"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="boost" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Body silhouette */}
          <path
            d={bodyOutline}
            fill="url(#bodyGrad)"
            stroke="oklch(0.78 0.015 240)"
            strokeWidth="0.8"
          />

          {/* Center line for reference */}
          <line x1="100" y1="70" x2="100" y2="180" stroke="oklch(0.82 0.008 240)" strokeWidth="0.3" strokeDasharray="3,3" />

          {/* Clickable regions */}
          {visibleRegions.map(region => {
            const pathD = view === "front" ? region.front! : region.back!;
            const isSelected = selectedParts.includes(region.key);
            const isHovered = hoveredPart === region.key;

            return (
              <path
                key={region.key}
                d={pathD}
                fill={
                  isSelected
                    ? "url(#selectedGrad)"
                    : isHovered
                    ? "oklch(0.68 0.18 240 / 0.15)"
                    : "transparent"
                }
                stroke={
                  isSelected
                    ? "oklch(0.60 0.18 240)"
                    : isHovered
                    ? "oklch(0.68 0.18 240 / 0.6)"
                    : "oklch(0.70 0.015 240 / 0.35)"
                }
                strokeWidth={isSelected ? "1.8" : "0.7"}
                className="cursor-pointer"
                style={{
                  transition: "fill 0.12s ease-out, stroke 0.12s ease-out, stroke-width 0.12s ease-out",
                  filter: isSelected ? "url(#neonGlow)" : undefined,
                }}
                onClick={() => onTogglePart(region.key)}
                onMouseEnter={() => setHoveredPart(region.key)}
                onMouseLeave={() => setHoveredPart(null)}
                onTouchStart={(e) => { e.preventDefault(); setHoveredPart(region.key); }}
                onTouchEnd={(e) => { e.preventDefault(); onTogglePart(region.key); setHoveredPart(null); }}
              />
            );
          })}

          {/* Side labels */}
          {view === "front" ? (
            <>
              <text x="30" y="140" fontSize="7" fill="oklch(0.55 0.02 260)" textAnchor="middle" fontWeight="500">右</text>
              <text x="170" y="140" fontSize="7" fill="oklch(0.55 0.02 260)" textAnchor="middle" fontWeight="500">左</text>
            </>
          ) : (
            <>
              <text x="30" y="140" fontSize="7" fill="oklch(0.55 0.02 260)" textAnchor="middle" fontWeight="500">左</text>
              <text x="170" y="140" fontSize="7" fill="oklch(0.55 0.02 260)" textAnchor="middle" fontWeight="500">右</text>
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        {hoveredPart && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-3 py-1 rounded-md pointer-events-none shadow-lg z-10 whitespace-nowrap">
            {regions.find(r => r.key === hoveredPart)?.label}
          </div>
        )}
      </div>

      {/* Selected parts chips */}
      {selectedParts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-full px-2">
          {selectedParts.map(key => {
            const region = regions.find(r => r.key === key);
            return (
              <button
                key={key}
                onClick={() => onTogglePart(key)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
              >
                {region?.label ?? key}
                <span className="text-primary/50 ml-0.5">&times;</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
