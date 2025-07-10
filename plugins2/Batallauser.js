const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🛡️ Reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🛡️", key: msg.key }
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
    if (rpgData.usuarios[userId]?.cooldowns?.batallaUser) {
      let last = rpgData.usuarios[userId].cooldowns.batallaUser;
      if (Date.now() - last < 5 * 60 * 1000) {
        let secs = Math.ceil((5 * 60 * 1000 - (Date.now() - last)) / 1000);
        await conn.sendMessage(
          msg.key.remoteJid,
          { text: `⏳ *Debes esperar ${secs} segundos antes de usar \`${global.prefix}batallauser\` nuevamente.*` },
          { quoted: msg }
        );
        return;
      }
    }

    // ❌ Verificar que el propio usuario exista
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No tienes una cuenta en Azura Ultra. Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.*` },
        { quoted: msg }
      );
      return;
    }
    let usuario = rpgData.usuarios[userId];

    // 📌 Obtener opponentId (cita o mención)
    let opponentId =
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        ? msg.message.extendedTextMessage.contextInfo.participant
        : msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!opponentId) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "⚔️ *Menciona o cita a un usuario para retarlo a una batalla entre usuarios.*" },
        { quoted: msg }
      );
      return;
    }

    // ❌ Verificar que el oponente exista
    if (!rpgData.usuarios[opponentId]) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *El oponente no tiene cuenta en el gremio Azura Ultra.*" },
        { quoted: msg }
      );
      return;
    }
    let oponente = rpgData.usuarios[opponentId];

    // 🌟 Formatear habilidades
    const fmt = u => Object.entries(u.habilidades)
      .map(([h, d]) => `⚡ *${h}:* Nivel ${d.nivel || d}`)
      .join("\n");

    let habUser = fmt(usuario);
    let habOpp  = fmt(oponente);

    // 🛡️ Construir mensaje de desafío
    let challengeMsg =
      `🛡️ *¡Desafío de Batalla entre Usuarios!* 🛡️\n\n` +
      `👤 *Retador:* @${userId.split('@')[0]}\n` +
      `🎯 *Retado:*  @${opponentId.split('@')[0]}\n\n` +
      `📊 *Datos de @${userId.split('@')[0]}:*\n` +
      `   • *Nivel:* ${usuario.nivel}\n` +
      `   • *Vida:* ${usuario.vida}\n` +
      `   • *Habilidades:*\n${habUser}\n\n` +
      `📊 *Datos de @${opponentId.split('@')[0]}:*\n` +
      `   • *Nivel:* ${oponente.nivel}\n` +
      `   • *Vida:* ${oponente.vida}\n` +
      `   • *Habilidades:*\n${habOpp}\n\n` +
      `🛡️ *@${opponentId.split('@')[0]}*, responde con \`${global.prefix}gouser\` para aceptar.\n` +
      `⏳ *Tienes 2 minutos para aceptar.*`;

    await conn.sendMessage(
      msg.key.remoteJid,
      { text: challengeMsg, mentions: [userId, opponentId] }
    );

    // 💾 Guardar solicitud
    usuario.battleRequest = {
      target: opponentId,
      time: Date.now(),
      type: "user"
    };
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // ⏰ Expiración de 2 minutos
    setTimeout(() => {
      let d = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
      if (
        d.usuarios[userId]?.battleRequest?.target === opponentId &&
        d.usuarios[userId].battleRequest.type === "user"
      ) {
        delete d.usuarios[userId].battleRequest;
        fs.writeFileSync(rpgFile, JSON.stringify(d, null, 2));
        conn.sendMessage(
          msg.key.remoteJid,
          { text: "⏳ *La solicitud de batalla user ha expirado.*" },
          { quoted: msg }
        );
      }
    }, 120000);

  } catch (error) {
    console.error("❌ Error en .batallauser:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Error inesperado al procesar batalla entre usuarios.*" },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['batallauser'];
