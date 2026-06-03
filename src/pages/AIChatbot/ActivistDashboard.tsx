import React, { useState, useEffect } from "react";
import axios from "axios";
import { AI_CHATBOT_API_BASE } from '@/pages/AIChatbot/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// TypeScript Interfaces
interface Personnel { name: string; role: string; linkedin: string; }
interface Campaign { target_company: string; status: string; start_year: string; objectives: string; tactics: string; }
interface SourceDoc { "Target Company": string; "Form / Document Type": string; "Filing Date": string; "URL / Source Link": string; "Relevance Note": string; }
interface ActivistProfile {
  investor_summary: string;
  focus_and_tactics: { governance_themes: string[]; operating_themes: string[]; tactics: string[]; };
  visible_personnel: Personnel[];
  latest_13f_snapshot: { filing_date: string; total_aum_usd: number; };
  campaign_registry: Campaign[];
  source_inventory: SourceDoc[];
}

const INVESTOR_OPTIONS = [
  "Elliott Investment Management L.P.",
  "Sachem Head Capital Management LP",
  "Starboard Value LP"
];

const STATUS_COLORS: { [key: string]: string } = {
  Closed: "#9ca3af",
  Settled: "#10b981",
  Ongoing: "#f59e0b",
  Active: "#3b82f6"
};

const ActivistIntelligenceDashboard = () => {
  const [activeInvestor, setActiveInvestor] = useState<string>(INVESTOR_OPTIONS[0]);
  const [activeTab, setActiveTab] = useState<'summary' | 'campaigns'>('summary');
  
  const [data, setData] = useState<ActivistProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const targetUrl = `${AI_CHATBOT_API_BASE}/api/activist-profile/${encodeURIComponent(activeInvestor)}`;
        const response = await axios.get(targetUrl);
        
        const rawData = response.data?.data ? response.data.data : response.data;
        const profileData = rawData[activeInvestor] ? rawData[activeInvestor] : rawData;
        
        setData(profileData);
      } catch (err: any) {
        console.error("Error fetching activist profile:", err);
        setError(err.response?.data?.detail || "Failed to load activist metrics from database.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [activeInvestor]);

  const formatAUM = (amount?: number) => {
    if (!amount) return "N/A";
    return amount >= 1e9
      ? `$${(amount / 1e9).toFixed(2)}B`
      : amount >= 1e6
      ? `$${(amount / 1e6).toFixed(0)}M`
      : `$${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-lg font-medium text-gray-600 animate-pulse">
          Syncing Activist Intelligence Metrics...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg m-6 border border-red-200">
        ⚠️ {error || "Profile data unavailable."}
      </div>
    );
  }

  const safeCampaigns = data.campaign_registry || [];
  const activeCampaignsCount = safeCampaigns.filter(
    (c) => c.status === "Ongoing" || c.status === "Active"
  ).length;

  const chartData = Object.keys(STATUS_COLORS).map(key => ({
    name: key,
    count: safeCampaigns.filter(c => c.status === key).length
  })).filter(item => item.count > 0);

  // Helper strings generated dynamically to match your exact UI text look
  const governanceCombined = (data.focus_and_tactics?.governance_themes || []).join(", ");
  const operatingCombined = (data.focus_and_tactics?.operating_themes || []).join(", ");
  const tacticsCombined = (data.focus_and_tactics?.tactics || []).join(", ");
  const targetCompanyList = safeCampaigns.map(c => c.target_company).join(", ");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      
      {/* Title & Dropdown Header section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-red-700">Activist Intelligence Dashboard</h1>
        
        <div className="mt-4 md:mt-0">
          <select 
            value={activeInvestor} 
            onChange={(e) => setActiveInvestor(e.target.value)}
            className="block w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
          >
            {INVESTOR_OPTIONS.map((investor) => (
              <option key={investor} value={investor}>
                {investor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Navigation Layout */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'summary' 
              ? 'text-gray-900 border-b-2 border-gray-900 font-semibold' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'campaigns' 
              ? 'text-gray-900 border-b-2 border-gray-900 font-semibold' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Campaigns
        </button>
      </div>

      {/* Main Profile Header Box */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative">
        <span className="inline-block text-xs text-gray-400 border border-gray-100 rounded-full px-3 py-1 mb-2 font-medium bg-gray-50">
          Updated May 2026
        </span>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{activeInvestor}</h2>
        <p className="text-xs text-gray-400 mb-4">
          Activist Investor Profile • West Palm Beach • Founded 1977
        </p>
        <p className="text-sm text-gray-600 leading-relaxed font-normal">{data.investor_summary}</p>
      </div>

      {/* ================= SUMMARY TAB CONTENT ================= */}
      {activeTab === 'summary' && (
        <>
          {/* KPI Cards Metrics section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 font-medium">Estimated AUM</p>
                <p className="text-2xl font-bold text-gray-900 my-0.5">{formatAUM(data.latest_13f_snapshot?.total_aum_usd)}</p>
                <p className="text-[11px] text-gray-400">From 13F snapshot</p>
              </div>
              <span className="text-xl opacity-20">💼</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 font-medium">Tracked Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 my-0.5">{safeCampaigns.length}</p>
                <p className="text-[11px] text-gray-400">Historical profile count</p>
              </div>
              <span className="text-xl opacity-20">🎯</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 font-medium">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 my-0.5">{activeCampaignsCount}</p>
                <p className="text-[11px] text-gray-400">Current watchlist</p>
              </div>
              <span className="text-xl opacity-20">📊</span>
            </div>
          </div>

          {/* Key Campaign Observations layout wrapper */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-gray-400">💬</span> Key Campaign Observations
            </h3>
            <div className="space-y-2">
              <div className="flex items-start bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-600">
                <span className="text-indigo-500 mr-2 font-bold">↗</span>
                <span>Recurring campaign focus: {governanceCombined}, {operatingCombined}, {tacticsCombined}.</span>
              </div>
              <div className="flex items-start bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-600">
                <span className="text-indigo-500 mr-2 font-bold">↗</span>
                <span>Most recent visible situations include {targetCompanyList}.</span>
              </div>
              <div className="flex items-start bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-600">
                <span className="text-indigo-500 mr-2 font-bold">↗</span>
                <span>Campaign pattern spans {safeCampaigns.length} tracked situations, with {activeCampaignsCount} active or ongoing situations flagged in the dashboard.</span>
              </div>
            </div>
          </div>

          {/* Modified Key Thesis & Campaign Focus layout metrics */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-gray-400">🎯</span> Key Thesis & Campaign Focus
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm text-gray-900">
                  <span className="opacity-50">📋</span> Governance / Board Change
                </div>
                <div className="flex flex-wrap gap-2">
                  {safeCampaigns.map((c, i) => (
                    <span key={i} className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 font-medium shadow-sm">
                      {c.target_company.split(" (")[0]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm text-gray-900">
                  <span className="opacity-50">📈</span> Operating Performance
                </div>
                <div className="flex flex-wrap gap-2">
                  {safeCampaigns.map((c, i) => (
                    <span key={i} className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 font-medium shadow-sm">
                      {c.target_company.split(" (")[0]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm text-gray-900">
                  <span className="opacity-50">💬</span> Escalation / Settlement
                </div>
                <div className="flex flex-wrap gap-2">
                  {safeCampaigns.map((c, i) => (
                    <span key={i} className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 font-medium shadow-sm">
                      {c.target_company.split(" (")[0]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Prototype disclaimer footer matching index layout */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-400 leading-relaxed shadow-inner">
            Source status: Uploaded JSON. This prototype expects each Profiler output to include normalized profile metadata, thesis themes, campaign outcomes, warning signals, and customer-ready preparation guidance.
          </div>
        </>
      )}

      {/* ================= CAMPAIGNS TAB CONTENT ================= */}
      {activeTab === 'campaigns' && (
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* Left Column: Recharts Outcomes graph */}
          <div className="lg:w-1/4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 text-center">Campaign Outcomes</h3>
              
              <div className="w-full h-48 flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: '#6b7280' }} 
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="count" barSize={32} radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Campaign Details List Table */}
          <div className="lg:w-3/4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-full">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
                <span>📋</span> Campaign Details & Full Campaign List
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Target</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Period</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Status</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Core Issue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {safeCampaigns.map((campaign, i) => (
                      <tr key={i} className="align-top hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="text-sm font-bold text-gray-900 block">{campaign.target_company.split(' (')[0]}</span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {campaign.start_year}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-xs px-2.5 py-0.5 font-semibold rounded-full ${
                            campaign.status === "Ongoing" || campaign.status === "Active"
                              ? "bg-yellow-100 text-yellow-800"
                              : campaign.status === "Settled" 
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-900 mb-2 font-medium">{campaign.objectives}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{campaign.tactics}</p>
                        </td>
                      </tr>
                    ))}
                    {safeCampaigns.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                          No historical campaigns tracked.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default ActivistIntelligenceDashboard;