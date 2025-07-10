const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🗝️ Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🗝️", key: msg.key }
    });

    const rpgFile = "./rpg.json";
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *Los datos del RPG no están disponibles. Usa \`${global.prefix}crearcartera\` para empezar.*`
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

    // 🔒 Nivel mínimo para usar .cofre
    const nivelMinimo = 9;
    if (usuario.nivel < nivelMinimo) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🔒 *Debes ser al menos nivel ${nivelMinimo} para usar este comando.*\n📌 *Tu nivel actual:* ${usuario.nivel}\n\n¡Sigue entrenando para desbloquearlo!`
      }, { quoted: msg });
      return;
    }

    // ⏳ Verificar cooldown (24 h)
    const now = Date.now();
    const last = usuario.cooldowns?.cofre;
    const cd = 24 * 60 * 60 * 1000;
    if (last && now - last < cd) {
      const hours = ((last + cd - now) / 3600000).toFixed(2);
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⏳ *Debes esperar ${hours} horas antes de volver a usar este comando.*`
      }, { quoted: msg });
      return;
    }

    // 🚑 Verificar vida
    if (usuario.vida <= 0) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🚑 *¡No puedes usar este comando!*\n\n🔴 *Tu vida es 0.*\n📜 Usa \`${global.prefix}hospital\` para recuperarte.`
      }, { quoted: msg });
      return;
    }

    // 💬 Mensaje motivacional
    const textos = [
      "¡La suerte favorece a los audaces! Abre el cofre y demuestra tu valía.",
      "Tu esfuerzo diario te trae recompensas. ¡A disfrutar del botín!",
      "El destino premia a quienes luchan. ¡Reclama tu recompensa y sigue creciendo!",
      "Cada día es una nueva oportunidad. ¡Tu cofre te espera!",
      "¡El cofre se abre para ti, demuestra que eres un verdadero guerrero!"
    ];
    const textoAleatorio = textos[Math.floor(Math.random() * textos.length)];

    // 🎖️ Generar recompensas
    const xpGanado = Math.floor(Math.random() * (12000 - 1000 + 1)) + 1000;
    const diamantesGanados = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;
    const vidaPerdida = Math.floor(Math.random() * (35 - 15 + 1)) + 15;

    usuario.vida = Math.max(0, usuario.vida - vidaPerdida);
    usuario.experiencia += xpGanado;
    usuario.diamantes += diamantesGanados;
    usuario.cooldowns = usuario.cooldowns || {};
    usuario.cooldowns.cofre = now;

    // 📢 Enviar resultado
    let mensaje = `🗝️ *${usuario.nombre} abrió un cofre misterioso...*\n\n`;
    mensaje += `💬 ${textoAleatorio}\n\n`;
    mensaje += `💎 *Diamantes obtenidos:* ${diamantesGanados}\n`;
    mensaje += `✨ *XP ganado:* ${xpGanado}\n`;
    mensaje += `❤️ *Vida perdida:* ${vidaPerdida} HP`;
    await conn.sendMessage(msg.key.remoteJid, { text: mensaje }, { quoted: msg });

    // 🏅 Subida de nivel y rango
    let xpMax = usuario.nivel === 1 ? 1000 : usuario.nivel * 1500;
    const rangos = [
      { lvl:1, name:"🌟 Novato" },
      { lvl:5, name:"⚔️ Guerrero Novato" },
      { lvl:10,name:"🔥 Maestro Combatiente" },
      { lvl:20,name:"👑 Élite Supremo" },
      { lvl:30,name:"🌀 Legendario" },
      { lvl:40,name:"💀 Dios de la Guerra" },
      { lvl:50,name:"🚀 Titán Supremo" }
    ];
    while (usuario.experiencia >= xpMax && usuario.nivel < 50) {
      usuario.experiencia -= xpMax;
      usuario.nivel++;
      usuario.rango = rangos.reduce((a,r)=> usuario.nivel>=r.lvl?r.name:a, usuario.rango);
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🎉 *¡${usuario.nombre} ha subido al nivel ${usuario.nivel}! 🏆*\n🏅 *Nuevo Rango:* ${usuario.rango}`
      }, { quoted: msg });
      xpMax = usuario.nivel * 1500;
    }

    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
  } catch (error) {
    console.error("❌ Error en el comando .cofre:", error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Ocurrió un error al abrir el cofre. Inténtalo de nuevo.*"
    }, { quoted: msg });
  }
};

module.exports.command = ['cofre'];
