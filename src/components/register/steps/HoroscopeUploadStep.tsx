'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon, Sparkles } from 'lucide-react';

interface HoroscopeUploadStepProps {
  formData: any;
  handleChange: (e: any) => void;
  errors: any;
  horoscopeFile: File | null;
  setHoroscopeFile: (f: File | null) => void;
  profilePhoto: string | null;
  setProfilePhoto: (s: string | null) => void;
}

export default function HoroscopeUploadStep({
  formData,
  handleChange,
  errors,
  horoscopeFile,
  setHoroscopeFile,
  profilePhoto,
  setProfilePhoto
}: HoroscopeUploadStepProps) {
  const [photoLoading, setPhotoLoading] = useState(false);
  const [fileError,setFileError]=useState('');

  const handleHoroscopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file=e.target.files[0];
      if(file.type!=='application/pdf' || !file.size || file.size>5*1024*1024) {setFileError('Choose a PDF horoscope no larger than 5MB.');e.target.value='';return;}
      setFileError('');
      setHoroscopeFile(e.target.files[0]);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file=e.target.files[0];
      if(!['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size>5*1024*1024) {setFileError('Choose a JPEG, PNG or WebP photo no larger than 5MB.');e.target.value='';return;}
      setFileError('');
      setPhotoLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
        setPhotoLoading(false);
      };
      reader.onerror=()=>{setFileError('This photo could not be read. Please choose another file.');setPhotoLoading(false);};
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-350 text-left">
      <p className="md:col-span-2 text-xs text-muted">Selected files upload after you verify your email and sign in. Photos require admin approval before other members can view them.</p>
      {fileError && <p role="alert" className="md:col-span-2 text-xs text-red-600">{fileError}</p>}
      
      {/* Horoscope Upload */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="registration-horoscope" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Horoscope (PDF)</label>
        <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-gold-400 dark:hover:border-gold-600 transition-colors">
          <input 
            type="file" 
            accept=".pdf"
            id="registration-horoscope"
            onChange={handleHoroscopeChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <FileText className="h-8 w-8 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-650 dark:text-zinc-450">
            {horoscopeFile ? horoscopeFile.name : 'Click to Upload Horoscope'}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-550">PDF up to 5MB</span>
        </div>
      </div>

      {/* Profile Photo Upload */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Profile Photo</label>
        <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-gold-400 dark:hover:border-gold-600 transition-colors">
          {profilePhoto ? (
            <div className="flex flex-col items-center gap-2">
              <img 
                src={profilePhoto} 
                alt="Preview" 
                className="h-16 w-16 rounded-full object-cover border border-gold-500"
              />
              <span className="text-[10px] text-emerald-600 font-bold">Photo loaded!</span>
            </div>
          ) : (
            <>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <ImageIcon className="h-8 w-8 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-650 dark:text-zinc-450">
                {photoLoading ? 'Loading Preview...' : 'Click to Upload Photo'}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-550">PNG, JPG up to 5MB</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 md:col-span-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">About Me</label>
        <textarea 
          name="aboutMe"
          rows={3}
          value={formData.aboutMe}
          onChange={handleChange}
          placeholder="Write a few lines describing your personality, values, hobbies, and goals..."
          className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-150 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1 md:col-span-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Partner Expectations</label>
        <textarea 
          name="partnerExpectations"
          rows={3}
          value={formData.partnerExpectations}
          onChange={handleChange}
          placeholder="Describe your ideal partner's education, profession, values, and location..."
          className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-150 resize-none"
        />
      </div>

      {/* Terms & Conditions */}
      <div className="flex flex-col gap-1 md:col-span-2 pt-2">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input 
            type="checkbox" 
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={handleChange}
            className="mt-1 h-4.5 w-4.5 text-maroon-600 border-zinc-300 rounded focus:ring-maroon-500 accent-maroon-600"
          />
          <span className="text-xs text-zinc-650 dark:text-zinc-450 font-light leading-relaxed">
            I accept the Gokul Vivaham <a href="#" className="text-maroon-600 dark:text-gold-450 underline font-semibold">Terms &amp; Conditions</a> and <a href="#" className="text-maroon-600 dark:text-gold-450 underline font-semibold">Privacy Policy</a>, and verify that the data provided is correct.
          </span>
        </label>
        {errors.termsAccepted && <span className="text-[11px] text-red-500 font-semibold">{errors.termsAccepted}</span>}
      </div>

    </div>
  );
}
