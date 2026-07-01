import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfessionalDocsClient from "./professional-docs-client";

export default async function AdminProfessionalDocumentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: documents } = await supabase
    .from("professional_documents")
    .select("*")
    .order("category", { ascending: true });

  return (
    <div className="p-6">
      <h1 className="text-xl font-medium mb-1">Documents professionnels</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Documents accessibles à tous les clients connectés (CV, Qualiopi,
        assurance, CGV, règlement intérieur...).
      </p>
      <ProfessionalDocsClient initialDocuments={documents ?? []} />
    </div>
  );
}
