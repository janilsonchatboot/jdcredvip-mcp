import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  id: string;
  nome_cliente: string | null;
  cpf: string | null;
  banco: string | null;
  contrato: string | null;
  tipo_operacao: string | null;
  recomendacao: string | null;
  justificativa: string | null;
  prioridade: number | null;
  status_analise: string;
}

type UploadStatus = "idle" | "uploading" | "processing" | "completed" | "error";

interface ExtratoINSSUploaderProps {
  className?: string;
  onCompleted?: (analysis: AnalysisResult | null) => void;
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 24; // ~2 minutos

export function ExtratoINSSUploader({
  className,
  onCompleted,
}: ExtratoINSSUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const pollAttempts = useRef(0);
  const currentRequestId = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resetState = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setAnalysis(null);
    setErrorMessage(null);
    pollAttempts.current = 0;
    currentRequestId.current = null;
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setAnalysis(null);
      setErrorMessage(null);
      setStatus("idle");
      setProgress(0);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setSelectedFile(event.dataTransfer.files[0]);
      setAnalysis(null);
      setErrorMessage(null);
      setStatus("idle");
      setProgress(0);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast({
        title: "Selecione um arquivo",
        description: "Escolha o PDF do extrato do Meu INSS antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    resetState();
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/extratos/inss", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      const requestId: string = payload.id ?? payload.requestId ?? selectedFile.name;
      currentRequestId.current = requestId;
      setProgress(100);
      setStatus("processing");

      await pollForResult(requestId);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error?.message ?? "Falha ao enviar o arquivo.");
      toast({
        title: "Falha no upload",
        description: error?.message ?? "Não foi possível enviar o extrato.",
        variant: "destructive",
      });
    }
  };

  const pollForResult = async (requestId: string) => {
    pollAttempts.current += 1;
    if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
      setStatus("error");
      setErrorMessage("Tempo excedido aguardando análise do extrato.");
      return;
    }

    try {
      const response = await fetch(`/api/extratos/inss/${requestId}`);
      if (response.status === 404) {
        // Ainda processando
        setTimeout(() => pollForResult(requestId), POLL_INTERVAL_MS);
        return;
      }

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result: AnalysisResult = await response.json();
      setAnalysis(result);
      setStatus("completed");
      onCompleted?.(result);
      toast({
        title: "Análise concluída",
        description: result.recomendacao ?? "Verifique os dados gerados para o extrato.",
      });
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error?.message ?? "Falha ao consultar resultado da análise.");
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Extrato INSS (PDF)</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center transition",
            selectedFile ? "bg-muted/50" : "hover:bg-muted/30",
          )}
        >
          <p className="text-sm text-muted-foreground">
            Arraste o PDF do Meu INSS ou clique para selecionar
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            Selecionar arquivo
          </Button>
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              {selectedFile.name}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Status: {statusLabel(status)}
          </div>
          <Button onClick={uploadFile} disabled={status === "uploading" || status === "processing"}>
            {status === "uploading" ? "Enviando..." : status === "processing" ? "Processando..." : "Enviar"}
          </Button>
        </div>

        {status === "uploading" && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {errorMessage && (
          <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
        )}

        {analysis && (
          <div className="mt-6 space-y-2 rounded-lg border p-4 text-sm">
            <div className="font-semibold text-primary">
              Recomendações
            </div>
            <ul className="space-y-1">
              <li>
                <strong>Cliente:</strong> {analysis.nome_cliente ?? "—"}
              </li>
              <li>
                <strong>CPF:</strong> {analysis.cpf ?? "—"}
              </li>
              <li>
                <strong>Banco:</strong> {analysis.banco ?? "—"}
              </li>
              <li>
                <strong>Operação:</strong> {analysis.tipo_operacao ?? "—"}
              </li>
              <li>
                <strong>Recomendação:</strong> {analysis.recomendacao ?? "—"}
              </li>
              <li>
                <strong>Justificativa:</strong> {analysis.justificativa ?? "—"}
              </li>
              <li>
                <strong>Prioridade:</strong> {analysis.prioridade ?? 0}
              </li>
              <li>
                <strong>Status:</strong> {analysis.status_analise}
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function statusLabel(status: UploadStatus): string {
  switch (status) {
    case "idle":
      return "Aguardando";
    case "uploading":
      return "Enviando PDF";
    case "processing":
      return "Processando";
    case "completed":
      return "Concluído";
    case "error":
      return "Erro";
    default:
      return "";
  }
}
