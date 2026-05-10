/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import miladBg from './assets/milad_bg.png';
import logoImg from './assets/logo.png';

import { 
  Building2, 
  Plus, 
  LayoutDashboard, 
  ListOrdered, 
  PieChart as PieChartIcon, 
  Download, 
  Search,
  Filter,
  AlertCircle,
  PlusCircle,
  TrendingUp,
  HandCoins,
  History,
  Info,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { VendorDonation, PaymentMethod } from './types';

// Components
const StatCard = ({ title, value, icon: Icon, color, subtitle, progress }: { 
  title: string, 
  value: string | number, 
  icon: any, 
  color: string,
  subtitle?: string,
  progress?: number
}) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-blue-50 flex flex-col justify-between">
    <div>
      <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-4xl font-black text-blue-900 mt-1">{value}</h3>
    </div>
    {progress !== undefined && (
      <div className="mt-4">
        <div className="w-full bg-blue-50 h-3 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-xs mt-2 text-blue-500 font-medium">{subtitle}</p>
      </div>
    )}
    {progress === undefined && subtitle && (
      <p className="text-xs mt-4 text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded w-fit">
        {subtitle}
      </p>
    )}
  </div>
);

export default function App() {
  const [donations, setDonations] = useState<VendorDonation[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'report'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Pledge' | 'Confirmed' | 'Received' | 'All'>('All');
  const [editingDonation, setEditingDonation] = useState<VendorDonation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goal = 500000000; // IDR 500 million goal for example

  // Initial load
  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setError(null);
      const res = await fetch('/api/donations');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      if (Array.isArray(data)) {
        setDonations(data);
      }
    } catch (e: any) {
      console.error("Failed to fetch donations", e);
      setError(e.message);
    }
  };

  const handleAddDonation = async (data: Omit<VendorDonation, 'date' | 'status'>) => {
    try {
      const newDonation: any = {
        ...data,
        id: data.id || crypto.randomUUID(),
        date: new Date().toISOString(),
      };

      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDonation),
      });

      if (res.ok) {
        fetchDonations();
        setEditingDonation(null);
        setIsFormOpen(false);
      }
    } catch (e) {
      console.error("Failed to save donation", e);
    }
  };

  const deleteDonation = async (id: string) => {
    if (confirm('Review again? are you sure you want to delete this donation?')) {
      try {
        const res = await fetch(`/api/donations/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchDonations();
        }
      } catch (e) {
        console.error("Failed to delete donation", e);
      }
    }
  };

  const editDonation = (donation: VendorDonation) => {
    setEditingDonation(donation);
    setIsFormOpen(true);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(donations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donasi_milad_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const nextId = useMemo(() => {
    if (donations.length === 0) return "1";
    const ids = donations.map(d => parseInt(d.id)).filter(id => !isNaN(id));
    if (ids.length === 0) return "1";
    return (Math.max(...ids) + 1).toString();
  }, [donations]);

  const summary = useMemo(() => {
    const totalPledged = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalReceived = donations
      .filter(d => d.paymentMethod !== '')
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalTarget = donations.reduce((sum, d) => sum + (d.targetAmount || 0), 0);
    
    return {
      totalPledged,
      totalReceived,
      totalTarget,
      vendorCount: donations.length,
      progress: totalTarget > 0 ? (totalReceived / totalTarget) * 100 : 0
    };
  }, [donations]);

  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const vendorName = d.vendorName || '';
      const description = d.description || '';
      const matchesSearch = vendorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [donations, searchTerm, statusFilter]);

  return (
    <div className="min-h-screen flex bg-[#f8fbfe] relative overflow-hidden font-sans text-slate-900">
      {/* Structural Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e3a8a 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 opacity-[0.12] pointer-events-none bg-no-repeat bg-[length:auto_70%] bg-right-bottom mix-blend-multiply z-0"
        style={{ backgroundImage: `url(${miladBg})` }}
      />

      {/* Sidebar */}
      <aside className="w-72 bg-blue-900 flex flex-col p-8 text-white shrink-0 hidden md:flex relative z-10">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg shadow-blue-900/20 overflow-hidden group">
            <img 
              src={logoImg} 
              alt="Logo Milad" 
              className="w-full h-full object-contain transition-transform group-hover:scale-110"
              onError={(e) => {
                // If logo.png doesn't exist, fallback to miladBg
                e.currentTarget.src = miladBg;
              }}
            />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-xl tracking-tight leading-none">RSDI<span className="text-emerald-400 ml-1">KENDAL</span></h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-blue-300/50 mt-1">Milad Ke-31</p>
          </div>
        </div>
        
        <nav className="space-y-3 flex-1">
          <div 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "sidebar-link",
              activeTab === 'dashboard' ? "bg-white/10 border-l-4 border-accent text-white" : "hover:bg-white/5 opacity-70"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="font-bold">Dashboard</span>
          </div>
          <div 
            onClick={() => setActiveTab('list')}
            className={cn(
              "sidebar-link",
              activeTab === 'list' ? "bg-white/10 border-l-4 border-accent text-white" : "hover:bg-white/5 opacity-70"
            )}
          >
            <ListOrdered size={20} />
            <span className="font-bold">Daftar Vendor</span>
          </div>
          <div 
            onClick={() => setActiveTab('report')}
            className={cn(
              "sidebar-link cursor-pointer",
              activeTab === 'report' ? "bg-white/10 border-l-4 border-accent text-white" : "hover:bg-white/5 opacity-70"
            )}
          >
            <FileText size={20} />
            <span className="font-bold">Report</span>
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                @copyright IT.RSDI 2926<br/>
                Hak Cipta Milik Allah Semata
            </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative z-10">
        {/* Header */}
        <header className="p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black text-blue-900">Pengelolaan Kontribusi Vendor</h2>
            <p className="text-blue-600/70 font-medium">Pantau kontribusi vendor untuk peringatan Milad RSDI</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => { setEditingDonation(null); setIsFormOpen(true); }}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
            >
              <PlusCircle size={20} />
              <span>Input Vendor Baru</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mx-8 mb-6 p-4 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-start gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="font-black text-rose-900 uppercase tracking-tight text-lg leading-tight mb-1">Konfigurasi Diperlukan</p>
              <p className="text-rose-700 text-sm font-medium leading-relaxed max-w-2xl">{error}</p>
            </div>
          </div>
        )}

        <div className="px-8 pb-12 space-y-8 flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatCard 
                    title="Total Terkumpul" 
                    value={formatIDR(summary.totalReceived)} 
                    icon={TrendingUp} 
                    color="text-emerald-600"
                    progress={summary.progress}
                    subtitle={`${summary.progress.toFixed(1)}% dari total target`}
                  />
                  <StatCard 
                    title="Total Vendor" 
                    value={summary.vendorCount} 
                    icon={Building2} 
                    color="text-blue-600"
                    subtitle={`+${donations.filter(d => {
                      const dDate = new Date(d.date);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return dDate > weekAgo;
                    }).length} minggu ini`}
                  />
                  <StatCard 
                    title="Total Target" 
                    value={formatIDR(summary.totalTarget)} 
                    icon={HandCoins} 
                    color="text-amber-600"
                    subtitle="Berdasarkan target kontribusi"
                  />
                </div>

                {/* Progress and Charts */}
                <div className="flex flex-col lg:flex-row gap-8 min-h-0 items-stretch">
                  <div className="flex-[2] bg-white rounded-[2.5rem] shadow-sm border border-blue-50 flex flex-col overflow-hidden">
                    <div className="p-8 border-b border-blue-50">
                      <h4 className="font-black text-blue-900 text-lg">Statistik Donasi Mingguan</h4>
                      <p className="text-blue-400 text-sm">Visualisasi perolehan dana vendor</p>
                    </div>
                    <div className="p-8 h-[300px]">
                      {donations.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={donations.slice(0, 7).reverse()}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="vendorName" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#1E3A8A', fontWeight: 600 }}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#1E3A8A', fontWeight: 600 }}
                              tickFormatter={(val) => `Rp${val/1000000}jt`}
                            />
                            <RechartsTooltip 
                              cursor={{ fill: '#F8FAFC' }}
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(val: number) => [formatIDR(val), 'Donasi']}
                            />
                            <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="#10b981">
                              {donations.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.paymentMethod ? '#10b981' : (entry.amount > 0 ? '#3b82f6' : '#94A3B8')} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                          <History size={48} strokeWidth={1} />
                          <p className="font-bold">Belum ada data visualisasi</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-blue-50 flex flex-col overflow-hidden">
                    <div className="p-8 border-b border-blue-50">
                      <h4 className="font-black text-blue-900 text-lg">Capaian Target</h4>
                      <p className="text-blue-400 text-sm">Prosentase dari total target</p>
                    </div>
                    <div className="p-4 flex-1 flex flex-col items-center justify-center relative">
                       <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Terkumpul', value: summary.totalReceived },
                                { name: 'Sisa', value: Math.max(0, summary.totalTarget - summary.totalReceived) }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#f1f5f9" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <span className="text-3xl font-black text-blue-900">{summary.progress.toFixed(1)}%</span>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Goal Capai</span>
                      </div>
                    </div>
                  </div>

                  <section className="flex-1 bg-brand-orange rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-xl shadow-orange-200">
                    <div>
                      <h4 className="text-2xl font-black mb-2">Target Milad</h4>
                      <p className="opacity-80 text-sm leading-relaxed"></p>
                    </div>
                    
                    <div className="relative flex items-center justify-center my-8">
                      <div className="w-36 h-36 rounded-full border-8 border-white/20 flex flex-col items-center justify-center backdrop-blur-sm bg-white/10 shadow-inner">
                        <span className="text-4xl font-black">98</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest">Hari Lagi</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: 'Via Transfer', count: donations.filter(d => d.paymentMethod === 'By Transfer').length },
                        { label: 'Via Tunai', count: donations.filter(d => d.paymentMethod === 'By Cash').length },
                        { label: 'Via Barang', count: donations.filter(d => d.paymentMethod === 'By Barang').length }
                      ].map((type) => (
                        <div key={type.label} className="flex justify-between items-center p-3 bg-white/20 rounded-xl">
                          <span className="text-xs font-black uppercase tracking-wider">{type.label}</span>
                          <span className="font-mono font-black">{type.count.toString().padStart(2, '0')}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Recent Items in Dashboard */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-blue-50 overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-blue-50 flex justify-between items-center">
                    <h4 className="font-black text-blue-900 text-lg">Donasi Terbaru</h4>
                    <button onClick={() => setActiveTab('list')} className="text-sm font-bold text-blue-500 hover:underline">Lihat Semua</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-blue-50/50 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-4">Vendor</th>
                          <th className="px-8 py-4 text-center">Proposal</th>
                          <th className="px-8 py-4 text-center">Sent</th>
                          <th className="px-8 py-4 text-right">Nilai Komitmen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {donations.slice(0, 5).map((donation) => (
                          <tr key={donation.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-bold text-blue-900">{donation.vendorName}</p>
                                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">NO: {donation.id}</p>
                                </div>
                                {donation.cb2025 > 0 && (
                                  <div className="group relative">
                                    <Info size={14} className="text-blue-300 cursor-help" />
                                    <div className="absolute left-full ml-2 top-0 w-40 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                      <p className="font-bold opacity-60 uppercase mb-1">Kontribusi CB 2025</p>
                                      <p className="font-mono text-xs">{formatIDR(donation.cb2025)}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-4 text-center text-xs font-bold text-blue-500">{donation.proposalDate || '-'}</td>
                            <td className="px-8 py-4 text-center text-xs font-bold text-blue-500">{donation.sentDate || '-'}</td>
                            <td className="px-8 py-4 text-right font-black text-emerald-600">{formatIDR(donation.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'list' ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" size={20} />
                    <input 
                      type="text" 
                      placeholder="Cari vendor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white border border-blue-50 rounded-[1.5rem] focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-blue-900 shadow-sm"
                    />
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-6 py-4 bg-white border border-blue-50 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-blue-700 shadow-sm appearance-none min-w-[200px] text-center"
                  >
                    <option value="All">SEMUA STATUS</option>
                    <option value="Pledge">PLEDGE</option>
                    <option value="Confirmed">CONFIRMED</option>
                    <option value="Received">RECEIVED</option>
                  </select>
                </div>

                {/* Detailed Table */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-blue-50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-blue-50/50 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-5">NO</th>
                          <th className="px-8 py-5">Vendor</th>
                          <th className="px-8 py-5 text-right">Target</th>
                          <th className="px-8 py-5 text-center">Proposal</th>
                          <th className="px-8 py-5 text-right">Nilai Komitmen</th>
                          <th className="px-8 py-5">Payment</th>
                          <th className="px-8 py-5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {filteredDonations.length > 0 ? (
                          filteredDonations.map((donation) => (
                            <tr key={donation.id} className="hover:bg-blue-50/20 transition-colors">
                              <td className="px-8 py-5 font-bold text-blue-900">{donation.id}</td>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <p className="font-bold text-blue-900 leading-none">{donation.vendorName}</p>
                                    <p className="text-[10px] text-blue-400 font-bold uppercase mt-1 tracking-tighter">
                                      Sent: {donation.sentDate || 'Pending'}
                                    </p>
                                  </div>
                                  {donation.cb2025 > 0 && (
                                    <div className="group relative">
                                      <Info size={14} className="text-blue-300 cursor-help" />
                                      <div className="absolute left-full ml-2 top-0 w-40 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                        <p className="font-bold opacity-60 uppercase mb-1">Kontribusi CB 2025</p>
                                        <p className="font-mono text-xs">{formatIDR(donation.cb2025)}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right font-bold text-blue-400">{formatIDR(donation.targetAmount)}</td>
                              <td className="px-8 py-5 text-center text-xs font-bold text-blue-500">{donation.proposalDate || '-'}</td>
                              <td className="px-8 py-5 text-right font-black text-emerald-600">{formatIDR(donation.amount)}</td>
                              <td className="px-8 py-5">
                                {donation.paymentMethod ? (
                                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                                    {donation.paymentMethod}
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex gap-2">
                                  <button onClick={() => editDonation(donation)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                    <Pencil size={16} strokeWidth={3} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-8 py-20 text-center text-blue-300 font-bold">
                              Tidak ada data ditemukan
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="report"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Report Content */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-blue-50 p-10 print:shadow-none print:border-none">
                  <div className="flex justify-between items-start mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center p-2">
                        <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-blue-900">Laporan Kontribusi Milad</h3>
                        <p className="text-blue-500 font-bold uppercase tracking-widest text-xs">RSDI KENDAL - Milad Ke-31</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tanggal Cetak</p>
                      <p className="text-blue-900 font-black">{format(new Date(), 'dd MMMM yyyy')}</p>
                    </div>
                  </div>

                  {/* Summary Rows */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                     <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Target</span>
                        <span className="text-2xl font-black text-blue-900">{formatIDR(summary.totalTarget)}</span>
                     </div>
                     <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col justify-between">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Total Terkumpul</span>
                        <span className="text-2xl font-black text-emerald-700">{formatIDR(summary.totalReceived)}</span>
                     </div>
                     <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col justify-between">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Total Vendor</span>
                        <span className="text-2xl font-black text-blue-900">{summary.vendorCount}</span>
                     </div>
                     <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex flex-col justify-between">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Pencapaian</span>
                        <span className="text-2xl font-black text-amber-700">{summary.progress.toFixed(1)}%</span>
                     </div>
                  </div>

                  {/* Tables By Payment Type */}
                  <div className="space-y-10">
                    <div>
                      <h4 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                        Rincian Kontribusi Terkumpul
                      </h4>
                      <div className="bg-white rounded-3xl border border-blue-50 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                              <th className="px-6 py-4">Vendor</th>
                              <th className="px-6 py-4">Metode</th>
                              <th className="px-6 py-4 text-right">Nilai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {donations.filter(d => d.paymentMethod !== '').map(d => (
                              <tr key={d.id} className="text-sm">
                                <td className="px-6 py-4 font-bold text-blue-900">{d.vendorName}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black">
                                    {d.paymentMethod}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold">{formatIDR(d.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-6 bg-amber-500 rounded-full" />
                        Rincian Komitmen (Belum Terima)
                      </h4>
                      <div className="bg-white rounded-3xl border border-blue-50 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                              <th className="px-6 py-4">Vendor</th>
                              <th className="px-6 py-4 text-right">Nilai Komitmen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {donations.filter(d => d.paymentMethod === '' && d.amount > 0).map(d => (
                              <tr key={d.id} className="text-sm">
                                <td className="px-6 py-4 font-bold text-blue-900">{d.vendorName}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-amber-600">{formatIDR(d.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="mt-20 border-t border-slate-100 pt-10 flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <p>Sistem Kontribusi Milad RSDI</p>
                    <p>Halaman ini sah sebagai laporan internal</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="p-8 text-center mt-auto border-t border-blue-50">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Hospital Milad 2026 • Vendor Portal</p>
        </footer>
      </main>

      {/* Floating Donation Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-8 w-full max-w-lg relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">
                    {editingDonation ? "Update Data" : "Tambah Data Vendor"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Lengkapi informasi donatur di bawah</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddDonation({
                  id: (formData.get('id') as string) || (editingDonation ? editingDonation.id : nextId),
                  vendorName: formData.get('vendorName') as string,
                  cb2025: editingDonation ? editingDonation.cb2025 : 0,
                  targetAmount: Number((formData.get('targetAmount_display') as string || '0').replace(/\./g, '')),
                  proposalDate: formData.get('proposalDate') as string,
                  sentDate: formData.get('sentDate') as string,
                  amount: Number((formData.get('amount_display') as string || '0').replace(/\./g, '')),
                  paymentMethod: formData.get('paymentMethod') as any,
                });
              }} className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">NO</label>
                    <input 
                      name="id" 
                      required 
                      readOnly
                      value={editingDonation?.id || nextId}
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none transition-all font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Vendor</label>
                    <input 
                      name="vendorName" 
                      required 
                      defaultValue={editingDonation?.vendorName}
                      placeholder="PT. Example Indo"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tgl. Proposal</label>
                    <input 
                      name="proposalDate" 
                      type="date"
                      defaultValue={editingDonation?.proposalDate}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sent</label>
                    <input 
                      name="sentDate" 
                      type="date"
                      defaultValue={editingDonation?.sentDate}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Kontribusi 2026</label>
                    <input 
                      name="targetAmount_display" 
                      type="text" 
                      required
                      defaultValue={editingDonation?.targetAmount ? editingDonation.targetAmount.toLocaleString('id-ID') : ''}
                      placeholder="Masukkan target kontribusi..."
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        e.target.value = val ? parseInt(val).toLocaleString('id-ID') : '';
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nilai Komitmen</label>
                      {editingDonation && (
                        <div className="group relative">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded cursor-help transition-colors hover:bg-blue-100">
                            <Info size={12} />
                            <span>Detail CB 2025</span>
                          </div>
                          <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-20">
                            <p className="font-bold mb-1 opacity-60 uppercase text-[10px] tracking-wider">Kontribusi CB 2025</p>
                            <p className="font-mono text-lg">{formatIDR(editingDonation.cb2025)}</p>
                            <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      )}
                    </div>
                    <input 
                      name="amount_display" 
                      type="text" 
                      defaultValue={editingDonation?.amount ? editingDonation.amount.toLocaleString('id-ID') : ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        e.target.value = val ? parseInt(val).toLocaleString('id-ID') : '';
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paid By</label>
                  <select 
                    name="paymentMethod" 
                    defaultValue={editingDonation?.paymentMethod || ''} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/20 appearance-none font-medium text-slate-700 font-bold"
                  >
                    <option value="">Belum Bayar</option>
                    <option value="By Transfer">By Transfer</option>
                    <option value="By Cash">By Cash</option>
                    <option value="By Barang">By Barang</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-3 px-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-all shadow-lg shadow-teal-700/20 active:scale-95"
                  >
                    {editingDonation ? "Simpan Perubahan" : "Simpan Vendor"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
