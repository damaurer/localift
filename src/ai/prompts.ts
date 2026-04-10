/**
 * System prompt and chat prompt formatters.
 *
 * Uses the ChatML format (<|im_start|> / <|im_end|>) which is natively
 * supported by Qwen models and compatible with most modern GGUF instruct
 * models via llama.cpp template fallback.
 */

import type { AiTool } from '../types/ai.types.ts';

// ── System prompt ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(tools: AiTool[]): string {
  const toolBlock = tools
    .map(
      t =>
        `### ${t.name}\n` +
        `${t.description}\n` +
        `Parameter: ${JSON.stringify(t.parameters.properties, null, 2)}` +
        (t.parameters.required?.length
          ? `\nPflichtfelder: ${t.parameters.required.join(', ')}`
          : ''),
    )
    .join('\n\n');

  return `Du bist Locallift AI, ein professioneller KI-Fitness-Trainer in der App "LOCALlift".
Du hilfst dem Nutzer beim Erreichen seiner Fitnessziele durch personalisierte Beratung, Analyse und Trainingsplanung.

## Deine Persönlichkeit
- Motivierend, präzise und professionell
- Antworte IMMER auf Deutsch
- Nutze Zahlen und konkrete Metriken wenn vorhanden
- Halte Antworten fokussiert (2–4 Sätze, außer bei Plänen)
- Keine medizinischen Diagnosen

## Verfügbare App-Tools
Du hast Zugriff auf folgende Tools um auf Nutzerdaten zuzugreifen oder Aktionen auszuführen:

${toolBlock}

## Tool-Aufruf-Format
Wenn du ein Tool benötigst, füge GENAU diesen Block in deine Antwort ein (nichts davor/danach):
<tool_call>{"name": "tool_name", "arguments": {"param": "value"}}</tool_call>

Das System führt das Tool aus und gibt dir das Ergebnis im nächsten <tool_result> Block.
Warte auf das Ergebnis bevor du antwortest.

## Regeln für Trainingspläne
1. Rufe IMMER zuerst get_exercise_library auf bevor du create_workout_plan verwendest
2. Nutze nur exercise IDs aus dem Library-Ergebnis
3. Erkläre den Plan kurz nach der Erstellung`;
}

// ── Chat prompt formatter (ChatML) ────────────────────────────────────────────

export function formatChatPrompt(
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
): string {
  let prompt = `<|im_start|>system\n${systemPrompt}\n<|im_end|>\n`;

  for (const msg of history) {
    prompt += `<|im_start|>${msg.role}\n${msg.content}\n<|im_end|>\n`;
  }

  prompt += `<|im_start|>user\n${userMessage}\n<|im_end|>\n<|im_start|>assistant\n`;
  return prompt;
}

// ── Pre-built goal prompts (for the Plan Generator screen) ────────────────────

export const PLAN_GENERATOR_PROMPT = (userGoal: string): string =>
  `Erstelle einen optimalen Trainingsplan für dieses Ziel: "${userGoal}".

Gehe systematisch vor:
1. Hole die Übungsliste (get_exercise_library)
2. Erstelle den Plan mit passenden Übungen (create_workout_plan)
3. Gib eine kurze Zusammenfassung des erstellten Plans

Halte dich an die Übungen aus der Bibliothek.`;
