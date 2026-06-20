/**
 * Anatomy data for multi-angle detailed body part illustrations
 * Each body part has multiple views (front, back, lateral, medial, superior, inferior)
 * Focus on bone landmarks, muscle contours, and joint structures for palpation
 */
import { getBodyPartLabel } from "./constants";

export interface AnatomySVGData {
  viewBox: string;
  paths: Array<{
    d: string;
    fill: string;
    stroke: string;
    strokeWidth?: string | number;
    label?: string;
    landmark?: boolean; // 触診ランドマーク
    strokeDasharray?: string;
  }>;
}

export interface BodyPartAnatomyViews {
  front?: AnatomySVGData;
  back?: AnatomySVGData;
  medial?: AnatomySVGData;
  lateral?: AnatomySVGData;
  superior?: AnatomySVGData;
  inferior?: AnatomySVGData;
}

export const ANATOMY_DATA: Record<string, BodyPartAnatomyViews> = {
  // ===== 左肩 (Left Shoulder) =====
  left_shoulder: {
    front: {
      viewBox: "0 0 300 400",
      paths: [
        // 肩・胸・腕のリアルな体表アウトライン
        {
          d: "M 50 150 C 50 100 100 70 150 70 C 200 70 230 90 250 110 C 270 130 280 180 270 250 L 230 250 C 220 200 180 180 150 180 C 100 180 50 180 50 150 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 僧帽筋 (Trapezius) の輪郭線
        {
          d: "M 100 75 Q 150 85 180 100",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "僧帽筋",
        },
        // 大胸筋 (Pectoralis Major) 上部のふくらみ
        {
          d: "M 180 100 C 150 120 100 130 50 130",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "大胸筋 (上部)",
        },
        // 三角筋 (Deltoid - 前部・中部の境界)
        {
          d: "M 220 102 C 220 150 240 200 255 230",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "三角筋 (前部)",
        },
        // 鎖骨 (Clavicle - 重要骨構造)
        {
          d: "M 80 110 Q 150 95 220 102",
          fill: "none",
          stroke: "#475569",
          strokeWidth: "4.5",
          label: "鎖骨",
          landmark: true,
        },
        // 肩峰 (Acromion - 触診最重要点)
        {
          d: "M 220 102 L 232 115 L 222 125 Z",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2",
          label: "肩峰",
          landmark: true,
        },
        // 烏口突起 (Coracoid process - 前方の突起)
        {
          d: "M 185 118 A 6 6 0 1 1 184.9 118",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2",
          label: "烏口突起",
          landmark: true,
        },
        // 上腕骨頭 (Humeral head) の位置目安
        {
          d: "M 230 135 A 15 15 0 1 1 229.9 135",
          fill: "rgba(226, 232, 240, 0.5)",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "上腕骨頭",
        }
      ],
    },
    back: {
      viewBox: "0 0 300 400",
      paths: [
        // 背面アウトライン（首の付け根〜肩甲骨〜脇）
        {
          d: "M 50 20 L 50 100 C 50 150 30 180 70 250 C 90 280 130 300 180 300 C 230 300 250 240 250 180 C 250 130 220 80 180 80 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 僧帽筋 (Trapezius) 背面ライン
        {
          d: "M 50 100 C 100 110 130 130 150 160",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "僧帽筋 (背面)",
        },
        // 三角筋後部 (Deltoid posterior) の境界
        {
          d: "M 180 160 C 190 200 220 230 240 240",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "三角筋 (後部)",
        },
        // 肩甲骨 (Scapula - 骨格のアウトライン)
        {
          d: "M 100 140 L 170 160 L 155 270 L 95 240 Z",
          fill: "#f1f5f9",
          stroke: "#475569",
          strokeWidth: "2",
          label: "肩甲骨",
        },
        // 肩甲棘 (Scapular spine - 触診の骨の尾根)
        {
          d: "M 100 170 L 170 160",
          fill: "none",
          stroke: "#334155",
          strokeWidth: "4",
          label: "肩甲棘",
          landmark: true,
        },
        // 肩甲骨の下角 (Inferior angle - 最下点)
        {
          d: "M 155 270 A 7 7 0 1 1 154.9 270",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2",
          label: "肩甲骨下角",
          landmark: true,
        },
        // 肩甲骨の上角 (Superior angle - 最上点)
        {
          d: "M 100 140 A 6 6 0 1 1 99.9 140",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2",
          label: "肩甲骨上角",
          landmark: true,
        }
      ],
    },
  },

  // ===== 右肩 (Right Shoulder - 左肩の完全鏡像反転定義) =====
  right_shoulder: {
    front: {
      viewBox: "0 0 300 400",
      paths: [
        // 肩・胸・腕のリアルな体表アウトライン (右)
        {
          d: "M 250 150 C 250 100 200 70 150 70 C 100 70 70 90 50 110 C 30 130 20 180 30 250 L 70 250 C 80 200 120 180 150 180 C 200 180 250 180 250 150 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 僧帽筋ライン (右)
        {
          d: "M 200 75 Q 150 85 120 100",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "僧帽筋",
        },
        // 大胸筋上部のふくらみ (右)
        {
          d: "M 120 100 C 150 120 200 130 250 130",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "大胸筋 (上部)",
        },
        // 三角筋境界 (右)
        {
          d: "M 80 102 C 80 150 60 200 45 230",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "三角筋 (前部)",
        },
        // 鎖骨 (右)
        {
          d: "M 220 110 Q 150 95 80 102",
          fill: "none",
          stroke: "#475569",
          strokeWidth: "4.5",
          label: "鎖骨",
          landmark: true,
        },
        // 肩峰 (右)
        {
          d: "M 80 102 L 68 115 L 78 125 Z",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2",
          label: "肩峰",
          landmark: true,
        },
        // 烏口突起 (右)
        {
          d: "M 115 118 A 6 6 0 1 1 114.9 118",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2",
          label: "烏口突起",
          landmark: true,
        },
        // 上腕骨頭 (右)
        {
          d: "M 70 135 A 15 15 0 1 1 69.9 135",
          fill: "rgba(226, 232, 240, 0.5)",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "上腕骨頭",
        }
      ],
    },
    back: {
      viewBox: "0 0 300 400",
      paths: [
        // 背面アウトライン (右)
        {
          d: "M 250 20 L 250 100 C 250 150 270 180 230 250 C 210 280 170 300 120 300 C 70 300 50 240 50 180 C 50 130 80 80 120 80 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 僧帽筋ライン (右)
        {
          d: "M 250 100 C 200 110 170 130 150 160",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "僧帽筋 (背面)",
        },
        // 三角筋後部 (右)
        {
          d: "M 120 160 C 110 200 80 230 60 240",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "三角筋 (後部)",
        },
        // 肩甲骨 (右)
        {
          d: "M 200 140 L 130 160 L 145 270 L 205 240 Z",
          fill: "#f1f5f9",
          stroke: "#475569",
          strokeWidth: "2",
          label: "肩甲骨",
        },
        // 肩甲棘 (右)
        {
          d: "M 200 170 L 130 160",
          fill: "none",
          stroke: "#334155",
          strokeWidth: "4",
          label: "肩甲棘",
          landmark: true,
        },
        // 肩甲骨下角 (右)
        {
          d: "M 145 270 A 7 7 0 1 1 144.9 270",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2",
          label: "肩甲骨下角",
          landmark: true,
        },
        // 肩甲骨上角 (右)
        {
          d: "M 200 140 A 6 6 0 1 1 199.9 140",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2",
          label: "肩甲骨上角",
          landmark: true,
        }
      ],
    },
  },

  // ===== 左肘 (Left Elbow) =====
  left_elbow: {
    front: {
      viewBox: "0 0 300 400",
      paths: [
        // 腕（上腕〜肘〜前腕）のリアルな輪郭シルエット
        {
          d: "M 110 30 C 110 80 90 150 90 190 C 90 230 110 320 120 370 L 180 370 C 190 320 210 230 210 190 C 210 150 190 80 190 30 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 上腕二頭筋 (Biceps) のふくらみライン
        {
          d: "M 120 80 C 130 130 135 170 150 170 C 165 170 170 130 180 80",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "上腕二頭筋",
        },
        // 肘窩 (Antecubital fossa - 肘の前面のしわ)
        {
          d: "M 120 190 Q 150 195 180 190",
          fill: "none",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "肘窩 (前面のしわ)",
        },
        // 上腕骨 (Humerus)
        { d: "M 150 30 L 150 180", fill: "none", stroke: "#cbd5e1", strokeWidth: "8" },
        // 橈骨 (Radius)
        { d: "M 135 200 L 135 370", fill: "none", stroke: "#cbd5e1", strokeWidth: "5" },
        // 尺骨 (Ulna)
        { d: "M 165 200 L 165 370", fill: "none", stroke: "#cbd5e1", strokeWidth: "5" },
        // 上腕骨内側上顆 (Medial epicondyle - 内側の最も大きな隆起)
        {
          d: "M 195 185 A 8 8 0 1 1 194.9 185",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2",
          label: "内側上顆",
          landmark: true,
        },
        // 上腕骨外側上顆 (Lateral epicondyle - 外側の隆起)
        {
          d: "M 105 185 A 7 7 0 1 1 104.9 185",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2",
          label: "外側上顆",
          landmark: true,
        }
      ],
    },
    back: {
      viewBox: "0 0 300 400",
      paths: [
        // 腕（背面）のリアルな輪郭シルエット
        {
          d: "M 110 30 C 110 80 90 150 90 190 C 90 230 110 320 120 370 L 180 370 C 190 320 210 230 210 190 C 210 150 190 80 190 30 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 上腕三頭筋 (Triceps) のふくらみとアキレス腱的な腱板
        {
          d: "M 125 50 C 125 100 135 150 135 170 L 165 170 C 165 150 175 100 175 50",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "上腕三頭筋",
        },
        // 肘頭 (Olecranon - 肘の後ろの最も尖った骨)
        {
          d: "M 150 185 A 10 10 0 1 1 149.9 185",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2.5",
          label: "肘頭",
          landmark: true,
        },
        // 上腕骨内側上顆 (Medial epicondyle - 背面から見た内側)
        {
          d: "M 105 180 A 8 8 0 1 1 104.9 180",
          fill: "rgba(226, 232, 240, 0.8)",
          stroke: "#64748b",
          strokeWidth: "2",
          label: "内側上顆",
          landmark: true,
        },
        // 上腕骨外側上顆 (Lateral epicondyle - 背面から見た外側)
        {
          d: "M 195 180 A 7 7 0 1 1 194.9 180",
          fill: "rgba(226, 232, 240, 0.8)",
          stroke: "#64748b",
          strokeWidth: "2",
          label: "外側上顆",
          landmark: true,
        }
      ],
    },
  },

  // ===== 右肘 (Right Elbow - 左肘の反転定義) =====
  right_elbow: {
    front: {
      viewBox: "0 0 300 400",
      paths: [
        // 腕のリアルな輪郭シルエット (右)
        {
          d: "M 190 30 C 190 80 210 150 210 190 C 210 230 190 320 180 370 L 120 370 C 110 320 90 230 90 190 C 90 150 110 80 110 30 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 上腕二頭筋 (右)
        {
          d: "M 180 80 C 170 130 165 170 150 170 C 135 170 130 130 120 80",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "上腕二頭筋",
        },
        // 肘窩 (右)
        {
          d: "M 180 190 Q 150 195 120 190",
          fill: "none",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "肘窩 (前面のしわ)",
        },
        // 骨構造 (右)
        { d: "M 150 30 L 150 180", fill: "none", stroke: "#cbd5e1", strokeWidth: "8" },
        { d: "M 165 200 L 165 370", fill: "none", stroke: "#cbd5e1", strokeWidth: "5" },
        { d: "M 135 200 L 135 370", fill: "none", stroke: "#cbd5e1", strokeWidth: "5" },
        // 内側上顆 (右肘の内側は左側)
        {
          d: "M 105 185 A 8 8 0 1 1 104.9 185",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2",
          label: "内側上顆",
          landmark: true,
        },
        // 外側上顆 (右肘の外側は右側)
        {
          d: "M 195 185 A 7 7 0 1 1 194.9 185",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2",
          label: "外側上顆",
          landmark: true,
        }
      ],
    },
    back: {
      viewBox: "0 0 300 400",
      paths: [
        // 腕（背面 - 右）
        {
          d: "M 190 30 C 190 80 210 150 210 190 C 210 230 190 320 180 370 L 120 370 C 110 320 90 230 90 190 C 90 150 110 80 110 30 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 上腕三頭筋 (右)
        {
          d: "M 175 50 C 175 100 165 150 165 170 L 135 170 C 135 150 125 100 125 50",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "上腕三頭筋",
        },
        // 肘頭 (右)
        {
          d: "M 150 185 A 10 10 0 1 1 149.9 185",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2.5",
          label: "肘頭",
          landmark: true,
        },
        // 内側上顆 (右背面の内側は右側)
        {
          d: "M 195 180 A 8 8 0 1 1 194.9 180",
          fill: "rgba(226, 232, 240, 0.8)",
          stroke: "#64748b",
          strokeWidth: "2",
          label: "内側上顆",
          landmark: true,
        },
        // 外側上顆 (右背面の外側は左側)
        {
          d: "M 105 180 A 7 7 0 1 1 104.9 180",
          fill: "rgba(226, 232, 240, 0.8)",
          stroke: "#64748b",
          strokeWidth: "2",
          label: "外側上顆",
          landmark: true,
        }
      ],
    },
  },

  // ===== 左膝 (Left Knee) =====
  left_knee: {
    front: {
      viewBox: "0 0 300 400",
      paths: [
        // 足（大腿〜膝〜下腿）のリアルな輪郭シルエット
        {
          d: "M 90 20 L 90 80 C 90 140 70 180 70 220 C 70 270 85 330 90 380 L 210 380 C 215 330 230 270 230 220 C 230 180 210 140 210 80 L 210 20 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 大腿直筋 (Rectus Femoris - 前面の中心)
        {
          d: "M 150 20 L 150 140",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          strokeDasharray: "4 4",
          label: "大腿直筋",
        },
        // 内側広筋 (Vastus Medialis - 膝関節の内側上部のふくらみ)
        {
          d: "M 140 120 C 120 120 100 135 105 160 C 110 175 130 175 140 175",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "内側広筋",
        },
        // 外側広筋 (Vastus Lateralis - 膝関節の外側上部のふくらみ)
        {
          d: "M 160 120 C 180 120 200 135 195 160 C 190 175 170 175 160 175",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "外側広筋",
        },
        // 大腿骨と脛骨/腓骨 (関節骨格の薄い下絵)
        { d: "M 150 20 L 150 160", fill: "none", stroke: "#e2e8f0", strokeWidth: "12" },
        { d: "M 150 220 L 150 380", fill: "none", stroke: "#e2e8f0", strokeWidth: "10" },
        
        // --- 骨・靭帯構造 ---
        // 膝蓋骨 (Patella - お皿骨)
        {
          d: "M 132 145 C 132 130 168 130 168 145 C 168 170 132 170 132 145 Z",
          fill: "#e2e8f0",
          stroke: "#475569",
          strokeWidth: "2",
          label: "膝蓋骨 (お皿)",
        },
        // 膝蓋腱 (Patellar tendon - お皿から下腿へ伸びる腱)
        {
          d: "M 144 170 L 144 215 L 156 215 L 156 170 Z",
          fill: "#cbd5e1",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "膝蓋腱 (靭帯)",
        },
        // 脛骨粗面 (Tibial tuberosity - 膝下の骨の隆起)
        {
          d: "M 150 215 A 8 8 0 1 1 149.9 215",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2.5",
          label: "脛骨粗面",
          landmark: true,
        },
        // 内側側副靭帯 (MCL - 内側の靭帯)
        {
          d: "M 95 160 Q 98 190 102 210",
          fill: "none",
          stroke: "#f43f5e",
          strokeWidth: "3.5",
          label: "内側側副靭帯 (MCL)",
          landmark: true,
        },
        // 外側側副靭帯 (LCL - 外側の靭帯)
        {
          d: "M 205 160 Q 202 190 198 210",
          fill: "none",
          stroke: "#f43f5e",
          strokeWidth: "3.5",
          label: "外側側副靭帯 (LCL)",
          landmark: true,
        }
      ],
    },
    back: {
      viewBox: "0 0 300 400",
      paths: [
        // 膝（背面 - 膕窩）のリアルな輪郭シルエット
        {
          d: "M 90 20 L 90 80 C 90 140 70 180 70 220 C 70 270 85 330 90 380 L 210 380 C 215 330 230 270 230 220 C 230 180 210 140 210 80 L 210 20 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 膕窩 (Popliteal fossa - ひざの裏のくぼみとしわ)
        {
          d: "M 110 180 Q 150 190 190 180 M 120 190 Q 150 198 180 190",
          fill: "none",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "膕窩 (ひざ裏しわ)",
        },
        // 半腱様筋・半膜様筋腱 (内側のすじ)
        {
          d: "M 115 80 L 115 170",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "2",
          label: "半腱・半膜様筋腱",
          landmark: true,
        },
        // 大腿二頭筋腱 (外側のすじ)
        {
          d: "M 185 80 L 185 170",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "2",
          label: "大腿二頭筋腱",
          landmark: true,
        },
        // 腓腹筋内側頭 (ふくらはぎの内側ふくらみ)
        {
          d: "M 115 195 C 100 220 100 270 120 300",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "腓腹筋内側頭",
        },
        // 腓腹筋外側頭 (ふくらはぎの外側ふくらみ)
        {
          d: "M 185 195 C 200 220 200 270 180 300",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "腓腹筋外側頭",
        }
      ],
    },
  },

  // ===== 右膝 (Right Knee - 左膝の完全反転定義) =====
  right_knee: {
    front: {
      viewBox: "0 0 300 400",
      paths: [
        // 足のリアルな輪郭シルエット (右)
        {
          d: "M 210 20 L 210 80 C 210 140 230 180 230 220 C 230 270 215 330 210 380 L 90 380 C 85 330 70 270 70 220 C 70 180 90 140 90 80 L 90 20 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 大腿直筋 (右)
        {
          d: "M 150 20 L 150 140",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          strokeDasharray: "4 4",
          label: "大腿直筋",
        },
        // 内側広筋 (右膝の内側は右側)
        {
          d: "M 160 120 C 180 120 200 135 195 160 C 190 175 170 175 160 175",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "内側広筋",
        },
        // 外側広筋 (右膝の外側は左側)
        {
          d: "M 140 120 C 120 120 100 135 105 160 C 110 175 130 175 140 175",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "外側広筋",
        },
        // 骨格下絵
        { d: "M 150 20 L 150 160", fill: "none", stroke: "#e2e8f0", strokeWidth: "12" },
        { d: "M 150 220 L 150 380", fill: "none", stroke: "#e2e8f0", strokeWidth: "10" },
        
        // 膝蓋骨 (右)
        {
          d: "M 132 145 C 132 130 168 130 168 145 C 168 170 132 170 132 145 Z",
          fill: "#e2e8f0",
          stroke: "#475569",
          strokeWidth: "2",
          label: "膝蓋骨 (お皿)",
        },
        // 膝蓋腱 (右)
        {
          d: "M 144 170 L 144 215 L 156 215 L 156 170 Z",
          fill: "#cbd5e1",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "膝蓋腱 (靭帯)",
        },
        // 脛骨粗面 (右)
        {
          d: "M 150 215 A 8 8 0 1 1 149.9 215",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2.5",
          label: "脛骨粗面",
          landmark: true,
        },
        // 内側側副靭帯 (右の内側は右側)
        {
          d: "M 205 160 Q 202 190 198 210",
          fill: "none",
          stroke: "#f43f5e",
          strokeWidth: "3.5",
          label: "内側側副靭帯 (MCL)",
          landmark: true,
        },
        // 外側側副靭帯 (右の外側は左側)
        {
          d: "M 95 160 Q 98 190 102 210",
          fill: "none",
          stroke: "#f43f5e",
          strokeWidth: "3.5",
          label: "外側側副靭帯 (LCL)",
          landmark: true,
        }
      ],
    },
    back: {
      viewBox: "0 0 300 400",
      paths: [
        // 膝背面 (右)
        {
          d: "M 210 20 L 210 80 C 210 140 230 180 230 220 C 230 270 215 330 210 380 L 90 380 C 85 330 70 270 70 220 C 70 180 90 140 90 80 L 90 20 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 膕窩しわ
        {
          d: "M 190 180 Q 150 190 110 180 M 180 190 Q 150 198 120 190",
          fill: "none",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "膕窩 (ひざ裏しわ)",
        },
        // 半腱・半膜腱 (右背面の内側は右側)
        {
          d: "M 185 80 L 185 170",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "2",
          label: "半腱・半膜様筋腱",
          landmark: true,
        },
        // 大腿二頭筋腱 (右背面の外側は左側)
        {
          d: "M 115 80 L 115 170",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "2",
          label: "大腿二頭筋腱",
          landmark: true,
        },
        // ふくらはぎふくらみ内側
        {
          d: "M 185 195 C 200 220 200 270 180 300",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "腓腹筋内側頭",
        },
        // ふくらはぎふくらみ外側
        {
          d: "M 115 195 C 100 220 100 270 120 300",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          label: "腓腹筋外側頭",
        }
      ],
    },
  },

  // ===== 左足首 (Left Ankle) =====
  left_ankle: {
    front: {
      viewBox: "0 0 300 400",
      paths: [
        // 足首のアウトライン（ふくらはぎ〜くるぶし〜足の甲）
        {
          d: "M 100 20 L 100 130 C 100 170 80 180 80 200 C 80 230 110 280 130 330 L 210 330 C 190 280 170 230 170 200 C 170 170 160 130 160 20 L 160 20 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 前脛骨筋腱 (Tibialis anterior tendon - 正面の太いすじ)
        {
          d: "M 130 20 L 145 320",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "2.5",
          label: "前脛骨筋腱",
        },
        // 距骨・踵骨の骨構造
        {
          d: "M 130 200 L 160 200 L 155 240 L 125 240 Z",
          fill: "#e2e8f0",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "距骨",
        },
        // 内側くるぶし (Medial malleolus - 内果)
        {
          d: "M 165 200 A 9 9 0 1 1 164.9 200",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2.5",
          label: "内くるぶし (内果)",
          landmark: true,
        },
        // 外側くるぶし (Lateral malleolus - 外果)
        {
          d: "M 85 205 A 8 8 0 1 1 84.9 205",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2.5",
          label: "外くるぶし (外果)",
          landmark: true,
        }
      ],
    },
    back: {
      viewBox: "0 0 300 400",
      paths: [
        // 足首背面（ふくらはぎ〜かかと）のリアルな輪郭
        {
          d: "M 100 20 L 100 130 C 100 160 85 190 85 220 C 85 250 90 280 110 320 L 190 320 C 210 280 215 250 215 220 C 215 190 200 160 200 130 L 200 20 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // アキレス腱 (Achilles tendon - 最も強固な縦のすじ)
        {
          d: "M 142 20 L 145 280",
          fill: "none",
          stroke: "#475569",
          strokeWidth: "5.5",
          label: "アキレス腱",
          landmark: true,
        },
        // 踵骨隆起 (Calcaneal tuberosity - かかとの骨の膨らみ)
        {
          d: "M 125 280 L 175 280 L 170 315 L 130 315 Z",
          fill: "#e2e8f0",
          stroke: "#475569",
          strokeWidth: "2",
          label: "踵骨隆起",
          landmark: true,
        },
        // 内果 (背面から見た内側くるぶし)
        {
          d: "M 185 210 A 8 8 0 1 1 184.9 210",
          fill: "rgba(226, 232, 240, 0.8)",
          stroke: "#64748b",
          strokeWidth: "2",
          label: "内くるぶし",
          landmark: true,
        },
        // 外果 (背面から見た外側くるぶし)
        {
          d: "M 115 215 A 8 8 0 1 1 114.9 215",
          fill: "rgba(226, 232, 240, 0.8)",
          stroke: "#64748b",
          strokeWidth: "2",
          label: "外くるぶし",
          landmark: true,
        }
      ],
    },
  },

  // ===== 右足首 (Right Ankle - 左足首の完全反転定義) =====
  right_ankle: {
    front: {
      viewBox: "0 0 300 400",
      paths: [
        // 足首のアウトライン (右)
        {
          d: "M 200 20 L 200 130 C 200 170 220 180 220 200 C 220 230 190 280 170 330 L 90 330 C 110 280 130 230 130 200 C 130 170 140 130 140 20 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // 前脛骨筋腱 (右)
        {
          d: "M 170 20 L 155 320",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "2.5",
          label: "前脛骨筋腱",
        },
        // 骨構造 (右)
        {
          d: "M 170 200 L 140 200 L 145 240 L 175 240 Z",
          fill: "#e2e8f0",
          stroke: "#64748b",
          strokeWidth: "1.5",
          label: "距骨",
        },
        // 内側くるぶし (右の内果は左側)
        {
          d: "M 135 200 A 9 9 0 1 1 134.9 200",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2.5",
          label: "内くるぶし (内果)",
          landmark: true,
        },
        // 外側くるぶし (右の外果は右側)
        {
          d: "M 215 205 A 8 8 0 1 1 214.9 205",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2.5",
          label: "外くるぶし (外果)",
          landmark: true,
        }
      ],
    },
    back: {
      viewBox: "0 0 300 400",
      paths: [
        // 足首背面 (右)
        {
          d: "M 200 20 L 200 130 C 200 160 215 190 215 220 C 215 250 210 280 190 320 L 110 320 C 90 280 85 250 85 220 C 85 190 100 160 100 130 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
        },
        // アキレス腱 (右)
        {
          d: "M 158 20 L 155 280",
          fill: "none",
          stroke: "#475569",
          strokeWidth: "5.5",
          label: "アキレス腱",
          landmark: true,
        },
        // 踵骨隆起 (右)
        {
          d: "M 175 280 L 125 280 L 130 315 L 170 315 Z",
          fill: "#e2e8f0",
          stroke: "#475569",
          strokeWidth: "2",
          label: "踵骨隆起",
          landmark: true,
        },
        // 内果 (右背面の内側は左側)
        {
          d: "M 115 210 A 8 8 0 1 1 114.9 210",
          fill: "rgba(226, 232, 240, 0.8)",
          stroke: "#64748b",
          strokeWidth: "2",
          label: "内くるぶし",
          landmark: true,
        },
        // 外果 (右背面の外側は右側)
        {
          d: "M 185 215 A 8 8 0 1 1 184.9 215",
          fill: "rgba(226, 232, 240, 0.8)",
          stroke: "#64748b",
          strokeWidth: "2",
          label: "外くるぶし",
          landmark: true,
        }
      ],
    },
  },
};

export function getAvailableViews(bodyPartKey: string): string[] {
  const anatomy = ANATOMY_DATA[bodyPartKey];
  if (!anatomy) return ["front", "back"]; // 全身すべての部位で前面・背面を切り替え可能にする
  const views = Object.keys(anatomy).filter(key => anatomy[key as keyof BodyPartAnatomyViews]);
  // もし片方しか定義がない場合でも、前面・背面を両方選べるようにする
  if (!views.includes("front")) views.push("front");
  if (!views.includes("back")) views.push("back");
  return views;
}

/**
 * Get anatomy data for a specific body part and view
 */
export function getAnatomyData(bodyPartKey: string, view: string): AnatomySVGData | null {
  const anatomy = ANATOMY_DATA[bodyPartKey];
  if (anatomy) {
    const data = anatomy[view as keyof BodyPartAnatomyViews];
    if (data) return data;
  }

  // フォールバック: 汎用のボディパーツ描画用のSVGデータを生成
  const label = getBodyPartLabel(bodyPartKey);

  // 骨盤 (pelvis) / 臀部 (hip) などの重要な体幹下部用プレミアムシルエット
  if (bodyPartKey === "pelvis" || bodyPartKey === "hip" || bodyPartKey === "left_hip_joint" || bodyPartKey === "right_hip_joint" || bodyPartKey === "lower_back") {
    return {
      viewBox: "0 0 300 300",
      paths: [
        // 身体のアウトライン（後面全体：ウエスト〜臀部〜太もも上部）
        {
          d: "M 90 20 L 90 50 C 90 90 65 130 65 170 C 65 210 90 240 105 280 L 105 300 L 195 300 L 195 280 C 210 240 235 210 235 170 C 235 130 210 90 210 50 L 210 20 Z",
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          strokeWidth: "2",
          label: `${label} (後面全体図)`,
        },
        // 脊柱起立筋・背骨の縦ライン
        {
          d: "M 150 20 L 150 150",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
          strokeDasharray: "4 4",
        },
        // 臀裂（お尻の割れ目）
        {
          d: "M 150 150 L 150 240",
          fill: "none",
          stroke: "#64748b",
          strokeWidth: "2",
        },
        // 左大殿筋のアウトライン
        {
          d: "M 150 235 C 110 235 80 215 70 180 C 65 150 85 110 120 110",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
        },
        // 右大殿筋のアウトライン
        {
          d: "M 150 235 C 190 235 220 215 230 180 C 235 150 215 110 180 110",
          fill: "none",
          stroke: "#94a3b8",
          strokeWidth: "1.5",
        },
        // 左中殿筋のアウトライン
        {
          d: "M 120 110 C 95 110 75 90 85 60",
          fill: "none",
          stroke: "#cbd5e1",
          strokeWidth: "1.2",
        },
        // 右中殿筋のアウトライン
        {
          d: "M 180 110 C 205 110 225 90 215 60",
          fill: "none",
          stroke: "#cbd5e1",
          strokeWidth: "1.2",
        },
        // 仙骨 (Sacrum - 骨盤中央の平らな骨)
        {
          d: "M 132 95 Q 150 90 168 95 L 160 160 C 156 168 144 168 140 160 Z",
          fill: "#e2e8f0",
          stroke: "#475569",
          strokeWidth: "2",
          label: "仙骨",
          landmark: true,
        },
        // 仙骨孔
        { d: "M 142 115 A 1.5 1.5 0 1 1 141.9 115", fill: "#64748b", stroke: "none" },
        { d: "M 158 115 A 1.5 1.5 0 1 1 157.9 115", fill: "#64748b", stroke: "none" },
        { d: "M 144 135 A 1.5 1.5 0 1 1 143.9 135", fill: "#64748b", stroke: "none" },
        { d: "M 156 135 A 1.5 1.5 0 1 1 155.9 135", fill: "#64748b", stroke: "none" },

        // --- 触診ランドマーク (Palpation Landmarks) ---
        // 上後腸骨棘 (PSIS) - 左右の重要指標（シアンブルーのドット）
        {
          d: "M 115 115 A 8 8 0 1 1 114.9 115",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2.5",
          label: "左PSIS",
          landmark: true,
        },
        {
          d: "M 185 115 A 8 8 0 1 1 184.9 115",
          fill: "rgba(14, 165, 233, 0.15)",
          stroke: "#0284c7",
          strokeWidth: "2.5",
          label: "右PSIS",
          landmark: true,
        },
        // 坐骨結節 (Ischial tuberosity) - 座骨（ローズピンクのドット）
        {
          d: "M 118 215 A 9 9 0 1 1 117.9 215",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2.5",
          label: "左坐骨結節",
          landmark: true,
        },
        {
          d: "M 182 215 A 9 9 0 1 1 181.9 215",
          fill: "rgba(244, 63, 94, 0.15)",
          stroke: "#f43f5e",
          strokeWidth: "2.5",
          label: "右坐骨結節",
          landmark: true,
        },
        
        // タイトル
        {
          d: "M 150 35 A 1 1 0 1 1 149.9 35",
          fill: "none",
          stroke: "none",
          label: `${label}の解剖指標 (後面)`,
        }
      ]
    };
  }

  // 一般的なフォールバック（精密なメディカルグリッドとターゲット照準円）
  return {
    viewBox: "0 0 300 300",
    paths: [
      // 背景ボード
      {
        d: "M 15 15 L 285 15 L 285 285 L 15 285 Z",
        fill: "#f8fafc",
        stroke: "#cbd5e1",
        strokeWidth: "2",
      },
      // 精密グリッドライン（スレートの薄い線）
      { d: "M 50 15 L 50 285", fill: "none", stroke: "#e2e8f0", strokeWidth: "0.5" },
      { d: "M 100 15 L 100 285", fill: "none", stroke: "#e2e8f0", strokeWidth: "0.5" },
      { d: "M 200 15 L 200 285", fill: "none", stroke: "#e2e8f0", strokeWidth: "0.5" },
      { d: "M 250 15 L 250 285", fill: "none", stroke: "#e2e8f0", strokeWidth: "0.5" },
      { d: "M 15 50 L 285 50", fill: "none", stroke: "#e2e8f0", strokeWidth: "0.5" },
      { d: "M 15 100 L 285 100", fill: "none", stroke: "#e2e8f0", strokeWidth: "0.5" },
      { d: "M 15 200 L 285 200", fill: "none", stroke: "#e2e8f0", strokeWidth: "0.5" },
      { d: "M 15 250 L 285 250", fill: "none", stroke: "#e2e8f0", strokeWidth: "0.5" },
      
      // 主要十字線
      { d: "M 150 15 L 150 285", fill: "none", stroke: "#94a3b8", strokeWidth: "1.5" },
      { d: "M 15 150 L 285 150", fill: "none", stroke: "#94a3b8", strokeWidth: "1.5" },
      
      // 中央アノテーション照準円
      {
        d: "M 150 150 A 60 60 0 1 1 149.9 150",
        fill: "none",
        stroke: "#0ea5e9",
        strokeWidth: "1.5",
        strokeDasharray: "4 4",
      },
      {
        d: "M 150 150 A 15 15 0 1 1 149.9 150",
        fill: "rgba(14, 165, 233, 0.05)",
        stroke: "#0ea5e9",
        strokeWidth: "1.5",
        label: `${label} 描画エリア`,
      }
    ]
  };
}

/**
 * View labels in Japanese
 */
export const VIEW_LABELS: Record<string, string> = {
  front: "前面",
  back: "背面",
  medial: "内側",
  lateral: "外側",
  superior: "上方",
  inferior: "下方",
};
