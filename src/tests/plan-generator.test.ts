import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../types/workout.types.ts';

const service = vi.hoisted(() => ({
  responses: [] as (string | Error)[],
  calls: [] as { messages: { content: string }[]; options: { jsonSchema?: Record<string, unknown> } }[],
}));

vi.mock('../ai/wllama-service.ts', () => {
  class GrammarUnsupportedError extends Error {}
  return {
    GrammarUnsupportedError,
    runChatCompletion: vi.fn(async (messages: { content: string }[], options: { jsonSchema?: Record<string, unknown> }) => {
      service.calls.push({ messages, options });
      const next = service.responses.shift() ?? '{}';
      if (next instanceof Error) throw next;
      return { text: next, toolCalls: [] };
    }),
  };
});

const { buildPlanSchema, generateWorkoutPlan, planSlots, resolveRequest, sanitizePlan, selectCatalog, trainingFocus } = await import('../ai/plan-generator.ts');
const { GrammarUnsupportedError } = await import('../ai/wllama-service.ts');

const ex = (id: string, equipment: Exercise['equipment'], muscleGroups: string[], name = id): Exercise =>
  ({ id, name, equipment, muscleGroups, category: 'Test' }) as unknown as Exercise;

const library: Exercise[] = [
  ex('bench', 'barbell', ['Brust', 'Trizeps'], 'Bankdrücken'),
  ex('db-press', 'dumbbell', ['Brust', 'Schultern'], 'Kurzhantel-Bankdrücken'),
  ex('ohp', 'barbell', ['Schultern', 'Trizeps'], 'Schulterdrücken'),
  ex('dips', 'bodyweight', ['Brust', 'Trizeps'], 'Dips'),
  ex('cable-fly', 'cable', ['Brust'], 'Kabelzug Crossover'),
  ex('squat', 'barbell', ['Oberschenkel', 'Gesäß'], 'Kniebeuge'),
  ex('curl', 'dumbbell', ['Bizeps'], 'Curls'),
  ex('pushdown', 'dumbbell', ['Trizeps'], 'Trizepsdrücken'),
];

beforeEach(() => {
  service.responses = [];
  service.calls = [];
});

describe('selectCatalog', () => {
  it('keeps only requested equipment (plus bodyweight) and target muscles', () => {
    const catalog = selectCatalog(library, {
      goal: 'Push',
      equipment: ['barbell', 'dumbbell'],
      muscleGroups: ['chest', 'shoulders', 'triceps'],
      exerciseCount: 3,
    });
    expect(catalog.map(e => e.id).sort()).toEqual(['bench', 'db-press', 'dips', 'ohp', 'pushdown']);
  });

  it('leaves out stretches and cardio unless the goal asks for them', () => {
    const extended = [
      ...library,
      { ...library[0], id: 'stretch', category: 'Mobilität', tags: ['Dehnen'] },
      { ...library[0], id: 'sprint', category: 'Cardio' },
    ] as Exercise[];
    const strength = selectCatalog(extended, { goal: 'Muskelaufbau', exerciseCount: 3 }).map(e => e.id);
    expect(strength).not.toContain('stretch');
    expect(strength).not.toContain('sprint');
    expect(selectCatalog(extended, { goal: 'Mobilität und Dehnen', exerciseCount: 3 }).map(e => e.id)).toContain('stretch');
  });

  it('ignores a filter that would leave too few exercises', () => {
    const catalog = selectCatalog(library, { goal: 'x', equipment: ['machine'], exerciseCount: 3 });
    expect(catalog).toHaveLength(library.length);
  });
});

describe('trainingFocus', () => {
  it.each([
    ['Beintag für Kraft', 'Kraft'],
    ['Push-Tag für Muskelaufbau', 'Muskelaufbau'],
    ['HIIT zum Abnehmen', 'Ausdauer'],
    ['Krafttraining für Anfänger', 'Einsteiger'],
  ])('%s → %s', (goal, label) => {
    expect(trainingFocus(goal).label).toBe(label);
  });
});

describe('resolveRequest', () => {
  it('infers target muscles from the goal', () => {
    expect(resolveRequest({ goal: 'Beintag' }).muscleGroups).toEqual(['legs', 'glutes']);
    expect(resolveRequest({ goal: 'Push-Tag' }).muscleGroups).toEqual(['chest', 'shoulders', 'triceps']);
  });

  it('defaults to full body and keeps explicit muscles', () => {
    expect(resolveRequest({ goal: 'Ganzkörper für Anfänger' }).muscleGroups).toEqual(['legs', 'chest', 'back', 'shoulders', 'abs']);
    expect(resolveRequest({ goal: 'Muskelaufbau', muscleGroups: ['chest'] }).muscleGroups).toEqual(['chest']);
  });

  it('reads details the chat model dropped from the original user message', () => {
    const req = resolveRequest({
      goal: 'Ganzkörper für Anfänger',
      muscleGroups: ['chest', 'back'],
      equipment: ['dumbbell'],
      userRequest: 'Ich trainiere zu Hause ohne Geräte.',
    });
    expect(req.equipment).toEqual(['bodyweight']);
    expect(req.muscleGroups).toEqual(['legs', 'chest', 'back', 'shoulders', 'abs']);
    expect(trainingFocus(`${req.goal} ${req.userRequest}`).label).toBe('Einsteiger');
  });

  it('drops unknown muscle names', () => {
    expect(resolveRequest({ goal: 'Muskelaufbau', muscleGroups: ['chest', 'abdomen', 'wings'] }).muscleGroups).toEqual(['chest', 'abdomen']);
  });

  it('lets a named split decide over the model selection', () => {
    expect(resolveRequest({ goal: 'Pull-Tag', muscleGroups: ['back'] }).muscleGroups).toEqual(['back', 'biceps']);
    expect(resolveRequest({ goal: 'Push-Training', muscleGroups: ['chest', 'back', 'shoulders'] }).muscleGroups)
      .toEqual(['chest', 'shoulders', 'triceps']);
    expect(resolveRequest({ goal: 'Push-Tag mit Bauch' }).muscleGroups).toEqual(['chest', 'shoulders', 'triceps', 'abs']);
  });

  it('completes the model selection with muscles the user named', () => {
    expect(resolveRequest({ goal: 'Muskelaufbau', muscleGroups: ['legs'], userRequest: 'auch etwas Brust' }).muscleGroups)
      .toEqual(['legs', 'chest']);
  });

  it('switches to bodyweight for training without equipment', () => {
    expect(resolveRequest({ goal: 'Workout zu Hause ohne Geräte' }).equipment).toEqual(['bodyweight']);
    expect(resolveRequest({ goal: 'Push', equipment: ['dumbbell'] }).equipment).toEqual(['dumbbell']);
  });
});

describe('planSlots', () => {
  it('assigns target muscles round-robin with primary-muscle candidates', () => {
    const slots = planSlots(library, { goal: 'Push', muscleGroups: ['chest', 'shoulders', 'triceps'] }, 3);
    expect(slots.map(s => s.label)).toEqual(['Brust', 'Schultern', 'Trizeps']);
    expect(slots[1].candidates.map(e => e.id)).toEqual(['ohp']);
    expect(slots[2].candidates.map(e => e.id)).toEqual(['pushdown']);
  });

  it('gives repeated muscles disjoint candidates so no exercise appears twice', () => {
    const slots = planSlots(library, { goal: 'Brust', muscleGroups: ['chest'] }, 2);
    const [first, second] = slots.map(s => s.candidates.map(e => e.id));
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBeGreaterThan(0);
    expect(first.filter(id => second.includes(id))).toEqual([]);
  });

  it('keeps exercises that train several target muscles in the earliest slot', () => {
    const small = [
      ex('bench', 'barbell', ['Brust']),
      ex('pushup', 'bodyweight', ['Brust', 'Schultern']),
      ex('dip', 'bodyweight', ['Trizeps', 'Schultern']),
    ];
    const [chest, shoulders] = planSlots(small, { goal: 'x', muscleGroups: ['chest', 'shoulders'] }, 2);
    expect(chest.candidates.map(e => e.id)).toEqual(['bench', 'pushup']);
    expect(shoulders.candidates.map(e => e.id)).toEqual(['dip']);
  });

  it('leaves slots unrestricted without target muscles', () => {
    const slots = planSlots(library, { goal: 'Ganzkörper' }, 2);
    expect(slots.every(s => s.label === '' && s.candidates.length === library.length)).toBe(true);
  });
});

describe('buildPlanSchema', () => {
  it('restricts each slot to its candidate ids', () => {
    const schema = buildPlanSchema([
      { label: 'Brust', candidates: library.slice(0, 2) },
      { label: 'Schultern', candidates: [library[2]] },
    ], { label: 'Kraft', reps: [3, 6], rest: [120, 240] }) as {
      properties: { exercises: { required: string[]; properties: Record<string, { properties: { exerciseId: { enum: string[] }; reps: { minimum: number; maximum: number } } }> } };
    };
    expect(schema.properties.exercises.required).toEqual(['1_Brust', '2_Schultern']);
    expect(schema.properties.exercises.properties['1_Brust'].properties.exerciseId.enum).toEqual(['bench', 'db-press']);
    expect(schema.properties.exercises.properties['2_Schultern'].properties.exerciseId.enum).toEqual(['ohp']);
    expect(schema.properties.exercises.properties['1_Brust'].properties.reps).toMatchObject({ minimum: 3, maximum: 6 });
  });
});

describe('sanitizePlan', () => {
  it('drops unknown and duplicate exercises and clamps numbers', () => {
    const plan = sanitizePlan({
      name: ' Push ',
      exercises: [
        { exerciseId: 'bench', sets: 99, reps: 1, restSeconds: 5 },
        { exerciseId: 'bench', sets: 3, reps: 10, restSeconds: 90 },
        { exerciseId: 'made-up', sets: 3, reps: 10, restSeconds: 90 },
      ],
    }, library);
    expect(plan).toEqual({
      name: 'Push',
      description: '',
      exercises: [{ exerciseId: 'bench', sets: 6, reps: 3, restSeconds: 30 }],
    });
  });

  it('accepts slot-keyed exercises from the grammar-constrained output', () => {
    const plan = sanitizePlan({
      name: 'Push',
      exercises: { '1_Brust': { exerciseId: 'bench', sets: 4, reps: 8, restSeconds: 120 }, '2_Schultern': { exerciseId: 'ohp', sets: 3, reps: 10, restSeconds: 90 } },
    }, library);
    expect(plan?.exercises.map(e => e.exerciseId)).toEqual(['bench', 'ohp']);
  });

  it('returns null when nothing usable is left', () => {
    expect(sanitizePlan({ exercises: [{ exerciseId: 'nope' }] }, library)).toBeNull();
    expect(sanitizePlan('garbage', library)).toBeNull();
  });
});

describe('generateWorkoutPlan', () => {
  it('requests grammar-constrained JSON and returns the parsed plan', async () => {
    service.responses = [JSON.stringify({
      name: 'Push A',
      description: 'Brust & Schultern',
      exercises: [
        { exerciseId: 'bench', sets: 4, reps: 8, restSeconds: 120 },
        { exerciseId: 'ohp', sets: 3, reps: 10, restSeconds: 90 },
        { exerciseId: 'dips', sets: 3, reps: 12, restSeconds: 60 },
      ],
    })];

    const plan = await generateWorkoutPlan({ goal: 'Push-Tag', exerciseCount: 3 }, library);

    expect(plan.exercises.map(e => e.exerciseId)).toEqual(['bench', 'ohp', 'dips']);
    expect(service.calls).toHaveLength(1);
    expect(service.calls[0].options.jsonSchema).toBeDefined();
    expect(service.calls[0].messages[0].content).toContain('bench: Bankdrücken');
  });

  it('falls back to unconstrained JSON when the grammar is unsupported', async () => {
    service.responses = [
      new GrammarUnsupportedError(),
      'Hier ist dein Plan: {"name":"Push","description":"","exercises":[{"exerciseId":"bench","sets":3,"reps":10,"restSeconds":90}]}',
    ];

    const plan = await generateWorkoutPlan({ goal: 'Push', exerciseCount: 3 }, library);

    expect(plan.exercises).toHaveLength(1);
    expect(service.calls[1].options.jsonSchema).toBeUndefined();
    expect(service.calls[1].messages[0].content).toContain('Antworte NUR mit JSON');
  });

  it('throws when the model returns no usable plan', async () => {
    service.responses = ['keine Ahnung'];
    await expect(generateWorkoutPlan({ goal: 'Push' }, library)).rejects.toThrow('keinen gültigen Plan');
  });
});
