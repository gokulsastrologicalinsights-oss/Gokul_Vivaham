'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import BasicInfoStep from './steps/BasicInfoStep';
import PersonalDetailsStep from './steps/PersonalDetailsStep';
import EducationCareerStep from './steps/EducationCareerStep';
import FamilyDetailsStep from './steps/FamilyDetailsStep';
import HoroscopeUploadStep from './steps/HoroscopeUploadStep';
import { authService } from '@/services/auth.service';
import { horoscopeSchema } from '@/validations/horoscope.schema';
import { validateReligionCommunity } from '@/validations/religion-community.schema';
import { saveRegistrationFiles } from '@/lib/registration-files';
import { syncServerSession } from '@/lib/auth/session-client';


export default function RegisterStepper() {
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [uploadNote, setUploadNote] = useState('');

  // Compliance Consent States
  const [consentEligibility, setConsentEligibility] = useState(false);
  const [consentTermsPrivacy, setConsentTermsPrivacy] = useState(false);
  const [consentProcessing, setConsentProcessing] = useState(false);
  const [consentAccuracy, setConsentAccuracy] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    fullName: '',
    gender: '',
    dob: '',
    age: '',
    email: '',
    password: '',
    confirmPassword: '',

    // Step 2: Personal Information
    maritalStatus: '',
    motherTongue: '',
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

    // Step 3: Education & Career
    education: '',
    occupation: '',
    companyName: '',
    annualIncome: '',
    workLocation: '',

    // Step 4: Family Details
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    siblings: '',
    nativePlace: '',
    familyType: 'Nuclear',

    // Step 5: Horoscope & Photos
    aboutMe: '',
    partnerExpectations: '',
    termsAccepted: false
  });

  // Mock Upload States
  const [horoscopeFile, setHoroscopeFile] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load draft
  useEffect(() => {
    const savedDraft = localStorage.getItem('gokul_matrimony_register_draft');
    if (savedDraft) {
      try {
        setFormData(prev => ({ ...prev, ...JSON.parse(savedDraft), password:'', confirmPassword:'' }));
      } catch (e) {
        console.error('Failed to parse registration draft', e);
      }
    }
  }, []);

  // Save draft
  useEffect(() => {
    if (!isRegistered && !awaitingEmailConfirmation) {
      const {password:_password,confirmPassword:_confirmPassword,...safeDraft}=formData;
      localStorage.setItem('gokul_matrimony_register_draft', JSON.stringify(safeDraft));
    }
  }, [formData, isRegistered, awaitingEmailConfirmation]);

  // Age auto calculate
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
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateStep = (step: number) => {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.fullName) stepErrors.fullName = 'Full Name is required';
      if (!formData.gender) stepErrors.gender = 'Gender is required';
      if (!formData.dob) stepErrors.dob = 'Date of birth is required';
      if (formData.age && parseInt(formData.age) < 18) {
        stepErrors.dob = 'Must be at least 18 years old to register';
      }
      if (!formData.email) {
        stepErrors.email = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        stepErrors.email = 'Invalid email address';
      }
      if (!formData.password) stepErrors.password = 'Password is required';
      if (formData.password.length < 6) stepErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) {
        stepErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (step === 2) {
      if (!formData.maritalStatus) stepErrors.maritalStatus = 'Marital status is required';
      if (!formData.motherTongue) stepErrors.motherTongue = 'Mother tongue is required';
      if (!formData.religion) {
        stepErrors.religion = 'Religion is required';
      }
      if (!formData.caste) {
        stepErrors.caste = 'Caste / Community is required';
      } else if (formData.religion) {
        const religionCommunityError = validateReligionCommunity(formData.religion, formData.caste);
        if (religionCommunityError) {
          stepErrors.caste = religionCommunityError;
        }
      }
      if (!formData.height) stepErrors.height = 'Height is required';

      // Dependent dropdown Zod validation
      const astroVal = horoscopeSchema.safeParse({
        rasi: formData.rasi,
        nakshatra: formData.star,
        padam: formData.padam
      });
      if (!astroVal.success) {
        astroVal.error.issues.forEach(issue => {
          const path = issue.path[0] as string;
          const field = path === 'nakshatra' ? 'star' : path;
          stepErrors[field] = issue.message;
        });
      }
    } else if (step === 3) {
      if (!formData.education) stepErrors.education = 'Education is required';
      if (!formData.occupation) stepErrors.occupation = 'Occupation is required';
      if (!formData.annualIncome) stepErrors.annualIncome = 'Annual income is required';
      if (!formData.workLocation) stepErrors.workLocation = 'Work location is required';
    } else if (step === 4) {
      if (!formData.fatherName) stepErrors.fatherName = "Father's name is required";
      if (!formData.motherName) stepErrors.motherName = "Mother's name is required";
      if (!formData.nativePlace) stepErrors.nativePlace = 'Native place is required';
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) {
        setIsSubmitting(true);
        try {
          const isRegistered = await authService.checkEmailRegistered(formData.email);
          if (isRegistered) {
            setErrors(prev => ({
              ...prev,
              email: 'This email is already registered. Please login instead.'
            }));
            setIsSubmitting(false);
            return;
          }
        } catch (err: any) {
          setErrors(prev => ({
            ...prev,
            email: 'Unable to verify email availability. Please try again.'
          }));
          setIsSubmitting(false);
          return;
        }
        setIsSubmitting(false);
      }

      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for(let step=1;step<=totalSteps;step++) {
      if(!validateStep(step)) {setCurrentStep(step);return;}
    }
    if (!consentEligibility || !consentTermsPrivacy || !consentProcessing || !consentAccuracy) {
      setErrors(prev => ({ ...prev, termsAccepted: 'You must accept all regulatory terms and consents to proceed.' }));
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Files are staged locally after signup, then uploaded by the authenticated member.
      const clientIp = 'Not collected';

      const registrationMetadata = {
        gender: formData.gender,
        dob: formData.dob,
        age: formData.age,
        maritalStatus: formData.maritalStatus,
        religion: formData.religion,
        caste: formData.caste,
        subCaste: formData.subCaste,
        motherTongue: formData.motherTongue,
        star: formData.star,
        rasi: formData.rasi,
        padam: formData.padam,
        gothram: formData.gothram,
        height: formData.height,
        weight: formData.weight,
        physicalStatus: formData.physicalStatus,
        education: formData.education,
        occupation: formData.occupation,
        companyName: formData.companyName,
        annualIncome: formData.annualIncome,
        workLocation: formData.workLocation,
        nativePlace: formData.nativePlace,
        fatherName: formData.fatherName,
        fatherOccupation: formData.fatherOccupation,
        motherName: formData.motherName,
        motherOccupation: formData.motherOccupation,
        siblings: formData.siblings,
        familyType: formData.familyType,
        aboutMe: formData.aboutMe,
        partnerExpectations: formData.partnerExpectations,
        // Consents
        consentEligibility,
        consentTermsPrivacy,
        consentProcessing,
        consentAccuracy,
        // Compliance IP / Agent
        clientIp,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-side/Unknown',
      };

      // 3. Sign up user in Supabase Auth passing all registration details as metadata
      const { data: signUpData, error: signUpError } = await authService.signUp(
        formData.email,
        formData.password,
        formData.fullName,
        registrationMetadata
      );

      if (signUpError) {
        const msg = signUpError.message || '';
        let friendlyMsg = msg || 'Registration failed. Please try again.';

        if (
          msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('already exists') ||
          msg.toLowerCase().includes('identity already exists') ||
          msg.toLowerCase().includes('user already registered')
        ) {
          friendlyMsg = 'This email is already registered. Please login instead.';
        } else if (msg.toLowerCase().includes('email rate limit') || msg.toLowerCase().includes('rate limit')) {
          friendlyMsg = 'Too many registration attempts. Supabase limits verification emails to a few per hour. Please wait 30–60 minutes and try again, or contact support.';
        } else if (msg.toLowerCase().includes('invalid email')) {
          friendlyMsg = 'The email address entered is invalid. Please check and try again.';
        } else if (msg.toLowerCase().includes('weak password') || msg.toLowerCase().includes('password')) {
          friendlyMsg = 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
        }

        setErrors(prev => ({ ...prev, termsAccepted: friendlyMsg }));
        setIsSubmitting(false);
        return;
      }

      const authUserId = signUpData?.user?.id;
      // Confirmation-required signup can succeed without a user in the SDK response.
      // Do not ask the member to repeat a signup that Auth already accepted.
      if (!authUserId && !signUpData?.session) {
        if (profilePhoto || horoscopeFile) {
          setUploadNote('After confirming your email and signing in, please select your photo and horoscope again to upload them for review.');
        }
        localStorage.removeItem('gokul_matrimony_register_draft');
        setIsSubmitting(false);
        setAwaitingEmailConfirmation(true);
        return;
      }
      if (!authUserId) throw new Error('Please sign in to finish setting up your account.');
      try {
        let photo:File|null=null;
        if(profilePhoto) {
          const blob=await (await fetch(profilePhoto)).blob();
          photo=new File([blob],'profile-photo.'+(blob.type==='image/jpeg'?'jpg':blob.type.split('/')[1]),{type:blob.type});
        }
        if(photo || horoscopeFile) {
          await saveRegistrationFiles({userId:authUserId,createdAt:Date.now(),photo,horoscope:horoscopeFile});
          setUploadNote('Your selected files are saved on this browser for 24 hours. After confirming your email and signing in, your dashboard will offer to upload them for review.');
        }
      } catch {
        setUploadNote('Your account was created, but this browser could not keep the selected files. Please select them again from your profile and verification pages after login.');
      }

      // When Supabase email confirmation is enabled, signUp returns user (no error) 
      // but without session. We let them know they need to verify their email.
      if (!authUserId || !signUpData?.session) {
        localStorage.removeItem('gokul_matrimony_register_draft');
        setIsSubmitting(false);
        setAwaitingEmailConfirmation(true);
        return;
      }

      // If email confirmation is disabled, user is immediately logged in
      try {await syncServerSession(signUpData.session.access_token);} catch {setUploadNote('Your profile was created. Sign in again to finish your file uploads.');}
      localStorage.removeItem('gokul_matrimony_register_draft');
      setIsRegistered(true);
      setIsSubmitting(false);
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 4000);

    } catch (err: any) {
      console.error('Registration processing failed:', err);
      setErrors(prev => ({ ...prev, termsAccepted: err.message || 'An unexpected error occurred.' }));
      setIsSubmitting(false);
    }
  };
  return (
    <div className="w-full flex flex-col gap-8">
      {awaitingEmailConfirmation ? (
        <div className="p-8 md:p-12 rounded-3xl bg-card text-card-foreground border border-border shadow-2xl text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-serif font-black text-foreground">
              Check Your Email
            </h2>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">
              கோகுல் விவாஹம் • Gokul Vivaham
            </p>
          </div>

          <p className="text-sm text-muted leading-relaxed font-light max-w-md">
            A confirmation link has been sent to{' '}
            <span className="font-semibold text-foreground">{formData.email}</span>.
            Please click the link in that email to verify your account and complete registration.
          </p>

          <div className="p-4 rounded-xl bg-surface border border-border text-xs text-foreground/80">
            {uploadNote && <p role="status" className="mb-2">{uploadNote}</p>}
            Didn&apos;t receive the email? Check your spam folder or contact support.
          </div>

          <Link
            href="/login"
            className="px-6 py-2.5 rounded-full bg-brand-red text-white text-xs font-bold uppercase tracking-wider shadow-md hover:bg-brand-red-light transition-all duration-200"
          >
            Go to Login
          </Link>
        </div>
      ) : isRegistered ? (
        <div className="p-8 md:p-12 rounded-3xl bg-card text-card-foreground border border-border shadow-2xl text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 relative">
            <CheckCircle2 className="h-16 w-16 animate-bounce" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping" />
          </div>
          
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-serif font-black text-foreground">
              Registration Successful!
            </h2>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">
              கோகுல் விவாஹம் • Gokul Vivaham
            </p>
          </div>
          
          <p className="text-sm text-muted leading-relaxed font-light max-w-md">
            Thank you for registering, <span className="font-semibold text-foreground">{formData.fullName}</span>! Your profile has been created and is submitted for Admin approval.
          </p>

          <div className="p-4 rounded-xl bg-surface border border-border text-xs text-muted">
            {uploadNote && <p role="status" className="mb-2">{uploadNote}</p>}
            Redirecting to your dashboard in a few seconds...
          </div>

          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-full bg-brand-red text-white text-xs font-bold uppercase tracking-wider shadow-md hover:bg-brand-red-light transition-all duration-200"
          >
            Go to Dashboard Now
          </Link>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-8">
          
          {/* Progress Header */}
          <div className="flex flex-col gap-4 text-center">
            <h1 className="text-3xl md:text-4xl font-serif font-black text-foreground">
              Create Your Profile
            </h1>
            <p className="text-xs text-primary uppercase tracking-widest font-bold leading-none">
              Where Matches Begin with Compatibility
            </p>
            
            {/* Step Progress Indicators */}
            <div className="flex items-center justify-between mt-4 relative max-w-md mx-auto w-full">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-primary transition-all duration-300 -translate-y-1/2 z-0" 
                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
              />

              {[...Array(totalSteps)].map((_, i) => {
                const stepNum = i + 1;
                const isCompleted = currentStep > stepNum;
                const isActive = currentStep === stepNum;
                return (
                  <div key={stepNum} className="flex flex-col items-center relative z-10">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-emerald-600 text-white' 
                          : isActive 
                            ? 'bg-brand-red text-white ring-4 ring-brand-red/20' 
                            : 'bg-card text-muted border border-border'
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-sm font-semibold text-primary mt-1">
              Step {currentStep} of {totalSteps}: {
                currentStep === 1 ? 'Basic Details' :
                currentStep === 2 ? 'Personal Information' :
                currentStep === 3 ? 'Education & Career' :
                currentStep === 4 ? 'Family Details' :
                'Horoscope & Photos'
              }
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card text-card-foreground p-6 md:p-8 rounded-3xl shadow-xl border border-border transition-all duration-300">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6" autoComplete="off">
              
              {currentStep === 1 && (
                <BasicInfoStep
                  formData={formData}
                  handleChange={handleChange}
                  errors={errors}
                  setErrors={setErrors}
                />
              )}

              {currentStep === 2 && (
                <PersonalDetailsStep
                  formData={formData}
                  handleChange={handleChange}
                  errors={errors}
                />
              )}

              {currentStep === 3 && (
                <EducationCareerStep
                  formData={formData}
                  handleChange={handleChange}
                  errors={errors}
                />
              )}

              {currentStep === 4 && (
                <FamilyDetailsStep
                  formData={formData}
                  handleChange={handleChange}
                  errors={errors}
                />
              )}

              {currentStep === 5 && (
                <div className="flex flex-col gap-6 text-left">
                  <HoroscopeUploadStep
                    formData={formData}
                    handleChange={handleChange}
                    errors={errors}
                    horoscopeFile={horoscopeFile}
                    setHoroscopeFile={setHoroscopeFile}
                    profilePhoto={profilePhoto}
                    setProfilePhoto={setProfilePhoto}
                  />

                  {/* Required Compliance & Consents */}
                  <div className="flex flex-col gap-4 p-5 md:p-6 rounded-2xl bg-surface border border-border text-xs font-light text-foreground/80 mt-4 animate-in fade-in duration-300">
                    <span className="font-semibold text-foreground mb-1 block uppercase tracking-wider text-[10px] text-primary">
                      Required Compliance Checkbox Consents
                    </span>
                    
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consentEligibility}
                        onChange={(e) => setConsentEligibility(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-border bg-card text-primary focus:ring-0 accent-primary shrink-0 mt-0.5"
                      />
                      <span>I confirm I am legally eligible for marriage under Indian law (18+ years for female, 21+ years for male).</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consentTermsPrivacy}
                        onChange={(e) => setConsentTermsPrivacy(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-border bg-card text-primary focus:ring-0 accent-primary shrink-0 mt-0.5"
                      />
                      <span>I agree to the <Link href="/terms" target="_blank" className="text-primary hover:underline font-semibold">Terms &amp; Conditions</Link> and <Link href="/privacy-policy" target="_blank" className="text-primary hover:underline font-semibold">Privacy Policy</Link> of the platform.</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consentProcessing}
                        onChange={(e) => setConsentProcessing(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-border bg-card text-primary focus:ring-0 accent-primary shrink-0 mt-0.5"
                      />
                      <span>I consent to storing and processing my personal, astrological, and family information for matchmaking purposes.</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consentAccuracy}
                        onChange={(e) => setConsentAccuracy(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-border bg-card text-primary focus:ring-0 accent-primary shrink-0 mt-0.5"
                      />
                      <span>I confirm the information provided in this profile is accurate, current, and true.</span>
                    </label>

                    {errors.termsAccepted && (
                      <span className="text-xs text-red-500 font-semibold mt-1 block font-mono">
                        [ERROR] {errors.termsAccepted}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-border text-foreground font-semibold text-xs uppercase tracking-wider hover:bg-surface transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-brand-red text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-red-light hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && currentStep === 1 ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    ) : null}
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-brand-red text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-red-light hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Create Profile
                        <Sparkles className="h-4 w-4 text-white fill-white" />
                      </>
                    )}
                  </button>
                )}
              </div>

            </form>
          </div>
          
        </div>
      )}
    </div>
  );
}

