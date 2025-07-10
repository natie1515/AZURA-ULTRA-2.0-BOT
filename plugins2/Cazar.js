const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 7 * 60 * 1000; // 7 minutos de espera

    // 🎯 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "🎯", key: msg.key } });

    // 📂 Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      return conn.sendMessage(msg.key.remoteJid, { text: "❌ *Los datos del RPG no están disponibles.*" }, { quoted: msg });
    }

    // 📥 Cargar datos del usuario
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // ❌ Verificar si el usuario está registrado
    if (!rpgData.usuarios[userId]) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una cuenta registrada en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.` 
      }, { quoted: msg });
    }

    let usuario = rpgData.usuarios[userId];

    // ❌ Verificar si el usuario tiene mascota
    if (!usuario.mascotas || usuario.mascotas.length === 0) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes ninguna mascota.*\n📜 Usa \`${global.prefix}tiendamascotas\` para comprar una.` 
      }, { quoted: msg });
    }

    let mascota = usuario.mascotas[0]; // Se asume que la primera mascota es la principal

    // 🚑 Verificar si la mascota tiene 0 de vida
    if (mascota.vida <= 0) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `🚑 *¡No puedes ir de caza con tu mascota!*\n\n🔴 *${mascota.nombre} tiene 0 de vida.*\n📜 Usa \`${global.prefix}curar\` para recuperarla.` 
      }, { quoted: msg });
    }

    // 🕒 Verificar cooldown
    let tiempoActual = Date.now();
    if (mascota.cooldowns?.cazar && tiempoActual - mascota.cooldowns.cazar < cooldownTime) {
      let tiempoRestante = ((mascota.cooldowns.cazar + cooldownTime - tiempoActual) / (60 * 1000)).toFixed(1);
      return conn.sendMessage(msg.key.remoteJid, { text: `⏳ *Debes esperar ${tiempoRestante} minutos antes de volver a usar este comando.*` }, { quoted: msg });
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantesGanados = Math.floor(Math.random() * 350) + 1;   // Entre 1 y 350
    let xpGanada        = Math.floor(Math.random() * 1301) + 500; // Entre 500 y 1800

    // 💰 Incrementar experiencia y diamantes
    usuario.diamantes  += diamantesGanados;
    mascota.experiencia += xpGanada;

    // ❤️ Reducir vida aleatoriamente entre 5 y 20 puntos
    let vidaPerdida = Math.floor(Math.random() * 16) + 5;
    mascota.vida = Math.max(0, mascota.vida - vidaPerdida);

    // 🕒 Guardar cooldown
    if (!mascota.cooldowns) mascota.cooldowns = {};
    mascota.cooldowns.cazar = tiempoActual;

    // 🎯 Textos aleatorios con recompensas
    const textos = [
      `🎯 *${mascota.nombre} cazó con precisión y trajo una gran presa.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🏹 *${mascota.nombre} tuvo un día de caza exitoso y se siente más fuerte.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🦌 *${mascota.nombre} persiguió a su presa con gran habilidad.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🐾 *${mascota.nombre} acechó con astucia y logró una cacería exitosa.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `⚡ *${mascota.nombre} usó su velocidad y atrapó una presa en tiempo récord.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🔥 *${mascota.nombre} mostró su instinto salvaje y dominó el arte de la caza.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`
    ];
    await conn.sendMessage(msg.key.remoteJid, { text: textos[Math.floor(Math.random() * textos.length)] }, { quoted: msg });

    // 📊 Subida de nivel si aplica
    let xpMaxActual = mascota.nivel === 1 ? 500 : mascota.nivel * 1200;
    while (mascota.experiencia >= xpMaxActual && mascota.nivel < 80) {
      mascota.experiencia -= xpMaxActual;
      mascota.nivel++;
      xpMaxActual = mascota.nivel * 1200;
      mascota.xpMax = xpMaxActual;
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `🎉 *¡Felicidades! Tu mascota ${mascota.nombre} ha subido de nivel.* 🏆\n🐾 *Nuevo Nivel:* ${mascota.nivel}\n✨ *Experiencia:* ${mascota.experiencia} / ${xpMaxActual} XP`
      }, { quoted: msg });
    }

    // 🌟 Mejora aleatoria de habilidades
    let habilidades = Object.keys(mascota.habilidades);
    if (habilidades.length) {
      let hab = habilidades[Math.floor(Math.random() * habilidades.length)];
      if (Math.random() < 0.5) {
        mascota.habilidades[hab].nivel++;
        await conn.sendMessage(msg.key.remoteJid, { 
          text: `🌟 *¡${mascota.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${hab}: Nivel ${mascota.habilidades[hab].nivel}*`
        }, { quoted: msg });
      }
    }

    // 📂 Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

  } catch (error) {
    console.error("❌ Error en el comando .cazar:", error);
  }
};

module.exports.command = ['cazar'];
