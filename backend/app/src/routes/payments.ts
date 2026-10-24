import { Elysia, t } from "elysia";
import { db } from "../db";
import { emitToUser } from "../ws-server";
import { authPlugin } from "../middlewares/auth";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const CARDS_FILE = "./uploads/simulated_cards.json";

interface SimulatedCard {
  id: string;
  customer_id: string;
  user_id: string;
  last_four_digits: string;
  expiration_month: number;
  expiration_year: number;
  cardholder: { name: string };
  payment_method: { id: string; name: string };
  issuer: { id: string; name: string };
}

function loadCards(): SimulatedCard[] {
  try {
    if (!existsSync("./uploads")) mkdirSync("./uploads", { recursive: true });
    if (!existsSync(CARDS_FILE)) return [];
    return JSON.parse(readFileSync(CARDS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveCards(cards: SimulatedCard[]) {
  try {
    if (!existsSync("./uploads")) mkdirSync("./uploads", { recursive: true });
    writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf-8");
  } catch (e) {
    console.error("Error guardando tarjetas simuladas:", e);
  }
}

function upsertSimulatedCard(user: any, body: any, customerId: string) {
  const cards = loadCards();
  const last4 =
    body.last_four_digits ||
    (body.card_number ? String(body.card_number).replace(/\s/g, "").slice(-4) : null) ||
    "4242";
  const exists = cards.find(
    (c) => c.user_id === user.id_usuario && c.last_four_digits === last4
  );
  if (!exists) {
    const newCard: SimulatedCard = {
      id: `sim_card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      customer_id: customerId,
      user_id: user.id_usuario,
      last_four_digits: last4,
      expiration_month: Number(body.expiration_month) || 12,
      expiration_year: Number(body.expiration_year) || 2029,
      cardholder: {
        name: body.cardholder_name || `${user.nombre} ${user.apellidos}`.toUpperCase(),
      },
      payment_method: {
        id: body.payment_method_id || "visa",
        name: (body.payment_method_id || "visa").toUpperCase(),
      },
      issuer: {
        id: body.issuer_id || "sim_issuer",
        name: "Banco Simulado Local",
      },
    };
    cards.push(newCard);
    saveCards(cards);
    console.log(`✅ [Simulación Local] Tarjeta guardada (${last4}) para usuario ${user.id_usuario}`);
  }
}

async function handleSimulatedPayment(body: any, user: any, set: any) {
  let customerId = user.mp_customer_id;

  if (body.saveCard) {
    if (!customerId) {
      customerId = `sim_cust_${user.id_usuario.slice(0, 8)}`;
      await db.usuario.update({
        where: { id_usuario: user.id_usuario },
        data: { mp_customer_id: customerId },
      });
    }
    upsertSimulatedCard(user, body, customerId);
  }

  const idInmueble = body.id_inmueble;
  if (!idInmueble) {
    set.status = 400;
    return { error: "Falta id_inmueble" };
  }

  const inmueble = await db.inmueble.findUnique({
    where: { id_inmueble: idInmueble },
    include: { arrendador: true },
  });

  if (!inmueble) {
    set.status = 404;
    return { error: "Inmueble no encontrado" };
  }

  const montoRenta = Number(inmueble.precio_mensual);
  if (isNaN(montoRenta) || montoRenta <= 0) {
    set.status = 400;
    return { error: "Precio del inmueble inválido" };
  }

  const comision = Math.round(montoRenta * 0.02 * 100) / 100;
  const montoArrendador = montoRenta - comision;

  // Asegurar que el arrendador tenga credenciales simuladas en modo local
  if (!inmueble.arrendador.mp_access_token) {
    const simVendedorId = `SIM_MP_${inmueble.arrendador.id_usuario.slice(0, 8).toUpperCase()}`;
    await db.usuario.update({
      where: { id_usuario: inmueble.arrendador.id_usuario },
      data: {
        mp_access_token: `SIM_APP_USR_${inmueble.arrendador.id_usuario}`,
        mp_refresh_token: `SIM_TG_${inmueble.arrendador.id_usuario}`,
        mp_public_key: `SIM_PUB_${inmueble.arrendador.id_usuario}`,
        mp_vendedor_id: simVendedorId,
      },
    });
  }

  const simPaymentId = `sim_pay_${Date.now()}`;
  const simStatus = "approved";

  console.log(
    `✅ [Pago Simulado Local] ID=${simPaymentId} | Estado=${simStatus} | Monto=$${montoRenta} | Comisión=$${comision} | Inmueble=${inmueble.id_inmueble}`
  );

  await db.transaccion.create({
    data: {
      monto: montoRenta,
      estado: simStatus,
      payment_id: simPaymentId,
      descripcion: `Pago de Renta: ${inmueble.titulo}`,
      id_usuario: user.id_usuario,
      id_inmueble: inmueble.id_inmueble,
      id_receptor: inmueble.id_arrendador,
      comision_plataforma: comision,
      estado_pago_arrendador: "TRANSFERIDO",
    },
  });

  // Actualizar el inmueble: marcar como OCUPADO y asociar al estudiante
  const fechaInicio = new Date();
  const fechaFin = new Date(fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + 1);

  await db.inmueble.update({
    where: { id_inmueble: inmueble.id_inmueble },
    data: {
      estado: "OCUPADO",
      id_estudiante: user.id_usuario,
      id_estudiante_autorizado: user.id_usuario,
      fecha_inicio_renta: fechaInicio,
      fecha_fin_renta: fechaFin,
    },
  });

  // Notificar al arrendador en BD y WebSocket
  try {
    await db.notificacion.create({
      data: {
        usuario_id: inmueble.id_arrendador,
        titulo: "¡Renta Pagada!",
        mensaje: `${user.nombre} ${user.apellidos} ha pagado la renta de ${inmueble.titulo}. Ya tienes $${montoArrendador.toFixed(2)} MXN en tu cuenta (Simulado Local).`,
        tipo: "renta_confirmada",
        remitente_nombre: `${user.nombre} ${user.apellidos}`,
        remitente_id: user.id_usuario,
        visto: false,
        relacionado_a: inmueble.id_inmueble.toString(),
      },
    });

    emitToUser(inmueble.id_arrendador, "renta_confirmada", {
      inmuebleId: inmueble.id_inmueble,
      estudianteNombre: `${user.nombre} ${user.apellidos}`,
      mensaje: `${user.nombre} ${user.apellidos} ha pagado la renta de ${inmueble.titulo}`,
    });
  } catch (err) {
    console.error("Error al notificar al arrendador:", err);
  }

  // Notificar al estudiante vía WebSocket para actualizar HomeScreen
  emitToUser(user.id_usuario, "renta_confirmada_estudiante", {
    inmuebleId: inmueble.id_inmueble,
    mensaje: `Tu pago de renta para ${inmueble.titulo} ha sido procesado exitosamente.`,
  });

  return {
    status: simStatus,
    id: simPaymentId,
    message: "Pago de renta procesado exitosamente (Simulado Local)",
    payout_status: "TRANSFERIDO",
  };
}

export const paymentRoutes = new Elysia({ prefix: "/payments" })
  .post("/webhook", async ({ body }) => {
    console.log("[Webhook Simulado] Recibido:", body);
    return { received: true };
  })
  .use(authPlugin)
  .derive(({ authenticatedUser, set }) => {
    if (
      authenticatedUser &&
      typeof authenticatedUser === "object" &&
      "error" in (authenticatedUser as any)
    ) {
      set.status = 401;
      throw new Error((authenticatedUser as any).error);
    }
    return { user: authenticatedUser! };
  })
  .post(
    "/process",
    async ({ body, user, set }) => {
      try {
        return await handleSimulatedPayment(body, user, set);
      } catch (error: any) {
        console.error("Error procesando pago:", error);
        set.status = 500;
        return { error: "Error interno al procesar el pago", details: error.message };
      }
    },
    {
      body: t.Object({
        token: t.String(),
        payment_method_id: t.String(),
        issuer_id: t.Optional(t.String()),
        id_inmueble: t.Number(),
        installments: t.Optional(t.Number()),
        saveCard: t.Optional(t.Boolean()),
        last_four_digits: t.Optional(t.String()),
        cardholder_name: t.Optional(t.String()),
        expiration_month: t.Optional(t.Any()),
        expiration_year: t.Optional(t.Any()),
      }),
    }
  )
  .get("/cards", async ({ user }) => {
    try {
      const allCards = loadCards();
      const userCards = allCards.filter((c) => c.user_id === user.id_usuario);
      return { cards: userCards };
    } catch (error) {
      console.error("Error obteniendo tarjetas:", error);
      return { cards: [] };
    }
  })
  .delete("/cards/:cardId", async ({ params: { cardId }, user }) => {
    try {
      const allCards = loadCards();
      const filtered = allCards.filter(
        (c) => !(c.id === cardId && c.user_id === user.id_usuario)
      );
      saveCards(filtered);
      return { message: "Tarjeta eliminada correctamente" };
    } catch (error) {
      console.error("Error eliminando tarjeta:", error);
      return { error: "No se pudo eliminar la tarjeta" };
    }
  })
  .get("/history", async ({ user, set }) => {
    try {
      if (user.rol !== "ARRENDADOR") {
        set.status = 403;
        return { error: "Solo los arrendadores tienen historial de ingresos" };
      }
      const transacciones = await db.transaccion.findMany({
        where: { id_receptor: user.id_usuario },
        orderBy: { fecha_creacion: "desc" },
        include: {
          inmueble: { select: { titulo: true } },
          usuario: { select: { nombre: true, apellidos: true } },
        },
      });
      return { transacciones };
    } catch (error) {
      console.error("Error obteniendo historial de pagos:", error);
      set.status = 500;
      return { error: "No se pudo obtener el historial" };
    }
  })
  .post(
    "/process-renta",
    async ({ body, user, set }) => {
      try {
        return await handleSimulatedPayment(body, user, set);
      } catch (error: any) {
        console.error("Error procesando pago de renta:", error);
        set.status = 500;
        return { error: "Error interno al procesar el pago de renta", details: error.message };
      }
    },
    {
      body: t.Object({
        id_inmueble: t.Number(),
        token: t.String(),
        payment_method_id: t.String(),
        issuer_id: t.Optional(t.String()),
        installments: t.Optional(t.Number()),
        saveCard: t.Optional(t.Boolean()),
        last_four_digits: t.Optional(t.String()),
        cardholder_name: t.Optional(t.String()),
        expiration_month: t.Optional(t.Any()),
        expiration_year: t.Optional(t.Any()),
      }),
    }
  );
