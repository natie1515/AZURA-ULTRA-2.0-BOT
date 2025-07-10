const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🛠️ Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🛠️", key: msg.key }
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

    // 🚑 Verificar vida
    if (usuario.vida <= 0) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🚑 *¡No puedes trabajar!*\n\n🔴 *Tu vida es 0.*\n📜 Usa \`${global.prefix}hospital\` para recuperarte.`
      }, { quoted: msg });
      return;
    }

    // 🕒 Verificar cooldown
    const now = Date.now();
    const cd = usuario.cooldowns?.work;
    const cooldownTime = 8 * 60 * 1000;
    if (cd && now - cd < cooldownTime) {
      const mins = ((cd + cooldownTime - now) / 60000).toFixed(1);
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⏳ *Debes esperar ${mins} minutos antes de volver a trabajar.*`
      }, { quoted: msg });
      return;
    }

    // 🎖️ Generar recompensas
    const xpGanado = Math.floor(Math.random() * (3000 - 500 + 1)) + 500;
    const diamantesGanados = Math.floor(Math.random() * (700 - 50 + 1)) + 50;
    const vidaPerdida = Math.floor(Math.random() * (5 - 2 + 1)) + 2;

    usuario.vida = Math.max(0, usuario.vida - vidaPerdida);
    usuario.experiencia += xpGanado;
    usuario.diamantes += diamantesGanados;
    usuario.cooldowns = usuario.cooldowns || {};
    usuario.cooldowns.work = now;

    // 📢 Mensaje de recompensa
    const textos = [
      `🛠️ *${usuario.nombre} trabajó duro y recibió su pago.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`,
      `💰 *${usuario.nombre} completó una tarea importante y fue recompensado.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`,
      `🔨 *Después de una jornada agotadora, ${usuario.nombre} recibió su salario.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`,
      `📈 *${usuario.nombre} cerró un buen trato y ganó una gran comisión.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`,
      `💵 *${usuario.nombre} recibió un bono por su desempeño laboral.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`,
      `🚀 *Un ascenso inesperado hizo que ${usuario.nombre} ganara más de lo esperado.*\n💎 *${diamantesGanados} diamantes obtenidos*\n✨ *${xpGanado} XP ganados*`
    ];
    await conn.sendMessage(msg.key.remoteJid, {
      text: textos[Math.floor(Math.random() * textos.length)]
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

    // 🏅 Subida de nivel
    let xpMax = usuario.nivel === 1 ? 1000 : usuario.nivel * 1500;
    while (usuario.experiencia >= xpMax && usuario.nivel < 50) {
      usuario.experiencia -= xpMax;
      usuario.nivel++;
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🎉 *¡${usuario.nombre} ha subido al nivel ${usuario.nivel}! 🏆*`
      }, { quoted: msg });
      xpMax = usuario.nivel * 1500;
    }

    // 🎖️ Actualizar rango
    const rangos = [
      { lvl:1, name:"🌟 Novato" },
      { lvl:5, name:"⚒️ Minero Aprendiz" },
      { lvl:10,name:"🪨 Minero Experto" },
      { lvl:20,name:"💎 Cazador de Gemas" },
      { lvl:30,name:"🔱 Maestro Excavador" },
      { lvl:40,name:"🏆 Señor de las Rocas" },
      { lvl:50,name:"🚀 Titán Supremo" }
    ];
    const prevRank = usuario.rango;
    usuario.rango = rangos.reduce((a,r)=> usuario.nivel>=r.lvl?r.name:a, usuario.rango);
    if (usuario.rango !== prevRank) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `🎖️ *¡${usuario.nombre} ha subido de rango a ${usuario.rango}!*`
      }, { quoted: msg });
    }

    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });
  } catch (error) {
    console.error("❌ Error en el comando .work:", error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Ocurrió un error al trabajar. Inténtalo de nuevo.*"
    }, { quoted: msg });
  }
};

module.exports.command = ['work'];
