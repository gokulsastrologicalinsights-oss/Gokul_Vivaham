import PolicyPage from '@/components/PolicyPage';
import { informationMetadata } from '@/config/information-pages';
export const metadata = informationMetadata('Verification Policy', 'Understand contact and document verification, private uploads and the limitations of verification badges at Gokul Vivaham.');
export default function Page() {
  return <PolicyPage title="User Verification Policy" reviewedOn="16 October 2026" sections={[
    { title: 'Contact and document checks', text: 'Account verification tools allow members to confirm email or mobile details using the configured authentication provider. Phone OTP delivery depends on the SMS provider being configured and available. Identity or horoscope documents can be submitted through the protected verification workflow for administrator review. A successful upload is not the same as approval.' },
    { title: 'Private verification uploads', text: 'Verification documents are held in private file storage and access is restricted by account and administrator permissions. Submit them through the protected upload workflow, not an ordinary contact inquiry. They are not promised to be deleted immediately on approval or rejection. Account erasure and retention limitations are explained in the Privacy Policy and Data Deletion page.' },
    { title: 'Meaning of a badge', text: 'Verification status reflects the checks recorded for the account or document. Paying for a membership does not by itself verify an identity. A badge does not certify every profile statement, marital status, personal character or criminal history and does not guarantee compatibility or marriage. Perform your own checks before making commitments.' },
    { title: 'Reporting concerns', text: 'Use the profile report and blocking tools for suspicious or unwanted behavior, and contact support for help with verification errors. Do not share passwords, OTPs or another member’s private documents in a report. The platform facilitates introductions and cannot guarantee the behavior of other members.' },
  ]} />;
}
