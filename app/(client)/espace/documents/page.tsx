import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedDocumentUrl } from "@/lib/actions/booking-documents";

export default async function ClientDocumentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: documents } = await supabase
    .from("professional_documents")
    .select("*")
    .eq("is_visible", true)
    .order("category", { ascending: true });

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-medium mb-1">Documents</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Documents administratifs et professionnels mis à votre disposition.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {(documents ?? []).map((d) => (
          <a
            key={d.id}
            href={`/api/documents/${d.id}`}
            className="border rounded-lg p-3 text-sm hover:border-neutral-400"
          >
            <p className="font-medium">{d.name}</p>
            <p className="text-xs text-neutral-500">{d.category}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
