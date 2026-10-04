import PolicyPage from '@/components/PolicyPage';
export default function Page(){return <PolicyPage title="Privacy Policy" sections={[
  {
    "title": "Information we collect",
    "text": "We collect account and contact details, profile photos, age and birth details, gender, marital status, religion/caste preferences, education, employment, family and horoscope information you provide. We also process verification uploads, interests, chat messages, support requests, payment references, billing information and account/security activity needed to operate the service."
  },
  {
    "title": "How information is used",
    "text": "We use information to manage your account, display your permitted profile details, suggest matches, deliver interests and chat, verify submissions, process bookings and payments, handle support, prevent misuse and meet applicable recordkeeping requirements. Optional information and permissions can be managed through your profile and privacy settings. Provide another adult’s information only with their permission."
  },
  {
    "title": "What other members can see",
    "text": "Profile visibility and feature permissions determine what members can view. Contact details are not public and are subject to separate contact-access permissions. Accepting interest or receiving chat does not by itself give a free member phone-number access. Messages are accessible to permitted conversation participants. Authorized administrators may access account information and records needed for moderation and support; messages are not described as end-to-end encrypted. Watermarks cannot prevent all screenshots or copying."
  },
  {
    "title": "Service providers and disclosure",
    "text": "We use Supabase for authentication, database and file services; Vercel for hosting; and Razorpay for payment processing. These providers process information needed for their services under their own terms and privacy practices. Payment credentials entered into gateway checkout are handled by the gateway; do not send card details or OTPs to our support team. Information may also be disclosed where required by law or necessary to investigate misuse. We do not sell member personal information."
  },
  {
    "title": "Storage, security and retention",
    "text": "Access controls and protected file storage restrict access, but no online service can guarantee absolute security. We retain information while needed to operate the account and for legitimate dispute, security and legal recordkeeping needs. Verification documents are not promised to be deleted immediately after review. Account erasure requests are processed through the deletion workflow; some payment/audit records and backups may remain for necessary retention periods. Data may be processed where our service providers operate."
  },
  {
    "title": "Cookies and local storage",
    "text": "We use authentication cookies and browser storage for sessions, preferences and registration drafts, and operational logs to maintain the website. Clearing browser storage may sign you out or remove an unfinished draft. Any optional analytics or marketing use requiring consent will need a separate choice."
  },
  {
    "title": "Your choices and complaints",
    "text": "You can edit profile details and privacy preferences, request an account export or deletion, and contact support to request correction or withdraw optional consent. Withdrawal may limit features requiring that information. Send privacy complaints to the proprietor/support contact below. We aim to acknowledge complaints within 48 hours and resolve them within one month, subject to applicable law. This notice does not claim that every legal compliance requirement has been independently certified."
  }
]} />;}
