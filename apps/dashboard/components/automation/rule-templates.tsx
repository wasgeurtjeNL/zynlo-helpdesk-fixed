'use client'

import { useState } from 'react'
import { 
  X, 
  FileText,
  Search,
  Zap,
  Users,
  Clock,
  Tag,
  Mail,
  AlertCircle
} from 'lucide-react'
import { Button, Card } from '@zynlo/ui'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  name: string
  description: string | null
  category: string
  template_data: any
}

interface RuleTemplatesProps {
  templates: Template[]
  onClose: () => void
  onSelect: (templateData: any) => void
}

const CATEGORY_ICONS: Record<string, any> = {
  assignment: Users,
  sla: Clock,
  lifecycle: Zap,
  notification: Mail,
  labeling: Tag,
  default: FileText
}

const CATEGORY_LABELS: Record<string, string> = {
  assignment: 'Assignment',
  sla: 'SLA Management',
  lifecycle: 'Ticket Lifecycle',
  notification: 'Notifications',
  labeling: 'Labels & Tags'
}

export function RuleTemplates({ templates, onClose, onSelect }: RuleTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Get unique categories
  const categories = Array.from(new Set(templates.map(t => t.category)))

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const handleSelect = (template: Template) => {
    onSelect({
      name: template.name,
      description: template.description,
      ...template.template_data
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Automation Templates</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Categories sidebar */}
          <div className="w-48 border-r p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  !selectedCategory ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                )}
              >
                All Templates
              </button>
              {categories.map(category => {
                const Icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.default
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                      selectedCategory === category ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {CATEGORY_LABELS[category] || category}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Templates list */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No templates found</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTemplates.map((template) => {
                  const Icon = CATEGORY_ICONS[template.category] || CATEGORY_ICONS.default
                  const triggerType = template.template_data.trigger_type
                  const conditionsCount = template.template_data.conditions?.length || 0
                  const actionsCount = template.template_data.actions?.length || 0

                  return (
                    <Card
                      key={template.id}
                      className="p-6 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => handleSelect(template)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-gray-100 rounded-lg">
                          <Icon className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {template.name}
                          </h3>
                          {template.description && (
                            <p className="text-sm text-gray-500 mb-3">
                              {template.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {triggerType?.replace(/_/g, ' ')}
                            </span>
                            <span>{conditionsCount} conditions</span>
                            <span>{actionsCount} actions</span>
                          </div>

                          {/* Preview of conditions and actions */}
                          {template.template_data.conditions && template.template_data.conditions.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <div className="text-xs font-medium text-gray-700 mb-1">When:</div>
                              <div className="text-xs text-gray-600">
                                {template.template_data.conditions[0].field} {template.template_data.conditions[0].operator} {JSON.stringify(template.template_data.conditions[0].value)}
                              </div>
                            </div>
                          )}

                          {template.template_data.actions && template.template_data.actions.length > 0 && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-md">
                              <div className="text-xs font-medium text-gray-700 mb-1">Then:</div>
                              <div className="text-xs text-gray-600">
                                {template.template_data.actions[0].action_type.replace(/_/g, ' ')}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelect(template)
                          }}
                        >
                          Use Template
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 