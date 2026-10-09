'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Camera, Check, ChevronDown, Eye,
  Image as ImageIcon, Loader2, LockKeyhole, RefreshCw, Save, ShieldCheck,
  Sparkles, Trash2, Upload, Users,
} from 'lucide-react';
import { MAX_PROFILE_PHOTOS } from '@/constants/photos';
import { galleryService, type GalleryImage } from '@/services/gallery.service';
import { uploadService } from '@/services/upload.service';
import { useAuthStore } from '@/stores/authStore';

type Tab = 'photos' | 'settings';
type Visibility = 'all_members' | 'liked_and_premium';
const FIVE_MB = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const OPTIONS: Array<{ value: Visibility; title: string; description: string }> = [
  { value: 'all_members', title: 'Visible to all Members', description: 'Recommended — approved photos can be viewed by every signed-in member.' },
  { value: 'liked_and_premium', title: 'Visible to Members I like and to all Premium Members', description: 'Other members will see a protected-photo placeholder.' },
];

function PrivacyChoices({ legend, name, value, onChange }: { legend: string; name: string; value: Visibility; onChange: (value: Visibility) => void }) {
  return (
    <fieldset className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <legend className="px-2 text-lg font-serif font-bold text-white">{legend}</legend>
      <div className="mt-2 space-y-3">
        {OPTIONS.map((option) => (
          <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${value === option.value ? 'border-gold-500/60 bg-gold-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'}`}>
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="mt-1 h-4 w-4 accent-amber-500" />
            <span>
              <span className="block text-sm font-semibold text-zinc-100">{option.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StatusBadge({ status }: { status: GalleryImage['moderation_status'] }) {
  const style = status === 'approved' ? 'bg-emerald-600 text-white' : status === 'rejected' ? 'bg-red-600 text-white' : 'bg-amber-500 text-zinc-950';
  const label = status === 'approved' ? 'Active' : status === 'rejected' ? 'Rejected' : status === 'flagged' ? 'Flagged' : 'Under review';
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style}`}>{label}</span>;
}

export default function MyPhotosExperience({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuthStore();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('photos');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<Visibility>('all_members');
  const [albumVisibility, setAlbumVisibility] = useState<Visibility>('all_members');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showMessage = useCallback((message: string, isError = false) => {
    setError(isError ? message : null);
    setSuccess(isError ? null : message);
  }, []);

  const loadGallery = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await galleryService.getGalleryImages(user.id);
      if (fetchError) throw fetchError;
      setImages(data ?? []);
    } catch (loadError) {
      console.error(loadError);
      showMessage('Failed to load your photos. Please refresh and try again.', true);
    } finally { setLoading(false); }
  }, [showMessage, user?.id]);

  const loadSettings = useCallback(async () => {
    if (!user?.id) return;
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/profile/photo-settings', { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Unable to load photo settings.');
      setProfileVisibility(result.profilePhotoVisibility);
      setAlbumVisibility(result.albumPhotoVisibility);
    } catch (loadError) {
      console.error(loadError);
      showMessage(loadError instanceof Error ? loadError.message : 'Unable to load photo settings.', true);
    } finally { setSettingsLoading(false); }
  }, [showMessage, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void Promise.all([loadGallery(), loadSettings()]);
  }, [loadGallery, loadSettings, user?.id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user?.id) return;
    if (images.length >= MAX_PROFILE_PHOTOS) return showMessage(`You can upload only ${MAX_PROFILE_PHOTOS} photos. Delete an existing photo before uploading the latest one.`, true);
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) return showMessage('Unsupported format. Upload a JPG, JPEG, PNG, or WEBP photo.', true);
    if (!file.size || file.size >= FIVE_MB) return showMessage('This photo is too large. Each photo must be smaller than 5 MB.', true);

    setUploading(true);
    setError(null);
    const uploadedPaths: string[] = [];
    try {
      const { url, thumbnailUrl, error: uploadError } = await uploadService.uploadFile(file, 'photos');
      if (uploadError || !url || !thumbnailUrl) throw uploadError || new Error('Upload failed.');
      uploadedPaths.push(url, thumbnailUrl);
      const { error: saveError } = await galleryService.uploadGalleryImage(user.id, url, images.length === 0, thumbnailUrl);
      if (saveError) throw saveError;
      uploadedPaths.length = 0;
      showMessage('Photo uploaded. It is now waiting for moderation.');
      await loadGallery();
    } catch (uploadError) {
      console.error(uploadError);
      await Promise.all(uploadedPaths.map((path) => uploadService.removeFile('photos', path)));
      showMessage(uploadError instanceof Error ? uploadError.message : 'Photo upload failed. Please retry.', true);
    } finally { setUploading(false); }
  };

  const handleDelete = async (imageId: string) => {
    if (!user?.id || !confirm('Delete this photo? You can upload a newer photo after it is removed.')) return;
    setActionLoading(imageId);
    try {
      const { error: deleteError } = await galleryService.deleteGalleryImage(imageId, user.id);
      if (deleteError) throw deleteError;
      showMessage('Photo deleted. You can now upload a replacement.');
      await loadGallery();
    } catch (deleteError) {
      console.error(deleteError);
      showMessage('Failed to delete the photo. Please retry.', true);
    } finally { setActionLoading(null); }
  };

  const handleSetProfilePicture = async (imageId: string) => {
    if (!user?.id) return;
    setActionLoading(imageId);
    try {
      const { error: updateError } = await galleryService.setProfilePicture(imageId, user.id);
      if (updateError) throw updateError;
      showMessage('Your primary profile photo has been updated.');
      await loadGallery();
    } catch (updateError) {
      console.error(updateError);
      showMessage('Failed to update the primary photo.', true);
    } finally { setActionLoading(null); }
  };

  const handleReorder = async (currentIndex: number, direction: 'left' | 'right') => {
    if (!user?.id) return;
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const reordered = [...images];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    setImages(reordered);
    const { error: reorderError } = await galleryService.reorderGalleryImages(user.id, reordered.map((image) => image.id));
    if (reorderError) { showMessage('Failed to save the photo order.', true); await loadGallery(); }
    else showMessage('Photo order saved.');
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/profile/photo-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhotoVisibility: profileVisibility, albumPhotoVisibility: albumVisibility }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Unable to save photo settings.');
      showMessage('Your photo privacy settings were saved successfully.');
    } catch (saveError) {
      console.error(saveError);
      showMessage(saveError instanceof Error ? saveError.message : 'Unable to save photo settings.', true);
    } finally { setSettingsSaving(false); }
  };

  const primaryPhoto = images.find((image) => image.is_profile_picture) ?? images[0];
  const albumPhoto = images.find((image) => image.id !== primaryPhoto?.id);

  return (
    <section className={embedded ? 'rounded-2xl bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6' : 'min-h-[calc(100vh-80px)] bg-zinc-950 px-4 py-7 text-zinc-100 sm:px-6 sm:py-10'}>
      <div className={embedded ? 'w-full' : 'mx-auto max-w-5xl'}>
        <header className="mb-6">
          <div className="flex items-center gap-2 text-gold-500"><ImageIcon className="h-6 w-6" aria-hidden="true" /><h1 className="text-2xl font-serif font-bold text-white sm:text-3xl">My Photos</h1></div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">Manage your profile photos and choose who can view your primary photo and album.</p>
        </header>

        <nav className="mb-6 flex border-b border-zinc-800" aria-label="My Photos sections">
          {([['photos', 'Photo', Camera], ['settings', 'Settings', ShieldCheck]] as const).map(([tab, label, Icon]) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? 'page' : undefined} className={`flex min-h-12 items-center gap-2 border-b-2 px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${activeTab === tab ? 'border-gold-500 text-gold-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}><Icon className="h-4 w-4" aria-hidden="true" /> {label}</button>
          ))}
        </nav>

        <div aria-live="polite" aria-atomic="true">
          {error ? <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-300"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{error}</div> : null}
          {success ? <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-900/50 bg-emerald-950/40 p-4 text-sm text-emerald-300"><Check className="mt-0.5 h-5 w-5 shrink-0" />{success}</div> : null}
        </div>

        {activeTab === 'photos' ? (
          <section aria-labelledby="photo-tab-heading" className="space-y-6">
            <div className="rounded-2xl border border-gold-500/20 bg-gold-500/5 p-4 text-xs leading-relaxed text-zinc-300 sm:p-5 sm:text-sm">
              <p id="photo-tab-heading"><strong className="text-gold-400">Note:</strong> You can upload 2 photos to your profile. Each photo must be less than 5 MB and in JPG, JPEG, PNG, or WEBP format. All uploaded photos are screened according to <Link href="/community-guidelines#photo-guidelines" className="font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300">Photo Guidelines</Link>, and 98% of photos get activated within 2 hours.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-400"><span className="font-semibold text-white">{images.length}</span> of {MAX_PROFILE_PHOTOS} photos uploaded</p>
              <button type="button" onClick={() => void loadGallery()} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"><RefreshCw className="h-4 w-4" />Refresh status</button>
            </div>

            {loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-400"><Loader2 className="h-6 w-6 animate-spin text-gold-500" />Loading your photos…</div> : (
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
                  const image = images[index];
                  if (!image) return (
                    <button key={`empty-${index}`} type="button" onClick={() => uploadInputRef.current?.click()} disabled={uploading || images.length >= MAX_PROFILE_PHOTOS} className="group flex min-h-96 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center hover:border-gold-500/50 hover:bg-gold-500/5 disabled:cursor-not-allowed disabled:opacity-60">
                      {uploading ? <Loader2 className="h-9 w-9 animate-spin text-gold-500" /> : <Upload className="h-9 w-9 text-zinc-500 group-hover:text-gold-500" />}
                      <span><span className="block font-semibold text-zinc-200">{uploading ? 'Uploading photo…' : 'Upload photo'}</span><span className="mt-1 block text-xs text-zinc-500">JPG, JPEG, PNG or WEBP · Under 5 MB</span></span>
                    </button>
                  );
                  const busy = actionLoading === image.id;
                  return (
                    <article key={image.id} className={`overflow-hidden rounded-2xl border bg-zinc-900/70 ${image.is_profile_picture ? 'border-gold-500/50' : 'border-zinc-800'}`}>
                      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                        <img src={image.thumbnail_url || image.image_url} alt={image.is_profile_picture ? 'Your primary profile photo' : `Your album photo ${index + 1}`} className="h-full w-full object-cover" />
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">{image.is_profile_picture ? <span className="inline-flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-950"><Sparkles className="h-3 w-3" />Primary</span> : null}<StatusBadge status={image.moderation_status} /></div>
                        {busy ? <div className="absolute inset-0 grid place-items-center bg-zinc-950/70"><Loader2 className="h-7 w-7 animate-spin text-gold-500" /></div> : null}
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-400"><ShieldCheck className="h-4 w-4 text-gold-500" />Visibility is managed in Settings</div>
                        <div className="flex gap-2">
                          {!image.is_profile_picture && image.moderation_status === 'approved' ? <button type="button" onClick={() => void handleSetProfilePicture(image.id)} disabled={busy} className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-gold-500/50 hover:text-gold-400 disabled:opacity-50">Set as profile photo</button> : null}
                          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950"><button type="button" onClick={() => void handleReorder(index, 'left')} disabled={busy || index === 0} aria-label="Move photo left" className="p-2 text-zinc-400 hover:text-white disabled:opacity-25"><ArrowLeft className="h-4 w-4" /></button><button type="button" onClick={() => void handleReorder(index, 'right')} disabled={busy || index === images.length - 1} aria-label="Move photo right" className="p-2 text-zinc-400 hover:text-white disabled:opacity-25"><ArrowRight className="h-4 w-4" /></button></div>
                          <button type="button" onClick={() => void handleDelete(image.id)} disabled={busy} aria-label="Delete photo" className="rounded-lg border border-red-900/50 p-2 text-red-400 hover:bg-red-950/50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {images.length >= MAX_PROFILE_PHOTOS ? <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" />You have reached the 2-photo limit. Delete an existing photo before uploading the latest photo.</div> : null}
            <input ref={uploadInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="sr-only" aria-label="Choose a profile photo to upload" />
          </section>
        ) : (
          <section aria-labelledby="settings-tab-heading" className="space-y-6">
            <div><h2 id="settings-tab-heading" className="text-xl font-serif font-bold text-white">Photo privacy and visibility</h2><p className="mt-2 text-sm text-zinc-400">Profile Photo and Album preferences are saved independently for your account.</p></div>
            {settingsLoading ? <div className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-400"><Loader2 className="h-6 w-6 animate-spin text-gold-500" />Loading saved settings…</div> : (
              <>
                <div className="grid gap-5 lg:grid-cols-2"><PrivacyChoices legend="Profile Photo" name="profile-photo-visibility" value={profileVisibility} onChange={setProfileVisibility} /><PrivacyChoices legend="Album Photos" name="album-photo-visibility" value={albumVisibility} onChange={setAlbumVisibility} /></div>
                <details className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">More options <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><div className="mt-3 space-y-2 border-t border-zinc-800 pt-3 text-xs leading-relaxed"><p>Pending or rejected photos are never shown to other members, regardless of your visibility choice.</p><p>Administrators can access submitted photos only for safety review and moderation.</p></div></details>
                <button type="button" onClick={() => void saveSettings()} disabled={settingsSaving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold-600 px-6 py-3 text-sm font-bold text-zinc-950 shadow-lg hover:bg-gold-500 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{settingsSaving ? 'Saving…' : 'Save my settings'}</button>
                <div className="border-t border-zinc-800 pt-6">
                  <h3 className="text-lg font-serif font-bold text-white">This is how your Photos will look to other Members</h3><p className="mt-1 text-xs text-zinc-500">Preview reflects your selections above. Save them to apply the rules to other members.</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {[{ label: 'Profile Photo', photo: primaryPhoto, visibility: profileVisibility }, { label: 'Album', photo: albumPhoto, visibility: albumVisibility }].map(({ label, photo, visibility }) => (
                      <div key={label} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"><div className="relative aspect-[16/10] bg-zinc-900">{photo ? <img src={photo.thumbnail_url || photo.image_url} alt={`${label} member-view preview`} className={`h-full w-full object-cover ${visibility === 'liked_and_premium' ? 'brightness-50 blur-sm' : ''}`} /> : <div className="grid h-full place-items-center"><ImageIcon className="h-10 w-10 text-zinc-700" /></div>}{visibility === 'liked_and_premium' ? <div className="absolute inset-0 grid place-items-center p-6 text-center"><div><LockKeyhole className="mx-auto h-7 w-7 text-gold-400" /><p className="mt-2 text-xs font-semibold text-white">Visible to liked and Premium Members</p></div></div> : null}</div><div className="flex items-center justify-between gap-3 p-4"><span className="text-sm font-semibold text-zinc-200">{label}</span><span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">{visibility === 'all_members' ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <Users className="h-3.5 w-3.5 text-gold-400" />}{visibility === 'all_members' ? 'All Members' : 'Limited'}</span></div></div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </section>
  );
}
