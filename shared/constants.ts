// ===== Body Parts =====
export interface BodyPartDef {
  key: string;
  label: string;
  group: string;
  side?: "left" | "right";
}

export const BODY_PART_GROUPS = [
  { key: "head_neck", label: "頭頸部" },
  { key: "trunk", label: "体幹" },
  { key: "upper_left", label: "左上肢" },
  { key: "upper_right", label: "右上肢" },
  { key: "lower_left", label: "左下肢" },
  { key: "lower_right", label: "右下肢" },
] as const;

export const BODY_PARTS: BodyPartDef[] = [
  // 頭頸部
  { key: "head_front", label: "頭(前面)", group: "head_neck" },
  { key: "head_back", label: "頭(後面)", group: "head_neck" },
  { key: "face", label: "顔", group: "head_neck" },
  { key: "neck_front", label: "首(前面)", group: "head_neck" },
  { key: "neck_back", label: "頸椎(後面)", group: "head_neck" },
  // 体幹
  { key: "chest", label: "胸", group: "trunk" },
  { key: "upper_back", label: "背中/胸椎", group: "trunk" },
  { key: "ribs", label: "あばら/肋骨", group: "trunk" },
  { key: "abdomen", label: "お腹/腹部", group: "trunk" },
  { key: "lower_back", label: "腰/腰椎", group: "trunk" },
  { key: "pelvis", label: "骨盤", group: "trunk" },
  { key: "hip", label: "臀部", group: "trunk" },
  // 左上肢
  { key: "left_shoulder_front", label: "左肩(前面)", group: "upper_left", side: "left" },
  { key: "left_shoulder_back", label: "左肩(後面)", group: "upper_left", side: "left" },
  { key: "left_upper_arm_front", label: "左上腕(前面)", group: "upper_left", side: "left" },
  { key: "left_upper_arm_back", label: "左上腕(後面)", group: "upper_left", side: "left" },
  { key: "left_elbow_front", label: "左肘(前面)", group: "upper_left", side: "left" },
  { key: "left_elbow_back", label: "左肘(後面)", group: "upper_left", side: "left" },
  { key: "left_forearm_front", label: "左前腕(前面)", group: "upper_left", side: "left" },
  { key: "left_forearm_back", label: "左前腕(後面)", group: "upper_left", side: "left" },
  { key: "left_wrist_front", label: "左手首(前面)", group: "upper_left", side: "left" },
  { key: "left_wrist_back", label: "左手首(後面)", group: "upper_left", side: "left" },
  { key: "left_hand_front", label: "左手/指(前面)", group: "upper_left", side: "left" },
  { key: "left_hand_back", label: "左手/指(後面)", group: "upper_left", side: "left" },
  // 右上肢
  { key: "right_shoulder_front", label: "右肩(前面)", group: "upper_right", side: "right" },
  { key: "right_shoulder_back", label: "右肩(後面)", group: "upper_right", side: "right" },
  { key: "right_upper_arm_front", label: "右上腕(前面)", group: "upper_right", side: "right" },
  { key: "right_upper_arm_back", label: "右上腕(後面)", group: "upper_right", side: "right" },
  { key: "right_elbow_front", label: "右肘(前面)", group: "upper_right", side: "right" },
  { key: "right_elbow_back", label: "右肘(後面)", group: "upper_right", side: "right" },
  { key: "right_forearm_front", label: "右前腕(前面)", group: "upper_right", side: "right" },
  { key: "right_forearm_back", label: "右前腕(後面)", group: "upper_right", side: "right" },
  { key: "right_wrist_front", label: "右手首(前面)", group: "upper_right", side: "right" },
  { key: "right_wrist_back", label: "右手首(後面)", group: "upper_right", side: "right" },
  { key: "right_hand_front", label: "右手/指(前面)", group: "upper_right", side: "right" },
  { key: "right_hand_back", label: "右手/指(後面)", group: "upper_right", side: "right" },
  // 左下肢
  { key: "left_hip_joint_front", label: "左股関節(前面)", group: "lower_left", side: "left" },
  { key: "left_hip_joint_back", label: "左股関節(後面)", group: "lower_left", side: "left" },
  { key: "left_thigh_front", label: "左大腿(前面)", group: "lower_left", side: "left" },
  { key: "left_thigh_back", label: "左大腿(後面)", group: "lower_left", side: "left" },
  { key: "left_knee_front", label: "左膝(前面)", group: "lower_left", side: "left" },
  { key: "left_knee_back", label: "左膝(後面)", group: "lower_left", side: "left" },
  { key: "left_shin_front", label: "左下腿(前面)", group: "lower_left", side: "left" },
  { key: "left_shin_back", label: "左下腿(後面)", group: "lower_left", side: "left" },
  { key: "left_achilles", label: "左アキレス腱", group: "lower_left", side: "left" },
  { key: "left_ankle_front", label: "左足首(前面)", group: "lower_left", side: "left" },
  { key: "left_ankle_back", label: "左足首(後面)", group: "lower_left", side: "left" },
  { key: "left_foot_front", label: "左足/足趾(前面)", group: "lower_left", side: "left" },
  { key: "left_foot_back", label: "左足/足趾(後面)", group: "lower_left", side: "left" },
  // 右下肢
  { key: "right_hip_joint_front", label: "右股関節(前面)", group: "lower_right", side: "right" },
  { key: "right_hip_joint_back", label: "右股関節(後面)", group: "lower_right", side: "right" },
  { key: "right_thigh_front", label: "右大腿(前面)", group: "lower_right", side: "right" },
  { key: "right_thigh_back", label: "右大腿(後面)", group: "lower_right", side: "right" },
  { key: "right_knee_front", label: "右膝(前面)", group: "lower_right", side: "right" },
  { key: "right_knee_back", label: "右膝(後面)", group: "lower_right", side: "right" },
  { key: "right_shin_front", label: "右下腿(前面)", group: "lower_right", side: "right" },
  { key: "right_shin_back", label: "右下腿(後面)", group: "lower_right", side: "right" },
  { key: "right_achilles", label: "右アキレス腱", group: "lower_right", side: "right" },
  { key: "right_ankle_front", label: "右足首(前面)", group: "lower_right", side: "right" },
  { key: "right_ankle_back", label: "右足首(後面)", group: "lower_right", side: "right" },
  { key: "right_foot_front", label: "右足/足趾(前面)", group: "lower_right", side: "right" },
  { key: "right_foot_back", label: "右足/足趾(後面)", group: "lower_right", side: "right" },
];

// ===== Treatment Types =====
export interface TreatmentTypeDef {
  key: string;
  label: string;
  icon: string; // lucide icon name
  category: string;
}

export const TREATMENT_CATEGORIES = [
  { key: "manual", label: "手技療法" },
  { key: "physical", label: "物理療法" },
  { key: "thermal", label: "温熱・冷却" },
  { key: "rehab", label: "リハビリ" },
  { key: "other", label: "その他" },
] as const;

export const TREATMENT_TYPES: TreatmentTypeDef[] = [
  // 手技療法
  { key: "massage", label: "マッサージ", icon: "Hand", category: "manual" },
  { key: "stretch", label: "ストレッチ", icon: "StretchHorizontal", category: "manual" },
  { key: "mobilization", label: "モビライゼーション", icon: "Move", category: "manual" },
  { key: "fascia_release", label: "筋膜リリース", icon: "Layers", category: "manual" },
  // 物理療法
  { key: "taping", label: "テーピング", icon: "Bandage", category: "physical" },
  { key: "acupuncture", label: "鍼", icon: "Syringe", category: "physical" },
  { key: "moxibustion", label: "灸", icon: "Flame", category: "physical" },
  { key: "electrotherapy", label: "電気治療", icon: "Zap", category: "physical" },
  { key: "ultrasound", label: "超音波治療", icon: "Radio", category: "physical" },
  { key: "radio_wave", label: "ラジオ波", icon: "Wifi", category: "physical" },
  { key: "shockwave", label: "衝撃波", icon: "Activity", category: "physical" },
  // 温熱・冷却
  { key: "icing", label: "アイシング", icon: "Snowflake", category: "thermal" },
  { key: "ice_bath", label: "アイスバス", icon: "Bath", category: "thermal" },
  { key: "hot_pack", label: "ホットパック", icon: "ThermometerSun", category: "thermal" },
  { key: "hot_bath", label: "ホットバス", icon: "Droplets", category: "thermal" },
  // リハビリ
  { key: "rehabilitation", label: "リハビリテーション", icon: "Dumbbell", category: "rehab" },
  { key: "reconditioning", label: "リコンディショニング", icon: "RefreshCw", category: "rehab" },
  { key: "exercise_therapy", label: "運動療法", icon: "HeartPulse", category: "rehab" },
  // その他
  { key: "wound_care", label: "創傷処置", icon: "Cross", category: "other" },
  { key: "counseling", label: "カウンセリング", icon: "MessageCircle", category: "other" },
  { key: "evaluation", label: "評価/診断", icon: "ClipboardCheck", category: "other" },
  { key: "bracing", label: "装具/プロテクション", icon: "Shield", category: "other" },
  { key: "scar_tissue", label: "スカーティシュー", icon: "Scissors", category: "other" },
  { key: "rice", label: "RICE処置", icon: "Package", category: "other" },
  { key: "other", label: "その他", icon: "MoreHorizontal", category: "other" },
];

// ===== Timing Options =====
export interface TimingDef {
  key: string;
  label: string;
  icon: string;
}

export const TIMING_OPTIONS: TimingDef[] = [
  { key: "am_before_practice", label: "AM練習前", icon: "Sunrise" },
  { key: "am_after_practice", label: "AM練習後", icon: "Sun" },
  { key: "pm_before_practice", label: "PM練習前", icon: "Sun" },
  { key: "pm_after_practice", label: "PM練習後", icon: "Sunset" },
  { key: "before_match", label: "試合前", icon: "Trophy" },
  { key: "after_match", label: "試合後", icon: "Medal" },
  { key: "during_practice", label: "練習中", icon: "Clock" },
];

export const TIMING_DEFAULT_HOURS: Record<string, string> = {
  am_before_practice: "09:00",
  am_after_practice: "12:00",
  pm_before_practice: "14:00",
  pm_after_practice: "17:00",
  before_match: "10:00",
  after_match: "18:00",
  during_practice: "14:00",
};

// ===== Duration Presets =====
export const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60] as const;

// ===== Player Positions =====
export const POSITIONS = [
  { key: "OH", label: "アウトサイドヒッター" },
  { key: "MB", label: "ミドルブロッカー" },
  { key: "S", label: "セッター" },
  { key: "OP", label: "オポジット" },
  { key: "L", label: "リベロ" },
] as const;

// ===== Helpers =====
export function getBodyPartLabel(key: string): string {
  const legacyLabels: Record<string, string> = {
    head: "頭",
    neck: "首/頸椎",
    left_shoulder: "左肩",
    left_upper_arm: "左上腕",
    left_elbow: "左肘",
    left_forearm: "左前腕",
    left_wrist: "左手首",
    left_hand: "左手/指",
    left_hip_joint: "左股関節",
    left_thigh: "左もも/大腿",
    left_knee: "左膝",
    left_shin: "左下腿",
    left_ankle: "左足首",
    left_foot: "左足/足趾",
    right_shoulder: "右肩",
    right_upper_arm: "右上腕",
    right_elbow: "右肘",
    right_forearm: "右前腕",
    right_wrist: "右手首",
    right_hand: "右手/指",
    right_hip_joint: "右股関節",
    right_thigh: "右もも/大腿",
    right_knee: "右膝",
    right_shin: "右下腿",
    right_ankle: "右足首",
    right_foot: "右足/足趾",
  };
  return BODY_PARTS.find(b => b.key === key)?.label ?? legacyLabels[key] ?? key;
}

export function getTreatmentTypeLabel(key: string): string {
  return TREATMENT_TYPES.find(t => t.key === key)?.label ?? key;
}

export function getTimingLabel(key: string): string {
  const labelMap: Record<string, string> = {
    before_practice: "練習前",
    during_practice: "練習中",
    after_practice: "練習後",
    before_match: "試合前",
    after_match: "試合後",
    other: "その他"
  };
  return TIMING_OPTIONS.find(t => t.key === key)?.label ?? labelMap[key] ?? key;
}

export function getPositionLabel(key: string): string {
  return POSITIONS.find(p => p.key === key)?.label ?? key;
}
