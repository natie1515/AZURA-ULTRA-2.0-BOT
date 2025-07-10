const fs = require("fs");

module.exports = async (msg, { sock }) => {
  try {
    const rpgFile = "./rpg.json";
    const chatId = msg.key.remoteJid;
    const userId = msg.key.participant || chatId;

    // Verificar que existan datos RPG
    if (!fs.existsSync(rpgFile)) {
      return sock.sendMessage(
        chatId,
        { text: `❌ *No hay datos de RPG. Usa \`${global.prefix}crearcartera\` para empezar.*` },
        { quoted: msg }
      );
    }

    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // Buscar quién desafió al usuario
    const challengerId = Object.keys(rpgData.usuarios).find(id =>
      rpgData.usuarios[id].battleRequest?.target === userId
    );
    if (!challengerId) {
      return sock.sendMessage(
        chatId,
        { text: "⚠️ *No tienes ninguna solicitud de batalla pendiente.*" },
        { quoted: msg }
      );
    }

    // Verificar expiración (2 minutos)
    const req = rpgData.usuarios[challengerId].battleRequest;
    if (Date.now() - req.time > 120000) {
      delete rpgData.usuarios[challengerId].battleRequest;
      fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
      return sock.sendMessage(
        chatId,
        { text: "⏳ *La solicitud de batalla ha expirado.*" },
        { quoted: msg }
      );
    }

    // Aceptar y eliminar la solicitud
    delete rpgData.usuarios[challengerId].battleRequest;

    const userMascot = rpgData.usuarios[userId].mascotas[0];
    const chMascot = rpgData.usuarios[challengerId].mascotas[0];

    // Animación de mensajes
    const frames = [
      "⚔️ *¡La batalla comienza!* Las mascotas se preparan...",
      `🔥 *${chMascot.nombre}* arremete primero.`,
      `🛡️ *${userMascot.nombre}* esquiva y contraataca.`,
      `💥 *${userMascot.nombre}* asesta un golpe crítico.`,
      `⚡ *${chMascot.nombre}* usa su habilidad especial.`,
      `🌪️ *La batalla se intensifica...*`,
      `✨ *¡Impacto final! Decidiendo el resultado...*`
    ];
    let sent = await sock.sendMessage(chatId, { text: frames[0] }, { quoted: msg });
    for (let i = 1; i < frames.length; i++) {
      await new Promise(r => setTimeout(r, 1500));
      await sock.sendMessage(chatId, { text: frames[i], edit: sent.key }, { quoted: msg });
    }

    // Calcular fuerza
    const calc = m =>
      m.nivel * 5 +
      Object.values(m.habilidades).reduce((t, h) => t + ((h.nivel || h) * 2), 0);
    const s1 = calc(chMascot), s2 = calc(userMascot);

    let finalMsg, tie = s1 === s2;
    if (tie) {
      // Empate
      const xpT = Math.floor(Math.random() * 301) + 200;
      const dT = Math.floor(Math.random() * 201) + 100;
      [userMascot, chMascot].forEach(m => m.experiencia += xpT);
      rpgData.usuarios[userId].diamantes += dT;
      rpgData.usuarios[challengerId].diamantes += dT;
      finalMsg =
        `🤝 *¡Empate!* 🤝\n\n` +
        `Ambos reciben +${xpT} XP y +${dT} diamantes.\n\n` +
        `❤️ _HP_\n` +
        `- ${userMascot.nombre}: ${userMascot.vida} HP\n` +
        `- ${chMascot.nombre}: ${chMascot.vida} HP`;
    } else {
      // Victoria o derrota
      const winId = s1 > s2 ? challengerId : userId;
      const loseId = winId === userId ? challengerId : userId;
      const winM = rpgData.usuarios[winId].mascotas[0];
      const loseM = rpgData.usuarios[loseId].mascotas[0];

      // Ajustar vida
      winM.vida = Math.max(0, winM.vida - (Math.floor(Math.random() * 10) + 5));
      loseM.vida = Math.max(0, loseM.vida - (Math.floor(Math.random() * 20) + 10));

      // Recompensas
      const xpW = Math.floor(Math.random() * 701) + 300;
      const dW = Math.floor(Math.random() * 301) + 200;
      const xpL = Math.floor(Math.random() * 201) + 100;
      const dL = Math.floor(Math.random() * 151) + 50;

      winM.experiencia += xpW;
      rpgData.usuarios[winId].diamantes += dW;
      loseM.experiencia += xpL;
      rpgData.usuarios[loseId].diamantes += dL;

      finalMsg =
        `🎉 *Resultado de la batalla* 🎉\n\n` +
        `🏆 Ganador: @${winId.split("@")[0]}\n` +
        `💔 Perdedor: @${loseId.split("@")[0]}\n\n` +
        `• Ganador: +${xpW} XP, +${dW} diamantes\n` +
        `• Perdedor: +${xpL} XP, +${dL} diamantes\n\n` +
        `❤️ _HP final_\n` +
        `- ${winM.nombre}: ${winM.vida} HP\n` +
        `- ${loseM.nombre}: ${loseM.vida} HP`;
    }

    // Nivel up automático
    for (const m of [userMascot, chMascot]) {
      m.xpMax = m.xpMax || 500;
      while (m.experiencia >= m.xpMax && m.nivel < 80) {
        m.experiencia -= m.xpMax;
        m.nivel++;
        m.xpMax = m.nivel * 500;
        const ranges = ['🐾 Principiante','🐾 Intermedio','🐾 Avanzado','🐾 Experto','🐾 Leyenda'];
        m.rango = ranges[Math.min(Math.floor(m.nivel/10), ranges.length-1)];
      }
    }

    // Enviar resultado con menciones
    await sock.sendMessage(
      chatId,
      { text: finalMsg, mentions: tie ? [userId, challengerId] : [winId, loseId] },
      { quoted: msg }
    );

    // Guardar cooldown de batalla (5 min)
    [userId, challengerId].forEach(id => {
      rpgData.usuarios[id].cooldowns = rpgData.usuarios[id].cooldowns || {};
      rpgData.usuarios[id].cooldowns.batallaMascota = Date.now();
    });

    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

  } catch (error) {
    console.error("❌ Error en .gomascota:", error);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Error inesperado al procesar la batalla.*" },
      { quoted: msg }
    );
  }
};

module.exports.command = ["gomascota"];
