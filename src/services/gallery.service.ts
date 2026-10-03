import { syncServerSession } from '@/lib/auth/session-client';
import { supabase } from '@/lib/supabase';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

export interface GalleryImage {
  id: string;
  user_id: string;
  image_url: string;
  is_profile_picture: boolean;
  is_private: boolean;
  privacy_level: 'public' | 'matches_only' | 'premium_only' | 'hidden';
  sort_order: number;
  uploaded_at: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderated_at?: string;
  moderated_by?: string;
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
        return { data: userImages, error: null };
      }

      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('uploaded_at', { ascending: true });

      return { data: data as GalleryImage[] || [], error };
    } catch (err: any) {
      console.error('Error fetching gallery images:', err);
      return { data: [], error: err };
    }
  },

  async uploadGalleryImage(userId: string, imageUrl: string, isProfilePicture = false) {
    try {
      if (isMockMode()) {
        const gallery = getMockGallery();
        const userImages = gallery.filter((img) => img.user_id === userId);
        
        // 3 image safety cap
        if (userImages.length >= 3) {
          throw new Error('Gallery capacity limit reached. You can upload up to 3 photos.');
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

        // If it is the first/profile picture, update mock profile image
        if (newImage.is_profile_picture) {
          this.syncMockProfilePicture(userId, imageUrl);
        }

        return { data: newImage, error: null };
      }

      const {data:{session}}=await supabase.auth.getSession();
      if (!session || session.user.id !== userId) throw new Error('Please sign in to your own account.');
      await syncServerSession(session.access_token);
      const response=await fetch('/api/photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:imageUrl,primary:isProfilePicture})});
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

      // Fetch the photo details first to know if it's a profile photo or find its file path
      const { data: photo } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (!photo) throw new Error('Photo not found');

      // Delete from database
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      if (photo.image_url.startsWith('/api/photos?path=')) {
        const path = new URL(photo.image_url, window.location.origin).searchParams.get('path');
        if (path) await supabase.storage.from('photos').remove([path]);
      }
      // Remove any legacy public file too.
      if (photo.image_url.includes('/storage/v1/object/public/photos/')) {
        const parts = photo.image_url.split('/public/photos/');
        if (parts.length > 1) {
          const fileName = parts[1];
          await supabase.storage.from('photos').remove([fileName]);
        }
      }

      // If it was the profile picture, assign a new one
      if (photo.is_profile_picture) {
        const { data: remaining } = await supabase
          .from('gallery_images')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order', { ascending: true })
          .limit(1);

        if (remaining && remaining.length > 0) {
          const nextProfilePhoto = remaining[0];
          await supabase
            .from('gallery_images')
            .update({ is_profile_picture: true })
            .eq('id', nextProfilePhoto.id);

          await supabase
            .from('profiles')
            .update({ image_url: nextProfilePhoto.image_url })
            .eq('user_id', userId);
        } else {
          await supabase
            .from('profiles')
            .update({ image_url: null })
            .eq('user_id', userId);
        }
      }

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

      // 1. Set all user's pictures to false
      const { error: resetErr } = await supabase
        .from('gallery_images')
        .update({ is_profile_picture: false })
        .eq('user_id', userId);

      if (resetErr) throw resetErr;

      // 2. Set chosen image to true
      const { data: updatedPhoto, error: setErr } = await supabase
        .from('gallery_images')
        .update({ is_profile_picture: true })
        .eq('id', imageId)
        .select()
        .single();

      if (setErr) throw setErr;

      // 3. Sync to profile table
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ image_url: updatedPhoto.image_url })
        .eq('user_id', userId);

      if (profileErr) throw profileErr;

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
  async adminGetPendingGallery() {
    try {
      if (isMockMode()) {
        const gallery = getMockGallery();
        const pending = gallery.filter((img) => img.moderation_status === 'pending');
        
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

      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('moderation_status', 'pending')
        .order('uploaded_at', { ascending: false });

      if (error || !data) return { data: [], error };

      const enriched = await Promise.all(
        data.map(async (row: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_id')
            .eq('user_id', row.user_id)
            .maybeSingle();

          return {
            ...row,
            first_name: profile?.first_name || 'Unknown',
            last_name: profile?.last_name || 'User',
            profile_id: profile?.profile_id || 'GV-UNKNOWN'
          };
        })
      );

      return { data: enriched, error: null };
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
        let gallery = getMockGallery();
        
        if (action === 'reject') {
          // If rejected in mock mode, delete it to simulate moderation cleanups
          gallery = gallery.filter((img) => img.id !== imageId);
        } else {
          gallery.forEach((img) => {
            if (img.id === imageId) {
              img.moderation_status = statusMap[action];
            }
          });
        }
        
        saveMockGallery(gallery);
        return { success: true, error: null };
      }

      const {data:{session}}=await supabase.auth.getSession();
      if(!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response=await fetch('/api/admin/photos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({photoId:imageId,action})});
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


