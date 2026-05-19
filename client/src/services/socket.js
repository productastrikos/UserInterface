import React, { createContext, useContext } from 'react';

const SocketContext = createContext(null);
export const DataContext = createContext(null);

// â”€â”€ Static seed data â€” replace with your own API/WebSocket integration â”€â”€â”€â”€â”€â”€â”€â”€
const _t = Date.now();
const _ago = (min) => new Date(_t - min * 60000).toISOString();

const SEED_ALERTS = [
  { alertId:'SA-001', type:'critical', category:'operations', title:'Segment B Capacity Warning',             message:'Segment B utilization at 71.2% and rising. Pre-allocate additional resource before end of shift.',       zone:'Seg B', assetId:'AST-002', acknowledged:false, createdAt:_ago(18)  },
  { alertId:'SA-002', type:'warning',  category:'services',   title:'SLA Breach â€” 3 High-Priority Requests', message:'SRQ-001, SRQ-004, SRQ-010 have exceeded 30-minute response SLA. Immediate assignment required.',         zone:'Seg A', assetId:'SRQ-001', acknowledged:false, createdAt:_ago(32)  },
  { alertId:'SA-003', type:'warning',  category:'assets',     title:'Asset AST-003 Maintenance Due',          message:'AST-003 scheduled maintenance overdue by 2 days. Service window must be booked before next deployment.', zone:'Seg C', assetId:'AST-003', acknowledged:false, createdAt:_ago(58)  },
  { alertId:'SA-004', type:'info',     category:'workflow',   title:'Workflow Stage 3 Processing Spike',      message:'Workflow Stage 3 queue depth reached 8 items. Monitoring for backlog â€” no action required yet.',          zone:'Seg D', assetId:'WF-STG-3', acknowledged:false, createdAt:_ago(75)  },
  { alertId:'SA-005', type:'info',     category:'analytics',  title:'Monthly Report Generated',               message:'June analytics report compiled and available in the Analytics section for review and export.',            zone:'all',   assetId:'RPT-JUN',  acknowledged:true,  createdAt:_ago(110) },
];

const SEED_KPIS = {
  collectionCoverage:96.2, coverageTrend:1.1, missedCollections:1.8, missedTrend:-0.6, missedPoints:83,
  overdueAlerts:2, routeSavings:22.4, routeTrend:2.3, fuelSaved:54, kmSaved:386,
  dailyCollectionTons:1325, collectionTrend:3.2, collectionRate:96.2, recyclingRate:31.4,
  recyclingTrend:1.8, overflowTrend:-0.3, composition:[38,22,16,10,7,4,3],
  zonesServed:5, rfidScans:'4,430', fleetUtilization:84, carbonScore:82,
};

const SEED_BINS_SUMMARY    = { total:445, ok:420, overflow:3, needsCollection:22, overflowPct:0.7, bins:[] };
const SEED_VEHICLES_SUMMARY = { total:8, active:4, idle:2, maintenance:2 };

export function SocketProvider({ children }) {
  const dataValue = {
    kpis:             SEED_KPIS,
    alerts:           SEED_ALERTS,
    advisories:       [],
    weather:          null,
    binsSummary:      SEED_BINS_SUMMARY,
    vehiclesSummary:  SEED_VEHICLES_SUMMARY,
    lastUpdate:       new Date(),
    connected:        false,
    requestData:      () => {},
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
