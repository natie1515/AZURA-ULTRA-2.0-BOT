const fs = require("fs");
const path = require("path");

const TTT_DATA = path.resolve("ttt.json");
if (!global.tttGames) global.tttGames = {};

function crearTablero() {
  return ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
}

function pintarTablero(tablero) {
  return `
${tablero[0]} | ${tablero[1]} | ${tablero[2]}
${tablero[3]} | ${tablero[4]} | ${tablero[5]}
${tablero[6]} | ${tablero[7]} | ${tablero[8]}
`.trim();
}

function checkWin(board) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  for (let line of lines) {
    const [a,b,c] = line;
    if (board[a] === board[b] && board[b] === board[c]) return true;
  }
  return false;
}

function actualizarStats(ganador, perdedor, empate = false) {
  let data = fs.existsSync(TTT_DATA) ? JSON.parse(fs.readFileSync(TTT_DATA)) : { usuarios: {} };
  for (let id of [ganador, perdedor]) {
    if (!data.usuarios[id]) {
      data.usuarios[id] = { jugadas: 0, ganadas: 0, perdidas: 0, empates: 0 };
    }
    data.usuarios[id].jugadas += 1;
  }

  if (empate) {
    data.usuarios[ganador].empates += 1;
    data.usuarios[perdedor].empates += 1;
  } else {
    data.usuarios[ganador].ganadas += 1;
    data.usuarios[perdedor].perdidas += 1;
  }

  fs.writeFileSync(TTT_DATA, JSON.stringify(data, null, 2));
}

module.exports = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
  const name = args.join(" ") || "sin nombre";

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const opponent = ctx?.participant?.replace(/[^0-9]/g, "");
  if (!opponent) {
    return await conn.sendMessage(chatId, {
      text: "⚠️ Debes *citar un mensaje* de quien deseas retar.",
    }, { quoted: msg });
  }

  // Evitar retos múltiples del mismo jugador
  if (Object.values(global.tttGames).some(p =>
    p.jugadores.includes(sender) || p.jugadores.includes(opponent))) {
    return await conn.sendMessage(chatId, {
      text: "⛔ Ya hay una partida activa con uno de los jugadores.",
    }, { quoted: msg });
  }

  const partidaId = `${chatId}-${Date.now()}`;
  const tablero = crearTablero();
  global.tttGames[partidaId] = {
    id: partidaId,
    nombre: name,
    jugadores: [sender, opponent],
    tablero,
    turno: sender,
    timeout: setTimeout(() => {
      delete global.tttGames[partidaId];
      conn.sendMessage(chatId, {
        text: `⌛ *La partida ${name} fue cancelada por inactividad de los jugadores.*`
      });
    }, 5 * 60 * 1000) // 5 minutos
  };

  const tableroTxt = pintarTablero(tablero);
  await conn.sendMessage(chatId, {
    text: `🎮 *Nueva partida de 3 en raya iniciada*\n\n🆚 @${sender} vs @${opponent}\n🎲 Nombre: *${name}*\n\n🎯 Turno de @${sender}\n\n${tableroTxt}`,
    mentions: [`${sender}@s.whatsapp.net`, `${opponent}@s.whatsapp.net`]
  });
};

module.exports.command = ["ttt"];
