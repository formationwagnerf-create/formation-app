/**
 * Envoi de notifications WhatsApp à l'administrateur.
 *
 * WhatsApp sert UNIQUEMENT à notifier (cahier des charges §11) : aucune
 * validation de dossier ne peut se faire depuis WhatsApp lui-même, le
 * message ne contient qu'un lien sécurisé vers la demande dans
 * l'application, où la validation définitive est enregistrée.
 *
 * Toutes les tentatives d'envoi sont journalisées dans whatsapp_logs,
 * que l'envoi réussisse ou échoue.
 */
import { createSupabaseAdminClient } from "./supabase/admin";

type NotificationType = "new_request" | "cancellation" | "reminder_before_session";

export async function sendWhatsAppNotification(
  type: NotificationType,
  message: string,
  bookingRequestId?: string
) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const adminPhone = process.env.WHATSAPP_ADMIN_PHONE_NUMBER;

  const supabase = createSupabaseAdminClient();
  let status: "sent" | "failed" = "sent";

  if (!phoneNumberId || !accessToken || !adminPhone) {
    // Configuration manquante : on journalise quand même pour que
    // l'administrateur sache qu'une notification aurait dû partir.
    status = "failed";
  } else {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: adminPhone,
            type: "text",
            text: { body: message },
          }),
        }
      );
      if (!response.ok) status = "failed";
    } catch {
      status = "failed";
    }
  }

  await supabase.from("whatsapp_logs").insert({
    booking_request_id: bookingRequestId,
    message_type: type,
    message_body: message,
    status,
  });

  return status === "sent";
}

export function formatNewRequestMessage(params: {
  organizationName: string;
  courseName: string;
  startDate: string;
  endDate: string;
  venue: string;
  requestUrl: string;
}) {
  return [
    "Nouvelle demande de formation",
    "",
    `Organisme : ${params.organizationName}`,
    `Formation : ${params.courseName}`,
    `Dates : ${params.startDate} au ${params.endDate}`,
    `Lieu : ${params.venue}`,
    "",
    "Consulter la demande :",
    params.requestUrl,
  ].join("\n");
}
