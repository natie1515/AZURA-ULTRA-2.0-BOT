const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🎌 Reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🎌", key: msg.key }
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

    // 🔍 Buscar quién desafió al usuario (tipo "anime")
    const challengerId = Object.keys(rpgData.usuarios).find(id =>
      rpgData.usuarios[id].battleRequest
      && rpgData.usuarios[id].battleRequest.target === userId
      && rpgData.usuarios[id].battleRequest.type === "anime"
    );
    if (!challengerId) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "⚠️ *No tienes ninguna solicitud de batalla anime pendiente.*" },
        { quoted: msg }
      );
      return;
    }

    // ⏳ Verificar que la solicitud siga activa (2 minutos)
    const reqTime = rpgData.usuarios[challengerId].battleRequest.time;
    if (Date.now() - reqTime > 120000) {
      delete rpgData.usuarios[challengerId].battleRequest;
      fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "⏳ *La solicitud de batalla anime ha expirado.*" },
        { quoted: msg }
      );
      return;
    }

    // 🗡️ Eliminar la solicitud de batalla al aceptar
    delete rpgData.usuarios[challengerId].battleRequest;

    let userChar = rpgData.usuarios[userId].personajes[0];
    let chalChar = rpgData.usuarios[challengerId].personajes[0];

    // 🔥 Animación de batalla
    const anim = [
      "🎌 *¡La batalla anime comienza!* Los guerreros se preparan...",
      `🔥 *${chalChar.nombre}* lanza un ataque devastador.`,
      `🛡️ *${userChar.nombre}* bloquea con gran habilidad.`,
      `💥 *Impacto crítico de ${userChar.nombre}!*`,
      `⚡ *${chalChar.nombre}* utiliza su técnica especial.`,
      `🌪️ *La batalla se intensifica...*`,
      `✨ *El enfrentamiento alcanza su clímax...*`,
      "💥 *¡El destino de la batalla está por decidirse!*"
    ];
    const m = await conn.sendMessage(msg.key.remoteJid, { text: anim[0] }, { quoted: msg });
    for (let i = 1; i < anim.length; i++) {
      await new Promise(r => setTimeout(r, 1500));
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: anim[i], edit: m.key },
        { quoted: msg }
      );
    }

    // ⚔️ Cálculo de stats
    const sumStats = c =>
      c.nivel * 5
      + Object.values(c.habilidades)
          .reduce((t, v) => t + (v.nivel ? v.nivel * 2 : v * 2), 0);

    const sCh = sumStats(chalChar);
    const sUs = sumStats(userChar);

    let tie = false, winId, loseId;
    if (sCh > sUs) {
      winId = challengerId; loseId = userId;
    } else if (sCh < sUs) {
      winId = userId; loseId = challengerId;
    } else tie = true;

    let finalMsg;
    if (tie) {
      const xp = Math.floor(Math.random() * 301) + 200;
      const dm = Math.floor(Math.random() * 201) + 100;
      [userId, challengerId].forEach(id => {
        rpgData.usuarios[id].diamantes = (rpgData.usuarios[id].diamantes || 0) + dm;
        const ch = rpgData.usuarios[id].personajes[0];
        ch.experiencia = (ch.experiencia || 0) + xp;
      });
      finalMsg =
        `🤝 *¡Empate!* 🤝\n\n` +
        `Ambos reciben:\n• +${xp} XP\n• +${dm} diamantes\n\n` +
        `❤️ Vida restante:\n` +
        `- ${userChar.nombre}: ${userChar.vida} HP\n` +
        `- ${chalChar.nombre}: ${chalChar.vida} HP`;
    } else {
      const winChar = rpgData.usuarios[winId].personajes[0];
      const loseChar = rpgData.usuarios[loseId].personajes[0];

      // 🩸 Reducir vida
      winChar.vida = Math.max(0, winChar.vida - (Math.floor(Math.random() * 10) + 5));
      loseChar.vida = Math.max(0, loseChar.vida - (Math.floor(Math.random() * 20) + 10));

      const xpW = Math.floor(Math.random() * 701) + 300;
      const dmW = Math.floor(Math.random() * 301) + 200;
      const xpL = Math.floor(Math.random() * 201) + 100;
      const dmL = Math.floor(Math.random() * 151) + 50;

      winChar.experiencia = (winChar.experiencia || 0) + xpW;
      rpgData.usuarios[winId].diamantes = (rpgData.usuarios[winId].diamantes || 0) + dmW;
      loseChar.experiencia = (loseChar.experiencia || 0) + xpL;
      rpgData.usuarios[loseId].diamantes = (rpgData.usuarios[loseId].diamantes || 0) + dmL;

      finalMsg =
        `🎉 *¡Batalla finalizada!* 🎉\n\n` +
        `🏆 Ganador: @${winId.split('@')[0]}\n` +
        `💔 Perdedor: @${loseId.split('@')[0]}\n\n` +
        `Recompensas:\n` +
        `• Ganador: +${xpW} XP, +${dmW} diamantes\n` +
        `• Perdedor: +${xpL} XP, +${dmL} diamantes\n\n` +
        `❤️ Vida restante:\n` +
        `- ${winChar.nombre}: ${winChar.vida} HP\n` +
        `- ${loseChar.nombre}: ${loseChar.vida} HP`;
    }

    // 🔼 Level up automático
    [userChar, chalChar].forEach(ch => {
      ch.xpMax = ch.xpMax || 1000;
      while (ch.experiencia >= ch.xpMax && ch.nivel < 70) {
        ch.experiencia -= ch.xpMax;
        ch.nivel++;
        ch.xpMax = ch.nivel * 1500;
        const ranks = ['🌟 Principiante','⚔️ Guerrero','🔥 Maestro','👑 Élite','🌀 Legendario','💀 Dios'];
        ch.rango = ranks[Math.min(Math.floor(ch.nivel/10), ranks.length-1)];
      }
    });

    // 📢 Enviar mensaje final
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: finalMsg, mentions: tie ? [userId, challengerId] : [winId, loseId] },
      { quoted: msg }
    );

    // ⏳ Guardar cooldown de batalla (5 min)
    [userId, challengerId].forEach(id => {
      rpgData.usuarios[id].cooldowns = rpgData.usuarios[id].cooldowns || {};
      rpgData.usuarios[id].cooldowns.batallaAnime = Date.now();
    });

    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

  } catch (error) {
    console.error("❌ Error en el comando .goper:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Error inesperado al procesar la batalla anime.*" },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['goper'];
