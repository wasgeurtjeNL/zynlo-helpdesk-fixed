'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, User, Edit2, Save, X, MessageSquare, Calendar, Clock } from 'lucide-react'
import { Button } from '@zynlo/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import Link from 'next/link'

interface CustomerTicket {
  id: string
  number: number
  subject: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  assignee: {
    full_name: string | null
    email: string
  } | null
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const customerId = params.customerId as string
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [notes, setNotes] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Fetch customer details
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (error) throw error
      return data
    }
  })

  // Fetch customer tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['customer-tickets', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          number,
          subject,
          status,
          priority,
          created_at,
          updated_at,
          assignee:assignee_id(full_name, email)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as CustomerTicket[]
    }
  })

  // Update customer mutation
  const updateCustomer = useMutation({
    mutationFn: async (data: { name: string | null; email: string | null; phone: string | null }) => {
      const { error } = await supabase
        .from('customers')
        .update({
          name: data.name || null,
          email: data.email || null,
          phone: data.phone || null
        })
        .eq('id', customerId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsEditing(false)
    }
  })

  const handleEdit = () => {
    setEditData({
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || ''
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    await updateCustomer.mutateAsync(editData)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditData({ name: '', email: '', phone: '' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'open': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-purple-100 text-purple-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'normal': return 'text-blue-600'
      case 'low': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Klantgegevens laden...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Klant niet gevonden</p>
          <Button
            variant="outline"
            onClick={() => router.push('/klanten')}
            className="mt-4"
          >
            Terug naar klanten
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/klanten')}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Terug naar klanten
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Klantgegevens</h2>
              {!isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEdit}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-center mb-6">
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-10 w-10 text-gray-600" />
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naam
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefoon
                  </label>
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateCustomer.isPending}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {updateCustomer.isPending ? 'Opslaan...' : 'Opslaan'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Annuleren
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Naam</p>
                  <p className="font-medium">{customer.name || 'Niet ingevuld'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </a>
                  ) : (
                    <p className="font-medium">Niet ingevuld</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefoon</p>
                  {customer.phone ? (
                    <a href={`tel:${customer.phone}`} className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </a>
                  ) : (
                    <p className="font-medium">Niet ingevuld</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Klant sinds</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString('nl-NL') : 'Onbekend'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notes section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Notities</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsAddingNote(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            {isAddingNote ? (
              <div className="space-y-4">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Voeg notities toe over deze klant..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setIsAddingNote(false)}>
                    Opslaan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingNote(false)
                      setNotes('')
                    }}
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {notes || 'Nog geen notities toegevoegd'}
              </p>
            )}
          </div>
        </div>

        {/* Ticket History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Ticket Historie ({tickets?.length || 0})
              </h2>
            </div>
            
            {ticketsLoading ? (
              <div className="p-6 text-center text-gray-500">
                Tickets laden...
              </div>
            ) : tickets && tickets.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.number}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            #{ticket.number}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                          <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{ticket.subject}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.created_at).toLocaleDateString('nl-NL')}
                          </span>
                          {ticket.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.assignee.full_name || ticket.assignee.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <MessageSquare className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Deze klant heeft nog geen tickets</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 