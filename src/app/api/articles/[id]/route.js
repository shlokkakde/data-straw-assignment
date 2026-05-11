import { getArticleById } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const article = await getArticleById(decodeURIComponent(params.id));
    if (!article) {
      return Response.json({ error: "Article not found." }, { status: 404 });
    }
    return Response.json({ article });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
