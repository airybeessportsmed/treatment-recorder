import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { useSearch } from "wouter";

type OcrRecord = {
  exerciseName: string;
  section: string | null;
  plannedSets: number | null;
  plannedReps: string | null;
  plannedLoad: string | null;
  setResults: string[];
  notes: string | null;
};

export default function PhotoOCR() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preAthleteId = params.get("athleteId") ?? "";
  const preProgramId = params.get("programId") ?? "";

  const [selectedAthleteId, setSelectedAthleteId] = useState(preAthleteId);
  const [selectedProgramId, setSelectedProgramId] = useState(preProgramId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [fileName, setFileName] = useState("photo.jpg");
  const [uploadedPhotoId, setUploadedPhotoId] = useState<number | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{ records: OcrRecord[]; generalNotes: string | null } | null>(null);
  const [step, setStep] = useState<"select" | "upload" | "analyze" | "done">("select");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: athletes } = trpc.athletes.list.useQuery();
  const { data: programs } = trpc.programs.list.useQuery(
    { athleteId: selectedAthleteId ? parseInt(selectedAthleteId) : undefined },
    { enabled: !!selectedAthleteId }
  );

  // 選択されたプログラムの日付を自動で実施日（デフォルト値）としてセットする
  useEffect(() => {
    if (programs && selectedProgramId) {
      const selectedProg = programs.find(p => String(p.id) === selectedProgramId);
      if (selectedProg && selectedProg.date) {
        setDate(selectedProg.date);
      }
    }
  }, [programs, selectedProgramId]);

  const uploadMutation = trpc.photos.upload.useMutation({
    onSuccess: (data) => {
      setUploadedPhotoId(data.photoId ?? null);
      setUploadedPhotoUrl(data.url);
      setStep("analyze");
      toast.success("写真をアップロードしました");
    },
    onError: () => toast.error("アップロードに失敗しました"),
  });

  const analyzeMutation = trpc.photos.analyze.useMutation({
    onSuccess: (data) => {
      setOcrResult(data.parsed);
      setStep("done");
      toast.success("OCR解析が完了しました！記録が自動保存されました");
      utils.records.history.invalidate();
    },
    onError: () => toast.error("OCR解析に失敗しました"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMimeType(file.type);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreviewUrl(result);
      // Extract base64 (remove data:image/...;base64, prefix)
      const base64 = result.split(",")[1];
      setFileBase64(base64);
      setStep("upload");
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!fileBase64 || !selectedAthleteId || !selectedProgramId) {
      toast.error("選手・プログラム・写真を選択してください");
      return;
    }
    uploadMutation.mutate({
      programId: parseInt(selectedProgramId),
      athleteId: parseInt(selectedAthleteId),
      date,
      fileBase64,
      mimeType,
      fileName,
    });
  };

  const handleAnalyze = () => {
    if (!uploadedPhotoId || !uploadedPhotoUrl) return;
    analyzeMutation.mutate({
      photoId: uploadedPhotoId,
      programId: parseInt(selectedProgramId),
      athleteId: parseInt(selectedAthleteId),
      date,
      imageUrl: uploadedPhotoUrl,
    });
  };

  const reset = () => {
    setPreviewUrl(null);
    setFileBase64(null);
    setUploadedPhotoId(null);
    setUploadedPhotoUrl(null);
    setOcrResult(null);
    setStep("select");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">写真OCR 記録読み取り</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        手書きで修正したトレーニング記録用紙を撮影してアップロードすると、AIが自動で記録を読み取ってデータベースに保存します。
      </p>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "select", label: "1. 設定" },
          { key: "upload", label: "2. アップロード" },
          { key: "analyze", label: "3. OCR解析" },
          { key: "done", label: "4. 完了" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <Badge
              variant={step === s.key ? "default" : ["select", "upload", "analyze", "done"].indexOf(step) > i ? "secondary" : "outline"}
              className="text-xs"
            >
              {s.label}
            </Badge>
            {i < 3 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Select */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">対象プログラムを選択</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label>選手</Label>
            <Select value={selectedAthleteId} onValueChange={v => { setSelectedAthleteId(v); setSelectedProgramId(""); }}>
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
            <Label>プログラム</Label>
            <Select
              value={selectedProgramId}
              onValueChange={setSelectedProgramId}
              disabled={!selectedAthleteId}
            >
              <SelectTrigger>
                <SelectValue placeholder="プログラムを選択" />
              </SelectTrigger>
              <SelectContent>
                {programs?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.date} {p.periodCategory ? `· ${p.periodCategory}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>実施日</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Photo Upload */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">写真を選択</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {!previewUrl ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">写真を撮影またはファイルを選択</p>
              <p className="text-sm text-muted-foreground mt-1">
                手書き修正済みの記録用紙を撮影してください
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <img
                src={previewUrl}
                alt="プレビュー"
                className="w-full rounded-lg border max-h-64 object-contain bg-gray-50"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-1" /> 撮り直す
                </Button>
                {step === "upload" && (
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || !selectedAthleteId || !selectedProgramId}
                    className="flex-1"
                  >
                    {uploadMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> アップロード中...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-1" /> アップロード</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Analyze */}
      {(step === "analyze" || step === "done") && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">OCR解析</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {step === "analyze" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  アップロードが完了しました。AIが写真から記録を読み取ります。
                </p>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="w-full"
                >
                  {analyzeMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 解析中（数秒かかります）...</>
                  ) : (
                    "OCR解析を開始する"
                  )}
                </Button>
              </div>
            )}

            {step === "done" && ocrResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">解析完了・記録を自動保存しました</span>
                </div>

                {ocrResult.generalNotes && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-xs text-muted-foreground mb-1">全体メモ</p>
                    <p>{ocrResult.generalNotes}</p>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-2 font-semibold">種目</th>
                        <th className="text-center py-2 px-1 font-semibold">SET</th>
                        <th className="text-center py-2 px-1 font-semibold">回数</th>
                        <th className="text-center py-2 px-1 font-semibold text-muted-foreground">計画負荷</th>
                        <th className="text-center py-2 px-1 font-semibold text-green-700">実績負荷</th>
                        <th className="text-left py-2 px-1 font-semibold">メモ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocrResult.records.map((r, i) => (
                        <tr key={i} className={`border-b last:border-0 ${r.setResults && r.setResults.length > 0 ? "bg-green-50/50" : ""}`}>
                          <td className="py-2 px-2 font-medium">
                            <div>{r.exerciseName}</div>
                            {r.section && <div className="text-muted-foreground text-xs">{r.section}</div>}
                          </td>
                          <td className="text-center py-2 px-1">{r.plannedSets ?? "-"}</td>
                          <td className="text-center py-2 px-1">{r.plannedReps ?? "-"}</td>
                          <td className="text-center py-2 px-1 text-muted-foreground">{r.plannedLoad ?? "-"}</td>
                          <td className="text-center py-2 px-1">
                            {r.setResults && r.setResults.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {r.setResults.map((load, si) => (
                                  <span key={si} className="font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-xs">
                                    {load}kg
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </td>
                          <td className="py-2 px-1 text-muted-foreground">{r.notes ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button variant="outline" onClick={reset} className="w-full">
                  別の写真を読み取る
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
