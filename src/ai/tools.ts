/**
 * Fitness-specific tools available to the AI agent.
 *
 * Each tool maps directly to in-app data or actions.  The description and
 * parameter schema are injected verbatim into the system prompt so the model
 * knows exactly how to invoke them.
 */

import type { AiTool, AiToolCall } from '../types/ai.types.ts';
import type { Exercise, MuscleGroup, WorkoutPlan, WorkoutSession } from '../types/workout.types.ts';
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
      'Erstellt einen neuen Trainingsplan und speichert ihn in der App. ' +
      'Bevorzuge exercise IDs aus get_exercise_library. Existiert eine gewünschte ' +
      'Übung dort nicht, gib stattdessen ihren "name" an – sie wird automatisch in ' +
      'der Übungsbibliothek angelegt.',
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
        exercises: {
          type: 'array',
          description:
            'Array von Übungsobjekten. Jedes Objekt hat: ' +
            'exerciseId (string, optional – aus get_exercise_library), ' +
            'name (string – Pflicht für neue Übungen, die nicht in der Bibliothek sind), ' +
            'muscleGroups (array, optional – z.B. ["chest"]), ' +
            'equipment (string, optional – barbell|dumbbell|machine|bodyweight|cable|other), ' +
            'sets (array mit weight (kg), reps, restSeconds).',
        },
      },
      required: ['name', 'exercises'],
    },
  },
];

// ── Tool execution context (injected by AiProvider) ──────────────────────────

export interface ToolContext {
  exercises: Exercise[];
  sessions: WorkoutSession[];
  plans: WorkoutPlan[];
  /** Saves a new plan; the context generates id / createdAt / updatedAt */
  savePlan: (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  /** Persists a fully-formed exercise (incl. id) into the library */
  saveExercise: (exercise: Exercise) => void;
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
          exercises: Array<{
            exerciseId?: string;
            name?: string;
            muscleGroups?: string[];
            equipment?: string;
            sets?: Array<{ weight?: number; reps?: number; restSeconds?: number }>;
          }>;
        };

        if (!name || !Array.isArray(exercises) || exercises.length === 0) {
          return JSON.stringify({ error: 'name und exercises sind Pflichtfelder.' });
        }

        let createdExerciseCount = 0;

        const planExercises = exercises.map((ex, idx) => {
          // Resolve the exercise to a library entry — by id, then by name —
          // and create a new library exercise when neither matches so the
          // plan never references a non-existent exercise.
          let resolved = ex.exerciseId
            ? ctx.exercises.find(e => e.id === ex.exerciseId)
            : undefined;

          if (!resolved && ex.name) {
            const wanted = ex.name.trim().toLowerCase();
            resolved = ctx.exercises.find(e => e.name.toLowerCase() === wanted);
          }

          let exerciseId: string;
          if (resolved) {
            exerciseId = resolved.id;
          } else {
            const muscleGroups = (ex.muscleGroups ?? [])
              .map(m => String(m).toLowerCase())
              .filter((m): m is MuscleGroup =>
                (VALID_MUSCLE_GROUPS as string[]).includes(m),
              );
            const equipment = (VALID_EQUIPMENT as string[]).includes(
              String(ex.equipment),
            )
              ? (ex.equipment as Exercise['equipment'])
              : 'other';

            const newExercise: Exercise = {
              id: generateId(),
              name: (ex.name ?? `Übung ${idx + 1}`).trim(),
              equipment,
              muscleGroups,
              category: 'KI-generiert',
              tags: ['KI-generiert'],
            };
            ctx.saveExercise(newExercise);
            createdExerciseCount++;
            exerciseId = newExercise.id;
          }

          return {
            id: generateId(),
            exerciseId,
            order: idx,
            sets: (ex.sets ?? [{ weight: 0, reps: 10 }]).map(s => ({
              id: generateId(),
              weight: Number(s.weight) || 0,
              weightUnit: 'kg' as const,
              reps: Number(s.reps) || 10,
              restSeconds: Number(s.restSeconds) || 90,
            })),
          };
        });

        ctx.savePlan({
          name,
          description: description ?? '',
          tags: ['KI-generiert'],
          exercises: planExercises,
          estimatedDuration: planExercises.length * 12,
        });

        return JSON.stringify({
          success: true,
          planName: name,
          exerciseCount: planExercises.length,
          createdExercises: createdExerciseCount,
        });
      }

      default:
        return JSON.stringify({ error: `Unbekanntes Tool: ${call.name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}
