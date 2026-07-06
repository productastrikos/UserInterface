import React, { createContext, useContext, useState, useCallback } from 'react';

const SocketContext = createContext(null);
export const DataContext = createContext(null);

const _t = Date.now();
const _ago = (min) => new Date(_t - min * 60000).toISOString();

// ── HSL validation alerts (live engineering compliance signal) ──────────────
const SEED_ALERTS = [
  { alertId:'VAL-001', type:'critical', category:'compliance', title:'IRS Pt.3 Ch.6 Sec.4 — Bulkhead spacing breach',
    message:'Transverse bulkhead at Frame 84 violates IRS Pt.3 Ch.6 Sec.4 (max spacing 30 frames). Build Spec HSL-BS-21-411 must be revised.',
    zone:'Hull', assetId:'BLKHD-FR84', acknowledged:false, createdAt:_ago(11) },
  { alertId:'VAL-002', type:'warning',  category:'electrical', title:'IEC 60092-352 — Cable segregation distance',
    message:'Power and instrumentation cables in tray T-E-204 below 100mm separation required by IEC 60092-352. Re-route 3 runs.',
    zone:'Electrical', assetId:'TRAY-T-E-204', acknowledged:false, createdAt:_ago(27) },
  { alertId:'VAL-003', type:'warning',  category:'piping',     title:'IMO MARPOL Annex I — Oily water discharge',
    message:'Bilge piping arrangement in ER lacks oil-content-meter interlock per MARPOL Annex I Reg.14. Specification gap detected.',
    zone:'Piping', assetId:'OWS-ER-1', acknowledged:false, createdAt:_ago(44) },
  { alertId:'VAL-004', type:'info',     category:'hvac',       title:'DNV Pt.4 Ch.7 — HVAC redundancy',
    message:'Engine room HVAC SF-1 lacks N+1 redundancy recommendation per DNV Pt.4 Ch.7 Sec.2. Confirm or document deviation.',
    zone:'HVAC', assetId:'SF-1', acknowledged:false, createdAt:_ago(62) },
  { alertId:'VAL-005', type:'info',     category:'naval',      title:'IHQ NSQR Vol-II shock testing',
    message:'Equipment list updated — 14 items require Grade A shock qualification per Naval Staff Qualitative Requirements.',
    zone:'Outfit', assetId:'NSQR-2025', acknowledged:true,  createdAt:_ago(120) },
];

// ── HSL KPI snapshot — values aligned to Astrikos.ai Tech Solution Doc ─────
const SEED_KPIS = {
  // Performance targets from the doc: <2s response, >99.5% uptime
  avgResponseMs:         1480,    // < 2000 ms target
  responseTrend:        -3.4,
  uptimePct:           99.74,     // > 99.50% target
  uptimeTrend:           0.04,

  // Knowledge & document corpus
  documentsIndexed:     1284,
  documentsTrend:        4.2,
  rulesParsed:          37412,
  rulesTrend:            1.8,
  ocrPagesProcessed:    52740,
  ocrEngineConfidence:  98.4,

  // Usage analytics
  queriesAnswered:        946,
  queriesTrend:          7.1,
  specsGenerated:         118,
  specsTrend:            6.0,

  // Compliance & validation
  complianceScore:       94.6,
  complianceTrend:       0.9,
  openFindings:            23,
  findingsTrend:        -12.4,

  // Scope coverage — per Tech Solution Doc §Project Brief
  domainsCovered:           6,    // Electrical, Mechanical, Piping, HVAC, Hull, Outfit
  classSocieties:           4,    // IRS, DNV, ABS, IACS
  standardsBodies:          3,    // IMO, IEC, Naval (NSQR)

  // Hardware / infra (per Hardware Requirements table in doc)
  gpuUtilizationPct:     38.2,    // NVIDIA A100 80 GB
  cpuUtilizationPct:     22.6,    // 2× 16-core EPYC / Xeon Gold
  ramUsedGb:             184,     // of 512 GB DDR4 ECC
  storageUsedTb:          12.4,   // of 8 TB NVMe + 100 TB+ NAS
};

// ── HSL AI advisories (recommendations from the assistant) ──────────────────
const SEED_ADVISORIES = [
  {
    advisoryId:'ADV-CMP-001', priority:'high',
    title:'Critical: 3 Build Spec deviations from IRS Pt.3 Ch.6 — Hull domain',
    template:'compliance_cluster',
    rootCause:{
      primary:'Three structural items in Build Spec HSL-BS-21-411 deviate from IRS Pt.3 Ch.6 — bulkhead spacing, plate thickness at Frame 112, and weld category in collision bulkhead.',
      contributing:'Spec was authored against IRS 2022 edition. The 2024 amendment changed required minimum plate thickness for shell strakes below the waterline.',
      systemic:'Build Specs are not auto-checked against the latest IRS amendments at sign-off. A pre-approval gate inside the Validator would prevent recurrence.',
    },
    evidence:[
      'IRS Pt.3 Ch.6 Sec.4 — bulkhead spacing exceeds 30-frame max',
      'IRS Pt.3 Ch.6 Sec.2 — plate thickness 12.5 mm vs required 13.0 mm at Fr112',
      'IRS Pt.3 Ch.6 Sec.7 — weld category B used where Cat A required',
    ],
    recommendations:[
      'Re-issue HSL-BS-21-411 Rev.C with bulkhead at Fr84 → Fr80',
      'Update plate thickness schedule at Fr112 to 13.0 mm',
      'Promote weld at collision bulkhead to Cat A per IRS 2024 amendment',
    ],
    impact: -8,
  },
  {
    advisoryId:'ADV-DOC-002', priority:'medium',
    title:'12 scanned equipment manuals indexed and ready for natural-language query',
    template:'doc_ingestion',
    rootCause:{
      primary:'OCR pipeline completed for 12 manuals — including 3 image-only PDFs from third-party OEMs.',
      contributing:'Documents are now searchable and cross-linked to applicable Class / IMO / IEC clauses.',
      systemic:'Reduces engineer lookup time from ~12 min to <30 sec per query.',
    },
    evidence:[
      '12 manuals · 1,842 pages OCR-processed',
      '74 referenced standards auto-linked',
      'Confidence avg 98.4%',
    ],
    recommendations:[
      'Ask the Design Assistant about any indexed equipment',
      'Use the Validator to cross-check OEM spec vs Class rule',
    ],
    impact: 6,
  },
];

const SEED_BINS_SUMMARY = {};
const SEED_VEHICLES_SUMMARY = {};

export function SocketProvider({ children }) {
  const [alerts, setAlerts] = useState(SEED_ALERTS);

  const acknowledgeAlert = useCallback((alertId) => {
    setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, acknowledged: true } : a));
  }, []);

  const dataValue = {
    kpis:             SEED_KPIS,
    alerts,
    advisories:       SEED_ADVISORIES,
    weather:          null,
    binsSummary:      SEED_BINS_SUMMARY,
    vehiclesSummary:  SEED_VEHICLES_SUMMARY,
    lastUpdate:       new Date(),
    connected:        false,
    requestData:      () => {},
    acknowledgeAlert,
  };

  return (
    <SocketContext.Provider value={null}>
      <DataContext.Provider value={dataValue}>
        {children}
      </DataContext.Provider>
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
export const useData   = () => useContext(DataContext);
