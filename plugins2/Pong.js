/*  plugins2/ping.js  – envía **un solo** mensaje editado con el ping  */

const handler = async (msg, { conn }) => {
  /* 1️⃣  envía un mensaje “placeholder” */
  const start  = Date.now();
  const sent   = await conn.sendMessage(
    msg.key.remoteJid,
    { text: "🏓 *Pong…*  (calculando ping)" },
    { quoted: msg }
  );

  /* 2️⃣  calcula la latencia de ida */
  const ping = Date.now() - start;

  /* 3️⃣  edita ese mismo mensaje con el resultado */
  await conn.sendMessage(
    msg.key.remoteJid,
    {
      text:
`🏓 *Pong chucha ya este subbot anda activo pa culiar 🍑
con una culona; tráeme a tu mamá o hermana, perro 🐕!*

✅ *Ping:* ${ping} ms. Soy tan Rapido Como Tu Novia cuando Te dejo😆`
    },
    { edit: sent.key }
  );
};

handler.command = ["ping"];
module.exports = handler;
