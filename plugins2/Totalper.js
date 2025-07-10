const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔢 Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🔢", key: msg.key }
    });

    const rpgFile = "./rpg.json";
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: "❌ *No se encontró el archivo de RPG.*"
      }, { quoted: msg });
      return;
    }

    const rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // 📦 Total en tienda
    const totalStore = Array.isArray(rpgData.tiendaPersonajes)
      ? rpgData.tiendaPersonajes.length
      : 0;

    // 👥 Total en usuarios
    let totalUsers = 0;
    if (rpgData.usuarios && typeof rpgData.usuarios === "object") {
      for (const uid in rpgData.usuarios) {
        const u = rpgData.usuarios[uid];
        if (Array.isArray(u.personajes)) {
          totalUsers += u.personajes.length;
        }
      }
    }

    const totalCharacters = totalStore + totalUsers;

    // ✉️ Enviar resultado
    const messageText =
      `📊 *TOTAL DE PERSONAJES EN EL SISTEMA* 📊\n\n` +
      `*En la tienda:* ${totalStore}\n` +
      `*En las carteras de usuarios:* ${totalUsers}\n` +
      `─────────────────────────\n` +
      `*Total:* ${totalCharacters}`;

    await conn.sendMessage(msg.key.remoteJid, {
      text: messageText
    }, { quoted: msg });

    // ✅ Reacción final
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });
  } catch (error) {
    console.error("❌ Error en el comando .totalper:", error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Ocurrió un error al calcular el total de personajes.*"
    }, { quoted: msg });
  }
};

module.exports.command = ['totalper'];
