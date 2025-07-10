const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const costoCuracion = 500; // 💰 Precio por curarse

    // 🚑 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "🏥", key: msg.key } 
    });

    // 📂 Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: "❌ *Los datos del RPG no están disponibles.*" 
      }, { quoted: msg });
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

    // ❌ Verificar si el usuario tiene suficientes diamantes para curarse
    if (usuario.diamantes < costoCuracion) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes suficientes diamantes para curarte.*\n💎 *Diamantes necesarios:* ${costoCuracion}\n💰 *Tu saldo actual:* ${usuario.diamantes} diamantes.` 
      }, { quoted: msg });
    }

    // ❌ Verificar si el usuario ya tiene la vida llena
    if (usuario.vida >= 100) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `⚕️ *Tu vida ya está completa.*\n❤️ *Vida actual:* ${usuario.vida} HP` 
      }, { quoted: msg });
    }

    // 🏥 Curar al usuario
    usuario.vida = 100; // Restaurar la vida a 100
    usuario.diamantes -= costoCuracion; // Cobrar el costo de curación

    // 📂 Guardar cambios en el archivo
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // 📜 Mensaje de confirmación
    let mensaje = `🏥 *Has sido curado en el hospital.*\n\n`;
    mensaje += `❤️ *Vida restaurada:* 100 HP\n`;
    mensaje += `💰 *Costo de la curación:* ${costoCuracion} diamantes\n`;
    mensaje += `💎 *Diamantes restantes:* ${usuario.diamantes}\n\n`;
    mensaje += `🩹 *¡Vuelve cuando necesites más cuidados!*`;

    // 📩 Enviar mensaje de confirmación
    await conn.sendMessage(msg.key.remoteJid, { text: mensaje }, { quoted: msg });

  } catch (error) {
    console.error("❌ Error en el comando .hospital:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Hubo un error al intentar curarte. Inténtalo de nuevo.*" 
    }, { quoted: msg });
  }
};

module.exports.command = ['hospital', 'hosp'];
