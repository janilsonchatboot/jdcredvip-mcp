import { backendJson, backendPostJson, backendPutJson } from "@/lib/jdcredvip";

export type Followup = {
  id: number;
  clienteNome: string;
  clienteDocumento: string | null;
  contato: string | null;
  responsavel: string | null;
  status: string;
  origem: string | null;
  resultado: string | null;
  descricao: string | null;
  dataAgendada: string | null;
  concluidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type FollowupFilters = {
  status?: string;
  responsavel?: string;
  busca?: string;
};

export type CreateFollowupPayload = {
  clienteNome: string;
  clienteDocumento?: string | null;
  contato?: string | null;
  responsavel?: string | null;
  dataAgendada?: string;
  descricao?: string | null;
  status?: string;
  resultado?: string | null;
  origem?: string | null;
};

export type UpdateFollowupPayload = Partial<
  Pick<Followup, "status" | "resultado" | "descricao" | "responsavel" | "dataAgendada" | "concluidoEm">
>;

const buildQuery = (filters?: FollowupFilters) => {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "todos") params.set("status", filters.status);
  if (filters.responsavel && filters.responsavel !== "todos") params.set("responsavel", filters.responsavel);
  if (filters.busca) params.set("busca", filters.busca);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const listFollowups = (filters?: FollowupFilters) =>
  backendJson<Followup[]>(`/api/followups${buildQuery(filters)}`);

export const createFollowup = (payload: CreateFollowupPayload) =>
  backendPostJson<Followup>("/api/followups", payload);

export const updateFollowup = (id: number, payload: UpdateFollowupPayload) =>
  backendPutJson<Followup>(`/api/followups/${id}`, payload);
