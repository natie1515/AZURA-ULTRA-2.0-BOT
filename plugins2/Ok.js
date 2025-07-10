const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const userId = msg.key.participant || msg.key.remoteJid;
    const rpgFile = "./rpg.json";

    // Verificar si hay una solicitud de eliminación pendiente
    if (!global.pendingDeletions || !global.pendingDeletions[userId]) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una solicitud de eliminación pendiente.* Usa \`${global.prefix}deleterpg\` para iniciar la eliminación de tu cuenta.` 
      }, { quoted: msg });
      return;
    }

    // Cancelar temporizador y remover de la lista de eliminaciones
    clearTimeout(global.pendingDeletions[userId]);
    delete global.pendingDeletions[userId];

    // Cargar datos del RPG
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // Verificar si el usuario está registrado
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: "❌ *No tienes un registro en el gremio Azura Ultra.*" 
      }, { quoted: msg });
      return;
    }

    // Recuperar personajes del usuario y devolverlos a la tienda
    let usuario = rpgData.usuarios[userId];
    if (usuario.personajes && usuario.personajes.length > 0) {
      rpgData.tiendaPersonajes.push(...usuario.personajes);
    }

    // Eliminar el usuario
    delete rpgData.usuarios[userId];

    // Guardar los cambios en el archivo JSON
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // Confirmar eliminación
    await conn.sendMessage(msg.key.remoteJid, { 
      text: `🗑️ *Tu cuenta ha sido eliminada del gremio Azura Ultra.*\n\n🔹 Puedes volver a registrarte en cualquier momento usando \`${global.prefix}rpg <nombre> <edad>\`.` 
    }, { quoted: msg });

    // ✅ Reacción de confirmación
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "✅", key: msg.key } // Emoji de confirmación ✅
    });

  } catch (error) {
    console.error("❌ Error en el comando .ok:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Ocurrió un error al confirmar la eliminación. Inténtalo de nuevo.*" 
    }, { quoted: msg });

    // ❌ Enviar reacción de error
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "❌", key: msg.key } // Emoji de error ❌
    });
  }
};

module.exports.command = ['ok'];
