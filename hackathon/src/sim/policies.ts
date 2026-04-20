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
  /** Baseline caps at 20 s per neighbour — otherwise stale grows unboundedly. */
  const staleList = nbrs.map((n) => Math.min(20, st[coord]![n]!));
  const avgStale = avg(staleList);

  let lostCritical = 0;
  let degradedCritical = 0;
  for (const n of nbrs) {
    const h = edgeHealthBetween(edgeHealth, coord, n);
    if (h === 'lost') lostCritical++;
    else if (h === 'degraded') degradedCritical++;
  }

  /** Baseline has no resilience: stale telemetry and outages hurt continuity hard. */
  const continuity = Math.max(
    0,
    Math.min(
      100,
      100 - formationError * 12 - avgStale * 28 - lostCritical * 22 - degradedCritical * 6,
    ),
  );

  /** Each "task" (track Sat-2, 3, 4) requires fresh direct telemetry. */
  let tasks = 0;
  for (const k of [1, 2, 3]) {
    if (simTime - obsTime[coord]![k]! < 0.6) tasks++;
  }

  const uncertainty = Math.max(
    0,
    Math.min(100, avgStale * 36 + formationError * 11 + lostCritical * 14 + degradedCritical * 4),
  );

  let degradedDelta = 0;
  const anyDegradedEdge = MISSION_EDGES.some(([a, b]) => getEdgeHealth(edgeHealth, a, b) !== 'ok');
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

/**
 * Can the AI at `coord` estimate neighbour `target` by bridging through another
 * healthy neighbour `m`? Requires (coord,m) healthy AND m has a fresh obs of target.
 */
function canBridgeEstimate(
  coord: number,
  target: number,
  obsTime: number[][],
  edgeHealth: ReadonlyMap<string, LinkHealth>,
  simTime: number,
): { viable: boolean; via: number | null; age: number } {
  let best: { via: number; age: number } | null = null;
  for (const m of neighborsOf(coord)) {
    if (m === target) continue;
    const hCoordM = edgeHealthBetween(edgeHealth, coord, m);
    if (hCoordM === 'lost') continue;
    const hMTarget = edgeHealthBetween(edgeHealth, m, target);
    if (hMTarget === 'lost') continue;
    const tMTarget = obsTime[m]?.[target];
    if (tMTarget == null || tMTarget <= OBS_SENTINEL + 1) continue;
    const age = simTime - tMTarget;
    if (age < 0 || age > 3.5) continue;
    if (!best || age < best.age) best = { via: m, age };
  }
  return best ? { viable: true, via: best.via, age: best.age } : { viable: false, via: null, age: Infinity };
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

  /**
   * Effective staleness per neighbour: AI tries three strategies in order —
   * (1) fresh direct obs, (2) dead-reckoning from last valid direct obs,
   * (3) bridge through another healthy neighbour.
   */
  const perNbr = nbrs.map((n) => {
    const direct = hasValidObservation(obsTime, simTime, coord, n);
    const rawDirect = Math.max(0, simTime - obsTime[coord]![n]!);
    if (direct) {
      const e = pErr[coord]![n]!;
      const tracked = e < 0.09;
      return { n, eff: tracked ? Math.min(rawDirect, 0.15) : rawDirect * 0.55, mode: 'direct' as const };
    }
    const bridge = canBridgeEstimate(coord, n, obsTime, edgeHealth, simTime);
    if (bridge.viable) {
      /** Bridge carries its own latency + a small penalty; AI admits lower confidence. */
      return { n, eff: Math.min(1.0, bridge.age + 0.25), mode: 'bridge' as const };
    }
    /** No signal path at all — cap at a finite value so continuity still moves. */
    return { n, eff: Math.min(5, rawDirect), mode: 'none' as const };
  });

  const effectiveStale = perNbr.map((x) => x.eff);
  const avgEff = avg(effectiveStale);

  let lostCritical = 0;
  let degradedCritical = 0;
  for (const n of nbrs) {
    const h = edgeHealthBetween(edgeHealth, coord, n);
    if (h === 'lost') lostCritical++;
    else if (h === 'degraded') degradedCritical++;
  }
  const bridgedCount = perNbr.filter((x) => x.mode === 'bridge').length;

  /** AI partially rescues continuity through bridging; formationError decays faster under AI. */
  const continuity = Math.max(
    0,
    Math.min(
      100,
      100 - formationError * 5 - avgEff * 12 - Math.max(0, lostCritical - bridgedCount) * 10 - degradedCritical * 2,
    ),
  );

  let tasks = 0;
  for (const k of [1, 2, 3]) {
    const p = perNbr.find((x) => x.n === k);
    if (!p) continue;
    if (p.mode === 'direct' && p.eff < 0.6) tasks++;
    else if (p.mode === 'bridge' && p.eff < 1.6) tasks++;
  }

  const uncertainty = Math.max(
    0,
    Math.min(100, avgEff * 22 + formationError * 6 + Math.max(0, lostCritical - bridgedCount) * 6),
  );

  /** AI only counts "degraded" when it can't bridge effectively. */
  let degradedDelta = 0;
  const anyUnbridgedOutage = perNbr.some((x) => x.mode === 'none');
  const anyDegradedEdge = MISSION_EDGES.some(([a, b]) => getEdgeHealth(edgeHealth, a, b) === 'degraded');
  if (anyUnbridgedOutage || (anyDegradedEdge && avgEff > 0.4)) degradedDelta = dt;

  const confidences = perNbr.map(({ n, mode }) => {
    const h = edgeHealthBetween(edgeHealth, coord, n);
    const base = h === 'ok' ? 0.94 : h === 'degraded' ? 0.6 : 0.18;
    if (mode === 'direct') {
      const fresh = Math.exp(-Math.max(0, simTime - obsTime[coord]![n]!) * 1.1);
      const e = pErr[coord]![n]!;
      const track = Math.exp(-((e / 0.12) ** 2));
      return Math.max(0, Math.min(1, base * (0.35 + 0.65 * fresh) * (0.55 + 0.45 * track)));
    }
    if (mode === 'bridge') return 0.55;
    return Math.max(0, Math.min(1, base * 0.3));
  });
  const minConfidence = confidences.length ? Math.min(...confidences) : 0;

  let predSummary: string;
  const bridged = perNbr.find((x) => x.mode === 'bridge');
  const unbridged = perNbr.find((x) => x.mode === 'none');
  const bridgeInfo = bridged
    ? canBridgeEstimate(coord, bridged.n, obsTime, edgeHealth, simTime)
    : null;
  if (unbridged) {
    predSummary = `No path to Sat-${unbridged.n + 1}: holding last-known state (dead-reckoning).`;
  } else if (bridged && bridgeInfo?.via != null) {
    predSummary = `Sat-${bridged.n + 1} estimated via Sat-${bridgeInfo.via + 1} bridge · age ${bridged.eff.toFixed(1)}s.`;
  } else {
    const valid = perNbr.filter((x) => x.mode === 'direct');
    if (valid.length === 0) {
      predSummary = 'Awaiting neighbour packets.';
    } else {
      const worst = valid.reduce((a, b) => (pErr[coord]![b.n]! > pErr[coord]![a.n]! ? b : a));
      predSummary = `Δθ̂ max ≈ ${(pErr[coord]![worst.n]! * (180 / Math.PI)).toFixed(1)}° on Sat-${worst.n + 1}.`;
    }
  }

  let risk: RiskLevel = 'low';
  let riskReason = 'Topology stable; all neighbours observable.';
  if (unbridged) {
    risk = 'high';
    riskReason = `Sat-${unbridged.n + 1} unreachable on all paths — dead-reckoning only.`;
  } else if (lostCritical > 0 && bridged && bridgeInfo?.via != null) {
    risk = 'medium';
    riskReason = `Direct link down; bridging via Sat-${bridgeInfo.via + 1}.`;
  } else if (minConfidence < 0.6 || avgEff > 0.35) {
    risk = 'medium';
    riskReason = 'Elevated latency / intermittent updates.';
  }

  /** Estimator is active when any neighbour needs bridging, dead-reckoning, or on role failure. */
  const estimatorActive =
    perNbr.some((x) => x.mode !== 'direct') || roleFailureActive;

  let recommendation = 'Hold roles; maintain current task allocation.';
  if (coord !== 0 && (lostCritical > 0 || minConfidence < 0.45 || roleFailureActive)) {
    recommendation = `Reassign coordinator to Sat-${coord + 1}; redistribute tracking tasks to healthy neighbours.`;
  } else if (unbridged) {
    recommendation = `Schedule rendezvous pass with Sat-${unbridged.n + 1}; accept degraded tracking.`;
  } else if (bridged) {
    recommendation = `Route Sat-${bridged.n + 1} telemetry via bridge neighbour until direct link restored.`;
  } else if (minConfidence < 0.55) {
    recommendation = 'Increase cross-link probing cadence; pre-stage backup tracker.';
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
