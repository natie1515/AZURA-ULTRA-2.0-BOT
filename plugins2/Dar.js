const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // Aseguramos que mentionedJid sea un array, aunque no haya menciones
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // 🔒 Verificar si el usuario que ejecuta el comando es el Owner
    if (!isOwner(sender)) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: "⛔ *Solo el propietario del bot puede dar diamantes a otros jugadores.*" 
      }, { quoted: msg });
      return;
    }

    // Determina el usuario objetivo, ya sea por cita o mención
    let targetUser;
    if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
      targetUser = msg.message.extendedTextMessage.contextInfo.participant;
    } else if (mentionedJid.length > 0) {
      targetUser = mentionedJid[0];
    }

    // Si no obtenemos un usuario por cita ni mención, mostramos ejemplo de uso
    if (!targetUser) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⚠️ *Uso incorrecto.*\nEjemplo: \`${global.prefix}dar citando el mensaje y la cantidad 5000\` ok`
      }, { quoted: msg });
      return;
    }

    // Verificar si se ingresó la cantidad de diamantes en 'text'
    const cantidadStr = (text || "").trim();
    if (!cantidadStr || isNaN(cantidadStr) || parseInt(cantidadStr) <= 0) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: "⚠️ *Debes ingresar una cantidad válida de diamantes a dar.*\nEjemplo: `citando el mensaje y la cantidad 5000`"
      }, { quoted: msg });
      return;
    }
    const cantidad = parseInt(cantidadStr);

    // 🔄 Reacción de “diamantes” mientras se procesa
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "💎", key: msg.key }
    });

    // 📂 Verificar si el archivo RPG existe
    const rpgFile = "./rpg.json";
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: "⚠️ *No hay datos de RPG guardados.*"
      }, { quoted: msg });
      return;
    }

    // 📂 Cargar datos del RPG
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // 📌 Verificar si el usuario objetivo está registrado en el RPG
    if (!rpgData.usuarios[targetUser]) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *El usuario no tiene una cuenta en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarlo.` 
      }, { quoted: msg });
      return;
    }

    // 💎 Añadir diamantes al usuario objetivo
    rpgData.usuarios[targetUser].diamantes += cantidad;
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // 📩 Confirmar transferencia
    await conn.sendMessage(msg.key.remoteJid, {
      text: `💎 *Se han enviado ${cantidad} diamantes a @${targetUser.replace("@s.whatsapp.net", "")}.*\n✨ Usa \`${global.prefix}bal\` para ver tu saldo.`,
      mentions: [targetUser]
    }, { quoted: msg });

    // ✅ Reacción de confirmación
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .dar:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Ocurrió un error al dar diamantes. Inténtalo de nuevo.*"
    }, { quoted: msg });
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['dar'];
