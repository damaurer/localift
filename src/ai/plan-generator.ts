/**
 * Single-shot workout plan generation.
 *
 * Instead of letting the chat model assemble a plan over many tool calls, the
 * whole plan is produced in ONE completion whose output is grammar-constrained
 * to a JSON schema: `exerciseId` may only be an id from a pre-filtered library
 * catalog, so the model can neither break the JSON nor invent exercises.
 * When target muscles are given, every exercise slot is bound to one muscle
 * (round-robin) and may only hold exercises primarily training it, so the
 * grammar also enforces a balanced plan.
 * Models whose template cannot build the grammar fall back to unconstrained
 * JSON that is parsed leniently and validated against the catalog.
 */

import type { Exercise } from '../types/workout.types.ts';
import { isKnownMuscle, primarilyTrains, searchExercises, trainsMuscle } from './exercise-search.ts';
import { extractFirstJsonObject } from './tool-parsing.ts';
import { GrammarUnsupportedError, runChatCompletion } from './wllama-service.ts';

export interface PlanRequest {
  /** Free-text goal in the user's words, e.g. "Push-Tag für Muskelaufbau". */
  goal: string;
  /** Target muscle groups (English MuscleGroup values or German names). */
  muscleGroups?: string[];
  /** Allowed equipment (barbell, dumbbell, …). Empty = everything. */
  equipment?: string[];
  /** Desired number of exercises (clamped to 3–8, default 5). */
  exerciseCount?: number;
  /**
   * The user's original chat message. Small chat models often drop details
   * ("zu Hause", "Anfänger") from `goal`, so keyword detection reads both.
   */
  userRequest?: string;
}

export interface GeneratedPlanExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface GeneratedPlan {
  name: string;
  description: string;
  exercises: GeneratedPlanExercise[];
}

/** Upper bound for catalog lines in the prompt (prompt length = latency). */
const MAX_CATALOG = 40;

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Brust', back: 'Rücken', shoulders: 'Schultern', biceps: 'Bizeps',
  triceps: 'Trizeps', abs: 'Bauch', legs: 'Beine', glutes: 'Gesäß',
};

/** One exercise position in the plan and the exercises allowed there. */
export interface PlanSlot {
  /** Target muscle shown to the model, or '' when the slot is unrestricted. */
  label: string;
  candidates: Exercise[];
}

/** Rep and rest ranges for the training focus; enforced by the grammar. */
export interface TrainingFocus {
  label: string;
  reps: [number, number];
  rest: [number, number];
}

/** Training splits named in the request → their target muscles. */
const SPLIT_MUSCLES: [RegExp, string[]][] = [
  [/\bpush\b/, ['chest', 'shoulders', 'triceps']],
  [/\bpull\b/, ['back', 'biceps']],
  [/beintag|\bbeine\b|unterkörper|\blegs?\b/, ['legs', 'glutes']],
  [/oberkörper|upper/, ['chest', 'back', 'shoulders']],
  [/\barm/, ['biceps', 'triceps']],
];
/** Single muscles named in the request. */
const NAMED_MUSCLES: [RegExp, string[]][] = [
  [/brust/, ['chest']],
  [/rücken/, ['back']],
  [/schulter/, ['shoulders']],
  [/bauch|core|\babs\b/, ['abs']],
  [/gesäß|glute|\bpo\b/, ['glutes']],
];
const FULL_BODY = ['legs', 'chest', 'back', 'shoulders', 'abs'];

/** Lower-cased goal plus original user message, for keyword detection. */
const requestText = (req: PlanRequest) => `${req.goal} ${req.userRequest ?? ''}`.toLowerCase();

const isBeginner = (goal: string) => /anfänger|einsteiger|beginner/.test(goal);
const isAdvanced = (goal: string) => /fortgeschritten|experte|profi|advanced/.test(goal);
const wantsCardio = (goal: string) => /ausdauer|kondition|hiit|cardio|abnehmen|fettverbrennung/.test(goal);
const wantsMobility = (goal: string) => /mobil|dehn|beweglich|stretch|yoga/.test(goal);

export function clampExerciseCount(count: number | undefined): number {
  return Math.min(Math.max(Math.round(Number(count) || 5), 3), 8);
}

export function trainingFocus(goal: string): TrainingFocus {
  const g = goal.toLowerCase();
  if (wantsCardio(g)) return { label: 'Ausdauer', reps: [12, 20], rest: [30, 60] };
  if (isBeginner(g)) return { label: 'Einsteiger', reps: [8, 15], rest: [60, 90] };
  if (/kraft|stärke|maximal|strength/.test(g) && !/kraftausdauer/.test(g)) {
    return { label: 'Kraft', reps: [3, 6], rest: [120, 240] };
  }
  return { label: 'Muskelaufbau', reps: [6, 12], rest: [60, 120] };
}

/**
 * Fills gaps the chat model left in the request from the goal text:
 * target muscles (full body when nothing matches) and bodyweight-only
 * training for "ohne Geräte" / "zu Hause".
 */
export function resolveRequest(req: PlanRequest): PlanRequest {
  const text = requestText(req);
  const explicit = (req.muscleGroups ?? []).filter(isKnownMuscle);
  const matching = (table: [RegExp, string[]][]) => table.filter(([re]) => re.test(text)).flatMap(([, m]) => m);
  const split = matching(SPLIT_MUSCLES);
  const named = matching(NAMED_MUSCLES);
  const fullBody = /ganzkörper|ganzkoerper|full ?body/.test(text);
  // A split the user named ("Push") decides on its own — small chat models
  // often add unrelated muscles. Otherwise the model's choice is completed
  // with muscles the user named.
  const chosen = [...new Set(split.length ? [...split, ...named] : [...explicit, ...named])];
  const muscleGroups = fullBody ? FULL_BODY : chosen.length ? chosen : FULL_BODY;
  // What the user said beats what the chat model passed on.
  const bodyweightOnly = /ohne (geräte|equipment|hantel)|eigengewicht|bodyweight|zu ?hause|daheim|calisthenics/.test(text);
  const equipment = bodyweightOnly ? ['bodyweight'] : req.equipment ?? [];
  return { ...req, muscleGroups, equipment };
}

/**
 * Narrows the library to the exercises worth offering for this request:
 * no stretches/cardio/expert lifts unless the goal asks for them, requested
 * equipment (bodyweight always allowed), then requested muscle groups, then
 * goal keywords — each step only applies if enough exercises remain.
 */
export function selectCatalog(library: Exercise[], req: PlanRequest): Exercise[] {
  const minimum = clampExerciseCount(req.exerciseCount) + 2;
  const goal = requestText(req);
  const labels = (e: Exercise) => [e.category, ...(e.tags ?? [])].map(t => String(t).toLowerCase());
  let catalog = library;
  const keep = (predicate: (e: Exercise) => boolean) => {
    const filtered = catalog.filter(predicate);
    if (filtered.length >= minimum) catalog = filtered;
  };

  if (!wantsMobility(goal)) keep(e => !labels(e).some(t => t === 'mobilität' || t === 'dehnen'));
  if (!wantsCardio(goal)) keep(e => !labels(e).includes('cardio'));
  if (isBeginner(goal)) keep(e => !labels(e).some(t => t === 'experte' || t === 'fortgeschritten'));
  else if (!isAdvanced(goal)) keep(e => !labels(e).includes('experte'));

  const equipment = (req.equipment ?? []).map(e => e.toLowerCase());
  if (equipment.length) keep(e => equipment.includes(e.equipment) || e.equipment === 'bodyweight');

  const muscles = req.muscleGroups ?? [];
  if (muscles.length) keep(e => muscles.some(m => trainsMuscle(e, m)));

  if (catalog.length > MAX_CATALOG) {
    const ranked = searchExercises(catalog, req.goal);
    const rest = catalog.filter(e => !ranked.includes(e));
    catalog = [...ranked, ...rest].slice(0, MAX_CATALOG);
  }

  return catalog;
}

/**
 * Assigns each exercise position a target muscle (round-robin over the
 * requested muscles). Slots get disjoint candidate sets wherever possible so
 * the same exercise cannot fill two positions.
 */
export function planSlots(catalog: Exercise[], req: PlanRequest, exerciseCount: number): PlanSlot[] {
  const groups = req.muscleGroups ?? [];
  if (!groups.length) {
    return Array.from({ length: exerciseCount }, () => ({ label: '', candidates: catalog }));
  }

  const occurrences = (g: number) => Math.ceil((exerciseCount - g) / groups.length);
  const slots: PlanSlot[] = Array.from({ length: exerciseCount }, (_, i) => {
    const groupIndex = i % groups.length;
    const group = groups[groupIndex];
    const label = MUSCLE_LABELS[group.toLowerCase()] ?? group;
    const primary = catalog.filter(e => primarilyTrains(e, group));
    const pool = primary.length ? primary : catalog.filter(e => trainsMuscle(e, group));
    if (!pool.length) return { label, candidates: catalog };

    const total = occurrences(groupIndex);
    const occurrence = Math.floor(i / groups.length);
    const share = pool.filter((_, idx) => idx % total === occurrence);
    return { label, candidates: share.length ? share : pool };
  });

  // Exercises that train several target muscles (push-ups: chest + shoulders)
  // stay with the earliest slot, unless that would leave a slot empty.
  const taken = new Set<string>();
  return slots.map(slot => {
    const free = slot.candidates.filter(e => !taken.has(e.id));
    const candidates = free.length ? free : slot.candidates;
    candidates.forEach(e => taken.add(e.id));
    return { ...slot, candidates };
  });
}

function slotKey(slot: PlanSlot, index: number): string {
  return slot.label ? `${index + 1}_${slot.label}` : `${index + 1}`;
}

export function buildPlanSchema(slots: PlanSlot[], focus: TrainingFocus): Record<string, unknown> {
  const item = (candidates: Exercise[]) => ({
    type: 'object',
    properties: {
      exerciseId: { type: 'string', enum: candidates.map(e => e.id) },
      sets: { type: 'integer', minimum: 2, maximum: 5 },
      reps: { type: 'integer', minimum: focus.reps[0], maximum: focus.reps[1] },
      restSeconds: { type: 'integer', minimum: focus.rest[0], maximum: focus.rest[1] },
    },
    required: ['exerciseId', 'sets', 'reps', 'restSeconds'],
  });
  const keys = slots.map(slotKey);

  return {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      exercises: {
        type: 'object',
        properties: Object.fromEntries(slots.map((slot, i) => [keys[i], item(slot.candidates)])),
        required: keys,
      },
    },
    required: ['name', 'description', 'exercises'],
  };
}

function buildPlanPrompt(
  req: PlanRequest,
  catalog: Exercise[],
  slots: PlanSlot[],
  focus: TrainingFocus,
  withFormat: boolean,
): string {
  const lines = catalog.map(e => `${e.id}: ${e.name} (${e.equipment}; ${e.muscleGroups.join(', ')})`);
  const exerciseCount = slots.length;
  const targets = slots.some(s => s.label)
    ? `\nZielmuskel je Übung: ${slots.map((s, i) => `${i + 1}. ${s.label}`).join(', ')}`
    : '';
  const format = withFormat
    ? '\nAntworte NUR mit JSON: {"name": "...", "description": "...", "exercises": [{"exerciseId": "...", "sets": 3, "reps": 10, "restSeconds": 90}]}'
    : '';

  return `Du bist ein erfahrener Personal Trainer und erstellst einen Trainingsplan auf Deutsch.
Ziel des Nutzers: ${req.goal}${targets}

Regeln:
- Genau ${exerciseCount} Übungen, jede Übung nur einmal.
- Verteile die Übungen sinnvoll auf alle Zielmuskeln: zuerst schwere Grundübungen, danach Isolationsübungen.
- Trainingsfokus ${focus.label}: ${focus.reps[0]}–${focus.reps[1]} Wiederholungen, ${focus.rest[0]}–${focus.rest[1]} s Pause; Grundübungen mit weniger Wdh. und längerer Pause als Isolationsübungen.
- Kurzer, motivierender Planname und eine Beschreibung in 1–2 Sätzen.
- Verwende ausschließlich Übungen aus diesem Katalog (ID: Name (Equipment; Muskeln)):
${lines.join('\n')}${format}`;
}

/** Drops unknown/duplicate exercises and clamps numbers to sane ranges. */
export function sanitizePlan(raw: unknown, catalog: Exercise[]): GeneratedPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as { name?: unknown; description?: unknown; exercises?: unknown };
  const ids = new Set(catalog.map(e => e.id));
  const seen = new Set<string>();
  const clamp = (v: unknown, min: number, max: number, fallback: number) =>
    Math.min(Math.max(Math.round(Number(v)) || fallback, min), max);

  // Grammar-constrained output keys exercises by slot; fallback JSON uses an array.
  const list = Array.isArray(data.exercises)
    ? data.exercises
    : data.exercises && typeof data.exercises === 'object' ? Object.values(data.exercises) : [];
  const exercises = list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .filter(x => {
      const id = String(x.exerciseId ?? '');
      if (!ids.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map(x => ({
      exerciseId: String(x.exerciseId),
      sets: clamp(x.sets, 1, 6, 3),
      reps: clamp(x.reps, 3, 20, 10),
      restSeconds: clamp(x.restSeconds, 30, 240, 90),
    }));

  if (!exercises.length) return null;
  return {
    name: String(data.name ?? '').trim() || 'KI-Trainingsplan',
    description: String(data.description ?? '').trim(),
    exercises,
  };
}

export async function generateWorkoutPlan(request: PlanRequest, library: Exercise[]): Promise<GeneratedPlan> {
  const req = resolveRequest(request);
  const focus = trainingFocus(requestText(req));
  const catalog = selectCatalog(library, req);
  if (!catalog.length) throw new Error('Die Übungsbibliothek ist leer.');
  const exerciseCount = Math.min(clampExerciseCount(req.exerciseCount), catalog.length);
  const slots = planSlots(catalog, req, exerciseCount);

  let text: string;
  try {
    const result = await runChatCompletion(
      [{ role: 'user', content: buildPlanPrompt(req, catalog, slots, focus, false) }],
      { maxTokens: 160 + exerciseCount * 60, temperature: 0.3, jsonSchema: buildPlanSchema(slots, focus) },
    );
    text = result.text;
  } catch (err) {
    if (!(err instanceof GrammarUnsupportedError)) throw err;
    const result = await runChatCompletion(
      [{ role: 'user', content: buildPlanPrompt(req, catalog, slots, focus, true) }],
      { maxTokens: 160 + exerciseCount * 60, temperature: 0.3 },
    );
    text = result.text;
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(extractFirstJsonObject(text) ?? text);
  } catch { /* handled below */ }

  const plan = sanitizePlan(parsed, catalog);
  if (!plan) throw new Error('Das Modell hat keinen gültigen Plan geliefert.');
  return plan;
}
