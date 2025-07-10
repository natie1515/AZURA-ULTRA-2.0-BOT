const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔄 Reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🎭", key: msg.key }
    });

    const rpgFile = "./rpg.json";
    const data = fs.existsSync(rpgFile)
      ? JSON.parse(fs.readFileSync(rpgFile, "utf-8"))
      : { usuarios: {} };
    const userId = msg.key.participant || msg.key.remoteJid;

    // ❌ Verificar si el usuario está registrado
    if (!data.usuarios[userId]) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No estás registrado en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
        },
        { quoted: msg }
      );
    }

    const usuario = data.usuarios[userId];

    // ❌ Verificar si el usuario tiene personajes
    if (!usuario.personajes || usuario.personajes.length === 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes personajes en tu colección.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar alguno.`
        },
        { quoted: msg }
      );
    }

    // 📜 Lista de personajes del usuario
    let mensaje = `🎭 *Tus Personajes Comprados - Azura Ultra* 🎭\n\n`;

    usuario.personajes.forEach((personaje, index) => {
      mensaje += `═════════════════════\n`;
      mensaje += `🔹 *${index + 1}. ${personaje.nombre}*\n`;
      mensaje += `   🏅 *Rango:* ${personaje.rango}\n`;
      mensaje += `   🎚️ *Nivel:* ${personaje.nivel}\n`;
      mensaje += `   ❤️ *Vida:* ${personaje.vida} HP\n`;
      mensaje += `   ✨ *Experiencia:* ${personaje.experiencia} / ${personaje.xpMax} XP\n`;
      mensaje += `   🌟 *Habilidades:*\n`;
      Object.entries(personaje.habilidades).forEach(([habilidad, nivel]) => {
        mensaje += `      🔹 ${habilidad} (Nivel ${nivel})\n`;
      });
      mensaje += `   💎 *Valor:* ${personaje.precio} diamantes\n\n`;
    });

    // 🔥 Opciones de gestión de personajes
    mensaje += `═════════════════════\n`;
    mensaje += `🛠️ *Gestión de personajes:*\n`;
    mensaje += `🔹 \`${global.prefix}per <número>\` - Cambiar personaje principal\n`;
    mensaje += `🔹 \`${global.prefix}nivelper\` - Ver estadísticas detalladas\n`;
    mensaje += `🔹 \`${global.prefix}bolasdeldragon\` - Revivir personaje\n`;
    mensaje += `🔹 \`${global.prefix}vender <nombre> <precio>\` - Vender personaje\n`;
    mensaje += `🔹 \`${global.prefix}quitarventa <nombre>\` - Retirar de la venta\n\n`;

    // ⚔️ Modo Batalla y Rankings
    mensaje += `⚔️ *Batalla y Ranking:*\n`;
    mensaje += `🔹 \`${global.prefix}batallaanime\` - Luchar contra otro personaje\n`;
    mensaje += `🔹 \`${global.prefix}topper\` - Ver ranking de personajes\n\n`;

    // 🏆 Comandos para subir de nivel
    mensaje += `🏆 *Subir de nivel:*\n`;
    mensaje += `🔹 \`${global.prefix}luchar\`, \`${global.prefix}poder\`, \`${global.prefix}volar\`\n`;
    mensaje += `🔹 \`${global.prefix}otromundo\`, \`${global.prefix}otrouniverso\`, \`${global.prefix}mododios\`\n`;
    mensaje += `🔹 \`${global.prefix}mododiablo\`, \`${global.prefix}enemigos\`, \`${global.prefix}podermaximo\`\n`;

    // 🎥 Enviar mensaje con video como GIF
    await conn.sendMessage(
      msg.key.remoteJid,
      {
        video: { url: "https://cdn.dorratz.com/files/1740651987117.mp4" },
        gifPlayback: true,
        caption: mensaje
      },
      { quoted: msg }
    );

    // ✅ Reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .verper:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Ocurrió un error al obtener la lista de personajes. Inténtalo de nuevo.*" },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['verper'];
