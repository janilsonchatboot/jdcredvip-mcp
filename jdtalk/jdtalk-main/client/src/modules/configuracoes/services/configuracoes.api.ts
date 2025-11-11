import { backendDelete, backendJson, backendPostJson, backendPutJson } from "@/lib/jdcredvip";

export type Banco = {
  id: number;
  nome: string;
  apelido: string | null;
  codigo: string | null;
  taxaMedia: number | null;
  ativo: boolean;
  createdAt: string;
};

export type BancoPayload = {
  nome: string;
  apelido?: string | null;
  codigo?: string | null;
  taxaMedia?: string | number | null;
  ativo?: boolean;
};

export const listBancos = () => backendJson<Banco[]>("/api/config/bancos");

export const saveBanco = (payload: BancoPayload, id?: number) => {
  const body = {
    nome: payload.nome,
    apelido: payload.apelido ?? null,
    codigo: payload.codigo ?? null,
    taxaMedia: payload.taxaMedia,
    ativo: payload.ativo ?? true
  };
  if (id) {
    return backendPutJson<Banco>(`/api/config/bancos/${id}`, body);
  }
  return backendPostJson<Banco>("/api/config/bancos", body);
};

export const deleteBanco = (id: number) => backendDelete(`/api/config/bancos/${id}`);

export type Promotora = {
  id: number;
  nome: string;
  documento: string | null;
  responsavel: string | null;
  contato: string | null;
  status: string;
  createdAt: string;
};

export type PromotoraPayload = {
  nome: string;
  documento?: string | null;
  responsavel?: string | null;
  contato?: string | null;
  status: string;
};

export const listPromotoras = () => backendJson<Promotora[]>("/api/config/promotoras");

export const savePromotora = (payload: PromotoraPayload, id?: number) => {
  const body = {
    nome: payload.nome,
    documento: payload.documento ?? null,
    responsavel: payload.responsavel ?? null,
    contato: payload.contato ?? null,
    status: payload.status
  };
  if (id) {
    return backendPutJson<Promotora>(`/api/config/promotoras/${id}`, body);
  }
  return backendPostJson<Promotora>("/api/config/promotoras", body);
};

export const deletePromotora = (id: number) => backendDelete(`/api/config/promotoras/${id}`);

export type ProdutoConfiguracao = {
  id: number;
  nome: string;
  tipo: string;
  ativo: boolean;
  bancoId: number | null;
  bancoNome: string | null;
  promotoraId: number | null;
  promotoraNome: string | null;
  taxaMedia: number | null;
  comissaoPercent: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ProdutoPayload = {
  nome: string;
  tipo?: string;
  bancoId?: number | null;
  promotoraId?: number | null;
  taxaMedia?: string | number | null;
  comissaoPercent?: string | number | null;
  ativo: boolean;
};

export const listProdutos = () => backendJson<ProdutoConfiguracao[]>("/api/config/produtos");

export const saveProduto = (payload: ProdutoPayload, id?: number) => {
  const body = {
    nome: payload.nome,
    tipo: payload.tipo || "generico",
    bancoId: payload.bancoId ?? null,
    promotoraId: payload.promotoraId ?? null,
    taxaMedia: payload.taxaMedia ?? null,
    comissaoPercent: payload.comissaoPercent ?? null,
    ativo: payload.ativo
  };
  if (id) {
    return backendPutJson<ProdutoConfiguracao>(`/api/config/produtos/${id}`, body);
  }
  return backendPostJson<ProdutoConfiguracao>("/api/config/produtos", body);
};

export const deleteProduto = (id: number) => backendDelete(`/api/config/produtos/${id}`);

export type CoreModuleInfo = {
  id: string;
  name: string;
  owner?: string;
  status: string;
  version?: string;
  endpoints?: string[];
  description?: string;
};

export type CoreStatusResponse = {
  version: string;
  manifestUpdatedAt: string | null;
  modules: CoreModuleInfo[];
  uptimeSeconds: number;
  nodeVersion: string;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  logsProcessados: number;
  timestamp: string;
};

export const fetchCoreStatus = () => backendJson<CoreStatusResponse>("/api/core/status");
