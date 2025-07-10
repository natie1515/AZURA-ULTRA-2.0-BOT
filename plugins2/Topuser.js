const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";

    // 🔄 Enviar una única reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "📊", key: msg.key } // Emoji de estadística 📊
    });

    // Verificar si el archivo RPG existe
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: "❌ *El gremio aún no tiene miembros registrados.* Usa `.rpg <nombre> <edad>` para unirte."
      }, { quoted: msg });
      return;
    }

    // Cargar datos del gremio
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    if (!rpgData.usuarios || Object.keys(rpgData.usuarios).length === 0) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: "📜 *No hay miembros registrados en el Gremio Azura Ultra.*"
      }, { quoted: msg });
      return;
    }

    let usuarios = Object.entries(rpgData.usuarios);

    // Ordenar por nivel de mayor a menor
    usuarios.sort((a, b) => b[1].nivel - a[1].nivel);

    let ranking = `🏆 *Ranking de Jugadores del Gremio Azura Ultra* 🏆\n\n`;
    let mentions = [];

    usuarios.forEach(([userId, usuario], index) => {
      let posicion = index + 1;
      let medalla = posicion === 1 ? "🥇" : posicion === 2 ? "🥈" : posicion === 3 ? "🥉" : "🔹";
      let cantidadPersonajes = usuario.personajes ? usuario.personajes.length : 0;
      let cantidadMascotas = usuario.mascotas ? usuario.mascotas.length : 0;

      ranking += `${medalla} *${posicion}.* @${userId.replace("@s.whatsapp.net", "")}  
   🏅 *Rango:* ${usuario.rango}  
   🎚️ *Nivel:* ${usuario.nivel}  
   🎭 *Personajes:* ${cantidadPersonajes}  
   🐾 *Mascotas:* ${cantidadMascotas}\n\n`;
      mentions.push(userId);
    });

    ranking += `🔥 ¡Sigue entrenando para subir en el ranking!`;

    // Enviar el mensaje con imagen 📩
    await conn.sendMessage(msg.key.remoteJid, {
      image: { url: "https://cdn.dorratz.com/files/1740729353375.jpg" },
      caption: ranking,
      mentions: mentions // Mencionar a todos los jugadores
    }, { quoted: msg });

  } catch (error) {
    console.error("❌ Error en el comando .topuser:", error);

    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Hubo un error al obtener el ranking de jugadores. Inténtalo de nuevo.*"
    }, { quoted: msg });
  }
};

module.exports.command = ['topuser'];
