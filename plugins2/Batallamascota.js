const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // 🔄 Reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "⚔️", key: msg.key }
    });

    const rpgFile = "./rpg.json";

    // 📂 Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No hay datos de RPG. Usa \`${global.prefix}crearcartera\` para empezar.*` },
        { quoted: msg }
      );
      return;
    }

    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
    let userId = msg.key.participant || msg.key.remoteJid;

    // ⏳ Verificar cooldown (5 minutos)
    const last = rpgData.usuarios[userId]?.cooldowns?.batallaMascota || 0;
    if (Date.now() - last < 5 * 60 * 1000) {
      const rem = Math.ceil((5 * 60 * 1000 - (Date.now() - last)) / 1000);
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${rem}s antes de volver a usar \`${global.prefix}batallamascota\`.*` },
        { quoted: msg }
      );
      return;
    }

    // 📌 Verificar si el usuario tiene mascota
    const usr = rpgData.usuarios[userId];
    if (!usr?.mascotas?.length) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No tienes una mascota. Usa \`${global.prefix}tiendamascotas\` para comprar una.*` },
        { quoted: msg }
      );
      return;
    }

    // 📌 Extraer ID del oponente (cita o mención)
    let opponentId = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      ? msg.message.extendedTextMessage.contextInfo.participant
      : msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!opponentId) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "⚔️ *Menciona o cita a un usuario para retarlo a una batalla de mascotas.*" },
        { quoted: msg }
      );
      return;
    }

    // 📌 Verificar que el oponente tenga mascota
    const opp = rpgData.usuarios[opponentId];
    if (!opp?.mascotas?.length) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *El oponente no tiene ninguna mascota.*" },
        { quoted: msg }
      );
      return;
    }

    // Formatear habilidades
    const formatH = m =>
      Object.entries(m.habilidades)
        .map(([n, d]) => `⚡ *${n}:* Nivel ${d.nivel || d}`)
        .join("\n");

    const userMascot = usr.mascotas[0];
    const oppMascot = opp.mascotas[0];

    // Mensaje de desafío
    const msgDesafio =
      `⚔️ *¡Desafío de Batalla de Mascotas!* ⚔️\n\n` +
      `👤 *Retador:* @${userId.split('@')[0]}\n` +
      `🎯 *Retado:* @${opponentId.split('@')[0]}\n\n` +
      `🐾 *Mascota de @${userId.split('@')[0]}:*\n` +
      `   • Nombre: ${userMascot.nombre}\n` +
      `   • Vida: ${userMascot.vida}\n` +
      `   • Nivel: ${userMascot.nivel}\n` +
      `   • Rango: ${userMascot.rango}\n` +
      `   • Habilidades:\n${formatH(userMascot)}\n\n` +
      `🐾 *Mascota de @${opponentId.split('@')[0]}:*\n` +
      `   • Nombre: ${oppMascot.nombre}\n` +
      `   • Vida: ${oppMascot.vida}\n` +
      `   • Nivel: ${oppMascot.nivel}\n` +
      `   • Rango: ${oppMascot.rango}\n` +
      `   • Habilidades:\n${formatH(oppMascot)}\n\n` +
      `🛡️ *@${opponentId.split('@')[0]}*, responde con \`${global.prefix}gomascota\` para aceptar.` +
      ` ⏳ Tienes 2 minutos.`;

    await conn.sendMessage(
      msg.key.remoteJid,
      { text: msgDesafio, mentions: [userId, opponentId] },
      { quoted: msg }
    );

    // Guardar solicitud y cooldown
    usr.battleRequest = { target: opponentId, time: Date.now() };
    usr.cooldowns = usr.cooldowns || {};
    usr.cooldowns.batallaMascota = Date.now();
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // Expiración automática en 2 minutos
    setTimeout(() => {
      const data = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
      if (data.usuarios[userId]?.battleRequest?.target === opponentId) {
        delete data.usuarios[userId].battleRequest;
        fs.writeFileSync(rpgFile, JSON.stringify(data, null, 2));
        conn.sendMessage(
          msg.key.remoteJid,
          { text: "⏳ *La solicitud de batalla ha expirado.*" }
        );
      }
    }, 120000);

  } catch (error) {
    console.error("❌ Error en el comando .batallamascota:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Ocurrió un error al ejecutar `batallamascota`. Intenta nuevamente.*" },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['batallamascota'];
