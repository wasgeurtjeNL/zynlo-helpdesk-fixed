'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MessageSquare, Star, BarChart3, Search, Filter } from 'lucide-react';
import { useAuthContext } from '@/components/auth-provider';
import {
  useSavedReplies,
  useCreateSavedReply,
  useUpdateSavedReply,
  useDeleteSavedReply,
} from '@zynlo/supabase';
import { showToast } from '@/components/toast';
import { cn } from '@/lib/utils';

interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: string | null;
  shortcuts: string[] | null;
  language: string | null;
  usage_count: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SavedReplyForm {
  title: string;
  content: string;
  category: string;
  shortcuts: string;
  language: string;
}

const CATEGORIES = [
  'Begroeting',
  'Afsluiting',
  'Veelgestelde vragen',
  'Technische ondersteuning',
  'Verkoop',
  'Facturering',
  'Klachten',
  'Algemeen',
];

const LANGUAGES = [
  { code: 'nl', name: 'Nederlands' },
  { code: 'en', name: 'Engels' },
  { code: 'de', name: 'Duits' },
  { code: 'fr', name: 'Frans' },
];

export default function SavedRepliesPage() {
  const { user } = useAuthContext();
  const [showModal, setShowModal] = useState(false);
  const [editingReply, setEditingReply] = useState<SavedReply | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  const [form, setForm] = useState<SavedReplyForm>({
    title: '',
    content: '',
    category: '',
    shortcuts: '',
    language: 'nl',
  });

  const { data: savedReplies = [], isLoading, error } = useSavedReplies(user?.id || '');
  const createReply = useCreateSavedReply();
  const updateReply = useUpdateSavedReply();
  const deleteReply = useDeleteSavedReply();

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      category: '',
      shortcuts: '',
      language: 'nl',
    });
    setEditingReply(null);
  };

  const openModal = (reply?: SavedReply) => {
    if (reply) {
      setForm({
        title: reply.title,
        content: reply.content,
        category: reply.category || '',
        shortcuts: reply.shortcuts?.join(', ') || '',
        language: reply.language || 'nl',
      });
      setEditingReply(reply);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      showToast('error', 'Titel en inhoud zijn verplicht');
      return;
    }

    const shortcuts = form.shortcuts
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const data = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category || null,
      shortcuts: shortcuts.length > 0 ? shortcuts : null,
      language: form.language,
      user_id: user?.id,
      is_active: true,
    };

    try {
      if (editingReply) {
        await updateReply.mutateAsync({
          id: editingReply.id,
          updates: data,
        });
        showToast('success', 'Snel antwoord bijgewerkt');
      } else {
        await createReply.mutateAsync(data);
        showToast('success', 'Snel antwoord toegevoegd');
      }
      closeModal();
    } catch (error) {
      showToast('error', 'Er is een fout opgetreden');
      console.error('Error saving reply:', error);
    }
  };

  const handleDelete = async (reply: SavedReply) => {
    if (!confirm(`Weet je zeker dat je "${reply.title}" wilt verwijderen?`)) return;

    try {
      await deleteReply.mutateAsync(reply.id);
      showToast('success', 'Snel antwoord verwijderd');
    } catch (error) {
      showToast('error', 'Er is een fout opgetreden bij het verwijderen');
      console.error('Error deleting reply:', error);
    }
  };

  // Filter saved replies
  const filteredReplies = savedReplies.filter((reply) => {
    const matchesSearch =
      !searchTerm ||
      reply.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reply.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || reply.category === selectedCategory;
    const matchesLanguage = !selectedLanguage || reply.language === selectedLanguage;

    return matchesSearch && matchesCategory && matchesLanguage;
  });

  // Group by category
  const groupedReplies = filteredReplies.reduce(
    (groups, reply) => {
      const category = reply.category || 'Overig';
      if (!groups[category]) groups[category] = [];
      groups[category].push(reply);
      return groups;
    },
    {} as Record<string, SavedReply[]>
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          Er is een fout opgetreden bij het laden van de snel antwoorden.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Snel Antwoorden</h1>
          <p className="text-gray-600 mt-1">
            Beheer je opgeslagen antwoorden voor snellere klantenservice
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuw antwoord
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Totaal antwoorden</p>
              <p className="text-xl font-semibold">{savedReplies.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Totaal gebruik</p>
              <p className="text-xl font-semibold">
                {savedReplies.reduce((sum, reply) => sum + (reply.usage_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Meest gebruikt</p>
              <p className="text-xl font-semibold">
                {Math.max(...savedReplies.map((reply) => reply.usage_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Zoek in titel of inhoud..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle categorieën</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle talen</option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Saved Replies List */}
      <div className="space-y-6">
        {Object.keys(groupedReplies).length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Geen snel antwoorden gevonden
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory || selectedLanguage
                ? 'Probeer je filters aan te passen'
                : 'Maak je eerste snel antwoord aan om tijd te besparen'}
            </p>
            {!searchTerm && !selectedCategory && !selectedLanguage && (
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Eerste antwoord maken
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedReplies).map(([category, replies]) => (
            <div key={category} className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">{category}</h3>
                <p className="text-sm text-gray-600">{replies.length} antwoord(en)</p>
              </div>
              <div className="divide-y divide-gray-200">
                {replies.map((reply) => (
                  <div key={reply.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 truncate">{reply.title}</h4>
                          {reply.shortcuts && reply.shortcuts.length > 0 && (
                            <div className="flex gap-1">
                              {reply.shortcuts.map((shortcut, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded"
                                >
                                  {shortcut}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-2">{reply.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Taal:{' '}
                            {LANGUAGES.find((l) => l.code === reply.language)?.name ||
                              reply.language}
                          </span>
                          <span>Gebruikt: {reply.usage_count || 0}x</span>
                          <span>
                            Aangemaakt:{' '}
                            {reply.created_at
                              ? new Date(reply.created_at).toLocaleDateString('nl-NL')
                              : 'Onbekend'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openModal(reply)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bewerken"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(reply)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingReply ? 'Snel antwoord bewerken' : 'Nieuw snel antwoord'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijvoorbeeld: Welkomstbericht"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Geen categorie</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Taal</label>
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sneltoetsen (optioneel)
                </label>
                <input
                  type="text"
                  value={form.shortcuts}
                  onChange={(e) => setForm({ ...form, shortcuts: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijvoorbeeld: hoi, welkom (gescheiden door komma's)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Gebruik sneltoetsen om dit antwoord snel te vinden tijdens het typen
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inhoud *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Typ hier de inhoud van je snel antwoord..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Je kunt variabelen gebruiken zoals {'{{klant.naam}}'} en {'{{ticket.nummer}}'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={createReply.isPending || updateReply.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createReply.isPending || updateReply.isPending
                    ? 'Bezig...'
                    : editingReply
                      ? 'Bijwerken'
                      : 'Aanmaken'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
