const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🕵️‍♂️ Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🕵️‍♂️", key: msg.key }
    });

    const rpgFile = "./rpg.json";
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: "❌ *Los datos del RPG no están disponibles.*"
      }, { quoted: msg });
      return;
    }

    const rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
    const userId = msg.key.participant || msg.key.remoteJid;
    const usuario = rpgData.usuarios[userId];

    // ❌ Verificar registro
    if (!usuario) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No tienes una cuenta registrada en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }

    // 🚑 Verificar vida
    if (usuario.vida <= 0) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🚑 *¡No puedes cometer un crimen!*\n\n🔴 *Tu vida es 0.*\n📜 Usa \`${global.prefix}hospital\` para recuperarte.`
      }, { quoted: msg });
      return;
    }

    // 🕒 Verificar cooldown
    const now = Date.now();
    const cd = usuario.cooldowns?.crime;
    if (cd && now - cd < 6 * 60 * 1000) {
      const mins = ((cd + 6*60*1000 - now) / 60000).toFixed(1);
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⏳ *Debes esperar ${mins} minutos antes de intentar otro crimen.*`
      }, { quoted: msg });
      return;
    }

    // 🎲 Probabilidad de éxito
    const success = Math.random() < 0.85;
    let xp, diamonds, lifeLoss;
    if (success) {
      xp = Math.floor(Math.random() * 2501) + 500;       // 500–3000
      diamonds = Math.floor(Math.random() * 1481) + 20; // 20–1500
      lifeLoss = Math.floor(Math.random() * 6) + 5;     // 5–10
    } else {
      xp = - (Math.floor(Math.random() * 701) + 300);   // -300–-1000
      diamonds = 0;
      lifeLoss = Math.floor(Math.random() * 11) + 10;   // 10–20
    }

    usuario.vida = Math.max(0, usuario.vida - lifeLoss);
    if (success) {
      usuario.experiencia += xp;
      usuario.diamantes += diamonds;
    } else {
      usuario.experiencia = Math.max(0, usuario.experiencia + xp);
    }

    // 📢 Mensaje resultado
    const winMsgs = [
      `🕵️‍♂️ *${usuario.nombre} planeó un crimen perfecto y escapó con el botín.*\n💎 *${diamonds} diamantes*  ✨ *${xp} XP*\n❤️ *- ${lifeLoss} HP*`,
      `💰 *${usuario.nombre} hackeó una cuenta bancaria y se hizo rico.*\n💎 *${diamonds} diamantes*  ✨ *${xp} XP*\n❤️ *- ${lifeLoss} HP*`
    ];
    const loseMsgs = [
      `🚔 *${usuario.nombre} fue atrapado y perdió XP.*\n💀 *${-xp} XP*  ❤️ *- ${lifeLoss} HP*`,
      `🚨 *Alarma activada, ${usuario.nombre} huyó sin botín y perdió XP.*\n💀 *${-xp} XP*  ❤️ *- ${lifeLoss} HP*`
    ];

    await conn.sendMessage(msg.key.remoteJid, {
      text: success
        ? winMsgs[Math.floor(Math.random() * winMsgs.length)]
        : loseMsgs[Math.floor(Math.random() * loseMsgs.length)]
    }, { quoted: msg });

    // 🌟 Mejora de habilidad 30%
    const habs = Object.keys(usuario.habilidades || {});
    if (habs.length && Math.random() < 0.3) {
      const h = habs[Math.floor(Math.random() * habs.length)];
      usuario.habilidades[h].nivel += 1;
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🌟 *¡${usuario.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${h}: Nivel ${usuario.habilidades[h].nivel}*`
      }, { quoted: msg });
    }

    // 🏅 Actualizar rango y nivel
    let xpMax = usuario.nivel === 1 ? 1000 : usuario.nivel * 1500;
    while (usuario.experiencia >= xpMax && usuario.nivel < 50) {
      usuario.experiencia -= xpMax;
      usuario.nivel++;
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🎉 *¡${usuario.nombre} ha subido al nivel ${usuario.nivel}! 🏆*`
      }, { quoted: msg });
      xpMax = usuario.nivel * 1500;
    }

    const ranks = [
      { lvl:1, name:"🌟 Novato" },
      { lvl:5, name:"⚔️ Guerrero Novato" },
      { lvl:10,name:"🔥 Maestro Criminal" },
      { lvl:20,name:"👑 Élite del Crimen" },
      { lvl:30,name:"🌀 Genio del Robo" },
      { lvl:40,name:"💀 Rey del Crimen" },
      { lvl:50,name:"🚀 Señor Supremo" }
    ];
    const prevRank = usuario.rango;
    usuario.rango = ranks.reduce((a,r)=> usuario.nivel>=r.lvl?r.name:a, usuario.rango);
    if (usuario.rango !== prevRank) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🎖️ *¡${usuario.nombre} ha subido de rango a ${usuario.rango}!* 🚀`
      }, { quoted: msg });
    }

    usuario.cooldowns = usuario.cooldowns||{};
    usuario.cooldowns.crime = now;
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null,2));
  } catch (e) {
    console.error("❌ Error en .crime:", e);
  }
};

module.exports.command = ['crime'];
