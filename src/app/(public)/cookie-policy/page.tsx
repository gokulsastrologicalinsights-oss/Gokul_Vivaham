import PolicyPage from '@/components/PolicyPage';
import { informationMetadata } from '@/config/information-pages';
export const metadata = informationMetadata('Cookie Policy', 'How authentication cookies and browser storage support sessions, preferences and registration drafts at Gokul Vivaham.');
export default function Page() {
  return <PolicyPage title="Cookie Policy" reviewedOn="16 October 2026" sections={[
    { title: 'Cookies and browser storage', text: 'Cookies are small values stored by your browser and sent with relevant website requests. Browser local storage is separate storage used on the device. Gokul Vivaham uses authentication cookies and browser storage to support sign-in and account sessions, preferences and registration drafts.' },
    { title: 'Authentication and preferences', text: 'Authentication cookies allow the server to verify access to member and administrator features. Theme and other available preferences may be stored in the browser. A saved registration draft may contain information you entered. Use care on a shared device and clear drafts or sign out when finished.' },
    { title: 'External services', text: 'Supabase supports authentication and service data, Cloudflare R2 stores private uploaded files, Vercel hosts the site and Razorpay provides payment checkout. Opening links to WhatsApp or Google Maps connects to those services under their own privacy practices. The Contact Us page opens Google Maps only when you select its external link.' },
    { title: 'Managing storage and privacy', text: 'You can block or clear cookies and site storage in browser settings. This may sign you out, reset preferences or remove an unfinished draft. Public information pages can still be read without signing in; protected features require a valid session. Read the Privacy Policy for data processing and privacy request details.' },
  ]} />;
}
