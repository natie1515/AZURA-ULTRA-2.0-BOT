const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const cooldownTime = 10 * 60 * 1000; // 10 minutos

    // 😈 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "😈", key: msg.key } });

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
          text: `❌ *No tienes personajes para entrar en el Modo Diablo.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
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
          text: `🚑 *¡${personaje.nombre} no puede usar el Modo Diablo, está sin vida!*\n📜 Usa \`${global.prefix}bolasdeldragon\` para revivirlo.`
        },
        { quoted: msg }
      );
    }

    // 🕒 Verificar cooldown
    let now = Date.now();
    if (personaje.cooldowns?.mododiablo && now - personaje.cooldowns.mododiablo < cooldownTime) {
      let mins = ((personaje.cooldowns.mododiablo + cooldownTime - now) / (60 * 1000)).toFixed(1);
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `⏳ *Debes esperar ${mins} minutos antes de volver a usar el Modo Diablo.*` },
        { quoted: msg }
      );
    }

    // 🎖️ Generar recompensas aleatorias
    let diamantes = Math.floor(Math.random() * 1000) + 1;       // 1–1000
    let xp       = Math.floor(Math.random() * (2000 - 200 + 1)) + 200; // 200–2000

    // 🔥 Efecto negativo aleatorio
    let negative = Math.random() < 0.5;
    let vidaPerd  = negative
      ? Math.floor(Math.random() * (50 - 20 + 1)) + 20
      : Math.floor(Math.random() * (15 - 5 + 1)) + 5;
    let xpLoss   = negative ? Math.floor(Math.random() * (500 - 200 + 1)) + 200 : 0;

    personaje.vida = Math.max(0, personaje.vida - vidaPerd);
    usuario.diamantes += diamantes;
    usuario.experiencia += xp;
    personaje.experiencia = Math.max(0, personaje.experiencia - xpLoss);

    // 🕒 Guardar cooldown
    if (!personaje.cooldowns) personaje.cooldowns = {};
    personaje.cooldowns.mododiablo = now;

    // 😈 Mensajes
    const pos = [
      `🔥 *${personaje.nombre} ha abrazado la oscuridad y se ha vuelto más fuerte.*\n💎 *${diamantes} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
      `👹 *El poder infernal fluye a través de ${personaje.nombre}, aumentando su energía.*\n💎 *${diamantes} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
      `💀 *Con un aura diabólica, ${personaje.nombre} se convierte en una fuerza imparable.*\n💎 *${diamantes} Diamantes obtenidos*\n✨ *${xp} XP ganados*`
    ];
    const neg = [
      `⚠️ *${personaje.nombre} se dejó consumir por el Modo Diablo y sufrió una gran pérdida.*\n💀 *Perdiste XP:* ${xpLoss}\n❤️ *Perdiste vida:* ${vidaPerd} HP`,
      `☠️ *La oscuridad fue demasiado para ${personaje.nombre}, drenando su energía vital.*\n💀 *Perdiste XP:* ${xpLoss}\n❤️ *Perdiste vida:* ${vidaPerd} HP`,
      `🔴 *${personaje.nombre} intentó controlar el Modo Diablo, pero terminó debilitado.*\n💀 *Perdiste XP:* ${xpLoss}\n❤️ *Perdiste vida:* ${vidaPerd} HP`
    ];

    await conn.sendMessage(
      msg.key.remoteJid,
      { text: negative ? neg[Math.floor(Math.random() * neg.length)] : pos[Math.floor(Math.random() * pos.length)] },
      { quoted: msg }
    );

    // 📊 Subida de nivel y rango
    let xpMax = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
    const rangos = [
      { nivel: 1, rango: "🌟 Principiante" },
      { nivel: 10, rango: "⚔️ Guerrero Oscuro" },
      { nivel: 20, rango: "🔥 Maestro del Caos" },
      { nivel: 30, rango: "👑 Señor del Infierno" },
      { nivel: 40, rango: "🌀 Destructor Demoníaco" },
      { nivel: 50, rango: "💀 Rey del Submundo" },
      { nivel: 60, rango: "🚀 Dios del Mal Supremo" },
      { nivel: 70, rango: "🔱 Emperador de la Oscuridad" }
    ];

    while (personaje.experiencia >= xpMax && personaje.nivel < 70) {
      personaje.experiencia -= xpMax;
      personaje.nivel++;
      xpMax = personaje.nivel * 1500;
      personaje.xpMax = xpMax;
      personaje.rango = rangos.reduce((a, c) => (personaje.nivel >= c.nivel ? c.rango : a), personaje.rango);

      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `🎉 *¡${personaje.nombre} ha subido al nivel ${personaje.nivel}! 🏆*\n🏅 *Nuevo Rango:* ${personaje.rango}` },
        { quoted: msg }
      );
    }

    // 🌟 Mejora de habilidades (30%)
    let habilidades = Object.keys(personaje.habilidades);
    if (habilidades.length && Math.random() < 0.3) {
      let hab = habilidades[Math.floor(Math.random() * habilidades.length)];
      personaje.habilidades[hab]++;
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `🌟 *¡${personaje.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${hab}: Nivel ${personaje.habilidades[hab]}*` },
        { quoted: msg }
      );
    }

    // 📂 Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

  } catch (error) {
    console.error("❌ Error en el comando .mododiablo:", error);
  }
};

module.exports.command = ['mododiablo'];
