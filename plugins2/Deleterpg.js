const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const userId = msg.key.participant || msg.key.remoteJid;
    const rpgFile = "./rpg.json";

    // 🔄 Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "⏳", key: msg.key } // Emoji de espera ⏳
    });

    // Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: "⚠️ *No hay datos de RPG guardados.*" 
      }, { quoted: msg });
      return;
    }

    // Cargar datos del RPG
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // Verificar si el usuario está registrado
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes un registro en el gremio Azura Ultra.*\n\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.` 
      }, { quoted: msg });
      return;
    }

    // Confirmación de eliminación
    await conn.sendMessage(msg.key.remoteJid, { 
      text: `⚠️ *¿Estás seguro de que quieres eliminar tu cuenta del gremio Azura Ultra?* Esto borrará todos tus datos, incluyendo personajes y mascotas.\n\n⏳ *Tienes 1 minuto para confirmar.*\n\n✅ Si estás seguro, usa \`${global.prefix}ok\` para confirmar.\n❌ Si no quieres eliminar, simplemente ignora este mensaje.` 
    }, { quoted: msg });

    // Guardar en memoria temporal la solicitud de eliminación
    global.pendingDeletions = global.pendingDeletions || {};
    global.pendingDeletions[userId] = setTimeout(() => {
      delete global.pendingDeletions[userId]; // Expira la solicitud después de 1 minuto
    }, 60000);

  } catch (error) {
    console.error("❌ Error en el comando .deleterpg:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Ocurrió un error al intentar eliminar tu registro. Inténtalo de nuevo.*" 
    }, { quoted: msg });
  }
};

module.exports.command = ['deleterpg'];
