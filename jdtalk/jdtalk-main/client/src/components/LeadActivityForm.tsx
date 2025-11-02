import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { InsertLeadActivity } from '@shared/schema';

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
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Schema para validação do formulário
const activityFormSchema = z.object({
  type: z.string().min(1, { message: "Selecione um tipo de atividade" }),
  content: z.string().min(3, { message: "Descrição deve ter pelo menos 3 caracteres" }),
  scheduledAt: z.date().optional(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

interface LeadActivityFormProps {
  open: boolean;
  leadId: number;
  onClose: () => void;
}

const ACTIVITY_TYPES = [
  { value: 'note', label: 'Anotação' },
  { value: 'call', label: 'Ligação' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'task', label: 'Tarefa' },
  { value: 'email', label: 'E-mail' },
];

export default function LeadActivityForm({ open, leadId, onClose }: LeadActivityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Definir o form com valores padrão e validação
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: 'note',
      content: '',
      scheduledAt: undefined,
    },
  });

  // Criar uma atividade para o lead
  const activityMutation = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      // Get the user ID from somewhere (session, local storage, etc.)
      // For now, we'll just use 1 as a placeholder
      const userId = 1; // TODO: get from auth context
      
      const payload: any = {
        leadId,
        userId,
        type: data.type,
        content: data.content,
      };

      if (data.scheduledAt) {
        payload.scheduledAt = data.scheduledAt.toISOString();
      }

      const response = await apiRequest('/api/lead-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lead-activities', leadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
      toast({
        title: 'Atividade registrada',
        description: 'A atividade foi adicionada com sucesso!',
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar a atividade. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error saving activity:', error);
    },
  });

  const onSubmit = (data: ActivityFormValues) => {
    activityMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Registrar Atividade
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Atividade*</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((type) => (
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

            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Programada</FormLabel>
                  <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`pl-3 text-left font-normal ${!field.value ? 'text-muted-foreground' : ''}`}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: ptBR })
                          ) : (
                            <span>Selecione uma data (opcional)</span>
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
                          setIsDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição*</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes da atividade"
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
                disabled={activityMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={activityMutation.isPending}
              >
                {activityMutation.isPending ? (
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