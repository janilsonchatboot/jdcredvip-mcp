import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import {
  insertPipelineSchema,
  insertPipelineStageSchema,
  insertLeadSchema,
  insertLeadActivitySchema,
  type Lead,
} from '@shared/schema';
import { z } from 'zod';

export function registerPipelineRoutes(app: Express) {
  // === PIPELINES ===
  
  // Get all pipelines
  app.get('/api/pipelines', async (req: Request, res: Response) => {
    try {
      const pipelines = await storage.getPipelines();
      res.json(pipelines);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      res.status(500).json({ error: 'Failed to fetch pipelines' });
    }
  });
  
  // Get pipeline by ID
  app.get('/api/pipelines/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid pipeline ID' });
      }
      
      const pipeline = await storage.getPipeline(id);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
      
      res.json(pipeline);
    } catch (error) {
      console.error('Error fetching pipeline:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline' });
    }
  });
  
  // Create pipeline
  app.post('/api/pipelines', async (req: Request, res: Response) => {
    try {
      const result = insertPipelineSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      const pipeline = await storage.createPipeline(result.data);
      res.status(201).json(pipeline);
    } catch (error) {
      console.error('Error creating pipeline:', error);
      res.status(500).json({ error: 'Failed to create pipeline' });
    }
  });
  
  // Update pipeline
  app.patch('/api/pipelines/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid pipeline ID' });
      }
      
      const pipeline = await storage.getPipeline(id);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
      
      const pipelineUpdateSchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      });
      
      const result = pipelineUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      const updatedPipeline = await storage.updatePipeline(id, result.data);
      res.json(updatedPipeline);
    } catch (error) {
      console.error('Error updating pipeline:', error);
      res.status(500).json({ error: 'Failed to update pipeline' });
    }
  });
  
  // === PIPELINE STAGES ===
  
  // Get all stages for a pipeline
  app.get('/api/pipeline-stages', async (req: Request, res: Response) => {
    try {
      const pipelineId = req.query.pipelineId 
        ? parseInt(req.query.pipelineId as string) 
        : undefined;
        
      if (pipelineId === undefined) {
        return res.status(400).json({ error: 'Pipeline ID is required' });
      }
      
      if (isNaN(pipelineId)) {
        return res.status(400).json({ error: 'Invalid pipeline ID' });
      }
      
      const stages = await storage.getPipelineStages(pipelineId);
      res.json(stages);
    } catch (error) {
      console.error('Error fetching pipeline stages:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline stages' });
    }
  });
  
  // Get stage by ID
  app.get('/api/pipeline-stages/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid stage ID' });
      }
      
      const stage = await storage.getPipelineStage(id);
      if (!stage) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      
      res.json(stage);
    } catch (error) {
      console.error('Error fetching pipeline stage:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline stage' });
    }
  });
  
  // Create stage
  app.post('/api/pipeline-stages', async (req: Request, res: Response) => {
    try {
      const result = insertPipelineStageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Verificar se o pipeline existe
      const pipeline = await storage.getPipeline(result.data.pipelineId);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
      
      const stage = await storage.createPipelineStage(result.data);
      res.status(201).json(stage);
    } catch (error) {
      console.error('Error creating pipeline stage:', error);
      res.status(500).json({ error: 'Failed to create pipeline stage' });
    }
  });
  
  // Update stage
  app.patch('/api/pipeline-stages/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid stage ID' });
      }
      
      const stage = await storage.getPipelineStage(id);
      if (!stage) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      
      const stageUpdateSchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        order: z.number().optional(),
        color: z.string().optional(),
      });
      
      const result = stageUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      const updatedStage = await storage.updatePipelineStage(id, result.data);
      res.json(updatedStage);
    } catch (error) {
      console.error('Error updating pipeline stage:', error);
      res.status(500).json({ error: 'Failed to update pipeline stage' });
    }
  });
  
  // === LEADS (OPORTUNIDADES) ===
  
  // Get all leads for a pipeline
  app.get('/api/leads', async (req: Request, res: Response) => {
    try {
      const pipelineId = req.query.pipelineId 
        ? parseInt(req.query.pipelineId as string) 
        : undefined;
        
      const stageId = req.query.stageId 
        ? parseInt(req.query.stageId as string) 
        : undefined;
        
      const customerId = req.query.customerId 
        ? parseInt(req.query.customerId as string) 
        : undefined;
      
      let leads;
      
      if (pipelineId) {
        leads = await storage.getLeadsByPipeline(pipelineId);
      } else if (stageId) {
        leads = await storage.getLeadsByStage(stageId);
      } else if (customerId) {
        leads = await storage.getLeadsByCustomer(customerId);
      } else {
        return res.status(400).json({ error: 'At least one filter is required (pipelineId, stageId, or customerId)' });
      }
      
      res.json(leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });
  
  // Get lead by ID
  app.get('/api/leads/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid lead ID' });
      }
      
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json(lead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: 'Failed to fetch lead' });
    }
  });
  
  // Create lead
  app.post('/api/leads', async (req: Request, res: Response) => {
    try {
      const result = insertLeadSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Verificar se o pipeline e o estágio existem
      const pipeline = await storage.getPipeline(result.data.pipelineId);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
      
      const stage = await storage.getPipelineStage(result.data.stageId);
      if (!stage) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      
      // Verificar se o cliente existe
      const customer = await storage.getCustomer(result.data.customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      const lead = await storage.createLead(result.data);
      res.status(201).json(lead);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  });
  
  // Update lead
  app.patch('/api/leads/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid lead ID' });
      }
      
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      const parseDateInput = (value: unknown) => {
        if (value === undefined) {
          return undefined;
        }
        if (value === null) {
          return null;
        }
        if (value instanceof Date) {
          return value;
        }
        const date = new Date(value as string);
        return Number.isNaN(date.getTime()) ? null : date;
      };

      const leadUpdateSchema = z.object({
        stageId: z.number().optional(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        amount: z.preprocess(
          (value) => {
            if (value === undefined) {
              return undefined;
            }
            if (value === null) {
              return null;
            }
            return value.toString();
          },
          z.string().nullable().optional(),
        ),
        productType: z.string().nullable().optional(),
        assignedTo: z.number().nullable().optional(),
        status: z.enum(['active', 'won', 'lost']).optional(),
        expiresAt: z.preprocess(parseDateInput, z.date().nullable().optional()),
        wonAt: z.preprocess(parseDateInput, z.date().nullable().optional()),
        lostAt: z.preprocess(parseDateInput, z.date().nullable().optional()),
        lostReason: z.string().nullable().optional(),
      });
      
      const result = leadUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const payload = result.data as Partial<Lead>;

      // Se o estágio está sendo atualizado, verificar se existe
      if (payload.stageId) {
        const stage = await storage.getPipelineStage(payload.stageId);
        if (!stage) {
          return res.status(404).json({ error: 'Stage not found' });
        }
      }

      // Atualizar status e datas relacionadas
      if (payload.status) {
        if (payload.status === 'won' && !payload.wonAt) {
          payload.wonAt = new Date();
        } else if (payload.status === 'lost' && !payload.lostAt) {
          payload.lostAt = new Date();
        }
      }

      const updatedLead = await storage.updateLead(id, payload);
      res.json(updatedLead);
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });
  
  // === LEAD ACTIVITIES (ATIVIDADES) ===
  
  // Get activities for a lead
  app.get('/api/lead-activities', async (req: Request, res: Response) => {
    try {
      const leadId = req.query.leadId 
        ? parseInt(req.query.leadId as string) 
        : undefined;
        
      if (!leadId) {
        return res.status(400).json({ error: 'Lead ID is required' });
      }
      
      if (isNaN(leadId)) {
        return res.status(400).json({ error: 'Invalid lead ID' });
      }
      
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      const activities = await storage.getLeadActivities(leadId);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching lead activities:', error);
      res.status(500).json({ error: 'Failed to fetch lead activities' });
    }
  });
  
  // Create activity
  app.post('/api/lead-activities', async (req: Request, res: Response) => {
    try {
      const result = insertLeadActivitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Verificar se o lead existe
      const lead = await storage.getLead(result.data.leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      // Verificar se o usuário existe
      const user = await storage.getUser(result.data.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const activity = await storage.createLeadActivity(result.data);
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error creating lead activity:', error);
      res.status(500).json({ error: 'Failed to create lead activity' });
    }
  });
}