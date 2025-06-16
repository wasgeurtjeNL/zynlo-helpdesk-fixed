import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { authManager } from '../auth-manager';
import type { Database } from '../types/database.types';

type AutomationRule = Database['public']['Tables']['automation_rules']['Row'];
type AutomationCondition = Database['public']['Tables']['automation_conditions']['Row'];
type AutomationAction = Database['public']['Tables']['automation_actions']['Row'];
type AutomationExecutionLog = Database['public']['Tables']['automation_execution_logs']['Row'];
type AutomationTemplate = Database['public']['Tables']['automation_templates']['Row'];

// Types for creating/updating rules
export interface CreateRuleParams {
  name: string;
  description?: string;
  trigger_type: string;
  priority?: number;
  is_active?: boolean;
  conditions: CreateConditionParams[];
  actions: CreateActionParams[];
}

export interface CreateConditionParams {
  field: string;
  operator: string;
  value: any;
  condition_group?: number;
  condition_type?: 'all' | 'any';
}

export interface CreateActionParams {
  action_type: string;
  action_data: Record<string, any>;
  execution_order?: number;
}

// Hook for fetching automation rules
export function useAutomationRules() {
  return useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select(
          `
          *,
          automation_conditions(*)
          automation_actions(*)
        `
        )
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Hook for fetching a single rule with details
export function useAutomationRule(ruleId: string) {
  return useQuery({
    queryKey: ['automation-rule', ruleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select(
          `
          *,
          automation_conditions(*),
          automation_actions(*)
        `
        )
        .eq('id', ruleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ruleId,
  });
}

// Hook for creating a new automation rule
export function useCreateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateRuleParams) => {
      const user = await authManager.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Create the rule
      const { data: rule, error: ruleError } = await supabase
        .from('automation_rules')
        .insert({
          name: params.name,
          description: params.description,
          trigger_type: params.trigger_type,
          priority: params.priority || 0,
          is_active: params.is_active ?? true,
          created_by: user.id,
          organization_id: userData?.organization_id,
        })
        .select()
        .single();

      if (ruleError) throw ruleError;

      // Create conditions
      if (params.conditions.length > 0) {
        const { error: conditionsError } = await supabase.from('automation_conditions').insert(
          params.conditions.map((condition) => ({
            rule_id: rule.id,
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
            condition_group: condition.condition_group || 0,
            condition_type: condition.condition_type || 'all',
          }))
        );

        if (conditionsError) throw conditionsError;
      }

      // Create actions
      if (params.actions.length > 0) {
        const { error: actionsError } = await supabase.from('automation_actions').insert(
          params.actions.map((action, index) => ({
            rule_id: rule.id,
            action_type: action.action_type,
            action_data: action.action_data,
            execution_order: action.execution_order ?? index,
          }))
        );

        if (actionsError) throw actionsError;
      }

      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });
}

// Hook for updating an automation rule
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      updates,
      conditions,
      actions,
    }: {
      ruleId: string;
      updates: Partial<AutomationRule>;
      conditions?: CreateConditionParams[];
      actions?: CreateActionParams[];
    }) => {
      // Update the rule
      const { error: ruleError } = await supabase
        .from('automation_rules')
        .update(updates)
        .eq('id', ruleId);

      if (ruleError) throw ruleError;

      // If conditions are provided, replace them
      if (conditions) {
        // Delete existing conditions
        await supabase.from('automation_conditions').delete().eq('rule_id', ruleId);

        // Insert new conditions
        if (conditions.length > 0) {
          const { error: conditionsError } = await supabase.from('automation_conditions').insert(
            conditions.map((condition) => ({
              rule_id: ruleId,
              field: condition.field,
              operator: condition.operator,
              value: condition.value,
              condition_group: condition.condition_group || 0,
              condition_type: condition.condition_type || 'all',
            }))
          );

          if (conditionsError) throw conditionsError;
        }
      }

      // If actions are provided, replace them
      if (actions) {
        // Delete existing actions
        await supabase.from('automation_actions').delete().eq('rule_id', ruleId);

        // Insert new actions
        if (actions.length > 0) {
          const { error: actionsError } = await supabase.from('automation_actions').insert(
            actions.map((action, index) => ({
              rule_id: ruleId,
              action_type: action.action_type,
              action_data: action.action_data,
              execution_order: action.execution_order ?? index,
            }))
          );

          if (actionsError) throw actionsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      queryClient.invalidateQueries({ queryKey: ['automation-rule'] });
    },
  });
}

// Hook for deleting an automation rule
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('automation_rules').delete().eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });
}

// Hook for toggling rule active status
export function useToggleAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });
}

// Hook for fetching execution logs
export function useAutomationLogs(ruleId?: string) {
  return useQuery({
    queryKey: ['automation-logs', ruleId],
    queryFn: async () => {
      let query = supabase
        .from('automation_execution_logs')
        .select(
          `
          *,
          automation_rules!inner(name),
          tickets(number, subject)
        `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

// Hook for fetching automation templates
export function useAutomationTemplates() {
  return useQuery({
    queryKey: ['automation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_templates')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}

// Hook for creating a rule from template
export function useCreateRuleFromTemplate() {
  const createRule = useCreateAutomationRule();

  return useMutation({
    mutationFn: async ({
      templateId,
      customizations,
    }: {
      templateId: string;
      customizations?: Partial<CreateRuleParams>;
    }) => {
      // Fetch the template
      const { data: template, error } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      const templateData = template.template_data as any;

      // Create rule from template with customizations
      const ruleParams: CreateRuleParams = {
        name: customizations?.name || template.name,
        description: customizations?.description || template.description,
        trigger_type: templateData.trigger_type,
        conditions: customizations?.conditions || templateData.conditions || [],
        actions: customizations?.actions || templateData.actions || [],
        priority: customizations?.priority || 0,
        is_active: customizations?.is_active ?? true,
      };

      return createRule.mutateAsync(ruleParams);
    },
  });
}

// Hook for testing automation rules
export function useTestAutomationRule() {
  return useMutation({
    mutationFn: async ({ ruleId, ticketId }: { ruleId: string; ticketId: string }) => {
      // This would call a Supabase function to test the rule
      const { data, error } = await supabase.rpc('test_automation_rule', {
        p_rule_id: ruleId,
        p_ticket_id: ticketId,
      });

      if (error) throw error;
      return data;
    },
  });
}
