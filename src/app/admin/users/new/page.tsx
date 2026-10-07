'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import BasicInfoStep from '@/components/register/steps/BasicInfoStep';
import PersonalDetailsStep from '@/components/register/steps/PersonalDetailsStep';
import EducationCareerStep from '@/components/register/steps/EducationCareerStep';
import FamilyDetailsStep from '@/components/register/steps/FamilyDetailsStep';
import { createMemberSchema, memberAge } from '@/lib/admin/create-member';

const initial = {
  fullName: '', gender: '', dob: '', email: '', password: '', confirmPassword: '', mobileNumber: '',
  maritalStatus: '', motherTongue: '', religion: 'Hindu', caste: '', subCaste: '', rasi: '', star: '', padam: '', gothram: '',
  height: '', weight: '', physicalStatus: 'Normal', education: '', occupation: '', companyName: '', annualIncome: '', workLocation: '',
  country: 'India', state: '', fatherName: '', fatherOccupation: '', motherName: '', motherOccupation: '', siblings: '', nativePlace: '', familyType: 'Nuclear',
  aboutMe: '', partnerExpectations: '', visibility: 'public', adminAttestation: false,
};
const steps = ['Account', 'Personal details', 'Education & career', 'Family', 'Photos & review'];
const stepFields = [
  ['fullName', 'gender', 'dob', 'email', 'password', 'confirmPassword', 'mobileNumber'],
  ['maritalStatus', 'motherTongue', 'religion', 'caste', 'subCaste', 'rasi', 'star', 'padam', 'gothram', 'height', 'weight', 'physicalStatus'],
  ['education', 'occupation', 'companyName', 'annualIncome', 'workLocation', 'country', 'state'],
  ['fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'siblings', 'nativePlace', 'familyType'],
  ['aboutMe', 'partnerExpectations', 'visibility', 'adminAttestation'],
];
const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground';
type Upload = { file: File; id: string };

export default function CreateAdminMemberPage() {
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [created, setCreated] = useState<{ id: string; profileId: string } | null>(null);
  const [photo, setPhoto] = useState<Upload | null>(null);
  const [horoscope, setHoroscope] = useState<Upload | null>(null);
  const [complete, setComplete] = useState(false);
  function handleChange(e: { target: { name: string; value: string; type?: string; checked?: boolean } }) {
    const { name, value, type, checked } = e.target;
    setForm(previous => ({ ...previous, [name]: type === 'checkbox' ? Boolean(checked) : value }));
    setErrors(previous => ({ ...previous, [name]: '' }));
  }
  function validate(all = false) {
    const result = createMemberSchema.safeParse(form);
    const nextErrors: Record<string, string> = {};
    if (!result.success) for (const issue of result.error.issues) {
      const name = String(issue.path[0]);
      if (all || stepFields[step].includes(name)) nextErrors[name] = issue.message;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (all) setStep(Math.max(0, stepFields.findIndex(fields => fields.includes(Object.keys(nextErrors)[0]))));
      setMessage('Please complete the required fields below.');
      return false;
    }
    setMessage(''); return true;
  }
  function selectFile(file: File | undefined, kind: 'photo' | 'horoscope') {
    if (!file) return;
    const allowed = kind === 'photo' ? ['image/jpeg', 'image/png', 'image/webp'] : ['application/pdf'];
    if (!allowed.includes(file.type) || !file.size || file.size > 3 * 1024 * 1024) { setMessage('Choose a JPEG, PNG or WebP photo, or a PDF horoscope, no larger than 3MB.'); return; }
    (kind === 'photo' ? setPhoto : setHoroscope)({ file, id: crypto.randomUUID() }); setMessage('');
  }
  async function upload(id: string, kind: string, item: Upload) {
    const body = new FormData(); body.set('file', item.file); body.set('kind', kind); body.set('uploadId', item.id);
    const response = await fetch(`/api/admin/users/${id}/files`, { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'File upload failed. Retry the pending files.');
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current || (!created && !validate(true))) return;
    submitting.current = true; setBusy(true); setMessage('');
    let member = created;
    try {
      if (!member) {
        const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await response.json();
        if (!response.ok) {
          if (data.fields) setErrors(Object.fromEntries(Object.entries(data.fields).map(([key, value]) => [key, (value as string[])[0]])));
          throw new Error(data.error || 'Profile creation failed.');
        }
        member = { id: data.id, profileId: data.profileId }; setCreated(member);
        setForm(previous => ({ ...previous, password: '', confirmPassword: '' }));
      }
      if (photo) { await upload(member.id, 'photo', photo); setPhoto(null); }
      if (horoscope) { await upload(member.id, 'horoscope', horoscope); setHoroscope(null); }
      setComplete(true);
    } catch (error) {
      setMessage((member ? `Profile ${member.profileId} was created. ` : '') + (error instanceof Error ? error.message : 'The request could not finish. Check Profile Management before creating the same member again.'));
    } finally { submitting.current = false; setBusy(false); }
  }
  function field(name: 'mobileNumber' | 'country' | 'state', label: string) {
    return <label className="block text-sm space-y-2" htmlFor={'admin-' + name}>{label}<input id={'admin-' + name} name={name} type={name === 'mobileNumber' ? 'tel' : 'text'} value={form[name]} onChange={handleChange} className={inputClass}/>{errors[name] && <span className="block text-red-500">{errors[name]}</span>}</label>;
  }
  const props = { formData: { ...form, age: form.dob ? memberAge(form.dob) : '' }, handleChange, errors };
  return <div className="max-w-4xl mx-auto p-5 md:p-8 space-y-6">
    <Link href="/admin/users" className="text-primary text-sm">← Profile Management</Link>
    <header><h1 className="font-serif text-2xl font-bold">Create member profile</h1><p className="text-muted mt-2">Register a member you personally know. Your verification replaces email confirmation and profile approval. The member receives a normal free account.</p></header>
    {complete && created ? <section role="status" className="rounded-xl border border-emerald-500 p-6 space-y-4"><h2 className="text-xl font-semibold">Profile {created.profileId} created</h2><p>The member can sign in with their email and the password you set. Share those credentials with them privately. All selected files have been saved.</p><Link href="/admin/users" className="inline-block bg-primary text-primary-foreground px-5 py-3 rounded-lg">View all profiles</Link></section> : <form onSubmit={submit} noValidate className="space-y-6">
      {!created && <nav aria-label="Registration sections" className="flex flex-wrap gap-2">{steps.map((label, i) => <button key={label} type="button" disabled={busy} aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)} className={`rounded-lg border px-3 py-2 text-sm ${step === i ? 'border-primary text-primary' : 'border-border'}`}>{i + 1}. {label}</button>)}</nav>}
      {message && <p role="alert" className="rounded-xl border border-red-500/40 p-3 text-red-500">{message}</p>}
      {!created && <fieldset disabled={busy} className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-5 [&_select]:text-foreground [&_option]:bg-background">
        <legend className="font-semibold px-2">{steps[step]}</legend>
        {step === 0 && <><BasicInfoStep {...props} setErrors={setErrors}/>{field('mobileNumber', 'Mobile number *')}<p className="text-xs text-muted">Use the member’s own email and phone. Password: at least 10 characters. No OTP or confirmation email is required for this admin-created account.</p></>}
        {step === 1 && <PersonalDetailsStep {...props}/>}
        {step === 2 && <><EducationCareerStep {...props}/><div className="grid sm:grid-cols-2 gap-5">{field('country', 'Country *')}{field('state', 'State')}</div></>}
        {step === 3 && <FamilyDetailsStep {...props}/>}
        {step === 4 && <>
          <p className="text-sm text-muted">Optional photo and horoscope: up to 3MB each. Files are stored securely and approved by you.</p>
          <label htmlFor="admin-photo" className="block text-sm space-y-2">Profile photo (JPEG, PNG, WebP)<input id="admin-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => selectFile(e.target.files?.[0], 'photo')} className={inputClass}/></label>
          <label htmlFor="admin-horoscope" className="block text-sm space-y-2">Horoscope (PDF)<input id="admin-horoscope" type="file" accept="application/pdf" onChange={e => selectFile(e.target.files?.[0], 'horoscope')} className={inputClass}/></label>
          {photo && <p className="text-sm">Selected photo: {photo.file.name} <button type="button" className="text-primary" onClick={() => setPhoto(null)}>Remove</button></p>}
          {horoscope && <p className="text-sm">Selected horoscope: {horoscope.file.name} <button type="button" className="text-primary" onClick={() => setHoroscope(null)}>Remove</button></p>}
          {(['aboutMe', 'partnerExpectations'] as const).map(name => <label key={name} htmlFor={name} className="block text-sm space-y-2">{name === 'aboutMe' ? 'About the member' : 'Partner expectations'}<textarea id={name} name={name} rows={4} maxLength={5000} value={form[name]} onChange={handleChange} className={inputClass}/></label>)}
          <label htmlFor="admin-visibility" className="block text-sm space-y-2">Profile visibility<select id="admin-visibility" name="visibility" value={form.visibility} onChange={handleChange} className={inputClass}><option value="public">Visible to eligible members</option><option value="private">Private</option></select></label>
          <div className="border border-border rounded-lg p-4 text-sm"><strong>Review before creating</strong><p>{form.fullName} · {form.email} · {form.mobileNumber}</p><p>{form.gender} · {form.dob} · {form.workLocation}</p><p>Use the section buttons above to review or correct any details.</p></div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="adminAttestation" checked={form.adminAttestation} onChange={handleChange} className="mt-1"/>I personally verified this member and have their permission to create and publish this profile with the selected visibility. I confirm their details are accurate.</label>
          {errors.adminAttestation && <p className="text-red-500 text-sm">{errors.adminAttestation}</p>}
        </>}
      </fieldset>}
      <div className="flex justify-between gap-3">{!created && step > 0 ? <button type="button" disabled={busy} onClick={() => setStep(s => s - 1)} className="border border-border rounded-lg px-5 py-3">Back</button> : <span/>}{!created && step < 4 ? <button type="button" disabled={busy} onClick={() => { if (validate()) setStep(s => s + 1); }} className="bg-primary text-primary-foreground rounded-lg px-5 py-3">Next</button> : <button disabled={busy} className="bg-primary text-primary-foreground rounded-lg px-5 py-3 disabled:opacity-50">{busy ? 'Saving…' : created ? 'Retry pending file uploads' : 'Create verified profile'}</button>}</div>
    </form>}
  </div>;
}
