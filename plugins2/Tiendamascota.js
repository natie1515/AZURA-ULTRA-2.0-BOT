const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔄 Enviar reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "🐾", key: msg.key } // Emoji de mascota 🐾
    });

    // Leer el archivo RPG JSON
    const rpgFile = "./rpg.json";
    let rpgData = fs.existsSync(rpgFile)
      ? JSON.parse(fs.readFileSync(rpgFile, "utf-8"))
      : { tiendaMascotas: [] };

    // Verificar si hay mascotas en la tienda
    if (!rpgData.tiendaMascotas || rpgData.tiendaMascotas.length === 0) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: "❌ *Actualmente no hay mascotas en la tienda.*\n🔹 Usa `.addmascota` para agregar nuevas mascotas." 
      }, { quoted: msg });
      return;
    }

    // Explicación sobre la compra de mascotas 📜
    let mensaje = `🏪 *Tienda de Mascotas - Azura Ultra* 🏪\n\n`;
    mensaje += `🐶 *Aquí puedes comprar mascotas para mejorar tu equipo.*\n`;
    mensaje += `🛍️ *Para comprar una mascota, usa:* \n`;
    mensaje += `   📌 \`${global.prefix}compra <nombre_mascota>\`\n`;
    mensaje += `   📌 \`${global.prefix}compra <número_mascota>\`\n\n`;
    mensaje += `📜 Usa \`${global.prefix}menurpg\` para más información.\n\n`;

    // Mostrar todas las mascotas disponibles 🐾
    rpgData.tiendaMascotas.forEach((mascota, index) => {
      let habilidadesMascota = Object.entries(mascota.habilidades)
        .map(([habilidad, nivel]) => `      🔹 ${habilidad} (Nivel ${nivel})`)
        .join("\n");

      mensaje += `╔══════════════════╗\n`;
      mensaje += `🔹 *${index + 1}. ${mascota.nombre}*\n`;
      mensaje += `   📊 *Rango:* ${mascota.rango}\n`;
      mensaje += `   🎚️ *Nivel Inicial:* ${mascota.nivel || 1}\n`;
      mensaje += `   ❤️ *Vida:* ${mascota.vida || 100} HP\n`;
      mensaje += `   ✨ *Experiencia:* ${mascota.experiencia || 0} / ${mascota.xpMax} XP\n`;
      mensaje += `   🌟 *Habilidades:*\n${habilidadesMascota}\n`;
      mensaje += `   💎 *Precio:* ${mascota.precio} diamantes\n`;
      mensaje += `╚══════════════════╝\n\n`;
    });

    // Explicación Final 📜
    mensaje += `📜 **Explicación Final:**\n`;
    mensaje += `🔹 Usa *${global.prefix}compra <nombre_mascota>* para comprar la mascota que quieras.\n`;
    mensaje += `🔹 También puedes usar *${global.prefix}compra <número_mascota>* si prefieres usar el número de la lista.\n`;
    mensaje += `🔹 Usa *${global.prefix}vermascotas* para ver todas las mascotas que has comprado.\n`;
    mensaje += `🔹 Usa *${global.prefix}mascota <número>* para cambiar tu mascota principal.\n\n`;
    mensaje += `🚀 **¡Colecciona y entrena las mejores mascotas en el Gremio Azura Ultra!** 🏆`;

    // Enviar mensaje con el video como GIF 🎥
    await conn.sendMessage(msg.key.remoteJid, { 
      video: { url: "https://cdn.dorratz.com/files/1740573307122.mp4" },
      gifPlayback: true,
      caption: mensaje
    }, { quoted: msg });

    // ✅ Confirmación con reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "✅", key: msg.key } // Emoji de confirmación ✅
    });

  } catch (error) {
    console.error("❌ Error en el comando .tiendamascotas:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Ocurrió un error al cargar la tienda de mascotas. Inténtalo de nuevo.*" 
    }, { quoted: msg });

    // ❌ Enviar reacción de error
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "❌", key: msg.key } // Emoji de error ❌
    });
  }
};

module.exports.command = ['tiendamascotas'];
