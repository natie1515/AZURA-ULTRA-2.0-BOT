const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 10 * 60 * 1000; // 10 minutos de espera

    // 🏋️ Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "🏋️", key: msg.key } });

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
          text: `🚑 *¡No puedes entrenar a tu mascota!*\n\n🔴 *${mascota.nombre} tiene 0 de vida.*\n📜 Usa \`${global.prefix}curar\` para recuperarla.`
        },
        { quoted: msg }
      );
    }

    // 🕒 Verificar cooldown
    let tiempoActual = Date.now();
    if (mascota.cooldowns?.entrenar && tiempoActual - mascota.cooldowns.entrenar < cooldownTime) {
      let tiempoRestante = ((mascota.cooldowns.entrenar + cooldownTime - tiempoActual) / (60 * 1000)).toFixed(1);
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${tiempoRestante} minutos antes de volver a entrenar a tu mascota.*` },
        { quoted: msg }
      );
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantesGanados = Math.floor(Math.random() * 500) + 1;   // Entre 1 y 500
    let xpGanada        = Math.floor(Math.random() * 1301) + 500; // Entre 500 y 1800

    // 💰 Incrementar experiencia y diamantes
    usuario.diamantes   += diamantesGanados;
    mascota.experiencia += xpGanada;

    // ❤️ Reducir vida aleatoriamente entre 5 y 20 puntos
    let vidaPerdida = Math.floor(Math.random() * 16) + 5;
    mascota.vida = Math.max(0, mascota.vida - vidaPerdida);

    // 🕒 Guardar cooldown
    if (!mascota.cooldowns) mascota.cooldowns = {};
    mascota.cooldowns.entrenar = tiempoActual;

    // 🏋️ Textos aleatorios personalizados con recompensas
    const textos = [
      `🏋️ *${mascota.nombre} entrenó intensamente y ahora es más fuerte.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `💪 *Después de una sesión de entrenamiento, ${mascota.nombre} está más resistente.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🔥 *${mascota.nombre} practicó nuevas técnicas y mejoró sus habilidades.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `⚡ *Un duro entrenamiento hizo que ${mascota.nombre} aumentara su agilidad y destreza.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `💥 *${mascota.nombre} rompió sus límites con una intensa rutina de entrenamiento.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`,
      `🏆 *El esfuerzo de ${mascota.nombre} en el entrenamiento está dando grandes resultados.*\n💎 *${diamantesGanados} Diamantes ganados*\n✨ *${xpGanada} XP obtenidos*`
    ];
    await conn.sendMessage(msg.key.remoteJid, { text: textos[Math.floor(Math.random() * textos.length)] }, { quoted: msg });

    // 📊 Notificación de subida de nivel
    let xpMaxActual = mascota.nivel === 1 ? 500 : mascota.nivel * 1200;
    while (mascota.experiencia >= xpMaxActual && mascota.nivel < 80) {
      mascota.experiencia -= xpMaxActual;
      mascota.nivel++;
      xpMaxActual = mascota.nivel * 1200;
      mascota.xpMax = xpMaxActual;
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `🎉 *¡Felicidades! Tu mascota ${mascota.nombre} ha subido de nivel.* 🏆\n🐾 *Nuevo Nivel:* ${mascota.nivel}\n✨ *Experiencia:* ${mascota.experiencia} / ${xpMaxActual} XP` },
        { quoted: msg }
      );
    }

    // 🌟 Incrementar niveles aleatorios en habilidades con 30% de probabilidad
    let habilidades = Object.keys(mascota.habilidades);
    if (habilidades.length > 0) {
      let habilidadSubida = habilidades[Math.floor(Math.random() * habilidades.length)];
      if (Math.random() < 0.3) {
        mascota.habilidades[habilidadSubida].nivel++;
        await conn.sendMessage(
          msg.key.remoteJid,
          { text: `🌟 *¡${mascota.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${habilidadSubida}: Nivel ${mascota.habilidades[habilidadSubida].nivel}*` },
          { quoted: msg }
        );
      }
    }

    // 📊 Actualizar y manejar Rangos
    const rangosMascota = [
      { nivel: 1, rango: "🐣 Principiante" },
      { nivel: 10, rango: "🐾 Aprendiz" },
      { nivel: 20, rango: "🦴 Experto" },
      { nivel: 30, rango: "🛡️ Guardián" },
      { nivel: 40, rango: "🐺 Alfa" },
      { nivel: 50, rango: "🏆 Leyenda" },
      { nivel: 60, rango: "🔥 Divino" },
      { nivel: 70, rango: "🐉 Mítico" },
      { nivel: 80, rango: "🚀 Titán Supremo" }
    ];
    let rangoAnterior = mascota.rango;
    mascota.rango = rangosMascota.reduce((acc, curr) => (mascota.nivel >= curr.nivel ? curr.rango : acc), mascota.rango);
    if (mascota.rango !== rangoAnterior) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `🎖️ *¡Tu mascota ${mascota.nombre} ha subido de rango a ${mascota.rango}!* 🚀` },
        { quoted: msg }
      );
    }

    // 📂 Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

  } catch (error) {
    console.error("❌ Error en el comando .entrenar:", error);
  }
};

module.exports.command = ['entrenar'];
