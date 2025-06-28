const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const text = args.join(" ").trim();
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const cited = ctx?.participant;

  if (!chatId.endsWith("@g.us")) {
    return conn.sendMessage(chatId, {
      text: "❌ Este comando solo puede usarse en grupos."
    }, { quoted: msg });
  }

  if (!cited) {
    return conn.sendMessage(chatId, {
      text: "🎮 Responde al mensaje del jugador que quieres retar."
    }, { quoted: msg });
  }

  const citadoNum = cited.replace(/[^0-9]/g, "");
  if (senderNum === citadoNum) {
    return conn.sendMessage(chatId, {
      text: "🙃 No puedes jugar contra ti mismo."
    }, { quoted: msg });
  }

  const gameName = text || "sin_nombre";
  const partidaId = `${chatId}_${gameName}`;

  if (!global.tttGames) global.tttGames = {};

  // Verificar que no haya una partida activa o pendiente con esos jugadores
  const jugadorYaTiene = Object.values(global.tttGames).find(g =>
    g.jugadores.includes(senderNum) && !g.finalizada
  );
  if (jugadorYaTiene) {
    return conn.sendMessage(chatId, {
      text: "⏳ Ya tienes una partida pendiente o activa. Termínala antes de iniciar otra."
    }, { quoted: msg });
  }

  global.tttGames[partidaId] = {
    id: partidaId,
    chatId,
    nombre: gameName,
    jugador: senderNum,
    reto: citadoNum,
    jugadores: [senderNum, citadoNum],
    tablero: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    aceptada: false,
    turno: null,
    finalizada: false,
    tiempo: Date.now()
  };

  await conn.sendMessage(chatId, {
    text: `🎮 *Partida de 3 en Raya creada*\n\n👤 @${senderNum} ha retado a @${citadoNum} a una partida *${gameName}*\n\n📌 Usa *.gottt* para aceptar.\n⏳ Tienes 5 minutos.`,
    mentions: [`${senderNum}@s.whatsapp.net`, `${citadoNum}@s.whatsapp.net`]
  }, { quoted: msg });

  // Tiempo de espera de 5 minutos
  setTimeout(() => {
    const partida = global.tttGames[partidaId];
    if (partida && !partida.aceptada) {
      delete global.tttGames[partidaId];
      conn.sendMessage(chatId, {
        text: `⌛ La solicitud de partida *${gameName}* ha expirado por inactividad.`
      });
    }
  }, 5 * 60 * 1000);
};

handler.command = ["ttt"];
module.exports = handler;
