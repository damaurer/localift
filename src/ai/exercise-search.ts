/**
 * Exercise-library matching shared by the AI tools and the plan generator.
 *
 * The bundled exercise library (public/exercises.json) uses German muscle
 * names ("Brust", "Trizeps", …) while the tool schemas expose the English
 * MuscleGroup values, so every muscle comparison goes through these aliases.
 */

import type { Exercise, MuscleGroup } from '../types/workout.types.ts';

const MUSCLE_GROUP_ALIASES: Record<MuscleGroup, string[]> = {
  chest: ['chest', 'brust', 'obere brust', 'pecs'],
  back: ['back', 'rücken', 'unterer rücken', 'latissimus', 'lat', 'trapez', 'wirbelsäule'],
  shoulders: ['shoulders', 'shoulder', 'schultern', 'schulter', 'hintere schultern', 'seitliche schultern', 'vordere schultern', 'delts'],
  biceps: ['biceps', 'bizeps'],
  triceps: ['triceps', 'trizeps'],
  abs: ['abs', 'abdomen', 'core', 'bauch', 'bauchmuskeln', 'bauchmuskulatur', 'untere bauchmuskulatur', 'seitenrumpf'],
  legs: ['legs', 'beine', 'oberschenkel', 'vorderseite oberschenkel', 'quadrizeps', 'hamstrings', 'waden', 'innenoberschenkel'],
  glutes: ['glutes', 'gesäß', 'hüfte'],
};

/** All terms of the muscle group a word belongs to (or just the word itself). */
export function muscleAliases(term: string): string[] {
  const t = term.trim().toLowerCase();
  return Object.values(MUSCLE_GROUP_ALIASES).find(aliases => aliases.includes(t)) ?? [t];
}

/** True when the term names one of the known muscle groups (any language). */
export function isKnownMuscle(term: string): boolean {
  const t = term.trim().toLowerCase();
  return Object.values(MUSCLE_GROUP_ALIASES).some(aliases => aliases.includes(t));
}

/** True when the exercise trains the given muscle group (any language). */
export function trainsMuscle(exercise: Exercise, group: string): boolean {
  const aliases = muscleAliases(group);
  return exercise.muscleGroups.some(m => aliases.includes(String(m).toLowerCase()));
}

/** True when the given muscle group is the exercise's primary (first) muscle. */
export function primarilyTrains(exercise: Exercise, group: string): boolean {
  const primary = exercise.muscleGroups[0];
  return primary !== undefined && muscleAliases(group).includes(String(primary).toLowerCase());
}

/**
 * Ranks exercises by how many query words they match (muscle-group words also
 * match their German/English aliases). Exercises matching no word are dropped.
 */
export function searchExercises(exercises: Exercise[], query: string): Exercise[] {
  const words = query.toLowerCase().split(/[\s,;/|+]+/).filter(w => w.length >= 2);
  if (!words.length) return exercises;

  return exercises
    .map(e => {
      const haystack = [
        e.name,
        e.category,
        e.equipment,
        e.description ?? '',
        ...(e.tags ?? []),
        ...e.muscleGroups,
      ].join(' ').toLowerCase();
      const score = words.filter(w => muscleAliases(w).some(a => haystack.includes(a))).length;
      return { e, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.e);
}
