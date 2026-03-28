// ============================================================
// MECSYS — Edge Function: Envío de WhatsApp vía Twilio
// Deploy: supabase functions deploy send-whatsapp
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      throw new Error("Faltan parámetros: to y message son requeridos");
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM"); // whatsapp:+14155238886

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Faltan variables de entorno de Twilio en Supabase");
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromNumber,
        To:   `whatsapp:+${to}`,
        Body: message,
      }).toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message ?? `Twilio error ${res.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, sid: data.sid }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
