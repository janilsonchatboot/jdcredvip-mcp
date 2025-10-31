import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Pipeline } from '@shared/schema';
import PipelineKanban from '@/components/PipelineKanban';
import AppLayout from "@/components/AppLayout";

// Componentes de UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Ícones
import { PlusCircle } from 'lucide-react';

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<string>('');

  // Buscar pipelines disponíveis
  const { data: pipelines = [], isLoading } = useQuery<Pipeline[]>({
    queryKey: ['/api/pipelines'],
    queryFn: async () => {
      const response = await fetch('/api/pipelines', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Falha ao buscar pipelines');
      }
      return response.json();
    },
  });

  // Definir o pipeline ativo automaticamente quando os dados são carregados
  React.useEffect(() => {
    if (pipelines.length > 0 && !activeTab) {
      setActiveTab(pipelines[0].id.toString());
    }
  }, [pipelines, activeTab]);

  const content = () => {
    if (isLoading) {
      return (
        <div className="p-6">
          <Skeleton className="h-12 w-64 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[70vh] w-full" />
          </div>
        </div>
      );
    }

    if (pipelines.length === 0) {
      return (
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
            <h1 className="text-2xl font-bold">Nenhum Pipeline Encontrado</h1>
            <p className="text-muted-foreground max-w-md">
              Não há pipelines configurados no sistema. Crie um novo pipeline para começar a gerenciar suas oportunidades.
            </p>
            <CreatePipelineDialog />
          </div>
        </div>
      );
    }

    return (
      <div className="p-1">
        <div className="flex justify-between items-center mb-4 px-4">
          <h1 className="text-2xl font-bold">Pipelines</h1>
          <CreatePipelineDialog />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
              {pipelines.map(pipeline => (
                <TabsTrigger
                  key={pipeline.id}
                  value={pipeline.id.toString()}
                  className="py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
                >
                  {pipeline.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {pipelines.map(pipeline => (
            <TabsContent key={pipeline.id} value={pipeline.id.toString()} className="p-0 mt-0">
              <PipelineKanban pipelineId={pipeline.id} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  return (
    <AppLayout title="Pipeline de Crédito">
      {content()}
    </AppLayout>
  );
}

// Diálogo para criar um novo pipeline
function CreatePipelineDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      
      const response = await fetch('/api/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar pipeline');
      }
      
      // Atualizar a lista de pipelines
      window.location.reload();
    } catch (error) {
      console.error('Erro ao criar pipeline:', error);
      alert('Não foi possível criar o pipeline. Tente novamente.');
    } finally {
      setIsSubmitting(false);
      setOpen(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Pipeline
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Pipeline</DialogTitle>
          <DialogDescription>
            Adicione um novo pipeline para gerenciar oportunidades de crédito.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Pipeline de Empréstimos INSS"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o propósito deste pipeline..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Pipeline'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}