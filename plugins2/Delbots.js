const path = require("path");
const { SubBotManager } = require("../indexsubbots");

const handler = async (msg, { conn }) => {
  const sessionId = msg.sender;
  const sessionPath = path.join(SubBotManager.sessionBaseDir, sessionId);

  const subbotExists = SubBotManager.getSubBot(sessionPath);

  if (subbotExists) {
    SubBotManager.removeSubBot(sessionPath, true);
    await conn.sendMessage(
      msg.key.remoteJid,
      {
        text: "🗑️ *Tu sesión ha sido eliminada correctamente.*\n\nPuedes volver a usar *.sercode o .code* cuando gustes.",
      },
      { quoted: msg },
    );
  } else {
    await conn.sendMessage(
      msg.key.remoteJid,
      {
        text: "⚠️ *No se encontró ninguna sesión activa para eliminar.*",
      },
      { quoted: msg },
    );
  }
};

handler.command = ["delbots"];
module.exports = handler;
