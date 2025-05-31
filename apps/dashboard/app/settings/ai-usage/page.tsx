'use client'

import { useState } from 'react'
import { useAuth, useAIUsageHistory, useAIUsageSummary, useUserAILimits } from '@zynlo/supabase'
import { Sparkles, Calendar, CreditCard, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function AIUsagePage() {
  const { user } = useAuth()
  const { data: usageHistory, isLoading: historyLoading } = useAIUsageHistory(user?.id)
  const { data: usageSummary, isLoading: summaryLoading } = useAIUsageSummary(user?.id)
  const { data: userLimits, isLoading: limitsLoading } = useUserAILimits(user?.id)
  
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  const currentMonthUsage = usageSummary?.find(
    s => s.month === format(selectedMonth, 'yyyy-MM-01')
  )

  const formatCents = (cents: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('nl-NL').format(num)
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Assistent Gebruik
          </h1>
          <p className="text-gray-600 mt-1">
            Bekijk je AI suggestie gebruik en limieten
          </p>
        </div>

        {/* Current Month Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Requests Used */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Verzoeken deze maand</h3>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {currentMonthUsage?.total_requests || 0}
              </span>
              <span className="text-sm text-gray-500">
                / {userLimits?.monthly_request_limit || 100}
              </span>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    ((currentMonthUsage?.total_requests || 0) / (userLimits?.monthly_request_limit || 100)) * 100,
                    100
                  )}%`
                }}
              />
            </div>
          </div>

          {/* Tokens Used */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Tokens gebruikt</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {formatNumber(currentMonthUsage?.total_tokens || 0)}
              </span>
              <span className="text-sm text-gray-500">
                / {formatNumber(userLimits?.monthly_token_limit || 10000)}
              </span>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    ((currentMonthUsage?.total_tokens || 0) / (userLimits?.monthly_token_limit || 10000)) * 100,
                    100
                  )}%`
                }}
              />
            </div>
          </div>

          {/* Total Cost */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Kosten deze maand</h3>
              <CreditCard className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {formatCents(currentMonthUsage?.total_cost_cents || 0)}
              </span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                userLimits?.is_premium 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {userLimits?.is_premium ? 'Premium' : 'Gratis'}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Maandelijks overzicht</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-500">
                    <th className="pb-3">Maand</th>
                    <th className="pb-3 text-right">Verzoeken</th>
                    <th className="pb-3 text-right">Tokens</th>
                    <th className="pb-3 text-right">Kosten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usageSummary?.map((summary) => (
                    <tr key={summary.id} className="text-sm">
                      <td className="py-3 text-gray-900">
                        {format(new Date(summary.month), 'MMMM yyyy', { locale: nl })}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {formatNumber(summary.total_requests)}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {formatNumber(summary.total_tokens)}
                      </td>
                      <td className="py-3 text-right text-gray-900 font-medium">
                        {formatCents(summary.total_cost_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Usage History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recente AI suggesties</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {usageHistory?.slice(0, 10).map((usage) => (
                <div key={usage.id} className="border-l-4 border-purple-200 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {usage.prompt}
                      </p>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span>{format(new Date(usage.created_at!), 'dd MMM HH:mm', { locale: nl })}</span>
                        <span>{usage.model_used}</span>
                        <span>{formatNumber(usage.tokens_used)} tokens</span>
                        <span>{formatCents(usage.cost_cents)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Premium Upgrade CTA */}
        {!userLimits?.is_premium && (
          <div className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white">
            <h3 className="text-xl font-semibold mb-2">Upgrade naar Premium</h3>
            <p className="mb-4 opacity-90">
              Krijg toegang tot meer AI suggesties, hogere limieten en prioriteit support.
            </p>
            <button className="bg-white text-purple-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Bekijk Premium opties
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 