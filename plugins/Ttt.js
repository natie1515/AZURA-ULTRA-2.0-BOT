const fs = require("fs");
const path = require("path");

const TTT_PATH = path.resolve("ttt.json");
if (!global.tttGames) global.tttGames = {};

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
  const isGroup = chatId.endsWith("@g.us");

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const citado = ctx?.participant;

  if (!isGroup) return conn.sendMessage(chatId, {
    text: "⚠️ Este comando solo se puede usar en grupos."
  }, { quoted: msg });

  const nombre = args.join(" ").trim();
  const enemigo = citado?.replace(/[^0-9]/g, "");

  if (!enemigo) {
    return conn.sendMessage(chatId, {
      text: "📍 Debes responder al mensaje del oponente que quieres retar."
    }, { quoted: msg });
  }

  if (enemigo === sender) {
    return conn.sendMessage(chatId, {
      text: "🙃 No puedes jugar contra ti mismo."
    }, { quoted: msg });
  }

  // Verificar si ya tiene una partida pendiente
  if (Object.values(global.tttGames).some(g =>
    g.jugadores.includes(sender) || g.jugadores.includes(enemigo))) {
    return conn.sendMessage(chatId, {
      text: "⚠️ Tú o el oponente ya tienen una partida pendiente."
    }, { quoted: msg });
  }

  const id = Date.now().toString();
  global.tttGames[id] = {
    id,
    nombre: nombre || "sin nombre",
    jugadores: [sender, enemigo],
    tablero: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    turno: sender,
    aceptada: false,
    timeout: setTimeout(() => {
      delete global.tttGames[id];
    }, 5 * 60 * 1000)
  };

  const tablero = pintarTablero(global.tttGames[id].tablero);

  await conn.sendMessage(chatId, {
    text: `🎮 *Partida 3 en raya creada*\n\n🧑‍💼 Retador: @${sender}\n👤 Retado: @${enemigo}\n📛 Nombre: *${global.tttGames[id].nombre}*\n\n🔄 Para aceptar escribe: *.gottt*\n\n${tablero}`,
    mentions: [`${sender}@s.whatsapp.net`, `${enemigo}@s.whatsapp.net`]
  }, { quoted: msg });
};

handler.command = ["ttt"];
module.exports = handler;
