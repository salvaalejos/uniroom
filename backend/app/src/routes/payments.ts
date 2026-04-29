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
  );
