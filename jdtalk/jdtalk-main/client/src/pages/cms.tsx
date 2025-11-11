import { FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { backendDelete, backendJson, backendPostJson, backendPutJson } from "@/lib/jdcredvip";
import { formatDate } from "@/lib/formatters";

type CmsPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CmsFilters = {
  status: string;
  search: string;
};

const DEFAULT_FILTERS: CmsFilters = {
  status: "todos",
  search: ""
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
  { value: "scheduled", label: "Agendado" }
];

const buildQueryString = (filters: CmsFilters) => {
  const params = new URLSearchParams();
  if (filters.status !== "todos") params.set("status", filters.status);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  params.set("limit", "50");
  const query = params.toString();
  return query ? `?${query}` : "";
};

type CmsForm = {
  title: string;
  excerpt: string;
  content: string;
  status: string;
  scheduledFor: string;
};

const DEFAULT_FORM: CmsForm = {
  title: "",
  excerpt: "",
  content: "",
  status: "draft",
  scheduledFor: ""
};

export default function CmsPage() {
  const [filters, setFilters] = useState<CmsFilters>(DEFAULT_FILTERS);
  const [selectedPost, setSelectedPost] = useState<CmsPost | null>(null);
  const [form, setForm] = useState<CmsForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryString = useMemo(() => buildQueryString(filters), [filters]);

  const { data, isLoading, isFetching } = useQuery<CmsPost[]>({
    queryKey: ["jdcredvip", "cms", filters.status, filters.search],
    queryFn: () => backendJson<CmsPost[]>(`/api/cms/posts${queryString}`)
  });

  const posts = data ?? [];

  const resetForm = () => {
    setSelectedPost(null);
    setForm(DEFAULT_FORM);
  };

  const populateForm = (post: CmsPost) => {
    setSelectedPost(post);
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      content: post.content,
      status: post.status,
      scheduledFor: post.scheduledFor ? post.scheduledFor.slice(0, 16) : ""
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt || null,
        content: form.content,
        status: form.status,
        scheduledFor: form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null
      };

      if (selectedPost) {
        await backendPutJson(`/api/cms/posts/${selectedPost.id}`, payload);
        toast({ description: "Post atualizado com sucesso." });
      } else {
        await backendPostJson("/api/cms/posts", payload);
        toast({ description: "Post criado com sucesso." });
      }

      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "cms"] });
      resetForm();
    } catch (error) {
      console.error(error);
      toast({
        description: error instanceof Error ? error.message : "Falha ao salvar post.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost) return;
    setRemoving(true);
    try {
      await backendDelete(`/api/cms/posts/${selectedPost.id}`);
      toast({ description: "Post removido." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "cms"] });
      resetForm();
    } catch (error) {
      console.error(error);
      toast({
        description: error instanceof Error ? error.message : "Falha ao remover post.",
        variant: "destructive"
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AppLayout title="Editor CMS">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestao de posts</CardTitle>
            <CardDescription>Gerencie conteudos publicados no portal JD CRED VIP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar por titulo"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                className="md:col-span-2"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>
                {isFetching
                  ? "Atualizando lista de posts..."
                  : `Total carregado: ${posts.length} post${posts.length === 1 ? "" : "s"}.`}
              </span>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Novo post
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : posts.length === 0 ? (
                <p className="text-sm text-text-secondary">Nenhum post encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titulo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Atualizado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.map((post) => (
                        <TableRow
                          key={post.id}
                          className={selectedPost?.id === post.id ? "bg-neutral-light/40" : ""}
                          onClick={() => populateForm(post)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-text-primary">{post.title}</span>
                              <span className="text-xs text-text-secondary">{post.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {STATUS_OPTIONS.find((option) => option.value === post.status)?.label ?? post.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(post.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedPost ? "Editar post" : "Novo post"}</CardTitle>
              <CardDescription>
                {selectedPost
                  ? `Atualizando conteudo criado em ${formatDate(selectedPost.createdAt)}`
                  : "Informe os campos e publique o conteúdo quando estiver pronto."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titulo</label>
                  <Input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resumo</label>
                  <Textarea
                    value={form.excerpt}
                    onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                    rows={2}
                    placeholder="Resumo curto exibido no portal (opcional)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Conteudo</label>
                  <Textarea
                    value={form.content}
                    onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                    rows={8}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Agendar publicacao</label>
                    <Input
                      type="datetime-local"
                      value={form.scheduledFor}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, scheduledFor: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {selectedPost ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={removing}
                    >
                      {removing ? "Removendo..." : "Remover post"}
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : selectedPost ? "Atualizar post" : "Criar post"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
