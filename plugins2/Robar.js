const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🥷 Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🥷", key: msg.key }
    });

    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 10 * 60 * 1000; // 10 minutos

    // 📂 Verificar existencia de datos
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: "❌ *Los datos del RPG no están disponibles.*"
      }, { quoted: msg });
      return;
    }
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // ❌ Verificar que el ladrón esté registrado
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No tienes una cuenta registrada en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }
    let usuario = rpgData.usuarios[userId];

    // 🚑 Verificar vida del ladrón
    if (usuario.vida <= 0) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🚑 *¡No puedes robar! Tu vida es 0.*\n💉 Usa \`${global.prefix}hospital\` para curarte.`
      }, { quoted: msg });
      return;
    }

    // ⏳ Verificar cooldown
    const now = Date.now();
    if (usuario.cooldowns?.robar && (now - usuario.cooldowns.robar) < cooldownTime) {
      const rem = ((usuario.cooldowns.robar + cooldownTime - now) / 60000).toFixed(1);
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⏳ *Debes esperar ${rem} minutos antes de volver a robar.*`
      }, { quoted: msg });
      return;
    }

    // 👥 Determinar víctima por mención o cita
    const targetId = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (!targetId) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⚠️ *Debes citar o mencionar al usuario que deseas robar.*\n📌 Ejemplo: \`${global.prefix}robar @usuario\``
      }, { quoted: msg });
      return;
    }

    // ❌ Verificar víctima registrada
    if (!rpgData.usuarios[targetId]) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *El usuario al que intentas robar no está registrado en el RPG.*`
      }, { quoted: msg });
      return;
    }

    let victima = { ...rpgData.usuarios[targetId], id: targetId };

    // 🎲 Calcular éxito
    const success = Math.random() < 0.5;
    const vidaPerdida = success
      ? Math.floor(Math.random() * 6) + 5   // 5-10
      : Math.floor(Math.random() * 11) + 10; // 10-20
    usuario.vida = Math.max(0, usuario.vida - vidaPerdida);

    let xpRobbed = 0, diamondsRobbed = 0;
    if (success) {
      xpRobbed = Math.floor(Math.random() * 2501) + 500; // 500-3000
      if (victima.diamantes > 0) {
        diamondsRobbed = Math.min(
          victima.diamantes,
          Math.floor(Math.random() * 1481) + 20 // 20-1500
        );
      } else {
        xpRobbed += Math.floor(Math.random() * 701) + 300; // bonus
      }
      usuario.experiencia += xpRobbed;
      usuario.diamantes += diamondsRobbed;
      victima.diamantes = Math.max(0, victima.diamantes - diamondsRobbed);
      victima.experiencia = Math.max(0, victima.experiencia - xpRobbed);
      rpgData.usuarios[targetId] = victima;
    } else {
      const xpLost = Math.floor(Math.random() * 701) + 300; // 300-1000
      usuario.experiencia = Math.max(0, usuario.experiencia - xpLost);
    }

    // 📢 Enviar resultado
    const textosExito = [
      `🥷 *${usuario.nombre} robó exitosamente a @${victima.id.split('@')[0]}.*\n💎 Diamantes robados: ${diamondsRobbed}\n✨ XP robada: ${xpRobbed}`,
      `💰 *¡Plan maestro! ${usuario.nombre} engañó a @${victima.id.split('@')[0]} y se fue con el botín.*\n💎 ${diamondsRobbed} Diamantes\n🎯 ${xpRobbed} XP`,
      `🚀 *Sigiloso como un ninja, ${usuario.nombre} despojó a @${victima.id.split('@')[0]}.*\n💎 ${diamondsRobbed} Diamantes\n🧠 ${xpRobbed} XP`
    ];
    const textosFracaso = [
      `🚨 *¡${usuario.nombre} fue atrapado intentando robar y perdió vida.*\n❤️ Vida perdida: ${vidaPerdida} HP`,
      `❌ *Intento fallido... ${usuario.nombre} quiso robar a @${victima.id.split('@')[0]} pero fue descubierto.*\n❤️ Vida perdida: ${vidaPerdida} HP`
    ];
    const mensaje = success
      ? textosExito[Math.floor(Math.random() * textosExito.length)]
      : textosFracaso[Math.floor(Math.random() * textosFracaso.length)];

    await conn.sendMessage(msg.key.remoteJid, {
      text: mensaje,
      mentions: [userId, targetId]
    }, { quoted: msg });

    // 🌟 Posible mejora de habilidad
    const habs = Object.keys(usuario.habilidades || {});
    if (habs.length > 0 && Math.random() < 0.3) {
      const h = habs[Math.floor(Math.random() * habs.length)];
      usuario.habilidades[h].nivel += 1;
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🌟 *¡${usuario.nombre} ha mejorado su habilidad!*\n🔹 ${h}: Nivel ${usuario.habilidades[h].nivel}`
      }, { quoted: msg });
    }

    // 🔼 Subida de nivel
    let xpMax = usuario.nivel === 1 ? 1000 : usuario.nivel * 1500;
    while (usuario.experiencia >= xpMax && usuario.nivel < 50) {
      usuario.experiencia -= xpMax;
      usuario.nivel += 1;
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🎉 *¡${usuario.nombre} ha subido al nivel ${usuario.nivel}! 🏆*`
      }, { quoted: msg });
      xpMax = usuario.nivel * 1500;
    }

    // 🎖️ Actualizar rango
    const rangos = [
      { nivel: 1,  rango: "🌟 Novato" },
      { nivel: 5,  rango: "⚔️ Ladrón Aprendiz" },
      { nivel: 10, rango: "🔥 Criminal Experto" },
      { nivel: 20, rango: "👑 Maestro del Robo" },
      { nivel: 30, rango: "🌀 Señor del Crimen" },
      { nivel: 40, rango: "💀 Rey de los Ladrones" },
      { nivel: 50, rango: "🚀 Legendario" }
    ];
    const prevRank = usuario.rango;
    usuario.rango = rangos.reduce((a, c) => usuario.nivel >= c.nivel ? c.rango : a, usuario.rango);
    if (usuario.rango !== prevRank) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🎖️ *¡${usuario.nombre} ha subido de rango a ${usuario.rango}!*`
      }, { quoted: msg });
    }

    // ⏳ Guardar cooldown y datos
    usuario.cooldowns = usuario.cooldowns || {};
    usuario.cooldowns.robar = now;
    rpgData.usuarios[userId] = usuario;
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

  } catch (err) {
    console.error("❌ Error en el comando .robar:", err);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Ocurrió un error al intentar robar. Inténtalo de nuevo más tarde.*"
    }, { quoted: msg });
  }
};

module.exports.command = ['robar'];
