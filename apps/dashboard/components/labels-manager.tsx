'use client'

import { useState } from 'react'
import { 
  Tag, 
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  MoreVertical,
  Loader2,
  X,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'

type Label = Database['public']['Tables']['labels']['Row'] & {
  children?: Label[]
  ticket_count?: number
}

interface LabelFormData {
  name: string
  color: string
  description?: string
  parent_id?: string | null
}

const DEFAULT_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
  '#06B6D4', // cyan
]

export function LabelsManager() {
  const queryClient = useQueryClient()
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set())
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [showNewLabelForm, setShowNewLabelForm] = useState(false)
  const [newLabelParent, setNewLabelParent] = useState<string | null>(null)
  const [formData, setFormData] = useState<LabelFormData>({
    name: '',
    color: DEFAULT_COLORS[0],
    description: ''
  })

  // Fetch labels with hierarchy
  const { data: labels, isLoading } = useQuery({
    queryKey: ['labels-with-counts'],
    queryFn: async () => {
      // Get all labels
      const { data: labelsData, error: labelsError } = await supabase
        .from('labels')
        .select('*')
        .order('name')

      if (labelsError) throw labelsError

      // Get ticket counts for each label
      const { data: counts, error: countsError } = await supabase
        .from('ticket_labels')
        .select('label_id')

      if (countsError) throw countsError

      // Count tickets per label
      const ticketCounts = counts?.reduce((acc, item) => {
        acc[item.label_id] = (acc[item.label_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Build hierarchy
      const labelMap = new Map<string, Label>()
      const rootLabels: Label[] = []

      // First pass: create all labels with counts
      labelsData?.forEach(label => {
        labelMap.set(label.id, {
          ...label,
          ticket_count: ticketCounts?.[label.id] || 0,
          children: []
        })
      })

      // Second pass: build hierarchy
      labelMap.forEach(label => {
        if (label.parent_id && labelMap.has(label.parent_id)) {
          const parent = labelMap.get(label.parent_id)!
          parent.children = parent.children || []
          parent.children.push(label)
        } else if (!label.parent_id) {
          rootLabels.push(label)
        }
      })

      return rootLabels
    },
  })

  // Create label mutation
  const createLabel = useMutation({
    mutationFn: async (data: LabelFormData) => {
      const { error } = await supabase
        .from('labels')
        .insert({
          name: data.name,
          color: data.color,
          description: data.description,
          parent_id: data.parent_id
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels-with-counts'] })
      setShowNewLabelForm(false)
      setNewLabelParent(null)
      setFormData({ name: '', color: DEFAULT_COLORS[0], description: '' })
    },
  })

  // Update label mutation
  const updateLabel = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LabelFormData> }) => {
      const { error } = await supabase
        .from('labels')
        .update(data)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels-with-counts'] })
      setEditingLabel(null)
    },
  })

  // Delete label mutation
  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels-with-counts'] })
    },
  })

  const toggleExpanded = (labelId: string) => {
    const newExpanded = new Set(expandedLabels)
    if (newExpanded.has(labelId)) {
      newExpanded.delete(labelId)
    } else {
      newExpanded.add(labelId)
    }
    setExpandedLabels(newExpanded)
  }

  const renderLabel = (label: Label, level: number = 0) => {
    const hasChildren = label.children && label.children.length > 0
    const isExpanded = expandedLabels.has(label.id)
    const isEditing = editingLabel === label.id

    return (
      <div key={label.id}>
        <div
          className={cn(
            "group flex items-center gap-2 px-4 py-2 hover:bg-gray-50",
            level > 0 && "border-l-2 border-gray-200"
          )}
          style={{ paddingLeft: `${(level * 24) + 16}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(label.id)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: label.color || '#6B7280' }}
          />

          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateLabel.mutate({
                  id: label.id,
                  data: { name: formData.name }
                })
              }}
              className="flex items-center gap-2 flex-1"
            >
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingLabel(null)
                  setFormData({ name: '', color: DEFAULT_COLORS[0], description: '' })
                }}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium text-gray-900">
                {label.name}
              </span>
              <span className="text-xs text-gray-500">
                {label.ticket_count || 0} tickets
              </span>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <button
                  onClick={() => {
                    setNewLabelParent(label.id)
                    setShowNewLabelForm(true)
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Sublabel toevoegen"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    setEditingLabel(label.id)
                    setFormData({ ...formData, name: label.name })
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Bewerken"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Weet je zeker dat je "${label.name}" wilt verwijderen?`)) {
                      deleteLabel.mutate(label.id)
                    }
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Verwijderen"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {label.children!.map(child => renderLabel(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* New Label Form */}
      {showNewLabelForm && (
        <div className="border-b border-gray-200 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createLabel.mutate({
                ...formData,
                parent_id: newLabelParent
              })
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label naam
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bijv. Bug, Feature Request, etc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kleur
              </label>
              <div className="flex gap-2">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "w-8 h-8 rounded-md border-2",
                      formData.color === color ? "border-gray-900" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving (optioneel)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Korte beschrijving van dit label"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createLabel.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createLabel.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Label toevoegen'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewLabelForm(false)
                  setNewLabelParent(null)
                  setFormData({ name: '', color: DEFAULT_COLORS[0], description: '' })
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Labels List */}
      <div className="divide-y divide-gray-200">
        {labels && labels.length > 0 ? (
          labels.map(label => renderLabel(label))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nog geen labels aangemaakt</p>
            <button
              onClick={() => setShowNewLabelForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Maak je eerste label
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 