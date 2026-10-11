import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../types/workout.types.ts';

vi.mock('../ai/wllama-service.ts', () => ({ GrammarUnsupportedError: class extends Error {}, runChatCompletion: vi.fn() }));

const { planSlots, resolveRequest, selectCatalog } = await import('../ai/plan-generator.ts');

const data = JSON.parse(readFileSync('public/exercises.json', 'utf8')) as { version: string; exercises: Exercise[] };
const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'other'];

describe('public/exercises.json', () => {
  it('has a version and well-formed, unique exercises', () => {
    expect(data.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const ids = data.exercises.map(e => e.id);
    const names = data.exercises.map(e => e.name.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    for (const e of data.exercises) {
      expect(EQUIPMENT, e.id).toContain(e.equipment);
      expect(e.muscleGroups.length, e.id).toBeGreaterThan(0);
      expect(e.description?.length ?? 0, e.id).toBeGreaterThan(40);
    }
  });

  it('offers real leg exercises for a beginner full-body workout at home', () => {
    const req = resolveRequest({ goal: 'Ganzkörper', userRequest: 'Ich bin Anfänger und trainiere zu Hause ohne Geräte.' });
    const catalog = selectCatalog(data.exercises, req);
    const [legs] = planSlots(catalog, req, 5);

    expect(legs.label).toBe('Beine');
    expect(legs.candidates.every(e => e.equipment === 'bodyweight')).toBe(true);
    expect(legs.candidates.map(e => e.id)).toEqual(expect.arrayContaining(['ex-bw-squat']));
  });
});
