'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getRegistrationFiles, saveRegistrationFiles, type RegistrationFiles } from '@/lib/registration-files';
import { uploadService } from '@/services/upload.service';
import { galleryService } from '@/services/gallery.service';
import { verificationService } from '@/services/verification.service';

export default function PendingRegistrationUploads() {
  const [files,setFiles]=useState<RegistrationFiles|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [authVersion,setAuthVersion]=useState(0);
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>setAuthVersion(v=>v+1));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    let cancelled=false;
    setFiles(null);
    async function restore() {
      const {data:{user}}=await supabase.auth.getUser();
      if(!user) return;
      const pending=await getRegistrationFiles(user.id);
      if(!cancelled) setFiles(pending);
    }
    restore().catch(()=>{if(!cancelled)setMessage('Selected registration files could not be restored. You can upload them from your profile and verification pages.');});
    return ()=>{cancelled=true;};
  },[authVersion]);
  async function upload() {
    if(!files) return;
    setBusy(true);setMessage('');
    let remaining={...files};
    try {
      const {data:{user}}=await supabase.auth.getUser();
      if(user?.id!==files.userId) throw new Error('Please sign in to the account that selected these files.');
      if(files.photo) {
        const {url,thumbnailUrl,error}=await uploadService.uploadFile(files.photo,'photos');
        if(error || !url) throw error || new Error('Photo upload failed.');
        const result=await galleryService.uploadGalleryImage(user.id,url,true,thumbnailUrl);
        if(result.error) {
          await Promise.all([url,thumbnailUrl].filter(Boolean).map(path=>uploadService.removeFile('photos',path as string)));
          throw result.error;
        }
        remaining={...remaining,photo:null};await saveRegistrationFiles(remaining);setFiles(remaining);
      }
      if(files.horoscope) {
        const {url,error}=await uploadService.uploadFile(files.horoscope,'horoscopes');
        if(error || !url) throw error || new Error('Horoscope upload failed.');
        const result=await verificationService.submitVerificationRequest('horoscope',url,'Horoscope');
        if(result.error) {await uploadService.removeFile('horoscopes',url);throw result.error;}
        remaining={...remaining,horoscope:null};await saveRegistrationFiles(remaining);setFiles(remaining);
      }
      setFiles(null);setMessage('Your selected files were uploaded and submitted for admin review.');
    } catch(error) {setMessage(error instanceof Error ? error.message : 'Upload failed. Your remaining files are kept for retry.');}
    finally {setBusy(false);}
  }
  async function discard() {
    if(!files) return;
    try {await saveRegistrationFiles({...files,photo:null,horoscope:null});setFiles(null);setMessage('Selected files cleared. You can choose new files from your profile and verification pages.');}
    catch {setMessage('Could not clear the selected files. Please retry.');}
  }
  if(!files?.photo && !files?.horoscope && !message) return null;
  return <div className="mb-5 rounded-xl border border-border bg-card p-4">
    {files && (files.photo || files.horoscope) && <><p className="text-sm">Your registration files are ready to upload: {[files.photo?.name,files.horoscope?.name].filter(Boolean).join(', ')}. Photos remain private until approved.</p><button onClick={upload} disabled={busy} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">{busy?'Uploading…':'Upload selected files'}</button></>}
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    {files && (files.photo || files.horoscope) && <button onClick={discard} disabled={busy} className="mt-2 text-xs underline disabled:opacity-50">Choose files later</button>}
  </div>;
}
