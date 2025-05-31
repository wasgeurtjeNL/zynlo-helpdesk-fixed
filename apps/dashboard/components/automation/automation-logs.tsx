'use client'

import { useState } from 'react'
import { 
  X, 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button, Card } from '@zynlo/ui'
import { useAutomationLogs } from '@zynlo/supabase'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface AutomationLogsProps {
  ruleId?: string | null
  onClose: () => void
}

export function AutomationLogs({ ruleId, onClose }: AutomationLogsProps) {
  const { data: logs, isLoading } = useAutomationLogs(ruleId || undefined)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Automation Execution Logs</h2>
              <p className="text-sm text-gray-500 mt-1">
                {ruleId ? 'Showing logs for this rule' : 'Showing all automation logs'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="p-6 space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id)
                const hasError = !!log.error_message
                const isSuccessful = log.conditions_met && !hasError

                return (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn(
                            "p-1.5 rounded-full",
                            isSuccessful ? "bg-green-100" : hasError ? "bg-red-100" : "bg-gray-100"
                          )}>
                            {isSuccessful ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : hasError ? (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ) : (
                              <Activity className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {log.automation_rules?.name || 'Unknown Rule'}
                            </h4>
                            {log.tickets && (
                              <p className="text-sm text-gray-500">
                                Ticket #{log.tickets.number}: {log.tickets.subject}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                          <span>
                            Trigger: {log.trigger_type.replace(/_/g, ' ')}
                          </span>
                          {log.execution_time_ms && (
                            <span>
                              Execution time: {log.execution_time_ms}ms
                            </span>
                          )}
                        </div>

                        {/* Error message */}
                        {hasError && (
                          <div className="mt-2 p-2 bg-red-50 rounded-md">
                            <p className="text-sm text-red-700 flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              {log.error_message}
                            </p>
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            {/* Conditions */}
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">
                                Conditions Check: {log.conditions_met ? 'Passed' : 'Failed'}
                              </h5>
                            </div>

                            {/* Actions executed */}
                            {log.actions_executed && log.actions_executed.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-1">
                                  Actions Executed:
                                </h5>
                                <div className="space-y-1">
                                  {log.actions_executed.map((action: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                      <span className="text-gray-600">
                                        {action.action_type?.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Raw log data */}
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">
                                Raw Log Data:
                              </h5>
                              <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-x-auto">
                                {JSON.stringify({
                                  id: log.id,
                                  rule_id: log.rule_id,
                                  ticket_id: log.ticket_id,
                                  trigger_type: log.trigger_type,
                                  conditions_met: log.conditions_met,
                                  actions_executed: log.actions_executed,
                                  error_message: log.error_message,
                                  execution_time_ms: log.execution_time_ms,
                                  created_at: log.created_at
                                }, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expand/Collapse button */}
                      <button
                        onClick={() => toggleExpanded(log.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg ml-4"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Activity className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No execution logs yet</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Execution logs will appear here when automation rules are triggered
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 