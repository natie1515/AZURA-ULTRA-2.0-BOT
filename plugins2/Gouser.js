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

    // 🕵️ Buscar quién desafió al usuario (tipo "user")
    const challengerId = Object.keys(rpgData.usuarios).find(id =>
      rpgData.usuarios[id].battleRequest &&
      rpgData.usuarios[id].battleRequest.target === userId &&
      rpgData.usuarios[id].battleRequest.type === "user"
    );
    if (!challengerId) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "⚠️ *No tienes ninguna solicitud de batalla entre usuarios pendiente.*" },
        { quoted: msg }
      );
      return;
    }

    // ⏳ Verificar expiración (2 minutos)
    const requestTime = rpgData.usuarios[challengerId].battleRequest.time;
    if (Date.now() - requestTime > 2 * 60 * 1000) {
      delete rpgData.usuarios[challengerId].battleRequest;
      fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "⏳ *La solicitud de batalla entre usuarios ha expirado.*" },
        { quoted: msg }
      );
      return;
    }

    // Eliminar la solicitud
    delete rpgData.usuarios[challengerId].battleRequest;

    let userStats       = rpgData.usuarios[userId];
    let challengerStats = rpgData.usuarios[challengerId];

    // 🔥 Animación de batalla
    const frames = [
      "🛡️ *¡La batalla entre usuarios comienza!* Los guerreros se preparan...",
      `🔥 *${challengerStats.nombre}* lanza un ataque devastador.`,
      `🛡️ *${userStats.nombre}* se defiende con gran habilidad.`,
      `💥 *Impacto crítico de ${userStats.nombre}!*`,
      `⚡ *${challengerStats.nombre}* utiliza su técnica secreta.`,
      `🌪️ *La batalla se intensifica...*`,
      `✨ *El enfrentamiento alcanza su punto álgido...*`,
      "💥 *¡El destino de la batalla está por decidirse!*"
    ];
    let msgAnim = await conn.sendMessage(
      msg.key.remoteJid,
      { text: frames[0] },
      { quoted: msg }
    );
    for (let i = 1; i < frames.length; i++) {
      await new Promise(r => setTimeout(r, 1500));
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: frames[i], edit: msgAnim.key },
        { quoted: msg }
      );
    }

    // ⚔️ Cálculo de stats
    const sumStats = s => 
      s.nivel * 5 +
      Object.values(s.habilidades).reduce((t, h) => t + ((typeof h === 'object' ? h.nivel : h) * 2), 0);

    const statsChall = sumStats(challengerStats);
    const statsUser  = sumStats(userStats);

    let empate = false, ganadorId, perdedorId;
    if (statsChall > statsUser) {
      ganadorId = challengerId; perdedorId = userId;
    } else if (statsChall < statsUser) {
      ganadorId = userId; perdedorId = challengerId;
    } else empate = true;

    let finalMsg = '';
    if (empate) {
      const xpTie      = Math.floor(Math.random() * 301) + 200;
      const diamondTie = Math.floor(Math.random() * 201) + 100;
      [userId, challengerId].forEach(id => {
        rpgData.usuarios[id].diamantes = (rpgData.usuarios[id].diamantes||0) + diamondTie;
        rpgData.usuarios[id].experiencia = (rpgData.usuarios[id].experiencia||0) + xpTie;
      });
      finalMsg =
        `🤝 *¡La batalla entre usuarios terminó en empate!* 🤝\n\n` +
        `Ambos reciben:\n• +${xpTie} XP ✨\n• +${diamondTie} diamantes 💎\n\n` +
        `❤️ Estados:\n` +
        `- ${userStats.nombre}: ${userStats.vida} HP\n` +
        `- ${challengerStats.nombre}: ${challengerStats.vida} HP`;
    } else {
      let win = rpgData.usuarios[ganadorId];
      let lose = rpgData.usuarios[perdedorId];
      // restar vida
      win.vida   = Math.max(0, win.vida   - (Math.floor(Math.random()*10)+5));
      lose.vida  = Math.max(0, lose.vida  - (Math.floor(Math.random()*20)+10));
      // recompensas
      const xpW = Math.floor(Math.random()*701)+300;
      const dmW = Math.floor(Math.random()*301)+200;
      const xpL = Math.floor(Math.random()*201)+100;
      const dmL = Math.floor(Math.random()*151)+50;
      win.experiencia    = (win.experiencia||0)    + xpW;
      win.diamantes      = (win.diamantes||0)      + dmW;
      lose.experiencia   = (lose.experiencia||0)   + xpL;
      lose.diamantes     = (lose.diamantes||0)     + dmL;

      finalMsg =
        `🎉 *¡La batalla entre usuarios ha terminado!* 🎉\n\n` +
        `🏆 *Ganador:* @${ganadorId.split('@')[0]}\n` +
        `💔 *Perdedor:* @${perdedorId.split('@')[0]}\n\n` +
        `• Ganador: +${xpW} XP, +${dmW} 💎\n` +
        `• Perdedor: +${xpL} XP, +${dmL} 💎\n\n` +
        `❤️ Estados:\n` +
        `- ${win.nombre}: ${win.vida} HP\n` +
        `- ${lose.nombre}: ${lose.vida} HP`;
    }

    // 🚀 Subida de nivel
    [userStats, challengerStats].forEach(u => {
      u.xpMax = u.xpMax || (u.nivel*1500);
      while(u.experiencia >= u.xpMax && u.nivel<70){
        u.experiencia -= u.xpMax;
        u.nivel++;
        u.xpMax = u.nivel*1500;
        const rangos = ['🌟 Principiante','⚔️ Guerrero','🔥 Maestro','👑 Élite','🌀 Legendario','💀 Dios de la Batalla'];
        u.rango = rangos[Math.min(Math.floor(u.nivel/10), rangos.length-1)];
      }
    });

    await conn.sendMessage(
      msg.key.remoteJid,
      { text: finalMsg, mentions: empate ? [userId, challengerId] : [ganadorId, perdedorId] },
      { quoted: msg }
    );

    // ⏳ Guardar cooldown (5m)
    [userId, challengerId].forEach(id => {
      rpgData.usuarios[id].cooldowns = rpgData.usuarios[id].cooldowns||{};
      rpgData.usuarios[id].cooldowns.batallaUser = Date.now();
    });

    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
  } catch (err) {
    console.error('❌ Error en .gouser:', err);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: '❌ *Error inesperado al procesar la batalla entre usuarios.*' },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['gouser'];
