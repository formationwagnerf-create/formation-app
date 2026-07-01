import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeStatistics } from "@/lib/statistics";

// Export Excel conforme au §15 : une ligne par session, avec toutes les
// colonnes demandées (date, organisme, formation, lieu, département,
// jours, heures, stagiaires prévus/réels, heures-stagiaires, heures de
// déplacement, statut, montant, frais kilométriques, total).
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rows = await computeStatistics({
    fromDate: searchParams.get("from") ?? undefined,
    toDate: searchParams.get("to") ?? undefined,
    organizationId: searchParams.get("organization") ?? undefined,
    courseId: searchParams.get("course") ?? undefined,
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Statistiques");

  sheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Organisme", key: "organization", width: 24 },
    { header: "Formation", key: "course", width: 24 },
    { header: "Lieu", key: "venue", width: 24 },
    { header: "Nombre de jours", key: "numberOfDays", width: 12 },
    { header: "Nombre d'heures", key: "totalHours", width: 12 },
    { header: "Stagiaires prévus", key: "expectedParticipants", width: 14 },
    { header: "Stagiaires réels", key: "actualParticipants", width: 14 },
    { header: "Heures-stagiaires", key: "studentHours", width: 16 },
    { header: "Heures de déplacement", key: "travelHours", width: 18 },
    { header: "Statut", key: "status", width: 18 },
    { header: "Montant formation (€ HT)", key: "amount", width: 18 },
    { header: "Frais kilométriques (€ HT)", key: "travelAmount", width: 18 },
    { header: "Total (€ HT)", key: "total", width: 14 },
    { header: "Organisme donneur d'ordre", key: "orderingEntity", width: 22 },
  ];

  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="statistiques-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
