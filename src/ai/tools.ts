/**
 * Fitness-specific tools available to the AI agent.
 *
 * Each tool maps directly to in-app data or actions.  The description and
 * parameter schema are injected verbatim into the system prompt so the model
 * knows exactly how to invoke them.
 */

import type { AiTool, AiToolCall } from '../types/ai.types.ts';
import type { Exercise, MuscleGroup, SetTemplate, WorkoutPlan, WorkoutSession } from '../types/workout.types.ts';
import { generateId } from '../data/storage.ts';

const VALID_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'legs', 'glutes',
];
const VALID_EQUIPMENT: Exercise['equipment'][] = [
  'barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'other',
];

// ── Tool definitions (schema sent to the model) ──────────────────────────────

export const FITNESS_TOOLS: AiTool[] = [
  {
    name: 'get_exercise_library',
    description:
      'Gibt alle verfügbaren Übungen aus der Übungsbibliothek zurück. ' +
      'Rufe dieses Tool auf bevor du einen Plan erstellst, damit du gültige exercise IDs verwendest.',
    parameters: {
      type: 'object',
      properties: {
        muscleGroup: {
          type: 'string',
          description: 'Optional: Filtere nach Muskelgruppe.',
          enum: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'legs', 'glutes'],
        },
      },
    },
  },
  {
    name: 'create_exercise',
    description:
      'Legt eine neue eigene Übung in der Übungsbibliothek an. ' +
      'Nutze dieses Tool, wenn der Nutzer ausdrücklich eine Übung hinzufügen möchte oder eine fehlende Übung dauerhaft speichern will.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name der Übung, z.B. "Bulgarian Split Squat".',
        },
        muscleGroups: {
          type: 'array',
          description: 'Muskelgruppen, z.B. ["legs", "glutes"].',
          items: { type: 'string' },
        },
        equipment: {
          type: 'string',
          description: 'barbell|dumbbell|machine|bodyweight|cable|other.',
          enum: ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'other'],
        },
        category: {
          type: 'string',
          description: 'Kategorie der Übung, z.B. "Beine" oder "Custom".',
        },
        tags: {
          type: 'array',
          description: 'Optionale Tags.',
          items: { type: 'string' },
        },
        description: {
          type: 'string',
          description: 'Optionale Kurzbeschreibung oder Technikhinweise.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_workout_history',
    description: 'Gibt die letzten abgeschlossenen Trainingseinheiten des Nutzers zurück.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Anzahl der letzten Einheiten (Standard: 5, max: 20).',
        },
      },
    },
  },
  {
    name: 'get_existing_plans',
    description: 'Gibt alle vorhandenen Trainingspläne in der App zurück.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_workout_plan',
    description:
      'Erstellt einen NEUEN, zunächst leeren Trainingsplan und speichert ihn. ' +
      'Gibt eine "planId" zurück, die du danach für add_exercise_to_plan brauchst. ' +
      'Füge die Übungen NICHT hier ein, sondern danach einzeln mit add_exercise_to_plan. ' +
      'Rufe dieses Tool erneut auf, wenn du mehrere Pläne erstellen möchtest.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name des Trainingsplans, z.B. "Push A – Kraft".',
        },
        description: {
          type: 'string',
          description: 'Kurze Beschreibung des Plans und seiner Ziele.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'add_exercise_to_plan',
    description:
      'Fügt GENAU EINE Übung zu einem bestehenden Plan hinzu (planId aus create_workout_plan). ' +
      'Rufe dieses Tool pro Übung einmal auf – so baust du den Plan Schritt für Schritt auf. ' +
      'Bevorzuge exerciseId aus get_exercise_library. Fehlt die Übung dort, gib stattdessen ihren ' +
      '"name" (plus optional muscleGroups/equipment) an – sie wird automatisch angelegt.',
    parameters: {
      type: 'object',
      properties: {
        planId: {
          type: 'string',
          description: 'Die planId aus create_workout_plan.',
        },
        exerciseId: {
          type: 'string',
          description: 'Optional: ID einer Übung aus get_exercise_library.',
        },
        name: {
          type: 'string',
          description: 'Name der Übung (Pflicht, wenn keine exerciseId angegeben ist).',
        },
        muscleGroups: {
          type: 'array',
          description: 'Optional: Muskelgruppen für neue Übungen, z.B. ["chest"].',
          items: { type: 'string' },
        },
        equipment: {
          type: 'string',
          description: 'Optional: barbell|dumbbell|machine|bodyweight|cable|other.',
        },
        sets: {
          type: 'array',
          description: 'Array von Sätzen, je mit weight (kg), reps und optional restSeconds.',
          items: { type: 'object' },
        },
      },
      required: ['planId'],
    },
  },
];

// ── Tool execution context (injected by AiProvider) ──────────────────────────

export interface ToolContext {
  exercises: Exercise[];
  sessions: WorkoutSession[];
  plans: WorkoutPlan[];
  /** Creates (or upserts) a plan and returns its id */
  savePlan: (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string;
  /** Persists a fully-formed exercise (incl. id) into the library */
  saveExercise: (exercise: Exercise) => void;
  /** Appends an exercise (default single set) to a plan, returns the new plan-exercise id */
  addExerciseToPlan: (planId: string, exerciseId: string) => string;
  /** Replaces the sets of a plan exercise */
  updatePlanExerciseSets: (planId: string, planExerciseId: string, sets: SetTemplate[]) => void;
  /** Looks up a plan by id (reads current state, not stale) */
  getPlanById: (id: string) => WorkoutPlan | undefined;
}

/**
 * Resolves an exercise reference (id or name) to a library exercise id,
 * creating a new library exercise when neither matches so a plan never
 * references a non-existent exercise.
 */
function resolveExerciseId(
  ex: { exerciseId?: string; name?: string; muscleGroups?: string[]; equipment?: string },
  ctx: ToolContext,
  fallbackName: string,
): { exerciseId: string; created: boolean } {
  let resolved = ex.exerciseId
    ? ctx.exercises.find(e => e.id === ex.exerciseId)
    : undefined;

  if (!resolved && ex.name) {
    const wanted = ex.name.trim().toLowerCase();
    resolved = ctx.exercises.find(e => e.name.toLowerCase() === wanted);
  }

  if (resolved) return { exerciseId: resolved.id, created: false };

  const muscleGroups = (ex.muscleGroups ?? [])
    .map(m => String(m).toLowerCase())
    .filter((m): m is MuscleGroup => (VALID_MUSCLE_GROUPS as string[]).includes(m));
  const equipment = (VALID_EQUIPMENT as string[]).includes(String(ex.equipment))
    ? (ex.equipment as Exercise['equipment'])
    : 'other';

  const newExercise: Exercise = {
    id: generateId(),
    name: (ex.name ?? fallbackName).trim(),
    equipment,
    muscleGroups,
    category: 'KI-generiert',
    tags: ['KI-generiert'],
  };
  ctx.saveExercise(newExercise);
  return { exerciseId: newExercise.id, created: true };
}

/** Maps loosely-typed set objects from the model to SetTemplate values. */
function mapSets(
  sets: Array<{ weight?: number; reps?: number; restSeconds?: number }> | undefined,
): SetTemplate[] {
  return (sets && sets.length ? sets : [{ weight: 0, reps: 10 }]).map(s => ({
    id: generateId(),
    weight: Number(s.weight) || 0,
    weightUnit: 'kg' as const,
    reps: Number(s.reps) || 10,
    restSeconds: Number(s.restSeconds) || 90,
  }));
}

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeTool(
  call: AiToolCall,
  ctx: ToolContext,
): Promise<string> {
  try {
    switch (call.name) {

      case 'get_exercise_library': {
        const mg = call.arguments.muscleGroup as string | undefined;
        let list = ctx.exercises;
        if (mg) {
          list = list.filter(e =>
            e.muscleGroups.includes(mg as Exercise['muscleGroups'][number]),
          );
        }
        const result = list.slice(0, 50).map(e => ({
          id: e.id,
          name: e.name,
          muscleGroups: e.muscleGroups,
          equipment: e.equipment,
        }));
        return JSON.stringify(result);
      }

      case 'create_exercise': {
        const args = call.arguments as {
          name?: string;
          muscleGroups?: string[];
          equipment?: string;
          category?: string;
          tags?: string[];
          description?: string;
        };

        const name = args.name?.trim();
        if (!name) {
          return JSON.stringify({ error: 'name ist ein Pflichtfeld.' });
        }

        const existing = ctx.exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          return JSON.stringify({
            success: true,
            exerciseId: existing.id,
            exerciseName: existing.name,
            created: false,
            hint: 'Diese Übung existiert bereits in der Bibliothek.',
          });
        }

        const muscleGroups = (args.muscleGroups ?? [])
          .map(m => String(m).toLowerCase())
          .filter((m): m is MuscleGroup => (VALID_MUSCLE_GROUPS as string[]).includes(m));
        const equipment = (VALID_EQUIPMENT as string[]).includes(String(args.equipment))
          ? (args.equipment as Exercise['equipment'])
          : 'other';

        const exercise: Exercise = {
          id: generateId(),
          name,
          equipment,
          muscleGroups,
          category: args.category?.trim() || 'Custom',
          tags: Array.isArray(args.tags) ? args.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
          description: args.description?.trim() || undefined,
        };

        ctx.saveExercise(exercise);
        return JSON.stringify({
          success: true,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          created: true,
        });
      }

      case 'get_workout_history': {
        const limit = Math.min(Number(call.arguments.limit) || 5, 20);
        const recent = [...ctx.sessions]
          .sort(
            (a, b) =>
              new Date(b.completedAt ?? 0).getTime() -
              new Date(a.completedAt ?? 0).getTime(),
          )
          .slice(0, limit)
          .map(s => ({
            planName: s.planName,
            completedAt: s.completedAt,
            durationMinutes: s.durationSeconds
              ? Math.round(s.durationSeconds / 60)
              : null,
            exercises: s.exercises.map(e => ({
              name: e.exerciseName,
              sets: e.loggedSets.length,
              totalVolumeKg: e.loggedSets.reduce(
                (acc, set) => acc + set.weight * set.reps,
                0,
              ),
            })),
          }));
        return JSON.stringify(recent);
      }

      case 'get_existing_plans': {
        return JSON.stringify(
          ctx.plans.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            exerciseCount: p.exercises.length,
          })),
        );
      }

      case 'create_workout_plan': {
        const { name, description, exercises } = call.arguments as {
          name: string;
          description?: string;
          exercises?: Array<{
            exerciseId?: string;
            name?: string;
            muscleGroups?: string[];
            equipment?: string;
            sets?: Array<{ weight?: number; reps?: number; restSeconds?: number }>;
          }>;
        };

        if (!name) {
          return JSON.stringify({ error: 'name ist ein Pflichtfeld.' });
        }
        // exercises is optional, but if provided it must be an array. The plan
        // is normally built incrementally via add_exercise_to_plan afterwards.
        if (exercises !== undefined && !Array.isArray(exercises)) {
          return JSON.stringify({ error: 'exercises muss ein Array sein.' });
        }

        let createdExerciseCount = 0;
        const planExercises = (exercises ?? []).map((ex, idx) => {
          const { exerciseId, created } = resolveExerciseId(ex, ctx, `Übung ${idx + 1}`);
          if (created) createdExerciseCount++;
          return {
            id: generateId(),
            exerciseId,
            order: idx,
            sets: mapSets(ex.sets),
          };
        });

        const planId = ctx.savePlan({
          name,
          description: description ?? '',
          tags: ['KI-generiert'],
          exercises: planExercises,
          estimatedDuration: planExercises.length * 12,
        });

        return JSON.stringify({
          success: true,
          planId,
          planName: name,
          exerciseCount: planExercises.length,
          createdExercises: createdExerciseCount,
          hint: 'Füge Übungen jetzt einzeln mit add_exercise_to_plan (planId) hinzu.',
        });
      }

      case 'add_exercise_to_plan': {
        const args = call.arguments as {
          planId?: string;
          exerciseId?: string;
          name?: string;
          muscleGroups?: string[];
          equipment?: string;
          sets?: Array<{ weight?: number; reps?: number; restSeconds?: number }>;
        };

        if (!args.planId) {
          return JSON.stringify({ error: 'planId ist ein Pflichtfeld.' });
        }
        if (!args.exerciseId && !args.name) {
          return JSON.stringify({ error: 'Gib exerciseId oder name an.' });
        }

        const plan = ctx.getPlanById(args.planId);
        if (!plan) {
          return JSON.stringify({
            error: `Kein Plan mit planId "${args.planId}". Erstelle zuerst create_workout_plan.`,
          });
        }

        const { exerciseId, created } = resolveExerciseId(args, ctx, 'Übung');
        const planExerciseId = ctx.addExerciseToPlan(args.planId, exerciseId);
        ctx.updatePlanExerciseSets(args.planId, planExerciseId, mapSets(args.sets));

        const exerciseName =
          ctx.exercises.find(e => e.id === exerciseId)?.name ?? args.name ?? 'Übung';

        return JSON.stringify({
          success: true,
          planId: args.planId,
          added: exerciseName,
          createdExercise: created,
          // plan was read before the append, so +1 reflects the new total
          exerciseCount: plan.exercises.length + 1,
        });
      }

      default:
        return JSON.stringify({ error: `Unbekanntes Tool: ${call.name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}
