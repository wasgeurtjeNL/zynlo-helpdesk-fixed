'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface SelectedTicketContextType {
  selectedTicketNumber: number | null
  setSelectedTicketNumber: (number: number | null) => void
}

const SelectedTicketContext = createContext<SelectedTicketContextType | undefined>(undefined)

export function SelectedTicketProvider({ children }: { children: ReactNode }) {
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<number | null>(null)

  return (
    <SelectedTicketContext.Provider value={{ selectedTicketNumber, setSelectedTicketNumber }}>
      {children}
    </SelectedTicketContext.Provider>
  )
}

export function useSelectedTicket() {
  const context = useContext(SelectedTicketContext)
  if (!context) {
    throw new Error('useSelectedTicket must be used within a SelectedTicketProvider')
  }
  return context
}

// Safe version that can be used outside the provider
export function useSelectedTicketSafe() {
  const context = useContext(SelectedTicketContext)
  return context || { selectedTicketNumber: null, setSelectedTicketNumber: () => {} }
} 