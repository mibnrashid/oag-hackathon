import { ANGULAR_RATE, MISSION_COUNT, MISSION_EDGES, neighborsOf } from './graph';
import { getEdgeHealth } from './world';
import type { AiPanelSnapshot, KpiSnapshot, LinkHealth, RiskLevel } from './types';

/** Observations seeded with this sentinel mean "never received". */
const OBS_SENTINEL = -1e9;
const OBS_MAX_AGE_SEC = 120;

function wrapPi(x: number): number {
  let a = x % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/** True if i has a usable packet-derived observation of j (same graph edge). */
function hasValidObservation(obsTime: number[][], simTime: number, i: number, j: number): boolean {
  if (i === j) return false;
  const t = obsTime[i]![j]!;
  if (t <= OBS_SENTINEL + 1) return false;
  const age = simTime - t;
  if (age < 0 || age > OBS_MAX_AGE_SEC) return false;
  return neighborsOf(i).includes(j);
}

function staleness(simTime: number, obsTime: number[][]): number[][] {
  const s: number[][] = [];
  for (let i = 0; i < MISSION_COUNT; i++) {
    s[i] = [];
    for (let j = 0; j < MISSION_COUNT; j++) {
      s[i][j] = i === j ? 0 : Math.max(0, simTime - obsTime[i][j]!);
    }
  }
  return s;
}

function predictedAngle(obsAngle: number, obsT: number, simTime: number): number {
  return obsAngle + ANGULAR_RATE * (simTime - obsT);
}

function predictionError(
  simTime: number,
  obsTime: number[][],
  obsAngle: number[][],
  truth: readonly number[],
): number[][] {
  const err: number[][] = [];
  for (let i = 0; i < MISSION_COUNT; i++) {
    err[i] = [];
    const nbrs = neighborsOf(i);
    const nbrSet = new Set(nbrs);
    for (let j = 0; j < MISSION_COUNT; j++) {
      if (i === j || !nbrSet.has(j) || !hasValidObservation(obsTime, simTime, i, j)) {
        err[i]![j] = 0;
        continue;
      }
      const pred = predictedAngle(obsAngle[i]![j]!, obsTime[i]![j]!, simTime);
      err[i]![j] = Math.abs(wrapPi(pred - truth[j]!));
    }
  }
  return err;
}

function edgeHealthBetween(edgeHealth: ReadonlyMap<string, LinkHealth>, i: number, j: number): LinkHealth {
  const a = Math.min(i, j);
  const b = Math.max(i, j);
  return getEdgeHealth(edgeHealth, a, b);
}

/** Sat-1 stays coordinator until its neighborhood is stressed or role failure is active. */
function coordinator0Stressed(edgeHealth: ReadonlyMap<string, LinkHealth>, roleFailureActive: boolean): boolean {
  if (roleFailureActive) return true;
  for (const n of neighborsOf(0)) {
    if (edgeHealthBetween(edgeHealth, 0, n) !== 'ok') return true;
  }
  return false;
}

export function chooseAiCoordinator(
  edgeHealth: ReadonlyMap<string, LinkHealth>,
  simTime: number,
  obsTime: number[][],
  roleFailureActive: boolean,
): number {
  if (!coordinator0Stressed(edgeHealth, roleFailureActive)) {
    return 0;
  }

  let best = 0;
  let bestScore = -1;
  for (let c = 0; c < MISSION_COUNT; c++) {
    const nbrs = neighborsOf(c);
    let score = 0;
    for (const n of nbrs) {
      const h = edgeHealthBetween(edgeHealth, c, n);
      if (h === 'lost') continue;
      const fresh = simTime - obsTime[c]![n]!;
      const linkScore = h === 'ok' ? 1 : 0.45;
      const stalenessPenalty = Math.min(1.2, fresh) / 1.2;
      score += linkScore * (1 - stalenessPenalty * 0.85);
    }
    if (c === 0 && roleFailureActive) score *= 0.35;
    if (score > bestScore + 0.001) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export function computeBaseline(
  _truthAngles: readonly number[],
  formationError: number,
  obsTime: number[][],
  simTime: number,
  edgeHealth: ReadonlyMap<string, LinkHealth>,
  prevDegradedAccum: number,
  dt: number,
): { kpi: KpiSnapshot; degradedAccum: number } {
  const coord = 0;
  const nbrs = neighborsOf(coord);
  const st = staleness(simTime, obsTime);
  const staleList = nbrs.map((n) => st[coord]![n]!);
  const avgStale = avg(staleList);

  let lostCritical = 0;
  for (const n of nbrs) {
    if (edgeHealthBetween(edgeHealth, coord, n) === 'lost') lostCritical++;
  }

  const continuity = Math.max(
    0,
    Math.min(
      100,
      100 - formationError * 8 - avgStale * 22 - lostCritical * 14 - (simTime - obsTime[coord]![1]! > 1.2 ? 6 : 0),
    ),
  );

  let tasks = 0;
  for (const k of [1, 2, 3]) {
    if (simTime - obsTime[coord]![k]! < 0.55) tasks++;
  }

  const uncertainty = Math.max(0, Math.min(100, avgStale * 32 + formationError * 9 + lostCritical * 10));

  let degradedDelta = 0;
  const anyDegradedEdge = MISSION_EDGES.some(([a, b]) => getEdgeHealth(edgeHealth, a, b) === 'degraded');
  const staleBad = avgStale > 0.35;
  if (anyDegradedEdge || staleBad) degradedDelta = dt;

  return {
    kpi: {
      missionContinuity: continuity,
      tasksSatisfied: tasks,
      swarmUncertainty: uncertainty,
      degradedCommsSec: prevDegradedAccum + degradedDelta,
    },
    degradedAccum: prevDegradedAccum + degradedDelta,
  };
}

export function computeAi(
  truthAngles: readonly number[],
  formationError: number,
  obsTime: number[][],
  obsAngle: number[][],
  simTime: number,
  edgeHealth: ReadonlyMap<string, LinkHealth>,
  prevDegradedAccum: number,
  dt: number,
  roleFailureActive: boolean,
): { kpi: KpiSnapshot; degradedAccum: number; panel: AiPanelSnapshot } {
  const coord = chooseAiCoordinator(edgeHealth, simTime, obsTime, roleFailureActive);
  const pErr = predictionError(simTime, obsTime, obsAngle, truthAngles);
  const nbrs = neighborsOf(coord);

  const effectiveStale: number[] = nbrs.map((n) => {
    const raw = Math.max(0, simTime - obsTime[coord]![n]!);
    if (!hasValidObservation(obsTime, simTime, coord, n)) return raw;
    const e = pErr[coord]![n]!;
    const tracked = e < 0.09;
    return tracked ? Math.min(raw, 0.18) : raw * 0.82;
  });

  const avgEff = avg(effectiveStale);
  let lostCritical = 0;
  for (const n of nbrs) {
    if (edgeHealthBetween(edgeHealth, coord, n) === 'lost') lostCritical++;
  }

  const continuity = Math.max(
    0,
    Math.min(100, 100 - formationError * 6 - avgEff * 15 - lostCritical * 8),
  );

  let tasks = 0;
  for (const k of [1, 2, 3]) {
    const raw = simTime - obsTime[coord]![k]!;
    const e = hasValidObservation(obsTime, simTime, coord, k) ? pErr[coord]![k]! : 1;
    if (raw < 0.55 || e < 0.1) tasks++;
  }

  const uncertainty = Math.max(0, Math.min(100, avgEff * 26 + formationError * 7 + lostCritical * 5));

  let degradedDelta = 0;
  const anyDegradedEdge = MISSION_EDGES.some(([a, b]) => getEdgeHealth(edgeHealth, a, b) === 'degraded');
  if (anyDegradedEdge || avgEff > 0.32) degradedDelta = dt;

  const confidences = nbrs.map((n) => {
    const h = edgeHealthBetween(edgeHealth, coord, n);
    const base = h === 'ok' ? 0.92 : h === 'degraded' ? 0.55 : 0.08;
    if (!hasValidObservation(obsTime, simTime, coord, n)) {
      return Math.max(0, Math.min(1, base * 0.35));
    }
    const fresh = Math.exp(-Math.max(0, simTime - obsTime[coord]![n]!) * 1.1);
    const track = Math.exp(-((pErr[coord]![n]! / 0.12) ** 2));
    return Math.max(0, Math.min(1, base * (0.35 + 0.65 * fresh) * (0.55 + 0.45 * track)));
  });
  const minConfidence = confidences.length ? Math.min(...confidences) : 0;

  const validNbrs = nbrs.filter((n) => hasValidObservation(obsTime, simTime, coord, n));
  let predSummary: string;
  if (validNbrs.length === 0) {
    predSummary = 'Awaiting valid neighbor packets on one or more links.';
  } else {
    const worstN = validNbrs.reduce((a, b) => (pErr[coord]![b]! > pErr[coord]![a]! ? b : a), validNbrs[0]!);
    predSummary = `Δθ̂ max≈${(pErr[coord]![worstN]! * (180 / Math.PI)).toFixed(1)}° on Sat-${worstN + 1}`;
  }

  let risk: RiskLevel = 'low';
  let riskReason = 'Topology stable; packets arriving.';
  if (minConfidence < 0.35 || lostCritical > 0) {
    risk = 'high';
    riskReason = lostCritical > 0 ? 'Critical link outage; coordination gap.' : 'Stale telemetry; estimator carrying state.';
  } else if (minConfidence < 0.62 || avgEff > 0.35) {
    risk = 'medium';
    riskReason = 'Elevated latency / intermittent updates.';
  }

  const estimatorActive = avg(nbrs.map((n) => simTime - obsTime[coord]![n]!)) > 0.28 || roleFailureActive;

  let recommendation = 'Hold roles; maintain current task allocation.';
  if (coord !== 0 && (lostCritical > 0 || minConfidence < 0.45 || roleFailureActive)) {
    recommendation = `Reassign coordinator to Sat-${coord + 1}; redistribute tracking tasks to healthy neighbors.`;
  } else if (minConfidence < 0.55) {
    recommendation = 'Pre-stage backup tracker; increase cross-link probing cadence.';
  }

  const panel: AiPanelSnapshot = {
    minConfidence,
    predictedNeighborSummary: predSummary,
    risk,
    riskReason,
    recommendation,
    estimatorActive,
    coordinatorId: coord,
  };

  return {
    kpi: {
      missionContinuity: continuity,
      tasksSatisfied: tasks,
      swarmUncertainty: uncertainty,
      degradedCommsSec: prevDegradedAccum + degradedDelta,
    },
    degradedAccum: prevDegradedAccum + degradedDelta,
    panel,
  };
}
