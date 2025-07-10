const fs = require('fs');
const axios = require('axios');

module.exports = async (msg, { conn }) => {
  try {
    const rpgFile = "./rpg.json";
    const userId = msg.key.participant || msg.key.remoteJid;
    const defaultImageUrl = "https://cdn.dorratz.com/files/1740822565780.jpg"; // Imagen por defecto

    // 📜 Reacción antes de procesar
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "📜", key: msg.key } 
    });

    // 📂 Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: "❌ *Los datos del RPG no están disponibles.*" 
      }, { quoted: msg });
    }

    // 📥 Cargar datos del usuario
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // ❌ Verificar si el usuario está registrado
    if (!rpgData.usuarios[userId]) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una cuenta registrada en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.` 
      }, { quoted: msg });
    }

    let usuario = rpgData.usuarios[userId];

    // 📸 Obtener foto de perfil del usuario
    let profilePictureUrl;
    try {
      profilePictureUrl = await conn.profilePictureUrl(userId, "image");
    } catch {
      profilePictureUrl = defaultImageUrl;
    }

    // 🏅 Rango basado en nivel
    const rangos = [
      { nivel: 1, rango: "🌟 Novato" },
      { nivel: 5, rango: "⚔️ Guerrero Novato" },
      { nivel: 10, rango: "🔥 Maestro Combatiente" },
      { nivel: 20, rango: "👑 Élite Supremo" },
      { nivel: 30, rango: "🌀 Legendario" },
      { nivel: 40, rango: "💀 Dios de la Guerra" },
      { nivel: 50, rango: "🚀 Titán Supremo" }
    ];
    usuario.rango = rangos.reduce((acc, curr) =>
      usuario.nivel >= curr.nivel ? curr.rango : acc
    , usuario.rango);

    // 📊 Construir mensaje de estadísticas
    let mensaje = `🎖️ *Estadísticas de ${usuario.nombre}*\n\n`;
    mensaje += `🏅 *Rango:* ${usuario.rango}\n`;
    mensaje += `🎚 *Nivel:* ${usuario.nivel}\n`;
    mensaje += `❤️ *Vida:* ${usuario.vida} HP\n`;
    mensaje += `✨ *XP:* ${usuario.experiencia} / ${(usuario.nivel * 1500)} XP\n\n`;
    mensaje += `🌟 *Habilidades:*\n`;
    Object.entries(usuario.habilidades).forEach(([habilidad, data]) => {
      mensaje += `   🔹 ${habilidad}: Nivel ${data.nivel}\n`;
    });
    mensaje += `\n💪 *Comandos para mejorar tu nivel y habilidades:*  
━━━━━━━━━━━━━━━━━━━━━━  
⛏️ *Recolección y Trabajo:*  
🔹 \`${global.prefix}picar\`, \`${global.prefix}minar\`, \`${global.prefix}minar2\`, \`${global.prefix}work\`  
🎁 *Recompensas y robos:*  
🔹 \`${global.prefix}claim\`, \`${global.prefix}cofre\`, \`${global.prefix}crime\`, \`${global.prefix}robar\`  

⚔️ *Batallas y Ránkings:*  
━━━━━━━━━━━━━━━━━━━━━━  
🆚 *Lucha contra otros usuarios:*  
🔹 Usa \`${global.prefix}batallauser\` para desafiar a alguien.  

🏆 *Consulta el ranking global:*  
🔹 Usa \`${global.prefix}topuser\` para ver el top de jugadores.  

💰 *Gestión de Diamantes:*  
━━━━━━━━━━━━━━━━━━━━━━  
🏦 *Guarda diamantes:*  
🔹 \`${global.prefix}depositar <cantidad>\`  
💎 *Retira diamantes:*  
🔹 \`${global.prefix}retirar <cantidad>\`  

🚑 *Cuidado de tu personaje:*  
━━━━━━━━━━━━━━━━━━━━━━  
❤️ *Cura tu vida:*  
🔹 \`${global.prefix}hospital\`  
🐉 *Revive con las Bolas del Dragón:*  
🔹 \`${global.prefix}bolasdeldragon\`  

━━━━━━━━━━━━━━━━━━━━━━  
⚡ *Sigue entrenando para convertirte en una leyenda.*  
`;

    // 📩 Enviar mensaje con imagen de perfil
    await conn.sendMessage(msg.key.remoteJid, { 
      image: { url: profilePictureUrl },
      caption: mensaje
    }, { quoted: msg });

  } catch (error) {
    console.error("❌ Error en el comando .nivel:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Hubo un error al obtener tu nivel. Inténtalo de nuevo.*" 
    }, { quoted: msg });
  }
};

module.exports.command = ['nivel'];
