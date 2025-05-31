'use client'

import { useState } from 'react'
import { Plus, Search, Mail, Phone, User, Ticket } from 'lucide-react'
import { Button } from '@zynlo/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import { useRouter } from 'next/navigation'
import { buildSearchPattern } from '@/lib/search-utils'

interface Customer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  created_at: string
  ticket_count?: number
}

export default function CustomersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })

  // Fetch customers with ticket count
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select(`
          *,
          tickets(count)
        `)
        .order('created_at', { ascending: false })

      // Add search filter if search term exists
      if (searchTerm) {
        const pattern = buildSearchPattern(searchTerm)
        query = query.or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data to include ticket count
      return data?.map(customer => ({
        ...customer,
        ticket_count: customer.tickets?.[0]?.count || 0
      })) as Customer[]
    }
  })

  // Create customer mutation
  const createCustomer = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string }) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          name: data.name || null,
          email: data.email || null,
          phone: data.phone || null
        })
        .select()
        .single()

      if (error) throw error
      return customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsCreating(false)
      setFormData({ name: '', email: '', phone: '' })
    }
  })

  const handleCreateCustomer = async () => {
    // Validate that at least one field is filled
    if (!formData.name && !formData.email && !formData.phone) {
      alert('Vul minimaal één veld in')
      return
    }

    await createCustomer.mutateAsync(formData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Klanten laden...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Klanten</h1>
        <p className="mt-1 text-sm text-gray-500">
          Beheer klantinformatie en bekijk hun ticket historie
        </p>
      </div>

      {/* Search and Add button */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek op naam, email of telefoon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nieuwe klant
        </Button>
      </div>

      {/* Create new customer form */}
      {isCreating && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Nieuwe klant toevoegen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naam
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jan Jansen"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="jan@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefoon
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+31 6 12345678"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleCreateCustomer}
              disabled={createCustomer.isPending}
            >
              {createCustomer.isPending ? 'Toevoegen...' : 'Klant toevoegen'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false)
                setFormData({ name: '', email: '', phone: '' })
              }}
            >
              Annuleren
            </Button>
          </div>
        </div>
      )}

      {/* Customers list */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Klanten ({customers?.length || 0})
          </h2>
        </div>
        
        {customers && customers.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/klanten/${customer.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customer.name || 'Onbekende klant'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Tickets</p>
                      <p className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                        <Ticket className="h-4 w-4" />
                        {customer.ticket_count}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>
              {searchTerm 
                ? 'Geen klanten gevonden met deze zoekterm' 
                : 'Nog geen klanten geregistreerd'
              }
            </p>
            <p className="text-sm mt-1">
              {searchTerm 
                ? 'Probeer een andere zoekterm' 
                : 'Voeg je eerste klant toe om te beginnen'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 