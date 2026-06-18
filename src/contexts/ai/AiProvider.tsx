import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

import type { AiMessage, AiModelStatus } from '../../types/ai.types.ts';
import { AiContext } from './AiContext.tsx';
import { loadModel, isModelLoaded, runCompletion, unloadModel } from '../../ai/wllama-service.ts';
import { runAgent } from '../../ai/agent.ts';
import { PLAN_GENERATOR_PROMPT } from '../../ai/prompts.ts';
import type { ToolContext } from '../../ai/tools.ts';
import { generateId } from '../../data/storage.ts';

import { useSettingsContext } from '../settings/SettingsContext.tsx';
import { useExerciseContext } from '../exercise/ExerciseContext.tsx';
import { useWorkoutContext } from '../workout/WorkoutContext.tsx';
import { usePlanContext } from '../plan/PlanContext.tsx';

export function AiProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettingsContext();
  const { exercises, importExercises } = useExerciseContext();
  const { sessions } = useWorkoutContext();
  const { plans, savePlan, addExerciseToPlan, updatePlanExerciseSets } = usePlanContext();

  // Always-current plans snapshot so tool calls within one agent turn (which
  // run after awaits / re-renders) never read a stale plan list.
  const plansRef = useRef<typeof plans>(plans);
  plansRef.current = plans;

  const [modelStatus, setModelStatus] = useState<AiModelStatus>(() =>
    isModelLoaded() ? 'ready' : 'idle',
  );
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [loadedModelUrl, setLoadedModelUrl] = useState<string | null>(null);

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingContext, setGeneratingContext] = useState<'chat' | 'plan' | null>(null);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);

  // Ref so the agentic loop always sees the current messages without stale closure
  const messagesRef = useRef<AiMessage[]>([]);
  messagesRef.current = messages;

  // ── Install model ──────────────────────────────────────────────────────────
  const installModel = useCallback(async () => {
    const { modelUrl } = settings.aiTrainer;
    if (!modelUrl) {
      setModelError('Keine Modell-URL konfiguriert.');
      return;
    }

    try {
      setModelError(null);
      setModelStatus('downloading');
      setDownloadProgress(0);

      await loadModel(modelUrl, progress => {
        setDownloadProgress(progress);
        // Switch to "loading" once download is complete
        if (progress >= 1) setModelStatus('loading');
      });

      setModelStatus('ready');
      setLoadedModelUrl(modelUrl);
    } catch (err) {
        if(err instanceof Error && err.message.toLowerCase() === 'module is already initialized'){
            return
        }

      console.error('[AiProvider] loadModel error:', err);
      setModelError(
        err instanceof Error ? err.message : 'Modell konnte nicht geladen werden.',
      );
      setModelStatus('error');
    }
  }, [settings.aiTrainer]);

  // ── Swap model (unload current, return to idle) ────────────────────────────
  const swapModel = useCallback(async () => {
    await unloadModel();
    setModelStatus('idle');
    setLoadedModelUrl(null);
    setModelError(null);
    setMessages([]);
  }, []);

  // ── Auto-load from cache when AI is enabled ────────────────────────────────
  // Fires on mount and when the user enables the AI toggle.
  // wllama's useCache:true means subsequent loads skip the download.
  useEffect(() => {
    if (settings.aiTrainer.enabled && modelStatus === 'idle') {
      void installModel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.aiTrainer.enabled]);

  // ── Build tool context ─────────────────────────────────────────────────────
  const buildToolContext = useCallback((): ToolContext => ({
    exercises,
    sessions,
    plans,
    savePlan,
    // importExercises persists full Exercise objects (deduped by id) into the
    // library, so AI-created plans can reference brand-new exercises.
    saveExercise: (exercise) => { void importExercises([exercise]); },
    addExerciseToPlan,
    updatePlanExerciseSets,
    // Read from the ref so a plan created earlier in the SAME turn is visible.
    getPlanById: (id) => plansRef.current.find(p => p.id === id),
  }), [exercises, sessions, plans, savePlan, importExercises, addExerciseToPlan, updatePlanExerciseSets]);

  // ── Core: run the agent and stream into messages ───────────────────────────
  const runAgentAndStream = useCallback(
    async (userContent: string, ctx: 'chat' | 'plan'): Promise<string | undefined> => {
      if (modelStatus !== 'ready') {
        throw new Error('Modell nicht geladen');
      }

      setIsGenerating(true);
      setGeneratingContext(ctx);
      setActiveToolName(null);

      const appendDebugMessage = (label: string, content: string) => {
        if (!settings.aiTrainer.debugOutput) return;

        const debugContent = [`[Agent Debug] ${label}`, content].join('\n\n');
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: debugContent,
            timestamp: new Date().toISOString(),
            isDebug: true,
          },
        ]);
      };

      // Placeholder streaming message
      const streamingId = generateId();
      const streamingMsg: AiMessage = {
        id: streamingId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, streamingMsg]);

      let createdPlanName: string | undefined;

      try {
        const result = await runAgent(
          userContent,
          messagesRef.current.filter(m => !m.isStreaming && !m.isDebug),
          buildToolContext(),
          {
            onVisibleToken: (_piece) => {
              // Update the streaming message with the latest full visible text
              // We accumulate in the agent and here we just trigger a re-render
              setMessages(prev =>
                prev.map(m =>
                  m.id === streamingId
                    ? { ...m, content: m.content + _piece }
                    : m,
                ),
              );
            },
            onToolStart: (toolName) => {
              setActiveToolName(toolName);
            },
            onToolDone: (toolName, success) => {
              setActiveToolName(null);
              // Append a persistent chip to the streaming message so the user
              // sees right away which tool ran and whether it succeeded.
              setMessages(prev =>
                prev.map(m =>
                  m.id === streamingId
                    ? {
                      ...m,
                      toolInvocations: [
                        ...(m.toolInvocations ?? []),
                        { name: toolName, success },
                      ],
                    }
                    : m,
                ),
              );
            },
            onDebugOutput: (output) => {
              appendDebugMessage(output.label, output.content);
            },
          },
        );

        // Replace the streaming placeholder with the final message
        setMessages(prev =>
          prev.map(m =>
            m.id === streamingId
              ? { ...result.message, isStreaming: false }
              : m,
          ),
        );

        createdPlanName = result.createdPlanName;
      } catch (err) {
        const errContent =
          err instanceof Error
            ? `Fehler: ${err.message}`
            : 'Ein unbekannter Fehler ist aufgetreten.';
        setMessages(prev =>
          prev.map(m =>
            m.id === streamingId
              ? { ...m, content: errContent, isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsGenerating(false);
        setGeneratingContext(null);
        setActiveToolName(null);
      }

      return createdPlanName;
    },
    [modelStatus, buildToolContext, settings.aiTrainer.debugOutput],
  );

  // ── sendMessage ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: AiMessage = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      await runAgentAndStream(content, 'chat');
    },
    [runAgentAndStream],
  );

  // ── generatePlan ───────────────────────────────────────────────────────────
  const generatePlan = useCallback(
    async (userGoal: string): Promise<string | undefined> => {
      const goalPrompt = PLAN_GENERATOR_PROMPT(userGoal);
      const userMsg: AiMessage = {
        id: generateId(),
        role: 'user',
        content: goalPrompt,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      return runAgentAndStream(goalPrompt, 'plan');
    },
    [runAgentAndStream],
  );

  // ── clearChat ──────────────────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const generateExerciseDescription = useCallback(async (input: {
    name: string;
    category: string;
    equipment: string;
    muscleGroups: string[];
    tags: string[];
  }): Promise<string> => {
    if (modelStatus !== 'ready') {
      throw new Error('Modell nicht geladen');
    }

    const language = settings.language === 'en' ? 'English' : 'German';
    const prompt = [
      'You are an experienced strength-training coach writing for a workout app.',
      `Write one polished, natural exercise description in ${language}.`,
      'Use complete sentences and one smooth flowing paragraph, not bullet points, labels, fragments, or keyword lists.',
      'Explain what the exercise trains, how it is generally performed, and what the user should focus on during execution.',
      'Use the provided fields as context, but do not mechanically repeat every field.',
      '',
      `Name: ${input.name || '-'}`,
      `Category: ${input.category || '-'}`,
      `Equipment: ${input.equipment || '-'}`,
      `Muscle groups: ${input.muscleGroups.join(', ') || '-'}`,
      `Tags: ${input.tags.join(', ') || '-'}`,
    ].join('\n');

    const completion = await runCompletion(prompt, {
      maxTokens: 120,
      temperature: 0.45,
    });

    return completion
      .replace(/<\|endoftext\|>/g, '')
      .replace(/^["'`\s]+|["'`\s]+$/g, '')
      .trim();
  }, [modelStatus, settings.language]);

  return (
    <AiContext.Provider
      value={{
        modelStatus,
        downloadProgress,
        modelError,
        loadedModelUrl,
        messages,
        isGenerating,
        generatingContext,
        activeToolName,
        installModel,
        swapModel,
        sendMessage,
        clearChat,
        generateExerciseDescription,
        generatePlan,
      }}
    >
      {children}
    </AiContext.Provider>
  );
}
