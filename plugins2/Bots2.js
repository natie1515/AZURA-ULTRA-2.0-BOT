const fs = require("fs");
const path = require("path");
const { SubBotManager } = require("../indexsubbots");

const handler = async (msg, { conn }) => {
  const prefixPath = path.join(__dirname, "..", "prefixes.json");

  const subbots = SubBotManager.listSubBots();

  if (subbots.length === 0) {
    return conn.sendMessage(
      msg.key.remoteJid,
      { text: "⚠️ No hay subbots conectados actualmente." },
      { quoted: msg },
    );
  }

  let dataPrefijos = {};
  if (fs.existsSync(prefixPath)) {
    dataPrefijos = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
  }

  const total = subbots.length;
  const maxSubbots = SubBotManager.MAX_SUBBOTS;
  const disponibles = maxSubbots - total;
  const mentions = [];

  const lista = subbots
    .map((subbot, i) => {
      const jid = subbot.id.split("@")[0];
      mentions.push(subbot.id);
      const prefijo = dataPrefijos[subbot.id] || ".";

      return `╭➤ *Subbot ${i + 1}*\n│ Número: @${jid}\n│ Prefijo: *${prefijo}*\n╰───────────────`;
    })
    .join("\n\n");

  const menu = `╭━〔 *AZURA ULTRA 2.0* 〕━⬣
│ 🤖 Total conectados: *${total}/${maxSubbots}*
│ 🟢 Sesiones libres: *${disponibles}*
╰━━━━━━━━━━━━⬣

${lista}`;

  await conn.sendMessage(
    msg.key.remoteJid,
    {
      text: menu,
      mentions: mentions,
    },
    { quoted: msg },
  );
};

handler.command = ["bots", "subbots"];
handler.tags = ["owner"];
handler.help = ["bots"];
module.exports = handler;
