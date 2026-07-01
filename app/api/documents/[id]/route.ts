import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Génère un lien signé temporaire et redirige dessus, plutôt que de
// rendre les fichiers publics (cahier des charges §27).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/connexion", _request.url));
  }

  const { data: doc } = await supabase
    .from("professional_documents")
    .select("file_url, is_visible")
    .eq("id", id)
    .single();

  if (!doc || !doc.is_visible) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("professional-documents")
    .createSignedUrl(doc.file_url, 60 * 5);

  if (error || !signed) {
    return NextResponse.json({ error: "Impossible de générer le lien" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
