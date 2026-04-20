export type LinkHealth = 'ok' | 'degraded' | 'lost';

export type RiskLevel = 'low' | 'medium' | 'high';

export type LogType = 'info' | 'warning' | 'error' | 'success';

export interface LogEntry {
  id: string;
  t: number;
  message: string;
  type: LogType;
}

export interface KpiSnapshot {
  missionContinuity: number;
  tasksSatisfied: number;
  swarmUncertainty: number;
  degradedCommsSec: number;
}

export interface AiPanelSnapshot {
  minConfidence: number;
  predictedNeighborSummary: string;
  risk: RiskLevel;
  riskReason: string;
  recommendation: string;
  estimatorActive: boolean;
  coordinatorId: number;
}

export type ScenarioEvent =
  | { t: number; kind: 'setEdge'; a: number; b: number; health: LinkHealth }
  | { t: number; kind: 'disturbance'; intensity: number; durationSec: number }
  | { t: number; kind: 'roleFailure'; node: number; durationSec: number }
  | { t: number; kind: 'delayStorm'; factor: number; durationSec: number };
