import React, { useMemo, useState, useContext } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import { DataContext } from '../services/socket';
import { COMPLIANCE_MATRIX } from '../services/hslKnowledge';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

// ── Synthetic audit log seed ───────────────────────────────────────────────
const AUDIT_LOG = [
  { id:'AUD-2120', ts:'2025-11-14 16:42:11', user:'A.Sharma',    role:'Lead Engineer',   action:'Generated specification', target:'GEN-2025-031 (HVAC)',          ip:'10.21.4.18', result:'success' },
  { id:'AUD-2119', ts:'2025-11-14 15:58:03', user:'R.Verma',     role:'Engineer',        action:'Run validation scan',     target:'HSL-BS-21-411 Rev.B',          ip:'10.21.4.31', result:'success' },
  { id:'AUD-2118', ts:'2025-11-14 14:33:47', user:'M.Iyer',      role:'Designer',        action:'Document upload',         target:'IRS_Pt3_C8_supplement.pdf',    ip:'10.21.4.55', result:'success' },
  { id:'AUD-2117', ts:'2025-11-14 12:14:09', user:'S.Patel',     role:'Surveyor',        action:'Acknowledged finding',    target:'VAL-002 (IEC-60092-352)',      ip:'10.21.4.07', result:'success' },
  { id:'AUD-2116', ts:'2025-11-14 11:02:22', user:'K.Rao',       role:'Admin',           action:'Updated rule corpus',     target:'IRS 2024 amendment',           ip:'10.21.4.01', result:'success' },
  { id:'AUD-2115', ts:'2025-11-14 09:48:55', user:'A.Sharma',    role:'Lead Engineer',   action:'Chatbot query',           target:'"Compare HSL-BS-21-411 Rev.B vs C"', ip:'10.21.4.18', result:'success' },
  { id:'AUD-2114', ts:'2025-11-14 09:12:30', user:'svc-validator', role:'System',        action:'Scheduled re-index',      target:'12 OEM manuals',               ip:'10.21.4.02', result:'success' },
  { id:'AUD-2113', ts:'2025-11-13 18:30:01', user:'D.Kapoor',    role:'Engineer',        action:'Export specification',    target:'GEN-2025-030 (.docx)',         ip:'10.21.4.62', result:'success' },
  { id:'AUD-2112', ts:'2025-11-13 17:21:44', user:'unknown',     role:'(blocked)',       action:'Login attempt',            target:'(rejected — no clearance)',     ip:'10.21.4.99', result:'failure' },
  { id:'AUD-2111', ts:'2025-11-13 16:08:17', user:'A.Sharma',    role:'Lead Engineer',   action:'3D model annotation',     target:'HSL-2026-001 / Fr84',          ip:'10.21.4.18', result:'success' },
];

// ── Role / access control matrix ───────────────────────────────────────────
const ROLE_BADGE = {
  red:     'bg-red-500/15 text-red-300 border-red-500/30',
  amber:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
  sky:     'bg-sky-500/15 text-sky-300 border-sky-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  violet:  'bg-violet-500/15 text-violet-300 border-violet-500/30',
  slate:   'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const ROLES = [
  { role:'Admin',         users: 3,  rights: ['Manage corpus', 'Manage users', 'All read', 'All write', 'Approve specs', 'Export'], color:'red' },
  { role:'Lead Engineer', users: 8,  rights: ['Generate specs', 'Run validators', 'Approve drafts', 'Export'],                    color:'amber' },
  { role:'Engineer',      users: 42, rights: ['Run validators', 'Query assistant', 'Author drafts', 'View specs'],                color:'sky' },
  { role:'Designer',      users: 19, rights: ['Query assistant', 'View specs', 'Upload documents'],                                color:'emerald' },
  { role:'Surveyor',      users: 6,  rights: ['View findings', 'Acknowledge', 'Annotate'],                                          color:'violet' },
  { role:'Auditor',       users: 4,  rights: ['Read-only', 'Audit log access'],                                                     color:'slate' },
];

const RESULT_STYLE = {
  success: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
  failure: 'text-red-300 bg-red-500/15 border-red-500/30',
};

export default function Compliance() {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => filter === 'all' ? AUDIT_LOG : AUDIT_LOG.filter(l => l.result === filter), [filter]);

  const { kpis } = useContext(DataContext);
  const k = kpis || {};

  // Usage trend (synthetic 14-day series)
  const usageTrend = useMemo(() => ({
    labels: Array.from({ length: 14 }, (_, i) => `D-${13 - i}`),
    datasets: [
      { label: 'Queries', data: [412, 488, 552, 601, 590, 612, 720, 786, 824, 901, 884, 920, 946, 946], borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.15)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.6 },
      { label: 'Validations', data: [22, 28, 31, 35, 33, 42, 48, 52, 58, 66, 70, 74, 78, 84], borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.15)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.6 },
    ],
  }), []);

  // Domain activity bar
  const domainActivity = useMemo(() => ({
    labels: ['Hull', 'Electrical', 'Mechanical', 'HVAC', 'Piping', 'Outfit'],
    datasets: [{ label: 'Findings (last 30 d)', data: [42, 28, 19, 14, 22, 31], backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#22d3ee'], borderRadius: 4 }],
  }), []);

  const securityChecks = [
    { label: 'Air-gapped intranet deployment',                ok: true },
    { label: 'TLS 1.3 internal mutual auth',                  ok: true },
    { label: 'AES-256 at-rest encryption (LUKS)',             ok: true },
    { label: 'Role-Based Access Control (RBAC) enforced',     ok: true },
    { label: 'Multi-factor authentication for Admins',        ok: true },
    { label: 'Session timeout · 15 minutes',                  ok: true },
    { label: 'Append-only audit log (WORM)',                  ok: true },
    { label: 'No cloud egress · DLP outbound block',          ok: true },
    { label: 'Defence cyber-security audit (DCSA) clearance', ok: true },
    { label: 'Annual penetration test scheduled',             ok: true },
  ];

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Compliance & Audit</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Complete traceability · usage analytics · role-based access · Defence-grade controls</p>
      </div>

      {/* Top tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Audit Events (30d)</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">12,840</div>
          <div className="text-[10px] text-slate-500">100% logged · 0 lost</div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Active Users</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">82</div>
          <div className="text-[10px] text-slate-500">across 6 roles</div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Failed Logins</div>
          <div className="text-2xl font-bold text-red-400 mt-1">3</div>
          <div className="text-[10px] text-slate-500">last 24 h</div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Avg Response</div>
          <div className="text-2xl font-bold text-violet-400 mt-1">{((k.avgResponseMs ?? 1480)/1000).toFixed(2)}s</div>
          <div className="text-[10px] text-slate-500">SLA &lt; 2.00 s ✓</div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">System Uptime</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{k.uptimePct ?? 99.74}%</div>
          <div className="text-[10px] text-slate-500">target &gt; 99.5% ✓</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-3">Platform Usage — Last 14 days</h3>
          <div style={{ height: 200 }}>
            <Line data={usageTrend} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 10 }, boxWidth: 8, usePointStyle: true, padding: 6 } }, tooltip: chartTooltip() },
              scales: chartScales(),
            }} />
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Findings by Domain</h3>
          <div style={{ height: 200 }}>
            <Bar data={domainActivity} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: chartTooltip() },
              scales: chartScales(),
            }} />
          </div>
        </div>
      </div>

      {/* Audit log + Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 border-b border-app-border flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white">Audit Trail</h3>
            <div className="flex items-center gap-1">
              {['all','success','failure'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[10px] px-2 py-1 rounded border font-semibold uppercase tracking-widest ${
                    filter === f ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02] sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-bold">Timestamp</th>
                  <th className="text-left px-3 py-2 font-bold">User</th>
                  <th className="text-left px-3 py-2 font-bold">Action</th>
                  <th className="text-left px-3 py-2 font-bold">Target</th>
                  <th className="text-center px-3 py-2 font-bold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{l.ts}</td>
                    <td className="px-3 py-2">
                      <div className="text-slate-200 font-semibold leading-tight">{l.user}</div>
                      <div className="text-[9px] text-slate-500">{l.role}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{l.action}</td>
                    <td className="px-3 py-2 text-slate-400">{l.target}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${RESULT_STYLE[l.result]}`}>{l.result}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-app-border">
            <h3 className="text-sm font-bold text-white">Defence Cyber-Security Posture</h3>
          </div>
          <div className="p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
            {securityChecks.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <svg className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${s.ok ? 'text-emerald-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.ok ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                </svg>
                <span className="text-slate-200">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role matrix */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Role-Based Access Control</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Role</th>
              <th className="text-right px-3 py-2 font-bold">Users</th>
              <th className="text-left px-3 py-2 font-bold">Privileges</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {ROLES.map(r => (
              <tr key={r.role} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${ROLE_BADGE[r.color]}`}>{r.role}</span>
                </td>
                <td className="text-right px-3 py-2 font-mono text-slate-300">{r.users}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.rights.map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{p}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RFP Compliance Matrix */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">RFP Compliance Matrix</h3>
          <span className="text-[10px] text-emerald-400 font-semibold">22 / 22 Compliant</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02] sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-bold w-12">Clause</th>
                <th className="text-left px-3 py-2 font-bold">Requirement</th>
                <th className="text-center px-3 py-2 font-bold w-20">Status</th>
                <th className="text-left px-3 py-2 font-bold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {COMPLIANCE_MATRIX.map(r => (
                <tr key={r.clause} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{r.clause}</td>
                  <td className="px-3 py-2 text-slate-200">{r.requirement}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase">{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-[10px] italic">{r.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
