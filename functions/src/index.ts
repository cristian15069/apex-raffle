import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { Stripe } from "stripe";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Inicialización "perezosa" (lazy) para mejorar el rendimiento de las funciones.
let db: admin.firestore.Firestore;
let stripeClient: Stripe;


// --- FUNCIONES AUXILIARES (Helpers) ---
/**
 * Verifica si el usuario que llama a la función está autenticado y es administrador.
 * Lanza un error si no se cumplen las condiciones.
 */
const ensureIsAdmin = async (context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
  }
  if (!db) db = admin.firestore();
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (userDoc.data()?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "No tienes permisos de administrador.");
  }
};


// =================================================================================================
// --- CLOUD FUNCTIONS PRINCIPALES ---
// =================================================================================================

/**
 * FUNCIÓN 1: Crear un nuevo producto de rifa.
 * TIPO: Callable (se llama desde la app usando el SDK de Firebase).
 */
export const createRaffleProduct = functions.https.onCall(
  async (data, context) => {
    if (!db) db = admin.firestore();
    
    await ensureIsAdmin(context);

    const { name, description, imageUrl, baseCost } = data;
    if (!name || typeof name !== "string" || name.trim().length < 5) {
      throw new functions.https.HttpsError("invalid-argument", "El nombre del producto es inválido.");
    }
    if (!baseCost || typeof baseCost !== "number" || baseCost <= 0) {
      throw new functions.https.HttpsError("invalid-argument", "El costo base debe ser un número positivo.");
    }


    const totalGoal = baseCost * 3;
    const totalTickets = Math.ceil(totalGoal * 0.02 ); 
    const ticketPrice = Math.ceil(totalGoal / totalTickets);

    try {
      const productData = {
        name,
        description: description || "",
        imageUrl: imageUrl || null,
        baseCost,
        totalGoal,
        ticketPrice,
        totalTickets,
        ticketsSold: 0,
        status: "active",
        adminId: context.auth!.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("products").add(productData);
      return { success: true, message: "Producto creado exitosamente." };
    } catch (error) {
      console.error("Error al crear el producto:", error);
      throw new functions.https.HttpsError("internal", "Ocurrió un error al guardar el producto.");
    }
  },
);

/**
 * FUNCIÓN 2: Webhook para confirmación de pagos.
 * TIPO: HTTP Request (la llama un servicio externo como Stripe).
 */
export const paymentWebhook = functions.https.onRequest(
  async (request, response) => {
    if (!db) db = admin.firestore();

    let purchaseId: string | undefined;

    try {
      const eventData = request.body.data?.object;
      if (eventData && eventData.object === 'checkout.session' && eventData.metadata) {
        purchaseId = eventData.metadata.purchaseId;
      }

      if (!purchaseId) {
        response.status(400).send("Falta el ID de la compra en la metadata.");
        return;
      }

      const purchaseRef = db.collection("purchases").doc(purchaseId);

      await db.runTransaction(async (transaction) => {
        const purchaseDoc = await transaction.get(purchaseRef);
        if (!purchaseDoc.exists) {
          throw new Error("Compra no encontrada.");
        }
        const purchaseData = purchaseDoc.data();
        if (!purchaseData || purchaseData.paymentStatus === 'completed') {
          return;
        }

        transaction.update(purchaseRef, { paymentStatus: "completed" });
        const productRef = db.collection("products").doc(purchaseData.productId);
        transaction.update(productRef, {
          ticketsSold: admin.firestore.FieldValue.increment(purchaseData.ticketsBought),
        });

        console.log(`[Transacción ${purchaseId}] Creando ${purchaseData.ticketsBought} boletos.`);
        for (let i = 0; i < purchaseData.ticketsBought; i++) {
          const ticketRef = db.collection("tickets").doc();
          transaction.set(ticketRef, {
            productId: purchaseData.productId,
            userId: purchaseData.userId,
            purchaseId: purchaseId,
          });
        }
      }); 

      response.status(200).send({ success: true, message: "Pago procesado y boletos creados." });

    } catch (error: any) {
      response.status(500).send(`Error interno del servidor: ${error.message}`);
    }
  },
);

/**
 * FUNCIÓN 3: Monitorear el estado de las rifas.
 * TIPO: Firestore Trigger (se dispara automáticamente cuando un producto cambia).
 */
export const monitorRaffleStatus = functions.firestore
  .document("products/{productId}")
  .onUpdate(async (change) => {
    if (!db) db = admin.firestore();

    const productAfter = change.after.data();
    const productBefore = change.before.data();

    const isComplete = productAfter.ticketsSold >= productAfter.totalTickets;
    const wasActive = productBefore.status === "active";

    if (isComplete && wasActive) {
      try {
        await change.after.ref.update({ status: "completed" });

        const adminId = productAfter.adminId;
        const userDoc = await db.collection("users").doc(adminId).get();
        const adminEmail = userDoc.data()?.email;

        if (adminEmail) {
          await db.collection("mail").add({
            to: adminEmail,
            message: {
              subject: `¡La rifa "${productAfter.name}" ha finalizado!`,
              html: `
                <h1>¡Rifa Completada!</h1>
                <p>La rifa para el producto <strong>${productAfter.name}</strong> ha alcanzado su meta de ${productAfter.totalTickets} boletos.</p>
                <p>Es hora de realizar el sorteo para encontrar al ganador.</p>
              `,
            },
          });
        }
      } catch (error) {
        console.error("Error al procesar la finalización de la rifa:", error);
      }
    }
  });
/**
 * FUNCIÓN 4: Crear una sesión de pago con Stripe.
 * TIPO: Callable (se llama desde la app usando el SDK de Firebase).
 */
export const createCheckoutSession = functions.https.onCall(
  async (data, context) => {
    if (!db) db = admin.firestore();

    if (!stripeClient) {
      const stripeKey = functions.config().stripe.secret_key;
      if (!stripeKey) {
        throw new functions.https.HttpsError("internal", "La llave secreta de Stripe no está configurada.");
      }
            stripeClient = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    }

    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    
    const { purchaseId } = data;
    if (!purchaseId) {
      throw new functions.https.HttpsError("invalid-argument", "Falta el ID de la compra.");
    }

    const purchaseDoc = await db.collection("purchases").doc(purchaseId).get();
    const purchaseData = purchaseDoc.data();
    if (!purchaseData || purchaseData.userId !== context.auth.uid) {
      throw new functions.https.HttpsError("not-found", "Compra no encontrada o no autorizada.");
    }

    const productDoc = await db.collection("products").doc(purchaseData.productId).get();
    const productData = productDoc.data();
    if (!productData) {
      throw new functions.https.HttpsError("not-found", "Producto no encontrado.");
    }
    
    const projectUrl = functions.config().project.url;
    if (!projectUrl) {
      throw new functions.https.HttpsError("internal", "La URL del proyecto no está configurada.");
    }
    
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card", "oxxo"],
      mode: "payment",
      success_url: `${projectUrl}/tickets`,
      cancel_url: `${projectUrl}/product/${purchaseData.productId}`,
      line_items: [{
        price_data: {
          currency: "mxn",
          product_data: { name: productData.name },
          unit_amount: Math.round(productData.ticketPrice * 100),
        },
        quantity: purchaseData.ticketsBought,
      }],
      metadata: { purchaseId },
    });

    return { url: session.url };
  },
);

export const getSalesData = functions.https.onCall(async (data, context) => {
  if (!db) db = admin.firestore();
  await ensureIsAdmin(context);

  const { period, startDate: startDateString, endDate: endDateString } = data;
  let startDate: Date;
  let endDate: Date;

  try {
    if (startDateString && endDateString) {
      startDate = new Date(startDateString);
      endDate = new Date(endDateString);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      if (period === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
      else if (period === 'month') startDate = new Date(now.setMonth(now.getMonth() - 1));
      else startDate = new Date(now.setDate(now.getDate() - 1));
      startDate.setHours(0, 0, 0, 0);
    }

    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    const purchasesSnapshot = await db.collection('purchases')
      .where('paymentStatus', '==', 'completed')
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<=', endTimestamp)
      .get();

    if (purchasesSnapshot.empty) return { totalEarnings: 0 };

    const productIds = [...new Set(purchasesSnapshot.docs.map(doc => doc.data().productId))];
    const productPricesCache: { [key: string]: number } = {};
    const productChunks = [];
    for (let i = 0; i < productIds.length; i += 30) {
        productChunks.push(productIds.slice(i, i + 30));
    }
    const productPromises = productChunks.map(chunk =>
        db.collection('products').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get()
    );
    const productSnapshots = await Promise.all(productPromises);
    productSnapshots.forEach(snap => {
        snap.forEach(doc => {
            productPricesCache[doc.id] = doc.data()?.ticketPrice || 0;
        });
    });

    let totalEarnings = 0;
    purchasesSnapshot.forEach(doc => {
      const purchase = doc.data();
      const price = productPricesCache[purchase.productId] || 0;
      totalEarnings += price * purchase.ticketsBought;
    });

    return { totalEarnings: totalEarnings };

  } catch (error) {
    console.error(`Error al obtener datos de ventas:`, error);
    throw new functions.https.HttpsError("internal", "No se pudieron procesar los datos de ventas.");
  }
});


/**
 * FUNCIÓN 6: Desactivar una rifa.
 * El admin que creó la rifa puede cambiar su estado a 'inactive'.
 */
export const deactivateRaffleProduct = functions.https.onCall(async (data, context) => {
  if (!db) db = admin.firestore();
  
  await ensureIsAdmin(context);

  const productId = data.productId;
  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "Falta el ID del producto.");
  }

  try {
    const productRef = db.collection("products").doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      throw new functions.https.HttpsError("not-found", "El producto no existe.");
    }

    if (productDoc.data()?.adminId !== context.auth!.uid) {
      throw new functions.https.HttpsError("permission-denied", "No tienes permiso para modificar esta rifa.");
    }

    await productRef.update({ status: "inactive" });

    return { success: true, message: "La rifa ha sido desactivada correctamente." };

  } catch (error) {
    console.error("Error al desactivar la rifa:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error; 
    }
    throw new functions.https.HttpsError("internal", "Ocurrió un error al desactivar la rifa.");
  }
});

/**
 * FUNCIÓN 7: Realizar el sorteo de una rifa completada.
 * Selecciona un ganador al azar entre todos los boletos vendidos.
 * TIPO: Callable
 */
export const drawRaffleWinner = functions.https.onCall(async (data, context) => {
  if (!db) db = admin.firestore();
  await ensureIsAdmin(context); 

  const productId = data.productId;
  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "Falta el ID del producto.");
  }

  try {
    const productRef = db.collection("products").doc(productId);
    const productDoc = await productRef.get();
    const productData = productDoc.data();

    if (!productDoc.exists) {
      throw new functions.https.HttpsError("not-found", "La rifa no existe.");
    }
    if (productData?.status !== "completed") {
      throw new functions.https.HttpsError("failed-precondition", "La rifa aún no ha finalizado.");
    }
    if (productData?.winnerId) {
      throw new functions.https.HttpsError("failed-precondition", "El sorteo para esta rifa ya se realizó.");
    }
    if (productData?.adminId !== context.auth!.uid) {
        throw new functions.https.HttpsError("permission-denied", "No eres el administrador de esta rifa.");
    }


    const ticketsSnapshot = await db.collection("tickets")
                                    .where("productId", "==", productId)
                                    .get();

    if (ticketsSnapshot.empty) {
      throw new functions.https.HttpsError("internal", "No se encontraron boletos vendidos para esta rifa.");
    }

    const ticketEntries: string[] = [];
    ticketsSnapshot.forEach(doc => {
      ticketEntries.push(doc.data().userId);
    });

    const randomIndex = Math.floor(Math.random() * ticketEntries.length);
    const winnerId = ticketEntries[randomIndex];

    const winnerDoc = await db.collection("users").doc(winnerId).get();
    const winnerEmail = winnerDoc.data()?.email;

    if (!winnerEmail) {
      throw new functions.https.HttpsError("internal", "No se pudo encontrar el email del ganador.");
    }

    await productRef.update({ winnerId: winnerId, status: "drawn" }); 

    await db.collection("mail").add({
      to: winnerEmail,
      message: {
        subject: `¡Felicidades, ganaste la rifa "${productData?.name}"!`,
        html: `
          <h1>¡Ganaste!</h1>
          <p>Nos complace informarte que tu boleto ha sido seleccionado como el ganador de la rifa para el producto: <strong>${productData?.name}</strong>.</p>
          <p>Pronto nos pondremos en contacto contigo para coordinar la entrega del premio.</p>
          <p>¡Gracias por participar!</p>
        `,
      },
    });

    return { success: true, message: `Sorteo realizado. El ganador es ${winnerEmail}.` };

  } catch (error) {
    console.error("Error al realizar el sorteo:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado durante el sorteo.");
  }
});