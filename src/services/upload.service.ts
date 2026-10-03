import { supabase } from '@/lib/supabase';

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
      if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose a non-empty file no larger than 5MB.');
      if (!types[bucket].includes(file.type)) throw new Error('Unsupported file type. Horoscopes require PDF; ID proofs accept JPEG, PNG, WebP or PDF.');
      const {data:{user},error:authError} = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in before uploading documents.');
      const path = `${user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const {error} = await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,cacheControl:'60',upsert:false});
      if (error) throw error;
      return {url:path,error:null};
    } catch (error) { return {url:null,error:error instanceof Error ? error : new Error('Upload failed. Please retry.')}; }
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
      if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(path)) throw new Error('Invalid private document path.');
      const {data,error} = await supabase.storage.from(bucket).createSignedUrl(path,Math.min(300,Math.max(30,expiresIn)));
      if (error) throw error;
      return {url:data.signedUrl,error:null};
    } catch (error) { return {url:null,error:error instanceof Error ? error : new Error('Document access denied.')}; }
  }
};
