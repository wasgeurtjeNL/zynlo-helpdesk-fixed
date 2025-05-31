'use client'

import { useState } from 'react'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Power, 
  Clock, 
  Zap,
  ChevronRight,
  Activity,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Play,
  Copy
} from 'lucide-react'
import { Button, Card } from '@/lib/ui'
import { 
  useAutomationRules, 
  useDeleteAutomationRule, 
  useToggleAutomationRule,
  useAutomationTemplates,
  type CreateRuleParams
} from '@zynlo/supabase'
import { cn } from '@/lib/utils'
import { showToast } from '@/components/toast'
import { RuleEditor } from '@/components/automation/rule-editor'
import { RuleTemplates } from '@/components/automation/rule-templates'
import { AutomationLogs } from '@/components/automation/automation-logs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TRIGGER_LABELS = {
  ticket_created: { label: 'Ticket Created', icon: Plus, color: 'text-blue-500' },
  ticket_updated: { label: 'Ticket Updated', icon: Edit2, color: 'text-yellow-500' },
  ticket_status_changed: { label: 'Status Changed', icon: Activity, color: 'text-purple-500' },
  ticket_assigned: { label: 'Ticket Assigned', icon: Zap, color: 'text-green-500' },
  message_received: { label: 'Message Received', icon: FileText, color: 'text-indigo-500' },
  time_based: { label: 'Time Based', icon: Clock, color: 'text-orange-500' },
  sla_breach: { label: 'SLA Breach', icon: AlertCircle, color: 'text-red-500' }
}

export default function AutomationRulesPage() {
  const router = useRouter()
  const { data: rules, isLoading } = useAutomationRules()
  const { data: templates } = useAutomationTemplates()
  const deleteRule = useDeleteAutomationRule()
  const toggleRule = useToggleAutomationRule()
  
  const [showEditor, setShowEditor] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)

  const handleCreateRule = () => {
    setEditingRule(null)
    setShowEditor(true)
  }

  const handleEditRule = (rule: any) => {
    setEditingRule(rule)
    setShowEditor(true)
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return

    try {
      await deleteRule.mutateAsync(ruleId)
      showToast('success', 'Automation rule deleted')
    } catch (error) {
      console.error('Error deleting rule:', error)
      showToast('error', 'Failed to delete rule')
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await toggleRule.mutateAsync({ ruleId, isActive })
      showToast('success', `Rule ${isActive ? 'activated' : 'deactivated'}`)
    } catch (error) {
      console.error('Error toggling rule:', error)
      showToast('error', 'Failed to toggle rule')
    }
  }

  const handleViewLogs = (ruleId: string) => {
    setSelectedRuleId(ruleId)
    setShowLogs(true)
  }

  const handleCreateFromTemplate = (templateData: any) => {
    setEditingRule({
      name: templateData.name,
      description: templateData.description,
      trigger_type: templateData.trigger_type,
      conditions: templateData.conditions || [],
      actions: templateData.actions || []
    })
    setShowTemplates(false)
    setShowEditor(true)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Automation Rules</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create rules to automate ticket workflows and actions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTemplates(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              onClick={handleCreateRule}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : rules && rules.length > 0 ? (
          <div className="p-6 space-y-4">
            {(rules as any[]).map((rule: any) => {
              const trigger = TRIGGER_LABELS[rule.trigger_type as keyof typeof TRIGGER_LABELS]
              const TriggerIcon = trigger?.icon || Zap
              
              return (
                <Card key={rule.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg bg-gray-100",
                          rule.is_active && "bg-blue-50"
                        )}>
                          <TriggerIcon className={cn(
                            "h-5 w-5",
                            rule.is_active ? trigger?.color : "text-gray-400"
                          )} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{rule.name}</h3>
                          {rule.description && (
                            <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Trigger:</span>
                          <span className="font-medium">{trigger?.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Conditions:</span>
                          <span className="font-medium">{rule.automation_conditions?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Actions:</span>
                          <span className="font-medium">{rule.automation_actions?.length || 0}</span>
                        </div>
                        {rule.priority && rule.priority > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Priority:</span>
                            <span className="font-medium">{rule.priority}</span>
                          </div>
                        )}
                      </div>

                      {/* Conditions preview */}
                      {rule.automation_conditions && rule.automation_conditions.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-700 mb-1">When:</div>
                          <div className="space-y-1">
                            {rule.automation_conditions.slice(0, 2).map((condition: any, idx: number) => (
                              <div key={idx} className="text-xs text-gray-600">
                                • {condition.field} {condition.operator} {JSON.stringify(condition.value)}
                              </div>
                            ))}
                            {rule.automation_conditions.length > 2 && (
                              <div className="text-xs text-gray-400">
                                +{rule.automation_conditions.length - 2} more conditions
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions preview */}
                      {rule.automation_actions && rule.automation_actions.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-700 mb-1">Then:</div>
                          <div className="space-y-1">
                            {rule.automation_actions.slice(0, 2).map((action: any, idx: number) => (
                              <div key={idx} className="text-xs text-gray-600">
                                • {action.action_type.replace(/_/g, ' ')}
                              </div>
                            ))}
                            {rule.automation_actions.length > 2 && (
                              <div className="text-xs text-gray-400">
                                +{rule.automation_actions.length - 2} more actions
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLogs(rule.id)}
                        title="View execution logs"
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleRule(rule.id, !rule.is_active)}
                        className={cn(
                          rule.is_active ? "text-green-600" : "text-gray-400"
                        )}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Zap className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No automation rules yet</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              Create automation rules to streamline your workflow and save time on repetitive tasks
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTemplates(true)}
              >
                Browse Templates
              </Button>
              <Button onClick={handleCreateRule}>
                Create Your First Rule
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Rule Editor Modal */}
      {showEditor && (
        <RuleEditor
          rule={editingRule}
          onClose={() => {
            setShowEditor(false)
            setEditingRule(null)
          }}
          onSave={() => {
            setShowEditor(false)
            setEditingRule(null)
          }}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <RuleTemplates
          templates={templates || []}
          onClose={() => setShowTemplates(false)}
          onSelect={handleCreateFromTemplate}
        />
      )}

      {/* Logs Modal */}
      {showLogs && (
        <AutomationLogs
          ruleId={selectedRuleId}
          onClose={() => {
            setShowLogs(false)
            setSelectedRuleId(null)
          }}
        />
      )}
    </div>
  )
} 