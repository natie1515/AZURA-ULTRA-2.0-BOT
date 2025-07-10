const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const costoCuracion = 500; // 💎 Costo de curación en diamantes

    // 🐉 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "🐉", key: msg.key } });

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

    // ❌ Verificar si el usuario tiene personajes
    if (!usuario.personajes || usuario.personajes.length === 0) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes personajes para curar.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
        },
        { quoted: msg }
      );
    }

    let personaje = usuario.personajes[0]; // Se cura el primer personaje de la lista

    // 💎 Verificar si el usuario tiene suficientes diamantes
    if (usuario.diamantes < costoCuracion) {
      return conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes suficientes diamantes para curar a tu personaje.*\n💎 *Costo de curación:* ${costoCuracion} Diamantes\n💰 *Diamantes disponibles:* ${usuario.diamantes}`
        },
        { quoted: msg }
      );
    }

    // 🚑 Verificar si el personaje ya tiene vida completa
    if (personaje.vida === 100) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `⚠️ *${personaje.nombre} ya tiene la vida al máximo.*` },
        { quoted: msg }
      );
    }

    // 💖 Restaurar la vida del personaje y descontar diamantes
    personaje.vida = 100;
    usuario.diamantes -= costoCuracion;

    // 🐉 Textos aleatorios al usar la curación
    const textos = [
      `🐉 *Las Bolas del Dragón fueron invocadas y ${personaje.nombre} ha sido completamente curado.*\n❤️ *Vida restaurada al 100%*\n💎 *-${costoCuracion} Diamantes*`,
      `🌟 *Un resplandor dorado envolvió a ${personaje.nombre}, restaurando toda su energía.*\n❤️ *Vida restaurada al 100%*\n💎 *-${costoCuracion} Diamantes*`,
      `🔥 *El poder del Dragón Sagrado sanó todas las heridas de ${personaje.nombre}.*\n❤️ *Vida restaurada al 100%*\n💎 *-${costoCuracion} Diamantes*`,
      `✨ *Las esferas mágicas liberaron su poder y ${personaje.nombre} volvió a estar en plena forma.*\n❤️ *Vida restaurada al 100%*\n💎 *-${costoCuracion} Diamantes*`,
      `🌿 *${personaje.nombre} bebió el elixir de la inmortalidad y recuperó toda su fuerza.*\n❤️ *Vida restaurada al 100%*\n💎 *-${costoCuracion} Diamantes*`,
      `⚡ *La energía celestial fluyó a través de ${personaje.nombre}, devolviéndole la vitalidad.*\n❤️ *Vida restaurada al 100%*\n💎 *-${costoCuracion} Diamantes*`
    ];
    await conn.sendMessage(msg.key.remoteJid, { text: textos[Math.floor(Math.random() * textos.length)] }, { quoted: msg });

    // 📊 Verificar si el personaje sube de nivel
    let xpMaxNivel = personaje.nivel * 1500;
    const rangos = [
      { nivel: 1, rango: "🌟 Principiante" },
      { nivel: 5, rango: "⚔️ Guerrero" },
      { nivel: 10, rango: "🔥 Maestro" },
      { nivel: 20, rango: "🏆 Leyenda" },
      { nivel: 30, rango: "👑 Rey Supremo" },
      { nivel: 40, rango: "🚀 Dios de la Guerra" },
      { nivel: 50, rango: "💀 Deidad de la Batalla" },
      { nivel: 60, rango: "🌌 Titán del Universo" },
      { nivel: 70, rango: "🐉 Mítico Inmortal" }
    ];

    while (personaje.experiencia >= xpMaxNivel && personaje.nivel < 70) {
      personaje.experiencia -= xpMaxNivel;
      personaje.nivel += 1;
      xpMaxNivel = personaje.nivel * 1500;
      let rangoAnterior = personaje.rango;
      personaje.rango = rangos.reduce((acc, curr) => (personaje.nivel >= curr.nivel ? curr.rango : acc), personaje.rango);

      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `🎉 *¡${personaje.nombre} ha subido al nivel ${personaje.nivel}! 🏆*\n🏅 *Nuevo Rango:* ${personaje.rango}`
        },
        { quoted: msg }
      );
    }

    // 📂 Guardar cambios en el archivo
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // ✅ Reacción de confirmación
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });
  } catch (error) {
    console.error("❌ Error en el comando .bolasdeldragon:", error);
    await conn.sendMessage(msg.key.remoteJid, { text: "❌ *Ocurrió un error al usar las Bolas del Dragón. Inténtalo de nuevo.*" }, { quoted: msg });
  }
};

module.exports.command = ['bolasdeldragon'];
