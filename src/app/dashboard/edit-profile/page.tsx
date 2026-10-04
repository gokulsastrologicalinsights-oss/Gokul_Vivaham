'use client';

import { useState, useEffect } from 'react';
import { 
  User, CheckCircle2, Save, FileText, Image as ImageIcon, 
  MapPin, Award, BookOpen, Users 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadService } from '@/services/upload.service';
import { galleryService } from '@/services/gallery.service';
import { useProfileStore } from '@/stores/profileStore';
import RasiStarDropdowns from '@/components/ui/input/RasiStarDropdowns';
import ReligionCommunityDropdowns from '@/components/ui/input/ReligionCommunityDropdowns';
import { validateReligionCommunity } from '@/validations/religion-community.schema';

export default function Profile() {
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'basic' | 'astro' | 'career' | 'family' | 'photo'>('basic');

  // Fields State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    gender: '',
    dob: '',
    age: '',
    maritalStatus: 'Never Married',
    motherTongue: 'Tamil',
    religion: 'Hindu',
    caste: '',
    subCaste: '',
    star: '',
    rasi: '',
    padam: '',
    gothram: '',
    height: '',
    weight: '',
    physicalStatus: 'Normal',
    education: '',
    occupation: '',
    companyName: '',
    annualIncome: '',
    workLocation: '',
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    siblings: '',
    nativePlace: '',
    familyType: 'Nuclear',
    aboutMe: '',
    partnerExpectations: ''
  });

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Resolve user's database ID from auth_user_id
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const currentUserId = userRow?.id || user.id;
        setUserId(currentUserId);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (data) {
          setFormData({
            fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            email: user.email || '',
            mobileNumber: data.mobile_number || '',
            gender: data.gender || '',
            dob: data.date_of_birth || '',
            age: (data.age || '').toString(),
            maritalStatus: data.marital_status || 'Never Married',
            motherTongue: data.mother_tongue || 'Tamil',
            religion: data.religion || 'Hindu',
            caste: data.caste || '',
            subCaste: data.sub_caste || '',
            star: data.nakshatra || '',
            rasi: data.rasi || '',
            padam: data.padam || '',
            gothram: data.gothram || '',
            height: (data.height_cm || '').toString(),
            weight: (data.weight_kg || '').toString(),
            physicalStatus: data.physical_status || 'Normal',
            education: data.education || '',
            occupation: data.occupation || '',
            companyName: data.company_name || '',
            annualIncome: (data.annual_income || '').toString(),
            workLocation: data.city || '',
            fatherName: data.father_name || '',
            fatherOccupation: data.father_occupation || '',
            motherName: data.mother_name || '',
            motherOccupation: data.mother_occupation || '',
            siblings: data.siblings || '',
            nativePlace: data.native_place || '',
            familyType: data.family_type || 'Nuclear',
            aboutMe: data.about_me || '',
            partnerExpectations: data.partner_expectations || ''
          });

          const { data: gallery } = await supabase
            .from('gallery_images')
            .select('image_url')
            .eq('user_id', currentUserId)
            .eq('is_profile_picture', true)
            .limit(1)
            .maybeSingle();

          if (gallery) {
            setProfilePhoto(gallery.image_url);
          }
        }
      } catch (e) {
        console.error('Failed to load profile details:', e);
      }
    };
    loadProfile();
  }, []);

  // Age auto calculate from dob
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setFormData(prev => ({ ...prev, age: calculatedAge.toString() }));
    }
  }, [formData.dob]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');

    // Validate Religion and Caste
    const rcError = validateReligionCommunity(formData.religion, formData.caste);
    if (rcError) {
      alert(rcError);
      setSaving(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User session not found. Please log in again.');
      }

      // 1. Resolve or create user row in public.users
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      let currentUserId = userRow?.id;

      if (!currentUserId) {
        // Create public user row if missing
        const { data: newUserRow, error: userCreateErr } = await supabase
          .from('users')
          .insert({
            id: user.id,
            auth_user_id: user.id,
            email: user.email,
            role: 'user',
            status: 'active'
          })
          .select('id')
          .maybeSingle();

        if (userCreateErr) {
          throw new Error('Failed to initialize user record: ' + userCreateErr.message);
        }
        currentUserId = newUserRow?.id || user.id;
        setUserId(currentUserId);
      }

      const parts = formData.fullName.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      // 2. Resolve or generate profile_id
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, profile_id')
        .eq('user_id', currentUserId)
        .maybeSingle();

      const profileId = existingProfile?.profile_id || `GV${Math.floor(100000 + Math.random() * 900000)}`;

      const payload = {
        user_id: currentUserId,
        profile_id: profileId,
        first_name: firstName,
        last_name: lastName,
        gender: formData.gender || null,
        date_of_birth: formData.dob || null,
        age: formData.age ? parseInt(formData.age) : null,
        marital_status: formData.maritalStatus,
        mother_tongue: formData.motherTongue,
        religion: formData.religion,
        caste: formData.caste,
        sub_caste: formData.subCaste,
        nakshatra: formData.star,
        rasi: formData.rasi,
        padam: formData.padam || null,
        gothram: formData.gothram,
        height_cm: formData.height ? parseInt(formData.height) : null,
        weight_kg: formData.weight ? parseInt(formData.weight) : null,
        physical_status: formData.physicalStatus,
        education: formData.education,
        occupation: formData.occupation,
        company_name: formData.companyName,
        annual_income: formData.annualIncome ? parseFloat(formData.annualIncome) : null,
        city: formData.workLocation,
        father_name: formData.fatherName,
        father_occupation: formData.fatherOccupation,
        mother_name: formData.motherName,
        mother_occupation: formData.motherOccupation,
        siblings: formData.siblings,
        native_place: formData.nativePlace,
        family_type: formData.familyType,
        about_me: formData.aboutMe,
        partner_expectations: formData.partnerExpectations
      };

      let error;
      if (existingProfile) {
        const { data: updatedData, error: updateErr } = await supabase
          .from('profiles')
          .update(payload)
          .eq('user_id', currentUserId)
          .select()
          .maybeSingle();
        error = updateErr;
        if (!error && updatedData) {
          useProfileStore.setState({ profile: updatedData });
        }
      } else {
        const { data: insertedData, error: insertErr } = await supabase
          .from('profiles')
          .insert(payload)
          .select()
          .maybeSingle();
        error = insertErr;
        if (!error && insertedData) {
          useProfileStore.setState({ profile: insertedData });
        }
      }

      if (error) {
        alert('Failed to save profile changes: ' + error.message);
      } else {
        setSuccess('Profile updated successfully!');
        window.scrollTo(0, 0);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file || uploadingPhoto) return;
    setPhotoError('');
    setSuccess('');
    if (!userId) { setPhotoError('Please sign in again before uploading.'); input.value = ''; return; }
    setUploadingPhoto(true);
    let uploadedPath: string | null = null;
    try {
      const gallery = await galleryService.getGalleryImages(userId);
      if (gallery.error) throw gallery.error;
      if (gallery.data.length >= 3) throw new Error('Your gallery has three photos. Remove one in My Gallery before uploading another.');
      const {url,error} = await uploadService.uploadFile(file,'photos');
      if (error || !url) throw error || new Error('Photo upload failed.');
      uploadedPath = url;
      const attached = await galleryService.uploadGalleryImage(userId,url,true);
      if (attached.error || !attached.data) throw attached.error || new Error('Photo could not be saved.');
      uploadedPath = null;
      setProfilePhoto(attached.data.image_url);
      setSuccess('Profile photo uploaded successfully. Awaiting admin review.');
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('photos').remove([uploadedPath]);
      setPhotoError(error instanceof Error ? error.message : 'Photo upload failed. Please retry.');
    } finally { setUploadingPhoto(false); input.value = ''; }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          My Matrimony Profile
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
          Manage your personal bios, education credentials, astrological coordinates, and gallery uploads.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}

      {/* Main card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 overflow-hidden">
        
        {/* Profile Tabs */}
        <div className="flex flex-wrap bg-sandal-50 dark:bg-zinc-950 p-2 border-b border-zinc-100 dark:border-zinc-850 gap-1">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'basic' 
                ? 'bg-white dark:bg-zinc-850 text-maroon-700 dark:text-gold-400 shadow-sm font-bold' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <User className="h-4 w-4" /> Basic Details
          </button>
          <button
            onClick={() => setActiveTab('astro')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'astro' 
                ? 'bg-white dark:bg-zinc-850 text-maroon-700 dark:text-gold-400 shadow-sm font-bold' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Award className="h-4 w-4" /> Astro &amp; Physical
          </button>
          <button
            onClick={() => setActiveTab('career')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'career' 
                ? 'bg-white dark:bg-zinc-850 text-maroon-700 dark:text-gold-400 shadow-sm font-bold' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Career
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'family' 
                ? 'bg-white dark:bg-zinc-850 text-maroon-700 dark:text-gold-400 shadow-sm font-bold' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Users className="h-4 w-4" /> Family
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'photo' 
                ? 'bg-white dark:bg-zinc-850 text-maroon-700 dark:text-gold-400 shadow-sm font-bold' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <ImageIcon className="h-4 w-4" /> Photos
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 md:p-8 flex flex-col gap-6">
          
          {/* TAB 1: BASIC DETAILS */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  disabled
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-850 text-sm focus:outline-none text-zinc-550"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mobile Number</label>
                <input 
                  type="text" 
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  disabled
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-850 text-sm focus:outline-none text-zinc-550"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100"
                >
                  <option value="" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">Select Gender</option>
                  <option value="Female" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">Female</option>
                  <option value="Male" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">Male</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Marital Status</label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100"
                >
                  <option value="Never Married" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">Never Married</option>
                  <option value="Widowed" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">Widowed</option>
                  <option value="Divorced" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">Divorced</option>
                  <option value="Awaiting Divorce" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">Awaiting Divorce</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mother Tongue</label>
                <input 
                  type="text" 
                  name="motherTongue"
                  value={formData.motherTongue}
                  onChange={handleChange}
                  placeholder="e.g. Tamil"
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="md:col-span-2">
                <ReligionCommunityDropdowns
                  religion={formData.religion}
                  community={formData.caste}
                  onReligionChange={(v) => setFormData(prev => ({ ...prev, religion: v, caste: '' }))}
                  onCommunityChange={(v) => setFormData(prev => ({ ...prev, caste: v }))}
                  selectClassName="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100 dark:bg-zinc-900 w-full"
                  inlineLayout={true}
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2 text-left">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sub Caste</label>
                <input 
                  type="text" 
                  name="subCaste"
                  value={formData.subCaste}
                  onChange={handleChange}
                  placeholder="e.g. Vadama, Vadagalai"
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">About Me</label>
                <textarea 
                  name="aboutMe"
                  rows={4}
                  value={formData.aboutMe}
                  onChange={handleChange}
                  className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: ASTRO & PHYSICAL */}
          {activeTab === 'astro' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
              <div className="md:col-span-2">
                <RasiStarDropdowns
                  rasi={formData.rasi}
                  nakshatra={formData.star}
                  padam={formData.padam}
                  onRasiChange={(v) => setFormData(prev => ({ ...prev, rasi: v, star: '', padam: '' }))}
                  onNakshatraChange={(v) => setFormData(prev => ({ ...prev, star: v, padam: '' }))}
                  onPadamChange={(v) => setFormData(prev => ({ ...prev, padam: v }))}
                  inlineLayout={true}
                  selectClassName="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100 dark:bg-zinc-900 w-full"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Gothram</label>
                <input 
                  type="text" 
                  name="gothram"
                  value={formData.gothram}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Height (cm)</label>
                <input 
                  type="number" 
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Weight (kg)</label>
                <input 
                  type="number" 
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Physical Status</label>
                <select
                  name="physicalStatus"
                  value={formData.physicalStatus}
                  onChange={handleChange}
                  className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                >
                  <option value="Normal">Normal</option>
                  <option value="Physically Challenged">Physically Challenged</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: CAREER & WORK */}
          {activeTab === 'career' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Education Level</label>
                <input 
                  type="text" 
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Occupation</label>
                <input 
                  type="text" 
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Company Name</label>
                <input 
                  type="text" 
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Annual Income</label>
                <input 
                  type="text" 
                  name="annualIncome"
                  value={formData.annualIncome}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Work Location</label>
                <input 
                  type="text" 
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: FAMILY */}
          {activeTab === 'family' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Father Name</label>
                <input 
                  type="text" 
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Father Occupation</label>
                <input 
                  type="text" 
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mother Name</label>
                <input 
                  type="text" 
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mother Occupation</label>
                <input 
                  type="text" 
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Native Place</label>
                <input 
                  type="text" 
                  name="nativePlace"
                  value={formData.nativePlace}
                  onChange={handleChange}
                  className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Family Type</label>
                <select
                  name="familyType"
                  value={formData.familyType}
                  onChange={handleChange}
                  className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none"
                >
                  <option value="Nuclear">Nuclear</option>
                  <option value="Joint">Joint</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 5: PHOTO UPLOAD */}
          {activeTab === 'photo' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col items-center gap-4 text-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  aria-label="Upload primary profile photo"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                
                {profilePhoto ? (
                  <img 
                    src={profilePhoto} 
                    alt="Upload Preview" 
                    className="h-28 w-28 rounded-full object-cover border border-gold-400 shadow-md"
                  />
                ) : (
                  <div className="h-28 w-28 rounded-full bg-sandal-100 dark:bg-zinc-800 border-2 border-gold-400/20 flex items-center justify-center font-serif text-3xl font-bold text-maroon-700 dark:text-gold-450 shadow-inner">
                    RM
                  </div>
                )}
                
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{uploadingPhoto ? 'Uploading photo…' : 'Upload primary profile photo'}</span>
                  <span className="text-xs text-zinc-450 dark:text-zinc-500">Requires Admin review to be visible to other members.</span>
                </div>
              </div>

              {photoError && <p role="alert" className="text-sm text-red-600">{photoError}</p>}
              <p className="text-xs">JPEG, PNG or WebP · Maximum 5MB · Up to three photos. Manage existing photos in <a href="/dashboard/gallery" className="underline">My Gallery</a>.</p>
              {/* Additional gallery slots */}
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
                  Photo Slot 2
                </div>
                <div className="h-24 rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
                  Photo Slot 3
                </div>
                <div className="h-24 rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
                  Manage in My Gallery
                </div>
              </div>
            </div>
          )}

          {/* Save trigger */}
          {activeTab !== 'photo' && (
            <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-850">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-8 py-2.5 rounded-full luxury-gradient text-white font-semibold text-xs uppercase tracking-widest hover:opacity-90 shadow-md transition-all cursor-pointer"
              >
                {saving ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Save Profile Changes
                    <Save className="h-4 w-4 text-white" />
                  </>
                )}
              </button>
            </div>
          )}

        </form>
      </div>

    </div>
  );
}
