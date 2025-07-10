const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 horas de espera

    // 🚀 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "🚀", key: msg.key } });

    // 📂 Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      return conn.sendMessage(msg.key.remoteJid, { text: "❌ *Los datos del RPG no están disponibles.*" }, { quoted: msg });
    }

    // 📥 Cargar datos del usuario
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // ❌ Verificar si el usuario está registrado
    if (!rpgData.usuarios[userId]) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes una cuenta registrada en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
        },
        { quoted: msg }
      );
    }

    let usuario = rpgData.usuarios[userId];

    // ❌ Verificar si el usuario tiene mascota
    if (!usuario.mascotas || usuario.mascotas.length === 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes ninguna mascota.*\n📜 Usa \`${global.prefix}tiendamascotas\` para comprar una.`
        },
        { quoted: msg }
      );
    }

    let mascota = usuario.mascotas[0]; // Se asume que la primera mascota es la principal

    // 🚑 Verificar si la mascota tiene 0 de vida
    if (mascota.vida <= 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🚑 *¡No puedes usar este comando!*\n\n🔴 *${mascota.nombre} tiene 0 de vida.*\n📜 Usa \`${global.prefix}curar\` para recuperarla.`
        },
        { quoted: msg }
      );
    }

    // 🕒 Verificar cooldown
    let now = Date.now();
    if (mascota.cooldowns?.supermascota && now - mascota.cooldowns.supermascota < cooldownTime) {
      let hoursLeft = ((mascota.cooldowns.supermascota + cooldownTime - now) / (60 * 60 * 1000)).toFixed(1);
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${hoursLeft} horas antes de volver a usar este comando.*` },
        { quoted: msg }
      );
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantes = Math.floor(Math.random() * (5000 - 800 + 1)) + 800; // 800–5000
    let xp = Math.floor(Math.random() * (8000 - 1000 + 1)) + 1000;     // 1000–8000

    // 💰 Incrementar
    usuario.diamantes   += diamantes;
    mascota.experiencia += xp;

    // ❤️ Reducir vida aleatoria
    let lost = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
    mascota.vida = Math.max(0, mascota.vida - lost);

    // 🕒 Guardar cooldown
    if (!mascota.cooldowns) mascota.cooldowns = {};
    mascota.cooldowns.supermascota = now;

    // 🌟 Textos con recompensas
    const msgs = [
      `🚀 *${mascota.nombre} demostró su máximo poder y dejó a todos sorprendidos.*\n💎 *${diamantes} Diamantes ganados*\n✨ *${xp} XP obtenidos*`,
      `🔥 *Después de un entrenamiento extremo, ${mascota.nombre} ha alcanzado un nuevo nivel de fuerza.*\n💎 *${diamantes} Diamantes ganados*\n✨ *${xp} XP obtenidos*`,
      `👑 *¡Todos han reconocido a ${mascota.nombre} como una supermascota legendaria!* \n💎 *${diamantes} Diamantes ganados*\n✨ *${xp} XP obtenidos*`,
      `✨ *El aura de ${mascota.nombre} brilla con intensidad, demostrando su poder absoluto.*\n💎 *${diamantes} Diamantes ganados*\n✨ *${xp} XP obtenidos*`,
      `💥 *La fuerza de ${mascota.nombre} ha superado todos los límites conocidos.*\n💎 *${diamantes} Diamantes ganados*\n✨ *${xp} XP obtenidos*`,
      `🎖️ *La evolución de ${mascota.nombre} es impresionante, alcanzando un nivel sobrehumano.*\n💎 *${diamantes} Diamantes ganados*\n✨ *${xp} XP obtenidos*`
    ];
    await conn.sendMessage(msg.key.remoteJid, { text: msgs[Math.floor(Math.random() * msgs.length)] }, { quoted: msg });

    // 📊 Subida de nivel si aplica
    let maxXP = mascota.nivel === 1 ? 500 : mascota.nivel * 1500;
    while (mascota.experiencia >= maxXP && mascota.nivel < 80) {
      mascota.experiencia -= maxXP;
      mascota.nivel++;
      maxXP = mascota.nivel * 1500;
      mascota.xpMax = maxXP;
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `🎉 *¡Felicidades! Tu mascota ${mascota.nombre} ha subido de nivel!* 🏆\n🐾 *Nuevo Nivel:* ${mascota.nivel}\n✨ *Experiencia:* ${mascota.experiencia} / ${maxXP} XP` },
        { quoted: msg }
      );
    }

    // 🌟 Mejora de habilidades 30% probabilidad
    let skills = Object.keys(mascota.habilidades);
    if (skills.length) {
      let skill = skills[Math.floor(Math.random() * skills.length)];
      if (Math.random() < 0.3) {
        mascota.habilidades[skill].nivel++;
        await conn.sendMessage(
          msg.key.remoteJid,
          { text: `🌟 *¡${mascota.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${skill}: Nivel ${mascota.habilidades[skill].nivel}*` },
          { quoted: msg }
        );
      }
    }

    // 📂 Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
  } catch (err) {
    console.error("❌ Error en el comando .supermascota:", err);
  }
};

module.exports.command = ['supermascota'];
