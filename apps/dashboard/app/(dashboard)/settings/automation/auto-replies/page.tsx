'use client';

import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  Clock,
  MessageSquare,
  ChevronRight,
  Activity,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Play,
  Copy,
  Mail,
  Phone,
  MessageCircle,
  Settings,
  Calendar,
  X,
  Info,
} from 'lucide-react';
import { Button, Card } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useAutoReplyRules,
  useDeleteAutoReplyRule,
  useToggleAutoReplyRule,
  useAutoReplyStats,
  useCreateAutoReplyRule,
  useUpdateAutoReplyRule,
} from '@zynlo/supabase';

// Types for auto-reply rules
interface AutoReplyRule {
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
  created_at: string;
  auto_reply_templates?: AutoReplyTemplate[];
  auto_reply_conditions?: AutoReplyCondition[];
}

interface AutoReplyTemplate {
  id: string;
  language: string;
  subject_template?: string;
  content_template: string;
  content_type: 'text/plain' | 'text/html';
}

interface AutoReplyCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
}

const TRIGGER_LABELS = {
  first_message: {
    label: 'Eerste bericht',
    icon: MessageSquare,
    color: 'text-blue-500',
    description: 'Automatisch antwoord bij het eerste bericht van een klant',
  },
  keyword_match: {
    label: 'Trefwoord match',
    icon: FileText,
    color: 'text-green-500',
    description: 'Automatisch antwoord wanneer specifieke trefwoorden worden gevonden',
  },
  out_of_hours: {
    label: 'Buiten kantooruren',
    icon: Clock,
    color: 'text-orange-500',
    description: 'Automatisch antwoord buiten bedrijfstijden',
  },
  channel_specific: {
    label: 'Kanaal specifiek',
    icon: MessageCircle,
    color: 'text-purple-500',
    description: 'Automatisch antwoord voor specifieke communicatiekanalen',
  },
  priority_based: {
    label: 'Prioriteit gebaseerd',
    icon: AlertCircle,
    color: 'text-red-500',
    description: 'Automatisch antwoord gebaseerd op ticketprioriteit',
  },
};

const CHANNEL_ICONS = {
  email: Mail,
  whatsapp: Phone,
  chat: MessageCircle,
  phone: Phone,
};

// Simplified Rule Editor Modal Component
function RuleEditorModal({ editingRule, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: editingRule?.name || '',
    description: editingRule?.description || '',
    trigger_type: editingRule?.trigger_type || 'first_message',
    is_active: editingRule?.is_active ?? true,
    priority: editingRule?.priority || 0,
    channel_types: editingRule?.channel_types || [],
    keywords: editingRule?.keywords || [],
    keyword_match_type: editingRule?.keyword_match_type || 'any',
    business_hours: editingRule?.business_hours || {
      enabled: false,
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: false, start: '09:00', end: '17:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00' },
    },
    templates: editingRule?.auto_reply_templates?.length
      ? editingRule.auto_reply_templates.map((template) => ({
          language: template.language,
          subject_template: template.subject_template,
          content_template: template.content_template,
          content_type: template.content_type,
        }))
      : [
          {
            language: 'nl',
            subject_template: 'Bedankt voor uw bericht - Ticket #{{ticket.number}}',
            content_template: `Hallo {{customer.name}},

Bedankt voor uw bericht! We hebben uw verzoek ontvangen en een ticket aangemaakt met nummer {{ticket.number}}.

Een van onze medewerkers zal zo spoedig mogelijk contact met u opnemen.

Met vriendelijke groet,
Het Zynlo Support Team`,
            content_type: 'text/html' as const,
          },
        ],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('error', 'Naam is verplicht');
      return;
    }

    if (!formData.templates[0]?.content_template.trim()) {
      showToast('error', 'Bericht inhoud is verplicht');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Saving auto-reply rule with data:', formData);
      await onSave(formData);
      console.log('Auto-reply rule saved successfully');
    } catch (error) {
      console.error('Error saving auto-reply rule:', error);
      showToast('error', 'Fout bij opslaan: ' + (error.message || 'Onbekende fout'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingRule ? 'Regel bewerken' : 'Nieuwe automatische antwoord regel'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Stel automatische antwoorden in voor verschillende situaties
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Basisinformatie</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naam *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bijv. Welkomstbericht"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioriteit</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Beschrijf wanneer deze regel gebruikt wordt..."
                />
              </div>
              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Regel is actief
                </label>
              </div>
            </Card>

            {/* Trigger Configuration */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Trigger configuratie</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trigger type</label>
                <select
                  value={formData.trigger_type}
                  onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="first_message">Eerste bericht</option>
                  <option value="keyword_match">Trefwoord match</option>
                  <option value="out_of_hours">Buiten kantooruren</option>
                  <option value="channel_specific">Kanaal specifiek</option>
                  <option value="priority_based">Prioriteit gebaseerd</option>
                </select>
              </div>
            </Card>

            {/* Template Preview */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Sjabloon voorbeeld</h3>
                <div className="flex items-center gap-2">
                  {/* Content Type Toggle */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Format:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newTemplates = [...formData.templates];
                        newTemplates[0] = {
                          ...newTemplates[0],
                          content_type:
                            formData.templates[0]?.content_type === 'text/html'
                              ? 'text/plain'
                              : 'text/html',
                        };
                        setFormData({ ...formData, templates: newTemplates });
                      }}
                      className={cn(
                        'px-3 py-1 rounded-md border transition-colors',
                        formData.templates[0]?.content_type === 'text/html'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newTemplates = [...formData.templates];
                        newTemplates[0] = {
                          ...newTemplates[0],
                          content_type: 'text/plain',
                        };
                        setFormData({ ...formData, templates: newTemplates });
                      }}
                      className={cn(
                        'px-3 py-1 rounded-md border transition-colors',
                        formData.templates[0]?.content_type === 'text/plain'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      Plain Text
                    </button>
                  </div>
                  {/* Preview Toggle */}
                  {formData.templates[0]?.content_type === 'text/html' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {showPreview ? 'Code' : 'Preview'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Onderwerp</label>
                  <input
                    type="text"
                    value={formData.templates[0]?.subject_template || ''}
                    onChange={(e) => {
                      const newTemplates = [...formData.templates];
                      newTemplates[0] = {
                        ...newTemplates[0],
                        subject_template: e.target.value,
                        content_type: newTemplates[0]?.content_type || 'text/html',
                      };
                      setFormData({ ...formData, templates: newTemplates });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bedankt voor uw bericht - Ticket #{{ticket.number}}"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bericht inhoud *
                    <span className="text-xs text-gray-500 ml-2">
                      ({formData.templates[0]?.content_type === 'text/html' ? 'HTML' : 'Plain Text'}
                      )
                    </span>
                  </label>

                  {showPreview && formData.templates[0]?.content_type === 'text/html' ? (
                    // HTML Preview
                    <div className="border border-gray-300 rounded-md">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 text-xs text-gray-600">
                        Preview (met voorbeeld data)
                      </div>
                      <div
                        className="p-3 min-h-[200px] bg-white"
                        dangerouslySetInnerHTML={{
                          __html: (formData.templates[0]?.content_template || '')
                            .replace(/\{\{customer\.name\}\}/g, 'Jan de Vries')
                            .replace(/\{\{customer\.email\}\}/g, 'jan@example.com')
                            .replace(/\{\{ticket\.number\}\}/g, '12345')
                            .replace(/\{\{ticket\.subject\}\}/g, 'Vraag over product'),
                        }}
                      />
                    </div>
                  ) : (
                    // Code/Text Editor
                    <textarea
                      value={formData.templates[0]?.content_template || ''}
                      onChange={(e) => {
                        const newTemplates = [...formData.templates];
                        newTemplates[0] = {
                          ...newTemplates[0],
                          content_template: e.target.value,
                          content_type: newTemplates[0]?.content_type || 'text/html',
                        };
                        setFormData({ ...formData, templates: newTemplates });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={12}
                      placeholder={
                        formData.templates[0]?.content_type === 'text/html'
                          ? '<p>Hallo {{customer.name}},</p>\n<p>Bedankt voor uw bericht!</p>'
                          : 'Hallo {{customer.name}},\n\nBedankt voor uw bericht!'
                      }
                    />
                  )}
                </div>

                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <strong>Beschikbare variabelen:</strong>
                      <div className="mt-1 text-xs">
                        • <code>{'{{customer.name}}'}</code> - Naam van de klant
                        <br />• <code>{'{{customer.email}}'}</code> - Email van de klant
                        <br />• <code>{'{{ticket.number}}'}</code> - Ticket nummer
                        <br />• <code>{'{{ticket.subject}}'}</code> - Ticket onderwerp
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {editingRule
              ? 'Wijzigingen opslaan om de regel bij te werken'
              : 'Nieuwe regel aanmaken'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Opslaan...' : editingRule ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AutoRepliesPage() {
  const router = useRouter();
  const { data: rules, isLoading } = useAutoReplyRules();
  const { data: stats } = useAutoReplyStats();
  const deleteRule = useDeleteAutoReplyRule();
  const toggleRule = useToggleAutoReplyRule();
  const createRule = useCreateAutoReplyRule();
  const updateRule = useUpdateAutoReplyRule();

  const [showEditor, setShowEditor] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowEditor(true);
  };

  const handleEditRule = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setShowEditor(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Weet u zeker dat u deze automatische antwoord regel wilt verwijderen?')) return;

    try {
      await deleteRule.mutateAsync(ruleId);
      showToast('success', 'Automatische antwoord regel verwijderd');
    } catch (error) {
      console.error('Error deleting rule:', error);
      showToast('error', 'Fout bij verwijderen regel');
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await toggleRule.mutateAsync({ ruleId, isActive });
      showToast('success', `Regel ${isActive ? 'geactiveerd' : 'gedeactiveerd'}`);
    } catch (error) {
      console.error('Error toggling rule:', error);
      showToast('error', 'Fout bij wijzigen regel status');
    }
  };

  const handleViewLogs = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    setShowLogs(true);
  };

  const getChannelIcons = (channelTypes: string[]) => {
    return channelTypes.map((channel) => {
      const Icon = CHANNEL_ICONS[channel as keyof typeof CHANNEL_ICONS] || MessageCircle;
      return (
        <div key={channel} className="p-1 bg-gray-100 rounded">
          <Icon className="h-3 w-3 text-gray-600" />
        </div>
      );
    });
  };

  const formatBusinessHours = (businessHours: any) => {
    if (!businessHours?.enabled) return 'Altijd actief';

    const activeDays = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

    days.forEach((day, index) => {
      if (businessHours[day]?.enabled) {
        activeDays.push(`${dayNames[index]} ${businessHours[day].start}-${businessHours[day].end}`);
      }
    });

    return activeDays.length > 0 ? activeDays.join(', ') : 'Geen actieve dagen';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Automatische antwoorden</h1>
            <p className="text-sm text-gray-500 mt-1">
              Stel automatische antwoorden in voor verschillende situaties
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowTemplates(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Sjablonen
            </Button>
            <Button onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe regel
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.activeRules || 0}</div>
            <div className="text-sm text-gray-500">Actieve regels</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats?.rulesByTrigger?.first_message || 0}
            </div>
            <div className="text-sm text-gray-500">Welkomstberichten</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats?.rulesByTrigger?.out_of_hours || 0}
            </div>
            <div className="text-sm text-gray-500">Buiten kantooruren</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats?.rulesByTrigger?.keyword_match || 0}
            </div>
            <div className="text-sm text-gray-500">Trefwoord regels</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {rules && rules.length > 0 ? (
          <div className="p-6 space-y-4">
            {rules.map((rule: AutoReplyRule) => {
              const trigger = TRIGGER_LABELS[rule.trigger_type];
              const TriggerIcon = trigger?.icon || MessageSquare;

              return (
                <Card key={rule.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-lg bg-gray-100',
                            rule.is_active && 'bg-blue-50'
                          )}
                        >
                          <TriggerIcon
                            className={cn(
                              'h-5 w-5',
                              rule.is_active ? trigger?.color : 'text-gray-400'
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{rule.name}</h3>
                            {rule.is_active ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Actief
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Inactief
                              </span>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{trigger?.description}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Type:</span>
                          <span className="font-medium">{trigger?.label}</span>
                        </div>

                        {rule.channel_types.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Kanalen:</span>
                            <div className="flex gap-1">{getChannelIcons(rule.channel_types)}</div>
                          </div>
                        )}

                        {rule.keywords.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Trefwoorden:</span>
                            <span className="font-medium">{rule.keywords.length}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Sjablonen:</span>
                          <span className="font-medium">
                            {rule.auto_reply_templates?.length || 0}
                          </span>
                        </div>

                        {rule.priority > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Prioriteit:</span>
                            <span className="font-medium">{rule.priority}</span>
                          </div>
                        )}
                      </div>

                      {/* Business Hours */}
                      {rule.trigger_type === 'out_of_hours' && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-700 mb-1">Kantooruren:</div>
                          <div className="text-xs text-gray-600">
                            {formatBusinessHours(rule.business_hours)}
                          </div>
                        </div>
                      )}

                      {/* Keywords */}
                      {rule.keywords.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-700 mb-1">
                            Trefwoorden ({rule.keyword_match_type}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {rule.keywords.slice(0, 5).map((keyword, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                              >
                                {keyword}
                              </span>
                            ))}
                            {rule.keywords.length > 5 && (
                              <span className="text-xs text-gray-400">
                                +{rule.keywords.length - 5} meer
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Templates preview */}
                      {rule.auto_reply_templates && rule.auto_reply_templates.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-700 mb-1">Sjablonen:</div>
                          <div className="space-y-1">
                            {rule.auto_reply_templates.slice(0, 2).map((template, idx) => (
                              <div key={idx} className="text-xs text-gray-600">
                                • {template.language.toUpperCase()}:{' '}
                                {template.subject_template || 'Geen onderwerp'}
                              </div>
                            ))}
                            {rule.auto_reply_templates.length > 2 && (
                              <div className="text-xs text-gray-400">
                                +{rule.auto_reply_templates.length - 2} meer sjablonen
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
                        title="Bekijk uitvoering logs"
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                        title="Bewerk regel"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleRule(rule.id, !rule.is_active)}
                        className={cn(rule.is_active ? 'text-green-600' : 'text-gray-400')}
                        title={rule.is_active ? 'Deactiveer regel' : 'Activeer regel'}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Verwijder regel"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nog geen automatische antwoorden</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              Maak automatische antwoorden om uw klantenservice te verbeteren en tijd te besparen
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowTemplates(true)}>
                Sjablonen bekijken
              </Button>
              <Button onClick={handleCreateRule}>Eerste regel maken</Button>
            </div>
          </div>
        )}
      </div>

      {/* Rule Editor Modal */}
      {showEditor && (
        <RuleEditorModal
          editingRule={editingRule}
          onClose={() => {
            setShowEditor(false);
            setEditingRule(null);
          }}
          onSave={async (ruleData) => {
            try {
              console.log('Processing rule save:', { editingRule: !!editingRule, ruleData });

              if (editingRule) {
                // Update existing rule
                console.log('Updating existing rule with ID:', editingRule.id);
                await updateRule.mutateAsync({
                  ruleId: editingRule.id,
                  updates: {
                    name: ruleData.name,
                    description: ruleData.description,
                    trigger_type: ruleData.trigger_type,
                    is_active: ruleData.is_active,
                    priority: ruleData.priority,
                    channel_types: ruleData.channel_types,
                    keywords: ruleData.keywords,
                    keyword_match_type: ruleData.keyword_match_type,
                    business_hours: ruleData.business_hours,
                  },
                  templates: ruleData.templates.map((template, index) => ({
                    ...template,
                    language: template.language || 'nl',
                    execution_order: index,
                  })),
                });
                showToast('success', 'Regel bijgewerkt');
              } else {
                // Create new rule
                console.log('Creating new rule');
                await createRule.mutateAsync({
                  name: ruleData.name,
                  description: ruleData.description,
                  trigger_type: ruleData.trigger_type,
                  is_active: ruleData.is_active,
                  priority: ruleData.priority,
                  channel_types: ruleData.channel_types,
                  keywords: ruleData.keywords,
                  keyword_match_type: ruleData.keyword_match_type,
                  business_hours: ruleData.business_hours,
                  templates: ruleData.templates.map((template, index) => ({
                    ...template,
                    language: template.language || 'nl',
                    execution_order: index,
                  })),
                  conditions: [],
                });
                showToast('success', 'Regel aangemaakt');
              }
              setShowEditor(false);
              setEditingRule(null);
            } catch (error) {
              console.error('Error saving rule:', error);
              const errorMessage = error?.message || error?.toString() || 'Onbekende fout';
              showToast('error', 'Fout bij opslaan regel: ' + errorMessage);
              throw error; // Re-throw so the modal's error handling can catch it too
            }
          }}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Sjablonen bibliotheek</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid gap-6">
                {/* Welcome Template */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Welkomstbericht</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Eerste bericht
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Onderwerp:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        Welkom bij Zynlo Support - Ticket #{'{{ticket.number}}'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Inhoud:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-line">
                        {`Hallo {{customer.name}},

Bedankt voor uw bericht! We hebben uw verzoek ontvangen en een ticket aangemaakt met nummer {{ticket.number}}.

Een van onze medewerkers zal zo spoedig mogelijk contact met u opnemen. Voor dringende zaken kunt u ons bellen op +31 20 123 4567.

Met vriendelijke groet,
Het Zynlo Support Team`}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Out of Hours Template */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Buiten kantooruren</h3>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      Buiten kantooruren
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Onderwerp:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        Buiten kantooruren - Ticket #{'{{ticket.number}}'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Inhoud:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-line">
                        {`Hallo {{customer.name}},

Bedankt voor uw bericht! U heeft contact opgenomen buiten onze kantooruren.

Onze kantooruren zijn:
• Maandag t/m vrijdag: 09:00 - 17:00
• Weekend: Gesloten

We hebben uw verzoek ontvangen en ticket {{ticket.number}} aangemaakt. Een van onze medewerkers zal tijdens kantooruren contact met u opnemen.

Voor acute problemen kunt u ons bellen op +31 20 123 4567.

Met vriendelijke groet,
Het Zynlo Support Team`}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* FAQ Template */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Veelgestelde vragen</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Trefwoord match
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Trefwoorden:</div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {['help', 'vraag', 'how', 'hoe', 'faq'].map((keyword) => (
                          <span
                            key={keyword}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Onderwerp:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        Hulp nodig? - Ticket #{'{{ticket.number}}'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Inhoud:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-line">
                        {`Hallo {{customer.name}},

Bedankt voor uw vraag! We hebben ticket {{ticket.number}} aangemaakt.

Hier zijn enkele handige links die mogelijk uw vraag beantwoorden:
• Kennisbank: https://help.zynlo.io
• Video tutorials: https://help.zynlo.io/videos
• Status pagina: https://status.zynlo.io

Als u uw antwoord niet kunt vinden, neem dan gerust contact met ons op.

Met vriendelijke groet,
Het Zynlo Support Team`}
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <strong>Tip:</strong> U kunt deze sjablonen gebruiken als basis voor uw eigen
                      automatische antwoorden. Kopieer de inhoud naar een nieuwe regel om aan de
                      slag te gaan.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-end">
              <Button onClick={() => setShowTemplates(false)}>Sluiten</Button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal - placeholder */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <h2 className="text-lg font-semibold mb-4">Uitvoering logs</h2>
            <p className="text-gray-500 mb-4">Logs weergave komt binnenkort beschikbaar...</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLogs(false);
                  setSelectedRuleId(null);
                }}
              >
                Sluiten
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
