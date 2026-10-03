'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, CreditCard, 
  AlertTriangle, Users, Calendar, 
  RefreshCw, BarChart2, ShieldCheck, Download
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    activeSubscriptions: 0,
    failedPayments: 0,
    premiumUsers: 0,
    mrr: 0
  });

  const [charts, setCharts] = useState<any>({
    revenueChartData: [],
    growthChartData: [],
    planDistributionData: []
  });

  // State for interactive tooltip positions
  const [revHoverIdx, setRevHoverIdx] = useState<number | null>(null);
  const [growHoverIdx, setGrowHoverIdx] = useState<number | null>(null);
  const [donutHoverIdx, setDonutHoverIdx] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<'30days' | '7days' | 'all'>('30days');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminService.getMonetizationStats();
      if (res.data) {
        setStats(res.data.stats);
        setCharts(res.data.charts);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 animate-pulse text-left">
        <div className="h-10 w-64 bg-card rounded-lg mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-2xl border border-border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[350px] bg-card rounded-2xl border border-border" />
          <div className="h-[350px] bg-card rounded-2xl border border-border" />
        </div>
        <div className="h-80 bg-card rounded-2xl border border-border" />
      </div>
    );
  }

  // --- SVG Area Chart Math: Revenue Trend ---
  const revData = charts.revenueChartData || [];
  const maxRev = Math.max(...revData.map((d: any) => d.amount), 1000);
  const chartW = 500;
  const chartH = 220;
  const paddingX = 40;
  const paddingY = 20;

  // Generate points for the path
  const revPoints = revData.map((d: any, i: number) => {
    const x = paddingX + (i / (revData.length - 1)) * (chartW - paddingX * 2);
    const y = chartH - paddingY - (d.amount / maxRev) * (chartH - paddingY * 2);
    return { x, y, amount: d.amount, date: d.date };
  });

  const revPath = revPoints.length > 0 
    ? `M ${revPoints[0].x} ${revPoints[0].y} ` + revPoints.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const revAreaPath = revPoints.length > 0 
    ? `${revPath} L ${revPoints[revPoints.length - 1].x} ${chartH - paddingY} L ${revPoints[0].x} ${chartH - paddingY} Z`
    : '';

  // --- SVG Line Chart Math: Subscription Growth ---
  const growData = charts.growthChartData || [];
  const maxGrow = Math.max(...growData.map((d: any) => d.activeSubscribers), 10);
  const growPoints = growData.map((d: any, i: number) => {
    const x = paddingX + (i / (growData.length - 1)) * (chartW - paddingX * 2);
    const y = chartH - paddingY - (d.activeSubscribers / maxGrow) * (chartH - paddingY * 2);
    return { x, y, val: d.activeSubscribers, date: d.date };
  });

  const growPath = growPoints.length > 0 
    ? `M ${growPoints[0].x} ${growPoints[0].y} ` + growPoints.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // --- SVG Donut Chart Math: Plan Split ---
  const donutData = charts.planDistributionData || [];
  const totalPlansCount = donutData.reduce((acc: number, d: any) => acc + d.value, 0);
  
  let accumulatedAngle = 0;
  const donutCenter = 100;
  const donutRadius = 60;
  const donutStrokeW = 16;
  const donutCirc = 2 * Math.PI * donutRadius;

  const donutSlices = donutData.map((d: any, idx: number) => {
    const percentage = totalPlansCount > 0 ? d.value / totalPlansCount : 0;
    const strokeDash = percentage * donutCirc;
    const strokeOffset = donutCirc - strokeDash + accumulatedAngle;
    accumulatedAngle -= strokeDash;

    const colors = [
      'stroke-muted', // Silver / Muted
      'stroke-primary', // Gold / Primary
      'stroke-secondary', // Diamond / Red
    ];
    const hoverColors = [
      'hover:stroke-muted/80',
      'hover:stroke-primary/80',
      'hover:stroke-secondary/80',
    ];
    const fillColors = [
      'bg-muted',
      'bg-primary',
      'bg-secondary'
    ];

    return {
      ...d,
      strokeDash,
      strokeOffset,
      color: colors[idx % colors.length],
      hoverColor: hoverColors[idx % hoverColors.length],
      fillColor: fillColors[idx % fillColors.length],
      percentage: Math.round(percentage * 100)
    };
  });

  const handleExportCSV = () => {
    const headers = ['Date', 'Revenue_INR', 'Active_Subscribers'];
    const rows = revData.map((d: any, idx: number) => [
      d.date,
      d.amount,
      growData[idx]?.activeSubscribers || 0
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gokul_vivaham_revenue_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 text-left bg-background text-foreground transition-colors duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="h-7 w-7 text-primary" />
            Monetization &amp; Analytics
          </h1>
          <p className="text-xs text-muted font-mono uppercase tracking-wider">
            Realtime tracking of Platform Revenue, MRR and Subscription KPIs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-background border border-border hover:border-primary/20 rounded-xl text-xs font-mono font-medium text-foreground transition-all cursor-pointer"
            title="Refresh System Analytics"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-secondary hover:bg-secondary-foreground hover:text-secondary text-secondary-foreground border border-secondary rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
            title="Export csv document"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Revenue */}
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start mb-2 z-10">
            <span className="text-[10px] text-muted font-mono font-bold uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col text-left z-10">
            <span className="text-xl md:text-2xl font-mono font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-medium flex items-center gap-0.5 mt-1.5">
              <TrendingUp className="h-3 w-3" /> +14.2% <span className="text-muted font-mono text-[9px]">(30d)</span>
            </span>
          </div>
        </div>

        {/* Card 2: MRR */}
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start mb-2 z-10">
            <span className="text-[10px] text-muted font-mono font-bold uppercase tracking-wider">Monthly Recurring (MRR)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-450">
              <Calendar className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col text-left z-10">
            <span className="text-xl md:text-2xl font-mono font-bold text-foreground">₹{stats.mrr.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-medium flex items-center gap-0.5 mt-1.5">
              <TrendingUp className="h-3 w-3" /> +8.6% <span className="text-muted font-mono text-[9px]">(Active subs)</span>
            </span>
          </div>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start mb-2 z-10">
            <span className="text-[10px] text-muted font-mono font-bold uppercase tracking-wider">Active Subs</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col text-left z-10">
            <span className="text-xl md:text-2xl font-mono font-bold text-foreground">{stats.activeSubscriptions}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-medium flex items-center gap-0.5 mt-1.5">
              <TrendingUp className="h-3 w-3" /> +12.3% <span className="text-muted font-mono text-[9px]">(vs last week)</span>
            </span>
          </div>
        </div>

        {/* Card 4: Failed Payments */}
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start mb-2 z-10">
            <span className="text-[10px] text-muted font-mono font-bold uppercase tracking-wider">Failed Payments</span>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col text-left z-10">
            <span className={`text-xl md:text-2xl font-mono font-bold ${stats.failedPayments > 5 ? 'text-destructive' : 'text-foreground'}`}>
              {stats.failedPayments}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-medium flex items-center gap-0.5 mt-1.5">
              <TrendingUp className="h-3 w-3" /> -4.1% <span className="text-muted font-mono text-[9px]">(decreased)</span>
            </span>
          </div>
        </div>

        {/* Card 5: Premium Users */}
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start mb-2 z-10">
            <span className="text-[10px] text-muted font-mono font-bold uppercase tracking-wider">Premium Users</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col text-left z-10">
            <span className="text-xl md:text-2xl font-mono font-bold text-foreground">{stats.premiumUsers}</span>
            <span className="text-[10px] text-muted font-medium flex items-center gap-0.5 mt-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary animate-pulse" /> Verified Accounts
            </span>
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* REVENUE TREND AREA CHART */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 md:p-6 shadow-lg flex flex-col gap-4 relative">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div className="flex flex-col text-left">
              <h2 className="text-base font-serif font-bold text-foreground">Daily Revenue Trend</h2>
              <span className="text-[10px] text-muted font-mono">Invoice completed transaction values in INR</span>
            </div>
            
            {/* Timeframe Selectors */}
            <div className="flex bg-surface p-1 rounded-lg border border-border text-[10px] font-mono select-none">
              <button 
                onClick={() => setTimeframe('30days')}
                className={`px-2.5 py-1 rounded cursor-pointer ${timeframe === '30days' ? 'bg-primary/10 text-primary font-bold' : 'text-muted hover:text-foreground'}`}
              >
                30D
              </button>
              <button 
                onClick={() => setTimeframe('7days')}
                className={`px-2.5 py-1 rounded cursor-pointer ${timeframe === '7days' ? 'bg-primary/10 text-primary font-bold' : 'text-muted hover:text-foreground'}`}
              >
                7D
              </button>
            </div>
          </div>

          {/* SVG AREA CHART DRAWING */}
          <div className="w-full relative h-[230px] mt-2 select-none">
            {revPoints.length > 0 ? (
              <svg 
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-full overflow-visible"
                onMouseLeave={() => setRevHoverIdx(null)}
                onMouseMove={(e) => {
                  const svg = e.currentTarget;
                  const rect = svg.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const relativeX = (mouseX / rect.width) * chartW;
                  const stepWidth = (chartW - paddingX * 2) / (revPoints.length - 1);
                  const approxIdx = Math.round((relativeX - paddingX) / stepWidth);
                  const validIdx = Math.max(0, Math.min(revPoints.length - 1, approxIdx));
                  setRevHoverIdx(validIdx);
                }}
              >
                <defs>
                  {/* Glowing line shadow filter */}
                  <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="var(--primary)" floodOpacity="0.25" />
                  </filter>
                  {/* Fill gradient */}
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = paddingY + ratio * (chartH - paddingY * 2);
                  return (
                    <line 
                      key={index} 
                      x1={paddingX} 
                      y1={y} 
                      x2={chartW - paddingX} 
                      y2={y} 
                      className="stroke-border" 
                      strokeDasharray="4 4" 
                    />
                  );
                })}

                {/* Y Axis Labels (Left Side) */}
                <text x={paddingX - 10} y={paddingY + 4} className="fill-muted font-mono text-[9px] text-right font-bold" textAnchor="end">
                  ₹{Math.round(maxRev / 1000)}K
                </text>
                <text x={paddingX - 10} y={chartH - paddingY + 2} className="fill-muted font-mono text-[9px] text-right font-bold" textAnchor="end">
                  0
                </text>

                {/* Fill Area */}
                <path d={revAreaPath} fill="url(#areaGradient)" />

                {/* Glowing Outline Path */}
                <path 
                  d={revPath} 
                  fill="none" 
                  stroke="var(--primary)"
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  filter="url(#glow)"
                />

                {/* Hover line and dot */}
                {revHoverIdx !== null && revPoints[revHoverIdx] && (
                  <>
                    <line 
                      x1={revPoints[revHoverIdx].x} 
                      y1={paddingY} 
                      x2={revPoints[revHoverIdx].x} 
                      y2={chartH - paddingY} 
                      className="stroke-primary/25" 
                      strokeWidth="1.5"
                    />
                    <circle 
                      cx={revPoints[revHoverIdx].x} 
                      cy={revPoints[revHoverIdx].y} 
                      r="5.5" 
                      className="fill-background stroke-primary" 
                      strokeWidth="2.5" 
                    />
                  </>
                )}

                {/* X Axis Labels */}
                {revPoints.filter((_: any, idx: number) => idx % Math.ceil(revPoints.length / 5) === 0).map((pt: any, i: number) => (
                  <text 
                    key={i} 
                    x={pt.x} 
                    y={chartH - 4} 
                    className="fill-muted font-mono text-[8px] text-center" 
                    textAnchor="middle"
                  >
                    {pt.date}
                  </text>
                ))}
              </svg>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted font-mono border border-dashed border-border rounded-xl">
                No revenue trend data available.
              </div>
            )}

            {/* Custom Tooltip Card Overlay */}
            <AnimatePresence>
              {revHoverIdx !== null && revPoints[revHoverIdx] && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bg-card border border-border p-2.5 rounded-xl shadow-xl flex flex-col font-mono text-[10px] pointer-events-none gap-0.5 z-20 text-foreground"
                  style={{
                    left: `${(revPoints[revHoverIdx].x / chartW) * 100}%`,
                    top: '15px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <span className="text-muted font-bold">{revPoints[revHoverIdx].date}</span>
                  <span className="text-foreground font-bold text-xs">Revenue: ₹{revPoints[revHoverIdx].amount.toLocaleString()}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PLANS DISTRIBUTION DONUT CHART */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-lg flex flex-col gap-4">
          <div className="flex flex-col text-left border-b border-border pb-3">
            <h2 className="text-base font-serif font-bold text-foreground">Plan Market Share</h2>
            <span className="text-[10px] text-muted font-mono">Current volume ratio of active plans</span>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 py-4 gap-6 relative select-none">
            {totalPlansCount > 0 ? (
              <div className="relative flex items-center justify-center w-full h-[140px]">
                <svg viewBox="0 0 200 200" className="w-[140px] h-[140px] transform -rotate-90 overflow-visible">
                  {donutSlices.map((slice: any, idx: number) => (
                    <circle
                      key={idx}
                      cx={donutCenter}
                      cy={donutCenter}
                      r={donutRadius}
                      fill="transparent"
                      className={`transition-all duration-300 ${slice.color} ${slice.hoverColor}`}
                      strokeWidth={donutStrokeW}
                      strokeDasharray={donutCirc}
                      strokeDashoffset={slice.strokeOffset}
                      strokeLinecap="round"
                      onMouseEnter={() => setDonutHoverIdx(idx)}
                      onMouseLeave={() => setDonutHoverIdx(null)}
                    />
                  ))}
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute flex flex-col items-center justify-center font-mono">
                  {donutHoverIdx !== null && donutSlices[donutHoverIdx] ? (
                    <>
                      <span className="text-2xl font-black text-foreground">{donutSlices[donutHoverIdx].percentage}%</span>
                      <span className="text-[8px] text-muted uppercase tracking-widest font-bold">
                        {donutSlices[donutHoverIdx].name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-primary">{totalPlansCount}</span>
                      <span className="text-[8px] text-muted uppercase tracking-widest font-bold">
                        Active Subs
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-36 w-full items-center justify-center text-xs text-muted font-mono border border-dashed border-border rounded-xl">
                No active plan distribution data.
              </div>
            )}

            {/* Plan Legends */}
            <div className="grid grid-cols-3 w-full gap-3 text-left">
              {donutSlices.map((slice: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`flex flex-col p-2 bg-surface rounded-xl border border-border hover:border-primary/30 transition-colors ${
                    donutHoverIdx === idx ? 'border-primary/50' : ''
                  }`}
                  onMouseEnter={() => setDonutHoverIdx(idx)}
                  onMouseLeave={() => setDonutHoverIdx(null)}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-ellipsis overflow-hidden">
                    <span className={`w-2 h-2 rounded-full ${slice.fillColor} shrink-0`} />
                    <span className="text-[9px] font-mono text-muted truncate">{slice.name}</span>
                  </div>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-xs font-bold text-foreground">{slice.value}</span>
                    <span className="text-[8px] text-muted">{slice.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* SUBSCRIPTION GROWTH LINE CHART */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-lg flex flex-col gap-4">
        
        <div className="flex flex-col text-left border-b border-border pb-3">
          <h2 className="text-base font-serif font-bold text-foreground">Active Subscriber Growth</h2>
          <span className="text-[10px] text-muted font-mono">Cumulative count of active users with paid plans</span>
        </div>

        {/* SVG LINE CHART DRAWING */}
        <div className="w-full relative h-[220px] mt-2 select-none">
          {growPoints.length > 0 ? (
            <svg 
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-full overflow-visible"
              onMouseLeave={() => setGrowHoverIdx(null)}
              onMouseMove={(e) => {
                const svg = e.currentTarget;
                const rect = svg.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const relativeX = (mouseX / rect.width) * chartW;
                const stepWidth = (chartW - paddingX * 2) / (growPoints.length - 1);
                const approxIdx = Math.round((relativeX - paddingX) / stepWidth);
                const validIdx = Math.max(0, Math.min(growPoints.length - 1, approxIdx));
                setGrowHoverIdx(validIdx);
              }}
            >
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = paddingY + ratio * (chartH - paddingY * 2);
                return (
                  <line 
                    key={index} 
                    x1={paddingX} 
                    y1={y} 
                    x2={chartW - paddingX} 
                    y2={y} 
                    className="stroke-border" 
                    strokeDasharray="4 4" 
                  />
                );
              })}

              {/* Y Axis Labels */}
              <text x={paddingX - 10} y={paddingY + 4} className="fill-muted font-mono text-[9px] text-right font-bold" textAnchor="end">
                {maxGrow}
              </text>
              <text x={paddingX - 10} y={chartH - paddingY + 2} className="fill-muted font-mono text-[9px] text-right font-bold" textAnchor="end">
                0
              </text>

              {/* Outline Path */}
              <path 
                d={growPath} 
                fill="none" 
                stroke="var(--secondary)" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                filter="url(#glow)" 
              />

              {/* Hover line and dot */}
              {growHoverIdx !== null && growPoints[growHoverIdx] && (
                <>
                  <line 
                    x1={growPoints[growHoverIdx].x} 
                    y1={paddingY} 
                    x2={growPoints[growHoverIdx].x} 
                    y2={chartH - paddingY} 
                    className="stroke-secondary/25" 
                    strokeWidth="1.5"
                  />
                  <circle 
                    cx={growPoints[growHoverIdx].x} 
                    cy={growPoints[growHoverIdx].y} 
                    r="5.5" 
                    className="fill-background stroke-secondary" 
                    strokeWidth="2.5" 
                  />
                </>
              )}

              {/* X Axis Labels */}
              {growPoints.filter((_: any, idx: number) => idx % Math.ceil(growPoints.length / 5) === 0).map((pt: any, i: number) => (
                <text 
                  key={i} 
                  x={pt.x} 
                  y={chartH - 4} 
                  className="fill-muted font-mono text-[8px] text-center" 
                  textAnchor="middle"
                >
                  {pt.date}
                </text>
              ))}
            </svg>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted font-mono border border-dashed border-border rounded-xl">
              No subscription growth data available.
            </div>
          )}

          {/* Tooltip Overlay */}
          <AnimatePresence>
            {growHoverIdx !== null && growPoints[growHoverIdx] && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute bg-card border border-border p-2.5 rounded-xl shadow-xl flex flex-col font-mono text-[10px] pointer-events-none gap-0.5 z-20 text-foreground"
                style={{
                  left: `${(growPoints[growHoverIdx].x / chartW) * 100}%`,
                  top: '15px',
                  transform: 'translateX(-50%)'
                }}
              >
                <span className="text-muted font-bold">{growPoints[growHoverIdx].date}</span>
                <span className="text-foreground font-bold text-xs">Active Subscribers: {growPoints[growHoverIdx].val}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
