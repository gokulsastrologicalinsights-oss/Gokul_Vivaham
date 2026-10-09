'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { 
  CreditCard, DollarSign, Search, Filter, Calendar, 
  ShieldAlert, Check, X, Clock, ArrowUpRight, 
  Activity, User, Plus, RefreshCw, AlertTriangle, Eye, HelpCircle
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminSubscriptionsPage() {
  redirect('/admin/membership?tab=subscriptions');
  const [activeTab, setActiveTab] = useState<'payments' | 'subscriptions'>('payments');
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Modals state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'details' | 'extend' | 'cancel' | 'refund' | null>(null);
  const [extendDays, setExtendDays] = useState<number>(30);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'payments') {
        const res = await adminService.getPaymentLogs();
        if (res.data) setPayments(res.data);
      } else {
        const res = await adminService.getSubscriptionLogs();
        if (res.data) setSubscriptions(res.data);
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Actions handlers
  const handleExtendSubscription = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const res = await adminService.extendSubscriptionAdmin(selectedItem.id, extendDays);
      if (res.success) {
        alert(`Successfully extended subscription for ${selectedItem.user_name} by ${extendDays} days.`);
        setModalType(null);
        fetchData();
      } else {
        alert(`Failed to extend subscription: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const res = await adminService.cancelSubscriptionAdmin(selectedItem.id);
      if (res.success) {
        alert(`Successfully cancelled subscription for ${selectedItem.user_name}.`);
        setModalType(null);
        fetchData();
      } else {
        alert(`Failed to cancel: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const res = await adminService.refundPaymentAdmin(selectedItem.id);
      if (res.success) {
        alert(`Refund processed. Payment status changed to Failed/Refunded.`);
        setModalType(null);
        fetchData();
      } else {
        alert(`Failed to process refund: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter lists
  const filteredPayments = payments.filter((p: any) => {
    const matchesSearch = 
      p.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.payment_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredSubscriptions = subscriptions.filter((s: any) => {
    const matchesSearch = 
      s.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.razorpay_subscription_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan = 
      planFilter === 'all' || 
      s.plan_name.toLowerCase().includes(planFilter.toLowerCase()) ||
      (planFilter === 'diamond' && s.plan_name.toLowerCase().includes('platinum'));
    
    // Status mapping check
    const now = new Date();
    const isActive = s.payment_status === 'Completed' && new Date(s.end_date) > now;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'expired' && !isActive && s.payment_status === 'Expired') ||
      (statusFilter === 'failed' && s.payment_status === 'Failed');

    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-primary" />
            Billing &amp; Subscriptions
          </h1>
          <p className="text-xs text-muted font-mono uppercase tracking-wider">
            Monitor invoices, verify gateway callbacks, and manage member billing accounts
          </p>
        </div>

        <button 
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-background border border-border rounded-xl text-xs font-mono font-medium text-foreground transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-border gap-6 text-sm font-mono tracking-wider">
        <button
          onClick={() => {
            setActiveTab('payments');
            setSearchTerm('');
            setStatusFilter('all');
            setTypeFilter('all');
            setPlanFilter('all');
          }}
          className={`pb-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'payments' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <DollarSign className="h-4.5 w-4.5" />
          PAYMENT TRANSACTIONS ({payments.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('subscriptions');
            setSearchTerm('');
            setStatusFilter('all');
            setTypeFilter('all');
            setPlanFilter('all');
          }}
          className={`pb-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'subscriptions' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <Activity className="h-4.5 w-4.5" />
          USER SUBSCRIPTIONS ({subscriptions.length})
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-card p-4 rounded-2xl border border-border">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder={activeTab === 'payments' ? "Search transactions by user, email, payment ID..." : "Search subscriptions by user, email, subscription ID..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-muted text-foreground font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted" />
            <span className="text-[10px] font-mono text-muted uppercase font-bold tracking-wider">Status:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {activeTab === 'payments' ? (
              <>
                <option value="completed">Completed Only</option>
                <option value="failed">Failed Only</option>
                <option value="pending">Pending Only</option>
              </>
            ) : (
              <>
                <option value="active">Active Only</option>
                <option value="expired">Expired Only</option>
                <option value="failed">Failed Logs Only</option>
              </>
            )}
          </select>

          {/* Tab Specific Filter */}
          {activeTab === 'payments' ? (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All Payment Types</option>
              <option value="subscription">Subscription Packages</option>
              <option value="featured_profile">Profile Boosting</option>
              <option value="consultation">Astrologer Bookings</option>
            </select>
          ) : (
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="silver">Silver Tier</option>
              <option value="gold">Gold Tier</option>
              <option value="diamond">Diamond Tier</option>
            </select>
          )}

        </div>
      </div>

      {/* DATA TABLES */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted font-mono text-xs">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Synchronizing data index...
          </div>
        ) : activeTab === 'payments' ? (
          
          /* PAYMENTS TABLE */
          filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-surface border-b border-border text-muted font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Member Name</th>
                    <th className="px-6 py-4">Billing Email</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Gateway IDs</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card/40">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-surface/50 text-foreground/90">
                      <td className="px-6 py-4 font-bold text-foreground">{p.id}</td>
                      <td className="px-6 py-4 font-bold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted" />
                        {p.user_name}
                      </td>
                      <td className="px-6 py-4">{p.user_email}</td>
                      <td className="px-6 py-4 text-foreground flex flex-col justify-center min-h-[44px]">
                        <span className="font-bold">₹{p.amount.toLocaleString('en-IN')}</span>
                        {p.amount > 0 && (p.payment_type === 'subscription' || p.payment_type === 'contact_unlock' || p.payment_type === 'consultation') && (() => {
                          const amt = p.amount;
                          
                          return (
                            <span className="text-[10px] text-muted/80 font-light mt-0.5 leading-none">
                              Recorded service payment
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${
                          p.payment_type === 'subscription' 
                            ? 'bg-brand-gold/10 text-foreground dark:text-brand-gold border-brand-gold/20' 
                            : p.payment_type === 'featured_profile'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-secondary/10 text-secondary border-secondary/20'
                        }`}>
                          {p.payment_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted/80">{new Date(p.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-[10px] text-muted flex flex-col gap-0.5">
                        <span className="truncate max-w-[150px]">Order: {p.razorpay_order_id}</span>
                        <span className="truncate max-w-[150px]">Pay: {p.razorpay_payment_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit uppercase ${
                          p.status === 'completed' 
                            ? 'bg-success/10 text-success border-success/20 shadow-[0_0_8px_rgba(16,185,129,0.05)]' 
                            : p.status === 'failed'
                            ? 'bg-destructive/10 text-destructive border-destructive/20 shadow-[0_0_8px_rgba(239,68,68,0.05)]'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}>
                          {p.status === 'completed' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setSelectedItem(p); setModalType('details'); }}
                            className="p-1.5 bg-background hover:bg-surface border border-border hover:border-muted text-muted hover:text-foreground rounded-lg cursor-pointer"
                            title="Inspect gateway callback logs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {p.status === 'completed' && (
                            <button 
                              onClick={() => { setSelectedItem(p); setModalType('refund'); }}
                              className="px-2.5 h-7 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive rounded-lg font-bold text-[10px] uppercase cursor-pointer"
                              title="Provider refunds are not configured" disabled
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-muted font-mono text-xs">
              No matching payment logs found.
            </div>
          )
        ) : (
          
          /* SUBSCRIPTIONS TABLE */
          filteredSubscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-surface border-b border-border text-muted font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Subscription ID</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Plan Package</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Validity Range</th>
                    <th className="px-6 py-4">Days Left</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card/40">
                  {filteredSubscriptions.map((s) => {
                    const now = new Date();
                    const end = new Date(s.end_date);
                    const diffTime = end.getTime() - now.getTime();
                    const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    
                    const isActive = s.payment_status === 'Completed' && end > now;
                    const subStatusText = isActive ? 'Active' : s.payment_status === 'Failed' ? 'Failed' : 'Expired';

                    return (
                      <tr key={s.id} className="hover:bg-surface/50 text-foreground/90">
                        <td className="px-6 py-4 font-bold text-foreground">{s.id}</td>
                        <td className="px-6 py-4 font-bold text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted" />
                          {s.user_name}
                        </td>
                        <td className="px-6 py-4">{s.user_email}</td>
                        <td className="px-6 py-4 text-foreground font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${
                            (s.plan_name.toLowerCase().includes('diamond') || s.plan_name.toLowerCase().includes('platinum'))
                              ? 'bg-brand-red/10 text-brand-red border-brand-red/20'
                              : s.plan_name.toLowerCase().includes('gold')
                              ? 'bg-brand-gold/10 text-foreground dark:text-brand-gold border-brand-gold/20'
                              : 'bg-surface text-muted border-border'
                          }`}>
                            {s.plan_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-foreground flex flex-col justify-center min-h-[44px]">
                          <span className="font-bold">₹{s.plan_price.toLocaleString('en-IN')}</span>
                          {s.plan_price > 0 && (() => {
                            const amt = s.plan_price;
                            
                            return (
                              <span className="text-[10px] text-muted/80 font-light mt-0.5 leading-none">
                                Recorded service payment
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-[10px] text-muted flex flex-col gap-0.5">
                          <span>Start: {new Date(s.start_date).toLocaleDateString()}</span>
                          <span>End: {new Date(s.end_date).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4 font-bold">
                          {isActive ? (
                            <span className={remainingDays < 15 ? 'text-warning' : 'text-success'}>
                              {remainingDays} days
                            </span>
                          ) : (
                            <span className="text-muted">0 days</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit uppercase ${
                            subStatusText === 'Active' 
                              ? 'bg-success/10 text-success border-success/20' 
                              : subStatusText === 'Expired'
                              ? 'bg-surface text-muted border-border'
                              : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {subStatusText === 'Active' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {subStatusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => { setSelectedItem(s); setModalType('details'); }}
                              className="p-1.5 bg-background hover:bg-surface border border-border hover:border-muted text-muted hover:text-foreground rounded-lg cursor-pointer"
                              title="Inspect callback logs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {isActive && (
                              <>
                                <button 
                                  onClick={() => { setSelectedItem(s); setModalType('extend'); }}
                                  className="px-2 h-7 bg-background hover:bg-surface border border-border hover:border-muted text-primary rounded-lg font-bold text-[10px] uppercase cursor-pointer"
                                  title="Add extra validation days"
                                >
                                  Extend
                                </button>
                                <button 
                                  onClick={() => { setSelectedItem(s); setModalType('cancel'); }}
                                  className="px-2 h-7 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive rounded-lg font-bold text-[10px] uppercase cursor-pointer"
                                  title="Revoke subscription access"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-muted font-mono text-xs">
              No matching user subscriptions found.
            </div>
          )
        )}
      </div>

      {/* =============================================================== */}
      {/* MODAL DIALOGS - DETAILS, REFUNDS, EXTENSIONS, CANCELLATIONS */}
      {/* =============================================================== */}
      <AnimatePresence>
        {modalType && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={() => setModalType(null)} />

            {/* Modal Body */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col text-left"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border bg-surface flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase">
                  {modalType === 'details' ? 'GATEWAY LOG DETAILS' : 
                   modalType === 'extend' ? 'MANUAL BILLING EXTENSION' : 
                   modalType === 'cancel' ? 'REVOKE SUBSCRIPTION' : 'REFUND TRANSACTION'}
                </span>
                <button 
                  onClick={() => setModalType(null)}
                  className="p-1 rounded bg-background hover:bg-surface text-muted cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[350px]">
                
                {/* Details Tab */}
                {modalType === 'details' && (
                  <div className="flex flex-col gap-4 font-mono text-[10px]">
                    <div className="p-3 bg-background rounded-lg border border-border text-muted leading-relaxed max-w-full overflow-x-auto select-all">
                      <pre>{JSON.stringify(selectedItem, null, 2)}</pre>
                    </div>
                    <div className="flex items-start gap-2 text-muted leading-normal">
                      <HelpCircle className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                      <span>Use this JSON payload to match metadata parameters with Razorpay Merchant Dashboard for dispute settlements.</span>
                    </div>
                  </div>
                )}

                {/* Extend Tab */}
                {modalType === 'extend' && (
                  <div className="flex flex-col gap-4 font-mono">
                    <p className="text-xs text-muted leading-relaxed">
                      You are manually extending premium membership access for <strong className="text-foreground">{selectedItem.user_name}</strong>. This adds time to their current plan (<strong className="text-primary">{selectedItem.plan_name}</strong>).
                    </p>
                    
                    <div className="flex flex-col gap-1.5 mt-2">
                      <label className="text-[10px] text-muted font-bold uppercase tracking-wider">Extension Duration:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[30, 90, 180].map((days) => (
                          <button
                            key={days}
                            onClick={() => setExtendDays(days)}
                            className={`h-11 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              extendDays === days 
                                ? 'bg-primary/10 text-primary border-primary/35 font-bold' 
                                : 'bg-background border-border hover:border-muted text-muted'
                            }`}
                          >
                            +{days} Days
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel Tab */}
                {modalType === 'cancel' && (
                  <div className="flex flex-col gap-4 font-mono text-xs">
                    <div className="flex gap-3 p-4.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive leading-relaxed">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <strong>WARNING:</strong> This will instantly terminate <strong className="text-foreground">{selectedItem.user_name}&apos;s</strong> premium features, mark their plan status as <strong>Expired</strong>, and revoke chat/contact viewing limits.
                      </div>
                    </div>
                    <p className="text-muted">
                      This action does not trigger automated bank refunds. Provider-confirmed refunds must be handled through Razorpay and reconciled separately.
                    </p>
                  </div>
                )}

                {/* Refund Tab */}
                {modalType === 'refund' && (
                  <div className="flex flex-col gap-4 font-mono text-xs">
                    <div className="flex gap-3 p-4.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive leading-relaxed">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <strong>REFUNDS UNAVAILABLE:</strong> Provider confirmation is required for the payment of <strong>₹{selectedItem.amount}</strong> for <strong className="text-foreground">{selectedItem.user_name}</strong>.
                      </div>
                    </div>
                    <p className="text-muted">
                      Provider-confirmed refunds are not configured. No money will be returned and no payment or subscription record will be changed by this panel.
                    </p>
                  </div>
                )}

              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4.5 bg-surface border-t border-border flex justify-end gap-3">
                <button 
                  onClick={() => setModalType(null)}
                  className="h-10 px-4 bg-background hover:bg-surface border border-border hover:border-muted text-xs font-mono font-bold rounded-xl text-muted cursor-pointer"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                {modalType !== 'details' && modalType !== 'refund' && (
                  <button 
                    onClick={
                      modalType === 'extend' ? handleExtendSubscription : 
                      modalType === 'cancel' ? handleCancelSubscription : handleRefundPayment
                    }
                    className={`h-10 px-5 text-xs font-mono font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalType === 'extend' ? 'bg-brand-gold hover:brightness-110 text-black' : 'bg-brand-red hover:bg-brand-red-light text-white'
                    }`}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {modalType === 'extend' ? <Plus className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        Confirm Action
                      </>
                    )}
                  </button>
                )}
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
