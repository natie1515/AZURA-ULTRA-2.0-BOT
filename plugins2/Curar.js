const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const costoCuracion = 500; // 💎 Costo de la curación

    // 🏥 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "❤️", key: msg.key } });

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

    // 🏥 Verificar si la mascota ya tiene vida completa
    if (mascota.vida >= 100) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `✅ *${mascota.nombre} ya tiene su vida completa.* No es necesario curarla.` },
        { quoted: msg }
      );
    }

    // 💎 Verificar si el usuario tiene suficientes diamantes
    if (usuario.diamantes < costoCuracion) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No tienes suficientes diamantes para curar a tu mascota.*\n💎 *Necesitas ${costoCuracion} diamantes.*` },
        { quoted: msg }
      );
    }

    // 💖 Restaurar la vida de la mascota y descontar diamantes
    usuario.diamantes -= costoCuracion;
    mascota.vida = 100;

    // 🏥 Mensaje de confirmación
    await conn.sendMessage(
      msg.key.remoteJid,
      {
        text: `❤️ *¡Has curado a ${mascota.nombre} exitosamente!* 🏥\n\n💎 *Costo:* ${costoCuracion} diamantes\n❤️ *Vida restaurada a:* 100 HP\n\n¡Ahora ${mascota.nombre} está lista para más aventuras! 🐾`
      },
      { quoted: msg }
    );

    // 📂 Guardar cambios en el archivo
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

  } catch (error) {
    console.error("❌ Error en el comando .curar:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Ocurrió un error al curar a tu mascota. Inténtalo de nuevo.*" },
      { quoted: msg }
    );
  }
};

module.exports.command = ['curar'];
