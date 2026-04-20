import { create } from 'zustand';
import { MISSION_EDGES, edgeKey, initialEdgeHealth } from '@/sim/graph';
import { createObservationState, initPacketSchedule, rescheduleEdge } from '@/sim/observations';
import { deliverPacket, processPackets } from '@/sim/packets';
import { computeAi, computeBaseline } from '@/sim/policies';
import { TOUR_DURATION_SEC, buildScriptedTour, sortEvents } from '@/sim/scenario';
import type { AiPanelSnapshot, KpiSnapshot, LinkHealth, LogEntry, ScenarioEvent } from '@/sim/types';
import {
  advanceAngles,
  bumpFormationError,
  createInitialWorld,
  decayFormationError,
  setEdgeHealth,
  type WorldSnapshot,
} from '@/sim/world';

const LOG_CAP = 120;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface DelayStorm {
  until: number;
  factor: number;
}

interface ContinuitySample {
  t: number;
  baseline: number;
  ai: number;
}

interface MissionState {
  world: WorldSnapshot;
  edgeHealth: Map<string, LinkHealth>;
  obs: ReturnType<typeof createObservationState>;
  pendingEvents: ScenarioEvent[];
  tourActive: boolean;
  tourStartSimTime: number;
  baselineDegradedAccum: number;
  aiDegradedAccum: number;
  baselineKpi: KpiSnapshot;
  aiKpi: KpiSnapshot;
  aiPanel: AiPanelSnapshot;
  /** Smoothed copy of aiPanel for the UI — no jitter on every tick. */
  aiPanelDisplay: AiPanelSnapshot;
  logs: LogEntry[];
  lastAiCoordinator: number;
  delayStorm: DelayStorm | null;
  displayLink: Map<string, number>;
  /** Rolling continuity series for the baseline-vs-AI sparkline. */
  continuityHistory: ContinuitySample[];

  reset: () => void;
  tick: (dt: number) => void;
  pushLog: (message: string, type: LogEntry['type']) => void;
  injectLinkLoss: (a: number, b: number) => void;
  injectDegraded: (a: number, b: number) => void;
  injectDelay: () => void;
  injectDisturbance: () => void;
  injectRoleFailure: () => void;
  restoreAllLinks: () => void;
  startScriptedTour: () => void;
}

function defaultKpi(): KpiSnapshot {
  return {
    missionContinuity: 100,
    tasksSatisfied: 3,
    swarmUncertainty: 4,
    degradedCommsSec: 0,
  };
}

function defaultPanel(): AiPanelSnapshot {
  return {
    minConfidence: 0.9,
    predictedNeighborSummary: 'Δθ̂ within sensor noise.',
    risk: 'low',
    riskReason: 'Nominal operations.',
    recommendation: 'Hold roles; maintain current task allocation.',
    estimatorActive: false,
    coordinatorId: 0,
  };
}

function seedObservations(
  world: WorldSnapshot,
  obs: ReturnType<typeof createObservationState>,
  edgeHealth: ReadonlyMap<string, LinkHealth>,
): void {
  for (let i = 0; i < world.angles.length; i++) {
    for (let j = 0; j < world.angles.length; j++) {
      obs.obsTime[i]![j] = -1e9;
      obs.obsAngle[i]![j] = 0;
    }
  }
  for (const [a, b] of MISSION_EDGES) {
    deliverPacket(obs, world.simTime, a, b, world.angles);
    deliverPacket(obs, world.simTime, b, a, world.angles);
  }
  initPacketSchedule(obs.nextPacketDue, world.simTime, edgeHealth, world.delayFactor, MISSION_EDGES);
}

function makeSeededInitial(): Pick<MissionState, 'world' | 'edgeHealth' | 'obs'> {
  const world = createInitialWorld();
  const edgeHealth = initialEdgeHealth();
  const obs = createObservationState();
  seedObservations(world, obs, edgeHealth);
  return { world, edgeHealth, obs };
}

const __seeded = makeSeededInitial();

export const useMissionStore = create<MissionState>((set, get) => ({
  world: __seeded.world,
  edgeHealth: __seeded.edgeHealth,
  obs: __seeded.obs,
  pendingEvents: [],
  tourActive: false,
  tourStartSimTime: -1,
  baselineDegradedAccum: 0,
  aiDegradedAccum: 0,
  baselineKpi: defaultKpi(),
  aiKpi: defaultKpi(),
  aiPanel: defaultPanel(),
  aiPanelDisplay: defaultPanel(),
  logs: [
    {
      id: uid(),
      t: 0,
      message: 'Mission control session initialized.',
      type: 'success',
    },
  ],
  lastAiCoordinator: 0,
  delayStorm: null,
  displayLink: new Map(),
  continuityHistory: [],

  pushLog: (message, type) => {
    set((s) => ({
      logs: [...s.logs, { id: uid(), t: s.world.simTime, message, type }].slice(-LOG_CAP),
    }));
  },

  reset: () => {
    const world = createInitialWorld();
    const edgeHealth = initialEdgeHealth();
    const obs = createObservationState();
    seedObservations(world, obs, edgeHealth);
    set({
      world,
      edgeHealth,
      obs,
      pendingEvents: [],
      tourActive: false,
      tourStartSimTime: -1,
      baselineDegradedAccum: 0,
      aiDegradedAccum: 0,
      baselineKpi: defaultKpi(),
      aiKpi: defaultKpi(),
      aiPanel: defaultPanel(),
      aiPanelDisplay: defaultPanel(),
      lastAiCoordinator: 0,
      delayStorm: null,
      displayLink: new Map(),
      continuityHistory: [],
      logs: [
        {
          id: uid(),
          t: 0,
          message: 'Demo reset — swarm nominal.',
          type: 'success',
        },
      ],
    });
  },

  injectLinkLoss: (a, b) => {
    const { world, edgeHealth, obs, pushLog } = get();
    const eh = new Map(edgeHealth);
    setEdgeHealth(eh, a, b, 'lost');
    const o = {
      obsTime: obs.obsTime.map((r) => [...r]),
      obsAngle: obs.obsAngle.map((r) => [...r]),
      nextPacketDue: new Map(obs.nextPacketDue),
    };
    rescheduleEdge(o.nextPacketDue, edgeKey(a, b), world.simTime, 'lost', world.delayFactor);
    pushLog(`Operator: forced outage Sat-${a + 1}↔Sat-${b + 1}`, 'warning');
    set({ edgeHealth: eh, obs: o });
  },

  injectDegraded: (a, b) => {
    const { world, edgeHealth, obs, pushLog } = get();
    const eh = new Map(edgeHealth);
    setEdgeHealth(eh, a, b, 'degraded');
    const o = {
      obsTime: obs.obsTime.map((r) => [...r]),
      obsAngle: obs.obsAngle.map((r) => [...r]),
      nextPacketDue: new Map(obs.nextPacketDue),
    };
    rescheduleEdge(o.nextPacketDue, edgeKey(a, b), world.simTime, 'degraded', world.delayFactor);
    pushLog(`Operator: degraded link Sat-${a + 1}↔Sat-${b + 1}`, 'warning');
    set({ edgeHealth: eh, obs: o });
  },

  injectDelay: () => {
    const { world, pushLog } = get();
    const ev: ScenarioEvent = { t: world.simTime + 0.05, kind: 'delayStorm', factor: 2.4, durationSec: 14 };
    set((s) => ({ pendingEvents: sortEvents([...s.pendingEvents, ev]) }));
    pushLog('Operator: queued delayed-update storm', 'info');
  },

  injectDisturbance: () => {
    const { world, pushLog } = get();
    const ev: ScenarioEvent = { t: world.simTime + 0.05, kind: 'disturbance', intensity: 0.55, durationSec: 10 };
    set((s) => ({ pendingEvents: sortEvents([...s.pendingEvents, ev]) }));
    pushLog('Operator: queued external disturbance', 'info');
  },

  injectRoleFailure: () => {
    const { world, pushLog } = get();
    const ev: ScenarioEvent = { t: world.simTime + 0.05, kind: 'roleFailure', node: 0, durationSec: 12 };
    set((s) => ({ pendingEvents: sortEvents([...s.pendingEvents, ev]) }));
    pushLog('Operator: queued coordinator role failure', 'info');
  },

  restoreAllLinks: () => {
    const { world, obs, pushLog } = get();
    const edgeHealth = initialEdgeHealth();
    const o = {
      obsTime: obs.obsTime.map((r) => [...r]),
      obsAngle: obs.obsAngle.map((r) => [...r]),
      nextPacketDue: new Map(obs.nextPacketDue),
    };
    for (const [a, b] of MISSION_EDGES) {
      rescheduleEdge(o.nextPacketDue, edgeKey(a, b), world.simTime, 'ok', world.delayFactor);
    }
    pushLog('Operator: restored all links to nominal', 'success');
    set({ edgeHealth, obs: o });
  },

  startScriptedTour: () => {
    const { world, pushLog } = get();
    const tourStart = world.simTime + 0.25;
    const events = buildScriptedTour(tourStart);
    set({ pendingEvents: sortEvents(events), tourActive: true, tourStartSimTime: tourStart });
    pushLog('Presenter: scripted tour armed (≈75s)', 'info');
  },

  tick: (dt) => {
    const s = get();
    if (dt <= 0 || dt > 0.35) return;

    const pushLog = get().pushLog;

    let world: WorldSnapshot = { ...s.world };
    let edgeHealth = new Map(s.edgeHealth);
    let obs = {
      obsTime: s.obs.obsTime.map((r) => [...r]),
      obsAngle: s.obs.obsAngle.map((r) => [...r]),
      nextPacketDue: new Map(s.obs.nextPacketDue),
    };
    let pending = [...s.pendingEvents];
    let delayStorm = s.delayStorm;

    const newTime = world.simTime + dt;

    if (delayStorm && newTime >= delayStorm.until) {
      world.delayFactor = 1;
      delayStorm = null;
      initPacketSchedule(obs.nextPacketDue, newTime, edgeHealth, 1, MISSION_EDGES);
      pushLog('Telemetry storm cleared — nominal cadence', 'success');
    }

    const rest: ScenarioEvent[] = [];
    for (const ev of sortEvents(pending)) {
      if (ev.t > newTime) {
        rest.push(ev);
        continue;
      }
      if (ev.kind === 'setEdge') {
        setEdgeHealth(edgeHealth, ev.a, ev.b, ev.health);
        pushLog(`Scenario: link Sat-${ev.a + 1}↔Sat-${ev.b + 1} → ${ev.health}`, ev.health === 'lost' ? 'warning' : 'info');
        rescheduleEdge(obs.nextPacketDue, edgeKey(ev.a, ev.b), newTime, ev.health, world.delayFactor);
      } else if (ev.kind === 'disturbance') {
        world.formationError = bumpFormationError(world.formationError, ev.intensity);
        pushLog(`Scenario: external disturbance Δ=${ev.intensity.toFixed(2)}`, 'warning');
      } else if (ev.kind === 'roleFailure') {
        world.roleFailureUntil = newTime + ev.durationSec;
        pushLog(`Scenario: coordinator role degradation on Sat-${ev.node + 1}`, 'error');
      } else if (ev.kind === 'delayStorm') {
        delayStorm = { until: newTime + ev.durationSec, factor: ev.factor };
        world.delayFactor = ev.factor;
        initPacketSchedule(obs.nextPacketDue, newTime, edgeHealth, ev.factor, MISSION_EDGES);
        pushLog(`Scenario: delayed telemetry storm ×${ev.factor.toFixed(1)}`, 'warning');
      }
    }
    pending = rest;

    const calm =
      MISSION_EDGES.every(([a, b]) => (edgeHealth.get(edgeKey(a, b)) ?? 'ok') === 'ok') && world.delayFactor <= 1.05;
    world.formationError = decayFormationError(world.formationError, dt, calm);
    world.angles = advanceAngles([...world.angles], dt);
    world.simTime = newTime;

    processPackets(world, obs, edgeHealth, world.delayFactor);

    const roleFailureActive = world.simTime < world.roleFailureUntil;

    const base = computeBaseline(
      world.angles,
      world.formationError,
      obs.obsTime,
      world.simTime,
      edgeHealth,
      s.baselineDegradedAccum,
      dt,
    );

    const ai = computeAi(
      world.angles,
      world.formationError,
      obs.obsTime,
      obs.obsAngle,
      world.simTime,
      edgeHealth,
      s.aiDegradedAccum,
      dt,
      roleFailureActive,
    );

    if (ai.panel.estimatorActive && !s.aiPanel.estimatorActive && world.simTime > 0.08) {
      pushLog('AI: state estimation activated (dead-reckoning fusion)', 'info');
    }
    if (ai.panel.coordinatorId !== s.lastAiCoordinator && world.simTime > 0.08) {
      pushLog(`AI: coordinator reassigned → Sat-${ai.panel.coordinatorId + 1}`, 'success');
    }

    const displayLink = new Map(s.displayLink);
    const targetVal = (h: LinkHealth) => (h === 'ok' ? 0 : h === 'degraded' ? 1 : 2);
    const smooth = (cur: number, tgt: number) => {
      const rate = 6 * dt;
      if (cur < tgt) return Math.min(tgt, cur + rate);
      if (cur > tgt) return Math.max(tgt, cur - rate);
      return cur;
    };
    for (const [a, b] of MISSION_EDGES) {
      const k = edgeKey(a, b);
      const tgt = targetVal(edgeHealth.get(k) ?? 'ok');
      const cur = displayLink.get(k) ?? tgt;
      displayLink.set(k, smooth(cur, tgt));
    }

    /** Low-pass the AI panel readouts so text doesn't jitter every tick. */
    const lerp = (a: number, b: number, alpha: number) => a + (b - a) * alpha;
    const alpha = Math.min(1, dt * 3.5);
    const displayPanel: AiPanelSnapshot = {
      minConfidence: lerp(s.aiPanelDisplay.minConfidence, ai.panel.minConfidence, alpha),
      predictedNeighborSummary: ai.panel.predictedNeighborSummary,
      risk: ai.panel.risk,
      riskReason: ai.panel.riskReason,
      recommendation: ai.panel.recommendation,
      estimatorActive: ai.panel.estimatorActive,
      coordinatorId: ai.panel.coordinatorId,
    };

    /** Keep ~600 samples (≈60 s at 10 Hz throttle). */
    const nextHistory = s.continuityHistory.slice();
    const lastSample = nextHistory[nextHistory.length - 1];
    if (!lastSample || world.simTime - lastSample.t > 0.25) {
      nextHistory.push({ t: world.simTime, baseline: base.kpi.missionContinuity, ai: ai.kpi.missionContinuity });
      if (nextHistory.length > 320) nextHistory.shift();
    }

    /** Auto-disarm tour once the narration window is over. */
    let tourActive = s.tourActive;
    if (tourActive && s.tourStartSimTime >= 0 && world.simTime - s.tourStartSimTime > TOUR_DURATION_SEC + 2) {
      tourActive = false;
    }

    set({
      world,
      edgeHealth,
      obs,
      pendingEvents: pending,
      delayStorm,
      baselineDegradedAccum: base.degradedAccum,
      aiDegradedAccum: ai.degradedAccum,
      baselineKpi: base.kpi,
      aiKpi: ai.kpi,
      aiPanel: ai.panel,
      aiPanelDisplay: displayPanel,
      lastAiCoordinator: ai.panel.coordinatorId,
      displayLink,
      continuityHistory: nextHistory,
      tourActive,
    });
  },
}));
