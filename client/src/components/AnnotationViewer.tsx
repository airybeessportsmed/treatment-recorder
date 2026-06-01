import { useRef, useEffect } from "react";
import type { AnnotationData, Stroke } from "./AnnotationCanvas";

// Duplicate the body part SVG data for the viewer (read-only version)
function getBodyPartSVG(key: string): { viewBox: string; paths: Array<{ d: string; fill: string; stroke: string; label?: string }> } {
  const muscle = "#f4a4a0";
  const muscleDark = "#d4847f";
  const bone = "#e8ddd0";
  const skin = "#f5e6d3";
  const tendon = "#d4c8b8";

  const parts: Record<string, ReturnType<typeof getBodyPartSVG>> = {
    head: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M150,20 C100,20 70,60 70,110 C70,170 100,200 120,220 L180,220 C200,200 230,170 230,110 C230,60 200,20 150,20 Z", fill: skin, stroke: muscleDark },
        { d: "M105,100 C105,90 115,80 130,80 L170,80 C185,80 195,90 195,100 L195,130 C195,140 185,150 170,150 L130,150 C115,150 105,140 105,130 Z", fill: muscle, stroke: muscleDark, label: "前頭筋" },
        { d: "M80,100 L105,100 L105,150 L80,140 Z", fill: muscle, stroke: muscleDark, label: "側頭筋" },
        { d: "M195,100 L220,100 L220,140 L195,150 Z", fill: muscle, stroke: muscleDark, label: "側頭筋" },
        { d: "M120,220 L130,260 L170,260 L180,220 Z", fill: muscle, stroke: muscleDark, label: "頸部" },
      ],
    },
    neck: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M110,30 L190,30 L200,60 L100,60 Z", fill: skin, stroke: muscleDark },
        { d: "M100,60 L200,60 L210,160 L90,160 Z", fill: muscle, stroke: muscleDark, label: "胸鎖乳突筋" },
        { d: "M130,60 L170,60 L170,160 L130,160 Z", fill: tendon, stroke: muscleDark, label: "頸椎" },
        { d: "M90,160 L210,160 L230,200 L70,200 Z", fill: muscle, stroke: muscleDark, label: "僧帽筋上部" },
        { d: "M140,80 L160,80 L160,140 L140,140 Z", fill: bone, stroke: muscleDark, label: "C1-C7" },
      ],
    },
    chest: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,30 L240,30 L250,280 L50,280 Z", fill: skin, stroke: muscleDark },
        { d: "M80,40 L150,40 L150,160 L70,160 Z", fill: muscle, stroke: muscleDark, label: "大胸筋（右）" },
        { d: "M150,40 L220,40 L230,160 L150,160 Z", fill: muscle, stroke: muscleDark, label: "大胸筋（左）" },
        { d: "M140,40 L160,40 L160,260 L140,260 Z", fill: bone, stroke: muscleDark, label: "胸骨" },
        { d: "M70,160 L230,160 L230,200 L70,200 Z", fill: muscle, stroke: muscleDark, label: "腹直筋上部" },
        { d: "M70,200 L230,200 L230,260 L70,260 Z", fill: muscle, stroke: muscleDark, label: "腹直筋下部" },
      ],
    },
    upper_back: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,20 L240,20 L250,280 L50,280 Z", fill: skin, stroke: muscleDark },
        { d: "M80,30 L220,30 L200,120 L100,120 Z", fill: muscle, stroke: muscleDark, label: "僧帽筋" },
        { d: "M100,120 L200,120 L210,200 L90,200 Z", fill: muscle, stroke: muscleDark, label: "広背筋" },
        { d: "M140,30 L160,30 L160,260 L140,260 Z", fill: bone, stroke: muscleDark, label: "脊柱（T1-T12）" },
        { d: "M90,200 L210,200 L210,260 L90,260 Z", fill: muscle, stroke: muscleDark, label: "脊柱起立筋" },
      ],
    },
    lower_back: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,20 L240,20 L250,280 L50,280 Z", fill: skin, stroke: muscleDark },
        { d: "M80,30 L220,30 L220,120 L80,120 Z", fill: muscle, stroke: muscleDark, label: "広背筋" },
        { d: "M100,120 L200,120 L200,220 L100,220 Z", fill: muscle, stroke: muscleDark, label: "脊柱起立筋" },
        { d: "M140,30 L160,30 L160,260 L140,260 Z", fill: bone, stroke: muscleDark, label: "脊柱（L1-L5）" },
        { d: "M80,220 L100,220 L100,260 L80,260 Z", fill: muscle, stroke: muscleDark, label: "腰方形筋（右）" },
        { d: "M200,220 L220,220 L220,260 L200,260 Z", fill: muscle, stroke: muscleDark, label: "腰方形筋（左）" },
      ],
    },
    abdomen: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,20 L240,20 L240,280 L60,280 Z", fill: skin, stroke: muscleDark },
        { d: "M110,30 L190,30 L190,260 L110,260 Z", fill: muscle, stroke: muscleDark, label: "腹直筋" },
        { d: "M60,30 L110,30 L110,260 L60,260 Z", fill: muscle, stroke: muscleDark, label: "外腹斜筋（右）" },
        { d: "M190,30 L240,30 L240,260 L190,260 Z", fill: muscle, stroke: muscleDark, label: "外腹斜筋（左）" },
        { d: "M140,30 L160,30 L160,260 L140,260 Z", fill: tendon, stroke: muscleDark, label: "白線" },
      ],
    },
    ribs: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,20 L240,20 L240,280 L60,280 Z", fill: skin, stroke: muscleDark },
        { d: "M80,40 L220,40 L220,80 L80,80 Z", fill: bone, stroke: muscleDark, label: "第1-3肋骨" },
        { d: "M80,90 L220,90 L220,130 L80,130 Z", fill: bone, stroke: muscleDark, label: "第4-6肋骨" },
        { d: "M80,140 L220,140 L220,180 L80,180 Z", fill: bone, stroke: muscleDark, label: "第7-9肋骨" },
        { d: "M80,190 L200,190 L200,230 L80,230 Z", fill: bone, stroke: muscleDark, label: "第10-12肋骨" },
        { d: "M70,50 L80,40 L80,230 L70,220 Z", fill: muscle, stroke: muscleDark, label: "肋間筋" },
      ],
    },
    pelvis: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M50,40 L250,40 L250,260 L50,260 Z", fill: skin, stroke: muscleDark },
        { d: "M70,50 L150,50 L130,180 L60,180 Z", fill: bone, stroke: muscleDark, label: "右腸骨" },
        { d: "M150,50 L230,50 L240,180 L170,180 Z", fill: bone, stroke: muscleDark, label: "左腸骨" },
        { d: "M120,180 L180,180 L180,240 L120,240 Z", fill: bone, stroke: muscleDark, label: "仙骨" },
        { d: "M130,140 L170,140 L170,180 L130,180 Z", fill: tendon, stroke: muscleDark, label: "恥骨結合" },
      ],
    },
    hip: {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M50,20 L250,20 L260,280 L40,280 Z", fill: skin, stroke: muscleDark },
        { d: "M70,30 L150,30 L140,150 L60,150 Z", fill: muscle, stroke: muscleDark, label: "大殿筋（右）" },
        { d: "M150,30 L230,30 L240,150 L160,150 Z", fill: muscle, stroke: muscleDark, label: "大殿筋（左）" },
        { d: "M80,80 L140,80 L130,130 L70,130 Z", fill: muscle, stroke: muscleDark, label: "中殿筋（右）" },
        { d: "M160,80 L220,80 L230,130 L170,130 Z", fill: muscle, stroke: muscleDark, label: "中殿筋（左）" },
        { d: "M60,150 L240,150 L240,260 L60,260 Z", fill: muscle, stroke: muscleDark, label: "梨状筋" },
      ],
    },
  };

  // Generate symmetric limb parts
  const makeLimb = (side: string, sideLabel: string) => {
    parts[`${side}_shoulder`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M50,40 L250,40 L260,260 L40,260 Z", fill: skin, stroke: muscleDark },
        { d: "M70,50 L230,50 L220,120 L80,120 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}三角筋` },
        { d: "M100,50 L200,50 L200,80 L100,80 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}鎖骨` },
        { d: "M120,80 L180,80 L180,120 L120,120 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}肩峰` },
        { d: "M80,120 L220,120 L210,200 L90,200 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}回旋筋腱板` },
        { d: "M90,200 L210,200 L200,250 L100,250 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}上腕二頭筋腱` },
      ],
    };
    parts[`${side}_upper_arm`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M80,20 L220,20 L220,280 L80,280 Z", fill: skin, stroke: muscleDark },
        { d: "M90,30 L160,30 L160,200 L90,200 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}上腕二頭筋` },
        { d: "M160,30 L210,30 L210,200 L160,200 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}上腕三頭筋` },
        { d: "M140,30 L160,30 L160,260 L140,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}上腕骨` },
      ],
    };
    parts[`${side}_elbow`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M70,20 L230,20 L230,280 L70,280 Z", fill: skin, stroke: muscleDark },
        { d: "M130,30 L170,30 L170,140 L130,140 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}上腕骨遠位` },
        { d: "M100,140 L200,140 L200,180 L100,180 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}肘関節` },
        { d: "M120,180 L160,180 L160,260 L120,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}尺骨` },
        { d: "M160,180 L200,180 L200,260 L160,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}橈骨` },
        { d: "M80,100 L120,100 L120,180 L80,180 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}腕橈骨筋` },
      ],
    };
    parts[`${side}_forearm`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M80,20 L220,20 L210,280 L90,280 Z", fill: skin, stroke: muscleDark },
        { d: "M90,30 L150,30 L150,250 L100,250 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}前腕屈筋群` },
        { d: "M150,30 L210,30 L200,250 L150,250 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}前腕伸筋群` },
        { d: "M120,30 L140,30 L140,260 L120,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}尺骨` },
        { d: "M160,30 L180,30 L175,260 L155,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}橈骨` },
      ],
    };
    parts[`${side}_wrist`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M70,40 L230,40 L230,260 L70,260 Z", fill: skin, stroke: muscleDark },
        { d: "M100,50 L140,50 L140,140 L100,140 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}尺骨遠位` },
        { d: "M160,50 L200,50 L200,140 L160,140 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}橈骨遠位` },
        { d: "M90,140 L210,140 L210,180 L90,180 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}手根関節` },
        { d: "M100,180 L200,180 L200,240 L100,240 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}手根骨` },
      ],
    };
    parts[`${side}_hand`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,30 L240,30 L240,280 L60,280 Z", fill: skin, stroke: muscleDark },
        { d: "M100,40 L200,40 L200,120 L100,120 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}中手骨` },
        { d: "M80,120 L120,120 L115,200 L85,200 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}示指` },
        { d: "M120,120 L160,120 L155,210 L125,210 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}中指` },
        { d: "M160,120 L200,120 L195,200 L165,200 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}薬指` },
        { d: "M200,120 L230,120 L225,190 L205,190 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}小指` },
        { d: "M70,60 L100,40 L85,130 L65,110 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}母指` },
      ],
    };
    parts[`${side}_hip_joint`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M50,20 L250,20 L260,280 L40,280 Z", fill: skin, stroke: muscleDark },
        { d: "M80,30 L220,30 L220,100 L80,100 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}腸骨` },
        { d: "M120,100 L180,100 C200,100 210,140 210,160 C210,180 200,200 180,200 L120,200 C100,200 90,180 90,160 C90,140 100,100 120,100 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}股関節` },
        { d: "M130,200 L170,200 L170,260 L130,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}大腿骨頭` },
        { d: "M70,120 L120,100 L120,200 L70,180 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}腸腰筋` },
      ],
    };
    parts[`${side}_thigh`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,20 L240,20 L230,280 L70,280 Z", fill: skin, stroke: muscleDark },
        { d: "M80,30 L150,30 L150,250 L90,250 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}大腿四頭筋` },
        { d: "M150,30 L220,30 L210,250 L150,250 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}ハムストリングス` },
        { d: "M70,80 L90,30 L90,250 L70,200 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}内転筋群` },
        { d: "M140,30 L160,30 L160,260 L140,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}大腿骨` },
        { d: "M220,30 L240,60 L230,200 L210,250 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}大腿筋膜張筋` },
      ],
    };
    parts[`${side}_knee`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,20 L240,20 L240,280 L60,280 Z", fill: skin, stroke: muscleDark },
        { d: "M120,30 L180,30 L180,100 L120,100 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}大腿骨遠位` },
        { d: "M110,100 L190,100 L190,120 L110,120 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}膝蓋靭帯` },
        { d: "M125,100 L175,100 C185,100 190,110 190,120 C190,130 185,140 175,140 L125,140 C115,140 110,130 110,120 C110,110 115,100 125,100 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}膝蓋骨` },
        { d: "M120,140 L180,140 L180,200 L120,200 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}膝関節` },
        { d: "M120,200 L180,200 L180,260 L120,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}脛骨近位` },
        { d: "M80,60 L120,30 L120,260 L80,220 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}内側側副靭帯` },
        { d: "M180,30 L220,60 L220,220 L180,260 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}外側側副靭帯` },
      ],
    };
    parts[`${side}_shin`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M70,20 L230,20 L220,280 L80,280 Z", fill: skin, stroke: muscleDark },
        { d: "M80,30 L150,30 L150,260 L90,260 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}前脛骨筋` },
        { d: "M150,30 L220,30 L210,260 L150,260 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}腓腹筋` },
        { d: "M130,30 L155,30 L155,260 L130,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}脛骨` },
        { d: "M180,30 L200,30 L195,260 L175,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}腓骨` },
        { d: "M150,80 L180,80 L175,220 L150,220 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}ヒラメ筋` },
      ],
    };
    parts[`${side}_achilles`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M70,20 L230,20 L230,280 L70,280 Z", fill: skin, stroke: muscleDark },
        { d: "M100,30 L200,30 L200,100 L100,100 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}腓腹筋遠位` },
        { d: "M130,100 L170,100 L165,220 L135,220 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}アキレス腱` },
        { d: "M120,220 L180,220 L180,260 L120,260 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}踵骨` },
      ],
    };
    parts[`${side}_ankle`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M60,20 L240,20 L240,280 L60,280 Z", fill: skin, stroke: muscleDark },
        { d: "M120,30 L180,30 L180,100 L120,100 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}脛骨遠位` },
        { d: "M110,100 L190,100 L190,160 L110,160 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}足関節` },
        { d: "M130,100 L170,100 L170,140 L130,140 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}距骨` },
        { d: "M80,80 L110,100 L110,160 L80,140 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}内果` },
        { d: "M190,100 L220,80 L220,140 L190,160 Z", fill: tendon, stroke: muscleDark, label: `${sideLabel}外果` },
        { d: "M100,160 L200,160 L200,240 L100,240 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}足根骨` },
      ],
    };
    parts[`${side}_foot`] = {
      viewBox: "0 0 300 300",
      paths: [
        { d: "M50,40 L250,40 L260,260 L40,260 Z", fill: skin, stroke: muscleDark },
        { d: "M80,50 L220,50 L220,100 L80,100 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}足根骨` },
        { d: "M90,100 L210,100 L210,160 L90,160 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}中足骨` },
        { d: "M70,160 L110,160 L105,230 L75,230 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}第1趾` },
        { d: "M110,160 L145,160 L140,240 L115,240 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}第2-3趾` },
        { d: "M145,160 L180,160 L175,235 L150,235 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}第4趾` },
        { d: "M180,160 L210,160 L205,225 L185,225 Z", fill: bone, stroke: muscleDark, label: `${sideLabel}第5趾` },
        { d: "M60,80 L80,50 L80,160 L60,140 Z", fill: muscle, stroke: muscleDark, label: `${sideLabel}足底筋膜` },
      ],
    };
  };

  makeLimb("left", "左");
  makeLimb("right", "右");

  return parts[key] ?? {
    viewBox: "0 0 300 300",
    paths: [
      { d: "M50,50 L250,50 L250,250 L50,250 Z", fill: skin, stroke: muscleDark, label: key },
    ],
  };
}

function getPathCenter(d: string): { x: number; y: number } {
  const matches = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
  if (!matches || matches.length < 2) return { x: 150, y: 150 };
  let sumX = 0, sumY = 0, count = 0;
  for (let i = 0; i < matches.length - 1; i += 2) {
    sumX += parseFloat(matches[i]);
    sumY += parseFloat(matches[i + 1]);
    count++;
  }
  return { x: sumX / count, y: sumY / count };
}

interface AnnotationViewerProps {
  bodyPartKey: string;
  data: AnnotationData;
  size?: number; // pixel size, default 200
}

export default function AnnotationViewer({ bodyPartKey, data, size = 200 }: AnnotationViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgData = getBodyPartSVG(bodyPartKey);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of data.strokes) {
      drawStroke(ctx, stroke);
    }
  }, [data]);

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.7;
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  return (
    <div
      className="relative bg-white rounded-lg border overflow-hidden"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={svgData.viewBox}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.85 }}
      >
        {svgData.paths.map((p, i) => (
          <g key={i}>
            <path
              d={p.d}
              fill={p.fill}
              stroke={p.stroke}
              strokeWidth="1"
              opacity="0.6"
            />
            {p.label && (
              <text
                x={getPathCenter(p.d).x}
                y={getPathCenter(p.d).y}
                fontSize="10"
                fill="#555"
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                fontWeight="500"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
