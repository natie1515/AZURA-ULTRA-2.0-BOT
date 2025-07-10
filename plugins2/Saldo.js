const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔄 Enviar reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "💰", key: msg.key } // Emoji de dinero 💰
    });

    // Archivo JSON donde se guardan los datos del RPG
    const rpgFile = "./rpg.json";

    // Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una cuenta en el gremio Azura Ultra.*\n\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.` 
      }, { quoted: msg });
      return;
    }

    // Cargar los datos del RPG
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // Verificar si el usuario está registrado
    let userId = msg.key.participant || msg.key.remoteJid;
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una cuenta en el gremio Azura Ultra.*\n\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.` 
      }, { quoted: msg });
      return;
    }

    let usuario = rpgData.usuarios[userId];

    // Construir mensaje de saldo 📜
    let mensaje = `
*╔═══❖•ೋ° °ೋ•❖═══╗*
🎒 *Bienvenido a tu Cartera* 🎒
*╚═══❖•ೋ° °ೋ•❖═══╝*

💰 *SALDO DE:* @${userId.replace("@s.whatsapp.net", "")}

⊰᯽⊱┈──╌❊╌──┈⊰᯽⊱
💎 *Diamantes disponibles:* ${usuario.diamantes}
🏦 *Diamantes guardados en el gremio:* ${usuario.diamantesGuardados}
⊰᯽⊱┈──╌❊╌──┈⊰᯽⊱

📜 *¿Cómo guardar tus diamantes en el gremio?*  
🔹 Usa \`${global.prefix}dep <cantidad>\` o \`${global.prefix}depositar <cantidad>\` para almacenar diamantes en el gremio.  
🔹 Los diamantes guardados están protegidos y no pueden ser robados.  

📜 *¿Cómo retirar diamantes del gremio?*  
🔹 Usa \`${global.prefix}retirar <cantidad>\` para sacar diamantes de tu cuenta del gremio y agregarlos a tu saldo.  

🚀 ¡Administra bien tu economía y conviértete en el más rico del gremio! 🏆
`;

    // Enviar mensaje con el video como GIF 🎥
    await conn.sendMessage(msg.key.remoteJid, { 
      video: { url: "https://cdn.dorratz.com/files/1740652887134.mp4" },
      gifPlayback: true,
      caption: mensaje,
      mentions: [userId]
    }, { quoted: msg });

    // ✅ Confirmación con reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "✅", key: msg.key } // Emoji de confirmación ✅
    });

  } catch (error) {
    console.error("❌ Error en el comando .bal:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Ocurrió un error al obtener tu saldo. Inténtalo de nuevo.*" 
    }, { quoted: msg });

    // ❌ Enviar reacción de error
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "❌", key: msg.key } // Emoji de error ❌
    });
  }
};

module.exports.command = ['bal', 'saldo'];
