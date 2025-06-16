'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Globe,
  Settings,
  Save,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button, Card } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/toast';

// Types for the rule editor
interface AutoReplyRuleFormData {
  name: string;
  description: string;
  trigger_type:
    | 'first_message'
    | 'keyword_match'
    | 'out_of_hours'
    | 'channel_specific'
    | 'priority_based';
  is_active: boolean;
  priority: number;
  channel_types: string[];
  keywords: string[];
  keyword_match_type: 'any' | 'all' | 'exact';
  business_hours: BusinessHours;
  templates: TemplateFormData[];
  conditions: ConditionFormData[];
}

interface BusinessHours {
  enabled: boolean;
  monday: { enabled: boolean; start: string; end: string };
  tuesday: { enabled: boolean; start: string; end: string };
  wednesday: { enabled: boolean; start: string; end: string };
  thursday: { enabled: boolean; start: string; end: string };
  friday: { enabled: boolean; start: string; end: string };
  saturday: { enabled: boolean; start: string; end: string };
  sunday: { enabled: boolean; start: string; end: string };
}

interface TemplateFormData {
  language: string;
  subject_template: string;
  content_template: string;
  content_type: 'text/plain' | 'text/html';
}

interface ConditionFormData {
  field: string;
  operator: string;
  value: string;
  condition_type: 'all' | 'any';
}

interface AutoReplyRuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingRule?: any;
  onSave: (rule: AutoReplyRuleFormData) => Promise<void>;
}

const TRIGGER_TYPES = [
  {
    value: 'first_message',
    label: 'Eerste bericht',
    description: 'Automatisch antwoord bij het eerste bericht van een klant',
  },
  {
    value: 'keyword_match',
    label: 'Trefwoord match',
    description: 'Automatisch antwoord wanneer specifieke trefwoorden worden gevonden',
  },
  {
    value: 'out_of_hours',
    label: 'Buiten kantooruren',
    description: 'Automatisch antwoord buiten bedrijfstijden',
  },
  {
    value: 'channel_specific',
    label: 'Kanaal specifiek',
    description: 'Automatisch antwoord voor specifieke communicatiekanalen',
  },
  {
    value: 'priority_based',
    label: 'Prioriteit gebaseerd',
    description: 'Automatisch antwoord gebaseerd op ticketprioriteit',
  },
];

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'chat', label: 'Live Chat' },
  { value: 'phone', label: 'Telefoon' },
];

const LANGUAGES = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Ma' },
  { key: 'tuesday', label: 'Di' },
  { key: 'wednesday', label: 'Wo' },
  { key: 'thursday', label: 'Do' },
  { key: 'friday', label: 'Vr' },
  { key: 'saturday', label: 'Za' },
  { key: 'sunday', label: 'Zo' },
];

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  enabled: false,
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '17:00' },
  sunday: { enabled: false, start: '09:00', end: '17:00' },
};

export default function AutoReplyRuleEditor({
  isOpen,
  onClose,
  editingRule,
  onSave,
}: AutoReplyRuleEditorProps) {
  const [formData, setFormData] = useState<AutoReplyRuleFormData>({
    name: '',
    description: '',
    trigger_type: 'first_message',
    is_active: true,
    priority: 0,
    channel_types: [],
    keywords: [],
    keyword_match_type: 'any',
    business_hours: DEFAULT_BUSINESS_HOURS,
    templates: [
      { language: 'nl', subject_template: '', content_template: '', content_type: 'text/html' },
    ],
    conditions: [],
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    businessHours: false,
    templates: true,
    conditions: false,
  });

  // Initialize form data when editing
  useEffect(() => {
    if (editingRule) {
      setFormData({
        name: editingRule.name || '',
        description: editingRule.description || '',
        trigger_type: editingRule.trigger_type || 'first_message',
        is_active: editingRule.is_active ?? true,
        priority: editingRule.priority || 0,
        channel_types: editingRule.channel_types || [],
        keywords: editingRule.keywords || [],
        keyword_match_type: editingRule.keyword_match_type || 'any',
        business_hours: editingRule.business_hours || DEFAULT_BUSINESS_HOURS,
        templates: editingRule.auto_reply_templates?.map((t: any) => ({
          language: t.language,
          subject_template: t.subject_template || '',
          content_template: t.content_template,
          content_type: t.content_type,
        })) || [
          { language: 'nl', subject_template: '', content_template: '', content_type: 'text/html' },
        ],
        conditions:
          editingRule.auto_reply_conditions?.map((c: any) => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
            condition_type: c.condition_type,
          })) || [],
      });
    } else {
      // Reset form for new rule
      setFormData({
        name: '',
        description: '',
        trigger_type: 'first_message',
        is_active: true,
        priority: 0,
        channel_types: [],
        keywords: [],
        keyword_match_type: 'any',
        business_hours: DEFAULT_BUSINESS_HOURS,
        templates: [
          { language: 'nl', subject_template: '', content_template: '', content_type: 'text/html' },
        ],
        conditions: [],
      });
    }
    setCurrentStep(1);
  }, [editingRule]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('error', 'Naam is verplicht');
      return;
    }

    if (formData.templates.length === 0 || !formData.templates[0].content_template.trim()) {
      showToast('error', 'Minimaal één sjabloon is verplicht');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      showToast('success', editingRule ? 'Regel bijgewerkt' : 'Regel aangemaakt');
      onClose();
    } catch (error) {
      console.error('Error saving rule:', error);
      showToast('error', 'Fout bij opslaan regel');
    } finally {
      setIsLoading(false);
    }
  };

  const addTemplate = () => {
    setFormData({
      ...formData,
      templates: [
        ...formData.templates,
        { language: 'en', subject_template: '', content_template: '', content_type: 'text/html' },
      ],
    });
  };

  const removeTemplate = (index: number) => {
    setFormData({
      ...formData,
      templates: formData.templates.filter((_, i) => i !== index),
    });
  };

  const updateTemplate = (index: number, field: keyof TemplateFormData, value: string) => {
    const newTemplates = [...formData.templates];
    newTemplates[index] = { ...newTemplates[index], [field]: value };
    setFormData({ ...formData, templates: newTemplates });
  };

  const addKeyword = () => {
    setFormData({
      ...formData,
      keywords: [...formData.keywords, ''],
    });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...formData.keywords];
    newKeywords[index] = value;
    setFormData({ ...formData, keywords: newKeywords });
  };

  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((_, i) => i !== index),
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!isOpen) return null;

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
                      setFormData({ ...formData, priority: parseInt(e.target.value) })
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
                  onChange={(e) =>
                    setFormData({ ...formData, trigger_type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TRIGGER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {TRIGGER_TYPES.find((t) => t.value === formData.trigger_type)?.description}
                </p>
              </div>

              {/* Channel Types */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kanalen (leeglaten voor alle kanalen)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CHANNELS.map((channel) => (
                    <label key={channel.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.channel_types.includes(channel.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              channel_types: [...formData.channel_types, channel.value],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              channel_types: formData.channel_types.filter(
                                (c) => c !== channel.value
                              ),
                            });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">{channel.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Keywords for keyword_match trigger */}
              {formData.trigger_type === 'keyword_match' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Trefwoorden</label>
                    <Button size="sm" onClick={addKeyword}>
                      <Plus className="h-4 w-4 mr-1" />
                      Trefwoord toevoegen
                    </Button>
                  </div>

                  <div className="mb-2">
                    <select
                      value={formData.keyword_match_type}
                      onChange={(e) =>
                        setFormData({ ...formData, keyword_match_type: e.target.value as any })
                      }
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="any">Een van de trefwoorden</option>
                      <option value="all">Alle trefwoorden</option>
                      <option value="exact">Exacte match</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {formData.keywords.map((keyword, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) => updateKeyword(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Trefwoord..."
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeKeyword(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Business Hours */}
            {formData.trigger_type === 'out_of_hours' && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Kantooruren</h3>
                  <button
                    onClick={() => toggleSection('businessHours')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedSections.businessHours ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.business_hours.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          business_hours: { ...formData.business_hours, enabled: e.target.checked },
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">Kantooruren ingeschakeld</span>
                  </label>
                </div>

                {expandedSections.businessHours && formData.business_hours.enabled && (
                  <div className="space-y-3">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.key} className="flex items-center gap-4">
                        <div className="w-8">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={
                                formData.business_hours[day.key as keyof BusinessHours]
                                  ?.enabled as boolean
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  business_hours: {
                                    ...formData.business_hours,
                                    [day.key]: {
                                      ...formData.business_hours[day.key as keyof BusinessHours],
                                      enabled: e.target.checked,
                                    },
                                  },
                                })
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </label>
                        </div>
                        <div className="w-12 text-sm font-medium">{day.label}</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={
                              (formData.business_hours[day.key as keyof BusinessHours] as any)
                                ?.start || '09:00'
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                business_hours: {
                                  ...formData.business_hours,
                                  [day.key]: {
                                    ...formData.business_hours[day.key as keyof BusinessHours],
                                    start: e.target.value,
                                  },
                                },
                              })
                            }
                            disabled={
                              !(formData.business_hours[day.key as keyof BusinessHours] as any)
                                ?.enabled
                            }
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          />
                          <span className="text-sm text-gray-500">tot</span>
                          <input
                            type="time"
                            value={
                              (formData.business_hours[day.key as keyof BusinessHours] as any)
                                ?.end || '17:00'
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                business_hours: {
                                  ...formData.business_hours,
                                  [day.key]: {
                                    ...formData.business_hours[day.key as keyof BusinessHours],
                                    end: e.target.value,
                                  },
                                },
                              })
                            }
                            disabled={
                              !(formData.business_hours[day.key as keyof BusinessHours] as any)
                                ?.enabled
                            }
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Templates */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Sjablonen *</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={addTemplate}>
                    <Plus className="h-4 w-4 mr-1" />
                    Sjabloon toevoegen
                  </Button>
                  <button
                    onClick={() => toggleSection('templates')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedSections.templates ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedSections.templates && (
                <div className="space-y-4">
                  {formData.templates.map((template, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <select
                            value={template.language}
                            onChange={(e) => updateTemplate(index, 'language', e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {LANGUAGES.map((lang) => (
                              <option key={lang.value} value={lang.value}>
                                {lang.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={template.content_type}
                            onChange={(e) => updateTemplate(index, 'content_type', e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="text/html">HTML</option>
                            <option value="text/plain">Tekst</option>
                          </select>
                        </div>
                        {formData.templates.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeTemplate(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Onderwerp (optioneel)
                          </label>
                          <input
                            type="text"
                            value={template.subject_template}
                            onChange={(e) =>
                              updateTemplate(index, 'subject_template', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Bijv. Bedankt voor uw bericht - Ticket #{{ticket.number}}"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bericht inhoud *
                          </label>
                          <textarea
                            value={template.content_template}
                            onChange={(e) =>
                              updateTemplate(index, 'content_template', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={6}
                            placeholder="Hallo {{customer.name}},

Bedankt voor uw bericht! We hebben uw verzoek ontvangen en een ticket aangemaakt met nummer {{ticket.number}}.

Met vriendelijke groet,
Het Zynlo Support Team"
                          />
                        </div>
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
                              <br />• <code>{'{{ticket.priority}}'}</code> - Ticket prioriteit
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              {isLoading ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingRule ? 'Bijwerken' : 'Aanmaken'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
