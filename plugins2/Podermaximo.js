const fs = require("fs");

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 horas

    // 🌌 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🌌", key: msg.key }
    });

    // 📂 Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *Los datos del RPG no están disponibles.*" },
        { quoted: msg }
      );
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

    // ❌ Verificar si el usuario tiene personajes
    if (!usuario.personajes || usuario.personajes.length === 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes personajes para alcanzar el Poder Máximo.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
        },
        { quoted: msg }
      );
    }

    let personaje = usuario.personajes[0]; // Se asume que el primer personaje es el principal

    // 🚑 Verificar si el personaje tiene 0 de vida
    if (personaje.vida <= 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🚑 *¡${personaje.nombre} no puede alcanzar el Poder Máximo, está sin vida!*\n📜 Usa \`${global.prefix}bolasdeldragon\` para revivirlo.`
        },
        { quoted: msg }
      );
    }

    // 🕒 Verificar cooldown
    let now = Date.now();
    if (personaje.cooldowns?.podermaximo && now - personaje.cooldowns.podermaximo < cooldownTime) {
      let hours = ((personaje.cooldowns.podermaximo + cooldownTime - now) / (60 * 60 * 1000)).toFixed(1);
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${hours} horas antes de volver a usar el Poder Máximo.*` },
        { quoted: msg }
      );
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantesGanados = Math.floor(Math.random() * (4000 - 500 + 1)) + 500; // 500–4000
    let xpGanada       = Math.floor(Math.random() * (10000 - 800 + 1)) + 800; // 800–10000

    // 💰 Incrementar experiencia y diamantes
    usuario.diamantes  += diamantesGanados;
    personaje.experiencia += xpGanada;

    // ❤️ Reducir vida entre 20 y 50 puntos
    let vidaPerdida = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
    personaje.vida = Math.max(0, personaje.vida - vidaPerdida);

    // 🕒 Guardar cooldown
    if (!personaje.cooldowns) personaje.cooldowns = {};
    personaje.cooldowns.podermaximo = now;

    // 🌌 Mensajes de recompensa
    const textos = [
      `🌌 *${personaje.nombre} liberó su máximo poder y ahora domina la energía suprema.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🔥 *El aura de ${personaje.nombre} ahora brilla con un poder ilimitado.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `⚡ *${personaje.nombre} ha alcanzado un estado de poder absoluto.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `💥 *Con un rugido ensordecedor, ${personaje.nombre} superó todas sus limitaciones.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🌀 *Un nuevo nivel de existencia se ha desbloqueado para ${personaje.nombre}.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `👑 *Los dioses han reconocido a ${personaje.nombre} como un ser supremo del universo.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`
    ];

    await conn.sendMessage(
      msg.key.remoteJid,
      { text: textos[Math.floor(Math.random() * textos.length)] },
      { quoted: msg }
    );

    // 📊 Manejar la subida de nivel y rango
    let xpMaxNivel = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
    const rangosPersonaje = [
      { nivel: 1, rango: "🌟 Principiante" },
      { nivel: 10, rango: "⚔️ Guerrero Ascendido" },
      { nivel: 20, rango: "🔥 Maestro Celestial" },
      { nivel: 30, rango: "👑 Dios Guerrero" },
      { nivel: 40, rango: "🌀 Señor del Cosmos" },
      { nivel: 50, rango: "💀 Dominador Divino" },
      { nivel: 60, rango: "🚀 Semidiós Supremo" },
      { nivel: 70, rango: "🔱 Dios Supremo de la Creación" }
    ];

    while (personaje.experiencia >= xpMaxNivel && personaje.nivel < 70) {
      personaje.experiencia -= xpMaxNivel;
      personaje.nivel++;
      xpMaxNivel = personaje.nivel * 1500;
      personaje.xpMax = xpMaxNivel;
      personaje.rango = rangosPersonaje.reduce(
        (acc, curr) => (personaje.nivel >= curr.nivel ? curr.rango : acc),
        personaje.rango
      );

      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🎉 *¡${personaje.nombre} ha subido al nivel ${personaje.nivel}! 🏆*\n🏅 *Nuevo Rango:* ${personaje.rango}`
        },
        { quoted: msg }
      );
    }

    // 🌟 Mejorar habilidades con 30% de probabilidad
    let habilidades = Object.keys(personaje.habilidades);
    if (habilidades.length > 0 && Math.random() < 0.3) {
      let hab = habilidades[Math.floor(Math.random() * habilidades.length)];
      personaje.habilidades[hab]++;

      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🌟 *¡${personaje.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${hab}: Nivel ${personaje.habilidades[hab]}*`
        },
        { quoted: msg }
      );
    }

    // 📂 Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // ✅ Confirmación con reacción
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .podermaximo:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Ocurrió un error al activar el Poder Máximo. Inténtalo de nuevo.*" },
      { quoted: msg }
    );
  }
};

module.exports.command = ["podermaximo"];
