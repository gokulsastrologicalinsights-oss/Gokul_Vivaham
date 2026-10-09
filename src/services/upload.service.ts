import { supabase } from '@/lib/supabase';
import { syncServerSession } from '@/lib/auth/session-client';

type Bucket = 'horoscopes' | 'photos' | 'id-proofs';
const types: Record<Bucket,string[]> = {
  photos: ['image/jpeg','image/png','image/webp'],
  horoscopes: ['application/pdf'],
  'id-proofs': ['image/jpeg','image/png','image/webp','application/pdf'],
};
const extensions: Record<string,string> = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf' };
export const uploadService = {
  async uploadFile(file: File, bucket: Bucket) {
    try {
      if (!file.size || (bucket === 'photos' ? file.size >= 5 * 1024 * 1024 : file.size > 5 * 1024 * 1024)) throw new Error(bucket === 'photos' ? 'Each photo must be smaller than 5 MB.' : 'Choose a non-empty file no larger than 5MB.');
      if (!types[bucket].includes(file.type)) throw new Error('Unsupported file type. Horoscopes require PDF; ID proofs accept JPEG, PNG, WebP or PDF.');
      const {data:{user},error:authError} = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in before uploading documents.');
      const {data:{session}}=await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in before uploading documents.');
      await syncServerSession(session.access_token);
      const form = new FormData();
      form.set('bucket', bucket);
      form.set('file', file);
      const response = await fetch('/api/storage/upload',{method:'POST',body:form});
      const result = await response.json().catch(()=>null);
      if (!response.ok || !result?.url) throw new Error(result?.error || 'Upload failed. Please retry.');
      return {
        url: result.url as string,
        displayUrl: (result.displayUrl || result.url) as string,
        thumbnailUrl: result.thumbnailUrl as string | undefined,
        error: null,
      };
    } catch (error) { return {url:null,displayUrl:null,thumbnailUrl:null,error:error instanceof Error ? error : new Error('Upload failed. Please retry.')}; }
  },
  async uploadBase64(data: string,bucket: Bucket) {
    try {
      const match = data.match(/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/);
      if (!match || match[2].length > 7 * 1024 * 1024) throw new Error('Invalid or oversized file.');
      const raw = atob(match[2]);
      const bytes = Uint8Array.from(raw,c=>c.charCodeAt(0));
      return await this.uploadFile(new File([bytes],`upload.${extensions[match[1]]}`,{type:match[1]}),bucket);
    } catch (error) { return {url:null,error:error instanceof Error ? error : new Error('Upload failed.')}; }
  },
  async getSignedUrl(bucket: Bucket,path: string,expiresIn=300) {
    try {
      if (bucket === 'photos' && path.startsWith('https://')) return {url:path,error:null};
      if (!/^[0-9a-f-]{36}\/(?:[0-9a-f-]{36}\/(?:thumbnail|display)\.webp|[^/]{1,120}\.(pdf|jpg|png|webp))$/.test(path)) throw new Error('Invalid private document path.');
      const {data:{session}}=await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response = await fetch(`/api/storage/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}&expiresIn=${Math.min(300,Math.max(30,expiresIn))}`,{cache:'no-store'});
      const result = await response.json().catch(()=>null);
      if (!response.ok || !result?.url) throw new Error(result?.error || 'Document access denied.');
      return {url:result.url as string,error:null};
    } catch (error) { return {url:null,error:error instanceof Error ? error : new Error('Document access denied.')}; }
  },
  async removeFile(bucket: Bucket,path: string) {
    try {
      if (!/^[0-9a-f-]{36}\/(?:[0-9a-f-]{36}\/(?:thumbnail|display)\.webp|[^/]{1,120}\.(pdf|jpg|png|webp))$/.test(path)) throw new Error('Invalid private document path.');
      const {data:{session}}=await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response = await fetch('/api/storage/object',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({bucket,path})});
      const result = await response.json().catch(()=>null);
      if (!response.ok) throw new Error(result?.error || 'File deletion failed.');
      return {error:null};
    } catch (error) { return {error:error instanceof Error ? error : new Error('File deletion failed.')}; }
  }
};
