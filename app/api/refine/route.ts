import { NextResponse } from "next/server";
import { getDemoFallbackPreferences } from "../../../lib/demoFallback";
import { listProperties } from "../../../lib/listings";
import { preferencesJsonSchema, PreferencesSchema, RefineRequestSchema } from "../../../lib/preferences";
import { buildRefineSystemPrompt, buildRefineUserPrompt } from "../../../lib/prompt";
import type { Preferences } from "../../../lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TOOL_NAME = "update_preferences";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = RefineRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid refine request" }, { status: 400 });
  }

  const { preferences, message } = parsed.data;
  const visibleProperties = (await listProperties(preferences)).properties;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({
      preferences: getDemoFallbackPreferences(preferences, message, visibleProperties) ?? preferences,
    });
  }

  try {
    const refined = await refineWithAnthropic(apiKey, preferences, message, visibleProperties);
    return NextResponse.json({ preferences: refined });
  } catch {
    return NextResponse.json({
      preferences: getDemoFallbackPreferences(preferences, message, visibleProperties) ?? preferences,
    });
  }
}

async function refineWithAnthropic(
  apiKey: string,
  preferences: Preferences,
  message: string,
  visibleProperties: Awaited<ReturnType<typeof listProperties>>["properties"],
): Promise<Preferences> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1200,
      temperature: 0,
      system: buildRefineSystemPrompt(),
      tools: [
        {
          name: TOOL_NAME,
          description: "Return the full updated Dubai property-search preference object.",
          input_schema: preferencesJsonSchema,
        },
      ],
      tool_choice: {
        type: "tool",
        name: TOOL_NAME,
      },
      messages: [
        {
          role: "user",
          content: buildRefineUserPrompt(preferences, message, visibleProperties),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
  };

  const toolUse = data.content?.find((block) => block.type === "tool_use" && block.name === TOOL_NAME);
  const validated = PreferencesSchema.safeParse(toolUse?.input);

  if (!validated.success) {
    return preferences;
  }

  return validated.data;
}
