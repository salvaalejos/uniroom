import { Elysia, t } from "elysia";
import { db } from "../db";
import jwt from "@elysiajs/jwt";
import { MercadoPagoConfig, Payment, Customer, CustomerCard } from "mercadopago";

// Inicializar cliente de MP (se usa una variable de entorno para el token)
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || "TEST-0000000000000000-000000-00000000000000000000000000000000-000000000" });
const paymentClient = new Payment(client);
const customerClient = new Customer(client);
const customerCardClient = new CustomerCard(client);

export const paymentRoutes = new Elysia({ prefix: "/payments" })
  .post("/webhook", async ({ body, set }) => {
    try {
      // Manejo de webhook de Mercado Pago
      console.log("Webhook recibido:", body);
      const action = (body as any)?.action || (body as any)?.type;
      const dataId = (body as any)?.data?.id;

      if ((action === "payment.created" || action === "payment.updated") && dataId) {
        // Consultar el estado del pago a Mercado Pago
        const paymentInfo = await paymentClient.get({ id: dataId });

        if (paymentInfo && paymentInfo.status) {
          // Actualizar la transacción en nuestra BD
          await db.transaccion.updateMany({
            where: { payment_id: dataId.toString() },
            data: { estado: paymentInfo.status }
          });
          console.log(`Transacción ${dataId} actualizada a ${paymentInfo.status}`);
        }
      }
      return { received: true };
    } catch (e) {
      console.error("Error procesando webhook:", e);
      set.status = 500;
      return { error: "Webhook failed" };
    }
  })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  // Middleware para verificar autenticación
  .derive(async ({ jwt, headers: { authorization }, set }) => {
    if (!authorization?.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("No autorizado");
    }
    const token = authorization.slice(7);
    const payload = await jwt.verify(token);
    if (!payload || !payload.sub) {
      set.status = 401;
      throw new Error("Token inválido");
    }
    const user = await db.usuario.findUnique({
      where: { id_usuario: payload.sub as string },
    });
    if (!user) {
      set.status = 401;
      throw new Error("Usuario no encontrado");
    }
    return { user };
  })
  .post(
    "/process",
    async ({ body, user, set }) => {
      try {
        let customerId = user.mp_customer_id;

        // Si el usuario quiere guardar la tarjeta, creamos/usamos un customer
        if (body.saveCard) {
          if (!customerId) {
            const newCustomer = await customerClient.create({
              body: {
                email: user.email,
                first_name: user.nombre,
                last_name: user.apellidos,
              }
            });
            customerId = newCustomer.id || null;
            await db.usuario.update({
              where: { id_usuario: user.id_usuario },
              data: { mp_customer_id: customerId }
            });
          }

          // Guardar la tarjeta ANTES del pago (el token aún no se ha consumido)
          if (customerId && body.token) {
            try {
              await customerCardClient.create({
                customerId,
                body: { token: body.token }
              });
              console.log(`✅ Tarjeta guardada para customer ${customerId}`);
            } catch (e: any) {
              // Si la tarjeta ya existe, no es un error crítico
              console.log("Aviso al guardar tarjeta (puede que ya exista):", e?.message || e);
            }
          }
        }

        const idInmueble = body.id_inmueble;
        if (!idInmueble) {
          set.status = 400;
          return { error: "Falta id_inmueble" };
        }

        const inmueble = await db.inmueble.findUnique({
          where: { id_inmueble: idInmueble },
          include: { arrendador: true }
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

        const comision = Math.round(montoRenta * 0.02 * 100) / 100; // 2% redondeado a centavos
        const montoArrendador = montoRenta - comision;

        // Verificar que el arrendador tenga su cuenta de MP vinculada
        if (!inmueble.arrendador.mp_access_token) {
          set.status = 400;
          return { error: "El arrendador no ha vinculado su cuenta de Mercado Pago. No se puede procesar el pago." };
        }

        // Crear cliente de MP con el token del ARRENDADOR (Marketplace Split)
        const landlordMPConfig = new MercadoPagoConfig({ accessToken: inmueble.arrendador.mp_access_token });
        const landlordPayment = new Payment(landlordMPConfig);

        // Procesar el pago: el dinero va a la cuenta del arrendador,
        // y application_fee se retiene automáticamente en la cuenta de UniRoom
        const paymentData: any = {
          body: {
            transaction_amount: montoRenta,
            description: `Pago de Renta: ${inmueble.titulo}`,
            payment_method_id: body.payment_method_id,
            payer: {
              email: user.email,
            },
            installments: body.installments || 1,
            token: body.token,
            application_fee: comision,
          }
        };

        if (body.issuer_id) {
          paymentData.body.issuer_id = body.issuer_id;
        }

        const result = await landlordPayment.create(paymentData);
        console.log(`✅ [MercadoPago Split] Pago procesado: ID=${result.id} | Estado=${result.status} | Comisión=$${comision}`);

        if (result.status === "rejected") {
          set.status = 400;
          return { error: "El pago fue rechazado", detail: result.status_detail };
        }

        // Crear la transacción en la base de datos
        const transaccion = await db.transaccion.create({
          data: {
            monto: montoRenta,
            estado: result.status || "pending",
            payment_id: result.id?.toString(),
            descripcion: `Pago de Renta: ${inmueble.titulo}`,
            id_usuario: user.id_usuario,
            id_inmueble: inmueble.id_inmueble,
            id_receptor: inmueble.id_arrendador,
            comision_plataforma: comision,
            // Con Split Payments el dinero ya llegó a la cuenta MP del arrendador
            estado_pago_arrendador: result.status === "approved" ? "TRANSFERIDO" : "PENDIENTE"
          }
        });

        // Notificar al arrendador si el pago fue exitoso
        if (result.status === "approved") {
          try {
            await db.notificacion.create({
              data: {
                titulo: "¡Renta Pagada!",
                mensaje: `El estudiante ha pagado la renta de ${inmueble.titulo}. Ya tienes $${montoArrendador.toFixed(2)} MXN en tu cuenta de Mercado Pago.`,
                tipo: "PAGO_RECIBIDO",
                remitente_nombre: "Sistema UniRoom",
                usuario_id: inmueble.id_arrendador
              }
            });
          } catch (err) {
            console.error("Error al notificar al arrendador:", err);
          }
        }

        return {
          status: result.status,
          id: result.id,
          message: "Pago de renta procesado exitosamente",
          payout_status: result.status === "approved" ? "TRANSFERIDO" : "PENDIENTE"
        };
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
      })
    }
  )
  .get(
    "/cards",
    async ({ user, set }) => {
      try {
        if (!user.mp_customer_id) {
          return { cards: [] };
        }
        const cards = await customerCardClient.list({ customerId: user.mp_customer_id });
        return { cards: cards || [] };
      } catch (error) {
        console.error("Error obteniendo tarjetas:", error);
        return { cards: [] };
      }
    }
  )
  .delete(
    "/cards/:cardId",
    async ({ params: { cardId }, user, set }) => {
      try {
        if (!user.mp_customer_id) {
          set.status = 400;
          return { error: "No tienes tarjetas guardadas" };
        }
        await customerCardClient.remove({
          customerId: user.mp_customer_id,
          cardId: cardId
        });
        return { message: "Tarjeta eliminada correctamente" };
      } catch (error) {
        console.error("Error eliminando tarjeta:", error);
        set.status = 500;
        return { error: "No se pudo eliminar la tarjeta" };
      }
    }
  )
  .get(
    "/history",
    async ({ user, set }) => {
      try {
        if (user.rol !== "ARRENDADOR") {
          set.status = 403;
          return { error: "Solo los arrendadores tienen historial de ingresos" };
        }
        const transacciones = await db.transaccion.findMany({
          where: { id_receptor: user.id_usuario },
          orderBy: { fecha_creacion: 'desc' },
          include: {
            inmueble: { select: { titulo: true } },
            usuario: { select: { nombre: true, apellidos: true } }
          }
        });
        return { transacciones };
      } catch (error) {
        console.error("Error obteniendo historial de pagos:", error);
        set.status = 500;
        return { error: "No se pudo obtener el historial" };
      }
    }
  )
  .post(
    "/process-renta",
    async ({ body, user, set }) => {
      try {
        // Verificar que el estudiante esté autorizado para rentar este inmueble
        const inmueble = await db.inmueble.findUnique({
          where: { id_inmueble: body.id_inmueble },
          select: { id_inmueble: true, precio_mensual: true, titulo: true, id_arrendador: true, id_estudiante_autorizado: true },
        });
        if (!inmueble) {
          set.status = 404;
          return { error: "Inmueble no encontrado" };
        }
        if (inmueble.id_estudiante_autorizado !== user.id_usuario) {
          set.status = 403;
          return { error: "No estás autorizado para rentar este inmueble" };
        }
        let customerId = user.mp_customer_id;
        if (body.saveCard && !customerId) {
          const newCustomer = await customerClient.create({
            body: { email: user.email, first_name: user.nombre, last_name: user.apellidos }
          });
          customerId = newCustomer.id || null;
          await db.usuario.update({
            where: { id_usuario: user.id_usuario },
            data: { mp_customer_id: customerId }
          });
        }
        if (body.saveCard && customerId && body.token) {
          try {
            await customerCardClient.create({ customerId, body: { token: body.token } });
          } catch (e) {
            console.log("Error al guardar tarjeta:", e);
          }
        }
        const monto = Number(inmueble.precio_mensual);
        const paymentData: any = {
          body: {
            transaction_amount: monto,
            description: `Renta mensual — ${inmueble.titulo}`,
            payment_method_id: body.payment_method_id,
            payer: { email: user.email },
            installments: body.installments || 1,
            token: body.token,
          }
        };
        if (body.issuer_id) paymentData.body.issuer_id = body.issuer_id;
        const result = await paymentClient.create(paymentData);
        console.log(`[MercadoPago] Renta procesada: ID=${result.id} | Estado=${result.status} | Inmueble=${inmueble.id_inmueble}`);
        await db.transaccion.create({
          data: {
            monto,
            estado: result.status || "pending",
            payment_id: result.id?.toString(),
            descripcion: `Renta mensual — ${inmueble.titulo}`,
            id_usuario: user.id_usuario,
          }
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
            fecha_inicio_renta: fechaInicio,
            fecha_fin_renta: fechaFin,
          }
        });
        // Notificar al arrendador
        const arrendador = await db.usuario.findUnique({
          where: { id_usuario: inmueble.id_arrendador },
          select: { id_usuario: true, nombre: true, apellidos: true },
        });
        if (arrendador) {
          await db.notificacion.create({
            data: {
              usuario_id: arrendador.id_usuario,
              titulo: "Renta confirmada",
              mensaje: `${user.nombre} ${user.apellidos} ha completado el pago de renta de ${inmueble.titulo}.`,
              tipo: "renta_confirmada",
              remitente_nombre: `${user.nombre} ${user.apellidos}`,
              visto: false,
              relacionado_a: inmueble.id_inmueble.toString(),
            }
          });
        }
        if (result.status === "rejected") {
          set.status = 400;
          return { error: "El pago fue rechazado", detail: result.status_detail };
        }
        return {
          status: result.status,
          id: result.id,
          message: "Renta pagada exitosamente",
        };
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
      })
    }
  );
