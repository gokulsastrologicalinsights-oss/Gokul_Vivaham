'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Edit2, Check, X, Search, Database, 
  Trash2, AlertCircle, Save, CheckSquare, Power
} from 'lucide-react';
import { RELIGION_COMMUNITY_MAPPING, RELIGIONS } from '@/constants/religion-community-mapping';
import PrimaryButton from '@/components/ui/button/PrimaryButton';

interface CommunityRecord {
  id: string;
  name: string;
  religion: string;
  is_active: boolean;
}

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

export default function AdminReligionCommunityPage() {
  const [communities, setCommunities] = useState<CommunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState<'Mock' | 'Live'>('Mock');

  // Filters
  const [selectedReligionFilter, setSelectedReligionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Community Form
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityReligion, setNewCommunityReligion] = useState('Hindu');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Editing state
  const [editingCommunity, setEditingCommunity] = useState<CommunityRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editReligion, setEditReligion] = useState('');

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      if (isMockMode()) {
        setDbMode('Mock');
        const mockData = localStorage.getItem('gokul_mock_communities_list');
        if (mockData) {
          setCommunities(JSON.parse(mockData));
        } else {
          // Convert the static mapping dictionary to a record array
          const initialList: CommunityRecord[] = [];
          let index = 1;
          Object.keys(RELIGION_COMMUNITY_MAPPING).forEach((religion) => {
            RELIGION_COMMUNITY_MAPPING[religion].forEach((name) => {
              initialList.push({
                id: `mock-c-${index++}`,
                name,
                religion,
                is_active: true
              });
            });
          });
          localStorage.setItem('gokul_mock_communities_list', JSON.stringify(initialList));
          setCommunities(initialList);
        }
      } else {
        setDbMode('Live');
        const { data, error } = await supabase
          .from('communities')
          .select('*')
          .order('religion', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setCommunities(data || []);
      }
    } catch (e) {
      console.error('Error fetching communities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  // Write updates to LocalStorage and group state (needed to sync the useReligionCommunities hook)
  const syncMockDropdownMapping = (list: CommunityRecord[]) => {
    const grouped: Record<string, string[]> = {};
    list.forEach(item => {
      if (item.is_active) {
        if (!grouped[item.religion]) {
          grouped[item.religion] = [];
        }
        grouped[item.religion].push(item.name);
      }
    });
    localStorage.setItem('gokul_mock_communities', JSON.stringify(grouped));
  };

  const handleAddCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newCommunityName.trim()) {
      setFormError('Community name is required');
      return;
    }

    const cleanName = newCommunityName.trim();

    // Check duplicate locally
    const duplicate = communities.find(
      c => c.name.toLowerCase() === cleanName.toLowerCase() && c.religion === newCommunityReligion
    );

    if (duplicate) {
      setFormError(`"${cleanName}" already exists under ${newCommunityReligion}`);
      return;
    }

    try {
      if (isMockMode()) {
        const newRecord: CommunityRecord = {
          id: `mock-c-${Date.now()}`,
          name: cleanName,
          religion: newCommunityReligion,
          is_active: true
        };
        const updatedList = [newRecord, ...communities];
        localStorage.setItem('gokul_mock_communities_list', JSON.stringify(updatedList));
        syncMockDropdownMapping(updatedList);
        setCommunities(updatedList);
        setFormSuccess('Community added successfully in Sandbox Mode!');
        setNewCommunityName('');
      } else {
        const { error } = await supabase
          .from('communities')
          .insert({
            name: cleanName,
            religion: newCommunityReligion,
            is_active: true
          });

        if (error) throw error;
        setFormSuccess('Community mapped and saved to Supabase!');
        setNewCommunityName('');
        fetchCommunities();
      }
    } catch (err: any) {
      setFormError(err.message || 'Database error occurred');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      if (isMockMode()) {
        const updatedList = communities.map(c => 
          c.id === id ? { ...c, is_active: !currentActive } : c
        );
        localStorage.setItem('gokul_mock_communities_list', JSON.stringify(updatedList));
        syncMockDropdownMapping(updatedList);
        setCommunities(updatedList);
      } else {
        const { error } = await supabase
          .from('communities')
          .update({ is_active: !currentActive })
          .eq('id', id);

        if (error) throw error;
        fetchCommunities();
      }
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleStartEdit = (record: CommunityRecord) => {
    setEditingCommunity(record);
    setEditName(record.name);
    setEditReligion(record.religion);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommunity) return;

    if (!editName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    const cleanName = editName.trim();

    try {
      if (isMockMode()) {
        const updatedList = communities.map(c => 
          c.id === editingCommunity.id ? { ...c, name: cleanName, religion: editReligion } : c
        );
        localStorage.setItem('gokul_mock_communities_list', JSON.stringify(updatedList));
        syncMockDropdownMapping(updatedList);
        setCommunities(updatedList);
        setEditingCommunity(null);
      } else {
        const { error } = await supabase
          .from('communities')
          .update({ name: cleanName, religion: editReligion })
          .eq('id', editingCommunity.id);

        if (error) throw error;
        setEditingCommunity(null);
        fetchCommunities();
      }
    } catch (err: any) {
      alert('Error updating community: ' + err.message);
    }
  };

  const filteredCommunities = communities.filter((c) => {
    const matchesReligion = selectedReligionFilter ? c.religion === selectedReligionFilter : true;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesReligion && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 text-left">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
            Religion &amp; Caste Master Management
          </h1>
          <p className="text-xs text-muted font-light">
            Dynamically add communities, adjust mappings, or deactivate castes. Changes propagate instantly to search filters and profile forms.
          </p>
        </div>

        {/* Database indicator */}
        <div className="self-start sm:self-center">
          <span className={`px-3 py-1 text-[10px] font-bold font-mono rounded-full uppercase tracking-wider ${
            dbMode === 'Mock' 
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
          }`}>
            Database: {dbMode} Mode
          </span>
        </div>
      </div>

      {/* Grid: Left Column (Filters & Listing Table) / Right Column (Add Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LISTING COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search community name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            <select
              value={selectedReligionFilter}
              onChange={(e) => setSelectedReligionFilter(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-border bg-background text-xs focus:outline-none text-foreground w-full sm:w-48 shrink-0"
            >
              <option value="">All Religions</option>
              {RELIGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="p-16 text-center text-muted font-mono text-xs border border-border rounded-3xl bg-card">
              Loading communities database...
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-surface/50 border-b border-border text-muted font-mono uppercase text-[10px] tracking-wider">
                      <th className="px-6 py-4">Caste / Community</th>
                      <th className="px-6 py-4">Religion Mapped</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {filteredCommunities.length > 0 ? (
                      filteredCommunities.map((c) => (
                        <tr key={c.id} className="hover:bg-surface/30">
                          <td className="px-6 py-4 font-semibold text-foreground font-sans">
                            {c.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded bg-surface border border-border text-primary font-bold uppercase text-[9px]">
                              {c.religion}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              c.is_active 
                                ? 'bg-emerald-600/10 text-emerald-600 border border-emerald-500/20' 
                                : 'bg-destructive/10 text-destructive border border-destructive/20'
                            }`}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleStartEdit(c)}
                                className="p-1.5 rounded-lg border border-border bg-surface hover:bg-background text-primary hover:text-foreground cursor-pointer transition-colors"
                                title="Edit Mappings"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              
                              <button
                                onClick={() => handleToggleActive(c.id, c.is_active)}
                                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                  c.is_active 
                                    ? 'border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                }`}
                                title={c.is_active ? 'Deactivate Community' : 'Activate Community'}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted font-mono">
                          No caste/community records match the filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border bg-surface/20 text-center text-[10px] text-muted font-mono">
                Total Listed Communities: {filteredCommunities.length}
              </div>
            </div>
          )}

        </div>

        {/* ADD / EDIT SIDEBAR FORM */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Add Community Form */}
          <div className="bg-card border border-border p-6 rounded-3xl shadow-md">
            <h2 className="text-base font-serif font-bold text-foreground border-b border-border pb-3 mb-4 flex items-center gap-1.5">
              <Plus className="h-4.5 w-4.5 text-primary" />
              Add Community Mapping
            </h2>

            <form onSubmit={handleAddCommunity} className="flex flex-col gap-4 text-xs">
              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-600/10 border border-emerald-500/25 rounded-xl text-emerald-600 dark:text-emerald-450 font-semibold flex items-center gap-1.5">
                  <Check className="h-4 w-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div className="flex flex-col gap-1 text-left">
                <label className="font-mono text-muted uppercase font-bold text-[9px] tracking-wider">Religion Mapped</label>
                <select
                  value={newCommunityReligion}
                  onChange={(e) => setNewCommunityReligion(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-border bg-background focus:outline-none text-foreground font-sans text-xs w-full"
                >
                  {RELIGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="font-mono text-muted uppercase font-bold text-[9px] tracking-wider">Caste / Community Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mudaliar, Nair"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-border bg-background focus:outline-none text-foreground font-sans text-xs w-full font-semibold"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 luxury-gradient text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-95 shadow cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4 text-white" />
                  Add to Registry
                </button>
              </div>
            </form>
          </div>

          {/* Quick Help Guide */}
          <div className="p-5 rounded-3xl bg-surface/50 border border-border/80 text-[11px] font-light text-muted leading-relaxed">
            <h3 className="font-bold text-foreground mb-1">Administrative Note</h3>
            Deactivating a community will prevent members from selecting it on new profiles, edit screens, or search filters. Existing users set to deactivated communities will preserve their values but will be flagged during profile edits.
          </div>

        </div>

      </div>

      {/* EDIT MODAL DIALOG */}
      {editingCommunity && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-base font-serif font-bold text-foreground">Edit Community Mapping</h2>
              <button 
                onClick={() => setEditingCommunity(null)}
                className="p-1 rounded-full bg-surface hover:bg-background text-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 flex flex-col gap-4 text-xs text-left">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-muted uppercase font-bold text-[9px] tracking-wider">Religion Mapped</label>
                <select
                  value={editReligion}
                  onChange={(e) => setEditReligion(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-border bg-background focus:outline-none text-foreground font-sans text-xs w-full"
                >
                  {RELIGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-muted uppercase font-bold text-[9px] tracking-wider">Caste / Community Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-border bg-background focus:outline-none text-foreground font-sans text-xs w-full font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3.5 pt-4 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setEditingCommunity(null)}
                  className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 luxury-gradient text-white rounded-lg font-bold uppercase tracking-wider hover:opacity-95 shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4 text-white" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
