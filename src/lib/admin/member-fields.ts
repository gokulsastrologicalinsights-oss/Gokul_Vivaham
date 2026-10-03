export const PROFILE_FIELDS = [
  'first_name','last_name','gender','date_of_birth','age','height_cm','weight_kg','marital_status',
  'religion','caste','sub_caste','mother_tongue','rasi','nakshatra','padam','gothram','education',
  'occupation','company_name','annual_income','country','state','city','native_place',
  'father_name','father_occupation','mother_name','mother_occupation','siblings','family_type',
  'physical_status','about_me','partner_expectations','is_verified','visibility','is_suspended','moderation_status',
] as const;
export const NUMBER_FIELDS = new Set(['age','height_cm','weight_kg','annual_income']);
export const BOOLEAN_FIELDS = new Set(['is_verified','is_suspended','email_verified','mobile_verified']);
export const ACCOUNT_FIELDS = ['email','mobile_number','email_verified','mobile_verified','status'] as const;
