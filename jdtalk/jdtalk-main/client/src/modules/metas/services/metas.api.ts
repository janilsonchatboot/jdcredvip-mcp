import { backendJson, backendPostJson, backendPutJson } from "@/lib/jdcredvip";

export type MetaItem = {
  id: number;
  titulo: string;
  dataReferencia: string;
  publicadoPor: string;
  createdAt: string;
  metrics: {
    totalContratos: number;
    volumeBruto: number;
    volumeLiquido: number;
    comissaoTotal: number;
  };
  metadata: Record<string, unknown> | null;
};

export type MetaProduct = {
  produto: string;
  quantidade: number;
  volumeBruto: number;
  volumeLiquido: number;
  comissao: number;
};

export type PublishMetaPayload = {
  titulo: string;
  dataReferencia: string;
  publicadoPor: string;
  metrics: {
    totalContratos: number;
    volumeBruto: number;
    volumeLiquido: number;
    comissaoTotal: number;
  };
  products: MetaProduct[];
  metadata?: Record<string, unknown> | null;
};

export const listMetas = (limit = 50, offset = 0) =>
  backendJson<MetaItem[]>(`/api/metas?limit=${limit}&offset=${offset}`);

export const publishMeta = (payload: PublishMetaPayload) =>
  backendPostJson("/api/metas/publicar", payload);

export type MetaDetail = {
  meta: MetaItem;
  products: MetaProduct[];
};

export const getMetaById = (id: number) => backendJson<MetaDetail>(`/api/metas/${id}`);

export const updateMeta = (id: number, payload: PublishMetaPayload) =>
  backendPutJson(`/api/metas/${id}`, payload);
