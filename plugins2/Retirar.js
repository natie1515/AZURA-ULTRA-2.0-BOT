const fs = require('fs');

module.exports = async (msg, { conn, args }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;

    // 🏦 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "💰", key: msg.key } 
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

    // 🔢 Verificar si el usuario ingresó una cantidad válida
    let cantidad = parseInt(args[0]);
    if (isNaN(cantidad) || cantidad <= 0) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `⚠️ *Uso incorrecto.*\n📌 Ejemplo: \`${global.prefix}ret 500\`\n💎 Retira diamantes del gremio.` 
      }, { quoted: msg });
    }

    // ❌ Verificar si el usuario tiene suficientes diamantes guardados
    if (usuario.diamantesGuardados < cantidad) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes suficientes diamantes en el gremio.*\n🏦 *Diamantes guardados:* ${usuario.diamantesGuardados}` 
      }, { quoted: msg });
    }

    // 🏦 Retirar los diamantes
    usuario.diamantesGuardados -= cantidad;
    usuario.diamantes += cantidad;

    // 📂 Guardar cambios en el archivo
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // 📜 Mensaje de confirmación
    let mensaje = `✅ *Has retirado ${cantidad} diamantes del gremio.*\n\n`;
    mensaje += `💎 *Diamantes en inventario:* ${usuario.diamantes}\n`;
    mensaje += `🏦 *Diamantes guardados en el gremio:* ${usuario.diamantesGuardados}\n`;
    mensaje += `\n⚠️ *Recuerda que los diamantes fuera del gremio pueden ser robados.*`;

    // 📩 Enviar mensaje de confirmación
    await conn.sendMessage(msg.key.remoteJid, { text: mensaje }, { quoted: msg });

  } catch (error) {
    console.error("❌ Error en el comando .retirar:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Hubo un error al retirar diamantes. Inténtalo de nuevo.*" 
    }, { quoted: msg });
  }
};

module.exports.command = ['retirar', 'ret'];
