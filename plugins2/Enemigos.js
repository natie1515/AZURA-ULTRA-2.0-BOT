const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 10 * 60 * 1000; // 10 minutos

    // ⚔️ Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "⚔️", key: msg.key } });

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
          text: `❌ *No tienes personajes para enfrentarse a los enemigos.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
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
          text: `🚑 *¡${personaje.nombre} no puede luchar, está sin vida!*\n📜 Usa \`${global.prefix}bolasdeldragon\` para revivirlo.`
        },
        { quoted: msg }
      );
    }

    // 🕒 Verificar cooldown
    let now = Date.now();
    if (personaje.cooldowns?.enemigos && now - personaje.cooldowns.enemigos < cooldownTime) {
      let minutesLeft = ((personaje.cooldowns.enemigos + cooldownTime - now) / (60 * 1000)).toFixed(1);
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${minutesLeft} minutos antes de volver a enfrentarte a los enemigos.*` },
        { quoted: msg }
      );
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantesGanados = Math.floor(Math.random() * 900) + 1;   // 1–900
    let xpGanada       = Math.floor(Math.random() * (2500 - 200 + 1)) + 200; // 200–2500

    // 🔥 Efecto negativo aleatorio
    let efectoNegativo = Math.random() < 0.5;
    let vidaPerdida    = efectoNegativo
      ? Math.floor(Math.random() * (60 - 20 + 1)) + 20
      : Math.floor(Math.random() * (15 - 5 + 1)) + 5;
    let xpPerdida      = efectoNegativo ? Math.floor(Math.random() * (600 - 200 + 1)) + 200 : 0;

    personaje.vida = Math.max(0, personaje.vida - vidaPerdida);
    usuario.diamantes += diamantesGanados;
    usuario.experiencia += xpGanada;
    personaje.experiencia = Math.max(0, personaje.experiencia - xpPerdida);

    // 🕒 Guardar cooldown
    if (!personaje.cooldowns) personaje.cooldowns = {};
    personaje.cooldowns.enemigos = now;

    // ⚔️ Mensajes de recompensa o castigo
    const positivos = [
      `⚔️ *${personaje.nombre} luchó valientemente y derrotó a sus enemigos.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🛡️ *${personaje.nombre} se enfrentó a un enemigo formidable y salió victorioso.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
      `🔥 *${personaje.nombre} mostró su poder en batalla, acabando con sus rivales.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`
    ];
    const negativos = [
      `⚠️ *${personaje.nombre} fue superado en batalla y sufrió una gran pérdida.*\n💀 *Perdiste XP:* ${xpPerdida}\n❤️ *Perdiste vida:* ${vidaPerdida} HP`,
      `☠️ *${personaje.nombre} subestimó a sus enemigos y terminó gravemente herido.*\n💀 *Perdiste XP:* ${xpPerdida}\n❤️ *Perdiste vida:* ${vidaPerdida} HP`,
      `🔴 *${personaje.nombre} fue emboscado y tuvo que retirarse con serias heridas.*\n💀 *Perdiste XP:* ${xpPerdida}\n❤️ *Perdiste vida:* ${vidaPerdida} HP`
    ];

    await conn.sendMessage(
      msg.key.remoteJid,
      {
        text: efectoNegativo
          ? negativos[Math.floor(Math.random() * negativos.length)]
          : positivos[Math.floor(Math.random() * positivos.length)]
      },
      { quoted: msg }
    );

    // 📊 Nivel y rango
    let xpMax = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
    const rangos = [
      { nivel: 1, rango: "🌟 Principiante" },
      { nivel: 10, rango: "⚔️ Guerrero Novato" },
      { nivel: 20, rango: "🔥 Maestro de Batallas" },
      { nivel: 30, rango: "👑 General de la Guerra" },
      { nivel: 40, rango: "🌀 Leyenda Viviente" },
      { nivel: 50, rango: "💀 Señor de la Guerra" },
      { nivel: 60, rango: "🚀 Emperador de la Lucha" },
      { nivel: 70, rango: "🔱 Dios de la Guerra" }
    ];

    while (personaje.experiencia >= xpMax && personaje.nivel < 70) {
      personaje.experiencia -= xpMax;
      personaje.nivel++;
      xpMax = personaje.nivel * 1500;
      let rangoAnterior = personaje.rango;
      personaje.rango = rangos.reduce((acc, cur) => (personaje.nivel >= cur.nivel ? cur.rango : acc), personaje.rango);

      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🎉 *¡${personaje.nombre} ha subido al nivel ${personaje.nivel}! 🏆*\n🏅 *Nuevo Rango:* ${personaje.rango}`
        },
        { quoted: msg }
      );
    }

    // 🌟 Mejorar habilidades 30% probabilidad
    let habilidades = Object.keys(personaje.habilidades);
    if (habilidades.length && Math.random() < 0.3) {
      let hab = habilidades[Math.floor(Math.random() * habilidades.length)];
      personaje.habilidades[hab] += 1;
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
    console.error("❌ Error en el comando .enemigos:", error);
  }
};

module.exports.command = ['enemigos'];
