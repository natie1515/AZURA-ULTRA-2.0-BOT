const fs = require('fs');

module.exports = async (msg, { conn, args }) => {
  try {
    // 💱 Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "💱", key: msg.key }
    });

    // 📥 Cantidad a transferir
    const amount = parseInt(args[0]);
    if (!amount || amount <= 0) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `⚠️ Uso correcto: \`${global.prefix}tran <cantidad>\` (cita o menciona al usuario).`
      }, { quoted: msg });
      return;
    }

    // 👤 Usuario destinatario (mencionado o citado)
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message.extendedTextMessage?.contextInfo?.participant;
    const targetJid = mentioned || quoted;
    if (!targetJid) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: "⚠️ Debes citar o mencionar al usuario al que quieres transferir."
      }, { quoted: msg });
      return;
    }

    // No transferirse a uno mismo
    const senderJid = msg.key.participant || msg.key.remoteJid;
    if (senderJid === targetJid) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: "⚠️ No puedes transferirte a ti mismo."
      }, { quoted: msg });
      return;
    }

    // 📂 Cargar datos RPG
    const rpgFile = "./rpg.json";
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *Los datos del RPG no están disponibles.*`
      }, { quoted: msg });
      return;
    }
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
    let usuarios = rpgData.usuarios || {};

    // ❌ Validar registro de remitente y destinatario
    if (!usuarios[senderJid]) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ No estás registrado en el gremio. Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }
    if (!usuarios[targetJid]) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ El usuario @${targetJid.split('@')[0]} no está registrado en el gremio.`,
        mentions: [targetJid]
      }, { quoted: msg });
      return;
    }

    // 💰 Verificar saldo
    let senderBal = usuarios[senderJid].diamantes || 0;
    if (senderBal < amount) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ No tienes suficientes diamantes. Tu saldo actual: ${senderBal}`
      }, { quoted: msg });
      return;
    }

    // 🔄 Realizar transferencia
    usuarios[senderJid].diamantes -= amount;
    usuarios[targetJid].diamantes += amount;
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // 📢 Confirmación
    await conn.sendMessage(msg.key.remoteJid, {
      text: `✅ Transferencia exitosa de *${amount}* diamante(s) a @${targetJid.split('@')[0]}.\n💎 Tu nuevo saldo: ${usuarios[senderJid].diamantes}`,
      mentions: [targetJid]
    }, { quoted: msg });

    // ✅ Reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .tran:", error);
    // No exponer stack al usuario
  }
};

module.exports.command = ['tran','transferir'];
