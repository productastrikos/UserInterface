import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../services/socket';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import { BUILD_SPECS, DOMAINS, CLASS_SOCIETIES, TECH_ARCHITECTURE, FUNCTIONAL_WORKFLOW, INDEXED_DOCS } from '../services/hslKnowledge';
import KPICard, { IcoShield, IcoAlert, IcoTrendUp } from '../components/KPICard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);



// ── Quick-access tile ───────────────────────────────────────────────────────
function QuickTile({ to, icon, title, desc, accent }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="bg-app-panel border border-app-border rounded-xl p-4 text-left hover:border-sky-500/50 transition-all group"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">{title}</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-snug">{desc}</p>
      <div className="mt-3 text-[10px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
        Open
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { kpis, alerts } = useContext(DataContext);
  const k = kpis || {};

  const activeFindings = useMemo(() => (alerts || []).filter(a => !a.acknowledged), [alerts]);

  // 24h query volume sparkline data
  const queryTrend = useMemo(() => ({
    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`),
    datasets: [{
      label: 'Queries',
      data: [12, 9, 6, 4, 3, 8, 22, 41, 58, 64, 72, 81, 76, 68, 71, 79, 84, 72, 51, 38, 27, 22, 18, 14],
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56,189,248,0.15)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 1.6,
    }],
  }), []);

  // Doc type distribution — real counts from the indexed document set
  const docTypeDist = useMemo(() => {
    const TYPE_COLORS = { 'Class Rule':'#0ea5e9', 'IACS':'#6366f1', 'IMO':'#10b981', 'IEC':'#f59e0b', 'Naval':'#ef4444', 'Build Spec':'#8b5cf6', 'OEM Manual':'#22d3ee' };
    const counts = {};
    INDEXED_DOCS.forEach(d => { counts[d.type] = (counts[d.type] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: Object.keys(counts).map(t => TYPE_COLORS[t] || '#64748b'), borderWidth: 0 }],
    };
  }, []);

  // Domain coverage
  const domainCoverage = useMemo(() => {
    return DOMAINS.map(d => {
      const specs = BUILD_SPECS.filter(s => s.domain === d);
      const findings = specs.reduce((sum, s) => sum + s.findings, 0);
      const pct = Math.max(60, 100 - findings * 4);
      return { domain: d, specs: specs.length, findings, compliance: pct };
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">HSL Design Validator</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Offline AI assistant · {CLASS_SOCIETIES.length} class societies indexed · {DOMAINS.length} engineering domains
          </p>
        </div>

      </div>

      {/* KPI strip — top 3 admin-priority metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPICard
          label="Compliance Score"
          value={`${k.complianceScore?.toFixed(1) ?? '94.6'}%`}
          icon={<IcoShield />}
          rag="normal"
          trend={2.1}
          subValues={[{ label: 'VS LAST AUDIT', value: '+4.6%' }, { label: 'TARGET', value: '>90%' }]}
          onClick={() => navigate('/compliance')}
        />
        <KPICard
          label="Open Findings"
          value={k.openFindings ?? 23}
          icon={<IcoAlert />}
          rag={(k.openFindings ?? 23) > 10 ? 'warning' : 'normal'}
          subValues={[{ label: 'CRITICAL', value: '3' }, { label: 'HIGH', value: '8' }]}
          onClick={() => navigate('/validator')}
        />
        <KPICard
          label="System Uptime"
          value={`${k.uptimePct ?? 99.74}%`}
          icon={<IcoTrendUp />}
          rag="normal"
          subValues={[{ label: 'TARGET', value: '>99.5%' }, { label: 'MTD DOWN', value: '3.8h' }]}
        />
      </div>

      {/* Quick action tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickTile to="/chatbot" accent="bg-sky-500/15 text-sky-400" title="Ask the Assistant"
          desc="Natural-language queries on Class, IMO, IEC, Naval rules and build specs."
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
        />
        <QuickTile to="/documents" accent="bg-emerald-500/15 text-emerald-400" title="Document Intelligence"
          desc="Upload, OCR-extract, compare and convert scanned PDFs to Word/Excel/ODF."
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <QuickTile to="/validator" accent="bg-violet-500/15 text-violet-400" title="Rule Validator"
          desc="Cross-reference Build Specs against IRS/DNV/ABS/IACS, IMO and IEC."
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
        <QuickTile to="/visualizer" accent="bg-amber-500/15 text-amber-400" title="3D Design Viewer"
          desc="Interactive hull/compartment model with live compliance overlays."
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4 lg:col-span-2">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white">Query Volume — Last 24 h</h3>
          </div>
          <div style={{ height: 180 }}>
            <Line data={queryTrend} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: chartTooltip() },
              scales: chartScales(),
            }} />
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Documents by Type</h3>
          <div style={{ height: 180 }}>
            <Doughnut data={docTypeDist} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: 'right', labels: { color: '#cbd5e1', font: { size: 10 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                tooltip: chartTooltip(),
              },
              cutout: '60%',
            }} />
          </div>
        </div>
      </div>

      {/* Domain coverage + Live findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Domain Coverage</h3>
            <span className="text-[10px] text-slate-500">Compliance % per engineering domain</span>
          </div>
          <div className="p-4 space-y-3">
            {domainCoverage.map(d => {
              const bar = d.compliance >= 90 ? 'bg-emerald-500' : d.compliance >= 75 ? 'bg-amber-500' : 'bg-red-500';
              const txt = d.compliance >= 90 ? 'text-emerald-400' : d.compliance >= 75 ? 'text-amber-400' : 'text-red-400';
              return (
                <div key={d.domain}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-200">{d.domain}</span>
                    <div className="flex gap-3 items-center">
                      <span className="text-slate-500">{d.specs} spec{d.specs !== 1 ? 's' : ''}</span>
                      <span className="text-slate-500">{d.findings} finding{d.findings !== 1 ? 's' : ''}</span>
                      <span className={`font-bold ${txt}`}>{d.compliance}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${bar} transition-all`} style={{ width: `${d.compliance}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Live Findings</h3>
            <span className="text-[10px] text-slate-500">{activeFindings.length} active</span>
          </div>
          <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto">
            {activeFindings.length === 0 && (
              <div className="text-[11px] text-slate-500 text-center py-6">All findings resolved.</div>
            )}
            {activeFindings.map(a => {
              const dot = a.type === 'critical' ? 'bg-red-500' : a.type === 'warning' ? 'bg-amber-500' : 'bg-sky-500';
              return (
                <button
                  key={a.alertId}
                  onClick={() => navigate('/validator')}
                  className="w-full text-left p-2 rounded hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${dot} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-200 leading-tight truncate">{a.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">{a.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">{a.zone}</span>
                        <span className="text-[9px] text-slate-600">·</span>
                        <span className="text-[9px] text-slate-500">{a.assetId}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Technical Architecture (7-layer) + Functional Workflow (7-stage) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Tech Architecture */}
        <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Technical Architecture</h3>
            <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded border border-slate-700 bg-slate-800">7 layers · on-prem</span>
          </div>
          <div className="p-3 space-y-1.5">
            {TECH_ARCHITECTURE.map(l => (
              <div key={l.id} className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.025] border border-white/[0.04]">
                <span className="text-[10px] font-bold text-slate-600 w-5 shrink-0 mt-0.5">{l.id}</span>
                <span className="text-base leading-none shrink-0 mt-0.5">{l.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-200">{l.name}</span>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Healthy" />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug line-clamp-1 mt-0.5">{l.stack}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Functional Workflow */}
        <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Functional Workflow</h3>
            <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded border border-slate-700 bg-slate-800">7 stages · AI pipeline</span>
          </div>
          <div className="p-3 space-y-0">
            {FUNCTIONAL_WORKFLOW.map((f, i) => (
              <div key={f.id} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mt-1">
                    <span className="text-[9px] font-bold text-sky-400">{i + 1}</span>
                  </div>
                  {i < FUNCTIONAL_WORKFLOW.length - 1 && (
                    <div className="w-px flex-1 bg-sky-500/15 my-0.5" style={{ minHeight: 10 }} />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-2.5">
                  <p className="text-[11px] font-semibold text-slate-200 leading-tight">{f.name}</p>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer — security banner */}
      <div className="bg-app-panel border border-app-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 text-[11px]">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Air-gapped · No cloud egress
        </div>
        <div className="text-slate-500">RBAC enforced</div>
        <div className="text-slate-500">Audit trail active</div>
        <div className="text-slate-500">Defence-grade cipher · AES-256 · TLS 1.3 intranet only</div>
      </div>
    </div>
  );
}
