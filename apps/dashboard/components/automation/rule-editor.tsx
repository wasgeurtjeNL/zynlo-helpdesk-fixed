'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Plus, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle,
  Zap
} from 'lucide-react'
import { Button, Card } from '@/lib/ui'
import { 
  useCreateAutomationRule,
  useUpdateAutomationRule,
  type CreateRuleParams,
  type CreateConditionParams,
  type CreateActionParams
} from '@zynlo/supabase'
import { cn } from '@/lib/utils'
import { showToast } from '@/components/toast'

interface RuleEditorProps {
  rule?: any
  onClose: () => void
  onSave: () => void
}

const TRIGGER_TYPES = [
  { value: 'ticket_created', label: 'When ticket is created' },
  { value: 'ticket_updated', label: 'When ticket is updated' },
  { value: 'ticket_status_changed', label: 'When ticket status changes' },
  { value: 'ticket_assigned', label: 'When ticket is assigned' },
  { value: 'message_received', label: 'When message is received' },
  { value: 'time_based', label: 'On schedule' },
  { value: 'sla_breach', label: 'When SLA is breached' }
]

const CONDITION_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee_id', label: 'Assignee' },
  { value: 'team_id', label: 'Team' },
  { value: 'customer.email', label: 'Customer Email' },
  { value: 'customer.type', label: 'Customer Type' },
  { value: 'subject', label: 'Subject' },
  { value: 'labels', label: 'Labels' },
  { value: 'created_at', label: 'Created Time' },
  { value: 'updated_at', label: 'Updated Time' }
]

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'in', label: 'is one of' },
  { value: 'not_in', label: 'is not one of' }
]

const ACTION_TYPES = [
  { value: 'assign_to_user', label: 'Assign to user' },
  { value: 'assign_to_team', label: 'Assign to team' },
  { value: 'change_status', label: 'Change status' },
  { value: 'change_priority', label: 'Change priority' },
  { value: 'add_label', label: 'Add label' },
  { value: 'remove_label', label: 'Remove label' },
  { value: 'send_email', label: 'Send email' },
  { value: 'send_notification', label: 'Send notification' },
  { value: 'create_task', label: 'Create task' },
  { value: 'add_internal_note', label: 'Add internal note' },
  { value: 'set_sla', label: 'Set SLA' },
  { value: 'trigger_webhook', label: 'Trigger webhook' }
]

export function RuleEditor({ rule, onClose, onSave }: RuleEditorProps) {
  const createRule = useCreateAutomationRule()
  const updateRule = useUpdateAutomationRule()
  
  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [triggerType, setTriggerType] = useState(rule?.trigger_type || 'ticket_created')
  const [priority, setPriority] = useState(rule?.priority || 0)
  const [isActive, setIsActive] = useState(rule?.is_active ?? true)
  const [conditions, setConditions] = useState<CreateConditionParams[]>(
    rule?.automation_conditions || rule?.conditions || []
  )
  const [actions, setActions] = useState<CreateActionParams[]>(
    rule?.automation_actions || rule?.actions || []
  )
  const [conditionGroups, setConditionGroups] = useState<number[]>([0])
  const [saving, setSaving] = useState(false)

  const handleAddCondition = () => {
    setConditions([...conditions, {
      field: 'status',
      operator: 'equals',
      value: '',
      condition_group: 0,
      condition_type: 'all'
    }])
  }

  const handleUpdateCondition = (index: number, updates: Partial<CreateConditionParams>) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    setConditions(newConditions)
  }

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const handleAddAction = () => {
    setActions([...actions, {
      action_type: 'change_status',
      action_data: {},
      execution_order: actions.length
    }])
  }

  const handleUpdateAction = (index: number, updates: Partial<CreateActionParams>) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], ...updates }
    setActions(newActions)
  }

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('error', 'Please enter a rule name')
      return
    }

    if (conditions.length === 0) {
      showToast('error', 'Please add at least one condition')
      return
    }

    if (actions.length === 0) {
      showToast('error', 'Please add at least one action')
      return
    }

    setSaving(true)
    try {
      const ruleData: CreateRuleParams = {
        name,
        description,
        trigger_type: triggerType,
        priority,
        is_active: isActive,
        conditions,
        actions
      }

      if (rule?.id) {
        await updateRule.mutateAsync({
          ruleId: rule.id,
          updates: {
            name,
            description,
            trigger_type: triggerType,
            priority,
            is_active: isActive
          },
          conditions,
          actions
        })
        showToast('success', 'Rule updated successfully')
      } else {
        await createRule.mutateAsync(ruleData)
        showToast('success', 'Rule created successfully')
      }
      
      onSave()
    } catch (error) {
      console.error('Error saving rule:', error)
      showToast('error', 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {rule ? 'Edit Automation Rule' : 'Create Automation Rule'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Auto-assign urgent tickets"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rule does..."
                rows={2}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TRIGGER_TYPES.map(trigger => (
                    <option key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher priority rules run first
                </p>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Conditions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            </div>

            {conditions.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-gray-50">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Add conditions to specify when this rule should trigger
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <select
                          value={condition.field}
                          onChange={(e) => handleUpdateCondition(index, { field: e.target.value })}
                          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {CONDITION_FIELDS.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={condition.operator}
                          onChange={(e) => handleUpdateCondition(index, { operator: e.target.value })}
                          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {CONDITION_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={condition.value || ''}
                          onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                          placeholder="Value"
                          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        onClick={() => handleRemoveCondition(index)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Actions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAction}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Action
              </Button>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-gray-50">
                <Zap className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Add actions to define what happens when conditions are met
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((action, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <select
                          value={action.action_type}
                          onChange={(e) => handleUpdateAction(index, { action_type: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {ACTION_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>

                        {/* Action-specific fields */}
                        {action.action_type === 'change_status' && (
                          <select
                            value={action.action_data.status || ''}
                            onChange={(e) => handleUpdateAction(index, {
                              action_data: { ...action.action_data, status: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select status</option>
                            <option value="new">New</option>
                            <option value="open">Open</option>
                            <option value="pending">Pending</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        )}

                        {action.action_type === 'change_priority' && (
                          <select
                            value={action.action_data.priority || ''}
                            onChange={(e) => handleUpdateAction(index, {
                              action_data: { ...action.action_data, priority: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select priority</option>
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        )}

                        {(action.action_type === 'add_label' || action.action_type === 'remove_label') && (
                          <input
                            type="text"
                            value={action.action_data.label || ''}
                            onChange={(e) => handleUpdateAction(index, {
                              action_data: { ...action.action_data, label: e.target.value }
                            })}
                            placeholder="Label name"
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}

                        {action.action_type === 'add_internal_note' && (
                          <textarea
                            value={action.action_data.note || ''}
                            onChange={(e) => handleUpdateAction(index, {
                              action_data: { ...action.action_data, note: e.target.value }
                            })}
                            placeholder="Note content..."
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveAction(index)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Rule is active
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 