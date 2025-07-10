const fs = require("fs");

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 10 * 60 * 1000; // 10 minutos

    // 🔱 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🔱", key: msg.key }
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
          text: `❌ *No tienes personajes divinos para alcanzar el Modo Dios.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
        },
        { quoted: msg }
      );
    }

    let personaje = usuario.personajes[0]; // Se usa el personaje principal

    // 🚑 Verificar si el personaje tiene 0 de vida
    if (personaje.vida <= 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🚑 *¡${personaje.nombre} no puede entrar en Modo Dios, está sin vida!*\n📜 Usa \`${global.prefix}bolasdeldragon\` para revivirlo.`
        },
        { quoted: msg }
      );
    }

    // 🕒 Verificar cooldown
    let now = Date.now();
    if (personaje.cooldowns?.mododios && now - personaje.cooldowns.mododios < cooldownTime) {
      let minutes = ((personaje.cooldowns.mododios + cooldownTime - now) / 60000).toFixed(1);
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${minutes} minutos antes de volver a usar el Modo Dios.*` },
        { quoted: msg }
      );
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantesGanados = Math.floor(Math.random() * (1000 - 50 + 1)) + 50;   // 50–1000
    let xpGanada       = Math.floor(Math.random() * (3000 - 500 + 1)) + 500;  // 500–3000

    // 🔥 Efecto negativo aleatorio (50% probabilidad)
    let negativo = Math.random() < 0.5;
    let vidaPerdida = negativo
      ? Math.floor(Math.random() * (100 - 20 + 1)) + 20
      : Math.floor(Math.random() * (15 - 5 + 1)) + 5;
    let xpPerdida = negativo
      ? Math.floor(Math.random() * (700 - 200 + 1)) + 200
      : 0;

    personaje.vida = Math.max(0, personaje.vida - vidaPerdida);
    usuario.experiencia += xpGanada;
    usuario.diamantes   += diamantesGanados;
    personaje.experiencia = Math.max(0, personaje.experiencia - xpPerdida);

    // 🕒 Guardar cooldown
    if (!personaje.cooldowns) personaje.cooldowns = {};
    personaje.cooldowns.mododios = now;

    // 🔱 Mensajes de recompensa y castigo
    const txtPos = [
      `🔱 *${personaje.nombre} alcanzó el Modo Dios y desbloqueó un nuevo nivel de poder.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🔥 *${personaje.nombre} sintió el poder divino recorrer su cuerpo y se volvió más fuerte.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `💥 *El aura dorada de ${personaje.nombre} iluminó todo el campo de batalla, mostrando su fuerza.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`
    ];
    const txtNeg = [
      `⚠️ *${personaje.nombre} no logró controlar el Modo Dios y sufrió daños colaterales.*\n💀 *Perdiste XP:* ${xpPerdida}\n❤️ *Perdiste vida:* ${vidaPerdida} HP`,
      `☠️ *${personaje.nombre} fue consumido por la energía divina y debilitado.*\n💀 *Perdiste XP:* ${xpPerdida}\n❤️ *Perdiste vida:* ${vidaPerdida} HP`,
      `🔴 *El poder del Modo Dios fue demasiado para ${personaje.nombre}, sufriendo graves heridas.*\n💀 *Perdiste XP:* ${xpPerdida}\n❤️ *Perdiste vida:* ${vidaPerdida} HP`
    ];

    await conn.sendMessage(
      msg.key.remoteJid,
      { text: (negativo ? txtNeg : txtPos)[Math.floor(Math.random() * 3)] },
      { quoted: msg }
    );

    // 📊 Subida de nivel y rango
    let xpMax = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
    const rangos = [
      { nivel: 1, rango: "🌟 Principiante" },
      { nivel: 10, rango: "⚔️ Guerrero Divino" },
      { nivel: 20, rango: "🔥 Avatar Celestial" },
      { nivel: 30, rango: "👑 Dios de la Guerra" },
      { nivel: 40, rango: "🌀 Destructor Universal" },
      { nivel: 50, rango: "💀 Señor del Cosmos" },
      { nivel: 60, rango: "🚀 Emperador Divino" },
      { nivel: 70, rango: "🔱 Supremo Absoluto" }
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
    console.error("❌ Error en el comando .mododios:", error);
  }
};

module.exports.command = ["mododios"];
