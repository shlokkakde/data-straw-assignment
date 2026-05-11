import { getConfig } from "@/config";
import { runIngestion } from "@/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const config = getConfig();
    if (config.ingestSecret && request.headers.get("x-ingest-secret") !== config.ingestSecret) {
      return Response.json({ error: "Invalid ingest secret." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await runIngestion({
      query: body.query,
      maxArticles: body.maxArticles,
      pageSize: body.pageSize,
      forceAnalysis: body.forceAnalysis
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
