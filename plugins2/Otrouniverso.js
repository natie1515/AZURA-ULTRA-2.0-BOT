const fs = require("fs");

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 6 * 60 * 1000; // 6 minutos

    // 🪐 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🪐", key: msg.key }
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
          text: `❌ *No tienes personajes para entrenar en otro universo.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
        },
        { quoted: msg }
      );
    }

    let personaje = usuario.personajes[0]; // Personaje principal

    // 🚑 Verificar si el personaje tiene 0 de vida
    if (personaje.vida <= 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🚑 *¡${personaje.nombre} no puede entrenar en otro universo, está sin vida!*\n📜 Usa \`${global.prefix}bolasdeldragon\` para revivirlo.`
        },
        { quoted: msg }
      );
    }

    // 🕒 Verificar cooldown
    let now = Date.now();
    if (personaje.cooldowns?.otrouniverso && now - personaje.cooldowns.otrouniverso < cooldownTime) {
      let minutes = ((personaje.cooldowns.otrouniverso + cooldownTime - now) / 60000).toFixed(1);
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${minutes} minutos antes de viajar a otro universo.*` },
        { quoted: msg }
      );
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantesGanados = Math.floor(Math.random() * 600) + 1;    // 1–600
    let xpGanada       = Math.floor(Math.random() * (1500 - 300 + 1)) + 300; // 300–1500

    // 💰 Incrementar experiencia y diamantes
    usuario.diamantes   += diamantesGanados;
    personaje.experiencia += xpGanada;

    // ❤️ Reducir vida entre 5 y 20 puntos
    let vidaPerdida = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
    personaje.vida = Math.max(0, personaje.vida - vidaPerdida);

    // 🕒 Guardar cooldown
    if (!personaje.cooldowns) personaje.cooldowns = {};
    personaje.cooldowns.otrouniverso = now;

    // 🪐 Mensajes de recompensa
    const textos = [
      `🪐 *${personaje.nombre} viajó a otro universo y entrenó con guerreros de dimensiones desconocidas.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🚀 *${personaje.nombre} descubrió nuevas formas de energía en un universo alterno, mejorando su poder.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🌌 *Entrenando en un universo lejano, ${personaje.nombre} dominó una nueva técnica ancestral.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🌀 *Después de un viaje a través del multiverso, ${personaje.nombre} obtuvo un gran aumento de poder.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🔥 *${personaje.nombre} desafió a los dioses de un universo desconocido y se volvió más fuerte.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `⚡ *Gracias a un entrenamiento en otra dimensión, ${personaje.nombre} ha mejorado su control del ki.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`
    ];

    await conn.sendMessage(
      msg.key.remoteJid,
      { text: textos[Math.floor(Math.random() * textos.length)] },
      { quoted: msg }
    );

    // 📊 Subida de nivel y rango
    let xpMax = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
    const rangos = [
      { nivel: 1, rango: "🌟 Principiante" },
      { nivel: 10, rango: "⚔️ Guerrero Interdimensional" },
      { nivel: 20, rango: "🔥 Maestro del Multiverso" },
      { nivel: 30, rango: "👑 Conquistador de Universos" },
      { nivel: 40, rango: "🌀 Dominador Espacial" },
      { nivel: 50, rango: "💀 Rey de los Multiversos" },
      { nivel: 60, rango: "🚀 Dios Cósmico" },
      { nivel: 70, rango: "🔱 Ser Supremo del Multiverso" }
    ];

    while (personaje.experiencia >= xpMax && personaje.nivel < 70) {
      personaje.experiencia -= xpMax;
      personaje.nivel++;
      xpMax = personaje.nivel * 1500;
      personaje.xpMax = xpMax;
      personaje.rango = rangos.reduce(
        (acc, cur) => (personaje.nivel >= cur.nivel ? cur.rango : acc),
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

    // 🌟 Mejorar habilidad con 30% probabilidad
    let habs = Object.keys(personaje.habilidades);
    if (habs.length && Math.random() < 0.3) {
      let hab = habs[Math.floor(Math.random() * habs.length)];
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

  } catch (error) {
    console.error("❌ Error en el comando .otrouniverso:", error);
  }
};

module.exports.command = ["otrouniverso"];
