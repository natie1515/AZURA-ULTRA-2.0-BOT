const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔄 Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🏰", key: msg.key }
    });

    const rpgFile = "./rpg.json";
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *El gremio aún no tiene miembros.* Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }

    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
    const usuarios = rpgData.usuarios;
    if (!usuarios || Object.keys(usuarios).length === 0) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `📜 *No hay miembros registrados en el Gremio Azura Ultra.*\nUsa \`${global.prefix}rpg <nombre> <edad>\` para unirte.`
      }, { quoted: msg });
      return;
    }

    // Ordenar miembros por nivel descendente
    let miembros = Object.values(usuarios).sort((a, b) => b.nivel - a.nivel);

    // Construir mensaje
    let lista = 
`╔══════════════════╗  
║ 🏰 *Gremio Azura Ultra* 🏰 ║  
╚══════════════════╝  

📋 *Total de miembros registrados:* ${miembros.length}\n`;

    miembros.forEach((u, i) => {
      const numMascotas = Array.isArray(u.mascotas) ? u.mascotas.length : 0;
      const numPersonajes = Array.isArray(u.personajes) ? u.personajes.length : 0;
      lista += 
`\n════════════════════
🔹 *${i + 1}.* ${u.nombre}
   🏅 *Rango:* ${u.rango}
   🎚️ *Nivel:* ${u.nivel}
   🎂 *Edad:* ${u.edad} años
   🐾 *Mascotas:* ${numMascotas}
   🎭 *Personajes:* ${numPersonajes}`;
    });

    // Enviar con video de fondo como GIF
    await conn.sendMessage(msg.key.remoteJid, {
      video: { url: "https://cdn.dorratz.com/files/1740565316697.mp4" },
      gifPlayback: true,
      caption: lista
    }, { quoted: msg });

  } catch (error) {
    console.error("❌ Error en el comando .gremio:", error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Hubo un error al obtener la lista del gremio. Inténtalo de nuevo.*"
    }, { quoted: msg });
  }
};

module.exports.command = ['gremio'];
