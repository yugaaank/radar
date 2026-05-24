import { NextRequest } from "next/server";
import OpenAI from "openai";

const client = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { messages, radarContext } = await req.json();

    const systemPrompt = `
You are the Radar Engineering Intelligence Analyst. 
Your role is to reason over workspace data and provide actionable decision support.

CURRENT WORKSPACE CONTEXT:
${JSON.stringify(radarContext, null, 2)}

OPERATIONAL GUIDELINES:
1. Identify Blockers: Look for items with severity 'critical' or health 'Overdue'/'Stuck'.
2. Detect Clusters: Items sharing the same 'correlationKeys' are related. Treat them as a single project or incident.
3. Prioritize: Use 'radarScore' (0-100) to rank importance. Higher is more urgent.
4. Recommendation: Be decisive. Tell the user exactly what needs attention and why.
5. Formatting: Use short, punchy summaries. Use bullet points. Bold important item titles.
6. Links: If an item is mentioned, refer to its exact title so the user can find it on the radar.

AVOID:
- Generic "How can I help you" filler.
- Long-winded explanations of what a radar is.
- Speculating about data not provided in the context.

If there are too many items, focus on the top 5 by radarScore.
`.trim();

    const response = await client.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      stream: true,
    });

    return new Response(response.toReadableStream(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
