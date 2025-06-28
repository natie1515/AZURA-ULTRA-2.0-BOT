module.exports = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

  const partida = Object.values(global.tttGames).find(g =>
    g.jugadores.includes(sender) && !g.aceptada
  );

  if (!partida) {
    return conn.sendMessage(chatId, {
      text: "❌ No tienes ninguna partida pendiente por aceptar."
    }, { quoted: msg });
  }

  partida.aceptada = true;
  partida.turno = partida.jugadores[Math.floor(Math.random() * 2)];

  await conn.sendMessage(chatId, {
    text: `✅ Partida aceptada.\n\n👤 Jugadores:\n➤ @${partida.jugadores[0]}\n➤ @${partida.jugadores[1]}\n\n🎯 Empieza el turno de: @${partida.turno}\n\n${pintarTablero(partida.tablero)}\n\nUsa los números del 1 al 9 para jugar.`,
    mentions: partida.jugadores.map(j => `${j}@s.whatsapp.net`)
  }, { quoted: msg });
};

module.exports.command = ["gottt"];
