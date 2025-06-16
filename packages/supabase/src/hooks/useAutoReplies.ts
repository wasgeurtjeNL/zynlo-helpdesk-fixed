import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';

// Types for auto-reply system
export interface AutoReplyRule {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type:
    | 'first_message'
    | 'keyword_match'
    | 'out_of_hours'
    | 'channel_specific'
    | 'priority_based';
  priority: number;
  channel_types: string[];
  business_hours: any;
  keywords: string[];
  keyword_match_type: 'any' | 'all' | 'exact';
  created_by?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  auto_reply_templates?: AutoReplyTemplate[];
  auto_reply_conditions?: AutoReplyCondition[];
}

export interface AutoReplyTemplate {
  id: string;
  rule_id: string;
  language: string;
  subject_template?: string;
  content_template: string;
  content_type: 'text/plain' | 'text/html';
  variables: Record<string, any>;
  execution_order: number;
  created_at: string;
  updated_at: string;
}

export interface AutoReplyCondition {
  id: string;
  rule_id: string;
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'greater_than'
    | 'less_than'
    | 'in'
    | 'not_in';
  value: any;
  condition_group: number;
  condition_type: 'all' | 'any';
  created_at: string;
}

export interface AutoReplyExecutionLog {
  id: string;
  rule_id: string;
  ticket_id?: string;
  message_id?: string;
  conversation_id?: string;
  trigger_type: string;
  conditions_met: boolean;
  template_used?: string;
  sent_message_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  response_sent: boolean;
  error_message?: string;
  execution_time_ms?: number;
  metadata: Record<string, any>;
  created_at: string;
}

// Types for creating/updating rules
export interface CreateAutoReplyRuleParams {
  name: string;
  description?: string;
  trigger_type: AutoReplyRule['trigger_type'];
  priority?: number;
  is_active?: boolean;
  channel_types?: string[];
  business_hours?: any;
  keywords?: string[];
  keyword_match_type?: AutoReplyRule['keyword_match_type'];
  templates: CreateAutoReplyTemplateParams[];
  conditions?: CreateAutoReplyConditionParams[];
}

export interface CreateAutoReplyTemplateParams {
  language: string;
  subject_template?: string;
  content_template: string;
  content_type?: 'text/plain' | 'text/html';
  variables?: Record<string, any>;
  execution_order?: number;
}

export interface CreateAutoReplyConditionParams {
  field: string;
  operator: AutoReplyCondition['operator'];
  value: any;
  condition_group?: number;
  condition_type?: 'all' | 'any';
}

// Hook for fetching auto-reply rules
export function useAutoReplyRules() {
  return useQuery({
    queryKey: ['auto-reply-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_reply_rules')
        .select(
          `
          *,
          auto_reply_templates(*),
          auto_reply_conditions(*)
        `
        )
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutoReplyRule[];
    },
  });
}

// Hook for fetching a single auto-reply rule
export function useAutoReplyRule(ruleId: string) {
  return useQuery({
    queryKey: ['auto-reply-rule', ruleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_reply_rules')
        .select(
          `
          *,
          auto_reply_templates(*),
          auto_reply_conditions(*)
        `
        )
        .eq('id', ruleId)
        .single();

      if (error) throw error;
      return data as AutoReplyRule;
    },
    enabled: !!ruleId,
  });
}

// Hook for creating a new auto-reply rule
export function useCreateAutoReplyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAutoReplyRuleParams) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.user.id)
        .single();

      // Create the rule
      const { data: rule, error: ruleError } = await supabase
        .from('auto_reply_rules')
        .insert({
          name: params.name,
          description: params.description,
          trigger_type: params.trigger_type,
          priority: params.priority || 0,
          is_active: params.is_active ?? true,
          channel_types: params.channel_types || [],
          business_hours: params.business_hours || { enabled: false },
          keywords: params.keywords || [],
          keyword_match_type: params.keyword_match_type || 'any',
          created_by: user.user.id,
          organization_id: userData?.organization_id,
        })
        .select()
        .single();

      if (ruleError) throw ruleError;

      // Create templates
      if (params.templates.length > 0) {
        const { error: templatesError } = await supabase.from('auto_reply_templates').insert(
          params.templates.map((template, index) => ({
            rule_id: rule.id,
            language: template.language,
            subject_template: template.subject_template,
            content_template: template.content_template,
            content_type: template.content_type || 'text/html',
            variables: template.variables || {},
            execution_order: template.execution_order ?? index,
          }))
        );

        if (templatesError) throw templatesError;
      }

      // Create conditions
      if (params.conditions && params.conditions.length > 0) {
        const { error: conditionsError } = await supabase.from('auto_reply_conditions').insert(
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

      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply-rules'] });
    },
  });
}

// Hook for updating an auto-reply rule
export function useUpdateAutoReplyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      updates,
      templates,
      conditions,
    }: {
      ruleId: string;
      updates: Partial<AutoReplyRule>;
      templates?: CreateAutoReplyTemplateParams[];
      conditions?: CreateAutoReplyConditionParams[];
    }) => {
      // Update the rule
      const { error: ruleError } = await supabase
        .from('auto_reply_rules')
        .update(updates)
        .eq('id', ruleId);

      if (ruleError) throw ruleError;

      // If templates are provided, replace them completely
      if (templates) {
        try {
          // First, delete all existing templates for this rule
          const { error: deleteError } = await supabase
            .from('auto_reply_templates')
            .delete()
            .eq('rule_id', ruleId);

          if (deleteError) {
            console.error('Failed to delete existing templates:', deleteError);
            throw new Error(`Failed to delete existing templates: ${deleteError.message}`);
          }

          // Then insert all new templates
          if (templates.length > 0) {
            const { error: insertError } = await supabase.from('auto_reply_templates').insert(
              templates.map((template, index) => ({
                rule_id: ruleId,
                language: template.language,
                subject_template: template.subject_template,
                content_template: template.content_template,
                content_type: template.content_type || 'text/html',
                variables: template.variables || {},
                execution_order: template.execution_order ?? index,
              }))
            );

            if (insertError) {
              console.error('Failed to insert new templates:', insertError);
              throw new Error(`Failed to insert new templates: ${insertError.message}`);
            }
          }
        } catch (error) {
          console.error('Template update operation failed:', error);
          throw error;
        }
      }

      // If conditions are provided, replace them
      if (conditions) {
        try {
          // First, try to delete existing conditions
          const { error: deleteError } = await supabase
            .from('auto_reply_conditions')
            .delete()
            .eq('rule_id', ruleId);

          if (deleteError) {
            console.error('Failed to delete existing conditions:', deleteError);
            throw new Error(`Failed to update conditions: ${deleteError.message}`);
          }

          // Insert new conditions
          if (conditions.length > 0) {
            const { error: conditionsError } = await supabase.from('auto_reply_conditions').insert(
              conditions.map((condition) => ({
                rule_id: ruleId,
                field: condition.field,
                operator: condition.operator,
                value: condition.value,
                condition_group: condition.condition_group || 0,
                condition_type: condition.condition_type || 'all',
              }))
            );

            if (conditionsError) {
              console.error('Failed to insert new conditions:', conditionsError);
              throw new Error(`Failed to create conditions: ${conditionsError.message}`);
            }
          }
        } catch (error) {
          console.error('Conditions update operation failed:', error);
          throw error;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply-rules'] });
      queryClient.invalidateQueries({ queryKey: ['auto-reply-rule', variables.ruleId] });
    },
  });
}

// Hook for deleting an auto-reply rule
export function useDeleteAutoReplyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('auto_reply_rules').delete().eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply-rules'] });
    },
  });
}

// Hook for toggling rule active status
export function useToggleAutoReplyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('auto_reply_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply-rules'] });
    },
  });
}

// Hook for fetching execution logs
export function useAutoReplyLogs(ruleId?: string) {
  return useQuery({
    queryKey: ['auto-reply-logs', ruleId],
    queryFn: async () => {
      let query = supabase
        .from('auto_reply_execution_logs')
        .select(
          `
          *,
          auto_reply_rules!inner(name),
          tickets(number, subject),
          auto_reply_templates(language, subject_template)
        `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AutoReplyExecutionLog[];
    },
  });
}

// Hook for testing auto-reply rules
export function useTestAutoReplyRule() {
  return useMutation({
    mutationFn: async ({
      ruleId,
      ticketId,
      messageId,
      conversationId,
      messageContent,
    }: {
      ruleId: string;
      ticketId: string;
      messageId?: string;
      conversationId?: string;
      messageContent?: string;
    }) => {
      // Get the rule to determine trigger type
      const { data: rule, error: ruleError } = await supabase
        .from('auto_reply_rules')
        .select('trigger_type')
        .eq('id', ruleId)
        .single();

      if (ruleError) throw ruleError;

      // Call the execute function
      const { data, error } = await supabase.rpc('execute_auto_reply_rules', {
        p_trigger_type: rule.trigger_type,
        p_ticket_id: ticketId,
        p_message_id: messageId,
        p_conversation_id: conversationId,
        p_message_content: messageContent,
      });

      if (error) throw error;
      return data;
    },
  });
}

// Hook for manual execution of auto-reply
export function useExecuteAutoReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      ticketId,
      conversationId,
      templateId,
    }: {
      ruleId: string;
      ticketId: string;
      conversationId: string;
      templateId?: string;
    }) => {
      // Get rule and template data
      const { data: rule, error: ruleError } = await supabase
        .from('auto_reply_rules')
        .select(
          `
          *,
          auto_reply_templates(*)
        `
        )
        .eq('id', ruleId)
        .single();

      if (ruleError) throw ruleError;

      // Get ticket and customer data
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(
          `
          *,
          customers(*)
        `
        )
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      // Use specified template or first available
      const template = templateId
        ? rule.auto_reply_templates?.find((t) => t.id === templateId)
        : rule.auto_reply_templates?.[0];

      if (!template) throw new Error('No template found for auto-reply');

      // Process template variables
      const customer = (ticket as any).customers;
      let processedContent = template.content_template;
      let processedSubject = template.subject_template || `Re: ${ticket.subject}`;

      // Replace common variables
      const variables = {
        'customer.name': customer?.name || 'Klant',
        'customer.email': customer?.email || '',
        'ticket.number': ticket.number.toString(),
        'ticket.subject': ticket.subject,
        'ticket.priority': ticket.priority,
      };

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
      });

      // Create the auto-reply message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: processedContent,
          sender_type: 'system',
          sender_id: 'auto-reply-system',
          sender_name: 'Zynlo Auto-Reply',
          is_internal: false,
          content_type: template.content_type,
          metadata: {
            auto_reply: true,
            rule_id: ruleId,
            template_id: template.id,
            processed_subject: processedSubject,
          },
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Log the execution
      await supabase.from('auto_reply_execution_logs').insert({
        rule_id: ruleId,
        ticket_id: ticketId,
        conversation_id: conversationId,
        trigger_type: 'manual',
        conditions_met: true,
        template_used: template.id,
        sent_message_id: message.id,
        response_sent: true,
        recipient_email: customer?.email,
        metadata: {
          manual_execution: true,
          processed_subject: processedSubject,
        },
      });

      return {
        message,
        processedSubject,
        processedContent,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply-logs'] });
    },
  });
}

// Hook for getting auto-reply statistics
export function useAutoReplyStats() {
  return useQuery({
    queryKey: ['auto-reply-stats'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.user.id)
        .single();

      // Get rules count by status
      const { data: rulesData, error: rulesError } = await supabase
        .from('auto_reply_rules')
        .select('is_active, trigger_type')
        .eq('organization_id', userData?.organization_id);

      if (rulesError) throw rulesError;

      // Get execution logs for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logsData, error: logsError } = await supabase
        .from('auto_reply_execution_logs')
        .select('response_sent, trigger_type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (logsError) throw logsError;

      const stats = {
        totalRules: rulesData.length,
        activeRules: rulesData.filter((r) => r.is_active).length,
        inactiveRules: rulesData.filter((r) => !r.is_active).length,
        rulesByTrigger: rulesData.reduce(
          (acc, rule) => {
            acc[rule.trigger_type] = (acc[rule.trigger_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        totalExecutions: logsData.length,
        successfulReplies: logsData.filter((l) => l.response_sent).length,
        executionsByTrigger: logsData.reduce(
          (acc, log) => {
            acc[log.trigger_type] = (acc[log.trigger_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      };

      return stats;
    },
  });
}
