const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 5 * 60 * 1000; // 5 minutos de espera

    // 🍖 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "🍖", key: msg.key } });

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
        text: `🚑 *¡No puedes dar comida a tu mascota!*\n\n🔴 *${mascota.nombre} tiene 0 de vida.*\n📜 Usa \`${global.prefix}curar\` para recuperarla.` 
      }, { quoted: msg });
    }

    // 🕒 Verificar cooldown
    let tiempoActual = Date.now();
    if (mascota.cooldowns?.darcomida && tiempoActual - mascota.cooldowns.darcomida < cooldownTime) {
      let tiempoRestante = ((mascota.cooldowns.darcomida + cooldownTime - tiempoActual) / (60 * 1000)).toFixed(1);
      return conn.sendMessage(msg.key.remoteJid, { text: `⏳ *Debes esperar ${tiempoRestante} minutos antes de volver a usar este comando.*` }, { quoted: msg });
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantesGanados = Math.floor(Math.random() * 200) + 1; // Entre 1 y 200
    let xpGanada = Math.floor(Math.random() * 1001) + 200; // Entre 200 y 1200

    // 💰 Incrementar experiencia y diamantes
    usuario.diamantes += diamantesGanados;
    mascota.experiencia += xpGanada;

    // ❤️ Reducir vida aleatoriamente entre 5 y 20 puntos
    let vidaPerdida = Math.floor(Math.random() * 16) + 5;
    mascota.vida = Math.max(0, mascota.vida - vidaPerdida);

    // 🕒 Guardar cooldown
    if (!mascota.cooldowns) mascota.cooldowns = {};
    mascota.cooldowns.darcomida = tiempoActual;

    // 🍖 Textos aleatorios personalizados con recompensas
    const textos = [
      `🍖 *${mascota.nombre} devoró su comida con gusto y se siente satisfecho.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🥩 *${mascota.nombre} disfrutó un banquete delicioso y parece más fuerte.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🐾 *Después de comer, ${mascota.nombre} parece tener más energía para entrenar.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🍗 *${mascota.nombre} disfrutó su comida y está más feliz.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🥓 *${mascota.nombre} comió hasta quedar satisfecho y listo para nuevas aventuras.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🍎 *Un alimento saludable ayudó a ${mascota.nombre} a mantenerse fuerte y ágil.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`
    ];

    // 📢 Enviar mensaje con XP y Diamantes
    await conn.sendMessage(msg.key.remoteJid, { text: textos[Math.floor(Math.random() * textos.length)] }, { quoted: msg });

    // 📊 Notificación de subida de nivel
    let xpMaxActual = mascota.nivel === 1 ? 500 : mascota.nivel * 1200;
    while (mascota.experiencia >= xpMaxActual && mascota.nivel < 80) {
      mascota.experiencia -= xpMaxActual;
      mascota.nivel += 1;
      xpMaxActual = mascota.nivel * 1200;
      mascota.xpMax = xpMaxActual;

      await conn.sendMessage(msg.key.remoteJid, { 
        text: `🎉 *¡Felicidades! Tu mascota ${mascota.nombre} ha subido de nivel.* 🏆\n🐾 *Nuevo Nivel:* ${mascota.nivel}\n✨ *Experiencia:* ${mascota.experiencia} / ${xpMaxActual} XP`
      }, { quoted: msg });
    }

    // 🌟 Incrementar niveles aleatorios en habilidades
    let habilidades = Object.keys(mascota.habilidades);
    if (habilidades.length > 0) {
      let habilidadSubida = habilidades[Math.floor(Math.random() * habilidades.length)];
      if (Math.random() < 0.5) {
        mascota.habilidades[habilidadSubida].nivel += 1;
        await conn.sendMessage(msg.key.remoteJid, { 
          text: `🌟 *¡${mascota.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${habilidadSubida}: Nivel ${mascota.habilidades[habilidadSubida].nivel}*`
        }, { quoted: msg });
      }
    }

    // 📂 Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

  } catch (error) {
    console.error("❌ Error en el comando .darcomida:", error);
  }
};

module.exports.command = ['darcomida'];
