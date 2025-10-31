import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Customer, 
  InsertLead, 
  Lead, 
  PipelineStage, 
  User 
} from '@shared/schema';

// Componentes de formulário
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Ícones
import { CalendarIcon, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Schema para validação do formulário
const leadFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres" }),
  description: z.string().optional(),
  customerId: z.string().min(1, { message: "Selecione um cliente" }),
  stageId: z.string().min(1, { message: "Selecione um estágio" }),
  amount: z.string().optional(),
  productType: z.string().min(1, { message: "Selecione um tipo de produto" }),
  assignedTo: z.string().optional(),
  expiresAt: z.date().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  open: boolean;
  pipelineId: number;
  leadToEdit?: Lead;
  onClose: () => void;
}

const PRODUCT_TYPES = [
  { value: 'consignado', label: 'Empréstimo Consignado' },
  { value: 'pessoal', label: 'Empréstimo Pessoal' },
  { value: 'fgts', label: 'Antecipação de FGTS' },
  { value: 'bolsa-familia', label: 'Empréstimo Bolsa Família' },
  { value: 'energia', label: 'Empréstimo na Conta de Energia' },
];

export default function LeadForm({ open, pipelineId, leadToEdit, onClose }: LeadFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpiryDateOpen, setIsExpiryDateOpen] = useState(false);

  // Query para buscar estágios do pipeline
  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: ['/api/pipeline-stages', pipelineId],
    queryFn: async () => {
      const response = await apiRequest(`/api/pipeline-stages?pipelineId=${pipelineId}`);
      return response.json();
    },
    enabled: open && !!pipelineId,
  });

  // Query para buscar clientes
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await apiRequest('/api/customers');
      return response.json();
    },
    enabled: open,
  });

  // Query para buscar usuários (agentes)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('/api/users');
      return response.json();
    },
    enabled: open,
  });

  // Definir o form com valores padrão e validação
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      title: '',
      description: '',
      customerId: '',
      stageId: '',
      amount: '',
      productType: '',
      assignedTo: '',
      expiresAt: undefined,
    },
  });

  // Preencher o formulário com dados do lead quando estiver editando
  useEffect(() => {
    if (leadToEdit && open) {
      form.reset({
        title: leadToEdit.title,
        description: leadToEdit.description || '',
        customerId: leadToEdit.customerId.toString(),
        stageId: leadToEdit.stageId.toString(),
        amount: leadToEdit.amount ? leadToEdit.amount.toString() : '',
        productType: leadToEdit.productType || '',
        assignedTo: leadToEdit.assignedTo ? leadToEdit.assignedTo.toString() : '',
        expiresAt: leadToEdit.expiresAt ? new Date(leadToEdit.expiresAt) : undefined,
      });
    } else if (open) {
      // Quando o modal abre para um novo lead, pegar o primeiro estágio do pipeline
      if (stages.length > 0) {
        form.setValue('stageId', stages[0].id.toString());
      }
      // Resetar outros campos
      form.reset({
        title: '',
        description: '',
        customerId: '',
        stageId: stages.length > 0 ? stages[0].id.toString() : '',
        amount: '',
        productType: '',
        assignedTo: '',
        expiresAt: undefined,
      });
    }
  }, [leadToEdit, open, stages, form]);

  // Criar ou editar um lead
  const leadMutation = useMutation({
    mutationFn: async (data: LeadFormValues) => {
      // Converter valores para o formato correto
      const payload: any = {
        title: data.title,
        description: data.description || null,
        customerId: parseInt(data.customerId),
        pipelineId,
        stageId: parseInt(data.stageId),
        productType: data.productType,
        status: 'active',
      };

      if (data.amount) {
        payload.amount = parseFloat(data.amount.replace(/[^\d,.]/g, '').replace(',', '.'));
      }

      if (data.assignedTo) {
        payload.assignedTo = parseInt(data.assignedTo);
      }

      if (data.expiresAt) {
        payload.expiresAt = data.expiresAt.toISOString();
      }

      if (leadToEdit) {
        // Editar lead existente
        const response = await apiRequest(`/api/leads/${leadToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return response.json();
      } else {
        // Criar novo lead
        const response = await apiRequest('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', pipelineId] });
      toast({
        title: leadToEdit ? 'Oportunidade atualizada' : 'Oportunidade criada',
        description: leadToEdit 
          ? 'A oportunidade foi atualizada com sucesso!' 
          : 'Nova oportunidade de crédito adicionada com sucesso!',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar a oportunidade. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error saving lead:', error);
    },
  });

  const onSubmit = (data: LeadFormValues) => {
    leadMutation.mutate(data);
  };

  // Formatar valores monetários
  const formatCurrency = (value: string) => {
    if (!value) return '';
    
    // Remove qualquer caractere que não seja número ou vírgula
    const numberValue = value.replace(/[^\d,]/g, '');
    
    // Converte para formato de moeda
    const numericValue = numberValue.replace(',', '.');
    const formattedValue = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(numericValue) || 0);

    return formattedValue;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Pega apenas o valor numérico
    const rawValue = e.target.value.replace(/[^\d,]/g, '');
    
    // Se o valor for vazio, limpa o campo
    if (!rawValue) {
      form.setValue('amount', '');
      return;
    }
    
    // Formata como moeda
    const numericValue = rawValue.replace(',', '.');
    const formattedValue = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(numericValue) || 0);
    
    form.setValue('amount', formattedValue);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {leadToEdit ? 'Editar Oportunidade de Crédito' : 'Nova Oportunidade de Crédito'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título*</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Consignado para João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name || customer.phoneNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de crédito" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Crédito</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="R$ 0,00" 
                        {...field}
                        onChange={handleAmountChange} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estágio*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um estágio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id.toString()}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atribuído para</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Limite</FormLabel>
                    <Popover open={isExpiryDateOpen} onOpenChange={setIsExpiryDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`pl-3 text-left font-normal ${!field.value ? 'text-muted-foreground' : ''}`}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsExpiryDateOpen(false);
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes da oportunidade de crédito"
                      className="h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={leadMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={leadMutation.isPending}
              >
                {leadMutation.isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </span>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}