import { Elysia, t } from "elysia";
import { db } from "../db";
import jwt from "@elysiajs/jwt";
import { MercadoPagoConfig, Payment, Customer, CustomerCard } from "mercadopago";
import { emitToUser } from "../ws-server";

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

        // Si el usuario quiere guardar la tarjeta y no tiene customer_id, se crea
        if (body.saveCard && !customerId) {
          const newCustomer = await customerClient.create({
            body: {
              email: user.email,
              first_name: user.nombre,
              last_name: user.apellidos,
            }
          });
          customerId = newCustomer.id || null;
          // Actualizar en base de datos
          await db.usuario.update({
            where: { id_usuario: user.id_usuario },
            data: { mp_customer_id: customerId }
          });
        }

        // Si se va a guardar la tarjeta, la asociamos al customer
        if (body.saveCard && customerId && body.token) {
          try {
            await customerCardClient.create({
              customerId,
              body: { token: body.token }
            });
          } catch (e) {
            console.log("Error al guardar tarjeta:", e);
            // Ignorar el error para no detener el cobro principal
          }
        }

        // Procesar el pago
        const paymentData: any = {
          body: {
            transaction_amount: body.transaction_amount || 50, // Tarifa por defecto de 50 MXN
            description: "Tarifa de servicio de contacto UniR00M",
            payment_method_id: body.payment_method_id,
            payer: {
              email: user.email,
            },
            installments: body.installments || 1,
            token: body.token, // Puede ser el token recién generado o el token de una tarjeta guardada
          }
        };

        if (body.issuer_id) {
          paymentData.body.issuer_id = body.issuer_id;
        }

        const result = await paymentClient.create(paymentData);

        // Log para ver en la consola de Bun que el pago fue exitoso
        console.log(`✅ [MercadoPago] Pago procesado: ID=${result.id} | Estado=${result.status} | Detalle=${result.status_detail}`);

        // Guardar transacción en la base de datos
        await db.transaccion.create({
          data: {
            monto: body.transaction_amount || 50,
            estado: result.status || "pending",
            payment_id: result.id?.toString(),
            descripcion: "Tarifa de servicio de contacto",
            id_usuario: user.id_usuario,
          }
        });

        if (result.status === "rejected") {
          set.status = 400;
          return { error: "El pago fue rechazado", detail: result.status_detail };
        }

        return {
          status: result.status,
          id: result.id,
          message: "Pago procesado exitosamente"
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
        transaction_amount: t.Optional(t.Number()),
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
        return { cards };
      } catch (error) {
        console.error("Error obteniendo tarjetas:", error);
        set.status = 500;
        return { error: "No se pudieron obtener las tarjetas guardadas" };
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
          // Notificar vía WebSocket al arrendador
          emitToUser(arrendador.id_usuario, "renta_confirmada", {
            inmuebleId: inmueble.id_inmueble,
            estudianteNombre: `${user.nombre} ${user.apellidos}`,
            mensaje: `${user.nombre} ${user.apellidos} ha pagado la renta de ${inmueble.titulo}`
          });
        }

        // NUEVO: Notificar vía WebSocket al estudiante para actualizar su HomeScreen
        emitToUser(user.id_usuario, "renta_confirmada_estudiante", {
          inmuebleId: inmueble.id_inmueble,
          mensaje: `Tu pago de renta para ${inmueble.titulo} ha sido procesado exitosamente.`
        });
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
