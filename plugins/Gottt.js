const fs = require("fs");
const path = require("path");

const TTT_FILE = path.resolve("ttt.json");
const partidas = fs.existsSync(TTT_FILE) ? JSON.parse(fs.readFileSync(TTT_FILE)) : {};
const enCurso = global.enCurso || {};

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

  const partida = Object.values(enCurso).find(p => p.jugadores[1] === sender && !p.aceptada);
  if (!partida) {
    return conn.sendMessage(chatId, {
      text: "⚠️ No tienes ninguna solicitud pendiente."
    }, { quoted: msg });
  }

  partida.aceptada = true;
  partida.turno = partida.jugadores[Math.floor(Math.random() * 2)];
  global.tttGames = global.tttGames || {};
  global.tttGames[partida.id] = partida;

  const tablero = pintarTablero(partida.tablero);

  await conn.sendMessage(chatId, {
    text: `✅ *¡Partida iniciada!* 🧩 *${partida.nombre}*\n\n🎮 @${partida.jugadores[0]} vs @${partida.jugadores[1]}\n🟢 Turno: @${partida.turno}\n\n${tablero}\n\n📍 Juega usando los números del 1 al 9.`,
    mentions: partida.jugadores.map(u => `${u}@s.whatsapp.net`)
  }, { quoted: msg });

  delete enCurso[partida.jugadores[0]];
};

function pintarTablero(tab) {
  return `
╭───────╮
│ ${tab[0]} │ ${tab[1]} │ ${tab[2]} │
│ ${tab[3]} │ ${tab[4]} │ ${tab[5]} │
│ ${tab[6]} │ ${tab[7]} │ ${tab[8]} │
╰───────╯`;
}

handler.command = ["gottt"];
module.exports = handler;
