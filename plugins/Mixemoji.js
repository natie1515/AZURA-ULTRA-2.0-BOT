// plugins2/mixemoji.js
const fetch = require("node-fetch");

const handler = async (msg, { conn, args, text, command }) => {
  const chatId = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!text || !text.includes("+")) {
    return conn.sendMessage(chatId, {
      text: `❓ *Uso correcto:*\nEscribe dos emojis separados por "+" para mezclarlos.\n\nEjemplo: .${command} 😳+😩`,
    }, { quoted: msg });
  }

  await conn.sendMessage(chatId, { react: { text: "🧪", key: msg.key } });

  const [emo1, emo2] = text.split("+");
  if (!emo1 || !emo2) {
    return conn.sendMessage(chatId, {
      text: "🚫 *Debes dar dos emojis para mezclar, separados con +.*",
    }, { quoted: msg });
  }

  const apiUrl = `https://api.neoxr.eu/api/emoji?q=${encodeURIComponent(emo1)}_${encodeURIComponent(emo2)}&apikey=russellxz`;

  try {
    const res = await fetch(apiUrl);
    const json = await res.json();

    if (!json.status || !json.data?.url) {
      return conn.sendMessage(chatId, {
        text: "❌ *No se pudo generar el emoji mezclado.*",
      }, { quoted: msg });
    }

    await conn.sendMessage(chatId, {
      sticker: { url: json.data.url },
    }, { quoted: msg });

    await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

  } catch (err) {
    console.error("❌ Error en mixemoji:", err);
    return conn.sendMessage(chatId, {
      text: "❌ *Ocurrió un error al generar el emoji.*",
    }, { quoted: msg });
  }
};

handler.command = ["mixemoji"];
handler.tags = ["fun"];
handler.help = ["mixemoji 😳+😩"];
module.exports = handler;
