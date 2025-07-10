const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔄 Reacción de proceso
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "🛍️", key: msg.key } 
    });

    const rpgFile = "./rpg.json";
    let rpgData = fs.existsSync(rpgFile)
      ? JSON.parse(fs.readFileSync(rpgFile, "utf-8"))
      : { mercadoPersonajes: [] };

    if (!rpgData.mercadoPersonajes || rpgData.mercadoPersonajes.length === 0) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No hay personajes en venta actualmente.*\n📜 Usa \`${global.prefix}vender <nombre_personaje> <precio>\` para vender uno.` 
      }, { quoted: msg });
      return;
    }

    let mensaje = `🏪 *Mercado de Personajes - Azura Ultra* 🏪\n\n`;
    mensaje += `🎭 *Aquí puedes comprar personajes puestos a la venta por otros jugadores.*\n`;
    mensaje += `🛒 *Para comprar usa:* \n`;
    mensaje += `   📌 \`${global.prefix}comprar2 <nombre_personaje>\`\n\n`;
    mensaje += `📜 Usa \`${global.prefix}menurpg\` para más información.\n\n`;

    // Recorrer los personajes en venta
    rpgData.mercadoPersonajes.forEach((personaje, index) => {
      let habilidadesPersonaje = Object.entries(personaje.habilidades)
        .map(([habilidad, nivel]) => `   🔹 ${habilidad} (Nivel ${nivel})`)
        .join("\n");

      mensaje += `═════════════════════\n`;
      mensaje += `🔹 *${index + 1}. ${personaje.nombre}*\n`;
      mensaje += `🏅 *Rango:* ${personaje.rango}\n`;
      mensaje += `🎚️ *Nivel:* ${personaje.nivel}\n`;
      mensaje += `❤️ *Vida:* ${personaje.vida} HP\n`;
      mensaje += `✨ *Experiencia:* ${personaje.experiencia} / ${personaje.xpMax} XP\n`;
      mensaje += `🌟 *Habilidades:*\n${habilidadesPersonaje}\n`;
      mensaje += `💎 *Precio:* ${personaje.precio} diamantes\n`;
      mensaje += `🛒 *Vendedor:* @${personaje.vendedor.replace("@s.whatsapp.net", "")}\n`;
      mensaje += `═════════════════════\n\n`;
    });

    // 📢 Enviar el mensaje con video como GIF 🎥
    await conn.sendMessage(msg.key.remoteJid, { 
      video: { url: "https://cdn.dorratz.com/files/1740730170576.mp4" }, 
      gifPlayback: true, 
      caption: mensaje, 
      mentions: rpgData.mercadoPersonajes.map(p => p.vendedor) // Menciona a los vendedores
    }, { quoted: msg });

    // ✅ Confirmación con reacción
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "✅", key: msg.key } 
    });

  } catch (error) {
    console.error("❌ Error en el comando .alaventa:", error);
  }
};

module.exports.command = ['alaventa'];
