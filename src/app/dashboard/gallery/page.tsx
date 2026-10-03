'use client';

import { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, Upload, Trash2, Check, ArrowLeft, ArrowRight,
  Shield, Eye, Lock, Star, Sparkles, Loader2, AlertCircle, RefreshCw,
  Heart
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { galleryService, GalleryImage } from '@/services/gallery.service';
import { uploadService } from '@/services/upload.service';

export default function GalleryPage() {
  const { user } = useAuthStore();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadGallery();
    }
  }, [user]);

  const loadGallery = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await galleryService.getGalleryImages(user.id);
      if (fetchErr) throw fetchErr;
      setImages(data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load your gallery photos.');
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
    }, 4000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (images.length >= 3) {
      showToast('You can upload a maximum of 3 gallery photos.', true);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // 1. Upload to Supabase Storage
      const { url, error: uploadErr } = await uploadService.uploadFile(file, 'photos');
      if (uploadErr || !url) throw uploadErr || new Error('Upload failed');

      // 2. Insert metadata record
      const { data, error: dbErr } = await galleryService.uploadGalleryImage(
        user.id,
        url,
        images.length === 0 // Mark as profile photo if it's the first image
      );
      if (dbErr) throw dbErr;

      showToast('Photo uploaded successfully! Awaiting moderation.');
      loadGallery();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to upload photo. Please check size (<5MB) and format.', true);
    } finally {
      setUploading(false);
      // Reset input element
      e.target.value = '';
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to delete this photo? This cannot be undone.')) return;

    setActionLoading(imageId);
    try {
      const { success: ok, error: delErr } = await galleryService.deleteGalleryImage(imageId, user.id);
      if (delErr) throw delErr;

      showToast('Photo deleted successfully.');
      loadGallery();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to delete photo.', true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetProfilePicture = async (imageId: string) => {
    if (!user?.id) return;

    setActionLoading(imageId);
    try {
      const { success: ok, error: setErr } = await galleryService.setProfilePicture(imageId, user.id);
      if (setErr) throw setErr;

      showToast('Profile photo updated.');
      loadGallery();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to update profile photo.', true);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrivacyChange = async (imageId: string, privacy: 'public' | 'matches_only' | 'premium_only' | 'hidden') => {
    if (!user?.id) return;

    setActionLoading(imageId);
    try {
      const { success: ok, error: privErr } = await galleryService.updateImagePrivacy(imageId, user.id, privacy);
      if (privErr) throw privErr;

      showToast(`Privacy updated to: ${privacy.replace('_', ' ')}`);
      loadGallery();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to update privacy controls.', true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReorder = async (currentIndex: number, direction: 'left' | 'right') => {
    if (!user?.id) return;
    
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newImages = [...images];
    // Swap elements
    const temp = newImages[currentIndex];
    newImages[currentIndex] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    setImages(newImages);
    setLoading(true);

    try {
      const reorderedIds = newImages.map(img => img.id);
      const { success: ok, error: reorderErr } = await galleryService.reorderGalleryImages(user.id, reorderedIds);
      if (reorderErr) throw reorderErr;
      
      showToast('Display order saved.');
      loadGallery();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to save display order.', true);
      loadGallery();
    }
  };

  const getPrivacyIcon = (level: string) => {
    switch (level) {
      case 'public': return <Eye className="h-3.5 w-3.5" />;
      case 'matches_only': return <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />;
      case 'premium_only': return <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />;
      case 'hidden': return <Lock className="h-3.5 w-3.5" />;
      default: return <Eye className="h-3.5 w-3.5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-900/30 text-emerald-400">
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-950/60 border border-amber-900/30 text-amber-400">
            Pending Approval
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-950/60 border border-red-900/30 text-red-400">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 text-zinc-150 relative">
      
      {/* Background Server Design Aesthetics */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10 pointer-events-none" />

      <div className="max-w-4xl mx-auto z-10 relative">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-6 mb-8 gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-gold-500" />
              Manage Photo Gallery
            </h1>
            <p className="text-xs text-zinc-400 leading-normal max-w-xl font-light">
              Add up to 3 photos of yourself. Designate one as your main profile picture, control privacy levels, and arrange the display order. All photos undergo admin safety review before showing publicly.
            </p>
          </div>
          <button
            onClick={loadGallery}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold hover:bg-zinc-900 tracking-wider transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/30 text-xs text-red-400 font-mono flex items-center gap-2.5 shadow-md">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/30 text-xs text-emerald-400 font-mono flex items-center gap-2.5 shadow-md">
            <Check className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 text-zinc-500 font-mono text-xs">
            <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
            <span>Syncing database records...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Slot loop */}
            {[0, 1, 2].map((slotIdx) => {
              const image = images[slotIdx];

              if (image) {
                const isLoading = actionLoading === image.id;
                return (
                  <div 
                    key={image.id} 
                    className={`bg-zinc-900 border rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg relative group transition-all duration-300 ${
                      image.is_profile_picture ? 'border-gold-500/40 shadow-gold-950/5' : 'border-zinc-850 hover:border-zinc-800'
                    }`}
                  >
                    
                    {/* Position priority tag */}
                    <div className="absolute top-3 left-3 z-15 bg-zinc-950/80 backdrop-blur-sm border border-zinc-850 px-2 py-0.5 rounded text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-widest shadow-md">
                      Slot #{slotIdx + 1}
                    </div>

                    {/* Profile Picture Highlight Badge */}
                    {image.is_profile_picture && (
                      <div className="absolute top-3 right-3 z-15 bg-gold-650 text-zinc-950 border border-gold-450 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest shadow-md flex items-center gap-1 font-black">
                        <Sparkles className="h-2.5 w-2.5" /> Primary
                      </div>
                    )}

                    {/* Image Box */}
                    <div className="relative aspect-[3/4] bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-900">
                      <img 
                        src={image.image_url} 
                        alt={`Gallery slot ${slotIdx + 1}`}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 ${
                          image.moderation_status === 'rejected' ? 'opacity-30 blur-sm' : ''
                        }`}
                      />

                      {/* Loading Layer */}
                      {isLoading && (
                        <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-xs flex items-center justify-center z-20">
                          <Loader2 className="h-6 w-6 text-gold-500 animate-spin" />
                        </div>
                      )}

                      {/* Rejected Label */}
                      {image.moderation_status === 'rejected' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-950/30 text-center gap-1.5">
                          <AlertCircle className="h-6 w-6 text-red-500" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400">Rejected Image</span>
                          <span className="text-[9px] text-zinc-450 leading-tight">Violates image safety guidelines. Please delete.</span>
                        </div>
                      )}
                    </div>

                    {/* Info Controls Details */}
                    <div className="p-4 flex flex-col gap-3.5 bg-zinc-900/50">
                      
                      {/* Status Tag */}
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-850/60 pb-2.5">
                        <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">Status:</span>
                        {getStatusBadge(image.moderation_status)}
                      </div>

                      {/* Privacy Level Dropper */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Shield className="h-3 w-3 text-zinc-550" /> Privacy Level
                        </label>
                        <div className="relative">
                          <select
                            disabled={isLoading || image.moderation_status === 'rejected'}
                            value={image.privacy_level}
                            onChange={(e) => handlePrivacyChange(image.id, e.target.value as any)}
                            className="w-full h-8.5 pl-8 pr-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs font-mono text-zinc-200 focus:outline-none focus:border-gold-500/40 select-none cursor-pointer disabled:opacity-40"
                          >
                            <option value="public">Public (Everyone)</option>
                            <option value="matches_only">Matches Only</option>
                            <option value="premium_only">Premium Members Only</option>
                            <option value="hidden">Hidden / Private</option>
                          </select>
                          <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-zinc-500 pointer-events-none">
                            {getPrivacyIcon(image.privacy_level)}
                          </div>
                        </div>
                      </div>

                      {/* Actions Panel */}
                      <div className="flex items-center gap-1.5 mt-1 border-t border-zinc-850/60 pt-3.5">
                        
                        {/* Make Profile Pic button */}
                        {!image.is_profile_picture && image.moderation_status === 'approved' && (
                          <button
                            onClick={() => handleSetProfilePicture(image.id)}
                            disabled={isLoading}
                            className="flex-1 h-8 rounded-lg border border-zinc-800 hover:border-gold-500/40 hover:bg-gold-500/5 text-zinc-400 hover:text-gold-500 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                            title="Set as Primary Profile picture"
                          >
                            Set Profile Pic
                          </button>
                        )}
                        {image.is_profile_picture && (
                          <div className="flex-1 h-8 rounded-lg border border-gold-500/20 bg-gold-500/5 text-gold-500 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 select-none">
                            <Check className="h-3 w-3" /> Profile Pic
                          </div>
                        )}

                        {/* Reordering Controls */}
                        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 shrink-0">
                          <button
                            onClick={() => handleReorder(slotIdx, 'left')}
                            disabled={isLoading || slotIdx === 0}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:text-zinc-800 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Move Left"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleReorder(slotIdx, 'right')}
                            disabled={isLoading || slotIdx === images.length - 1}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:text-zinc-800 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Move Right"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(image.id)}
                          disabled={isLoading}
                          className="h-8 w-8 rounded-lg border border-zinc-800 hover:border-red-950 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition-all flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
                          title="Delete photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                      </div>

                    </div>
                  </div>
                );
              }

              // Empty slot Upload Card
              return (
                <div 
                  key={`empty-${slotIdx}`} 
                  className={`border border-dashed rounded-2xl aspect-[3/4] bg-zinc-900/10 transition-all flex flex-col items-center justify-center p-6 text-center gap-4 relative overflow-hidden group min-h-[300px] ${
                    uploading ? 'border-zinc-850 bg-zinc-900/20' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/20'
                  }`}
                >
                  
                  {/* Position priority tag */}
                  <div className="absolute top-3 left-3 bg-zinc-950/50 border border-zinc-850/60 px-2 py-0.5 rounded text-[8px] font-mono text-zinc-500 tracking-wider">
                    Slot #{slotIdx + 1}
                  </div>

                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Uploading file...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:scale-105 group-hover:text-gold-500 group-hover:border-gold-500/20 transition-all shadow-inner">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col gap-1 select-none">
                        <span className="text-xs font-semibold text-zinc-300">Upload Photo</span>
                        <span className="text-[9px] text-zinc-500 font-light leading-snug">JPEG, PNG, or WebP<br />Max Size: 5MB</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                    </>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>
    </div>
  );
}
