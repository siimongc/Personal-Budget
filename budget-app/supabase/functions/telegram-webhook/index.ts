import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Formato esperado del mensaje: "[Monto] [Descripción]", ej. "15000 Uber"
const AMOUNT_DESCRIPTION_REGEX = /^(\d+)\s+(.+)$/;

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(amount);
}

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Telegram envía este header con el secret_token configurado en setWebhook.
  // Rechazamos cualquier request que no venga de Telegram.
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await req.json();
  const message = update.message;
  const chatId = message?.chat?.id;
  const text: string | undefined = message?.text;

  if (!chatId || !text) {
    return new Response("ok");
  }

  const match = text.trim().match(AMOUNT_DESCRIPTION_REGEX);
  if (!match) {
    await sendMessage(
      chatId,
      `Formato inválido: "${text}".\nEnviá: [Monto] [Descripción]\nEj: 15000 Uber`
    );
    return new Response("ok");
  }

  const amount = Number(match[1]);
  const description = match[2].trim();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name");

  if (categoriesError || !categories || categories.length === 0) {
    await sendMessage(
      chatId,
      "No tenés categorías configuradas todavía. Creá al menos una en la app web antes de registrar gastos."
    );
    return new Response("ok");
  }

  const pairedCategory =
    categories.find(
      (c) =>
        description.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(description.toLowerCase())
    ) ?? categories[0];

  const { error: insertError } = await supabase
    .from("expenses")
    .insert([{ category_id: pairedCategory.id, amount, description }]);

  if (insertError) {
    console.error(insertError);
    await sendMessage(chatId, `❌ Error al guardar el gasto: ${description}`);
    return new Response("ok");
  }

  await sendMessage(chatId, `✅ Guardado: ${formatCOP(amount)} en "${pairedCategory.name}".`);
  return new Response("ok");
});
