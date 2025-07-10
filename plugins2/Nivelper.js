const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔄 Reacción al procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "📜", key: msg.key } });

    const rpgFile = "./rpg.json";

    // 📂 Verificar si el archivo existe y si hay personajes
    if (!fs.existsSync(rpgFile)) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No tienes personajes registrados.*\n📌 Usa \`${global.prefix}comprar <nombre>\` para obtener uno.` },
        { quoted: msg }
      );
    }

    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
    const userId = msg.key.participant || msg.key.remoteJid;

    // ❌ Verificar si el usuario está registrado
    if (!rpgData.usuarios[userId]) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No tienes cuenta en Azura Ultra.*\n📌 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.` },
        { quoted: msg }
      );
    }

    let usuario = rpgData.usuarios[userId];

    // ❌ Verificar si el usuario tiene personajes
    if (!usuario.personajes || usuario.personajes.length === 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No tienes personajes.*\n📌 Usa \`${global.prefix}tiendaper\` para comprar.` },
        { quoted: msg }
      );
    }

    let personajeActual = usuario.personajes[0];

    // 📜 Construcción del mensaje
    let mensaje = `🎭 *Estadísticas de tu Personaje Principal* 🎭\n\n`;
    mensaje += `🔹 *Nombre:* ${personajeActual.nombre}\n`;
    mensaje += `🏅 *Rango:* ${personajeActual.rango}\n`;
    mensaje += `🎚️ *Nivel:* ${personajeActual.nivel}\n`;
    mensaje += `❤️ *Vida:* ${personajeActual.vida} HP\n`;
    mensaje += `✨ *Experiencia:* ${personajeActual.experiencia || 0} / ${personajeActual.xpMax || 1000} XP\n`;
    mensaje += `🌟 *Habilidades:*\n`;
    Object.entries(personajeActual.habilidades).forEach(([habilidad, nivel]) => {
      mensaje += `   🔸 ${habilidad} (Nivel ${nivel})\n`;
    });
    mensaje += `\n📜 Usa \`${global.prefix}verper\` para ver todos tus personajes.\n`;

    // 📸 Enviar imagen y mensaje
    await conn.sendMessage(
      msg.key.remoteJid,
      { image: { url: personajeActual.imagen }, caption: mensaje },
      { quoted: msg }
    );

    // ✅ Confirmación de éxito
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

  } catch (error) {
    console.error("❌ Error en .nivelper:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Error al obtener estadísticas. Intenta otra vez.*" },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "❌", key: msg.key } });
  }
};

module.exports.command = ['nivelper'];
