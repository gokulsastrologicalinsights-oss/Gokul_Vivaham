'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, UserCheck, Star, ShieldAlert, FileSpreadsheet, 
  DollarSign, Check, X, Search, Bell, LogOut, ShieldCheck 
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function AdminDashboard() {
  const router = useRouter();
  
  // Dashboard stats state
  const [stats, setStats] = useState({
    totalUsers: 1420,
    newRegistrations: 28,
    premiumMembers: 312,
    pendingApprovals: 8,
    horoscopesPending: 12,
    activeMatches: 654,
    revenueThisMonth: 148500
  });

  // Registrations Queue
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  // Horoscope Queue
  const [pendingHoroscopes, setPendingHoroscopes] = useState<any[]>([]);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const [statsRes, profilesRes, horoscopesRes, txnsRes] = await Promise.all([
          adminService.getAdminStats(),
          adminService.getPendingProfiles(),
          adminService.getPendingHoroscopes(),
          adminService.getTransactions()
        ]);

        if (statsRes.data) setStats(statsRes.data);
        if (profilesRes.data) setPendingUsers(profilesRes.data);
        if (horoscopesRes.data) setPendingHoroscopes(horoscopesRes.data);
        if (txnsRes.data) setTransactions(txnsRes.data);
      } catch (err) {
        console.error('Error loading admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  // Actions
  const handleApproveUser = async (user: any) => {
    const identifier = user.user_id || user.id;
    try {
      const { error } = await adminService.approveProfile(identifier);
      if (error) {
        alert('Failed to approve profile: ' + error.message);
        return;
      }
      setPendingUsers(prev => prev.filter(u => u.id !== user.id));
      setStats(prev => ({
        ...prev,
        totalUsers: prev.totalUsers + 1,
        pendingApprovals: Math.max(0, prev.pendingApprovals - 1)
      }));
      alert(`Approved Profile: ${user.name}`);
    } catch (e: any) {
      alert('Error approving user: ' + e.message);
    }
  };

  const handleRejectUser = (id: any, name: string) => {
    setPendingUsers(prev => prev.filter(u => u.id !== id));
    setStats(prev => ({
      ...prev,
      pendingApprovals: Math.max(0, prev.pendingApprovals - 1)
    }));
    alert(`Rejected Profile: ${name}`);
  };

  const handleVerifyHoroscope = async (id: any, name: string) => {
    try {
      const { success, error } = await adminService.verifyHoroscope(id);
      if (error || !success) {
        alert('Failed to verify horoscope: ' + (error?.message || 'unknown error'));
        return;
      }
      setPendingHoroscopes(prev => prev.filter(h => h.id !== id));
      setStats(prev => ({
        ...prev,
        horoscopesPending: Math.max(0, prev.horoscopesPending - 1)
      }));
      alert(`Horoscope Verified for: ${name}`);
    } catch (e: any) {
      alert('Error verifying horoscope: ' + e.message);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Card 1 */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-mono font-bold text-foreground">{stats.totalUsers}</span>
              <span className="text-xs text-muted font-medium mt-1">Total Members</span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-mono font-bold text-success">+{stats.newRegistrations}</span>
              <span className="text-xs text-muted font-medium mt-1">New Sign-ups (24h)</span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-success/10 flex items-center justify-center text-success">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-mono font-bold text-primary">{stats.premiumMembers}</span>
              <span className="text-xs text-muted font-medium mt-1">Premium Accounts</span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Star className="h-5 w-5" />
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-mono font-bold text-destructive">₹{stats.revenueThisMonth.toLocaleString()}</span>
              <span className="text-xs text-muted font-medium mt-1">Revenue (This Month)</span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* WORKLOAD QUEUES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* PENDING APPROVALS QUEUE */}
          <div className="lg:col-span-8 flex flex-col bg-card border border-border rounded-2xl shadow-lg p-5 md:p-6 gap-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div className="flex flex-col">
                <h2 className="text-lg font-serif font-bold text-foreground">Pending Registrations ({pendingUsers.length})</h2>
                <span className="text-xs text-muted">Inspect and approve newly registered matrimony profiles</span>
              </div>
              
              <div className="relative max-w-xs w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search profiles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 pl-9 pr-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-muted text-foreground font-mono"
                />
              </div>
            </div>

            {pendingUsers.length > 0 ? (
              <div className="flex flex-col gap-4">
                {pendingUsers
                  .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((user) => (
                    <div 
                      key={user.id} 
                      className="p-4 rounded-xl bg-surface/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-muted/30 transition-colors"
                    >
                      <div className="flex flex-col text-left gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{user.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted font-bold uppercase tracking-wider">
                            {user.gender}
                          </span>
                        </div>
                        <span className="text-xs text-muted leading-normal">
                          {user.age} yrs • {user.caste} • {user.location} • <span className="text-muted/70">{user.date}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        <button
                          onClick={() => handleRejectUser(user.id, user.name)}
                          className="p-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                          title="Reject Account"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApproveUser(user)}
                          className="flex items-center gap-1 px-3 h-8.5 rounded-lg bg-success hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          title="Approve Account"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted font-mono text-xs border border-dashed border-border rounded-xl">
                No profiles pending approval. Good job!
              </div>
            )}
          </div>

          {/* HOROSCOPE VERIFICATIONS QUEUE */}
          <div className="lg:col-span-4 flex flex-col bg-card border border-border rounded-2xl shadow-lg p-5 md:p-6 gap-6">
            <div className="flex flex-col border-b border-border pb-4">
              <h2 className="text-lg font-serif font-bold text-foreground">Horoscope Queue</h2>
              <span className="text-xs text-muted">Verify uploaded PDFs &amp; images</span>
            </div>

            {pendingHoroscopes.length > 0 ? (
              <div className="flex flex-col gap-4">
                {pendingHoroscopes.map((horo) => (
                  <div 
                    key={horo.id}
                    className="p-4 rounded-xl bg-surface/60 border border-border flex flex-col gap-3.5 hover:border-muted/30 transition-colors text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">{horo.name}</span>
                      <span className="text-[10px] text-muted font-mono">{horo.rasi} • {horo.star} • {horo.date}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                      <a 
                        href={horo.url}
                        className="text-[10px] font-mono text-primary hover:underline uppercase tracking-wider"
                      >
                        [View Upload]
                      </a>
                      <button
                        onClick={() => handleVerifyHoroscope(horo.id, horo.name)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface hover:bg-background border border-border text-[10px] font-bold text-primary uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted font-mono text-xs border border-dashed border-border rounded-xl my-auto">
                No uploads pending verification.
              </div>
            )}
          </div>

        </div>

        {/* TRANSACTIONS & ANALYTICS SUMMARY */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-5 md:p-6 flex flex-col gap-4">
          <div className="flex flex-col text-left">
            <h2 className="text-lg font-serif font-bold text-foreground">Recent Transactions</h2>
            <span className="text-xs text-muted">Revenue analytics and subscription completions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono text-left">
              <thead>
                <tr className="text-muted border-b border-border pb-2">
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider">Transaction ID</th>
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider">User</th>
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider">Plan</th>
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider">Date</th>
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider">Amount</th>
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((txn, idx) => (
                  <tr key={idx} className="text-foreground/80 hover:bg-surface/40">
                    <td className="py-3">{txn.id}</td>
                    <td className="py-3 font-semibold text-foreground">{txn.user}</td>
                    <td className="py-3 text-primary font-bold">{txn.plan}</td>
                    <td className="py-3">{txn.date}</td>
                    <td className="py-3 text-foreground font-semibold">{txn.amount}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-success/10 text-success rounded-full border border-success/20">
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

    </div>
  );
}
