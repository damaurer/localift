import {useMemo, useState} from 'react';

import {useHeader} from '../contexts/LayoutContext';
import {useExerciseContext} from '../contexts/exercise/ExerciseContext.tsx';
import {usePlanContext} from '../contexts/plan/PlanContext.tsx';
import {useTranslation} from '../i18n/I18nContext.tsx';
import type {Exercise, MuscleGroup} from '../types/workout.types.ts';

const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'legs', 'glutes'];
const EQUIPMENT: Exercise['equipment'][] = ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'other'];

type ExerciseDraft = {
  id?: string;
  name: string;
  category: string;
  equipment: Exercise['equipment'];
  muscleGroups: MuscleGroup[];
  tags: string;
  description: string;
  imageUrl: string;
};

function createDraft(exercise?: Exercise): ExerciseDraft {
  return {
    id: exercise?.id,
    name: exercise?.name ?? '',
    category: exercise?.category ?? '',
    equipment: exercise?.equipment ?? 'other',
    muscleGroups: exercise?.muscleGroups ?? [],
    tags: exercise?.tags?.join(', ') ?? '',
    description: exercise?.description ?? '',
    imageUrl: exercise?.imageUrl ?? '',
  };
}

function normalizeDraft(draft: ExerciseDraft): Omit<Exercise, 'id'> {
  const tags = draft.tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

  return {
    name: draft.name.trim(),
    category: draft.category.trim() || 'Custom',
    equipment: draft.equipment,
    muscleGroups: draft.muscleGroups,
    tags,
    description: draft.description.trim() || undefined,
    imageUrl: draft.imageUrl.trim() || null,
  };
}

export default function Exercises() {
  const t = useTranslation();
  const {exercises, addExercise, updateExercise, deleteExercise} = useExerciseContext();
  const {plans} = usePlanContext();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<ExerciseDraft>(() => createDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);

  useHeader({
    showBack: true,
    title: t.exercisesLibrary.title,
    subtitle: t.exercisesLibrary.subtitle,
  }, [t.exercisesLibrary.title, t.exercisesLibrary.subtitle]);

  const usageByExerciseId = useMemo(() => {
    const usage = new Map<string, number>();
    plans.forEach(plan => {
      plan.exercises.forEach(planExercise => {
        usage.set(planExercise.exerciseId, (usage.get(planExercise.exerciseId) ?? 0) + 1);
      });
    });
    return usage;
  }, [plans]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exercises;

    return exercises.filter(exercise =>
      exercise.name.toLowerCase().includes(query) ||
      exercise.category.toLowerCase().includes(query) ||
      exercise.equipment.toLowerCase().includes(query) ||
      exercise.muscleGroups.some(muscle => muscle.toLowerCase().includes(query)) ||
      exercise.tags?.some(tag => tag.toLowerCase().includes(query)),
    );
  }, [exercises, search]);

  const selectExercise = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setDraft(createDraft(exercise));
    setDeleteCandidate(null);
    setIsEditorOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setDraft(createDraft());
    setDeleteCandidate(null);
  };

  const openNewExerciseModal = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetForm();
  };

  const toggleMuscleGroup = (muscleGroup: MuscleGroup) => {
    setDraft(prev => ({
      ...prev,
      muscleGroups: prev.muscleGroups.includes(muscleGroup)
        ? prev.muscleGroups.filter(item => item !== muscleGroup)
        : [...prev.muscleGroups, muscleGroup],
    }));
  };

  const handleSave = () => {
    if (!draft.name.trim()) return;

    const normalized = normalizeDraft(draft);
    if (editingId) {
      updateExercise({...normalized, id: editingId});
    } else {
      addExercise(normalized);
      setDraft(createDraft());
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    closeEditor();
  };

  const handleDelete = (exerciseId: string) => {
    if ((usageByExerciseId.get(exerciseId) ?? 0) > 0) return;
    if (deleteCandidate !== exerciseId) {
      setDeleteCandidate(exerciseId);
      return;
    }

    deleteExercise(exerciseId);
    if (editingId === exerciseId) resetForm();
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-20 pb-28 px-6 max-w-5xl mx-auto">
        <section className="mb-8">
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
            {t.exercisesLibrary.title}
          </h1>
          <p className="text-on-surface-variant text-sm tracking-widest uppercase">{t.exercisesLibrary.heroSubtitle}</p>
        </section>

        {saved && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-bold tracking-widest uppercase text-primary" style={{background: 'rgba(149,170,255,0.1)', border: '1px solid rgba(149,170,255,0.3)'}}>
            {t.exercisesLibrary.saved}
          </div>
        )}

        <section className="space-y-4">
            <div className="bg-surface-container-low rounded-xl p-1 flex items-center">
              <div className="flex-1 px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-outline">search</span>
                <input
                  className="bg-transparent border-none text-xs tracking-widest uppercase w-full placeholder:text-outline text-on-surface focus:outline-none"
                  placeholder={t.exercisesLibrary.searchPlaceholder}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} aria-label={t.common.close}>
                    <span className="material-symbols-outlined text-outline text-base">close</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                {filteredExercises.length} {t.common.exercises}
              </p>
              <button
                onClick={openNewExerciseModal}
                className="px-3 py-2 rounded-lg bg-surface-container text-xs font-bold tracking-widest uppercase text-primary"
              >
                {t.exercisesLibrary.newExercise}
              </button>
            </div>

            <div className="space-y-3">
              {filteredExercises.map((exercise, index) => {
                const usageCount = usageByExerciseId.get(exercise.id) ?? 0;
                const isEditing = editingId === exercise.id;
                const confirmDelete = deleteCandidate === exercise.id;

                return (
                  <article
                    key={exercise.id}
                    className={`rounded-xl p-5 transition-colors ${index % 2 === 0 ? 'bg-surface-container-high' : 'bg-surface-container-low'} ${isEditing ? 'ring-1 ring-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button onClick={() => selectExercise(exercise)} className="text-left min-w-0 flex-1">
                        <h2 className="text-xl font-bold tracking-tight text-on-surface" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                          {exercise.name}
                        </h2>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {exercise.category} · {exercise.equipment} · {exercise.muscleGroups.join(', ') || t.exercisesLibrary.noMuscles}
                        </p>
                        {exercise.description && (
                          <p className="text-xs text-on-surface-variant mt-2 line-clamp-2" style={{opacity: 0.65}}>
                            {exercise.description}
                          </p>
                        )}
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {usageCount > 0 && (
                          <span className="px-2 py-1 rounded-full bg-surface-container text-xs font-bold text-on-surface-variant">
                            {usageCount}x
                          </span>
                        )}
                        <button
                          onClick={() => selectExercise(exercise)}
                          className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary"
                          title={t.common.configure}
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(exercise.id)}
                          disabled={usageCount > 0}
                          className={`w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center transition-colors ${
                            usageCount > 0 ? 'text-outline opacity-40 cursor-not-allowed' : confirmDelete ? 'text-error' : 'text-on-surface-variant hover:text-error'
                          }`}
                          title={usageCount > 0 ? t.exercisesLibrary.deleteBlocked : t.common.delete}
                        >
                          <span className="material-symbols-outlined text-base">{confirmDelete ? 'priority_high' : 'delete'}</span>
                        </button>
                      </div>
                    </div>

                    {exercise.tags && exercise.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {exercise.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 rounded-full bg-surface-container text-xs text-on-surface-variant">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}

              {filteredExercises.length === 0 && (
                <div className="text-center py-16 rounded-xl border-2 border-dashed" style={{borderColor: 'rgba(72, 72, 71, 0.3)'}}>
                  <p className="text-on-surface-variant text-sm">{t.exercisesLibrary.noExercisesFound}</p>
                </div>
              )}
            </div>
        </section>
      </main>

      {isEditorOpen && (
        <div
          className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{background: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(4px)'}}
          onClick={event => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <section
            className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-surface-container-low p-5 space-y-5"
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? t.exercisesLibrary.editExercise : t.exercisesLibrary.addExercise}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">
                  {editingId ? t.exercisesLibrary.editExercise : t.exercisesLibrary.addExercise}
                </p>
                <h2 className="text-2xl font-bold tracking-tight" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                  {draft.name || t.exercisesLibrary.formTitleFallback}
                </h2>
              </div>
              <button onClick={closeEditor} className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">{t.exercisesLibrary.name}</span>
              <input
                value={draft.name}
                onChange={event => setDraft(prev => ({...prev, name: event.target.value}))}
                className="mt-2 w-full bg-surface-container rounded-lg px-4 py-3 text-on-surface"
                placeholder={t.exercisesLibrary.namePlaceholder}
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">{t.exercisesLibrary.category}</span>
              <input
                value={draft.category}
                onChange={event => setDraft(prev => ({...prev, category: event.target.value}))}
                className="mt-2 w-full bg-surface-container rounded-lg px-4 py-3 text-on-surface"
                placeholder={t.exercisesLibrary.categoryPlaceholder}
              />
            </label>

            <div>
              <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">{t.exercisesLibrary.equipment}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {EQUIPMENT.map(item => (
                  <button
                    key={item}
                    onClick={() => setDraft(prev => ({...prev, equipment: item}))}
                    className={`px-3 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                      draft.equipment === item ? 'text-primary bg-surface-container-high ring-1 ring-primary' : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">{t.exercisesLibrary.muscles}</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(item => (
                  <button
                    key={item}
                    onClick={() => toggleMuscleGroup(item)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                      draft.muscleGroups.includes(item) ? 'text-primary bg-surface-container-high ring-1 ring-primary' : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">{t.exercisesLibrary.tags}</span>
              <input
                value={draft.tags}
                onChange={event => setDraft(prev => ({...prev, tags: event.target.value}))}
                className="mt-2 w-full bg-surface-container rounded-lg px-4 py-3 text-on-surface"
                placeholder={t.exercisesLibrary.tagsPlaceholder}
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">{t.exercisesLibrary.description}</span>
              <textarea
                value={draft.description}
                onChange={event => setDraft(prev => ({...prev, description: event.target.value}))}
                className="mt-2 w-full bg-surface-container rounded-lg px-4 py-3 text-on-surface resize-none"
                rows={4}
                placeholder={t.exercisesLibrary.descriptionPlaceholder}
              />
            </label>

            <button
              onClick={handleSave}
              disabled={!draft.name.trim()}
              className={`w-full py-4 rounded-xl text-sm font-black tracking-widest uppercase active:scale-95 transition-all ${
                draft.name.trim() ? 'locallift-gradient text-on-primary' : 'bg-surface-container text-outline cursor-not-allowed'
              }`}
              style={{fontFamily: 'Space Grotesk, sans-serif'}}
            >
              {t.common.save}
            </button>

            <p className="text-xs text-on-surface-variant leading-relaxed" style={{opacity: 0.55}}>
              {t.exercisesLibrary.deleteHint}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
