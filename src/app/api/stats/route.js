import { getStats } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getStats());
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
