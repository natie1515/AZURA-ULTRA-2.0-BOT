const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // 🔄 Reacción de proceso
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🛑", key: msg.key }
    });

    // Usamos 'text' en lugar de 'args'
    const inputRaw = (text || "").trim();

    // Verificar si el usuario ingresó algo
    if (!inputRaw) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⚠️ *Uso incorrecto.*\nEjemplo: \`${global.prefix}quitarventa <nombre_personaje>\``
      }, { quoted: msg });
      return;
    }

    // 🔍 Limpiar nombre del personaje
    let nombrePersonaje = inputRaw
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_]/g, "");

    let userId = msg.key.participant || msg.key.remoteJid;
    const rpgFile = "./rpg.json";

    // 📂 Cargar datos del RPG
    let rpgData = fs.existsSync(rpgFile)
      ? JSON.parse(fs.readFileSync(rpgFile, "utf-8"))
      : { usuarios: {}, mercadoPersonajes: [] };

    // ❌ Verificar si el usuario tiene cuenta
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No tienes una cuenta registrada en el gremio.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }

    // 🔎 Buscar el personaje en la tienda de venta
    let indexPersonaje = rpgData.mercadoPersonajes.findIndex(p =>
      p.nombre.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "") === nombrePersonaje &&
      p.vendedor === userId
    );

    // ❌ Si el personaje no está en venta
    if (indexPersonaje === -1) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No tienes ese personaje en venta o no te pertenece.*\n📜 Usa \`${global.prefix}alaventa\` para ver la lista de personajes en venta.`
      }, { quoted: msg });
      return;
    }

    // 📦 Recuperar personaje del mercado
    let personajeRecuperado = rpgData.mercadoPersonajes.splice(indexPersonaje, 1)[0];
    delete personajeRecuperado.vendedor; // Quitar 'vendedor'
    personajeRecuperado.precio = personajeRecuperado.precioOriginal; // Restaurar precio original

    // 📜 Agregarlo de nuevo a la cartera del usuario
    if (!rpgData.usuarios[userId].personajes) {
      rpgData.usuarios[userId].personajes = [];
    }
    rpgData.usuarios[userId].personajes.push(personajeRecuperado);

    // Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // 📜 Construir mensaje con habilidades
    let habilidadesPersonaje = Object.entries(personajeRecuperado.habilidades)
      .map(([habilidad, nivel]) => `   🔹 ${habilidad} (Nivel ${nivel})`)
      .join("\n");

    // Mensaje de confirmación
    let mensaje = `✅ *Has retirado a ${personajeRecuperado.nombre} del mercado y ha sido devuelto a tu cartera.*\n\n`;
    mensaje += `🏅 *Rango:* ${personajeRecuperado.rango}\n`;
    mensaje += `🎚️ *Nivel:* ${personajeRecuperado.nivel}\n`;
    mensaje += `❤️ *Vida:* ${personajeRecuperado.vida} HP\n`;
    mensaje += `✨ *Experiencia:* ${personajeRecuperado.experiencia} / ${personajeRecuperado.xpMax} XP\n`;
    mensaje += `🌟 *Habilidades:*\n${habilidadesPersonaje}\n`;
    mensaje += `💎 *Precio Original:* ${personajeRecuperado.precio} diamantes\n\n`;
    mensaje += `📜 Usa \`${global.prefix}verper\` para ver tu lista de personajes.\n`;

    // 📷 Enviar la imagen si existe
    if (personajeRecuperado.imagen && personajeRecuperado.imagen.startsWith("http")) {
      await conn.sendMessage(msg.key.remoteJid, {
        image: { url: personajeRecuperado.imagen },
        caption: mensaje
      }, { quoted: msg });
    } else {
      await conn.sendMessage(msg.key.remoteJid, {
        text: mensaje
      }, { quoted: msg });
    }

    // ✅ Reacción de confirmación
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .quitarventa:", error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Ocurrió un error al retirar el personaje del mercado. Inténtalo de nuevo.*"
    }, { quoted: msg });

    // ❌ Reacción de error
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['quitarventa'];
