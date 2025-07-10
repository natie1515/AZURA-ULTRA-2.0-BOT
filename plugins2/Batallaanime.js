const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // ⚔️ Reacción mientras se procesa el comando
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

    // ⏳ Verificar cooldown (5 minutos) para batallas de personajes
    const last = rpgData.usuarios[userId]?.cooldowns?.batallaAnime || 0;
    if (Date.now() - last < 5 * 60 * 1000) {
      const rem = Math.ceil((5 * 60 * 1000 - (Date.now() - last)) / 1000);
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${rem}s antes de volver a usar \`${global.prefix}batallaanime\`.*` },
        { quoted: msg }
      );
      return;
    }

    // 📌 Verificar que el usuario tenga al menos un personaje
    const usr = rpgData.usuarios[userId];
    if (!usr?.personajes?.length) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No tienes un personaje registrado. Usa \`${global.prefix}rpg <nombre> <edad>\` para crear tu cuenta y obtener un personaje inicial.*` },
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
        { text: "⚔️ *Menciona o cita a un usuario para retarlo a una batalla de personajes.*" },
        { quoted: msg }
      );
      return;
    }

    // 📌 Verificar que el oponente tenga un personaje
    const opp = rpgData.usuarios[opponentId];
    if (!opp?.personajes?.length) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *El oponente no tiene un personaje registrado.*" },
        { quoted: msg }
      );
      return;
    }

    const userChar = usr.personajes[0];
    const oppChar = opp.personajes[0];

    // Formatear habilidades
    const fmt = c =>
      Object.entries(c.habilidades)
        .map(([n, v]) => `⚡ *${n}:* Nivel ${v}`)
        .join("\n");

    // 🗡️ Construir mensaje de desafío
    const msgDesafio =
      `🎌 *¡Desafío de Batalla Anime!* 🎌\n\n` +
      `👤 *Retador:* @${userId.split('@')[0]}\n` +
      `🎯 *Retado:* @${opponentId.split('@')[0]}\n\n` +
      `🗡️ *Personaje de @${userId.split('@')[0]}:*\n` +
      `   • Nombre: ${userChar.nombre}\n` +
      `   • Nivel: ${userChar.nivel}\n` +
      `   • Rango: ${userChar.rango}\n` +
      `   • Habilidades:\n${fmt(userChar)}\n\n` +
      `🛡️ *Personaje de @${opponentId.split('@')[0]}:*\n` +
      `   • Nombre: ${oppChar.nombre}\n` +
      `   • Nivel: ${oppChar.nivel}\n` +
      `   • Rango: ${oppChar.rango}\n` +
      `   • Habilidades:\n${fmt(oppChar)}\n\n` +
      `🛡️ *@${opponentId.split('@')[0]}*, responde con \`${global.prefix}goper\` para aceptar.` +
      ` ⏳ Tienes 2 minutos.`;

    await conn.sendMessage(
      msg.key.remoteJid,
      { text: msgDesafio, mentions: [userId, opponentId] },
      { quoted: msg }
    );

    // 💾 Guardar solicitud y cooldown
    usr.battleRequest = { target: opponentId, time: Date.now(), type: "anime" };
    usr.cooldowns = usr.cooldowns || {};
    usr.cooldowns.batallaAnime = Date.now();
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // ⏳ Expiración automática en 2 minutos
    setTimeout(() => {
      const data = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
      if (
        data.usuarios[userId]?.battleRequest?.target === opponentId &&
        data.usuarios[userId]?.battleRequest?.type === "anime"
      ) {
        delete data.usuarios[userId].battleRequest;
        fs.writeFileSync(rpgFile, JSON.stringify(data, null, 2));
        conn.sendMessage(
          msg.key.remoteJid,
          { text: "⏳ *La solicitud de batalla anime ha expirado.*" }
        );
      }
    }, 120000);

  } catch (error) {
    console.error("❌ Error en el comando .batallaanime:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Ocurrió un error al ejecutar `batallaanime`. Intenta nuevamente.*" },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['batallaanime'];
