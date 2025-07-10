const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🏆 Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🏆", key: msg.key }
    });

    const rpgFile = "./rpg.json";
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `❌ *No hay datos de RPG. Usa \`${global.prefix}crearcartera\` para empezar.*` },
        { quoted: msg }
      );
      return;
    }

    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
    let usuarios = rpgData.usuarios;
    if (!usuarios || Object.keys(usuarios).length === 0) {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *No hay usuarios registrados aún.*" },
        { quoted: msg }
      );
      return;
    }

    // 🏅 Construir array de ranking
    let ranking = Object.entries(usuarios)
      .map(([id, user]) => {
        if (!user.personajes || user.personajes.length === 0) return null;
        const cantidad = user.personajes.length;
        const totalNivel = user.personajes.reduce((sum, p) => sum + (p.nivel || 1), 0);
        const listado = user.personajes
          .map(p => `🎭 ${p.nombre} (Nivel ${p.nivel})`)
          .join("\n");
        return { id, cantidad, totalNivel, listado };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.cantidad !== a.cantidad) return b.cantidad - a.cantidad;
        return b.totalNivel - a.totalNivel;
      });

    // 📝 Generar mensaje de ranking
    let mensaje = "🏆 *Ranking de Jugadores con Más y Mejores Personajes* 🏆\n━━━━━━━━━━━━━━━━━━━━\n";
    ranking.forEach((u, idx) => {
      mensaje += `🥇 *#${idx + 1} - @${u.id.split('@')[0]}*\n`;
      mensaje += `🎮 *Personajes:* ${u.cantidad}\n`;
      mensaje += `🔥 *Total Nivel:* ${u.totalNivel}\n`;
      mensaje += `${u.listado}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    });

    // 📤 Enviar con imagen de fondo y menciones
    await conn.sendMessage(
      msg.key.remoteJid,
      {
        image: { url: "https://cdn.dorratz.com/files/1741194214880.jpg" },
        caption: mensaje,
        mentions: ranking.map(u => u.id)
      },
      { quoted: msg }
    );

  } catch (error) {
    console.error("❌ Error en el comando .topper:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: `❌ *Ocurrió un error al generar el ranking. Inténtalo de nuevo.*` },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['topper'];
