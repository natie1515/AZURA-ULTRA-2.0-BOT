const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // 🔄 Reacción de proceso
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🛒", key: msg.key }
    });

    // Verificamos que el usuario haya introducido algo en "text"
    const inputRaw = (text || "").trim();
    if (!inputRaw) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⚠️ *Uso incorrecto.*\nEjemplo: \`${global.prefix}comprar2 <nombre_personaje>\``
      }, { quoted: msg });
      return;
    }

    // 🔍 Limpiar el nombre del personaje
    let nombrePersonaje = inputRaw
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_]/g, "");

    let compradorId = msg.key.participant || msg.key.remoteJid;
    const rpgFile = "./rpg.json";

    // 📂 Cargar datos del RPG
    let rpgData = fs.existsSync(rpgFile)
      ? JSON.parse(fs.readFileSync(rpgFile, "utf-8"))
      : { usuarios: {}, mercadoPersonajes: [] };

    // ❌ Verificar si el comprador tiene cuenta
    if (!rpgData.usuarios[compradorId]) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No tienes una cuenta registrada en el gremio.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }

    let comprador = rpgData.usuarios[compradorId];

    // 🔎 Buscar el personaje en la tienda de venta
    let indexPersonaje = rpgData.mercadoPersonajes.findIndex(p =>
      p.nombre.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "") === nombrePersonaje
    );

    // ❌ Si el personaje no está en venta
    if (indexPersonaje === -1) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *Este personaje no está en venta o no existe.*\n📜 Usa \`${global.prefix}alaventa\` para ver la lista de personajes en venta.`
      }, { quoted: msg });
      return;
    }

    // 📦 Obtener los datos del personaje en venta
    let personajeComprado = rpgData.mercadoPersonajes[indexPersonaje];

    // ❌ Evitar que el usuario compre su propio personaje
    if (personajeComprado.vendedor === compradorId) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No puedes comprar tu propio personaje en venta.*`
      }, { quoted: msg });
      return;
    }

    // ❌ Verificar si el usuario tiene suficientes diamantes
    if (comprador.diamantes < personajeComprado.precio) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No tienes suficientes diamantes para comprar a ${personajeComprado.nombre}.*\n💎 *Diamantes requeridos:* ${personajeComprado.precio}\n💰 *Tu saldo:* ${comprador.diamantes}`
      }, { quoted: msg });
      return;
    }

    // 💎 Descontar diamantes al comprador
    comprador.diamantes -= personajeComprado.precio;

    // 💰 Transferir pago al vendedor (si existe en la base de datos)
    if (rpgData.usuarios[personajeComprado.vendedor]) {
      rpgData.usuarios[personajeComprado.vendedor].diamantes += personajeComprado.precio;
    }

    // 📜 Transferir personaje al comprador
    delete personajeComprado.vendedor;
    personajeComprado.precio = personajeComprado.precioOriginal;

    if (!comprador.personajes) comprador.personajes = [];
    comprador.personajes.push(personajeComprado);

    // ❌ Eliminar personaje del mercado
    rpgData.mercadoPersonajes.splice(indexPersonaje, 1);

    // Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // 📜 Construcción del mensaje con habilidades
    let habilidadesPersonaje = Object.entries(personajeComprado.habilidades)
      .map(([habilidad, nivel]) => `   🔹 ${habilidad} (Nivel ${nivel})`)
      .join("\n");

    // 📢 Mensaje de confirmación con imagen
    let mensaje = `🎭 *¡Has comprado un nuevo personaje del mercado!* 🎭\n\n`;
    mensaje += `🔹 *Nombre:* ${personajeComprado.nombre}\n`;
    mensaje += `🏅 *Rango:* ${personajeComprado.rango}\n`;
    mensaje += `🎚️ *Nivel:* ${personajeComprado.nivel}\n`;
    mensaje += `❤️ *Vida:* ${personajeComprado.vida} HP\n`;
    mensaje += `✨ *Experiencia:* ${personajeComprado.experiencia} / ${personajeComprado.xpMax} XP\n`;
    mensaje += `🌟 *Habilidades:*\n${habilidadesPersonaje}\n`;
    mensaje += `💎 *Costo:* ${personajeComprado.precio} diamantes\n\n`;
    mensaje += `📜 Usa \`${global.prefix}verper\` para ver tu lista de personajes.\n`;

    await conn.sendMessage(msg.key.remoteJid, {
      image: { url: personajeComprado.imagen },
      caption: mensaje
    }, { quoted: msg });

    // ✅ Confirmación con reacción
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .comprar2:", error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Ocurrió un error al comprar el personaje. Inténtalo de nuevo.*"
    }, { quoted: msg });
    // ❌ Reacción de error
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['comprar2'];
