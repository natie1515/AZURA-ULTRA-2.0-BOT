const { proto } = require("@whiskeysockets/baileys");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const handler = async (msg, { conn }) => {
  const start = Date.now();

  // Mensaje inicial
  const sent = await conn.sendMessage(
    msg.key.remoteJid,
    { text: "🏓 *Pong...* (calculando ping)" },
    { quoted: msg }
  );

  const ping = Date.now() - start;

  // Esperar un poco para asegurar que el mensaje pueda ser editado
  await sleep(100);

  const newText = `🏓 *Pong chucha ya este subbot anda activo pa culiar 🍑 con una culona; tráeme a tu mamá o hermana, perro 🐕!Soy tan Rápido Como Tu Novia cuando Te dejó 😆*

✅ *Ping:* ${ping} ms`;

  await conn.relayMessage(
    msg.key.remoteJid,
    {
      protocolMessage: {
        key: sent.key,
        type: 14,
        editedMessage: proto.Message.fromObject({
          conversation: newText
        })
      }
    },
    { messageId: sent.key.id }
  );
};

handler.command = ["ping"];
module.exports = handler;
