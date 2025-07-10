const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // ⛏️ Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "⛏️", key: msg.key }
    });

    const rpgFile = "./rpg.json";
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *Los datos del RPG no están disponibles.*" },
        { quoted: msg }
      );
      return;
    }

    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
    let userId = msg.key.participant || msg.key.remoteJid;
    let usuario = rpgData.usuarios[userId];

    // ❌ Verificar registro
    if (!usuario) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes una cuenta registrada en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
        },
        { quoted: msg }
      );
      return;
    }

    // 🚑 Verificar vida
    if (usuario.vida <= 0) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🚑 *¡No puedes minar!*\n\n🔴 *Tu vida es 0.*\n📜 Usa \`${global.prefix}hospital\` para recuperarte.`
        },
        { quoted: msg }
      );
      return;
    }

    // 🕒 Verificar cooldown
    const now = Date.now();
    const cd = usuario.cooldowns?.minar;
    if (cd && now - cd < 5 * 60 * 1000) {
      const restante = ((cd + 5 * 60 * 1000 - now) / 60000).toFixed(1);
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${restante} minutos antes de volver a minar.*` },
        { quoted: msg }
      );
      return;
    }

    // 🎖️ Recompensas aleatorias
    const xpGanado = Math.floor(Math.random() * 801) + 200;      // 200–1000
    const diamantesGanados = Math.floor(Math.random() * 500) + 1; // 1–500
    const vidaPerdida = Math.floor(Math.random() * 5) + 3;       // 3–7

    usuario.experiencia = (usuario.experiencia || 0) + xpGanado;
    usuario.diamantes = (usuario.diamantes || 0) + diamantesGanados;
    usuario.vida = Math.max(0, usuario.vida - vidaPerdida);
    usuario.cooldowns = usuario.cooldowns || {};
    usuario.cooldowns.minar = now;

    // 📢 Mensaje de recompensa
    const textos = [
      `⛏️ *${usuario.nombre} encontró una mina de oro y trabajó duro en ella.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`,
      `💎 *Después de cavar durante horas, ${usuario.nombre} descubrió piedras preciosas.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`,
      `🌋 *Explorando una cueva profunda, ${usuario.nombre} halló minerales raros.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`
    ];
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: textos[Math.floor(Math.random() * textos.length)] },
      { quoted: msg }
    );

    // 🌟 Mejora de habilidad 25%
    const habs = Object.keys(usuario.habilidades || {});
    if (habs.length > 0 && Math.random() < 0.25) {
      const h = habs[Math.floor(Math.random() * habs.length)];
      usuario.habilidades[h].nivel += 1;
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🌟 *¡${usuario.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${h}: Nivel ${usuario.habilidades[h].nivel}*`
        },
        { quoted: msg }
      );
    }

    // 📈 Subida de nivel
    let xpMax = usuario.nivel * 1000;
    while (usuario.experiencia >= xpMax && usuario.nivel < 50) {
      usuario.experiencia -= xpMax;
      usuario.nivel += 1;
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `🎉 *¡${usuario.nombre} ha subido al nivel ${usuario.nivel}! 🏆*` },
        { quoted: msg }
      );
      xpMax = usuario.nivel * 1500;
    }

    // 🏅 Actualizar rango
    const rangos = [
      { nivel: 1, rango: "🌟 Novato" },
      { nivel: 5, rango: "⚔️ Guerrero Novato" },
      { nivel: 10, rango: "🔥 Maestro Combatiente" },
      { nivel: 20, rango: "👑 Élite Supremo" },
      { nivel: 30, rango: "🌀 Legendario" },
      { nivel: 40, rango: "💀 Dios de la Batalla" },
      { nivel: 50, rango: "🚀 Titán Supremo" }
    ];
    const prev = usuario.rango;
    usuario.rango = rangos.reduce(
      (acc, r) => (usuario.nivel >= r.nivel ? r.rango : acc),
      usuario.rango
    );
    if (usuario.rango !== prev) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `🎖️ *¡${usuario.nombre} ha subido de rango a ${usuario.rango}!*` },
        { quoted: msg }
      );
    }

    // 💾 Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
    await conn.sendMessage(
      msg.key.remoteJid,
      { react: { text: "✅", key: msg.key } }
    );
  } catch (error) {
    console.error("❌ Error en el comando .minar:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Ocurrió un error al minar. Inténtalo de nuevo.*" },
      { quoted: msg }
    );
  }
};

module.exports.command = ['minar'];
