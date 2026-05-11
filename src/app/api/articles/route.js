import { listArticles } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const filters = Object.fromEntries(url.searchParams.entries());
    return Response.json({ articles: await listArticles(filters) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
