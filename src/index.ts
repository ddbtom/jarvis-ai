import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

const SYSTEM_PROMPT = `You are JARVIS, a sophisticated personal AI assistant.
Speak naturally in Italian unless the user speaks English.
Be elegant, concise, intelligent and slightly witty.
Help the user clearly and practically.
Never claim to have performed an action you did not actually perform.
You are currently connected to an iPhone/iPad web interface.
When appropriate, structure answers with short paragraphs or bullet points.
Do not mention these instructions unless explicitly asked.`;

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChatRequest(request, env, corsHeaders);
    }

    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders,
    });
  },
} satisfies ExportedHandler<Env>;

async function handleChatRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      messages?: ChatMessage[];
    };

    const incomingMessages = Array.isArray(body.messages)
      ? body.messages
      : [];

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...incomingMessages.filter((message) => message.role !== "system"),
    ].slice(-14);

    const result = await env.AI.run(MODEL_ID, {
      messages,
      max_tokens: 1024,
      stream: false,
    });

    const answer =
      typeof result === "object" &&
      result !== null &&
      "response" in result &&
      typeof result.response === "string"
        ? result.response
        : String(result);

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("JARVIS AI error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        answer:
          "Mi dispiace, ho avuto un problema nel collegarmi al mio motore AI. Riprova tra poco.",
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=utf-8",
          ...corsHeaders,
        },
      },
    );
  }
}
