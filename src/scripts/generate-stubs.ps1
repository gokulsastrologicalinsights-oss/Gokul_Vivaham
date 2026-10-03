# generate-stubs.ps1
# Script to generate production-ready stubs and folder structure for Gokul Vivaham platform

$baseDir = "e:\GAI\gai_matrimony\src"

function Create-File($path, $content) {
    $fullPath = Join-Path $baseDir $path
    $parentDir = Split-Path $fullPath -Parent
    if (!(Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    if (!(Test-Path $fullPath)) {
        Set-Content -Path $fullPath -Value $content -Force
        Write-Host "Created file: $path"
    } else {
        Write-Host "File already exists: $path"
    }
}

# --- 1. UI COMPONENT STUBS ---
Create-File "components\ui\dropdown\Dropdown.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative inline-block text-left">
      <button className="px-4 py-2 bg-white border rounded-lg text-xs font-semibold">{label}</button>
      <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white hidden">{children}</div>
    </div>
  );
}
"@

Create-File "components\ui\tabs\Tabs.tsx" @"
'use client';
export default function Tabs({ tabs, activeTab, onChange }: { tabs: string[]; activeTab: string; onChange: (tab: string) => void }) {
  return (
    <div className="flex border-b border-zinc-200">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`py-2 px-4 text-xs font-semibold ${activeTab === tab ? 'border-b-2 border-maroon-600 text-maroon-605' : 'text-zinc-500'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
"@

Create-File "components\ui\accordion\Accordion.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function Accordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <div className="p-4 bg-zinc-50 font-semibold text-xs cursor-pointer">{title}</div>
      <div className="p-4 border-t border-zinc-200 text-xs font-light">{children}</div>
    </div>
  );
}
"@

Create-File "components\ui\alert\Alert.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function Alert({ title, children, type = 'info' }: { title: string; children: ReactNode; type?: 'info' | 'warning' | 'error' }) {
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };
  return (
    <div className={`p-4 border rounded-xl ${colors[type]}`}>
      <h4 className="font-bold text-xs">{title}</h4>
      <div className="mt-1 text-[11px] font-light">{children}</div>
    </div>
  );
}
"@

Create-File "components\ui\avatar\Avatar.tsx" @"
'use client';
export default function Avatar({ src, alt, size = 'md' }: { src?: string; alt: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-16 w-16' };
  return (
    <div className={`${sizes[size]} rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center border border-zinc-300`}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <span className="text-zinc-500 text-xs font-bold">{alt[0]}</span>}
    </div>
  );
}
"@

Create-File "components\ui\progress\Progress.tsx" @"
'use client';
export default function Progress({ value }: { value: number }) {
  return (
    <div className="w-full bg-zinc-150 h-2 rounded-full overflow-hidden">
      <div className="bg-maroon-600 h-full transition-all duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}
"@

Create-File "components\ui\skeleton\Skeleton.tsx" @"
'use client';
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded ${className}`} />;
}
"@

Create-File "components\ui\cards\MatchCard.tsx" @"
'use client';
export default function MatchCard({ name, age, rasi }: { name: string; age: number; rasi: string }) {
  return (
    <div className="p-4 bg-white border border-zinc-200 rounded-2xl flex flex-col gap-1">
      <h3 className="font-bold text-xs">{name} ({age})</h3>
      <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{rasi} Rasi</span>
    </div>
  );
}
"@

Create-File "components\ui\modal\GeneralModal.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function GeneralModal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl shadow-xl max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 text-xs font-bold">Close</button>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
"@

# --- 2. AUTH COMPONENT STUBS ---
Create-File "components\auth\RegisterForm.tsx" @"
'use client';
export default function RegisterForm() {
  return <div className="p-6 bg-white rounded-3xl border border-zinc-200">Register Form Stub</div>;
}
"@

Create-File "components\auth\OTPVerification.tsx" @"
'use client';
export default function OTPVerification() {
  return <div className="p-6 bg-white rounded-3xl border border-zinc-200">OTP Verification Stub</div>;
}
"@

Create-File "components\auth\SocialLogin.tsx" @"
'use client';
export default function SocialLogin() {
  return <div className="p-4 flex gap-4 justify-center">Social Login Buttons</div>;
}
"@

Create-File "components\auth\ForgotPasswordForm.tsx" @"
'use client';
export default function ForgotPasswordForm() {
  return <div className="p-6 bg-white rounded-3xl border border-zinc-200 font-light text-xs">Forgot Password Form</div>;
}
"@

Create-File "components\auth\ResetPasswordForm.tsx" @"
'use client';
export default function ResetPasswordForm() {
  return <div className="p-6 bg-white rounded-3xl border border-zinc-200 font-light text-xs">Reset Password Form</div>;
}
"@

Create-File "components\auth\AuthLayout.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-zinc-50">{children}</div>;
}
"@

Create-File "components\auth\RoleGuard.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function RoleGuard({ children, allowedRoles }: { children: ReactNode; allowedRoles: string[] }) {
  return <>{children}</>;
}
"@

# --- 3. REGISTRATION COMPONENT STUBS ---
Create-File "components\register\StepIndicator.tsx" @"
'use client';
export default function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return <div className="text-xs font-semibold text-zinc-400">Step {currentStep} of {totalSteps}</div>;
}
"@

Create-File "components\register\RegistrationLayout.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function RegistrationLayout({ children }: { children: ReactNode }) {
  return <div className="max-w-2xl mx-auto py-8">{children}</div>;
}
"@

Create-File "components\register\steps\PartnerPreferenceStep.tsx" @"
'use client';
export default function PartnerPreferenceStep() {
  return <div className="text-xs font-light">Partner Preference Settings</div>;
}
"@

Create-File "components\register\steps\ReviewStep.tsx" @"
'use client';
export default function ReviewStep() {
  return <div className="text-xs font-light">Review Profile Information</div>;
}
"@

Create-File "components\register\UploadHoroscope.tsx" @"
'use client';
export default function UploadHoroscope() {
  return <div className="p-4 border border-dashed rounded-xl text-center text-xs">Upload Horoscope Stub</div>;
}
"@

Create-File "components\register\UploadPhotos.tsx" @"
'use client';
export default function UploadPhotos() {
  return <div className="p-4 border border-dashed rounded-xl text-center text-xs">Upload Photos Stub</div>;
}
"@

Create-File "components\register\RegistrationSuccess.tsx" @"
'use client';
export default function RegistrationSuccess() {
  return <div className="text-center p-6 text-xs">Registration Completed Successfully!</div>;
}
"@

# --- 4. PROFILE COMPONENT STUBS ---
Create-File "components\profile\ProfileHeader.tsx" @"
'use client';
export default function ProfileHeader({ name }: { name: string }) {
  return <div className="p-6 bg-zinc-50 border-b font-serif text-lg font-bold">{name}</div>;
}
"@

Create-File "components\profile\ProfileGallery.tsx" @"
'use client';
export default function ProfileGallery() {
  return <div className="grid grid-cols-3 gap-2">Image Gallery Placeholders</div>;
}
"@

Create-File "components\profile\ProfileDetails.tsx" @"
'use client';
export default function ProfileDetails() {
  return <div className="text-xs font-light space-y-1">Basic Profile Details</div>;
}
"@

Create-File "components\profile\HoroscopeDetails.tsx" @"
'use client';
export default function HoroscopeDetails() {
  return <div className="text-xs font-light">Star, Rasi, Gothram parameters</div>;
}
"@

Create-File "components\profile\FamilyDetails.tsx" @"
'use client';
export default function FamilyDetails() {
  return <div className="text-xs font-light">Family members information</div>;
}
"@

Create-File "components\profile\PartnerPreference.tsx" @"
'use client';
export default function PartnerPreference() {
  return <div className="text-xs font-light">Configured Partner Expectations</div>;
}
"@

Create-File "components\profile\ProfileActions.tsx" @"
'use client';
export default function ProfileActions() {
  return <div className="flex gap-2">Contact, Shortlist, Interest Buttons</div>;
}
"@

Create-File "components\profile\CompatibilityMeter.tsx" @"
'use client';
export default function CompatibilityMeter({ score }: { score: number }) {
  return <div className="text-sm font-bold text-maroon-700">{score}% Match Score</div>;
}
"@

Create-File "components\profile\EditProfileForm.tsx" @"
'use client';
export default function EditProfileForm() {
  return <div className="p-4 text-xs font-light">Edit Profile Settings Form</div>;
}
"@

# --- 5. MATCHMAKING COMPONENT STUBS ---
Create-File "components\matchmaking\MatchGrid.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function MatchGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>;
}
"@

Create-File "components\matchmaking\MatchCard.tsx" @"
'use client';
export default function MatchCard() {
  return <div className="p-4 border rounded-xl bg-white shadow-sm">Match Candidate</div>;
}
"@

Create-File "components\matchmaking\MatchRequestButton.tsx" @"
'use client';
export default function MatchRequestButton() {
  return <button className="px-4 py-2 rounded-lg bg-maroon-600 text-white text-xs font-semibold">Send Request</button>;
}
"@

Create-File "components\matchmaking\AICompatibility.tsx" @"
'use client';
export default function AICompatibility() {
  return <div className="text-xs font-semibold text-gold-600">AI Match Score Verified</div>;
}
"@

Create-File "components\matchmaking\InterestCard.tsx" @"
'use client';
export default function InterestCard() {
  return <div className="p-4 border rounded-xl">Interest Request Item</div>;
}
"@

# --- 6. DASHBOARD COMPONENT STUBS ---
Create-File "components\dashboard\DashboardHeader.tsx" @"
'use client';
export default function DashboardHeader() {
  return <header className="h-16 border-b flex items-center px-6">Gokul Vivaham User Dashboard</header>;
}
"@

Create-File "components\dashboard\DashboardSidebar.tsx" @"
'use client';
export default function DashboardSidebar() {
  return <aside className="w-64 border-r p-4">Sidebar Links</aside>;
}
"@

Create-File "components\dashboard\RecentMatches.tsx" @"
'use client';
export default function RecentMatches() {
  return <div className="space-y-2">Recent Profile Matches</div>;
}
"@

Create-File "components\dashboard\ActivityTimeline.tsx" @"
'use client';
export default function ActivityTimeline() {
  return <div className="space-y-2">Activity Timeline Logs</div>;
}
"@

Create-File "components\dashboard\SubscriptionOverview.tsx" @"
'use client';
export default function SubscriptionOverview() {
  return <div className="p-4 border rounded-xl bg-zinc-50">Active Plan: Gold Elite</div>;
}
"@

Create-File "components\dashboard\NotificationsPanel.tsx" @"
'use client';
export default function NotificationsPanel() {
  return <div className="p-4 border rounded-xl">Notification Alert Center</div>;
}
"@

# --- 7. ADMIN COMPONENT STUBS ---
Create-File "components\admin\AdminHeader.tsx" @"
'use client';
export default function AdminHeader() {
  return <header className="h-16 bg-zinc-900 text-white flex items-center px-6">Console Control Panel</header>;
}
"@

Create-File "components\admin\AdminSidebar.tsx" @"
'use client';
export default function AdminSidebar() {
  return <aside className="w-60 bg-zinc-950 text-zinc-400 p-4">Admin Links</aside>;
}
"@

Create-File "components\admin\UserManagementTable.tsx" @"
'use client';
export default function UserManagementTable() {
  return <div className="p-4 bg-white border border-zinc-200 rounded-xl">User Registry Table</div>;
}
"@

Create-File "components\admin\ApprovalQueue.tsx" @"
'use client';
export default function ApprovalQueue() {
  return <div className="p-4 bg-white border border-zinc-200 rounded-xl">Pending Approvals Queue</div>;
}
"@

Create-File "components\admin\RevenueChart.tsx" @"
'use client';
export default function RevenueChart() {
  return <div className="p-6 bg-white border rounded-xl text-center">Revenue Analytics Chart</div>;
}
"@

Create-File "components\admin\ReportsTable.tsx" @"
'use client';
export default function ReportsTable() {
  return <div className="p-4 bg-white border border-zinc-200 rounded-xl">Candidate Reports Logs</div>;
}
"@

Create-File "components\admin\ActivityLogs.tsx" @"
'use client';
export default function ActivityLogs() {
  return <div className="space-y-1.5 text-xs font-mono">System Audit Logs</div>;
}
"@

# --- 8. SEARCH COMPONENT STUBS ---
Create-File "components\search\SearchFilters.tsx" @"
'use client';
export default function SearchFilters() {
  return <div className="p-4 bg-white border rounded-xl">Search Filter Inputs</div>;
}
"@

Create-File "components\search\FilterSidebar.tsx" @"
'use client';
export default function FilterSidebar() {
  return <aside className="w-64 p-4 border-r">Filter Parameters</aside>;
}
"@

Create-File "components\search\SearchResults.tsx" @"
'use client';
export default function SearchResults() {
  return <div className="space-y-4">Search Match Results Grid</div>;
}
"@

Create-File "components\search\SortDropdown.tsx" @"
'use client';
export default function SortDropdown() {
  return <select className="border rounded px-2 py-1 text-xs">Sort Options</select>;
}
"@

Create-File "components\search\Pagination.tsx" @"
'use client';
export default function Pagination() {
  return <div className="flex gap-2 justify-center py-4">Pagination Controls</div>;
}
"@

# --- 9. CHAT COMPONENT STUBS ---
Create-File "components\chat\ChatLayout.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-[600px] border rounded-2xl overflow-hidden">{children}</div>;
}
"@

Create-File "components\chat\ConversationList.tsx" @"
'use client';
export default function ConversationList() {
  return <div className="w-80 border-r p-4">Interests Chat Channels</div>;
}
"@

Create-File "components\chat\ChatWindow.tsx" @"
'use client';
export default function ChatWindow() {
  return <div className="flex-1 flex flex-col p-4">Active Chat Conversations</div>;
}
"@

Create-File "components\chat\MessageBubble.tsx" @"
'use client';
export default function MessageBubble({ message, isSelf }: { message: string; isSelf: boolean }) {
  return (
    <div className={`p-3 rounded-xl max-w-xs ${isSelf ? 'bg-maroon-600 text-white self-end' : 'bg-zinc-100 text-zinc-800 self-start'}`}>
      {message}
    </div>
  );
}
"@

Create-File "components\chat\ChatInput.tsx" @"
'use client';
export default function ChatInput() {
  return <input type="text" placeholder="Type message..." className="border rounded-full px-4 py-2 w-full" />;
}
"@

Create-File "components\chat\TypingIndicator.tsx" @"
'use client';
export default function TypingIndicator() {
  return <div className="text-xs text-zinc-400 italic">User is typing...</div>;
}
"@

# --- 10. SERVICES STUBS ---
Create-File "services\profile.service.ts" @"
export const profileService = {
  getProfile: async (id: string) => { return { id, name: "Revathi S." }; },
  updateProfile: async (id: string, data: any) => { return { success: true }; }
};
"@

Create-File "services\match.service.ts" @"
export const matchService = {
  getMatches: async () => { return []; },
  sendRequest: async (id: string) => { return { success: true }; }
};
"@

Create-File "services\horoscope.service.ts" @"
export const horoscopeService = {
  verifyHoroscope: async (file: any) => { return { score: 92 }; }
};
"@

Create-File "services\notification.service.ts" @"
export const notificationService = {
  getNotifications: async () => { return []; }
};
"@

Create-File "services\upload.service.ts" @"
export const uploadService = {
  uploadFile: async (file: any) => { return { url: "https://gokul-vivaham.supabase/file.pdf" }; }
};
"@

Create-File "services\subscription.service.ts" @"
export const subscriptionService = {
  getBillingLogs: async () => { return []; }
};
"@

Create-File "services\admin.service.ts" @"
export const adminService = {
  getAuditLogs: async () => { return []; }
};
"@

# --- 11. STORE STUBS ---
Create-File "stores\profileStore.ts" @"
import { create } from 'zustand';

export const useProfileStore = create((set) => ({
  profile: null,
  setProfile: (profile: any) => set({ profile })
}));
"@

Create-File "stores\matchStore.ts" @"
import { create } from 'zustand';

export const useMatchStore = create((set) => ({
  matches: [],
  setMatches: (matches: any[]) => set({ matches })
}));
"@

Create-File "stores\chatStore.ts" @"
import { create } from 'zustand';

export const useChatStore = create((set) => ({
  conversations: [],
  activeChat: null,
  setActiveChat: (chat: any) => set({ activeChat: chat })
}));
"@

Create-File "stores\notificationStore.ts" @"
import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification: (notif: any) => set((state: any) => ({ notifications: [...state.notifications, notif] }))
}));
"@

Create-File "stores\subscriptionStore.ts" @"
import { create } from 'zustand';

export const useSubscriptionStore = create((set) => ({
  plan: 'Free',
  setPlan: (plan: string) => set({ plan })
}));
"@

Create-File "stores\adminStore.ts" @"
import { create } from 'zustand';

export const useAdminStore = create((set) => ({
  users: [],
  setUsers: (users: any[]) => set({ users })
}));
"@

# --- 12. HOOKS STUBS ---
Create-File "hooks\useAuth.ts" @"
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, session } = useAuthStore() as any;
  return { user, session, isAuthenticated: !!user };
}
"@

Create-File "hooks\useProfile.ts" @"
import { useProfileStore } from '@/stores/profileStore';

export function useProfile() {
  const { profile } = useProfileStore() as any;
  return { profile };
}
"@

Create-File "hooks\useMatches.ts" @"
import { useMatchStore } from '@/stores/matchStore';

export function useMatches() {
  const { matches } = useMatchStore() as any;
  return { matches };
}
"@

Create-File "hooks\useNotifications.ts" @"
import { useNotificationStore } from '@/stores/notificationStore';

export function useNotifications() {
  const { notifications } = useNotificationStore() as any;
  return { notifications };
}
"@

Create-File "hooks\useSubscription.ts" @"
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export function useSubscription() {
  const { plan } = useSubscriptionStore() as any;
  return { plan };
}
"@

Create-File "hooks\useDebounce.ts" @"
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
"@

Create-File "hooks\useMediaQuery.ts" @"
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}
"@

Create-File "hooks\useInfiniteScroll.ts" @"
import { useEffect } from 'react';

export function useInfiniteScroll(callback: () => void, targetRef: any) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) callback();
    });
    if (targetRef.current) observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, [callback, targetRef]);
}
"@

# --- 13. SUPABASE CONFIG STUBS ---
Create-File "lib\supabase\client.ts" @"
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
"@

Create-File "lib\supabase\server.ts" @"
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
"@

Create-File "lib\supabase\middleware.ts" @"
import { NextResponse } from 'next/server';

export function updateSession(request: any) {
  return NextResponse.next();
}
"@

Create-File "lib\supabase\database.types.ts" @"
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export interface Database {
  public: {
    Tables: {
      [_ in string]: any
    }
  }
}
"@

Create-File "lib\supabase\storage.ts" @"
export const supabaseStorage = {
  uploadAvatar: async (file: any) => { return 'url'; }
};
"@

Create-File "lib\supabase\auth.ts" @"
export const supabaseAuth = {
  getUser: async () => { return null; }
};
"@

# --- 14. LIBRARY UTILS STUBS ---
Create-File "lib\auth.ts" @"
export const authLib = {
  verifySession: () => true
};
"@

Create-File "lib\storage.ts" @"
export const storageLib = {
  saveLocal: (key: string, v: any) => localStorage.setItem(key, JSON.stringify(v))
};
"@

Create-File "lib\seo.ts" @"
export const seoLib = {
  generateMeta: (title: string) => { return { title }; }
};
"@

Create-File "lib\analytics.ts" @"
export const analyticsLib = {
  trackEvent: (evt: string) => Write-Host "Tracked: $evt"
};
"@

Create-File "lib\validators.ts" @"
export const validatorsLib = {
  isValidMobile: (tel: string) => /^\+?[1-9]\d{1,14}$/.test(tel)
};
"@

Create-File "lib\permissions.ts" @"
export const permissionsLib = {
  canAccessAdmin: (role: string) => role === 'admin'
};
"@

# --- 15. UTILS STUBS ---
Create-File "utils\formatDate.ts" @"
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString();
}
"@

Create-File "utils\calculateAge.ts" @"
export function calculateAge(dob: string | Date): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}
"@

Create-File "utils\generateCompatibility.ts" @"
export function generateCompatibility(rasi1: string, rasi2: string): number {
  return rasi1 === rasi2 ? 90 : 75;
}
"@

Create-File "utils\cn.ts" @"
export function cn(...inputs: any[]): string {
  return inputs.filter(Boolean).join(' ');
}
"@

Create-File "utils\slugify.ts" @"
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
"@

Create-File "utils\validationHelpers.ts" @"
export const validationHelpers = {
  isStrongPassword: (p: string) => p.length >= 6
};
"@

Create-File "utils\constants.ts" @"
export const CONSTANTS = {
  BRAND: 'Gokul Vivaham',
  TAGLINE: 'Where Matches Begin with Compatibility'
};
"@

# --- 16. VALIDATIONS SCHEMAS STUBS ---
Create-File "validations\auth.schema.ts" @"
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
"@

Create-File "validations\profile.schema.ts" @"
import { z } from 'zod';

export const profileSchema = z.object({
  fullName: z.string().min(2),
  age: z.number().min(18)
});
"@

Create-File "validations\search.schema.ts" @"
import { z } from 'zod';

export const searchSchema = z.object({
  gender: z.enum(['Male', 'Female'])
});
"@

Create-File "validations\horoscope.schema.ts" @"
import { z } from 'zod';

export const horoscopeSchema = z.object({
  rasi: z.string()
});
"@

Create-File "validations\subscription.schema.ts" @"
import { z } from 'zod';

export const subscriptionSchema = z.object({
  plan: z.string()
});
"@

# --- 17. TS TYPES STUBS ---
Create-File "types\auth.types.ts" @"
export interface UserSession {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}
"@

Create-File "types\match.types.ts" @"
export interface MatchSummary {
  id: string;
  name: string;
  score: number;
}
"@

Create-File "types\horoscope.types.ts" @"
export interface AstroCoordinates {
  rasi: string;
  star: string;
  gothram: string;
}
"@

Create-File "types\notification.types.ts" @"
export interface SystemNotification {
  id: string;
  title: string;
  message: string;
}
"@

Create-File "types\admin.types.ts" @"
export interface SystemMetric {
  totalUsers: number;
  revenue: number;
}
"@

Create-File "types\api.types.ts" @"
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
"@

# --- 18. PROVIDERS & CONTEXTS STUBS ---
Create-File "providers\ThemeProvider.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return <div className="theme-light">{children}</div>;
}
"@

Create-File "providers\AuthProvider.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
"@

Create-File "providers\QueryProvider.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
"@

Create-File "providers\LanguageProvider.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function LanguageProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
"@

Create-File "providers\NotificationProvider.tsx" @"
'use client';
import { ReactNode } from 'react';

export default function NotificationProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
"@

Create-File "contexts\AuthContext.tsx" @"
'use client';
import { createContext } from 'react';

export const AuthContext = createContext<any>(null);
"@

Create-File "contexts\ThemeContext.tsx" @"
'use client';
import { createContext } from 'react';

export const ThemeContext = createContext<any>(null);
"@

Create-File "contexts\LanguageContext.tsx" @"
'use client';
import { createContext } from 'react';

export const LanguageContext = createContext<any>(null);
"@

Create-File "contexts\NotificationContext.tsx" @"
'use client';
import { createContext } from 'react';

export const NotificationContext = createContext<any>(null);
"@

# --- 19. CONFIG STUBS ---
Create-File "config\site.config.ts" @"
export const siteConfig = {
  name: 'Gokul Vivaham',
  description: 'Where Matches Begin with Compatibility'
};
"@

Create-File "config\seo.config.ts" @"
export const seoConfig = {
  defaultTitle: 'Gokul Vivaham | South Indian Matrimony',
  description: 'Sleek premium matrimony matching'
};
"@

Create-File "config\routes.config.ts" @"
export const routesConfig = {
  home: '/',
  dashboard: '/dashboard',
  login: '/login'
};
"@

Create-File "config\auth.config.ts" @"
export const authConfig = {
  sessionExpiry: '7d'
};
"@

Create-File "config\subscription.config.ts" @"
export const subscriptionConfig = {
  plans: ['Free', 'Gold', 'Diamond']
};
"@

# --- 20. STYLES STUBS ---
Create-File "styles\theme.css" @"
:root {
  --color-gold: #C8A95B;
  --color-maroon: #6D1F1F;
}
"@

Create-File "styles\animations.css" @"
@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
"@

Create-File "styles\typography.css" @"
body {
  font-family: 'Inter', sans-serif;
}
"@

# --- 21. MIDDLEWARE STUBS ---
Create-File "middleware\auth.middleware.ts" @"
export function authMiddleware(req: any) {
  return true;
}
"@

Create-File "middleware\admin.middleware.ts" @"
export function adminMiddleware(req: any) {
  return true;
}
"@

Create-File "middleware\rateLimit.middleware.ts" @"
export function rateLimitMiddleware(req: any) {
  return true;
}
"@

# --- 22. DOCS STUBS ---
Create-File "docs\architecture.md" @"
# Gokul Vivaham Platform Architecture
Explaining clean App Router architecture, service-layer queries, and state management.
"@

Create-File "docs\api.md" @"
# API endpoints specs
Documentation for webhooks, match scores, and registration steps.
"@

Create-File "docs\deployment.md" @"
# Deployment strategies
Explaining production build deployment to Supabase/Vercel platforms.
"@

Create-File "docs\authentication.md" @"
# Authentication flow
Explaining SMS OTP matching credentials.
"@

Create-File "docs\database-schema.md" @"
# PostgreSQL DB Schema definitions
Documenting RLS policies and table structures.
"@

# --- 23. MISSING SUBROUTES STUBS ---
Create-File "app\(public)\search\page.tsx" @"
'use client';
export default function SearchPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto text-left flex flex-col gap-4">
      <h1 className="text-2xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Search Candidates</h1>
      <p className="text-xs text-zinc-500 font-light">Custom database query checks.</p>
    </div>
  );
}
"@

Create-File "app\(public)\privacy-policy\page.tsx" @"
'use client';
export default function PrivacyPolicyPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto text-left flex flex-col gap-4 font-light text-sm">
      <h1 className="text-2xl font-serif font-bold">Privacy Policy</h1>
      <p>Your privacy coordinates are safe. RLS configurations secure candidate horoscopes and photo collections.</p>
    </div>
  );
}
"@

Create-File "app\(public)\terms\page.tsx" @"
'use client';
export default function TermsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto text-left flex flex-col gap-4 font-light text-sm">
      <h1 className="text-2xl font-serif font-bold">Terms of Service</h1>
      <p>General specifications for platform registration, verification rules, and billing cycles.</p>
    </div>
  );
}
"@

Create-File "app\(public)\compatibility\page.tsx" @"
'use client';
export default function CompatibilityPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto text-left flex flex-col gap-4">
      <h1 className="text-2xl font-serif font-bold">Astro & AI Compatibility</h1>
      <p className="text-xs text-zinc-500 font-light">Review planetary calculations details.</p>
    </div>
  );
}
"@

Create-File "app\(auth)\otp-login\page.tsx" @"
'use client';
export default function OtpLoginPage() {
  return <div className="p-6 text-center text-xs font-semibold">SMS OTP Authentication Center</div>;
}
"@

Create-File "app\(auth)\reset-password\page.tsx" @"
'use client';
export default function ResetPasswordPage() {
  return <div className="p-6 text-center text-xs font-semibold">Password Reset Confirm Center</div>;
}
"@

Create-File "app\(auth)\verify\page.tsx" @"
'use client';
export default function VerifyPage() {
  return <div className="p-6 text-center text-xs font-semibold">Aadhaar / OTP Verification Dashboard</div>;
}
"@

Create-File "app\dashboard\profile\page.tsx" @"
'use client';
export default function DashboardProfilePage() {
  return <div className="p-6 text-xs font-light">User Profile Overview</div>;
}
"@

Create-File "app\dashboard\chat\page.tsx" @"
'use client';
export default function DashboardChatPage() {
  return <div className="p-6 text-xs font-light">Chat Conversations Panel</div>;
}
"@

Create-File "app\dashboard\notifications\page.tsx" @"
'use client';
export default function DashboardNotificationsPage() {
  return <div className="p-6 text-xs font-light">Notifications Alert Logs</div>;
}
"@

Create-File "app\admin\users\page.tsx" @"
'use client';
export default function AdminUsersPage() {
  return <div className="p-6 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-semibold">Admin User Registry Control</div>;
}
"@

Create-File "app\admin\approvals\page.tsx" @"
'use client';
export default function AdminApprovalsPage() {
  return <div className="p-6 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-semibold">Admin Verification Approvals Queue</div>;
}
"@

Create-File "app\admin\subscriptions\page.tsx" @"
'use client';
export default function AdminSubscriptionsPage() {
  return <div className="p-6 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-semibold">Admin Subscriptions Billing Logs</div>;
}
"@

Create-File "app\admin\reports\page.tsx" @"
'use client';
export default function AdminReportsPage() {
  return <div className="p-6 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-semibold">Admin Safety Reports Center</div>;
}
"@

Create-File "app\admin\analytics\page.tsx" @"
'use client';
export default function AdminAnalyticsPage() {
  return <div className="p-6 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-semibold">Admin Revenue & Registration Charts</div>;
}
"@

Create-File "app\admin\notifications\page.tsx" @"
'use client';
export default function AdminNotificationsPage() {
  return <div className="p-6 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-semibold">Admin Broadcast Notifications Panel</div>;
}
"@

Create-File "app\admin\settings\page.tsx" @"
'use client';
export default function AdminSettingsPage() {
  return <div className="p-6 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-semibold">Admin Console Config Options</div>;
}
"@

# --- 24. API ROUTES STUBS ---
Create-File "app\api\auth\route.ts" @"
import { NextResponse } from 'next/server';
export async function POST() { return NextResponse.json({ ok: true }); }
"@

Create-File "app\api\users\route.ts" @"
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json([]); }
"@

Create-File "app\api\profiles\route.ts" @"
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json([]); }
"@

Create-File "app\api\matches\route.ts" @"
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json([]); }
"@

Create-File "app\api\subscriptions\route.ts" @"
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json([]); }
"@

Create-File "app\api\uploads\route.ts" @"
import { NextResponse } from 'next/server';
export async function POST() { return NextResponse.json({ success: true }); }
"@

Create-File "app\api\admin\route.ts" @"
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ isAdmin: true }); }
"@

Create-File "app\api\webhooks/route.ts" @"
import { NextResponse } from 'next/server';
export async function POST() { return NextResponse.json({ received: true }); }
"@

# --- 25. SITEMAP STUB ---
Create-File "app\sitemap.xml\route.ts" @"
import { NextResponse } from 'next/server';
export async function GET() {
  const xml = '<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"><url><loc>https://gokul-vivaham.com</loc></url></urlset>';
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
"@

Write-Host "Stub generation script written successfully."
