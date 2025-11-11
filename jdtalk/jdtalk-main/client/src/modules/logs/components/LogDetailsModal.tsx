import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/formatters";
import { IntegrationLog } from "@/modules/dashboard/services/dashboard.api";

type LogDetailsModalProps = {
  log: IntegrationLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LogDetailsModal({ log, open, onOpenChange }: LogDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{log ? `${log.integracao.toUpperCase()} · ${log.acao}` : "Detalhes do log"}</DialogTitle>
        </DialogHeader>
        {log ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{log.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Registrado em</p>
                <p className="font-semibold">{formatDate(log.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Origem</p>
                <p className="font-semibold">
                  {log.detalhes?.context?.origin || log.detalhes?.origin || log.integracao}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Responsável</p>
                <p className="font-semibold">{log.detalhes?.context?.actor || "N/A"}</p>
              </div>
            </div>
            {log.mensagem ? (
              <div>
                <p className="text-muted-foreground">Mensagem</p>
                <p className="font-medium">{log.mensagem}</p>
              </div>
            ) : null}
            <div>
              <p className="text-muted-foreground mb-2">Detalhes</p>
              <ScrollArea className="max-h-64 rounded border bg-muted/20 p-3">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(log.detalhes ?? {}, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecione um log para visualizar os detalhes.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
