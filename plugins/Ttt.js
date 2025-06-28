const fs = require("fs");
const path = require("path");

function pintarTablero(t) {
  return `
🎮 *3 en Raya - Partida*  
${t[0]} | ${t[1]} | ${t[2]}
— + — + —
${t[3]} | ${t[4]} | ${t[5]}
— + — + —
${t[6]} | ${t[7]} | ${t[8]}
`.trim();
}

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const sender = senderId.replace(/[^0-9]/g, "");
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const citado = ctx?.participant;

  if (!chatId.endsWith("@g.us")) {
    return conn.sendMessage(chatId, {
      text: "❌ Este comando solo puede usarse en grupos."
    }, { quoted: msg });
  }

  if (!citado) {
    return conn.sendMessage(chatId, {
      text: "⚠️ Debes *responder* al mensaje del usuario que quieres retar."
    }, { quoted: msg });
  }

  const oponente = citado.replace(/[^0-9]/g, "");
  if (oponente === sender) {
    return conn.sendMessage(chatId, {
      text: "🙃 No puedes jugar contra ti mismo."
    }, { quoted: msg });
  }

  const nombrePartida = args.join(" ").trim() || "sin_nombre";
  const id = `${chatId}_${nombrePartida}`;

  if (!global.tttGames) global.tttGames = {};
  if (Object.values(global.tttGames).find(g =>
    g.jugadores.includes(sender) || g.jugadores.includes(oponente))) {
    return conn.sendMessage(chatId, {
      text: "🚫 Tú o tu oponente ya tienen una partida activa o pendiente."
    }, { quoted: msg });
  }

  global.tttGames[id] = {
    id,
    nombre: nombrePartida,
    chatId,
    jugadores: [sender, oponente],
    turno: sender,
    tablero: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    aceptada: true,
    finalizada: false,
    tiempo: Date.now()
  };

  await conn.sendMessage(chatId, {
    text: `🎮 *Nueva partida iniciada: ${nombrePartida}*\n\n👤 @${sender} vs 👤 @${oponente}\n\n🔢 Turno de: @${sender}\n\n${pintarTablero(global.tttGames[id].tablero)}\n\n🎲 Envía un número del 1 al 9 para jugar.`,
    mentions: [`${sender}@s.whatsapp.net`, `${oponente}@s.whatsapp.net`]
  }, { quoted: msg });

  setTimeout(() => {
    const g = global.tttGames?.[id];
    if (g && !g.finalizada && Date.now() - g.tiempo >= 5 * 60 * 1000) {
      delete global.tttGames[id];
      conn.sendMessage(chatId, {
        text: `⌛ La partida *${nombrePartida}* ha sido cancelada por inactividad.`
      });
    }
  }, 5 * 60 * 1000);
};

handler.command = ["ttt"];
module.exports = handler;
