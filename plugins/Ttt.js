const fs = require("fs");
const path = require("path");
const tttPath = path.resolve("ttt.json");

module.exports = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const citado = ctx?.participant?.replace(/[^0-9]/g, "");
  const mencionado = citado || (args[0]?.includes("@") ? args[0].replace(/[^0-9]/g, "") : null);

  if (!mencionado || mencionado === sender) {
    return conn.sendMessage(chatId, {
      text: "🎮 Debes *citar o mencionar* a alguien para retarlo."
    }, { quoted: msg });
  }

  // Verificar si ya hay partida pendiente
  const yaHay = Object.values(global.tttGames).find(g =>
    g.jugadores.includes(sender) && !g.aceptada
  );

  if (yaHay) {
    return conn.sendMessage(chatId, {
      text: `⏳ Ya tienes una partida pendiente contra @${yaHay.jugadores.find(j => j !== sender)}.`,
      mentions: yaHay.jugadores.map(j => `${j}@s.whatsapp.net`)
    }, { quoted: msg });
  }

  const id = Date.now();
  const partida = {
    id,
    nombre: args[1] ? args.slice(1).join(" ") : "sin nombre",
    jugadores: [sender, mencionado],
    aceptada: false,
    turno: null,
    tablero: Array(9).fill("⬜"),
    timestamp: Date.now()
  };

  global.tttGames[id] = partida;

  await conn.sendMessage(chatId, {
    text: `🎮 *@${mencionado}* has sido retado a *3 en raya* por *@${sender}*\n\n👥 Partida: *${partida.nombre}*\n\n👉 Usa *.gottt* para aceptar.`,
    mentions: partida.jugadores.map(j => `${j}@s.whatsapp.net`)
  }, { quoted: msg });

  // Borrar si no acepta en 5 minutos
  setTimeout(() => {
    const sigue = global.tttGames[id];
    if (sigue && !sigue.aceptada) delete global.tttGames[id];
  }, 5 * 60 * 1000);
};

module.exports.command = ["ttt"];
