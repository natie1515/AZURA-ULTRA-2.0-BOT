const { proto } = require("@whiskeysockets/baileys");

const handler = async (msg, { conn }) => {
  const start = Date.now();

  // Enviar el mensaje inicial
  const sent = await conn.sendMessage(
    msg.key.remoteJid,
    { text: "🏓 *Pong...* (calculando ping)" },
    { quoted: msg }
  );

  const ping = Date.now() - start;

  // Construir el nuevo texto
  const newText = `🏓 *Pong chucha ya este subbot anda activo pa culiar 🍑 con una culona; tráeme a tu mamá o hermana, perro 🐕!Soy tan Rápido Como Tu Novia cuando Te dejó 😆*

✅ *Ping:* ${ping} ms`;

  // Editar el mensaje anterior
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
