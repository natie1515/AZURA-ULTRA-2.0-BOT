const fs = require("fs");
const path = require("path");

const TTT_PATH = path.resolve("ttt.json");

// 🧩 Función para pintar tablero
function pintarTablero(tablero) {
  return `
╭───┬───┬───╮
│ ${tablero[0]} │ ${tablero[1]} │ ${tablero[2]} │
├───┼───┼───┤
│ ${tablero[3]} │ ${tablero[4]} │ ${tablero[5]} │
├───┼───┼───┤
│ ${tablero[6]} │ ${tablero[7]} │ ${tablero[8]} │
╰───┴───┴───╯`;
}

module.exports = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

  const partida = Object.values(global.tttGames || {}).find(g =>
    g.reto === sender && !g.aceptada && g.chatId === chatId
  );

  if (!partida) {
    return await conn.sendMessage(chatId, {
      text: "⚠️ No tienes ninguna partida pendiente que aceptar.",
      quoted: msg
    });
  }

  partida.aceptada = true;
  partida.turno = Math.random() < 0.5 ? partida.jugador : partida.reto;
  partida.tablero = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  const tablero = pintarTablero(partida.tablero);

  await conn.sendMessage(chatId, {
    text: `✅ *La partida ha comenzado*\n🎮 Nombre: *${partida.nombre || "Sin nombre"}*\n\n🆚 *Jugadores:*\n➤ @${partida.jugador}\n➤ @${partida.reto}\n\n🎯 Turno inicial: @${partida.turno}\n\n${tablero}`,
    mentions: partida.jugadores.map(j => `${j}@s.whatsapp.net`)
  });

  // Registrar usuarios en el archivo de estadísticas
  if (!fs.existsSync(TTT_PATH)) fs.writeFileSync(TTT_PATH, JSON.stringify({}));
  const stats = JSON.parse(fs.readFileSync(TTT_PATH));
  for (const user of partida.jugadores) {
    if (!stats[user]) stats[user] = { jugadas: 0, ganadas: 0, perdidas: 0 };
    stats[user].jugadas += 1;
  }
  fs.writeFileSync(TTT_PATH, JSON.stringify(stats, null, 2));
};

module.exports.command = ["gottt"];
