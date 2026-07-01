import { NextResponse } from "next/server";
import { extendCalendarWindow } from "@/lib/calendar";

// Appelée une fois par jour par le planificateur de tâches Vercel
// (voir vercel.json + docs/CRON.md). C'est ce qui fait que le calendrier
// reste toujours ouvert 2 ans à l'avance, automatiquement, sans qu'il y
// ait jamais besoin d'y toucher manuellement.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    await extendCalendarWindow();
    return NextResponse.json({ ok: true, extended_at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
