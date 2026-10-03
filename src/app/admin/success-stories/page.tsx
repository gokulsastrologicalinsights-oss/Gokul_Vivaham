'use client';

import { useState, useEffect } from 'react';
import { 
  Heart, Check, X, Trash2, Calendar, 
  Loader2, RefreshCw, AlertCircle, Image as ImageIcon,
  MessageSquare, User, ExternalLink, Search, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminSuccessStoriesPage() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const loadAdminStories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('success_stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Collect all user IDs
        const userIds = new Set<string>();
        data.forEach(s => {
          if (s.husband_user_id) userIds.add(s.husband_user_id);
          if (s.wife_user_id) userIds.add(s.wife_user_id);
        });

        // Fetch profile names and IDs
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, profile_id')
          .in('user_id', Array.from(userIds));

        const mapped = data.map(s => {
          const husband = profiles?.find(p => p.user_id === s.husband_user_id);
          const wife = profiles?.find(p => p.user_id === s.wife_user_id);

          return {
            ...s,
            husbandName: husband ? `${husband.first_name} ${husband.last_name || ''}`.trim() : 'Unknown Husband',
            husbandId: husband ? husband.profile_id : 'N/A',
            wifeName: wife ? `${wife.first_name} ${wife.last_name || ''}`.trim() : 'Unknown Wife',
            wifeId: wife ? wife.profile_id : 'N/A'
          };
        });

        setStories(mapped);
      } else {
        setStories([]);
      }
    } catch (err) {
      console.error('Error loading admin stories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminStories();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('success_stories')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      alert(`Success story status updated to ${status}.`);
      loadAdminStories();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this success story? This cannot be undone.')) return;
    
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('success_stories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Success story deleted from system.');
      loadAdminStories();
    } catch (err: any) {
      alert('Error deleting story: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter stories based on activeTab and searchTerm
  const filteredStories = stories.filter(story => {
    if (story.status !== activeTab) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = 
        story.husbandName.toLowerCase().includes(term) ||
        story.wifeName.toLowerCase().includes(term) ||
        story.story.toLowerCase().includes(term) ||
        story.husbandId.toLowerCase().includes(term) ||
        story.wifeId.toLowerCase().includes(term);
      if (!matchName) return false;
    }

    return true;
  });

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-background p-6 md:p-8 text-foreground relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.04] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto z-10 relative flex flex-col gap-6 text-left">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-serif font-bold text-foreground tracking-wide flex items-center gap-2">
              <Heart className="h-6 w-6 text-destructive fill-destructive/20" />
              Success Stories Moderation
            </h1>
            <p className="text-xs text-muted font-light max-w-xl leading-normal">
              Review couples success story submissions. Moderate, approve natal and wedding narratives, and verify image safety guidelines before publishing to the public homepage slider.
            </p>
          </div>
          <button
            onClick={loadAdminStories}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground text-xs font-semibold hover:bg-surface transition-all cursor-pointer font-mono"
          >
            <RefreshCw className="h-3.5 w-3.5" /> REFRESH
          </button>
        </div>

        {/* Filters and Tabs Grid */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 border border-border rounded-2xl">
          {/* Tabs */}
          <div className="flex gap-1.5 p-0.5 bg-background border border-border rounded-xl w-full sm:w-auto">
            {(['pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                  activeTab === tab 
                    ? 'bg-primary/10 text-primary border border-primary/25 font-bold shadow-inner' 
                    : 'text-muted hover:text-foreground hover:bg-surface/20 border border-transparent'
                }`}
              >
                {tab} ({stories.filter(s => s.status === tab).length})
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search couples or stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 h-8.5 text-xs font-light rounded-xl bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 text-muted font-mono text-xs border border-border rounded-2xl">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span>Consulting database records...</span>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="p-20 text-center text-muted font-mono text-xs border border-dashed border-border rounded-3xl bg-surface">
            <AlertCircle className="h-8 w-8 text-muted mx-auto mb-3" />
            No {activeTab} success stories found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredStories.map((story) => {
              const isActionLoading = actionLoading === story.id;
              return (
                <div 
                  key={story.id}
                  className="bg-card border border-border rounded-3xl p-6 shadow-lg flex flex-col md:flex-row justify-between gap-6 hover:border-muted/30 transition-colors"
                >
                  {/* Photo Section */}
                  <div className="w-full md:w-48 aspect-video md:aspect-[4/3] rounded-2xl bg-background overflow-hidden relative border border-border shrink-0 group">
                    <img 
                      src={story.image_url} 
                      alt="Couple story" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                    />
                    <button 
                      onClick={() => setSelectedPhoto(story.image_url)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white uppercase tracking-wider transition-opacity cursor-pointer border-none"
                    >
                      <ImageIcon className="h-4 w-4 mr-1.5" /> Zoom Photo
                    </button>
                  </div>

                  {/* Narrative details */}
                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 font-serif text-base font-bold text-foreground">
                          <User className="h-4 w-4 text-primary" />
                          <span>{story.husbandName} ({story.husbandId})</span>
                          <span className="text-muted font-sans text-xs px-1">&amp;</span>
                          <span>{story.wifeName} ({story.wifeId})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted uppercase">
                          <Calendar className="h-3.5 w-3.5 text-muted" />
                          <span>Married: {new Date(story.wedding_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Story Text */}
                      <p className="text-xs text-muted leading-relaxed font-light mt-1 font-sans">
                        {story.story}
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 border-t border-border pt-4 text-[10px] font-mono text-muted">
                      <span>Submitted: {new Date(story.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <div className="flex gap-2">
                        <Link 
                          href={`/admin/users?search=${story.husbandId}`}
                          className="hover:underline flex items-center gap-0.5 text-primary hover:text-primary/80"
                        >
                          Husband User <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                        <span>•</span>
                        <Link 
                          href={`/admin/users?search=${story.wifeId}`}
                          className="hover:underline flex items-center gap-0.5 text-primary hover:text-primary/80"
                        >
                          Wife User <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-row md:flex-col justify-end md:justify-center items-center gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0 min-w-[120px]">
                    {isActionLoading ? (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    ) : (
                      <>
                        {story.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(story.id, 'approved')}
                            className="flex-1 md:w-full h-8.5 rounded-lg border border-success/30 bg-success/15 hover:bg-success/30 text-success text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="Approve and Publish to homepage"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {story.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(story.id, 'rejected')}
                            className="flex-1 md:w-full h-8.5 rounded-lg border border-destructive/30 bg-destructive/15 hover:bg-destructive/30 text-destructive text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="Reject Story"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className="h-8.5 w-8.5 rounded-lg border border-border hover:border-destructive hover:bg-destructive/10 text-muted hover:text-destructive flex items-center justify-center transition-all cursor-pointer shrink-0"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* FULL PHOTO LIGHTBOX OVERLAY */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-border relative bg-card">
            <img src={selectedPhoto} alt="Story Lightbox" className="max-w-full max-h-[85vh] object-contain" />
            <button 
              className="absolute top-4 right-4 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
