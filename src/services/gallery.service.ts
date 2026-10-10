import { syncServerSession } from '@/lib/auth/session-client';
import { supabase } from '@/lib/supabase';
import { MAX_PROFILE_PHOTOS } from '@/constants/photos';
import type { PhotoCropMetadata } from '@/components/dashboard/PhotoCropEditor';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

export interface GalleryImage {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url?: string;
  thumbnail_key?: string;
  display_key?: string;
  image_format?: 'webp' | 'jpeg' | 'avif' | null;
  thumbnail_width?: number | null;
  thumbnail_height?: number | null;
  thumbnail_bytes?: number | null;
  display_width?: number | null;
  display_height?: number | null;
  display_bytes?: number | null;
  is_profile_picture: boolean;
  is_private: boolean;
  privacy_level: 'public' | 'matches_only' | 'premium_only' | 'hidden';
  sort_order: number;
  uploaded_at: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderated_at?: string;
  moderated_by?: string;
  rejection_reason?: string | null;
  crop_metadata?: Record<string, unknown>;
  deleted_at?: string | null;
  pending_replacement?: {
    id: string;
    image_url: string;
    thumbnail_url: string;
    moderation_status: 'pending';
    submitted_at: string;
    rejection_reason?: string | null;
  } | null;
  // Enriched admin fields
  first_name?: string;
  last_name?: string;
  profile_id?: string;
}

const getMockGallery = (): GalleryImage[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('gokul_mock_gallery');
  if (stored) return JSON.parse(stored);

  // Default seed mock gallery images
  const defaultMock: GalleryImage[] = [
    {
      id: 'mock-img-1',
      user_id: '117a7545-41c9-46af-8233-646c2e1716c3', // Admin / Gokul user id
      image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
      is_profile_picture: true,
      is_private: false,
      privacy_level: 'public',
      sort_order: 0,
      uploaded_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      moderation_status: 'approved'
    },
    {
      id: 'mock-img-2',
      user_id: '117a7545-41c9-46af-8233-646c2e1716c3',
      image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
      is_profile_picture: false,
      is_private: false,
      privacy_level: 'public',
      sort_order: 1,
      uploaded_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      moderation_status: 'approved'
    },
    // Another user (Pending approval for Admin panel testing)
    {
      id: 'mock-img-pending-1',
      user_id: '6244e945-2449-47b5-8cf9-d1031f9ea366', // Gayaathri
      image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
      is_profile_picture: true,
      is_private: false,
      privacy_level: 'public',
      sort_order: 0,
      uploaded_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      moderation_status: 'pending',
      first_name: 'Gayaathri',
      last_name: 'S',
      profile_id: 'GV100202'
    }
  ];

  localStorage.setItem('gokul_mock_gallery', JSON.stringify(defaultMock));
  return defaultMock;
};

const saveMockGallery = (images: GalleryImage[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gokul_mock_gallery', JSON.stringify(images));
  }
};

export const galleryService = {
  async getGalleryImages(userId: string) {
    try {
      if (isMockMode()) {
        const gallery = getMockGallery();
        const userImages = gallery
          .filter((img) => img.user_id === userId)
          .sort((a, b) => a.sort_order - b.sort_order || new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
        const replacementCount = Number(localStorage.getItem(`gokul_mock_photo_replacements:${userId}`) || 0);
        const hasDeletedPhoto = localStorage.getItem(`gokul_mock_deleted_photo_history:${userId}`) === 'true';
        return { data: userImages, error: null, replacementsRemaining: Math.max(0, 3 - replacementCount), hasDeletedPhoto };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) throw new Error('Please sign in to your own account.');
      await syncServerSession(session.access_token);
      const response = await fetch('/api/photos', { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not load your photos.');
      return { data: (result?.photos || []) as GalleryImage[], error: null, replacementsRemaining: result?.replacementsRemaining ?? 3, hasDeletedPhoto: Boolean(result?.hasDeletedPhoto) };
    } catch (err: any) {
      console.error('Error fetching gallery images:', err);
      return { data: [], error: err };
    }
  },

  async uploadGalleryImage(userId: string, imageUrl: string, isProfilePicture = false, thumbnailUrl?: string, replacePhotoId?: string, crop?: PhotoCropMetadata) {
    try {
      if (isMockMode()) {
        const gallery = getMockGallery();
        const userImages = gallery.filter((img) => img.user_id === userId);

        if (replacePhotoId) {
          const target = userImages.find((img) => img.id === replacePhotoId);
          const replacementKey = `gokul_mock_photo_replacements:${userId}`;
          const replacementCount = Number(localStorage.getItem(replacementKey) || 0);
          if (!target) throw new Error('Photo not found');
          if (replacementCount >= 3) throw new Error('You have reached the maximum of 3 photo changes.');
          target.image_url = imageUrl;
          target.thumbnail_url = thumbnailUrl;
          target.moderation_status = 'pending';
          localStorage.setItem(replacementKey, String(replacementCount + 1));
          saveMockGallery(gallery);
          return { data: target, error: null };
        }
        
        // Keep mock mode aligned with the database-enforced limit.
        if (userImages.length >= MAX_PROFILE_PHOTOS) {
          throw new Error(`You can upload up to ${MAX_PROFILE_PHOTOS} photos. Delete an existing photo before uploading another.`);
        }

        const replacementKey = `gokul_mock_photo_replacements:${userId}`;
        const replacementCount = Number(localStorage.getItem(replacementKey) || 0);
        const hasDeletedPhoto = localStorage.getItem(`gokul_mock_deleted_photo_history:${userId}`) === 'true';
        if (hasDeletedPhoto) {
          if (replacementCount >= 3) throw new Error('You have reached the maximum of 3 photo changes.');
          localStorage.setItem(replacementKey, String(replacementCount + 1));
        }

        const nextSortOrder = userImages.reduce((max, img) => Math.max(max, img.sort_order), -1) + 1;

        const newImage: GalleryImage = {
          id: `mock-img-${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          image_url: imageUrl,
          is_profile_picture: isProfilePicture || userImages.length === 0,
          is_private: false,
          privacy_level: 'public',
          sort_order: nextSortOrder,
          uploaded_at: new Date().toISOString(),
          moderation_status: 'pending'
        };

        gallery.push(newImage);
        saveMockGallery(gallery);

        return { data: newImage, error: null };
      }

      const {data:{session}}=await supabase.auth.getSession();
      if (!session || session.user.id !== userId) throw new Error('Please sign in to your own account.');
      await syncServerSession(session.access_token);
      const response=await fetch('/api/photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayPath:imageUrl,thumbnailPath:thumbnailUrl,primary:isProfilePicture,replacePhotoId,crop})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || 'Photo could not be saved.');
      return {data:result.photo as GalleryImage,error:null};
    } catch (err: any) {
      console.error('Error uploading gallery image metadata:', err);
      return { data: null, error: err };
    }
  },

  async deleteGalleryImage(imageId: string, userId: string) {
    try {
      if (isMockMode()) {
        let gallery = getMockGallery();
        const imageToDelete = gallery.find(img => img.id === imageId);
        if (!imageToDelete) throw new Error('Image not found');

        gallery = gallery.filter((img) => img.id !== imageId);
        saveMockGallery(gallery);
        localStorage.setItem(`gokul_mock_deleted_photo_history:${userId}`, 'true');

        // If it was the profile picture, set another one as profile picture if available
        if (imageToDelete.is_profile_picture) {
          const userRemaining = gallery.filter((img) => img.user_id === userId);
          if (userRemaining.length > 0) {
            userRemaining[0].is_profile_picture = true;
            this.syncMockProfilePicture(userId, userRemaining[0].image_url);
          } else {
            this.syncMockProfilePicture(userId, null);
          }
          saveMockGallery(gallery);
        }

        return { success: true, error: null };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) throw new Error('Please sign in to your own account.');
      await syncServerSession(session.access_token);
      const response = await fetch('/api/photos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId: imageId }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Photo could not be deleted.');
      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error deleting gallery image:', err);
      return { success: false, error: err };
    }
  },

  async setProfilePicture(imageId: string, userId: string) {
    try {
      if (isMockMode()) {
        const gallery = getMockGallery();
        let targetUrl = '';
        gallery.forEach((img) => {
          if (img.user_id === userId) {
            if (img.id === imageId) {
              img.is_profile_picture = true;
              targetUrl = img.image_url;
            } else {
              img.is_profile_picture = false;
            }
          }
        });
        saveMockGallery(gallery);
        this.syncMockProfilePicture(userId, targetUrl);
        return { success: true, error: null };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) throw new Error('Please sign in to your own account.');
      await syncServerSession(session.access_token);
      const response = await fetch('/api/photos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_primary', photoId: imageId }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Only an approved photo can be selected as primary.');

      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error setting profile photo:', err);
      return { success: false, error: err };
    }
  },

  async updateImagePrivacy(
    imageId: string,
    userId: string,
    privacyLevel: 'public' | 'matches_only' | 'premium_only' | 'hidden'
  ) {
    try {
      const isPrivate = privacyLevel !== 'public';
      if (isMockMode()) {
        const gallery = getMockGallery();
        gallery.forEach((img) => {
          if (img.id === imageId) {
            img.privacy_level = privacyLevel;
            img.is_private = isPrivate;
          }
        });
        saveMockGallery(gallery);
        return { success: true, error: null };
      }

      const { error } = await supabase
        .from('gallery_images')
        .update({
          privacy_level: privacyLevel,
          is_private: isPrivate
        })
        .eq('id', imageId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error updating image privacy level:', err);
      return { success: false, error: err };
    }
  },

  async reorderGalleryImages(userId: string, imageIds: string[]) {
    try {
      if (isMockMode()) {
        const gallery = getMockGallery();
        gallery.forEach((img) => {
          if (img.user_id === userId) {
            const idx = imageIds.indexOf(img.id);
            if (idx !== -1) {
              img.sort_order = idx;
            }
          }
        });
        saveMockGallery(gallery);
        return { success: true, error: null };
      }

      // Perform parallel updates for sorting orders
      const updates = imageIds.map((id, index) =>
        supabase
          .from('gallery_images')
          .update({ sort_order: index })
          .eq('id', id)
          .eq('user_id', userId)
      );

      const results = await Promise.all(updates);
      const failed = results.find(res => res.error);
      if (failed) throw failed.error;

      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error reordering gallery photos:', err);
      return { success: false, error: err };
    }
  },

  // Admin Moderation Queue
  async adminGetPendingGallery(status: 'pending' | 'approved' | 'rejected' | 'flagged' = 'pending') {
    try {
      if (isMockMode()) {
        const gallery = getMockGallery();
        const pending = gallery.filter((img) => img.moderation_status === status);
        
        // Enrich pending with mock profile info if not already there
        const enriched = pending.map(img => {
          if (!img.profile_id) {
            return {
              ...img,
              first_name: 'Gayaathri',
              last_name: 'S',
              profile_id: 'GV100202'
            };
          }
          return img;
        });

        return { data: enriched, error: null };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response = await fetch(`/api/admin/photos?status=${status}`, { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not load the photo queue.');
      return { data: result?.photos || [], error: null };
    } catch (err: any) {
      console.error('Error fetching admin pending gallery:', err);
      return { data: [], error: err };
    }
  },

  async adminProcessGallery(imageId: string, action: 'approve' | 'reject' | 'flag', adminNotes?: string) {
    try {
      const statusMap = {
        approve: 'approved',
        reject: 'rejected',
        flag: 'flagged'
      } as const;

      if (isMockMode()) {
        const gallery = getMockGallery();
        
        gallery.forEach((img) => {
          if (img.id === imageId) {
            img.moderation_status = statusMap[action];
            img.rejection_reason = action === 'reject' || action === 'flag' ? adminNotes || 'Photo did not meet the review guidelines.' : null;
          }
        });
        
        saveMockGallery(gallery);
        return { success: true, error: null };
      }

      const {data:{session}}=await supabase.auth.getSession();
      if(!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response=await fetch('/api/admin/photos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({photoId:imageId,action,reason:adminNotes})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || 'Photo review failed.');
      return {success:true,error:null};
    } catch (err: any) {
      console.error('Error processing gallery moderation:', err);
      return { success: false, error: err };
    }
  },

  // Helper to sync mock profile picture update
  syncMockProfilePicture(userId: string, imageUrl: string | null) {
    if (typeof window !== 'undefined') {
      const storedProfiles = localStorage.getItem('gokul_mock_profiles');
      if (storedProfiles) {
        const profiles = JSON.parse(storedProfiles);
        const match = profiles.find((p: any) => p.user_id === userId);
        if (match) {
          match.image_url = imageUrl;
          localStorage.setItem('gokul_mock_profiles', JSON.stringify(profiles));
        }
      }
    }
  }
};
