'use client';

import { useState, useEffect } from 'react';
import { 
  Camera, Check, X, ShieldAlert, AlertCircle, RefreshCw, 
  Loader2, User, Clock, CheckCircle, Trash2, Shield
} from 'lucide-react';
import Link from 'next/link';
import { galleryService, GalleryImage } from '@/services/gallery.service';

export default function AdminGalleryModeration() {
  const [queue, setQueue] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'flagged'>('pending');

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await galleryService.adminGetPendingGallery(statusFilter);
      if (err) throw err;
      setQueue(data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch pending gallery photos.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess(null);
    } else {
      setSuccess(message);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 4500);
  };

  const handleModeration = async (image: GalleryImage, action: 'approve' | 'reject' | 'flag') => {
    let note = '';
    if (action === 'flag') {
      const reason = prompt('Enter flag/rejection note for candidate:');
      if (reason === null) return; // Cancel
      note = reason.trim() || 'Violates profile photo guidelines.';
    } else if (action === 'reject') {
      const reason = prompt('Enter the rejection reason (required):');
      if (reason === null || !reason.trim()) return;
      note = reason.trim();
    }

    setActionLoading(image.id);
    try {
      const { success: ok, error: modErr } = await galleryService.adminProcessGallery(image.id, action, note);
      if (modErr) throw modErr;

      showToast(`Photo successfully ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged'}.`);
      fetchQueue();
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to moderate photo: ${err.message || 'Error occurred.'}`, true);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-background py-8 px-4 sm:px-6 lg:px-8 text-foreground relative">
      
      {/* Grid line decorations */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.04] pointer-events-none" />

      <div className="max-w-6xl mx-auto z-10 relative">

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6 mb-8 gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-serif font-bold text-foreground tracking-wide flex items-center gap-2">
              <Camera className="h-6 w-6 text-primary" />
              Photo Moderation Queue
            </h1>
            <p className="text-xs text-muted leading-normal max-w-xl font-light">
              Review and moderate member gallery image uploads. Verify that uploaded photos contain genuine faces, respect decency guidelines, and represent the registered user correctly.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-foreground">
                <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="flagged">Flagged</option>
              </select>
            </label>
            <Link 
              href="/admin/dashboard"
              className="px-3.5 py-2 rounded-lg border border-border bg-surface hover:bg-background text-muted hover:text-foreground text-xs font-semibold tracking-wider transition-colors cursor-pointer"
            >
              System Queue
            </Link>
            <button
              onClick={fetchQueue}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface hover:bg-background text-muted hover:text-foreground text-xs font-semibold tracking-wider transition-colors cursor-pointer border border-border"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Queue ({queue.length})
            </button>
          </div>
        </div>

        {/* Alerts Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-mono flex items-center gap-2.5 shadow-md">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20 text-xs text-success font-mono flex items-center gap-2.5 shadow-md">
            <CheckCircle className="h-4.5 w-4.5 shrink-0 text-success" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 text-muted font-mono text-xs">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span>Loading pending gallery approvals...</span>
          </div>
        ) : queue.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queue.map((image) => {
              const isLoading = actionLoading === image.id;
              const uploadDate = new Date(image.uploaded_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              });

              return (
                <div 
                  key={image.id} 
                  className={`bg-card border border-border rounded-2xl overflow-hidden flex flex-col justify-between shadow-md relative group transition-all duration-300 ${
                    image.is_profile_picture ? 'ring-1 ring-primary/20' : ''
                  }`}
                >
                  
                  {/* Profile Picture Indicator Label */}
                  {image.is_profile_picture && (
                    <div className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider shadow-md">
                      PRIMARY PHOTO
                    </div>
                  )}

                  {/* Photo Preview Container */}
                  <div className="relative aspect-[3/4] bg-background flex items-center justify-center overflow-hidden border-b border-border">
                    <img 
                      src={(image as any).preview_url || image.image_url}
                      alt="Pending approval"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                    />

                    {/* Loader Layer */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-background/75 backdrop-blur-xs flex items-center justify-center z-20">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Candidate Details & Actions */}
                  <div className="p-5 flex flex-col gap-4 text-left">
                    <div className="flex flex-col gap-1 border-b border-border pb-3">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted" />
                        <span className="text-sm font-semibold text-foreground">
                          {image.first_name} {image.last_name}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted"><span className="rounded bg-surface px-2 py-1">{(image as any).is_replacement ? 'Replacement' : 'New photo'}</span><span className="rounded bg-surface px-2 py-1">{image.moderation_status}</span></div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted mt-1">
                        <span className="text-primary font-semibold">ID: {image.profile_id}</span>
                        <span className="flex items-center gap-1 text-muted/80">
                          <Clock className="h-3 w-3" /> {uploadDate}
                        </span>
                      </div>
                    </div>

                    {/* Privacy Status Label */}
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-semibold text-muted uppercase tracking-wider font-mono">Set Privacy:</span>
                      <span className="px-2 py-0.5 rounded bg-background text-foreground border border-border font-medium capitalize">
                        {image.privacy_level.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 border-t border-border pt-4 mt-1">
                      
                      {/* Reject Option */}
                      <button
                        onClick={() => handleModeration(image, 'reject')}
                        disabled={isLoading}
                        className="flex-1 h-9 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                        title="Reject photo and notify the member"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Reject
                      </button>

                      {/* Flag Option */}
                      <button
                        onClick={() => handleModeration(image, 'flag')}
                        disabled={isLoading}
                        className="flex-1 h-9 rounded-lg border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                        title="Flag with message feedback"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" /> Flag
                      </button>

                      {/* Approve Option */}
                      <button
                        onClick={() => handleModeration(image, 'approve')}
                        disabled={isLoading}
                        className="flex-1 h-9 rounded-lg bg-success hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-md disabled:opacity-50"
                        title="Approve image publication"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-muted font-mono text-xs border border-dashed border-border rounded-2xl bg-surface flex flex-col items-center justify-center gap-3">
            <CheckCircle className="h-10 w-10 text-success/20" />
            <span>No pending photo approvals in moderation queue.</span>
          </div>
        )}

      </div>
    </div>
  );
}
