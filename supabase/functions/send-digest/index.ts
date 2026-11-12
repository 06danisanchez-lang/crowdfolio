import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { type CandidateRow, duePaymentRows } from "../_shared/digestPayments.ts";

// ============================================================================
// send-digest
//
// Correo diario de avisos (migración 20261109191314_avisos_por_correo). La llama
// pg_cron cada mañana con la cabecera x-cron-secret (secreto guardado en Vault).
//
// 1. Qué hay de nuevo para cada usuario (como la campana de la app, sin el
//    resumen semanal):
//    - public.email_digest_pending(): vencen en 7 días, vencidas sin cobrar,
//      rentas de equity sin cobrar y avisos de impago (sin contenido fiscal).
//    - public.email_digest_schedule_candidates() + matchScheduleToPayments: cuotas
//      de intereses de los últimos 7 días que siguen sin cobro, con el mismo
//      emparejamiento por importes que la app (_shared/scheduleMatching.ts).
//    Ya excluye cuentas demo, usuarios que se han dado de baja y avisos enviados.
// 2. Un correo por usuario con Resend, solo si tiene algo nuevo.
// 3. Tras enviarlo, registra cada aviso en email_notification_log para no
//    repetirlo. Si Resend falla, no se registra y se reintenta al día siguiente.
//
// Sin importes ni cálculo fiscal: solo nombres, plataformas y fechas. De un
// impago solo se dice que conviene revisarlo; la conclusión fiscal está en la app.
//
// Cuerpo opcional (para pruebas): { "dryRun": true } no envía ni registra y
// devuelve el resumen; { "onlyUserId": "<uuid>" } limita a un usuario.
//
// Secretos: RESEND_API_KEY. Opcionales: EMAIL_FROM, APP_URL.
// ============================================================================

const APP_URL = Deno.env.get("APP_URL") ?? "https://www.crowdfolio.es";
const FROM = Deno.env.get("EMAIL_FROM") ?? "Crowdfolio <avisos@crowdfolio.es>";
const REPLY_TO = "soporte@crowdfolio.es";

const PLATFORM_LABELS: Record<string, string> = {
  urbanitae: "Urbanitae",
  housers: "Housers",
  estateguru: "Estateguru",
  crowdcube: "Crowdcube",
  brickstarter: "Brickstarter",
  wecity: "Wecity",
};

type Kind =
  | "maturity_soon"
  | "overdue"
  | "payment_due"
  | "rent_due"
  | "default_incomplete"
  | "default_enforcement_year"
  | "default_review";

interface PendingRow {
  user_id: string;
  email: string;
  kind: Kind;
  investment_id: string;
  project_name: string;
  platform: string;
  custom_platform_name: string | null;
  event_date: string | null;
  promised_date: string | null;
  dedupe_key: string;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** «13 de noviembre» (o «13 de noviembre de 2025» si no es este año). */
function formatDate(iso: string | null, today: string): string {
  if (!iso) return "sin fecha";
  const [y, m, d] = iso.split("-").map(Number);
  const base = `${d} de ${MONTHS[m - 1]}`;
  return y === Number(today.slice(0, 4)) ? base : `${base} de ${y}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function htmlToText(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

function platformName(r: PendingRow): string {
  if (r.platform === "other") return r.custom_platform_name || "Otra plataforma";
  return PLATFORM_LABELS[r.platform] ?? r.platform;
}

function madridToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

function lineFor(r: PendingRow, today: string): string {
  const name = `<strong>${escapeHtml(r.project_name)}</strong> (${escapeHtml(platformName(r))})`;
  const date = formatDate(r.event_date, today);
  switch (r.kind) {
    case "maturity_soon": {
      const d = r.event_date ? daysBetween(today, r.event_date) : 0;
      const when = d === 0 ? "vence hoy" : d === 1 ? "vence mañana" : `vence el ${date}`;
      return `${name} ${when}.`;
    }
    case "overdue":
      return `${name} venció el ${date} y no consta el cobro. Si ya lo has recibido, regístralo; si no, puedes marcar un retraso o una prórroga.`;
    case "payment_due":
      return `${name}: no consta el cobro de intereses previsto para el ${date}. Si ya lo has recibido, regístralo.`;
    case "rent_due":
      return `${name}: no consta la renta prevista para el ${date}. Si ya la has recibido, regístrala.`;
    case "default_incomplete":
      return `${name}: falta completar la situación del impago. Entra y responde unas preguntas.`;
    case "default_enforcement_year":
      return `${name}: se ha cumplido un año desde la ejecución judicial que indicaste. Entra para revisar el impago.`;
    case "default_review":
      return `${name}: toca revisar el impago. Si ha cambiado algo (concurso, quita, ejecución judicial), actualízalo.`;
  }
}

const SUBJECTS: Record<Kind, string> = {
  maturity_soon: "vencimiento cercano",
  overdue: "vencida sin cobro registrado",
  payment_due: "cobro previsto sin registrar",
  rent_due: "renta prevista sin registrar",
  default_incomplete: "completa la situación del impago",
  default_enforcement_year: "revisa el impago",
  default_review: "revisa el impago",
};

function buildEmail(rows: PendingRow[], unsubscribeUrl: string, today: string) {
  const of = (...kinds: Kind[]) => rows.filter((r) => kinds.includes(r.kind));
  const sections: [string, PendingRow[]][] = [
    ["Vencidas sin cobro registrado", of("overdue")],
    ["Cobros previstos que no constan", of("payment_due", "rent_due")],
    ["Impagos", of("default_incomplete", "default_enforcement_year", "default_review")],
    ["Vencen en los próximos 7 días", of("maturity_soon")],
  ];
  const n = rows.length;

  const subject = n === 1
    ? `${rows[0].project_name}: ${SUBJECTS[rows[0].kind]}`
    : `Tu cartera: ${n} avisos nuevos`;

  const section = (title: string, list: PendingRow[]) => list.length === 0 ? "" : `
    <h2 style="font-size:16px;margin:24px 0 8px;color:#0f172a">${title}</h2>
    <ul style="padding-left:20px;margin:0">
      ${list.map((r) => `<li style="margin:0 0 8px">${lineFor(r, today)}</li>`).join("")}
    </ul>`;

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#334155;font-size:15px;line-height:1.5">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    <p style="margin:0 0 4px;font-weight:700;color:#0f172a;font-size:18px">Crowdfolio</p>
    <p style="margin:0 0 8px">Hay novedades en tu cartera:</p>
    ${sections.map(([title, list]) => section(title, list)).join("")}
    <p style="margin:28px 0">
      <a href="${APP_URL}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">Abrir Crowdfolio</a>
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8">
      Recibes este correo porque tienes activados los avisos por correo en Crowdfolio.
      <a href="${unsubscribeUrl}" style="color:#94a3b8">Dejar de recibirlos</a>
      · También puedes cambiarlo en Ajustes.
    </p>
  </div>
</body></html>`;

  const text = [
    "Hay novedades en tu cartera:",
    ...sections.flatMap(([title, list]) =>
      list.length ? ["", `${title}:`, ...list.map((r) => "- " + htmlToText(lineFor(r, today)))] : []
    ),
    "",
    `Abrir Crowdfolio: ${APP_URL}`,
    "",
    `Dejar de recibir estos correos: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const secret = req.headers.get("x-cron-secret") ?? "";
  const { data: ok, error: secretError } = await supabase.rpc("email_digest_secret_ok", { _secret: secret });
  if (secretError || ok !== true) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({})) as { dryRun?: boolean; onlyUserId?: string };
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey && !body.dryRun) {
    return new Response(JSON.stringify({ error: "Falta RESEND_API_KEY" }), { status: 503 });
  }

  const today = madridToday();
  const { data, error } = await supabase.rpc("email_digest_pending", { _today: today });
  if (error) {
    console.error("email_digest_pending", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const { data: candidates, error: cErr } = await supabase.rpc("email_digest_schedule_candidates", { _today: today });
  if (cErr) {
    console.error("email_digest_schedule_candidates", cErr);
    return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });
  }

  // Las cuotas se deciden aquí: quitar las ya avisadas.
  let dueRows = duePaymentRows((candidates ?? []) as CandidateRow[], today);
  if (dueRows.length) {
    const { data: logged, error: lErr } = await supabase.from("email_notification_log")
      .select("user_id, dedupe_key")
      .in("user_id", [...new Set(dueRows.map((r) => r.user_id))])
      .in("dedupe_key", dueRows.map((r) => r.dedupe_key));
    if (lErr) return new Response(JSON.stringify({ error: lErr.message }), { status: 500 });
    const done = new Set((logged ?? []).map((l: { user_id: string; dedupe_key: string }) => `${l.user_id}|${l.dedupe_key}`));
    dueRows = dueRows.filter((r) => !done.has(`${r.user_id}|${r.dedupe_key}`));
  }

  const byUser = new Map<string, PendingRow[]>();
  for (const r of [...((data ?? []) as PendingRow[]), ...dueRows]) {
    if (body.onlyUserId && r.user_id !== body.onlyUserId) continue;
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }

  // Claves de baja de los usuarios a los que se escribe.
  const userIds = [...byUser.keys()];
  const tokens = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles").select("id, email_unsubscribe_token").in("id", userIds);
    if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 500 });
    for (const p of profiles ?? []) tokens.set(p.id, p.email_unsubscribe_token);
  }

  let sent = 0;
  const failed: string[] = [];
  const preview: unknown[] = [];

  for (const [userId, rows] of byUser) {
    const unsubscribeUrl = `${APP_URL}/baja-correos?t=${tokens.get(userId)}`;
    const email = buildEmail(rows, unsubscribeUrl, today);

    if (body.dryRun) {
      preview.push({ userId, avisos: rows.length, tipos: rows.map((r) => r.kind), asunto: email.subject });
      continue;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        // Si se reintenta el mismo día, Resend no lo manda dos veces.
        "Idempotency-Key": `digest-${userId}-${today}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [rows[0].email],
        reply_to: REPLY_TO,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
      }),
    });

    if (!res.ok) {
      console.error("resend", userId, res.status, await res.text());
      failed.push(userId);
    } else {
      const { error: logError } = await supabase.from("email_notification_log")
        .upsert(rows.map((r) => ({ user_id: userId, dedupe_key: r.dedupe_key })), { ignoreDuplicates: true });
      if (logError) console.error("email_notification_log", userId, logError);
      sent++;
    }
    // Plan gratuito de Resend: 2 peticiones por segundo.
    await sleep(600);
  }

  const result = { today, usuarios: byUser.size, enviados: sent, fallidos: failed.length, ...(body.dryRun ? { preview } : {}) };
  console.log(JSON.stringify(result));
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
});
