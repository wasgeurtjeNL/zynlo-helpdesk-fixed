'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  Image,
  Upload,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Palette,
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  Building,
  Plus,
  X,
} from 'lucide-react';
import { Button, Card } from '@/lib/ui';
import { cn } from '@/lib/utils';
import {
  useAuth,
  useUserSignature,
  useSaveUserSignature,
  useDeleteUserSignature,
} from '@zynlo/supabase';

// Toast notification function
function showToast(type: 'success' | 'error', message: string) {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => document.body.removeChild(toast), 3000);
}

// Signature templates
const SIGNATURE_TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern & Clean',
    description: 'Een strakke, moderne signature met subtiele styling',
    preview: `
<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;">
  <div style="border-left: 3px solid #0066cc; padding-left: 15px; margin-bottom: 10px;">
    <div style="font-weight: bold; font-size: 16px; color: #0066cc;">{{name}}</div>
    <div style="color: #666; margin-top: 2px;">{{title}}</div>
    <div style="color: #666;">{{company}}</div>
  </div>
  <div style="font-size: 12px; color: #888;">
    <div>📧 {{email}} | 📱 {{phone}}</div>
    <div>🌐 {{website}} | 📍 {{address}}</div>
  </div>
</div>`,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Klassieke, professionele uitstraling voor zakelijke communicatie',
    preview: `
<div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.5; color: #000;">
  <div style="margin-bottom: 10px;">
    <div style="font-weight: bold; font-size: 16px;">{{name}}</div>
    <div style="font-style: italic; color: #444;">{{title}}</div>
    <div style="font-weight: bold; color: #0066cc;">{{company}}</div>
  </div>
  <div style="border-top: 1px solid #ccc; padding-top: 8px; font-size: 12px;">
    <div>Email: {{email}}</div>
    <div>Tel: {{phone}}</div>
    <div>Web: {{website}}</div>
    <div>Adres: {{address}}</div>
  </div>
</div>`,
  },
  {
    id: 'creative',
    name: 'Creative & Colorful',
    description: 'Kleurrijke signature voor creatieve professionals',
    preview: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.4;">
  <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
    <div style="font-weight: bold; font-size: 18px;">{{name}}</div>
    <div style="opacity: 0.9;">{{title}} @ {{company}}</div>
  </div>
  <div style="display: flex; gap: 15px; font-size: 12px; color: #666;">
    <span>✉️ {{email}}</span>
    <span>📞 {{phone}}</span>
    <span>🌍 {{website}}</span>
  </div>
</div>`,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Eenvoudige, minimalistische signature',
    preview: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; line-height: 1.4; color: #333;">
  <div>
    <strong>{{name}}</strong><br>
    {{title}}<br>
    {{company}}
  </div>
  <div style="margin-top: 8px; font-size: 12px; color: #666;">
    {{email}} • {{phone}}<br>
    {{website}}
  </div>
</div>`,
  },
];

// Signature field component
function SignatureField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  icon: any;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Icon className="h-4 w-4 inline mr-2" />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default function SignatureSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: signature, isLoading } = useUserSignature(user?.id || '');
  const saveSignature = useSaveUserSignature();
  const deleteSignature = useDeleteUserSignature();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    greeting: 'Met vriendelijke groet,',
    footer: '',
    isActive: true,
  });

  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load signature data when available
  useEffect(() => {
    if (signature && user) {
      setFormData({
        name: signature.name || user.user_metadata?.full_name || '',
        title: signature.greeting || '',
        company: signature.footer || '',
        email: user.email || '',
        phone: '',
        website: '',
        address: '',
        greeting: signature.greeting || 'Met vriendelijke groet,',
        footer: signature.footer || '',
        isActive: signature.is_active ?? true,
      });
    } else if (user && !signature) {
      setFormData((prev) => ({
        ...prev,
        name: user.user_metadata?.full_name || '',
        email: user.email || '',
      }));
    }
  }, [signature, user]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const template = SIGNATURE_TEMPLATES.find((t) => t.id === selectedTemplate);
      const htmlContent = template ? generateHtmlSignature(template.preview, formData) : '';

      await saveSignature.mutateAsync({
        userId: user.id,
        greeting: formData.greeting,
        name: formData.name,
        footer: formData.company,
        htmlContent,
        isActive: formData.isActive,
      });

      showToast('success', 'Email signature opgeslagen');
    } catch (error) {
      console.error('Error saving signature:', error);
      showToast('error', 'Fout bij opslaan signature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !signature) return;

    if (!confirm('Weet u zeker dat u uw email signature wilt verwijderen?')) return;

    try {
      await deleteSignature.mutateAsync(user.id);
      showToast('success', 'Email signature verwijderd');
      setFormData({
        name: user.user_metadata?.full_name || '',
        title: '',
        company: '',
        email: user.email || '',
        phone: '',
        website: '',
        address: '',
        greeting: 'Met vriendelijke groet,',
        footer: '',
        isActive: true,
      });
    } catch (error) {
      console.error('Error deleting signature:', error);
      showToast('error', 'Fout bij verwijderen signature');
    }
  };

  const generateHtmlSignature = (template: string, data: typeof formData) => {
    return template
      .replace(/\{\{name\}\}/g, data.name || '')
      .replace(/\{\{title\}\}/g, data.title || '')
      .replace(/\{\{company\}\}/g, data.company || '')
      .replace(/\{\{email\}\}/g, data.email || '')
      .replace(/\{\{phone\}\}/g, data.phone || '')
      .replace(/\{\{website\}\}/g, data.website || '')
      .replace(/\{\{address\}\}/g, data.address || '');
  };

  const copySignatureToClipboard = () => {
    const template = SIGNATURE_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (!template) return;

    const htmlContent = generateHtmlSignature(template.preview, formData);
    navigator.clipboard.writeText(htmlContent).then(() => {
      showToast('success', 'Signature gekopieerd naar klembord');
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Geen gebruiker gevonden</p>
        </div>
      </div>
    );
  }

  const selectedTemplateData = SIGNATURE_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Email Signature</h1>
              <p className="text-sm text-gray-500 mt-1">
                Beheer uw persoonlijke email signature voor alle uitgaande berichten
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className={cn(previewMode && 'bg-blue-50 text-blue-700')}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Editor' : 'Preview'}
            </Button>
            {signature && (
              <Button variant="outline" onClick={copySignatureToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Kopiëren
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {formData.isActive ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm font-medium">
                Signature {formData.isActive ? 'actief' : 'inactief'}
              </span>
            </div>
            <button
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {formData.isActive ? 'Deactiveren' : 'Activeren'}
            </button>
          </div>
          {signature && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Verwijderen
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Editor */}
            <div className="lg:col-span-2 space-y-6">
              {!previewMode ? (
                <>
                  {/* Template Selection */}
                  <Card className="p-6">
                    <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                      <Palette className="h-5 w-5 mr-2" />
                      Signature Sjabloon
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {SIGNATURE_TEMPLATES.map((template) => (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={cn(
                            'p-4 border rounded-lg cursor-pointer transition-all',
                            selectedTemplate === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            {selectedTemplate === template.id && (
                              <CheckCircle className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{template.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Contact Information */}
                  <Card className="p-6">
                    <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Contact Informatie
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SignatureField
                        label="Naam"
                        value={formData.name}
                        onChange={(value) => setFormData({ ...formData, name: value })}
                        placeholder="Jouw volledige naam"
                        icon={User}
                      />
                      <SignatureField
                        label="Functietitel"
                        value={formData.title}
                        onChange={(value) => setFormData({ ...formData, title: value })}
                        placeholder="Bijv. Senior Developer"
                        icon={Briefcase}
                      />
                      <SignatureField
                        label="Bedrijf"
                        value={formData.company}
                        onChange={(value) => setFormData({ ...formData, company: value })}
                        placeholder="Bedrijfsnaam"
                        icon={Building}
                      />
                      <SignatureField
                        label="Email"
                        value={formData.email}
                        onChange={(value) => setFormData({ ...formData, email: value })}
                        placeholder="jouw@email.com"
                        type="email"
                        icon={Mail}
                      />
                      <SignatureField
                        label="Telefoon"
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value })}
                        placeholder="+31 6 12345678"
                        type="tel"
                        icon={Phone}
                      />
                      <SignatureField
                        label="Website"
                        value={formData.website}
                        onChange={(value) => setFormData({ ...formData, website: value })}
                        placeholder="https://jouwwebsite.nl"
                        type="url"
                        icon={Globe}
                      />
                    </div>
                    <div className="mt-4">
                      <SignatureField
                        label="Adres"
                        value={formData.address}
                        onChange={(value) => setFormData({ ...formData, address: value })}
                        placeholder="Straatnaam 123, 1234 AB Stad"
                        icon={MapPin}
                      />
                    </div>
                  </Card>

                  {/* Additional Settings */}
                  <Card className="p-6">
                    <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Extra Instellingen
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Groet
                        </label>
                        <input
                          type="text"
                          value={formData.greeting}
                          onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Met vriendelijke groet,"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Extra footer tekst
                        </label>
                        <textarea
                          value={formData.footer}
                          onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Bijv. disclaimer tekst of extra informatie..."
                        />
                      </div>
                    </div>
                  </Card>
                </>
              ) : (
                /* Preview Mode */
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Signature Preview</h3>
                    <div className="text-xs text-gray-500">
                      Template: {selectedTemplateData?.name}
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="text-sm text-gray-600 mb-4">{formData.greeting}</div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedTemplateData
                          ? generateHtmlSignature(selectedTemplateData.preview, formData)
                          : '',
                      }}
                    />
                    {formData.footer && (
                      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                        {formData.footer}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column - Quick Preview & Tips */}
            <div className="space-y-6">
              {/* Quick Preview */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3 text-sm">Live Preview</h4>
                <div className="text-xs border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="text-gray-600 mb-2">{formData.greeting}</div>
                  <div
                    style={{ fontSize: '11px' }}
                    dangerouslySetInnerHTML={{
                      __html: selectedTemplateData
                        ? generateHtmlSignature(selectedTemplateData.preview, formData)
                        : '',
                    }}
                  />
                </div>
              </Card>

              {/* Tips */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3 text-sm">💡 Tips</h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Houd je signature kort en professioneel</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Voeg alleen relevante contactgegevens toe</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Test je signature in verschillende email clients</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Gebruik consistente styling voor je merk</span>
                  </div>
                </div>
              </Card>

              {/* Current Status */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3 text-sm">Status</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Signature</span>
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        signature ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      )}
                    >
                      {signature ? 'Geconfigureerd' : 'Niet ingesteld'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        formData.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {formData.isActive ? 'Actief' : 'Inactief'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Template</span>
                    <span className="text-gray-900 font-medium">{selectedTemplateData?.name}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
