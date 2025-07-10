const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔄 Enviar reacción de carga mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "🛍️", key: msg.key } // Emoji de tienda 🛍️
    });

    // Leer el archivo RPG JSON
    const rpgFile = "./rpg.json";
    let rpgData = fs.existsSync(rpgFile)
      ? JSON.parse(fs.readFileSync(rpgFile, "utf-8"))
      : { tiendaPersonajes: [] };

    // Verificar si hay personajes en la tienda
    if (!rpgData.tiendaPersonajes || rpgData.tiendaPersonajes.length === 0) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: "❌ *Actualmente no hay personajes en la tienda.*\n🔹 Usa `.addper` para agregar nuevos personajes." 
      }, { quoted: msg });
      return;
    }

    // Explicación de compra al inicio 📜
    let mensaje = `🏪 *Tienda de Personajes - Azura Ultra* 🏪\n\n`;
    mensaje += `🎭 *Compra personajes de anime y mejora sus habilidades.*\n`;
    mensaje += `🛒 *Para comprar un personaje usa:* \n`;
    mensaje += `   📌 \`${global.prefix}comprar <nombre_personaje>\`\n`;
    mensaje += `   📌 \`${global.prefix}comprar <número_personaje>\`\n`;
    mensaje += `📜 Usa \`${global.prefix}menurpg\` para más información.\n\n`;

    // Crear la lista de personajes disponibles 📜
    rpgData.tiendaPersonajes.forEach((personaje, index) => {
      let habilidadesPersonaje = Object.entries(personaje.habilidades)
        .map(
          ([habilidad, datos]) =>
            `      🔹 ${habilidad} (Nivel ${datos.nivel || 1})`
        )
        .join("\n");

      mensaje += `*╔══════════════════╗*\n`;
      mensaje += `🔹 *${index + 1}. ${personaje.nombre}*\n`;
      mensaje += `   🎚️ *Nivel Inicial:* ${personaje.nivel || 1}\n`;
      mensaje += `   ❤️ *Vida:* ${personaje.vida || 100} HP\n`;
      mensaje += `   ✨ *Experiencia:* ${personaje.experiencia || 0} / 1000 XP\n`;
      mensaje += `   🌟 *Habilidades:*\n${habilidadesPersonaje}\n`;
      mensaje += `   💎 *Precio:* ${personaje.precio} diamantes\n`;
      mensaje += `*╚══════════════════╝*\n\n`;
    });

    // Enviar mensaje con el video como GIF 🎥
    await conn.sendMessage(msg.key.remoteJid, { 
      video: { url: "https://cdn.dorratz.com/files/1740568203122.mp4" },
      gifPlayback: true,
      caption: mensaje
    }, { quoted: msg });

    // ✅ Confirmación con reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "✅", key: msg.key } // Emoji de confirmación ✅
    });

  } catch (error) {
    console.error("❌ Error en el comando .tiendaper:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Ocurrió un error al cargar la tienda de personajes. Inténtalo de nuevo.*" 
    }, { quoted: msg });

    // ❌ Enviar reacción de error
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "❌", key: msg.key } // Emoji de error ❌
    });
  }
};

module.exports.command = ['tiendaper'];
