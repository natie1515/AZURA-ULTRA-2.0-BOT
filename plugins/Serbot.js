const { SubBotManager } = require("../subbot-manager");

const handler = async (msg, { conn, command }) => {
  const usePairingCode = ["sercode", "code"].includes(command);
  const sessionId = msg.sender;

  if (!sessionId) {
    return conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ No se pudo determinar tu número." },
      { quoted: msg },
    );
  }

  await conn.sendMessage(msg.key.remoteJid, { react: { text: "⌛", key: msg.key } });

  SubBotManager.createSubBot(sessionId, {
    mainConn: conn,
    initialMsg: msg,
    usePairingCode,
    isNew: true,
  });
};

handler.command = ["sercode", "code", "jadibot", "serbot", "qr"];
handler.tags = ["owner"];
handler.help = ["serbot", "code"];

module.exports = handler;
