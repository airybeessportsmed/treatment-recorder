"use client";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface ParsedProgram {
  athleteName: string;
  athleteNumber?: number;
  position?: string;
  phase?: string;
  date?: string;
  periodCategory?: string;
  goal?: string;
  sections: Array<{
    category: string;
    exercises: Array<{
      name: string;
      sets?: number;
      reps?: string;
      load?: string;
      attention?: string;
    }>;
  }>;
}

export default function ProgramImport() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPrograms, setParsedPrograms] = useState<ParsedProgram[]>([]);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const parsePDFMutation = trpc.programs.parsePDF.useMutation({
    onSuccess: (data) => {
      setParsedPrograms(data.programs);
      setIsParsing(false);
      setPreviewDialogOpen(true);
      toast.success(`${data.programs.length}名の選手プログラムを読み込みました`);
    },
    onError: (e) => {
      toast.error("PDFの解析に失敗しました: " + e.message);
      setIsParsing(false);
    },
  });

  const parseExcelMutation = trpc.programs.parseExcel.useMutation({
    onSuccess: (data) => {
      setParsedPrograms(data.programs);
      setIsParsing(false);
      setPreviewDialogOpen(true);
      toast.success(`${data.programs.length}名の選手プログラムを読み込みました`);
    },
    onError: (e) => {
      toast.error("Excelの解析に失敗しました: " + e.message);
      setIsParsing(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPDF = file.name.toLowerCase().endsWith(".pdf");
    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");

    if (!isPDF && !isExcel) {
      toast.error("PDFまたはExcelファイルをアップロードしてください");
      return;
    }

    setSelectedFileName(file.name);
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(",")[1];

      if (isPDF) {
        parsePDFMutation.mutate({ fileBase64: base64 });
      } else if (isExcel) {
        parseExcelMutation.mutate({ fileBase64: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProceedToConfirm = () => {
    if (parsedPrograms.length === 0) {
      toast.error("プログラムが読み込まれていません");
      return;
    }

    sessionStorage.setItem(
      "importedPrograms",
      JSON.stringify(parsedPrograms)
    );
    sessionStorage.setItem("importedFileName", selectedFileName);
    setPreviewDialogOpen(false);
    setLocation("/training/programs/import/confirm");
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>プログラムをインポート</CardTitle>
          <CardDescription>
            PDFまたはExcelファイルから複数選手のプログラムを一括読み込みできます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* ファイルアップロード */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">ファイルをドラッグ&ドロップ</p>
              <p className="text-sm text-muted-foreground mb-4">
                またはクリックして選択
              </p>
              <p className="text-xs text-muted-foreground">
                対応形式: PDF (.pdf), Excel (.xlsx, .xls)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* 選択されたファイル */}
            {selectedFileName && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedFileName}</p>
                  {isParsing && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      解析中...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 読み込み結果プレビュー */}
            {parsedPrograms.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-medium">
                    {parsedPrograms.length}名の選手プログラムを読み込みました
                  </p>
                </div>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {parsedPrograms.map((prog, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedProgramIndex(idx);
                        setPreviewDialogOpen(true);
                      }}
                    >
                      <p className="font-medium text-sm">
                        {prog.athleteName}
                        {prog.athleteNumber && (
                          <Badge variant="outline" className="ml-2">
                            #{prog.athleteNumber}
                          </Badge>
                        )}
                      </p>
                      {prog.position && (
                        <p className="text-xs text-muted-foreground">
                          {prog.position}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {prog.sections.length}セクション,{" "}
                        {prog.sections.reduce((sum, s) => sum + s.exercises.length, 0)}種目
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 注意事項 */}
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">読み込み後の修正について</p>
                <p>
                  次の画面で各選手のプログラムを確認・修正できます。種目名は手書き入力または種目マスタから選択できます。
                </p>
              </div>
            </div>

            {/* アクション */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFileName("");
                  setParsedPrograms([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleProceedToConfirm}
                disabled={parsedPrograms.length === 0 || isParsing}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                修正・確認へ進む
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* プレビューダイアログ */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>プログラムプレビュー</DialogTitle>
            <DialogDescription>
              読み込まれたプログラムの内容を確認できます
            </DialogDescription>
          </DialogHeader>

          {selectedProgramIndex !== null && parsedPrograms[selectedProgramIndex] && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {/* 選手情報 */}
                <div className="space-y-2 pb-4 border-b">
                  <h3 className="font-semibold text-lg">
                    {parsedPrograms[selectedProgramIndex].athleteName}
                    {parsedPrograms[selectedProgramIndex].athleteNumber && (
                      <Badge variant="outline" className="ml-2">
                        #{parsedPrograms[selectedProgramIndex].athleteNumber}
                      </Badge>
                    )}
                  </h3>
                  {parsedPrograms[selectedProgramIndex].position && (
                    <p className="text-sm text-muted-foreground">
                      ポジション: {parsedPrograms[selectedProgramIndex].position}
                    </p>
                  )}
                  {parsedPrograms[selectedProgramIndex].phase && (
                    <p className="text-sm text-muted-foreground">
                      PHASE: {parsedPrograms[selectedProgramIndex].phase}
                    </p>
                  )}
                </div>

                {/* セクション別種目 */}
                {parsedPrograms[selectedProgramIndex].sections.map((section, secIdx) => (
                  <div key={secIdx} className="space-y-2">
                    <h4 className="font-medium text-sm bg-muted p-2 rounded">
                      {section.category}
                    </h4>
                    <div className="space-y-1 pl-4">
                      {section.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="text-sm">
                          <p className="font-medium">{ex.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.sets && `${ex.sets}SET`}
                            {ex.reps && ` × ${ex.reps}`}
                            {ex.load && ` / ${ex.load}`}
                            {ex.attention && ` (${ex.attention})`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewDialogOpen(false)}
            >
              閉じる
            </Button>
            <Button onClick={handleProceedToConfirm}>
              修正・確認へ進む
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
