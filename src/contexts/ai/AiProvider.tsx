import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

import type { AiMessage, AiModelStatus } from '../../types/ai.types.ts';
import { AiContext } from './AiContext.tsx';
import { loadModel, isModelLoaded, unloadModel } from '../../ai/wllama-service.ts';
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
  const { exercises } = useExerciseContext();
  const { sessions } = useWorkoutContext();
  const { plans, savePlan } = usePlanContext();

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
  }), [exercises, sessions, plans, savePlan]);

  // ── Core: run the agent and stream into messages ───────────────────────────
  const runAgentAndStream = useCallback(
    async (userContent: string, ctx: 'chat' | 'plan'): Promise<string | undefined> => {
      if (modelStatus !== 'ready') {
        throw new Error('Modell nicht geladen');
      }

      setIsGenerating(true);
      setGeneratingContext(ctx);
      setActiveToolName(null);

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
          messagesRef.current.filter(m => !m.isStreaming),
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
            onToolDone: () => {
              setActiveToolName(null);
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
    [modelStatus, buildToolContext],
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
        generatePlan,
      }}
    >
      {children}
    </AiContext.Provider>
  );
}
