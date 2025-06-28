const fs = require("fs");
const path = require("path");

const TTT_FILE = path.resolve("ttt.json");
const partidas = fs.existsSync(TTT_FILE) ? JSON.parse(fs.readFileSync(TTT_FILE)) : {};
const enCurso = {}; // En memoria temporal para solicitudes activas

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const sender = senderId.replace(/[^0-9]/g, "");

  if (!chatId.endsWith("@g.us")) {
    return conn.sendMessage(chatId, {
      text: "🎮 Este comando solo funciona en grupos."
    }, { quoted: msg });
  }

  if (enCurso[sender]) {
    return conn.sendMessage(chatId, {
      text: "⏳ Ya tienes una solicitud activa o partida pendiente."
    }, { quoted: msg });
  }

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const target = ctx?.participant?.replace(/[^0-9]/g, "");
  if (!target || target === sender) {
    return conn.sendMessage(chatId, {
      text: "⚠️ Debes *responder* al mensaje del jugador que deseas retar."
    }, { quoted: msg });
  }

  const nombrePartida = args.join(" ").trim() || "Sin nombre";
  const partidaId = `${sender}-${target}-${Date.now()}`;
  const tablero = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  enCurso[sender] = {
    id: partidaId,
    nombre: nombrePartida,
    jugadores: [sender, target],
    turno: null,
    tablero,
    aceptada: false,
    timestamp: Date.now()
  };

  await conn.sendMessage(chatId, {
    text: `🎮 *¡Reto de 3 en raya!*\n\n👤 *@${sender}* ha retado a *@${target}*\n🧩 *Partida:* ${nombrePartida}\n\n👉 *@${target}*, acepta el reto usando:\n*.gottt*`,
    mentions: [`${sender}@s.whatsapp.net`, `${target}@s.whatsapp.net`]
  }, { quoted: msg });

  setTimeout(() => {
    if (enCurso[sender] && !enCurso[sender].aceptada) {
      delete enCurso[sender];
      conn.sendMessage(chatId, {
        text: `⌛ La solicitud de 3 en raya expiró. ⏳`
      });
    }
  }, 5 * 60 * 1000);
};

handler.command = ["ttt"];
module.exports = handler;
