const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 📊 Enviar reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "📊", key: msg.key } // Emoji de estadísticas 📊
    });

    // 📂 Archivo JSON donde se guardan los datos del RPG
    const rpgFile = "./rpg.json";

    // 📂 Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una mascota registrada.*\n\n🔹 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte y obtener una mascota inicial.` 
      }, { quoted: msg });
    }

    // 📥 Cargar los datos del RPG
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // ❌ Verificar si el usuario está registrado
    let userId = msg.key.participant || msg.key.remoteJid;
    if (!rpgData.usuarios[userId]) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una cuenta en el gremio Azura Ultra.*\n\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.` 
      }, { quoted: msg });
    }

    let usuario = rpgData.usuarios[userId];

    // ❌ Verificar si el usuario tiene mascotas
    if (!usuario.mascotas || usuario.mascotas.length === 0) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una mascota actualmente.*\n\n🔹 Usa \`${global.prefix}tiendamascotas\` para comprar una.` 
      }, { quoted: msg });
    }

    // 🐾 Obtener la mascota actual (la primera en la lista)
    let mascota = usuario.mascotas[0];

    // Definir defaults para evitar valores undefined
    let experiencia = typeof mascota.experiencia === "number" ? mascota.experiencia : 0;
    let nivel = typeof mascota.nivel === "number" ? mascota.nivel : 1;
    let xpMax = typeof mascota.xpMax === "number" ? mascota.xpMax : 500;
    let xpFaltante = Math.max(0, xpMax - experiencia);

    // 📜 Construcción del mensaje de estadísticas
    let mensaje = `📊 *Estadísticas de tu Mascota Principal* 📊\n\n`;
    mensaje += `🐾 *Nombre:* ${mascota.nombre}\n`;
    mensaje += `🎚️ *Nivel:* ${nivel} 🆙\n`;
    mensaje += `❤️ *Vida:* ${mascota.vida || 100} HP\n`;
    mensaje += `✨ *Experiencia:* ${experiencia} / ${xpMax} XP\n`;
    mensaje += `📊 *Rango:* ${mascota.rango || "Principiante"}\n`;
    mensaje += `📌 *XP faltante para el siguiente nivel:* ${xpFaltante} XP\n\n`;

    mensaje += `🌟 *Habilidades:*\n`;
    Object.entries(mascota.habilidades).forEach(([habilidad, datos]) => {
      let nivelSkill = (datos && datos.nivel) ? datos.nivel : 1;
      mensaje += `   🔹 ${habilidad} (Nivel ${nivelSkill})\n`;
    });

    // 📢 Mensaje motivacional para seguir entrenando
    mensaje += `\n🚀 *Sigue subiendo de nivel a tu mascota con estos comandos:* 🔽\n`;
    mensaje += `   🥤 \`${global.prefix}daragua\` | 🍖 \`${global.prefix}darcomida\` | ❤️ \`${global.prefix}darcariño\`\n`;
    mensaje += `   🚶 \`${global.prefix}pasear\` | 🎯 \`${global.prefix}cazar\` | 🏋️ \`${global.prefix}entrenar\`\n`;
    mensaje += `   🌟 \`${global.prefix}presumir\` | 🦸 \`${global.prefix}supermascota\`\n\n`;
    mensaje += `🔥 ¡Entrena a tu mascota y conviértela en la más fuerte del gremio! 💪🐾\n`;

    // 📩 Enviar mensaje con la imagen de la mascota
    await conn.sendMessage(msg.key.remoteJid, { 
      image: { url: mascota.imagen }, 
      caption: mensaje
    }, { quoted: msg });

    // ✅ Confirmación con reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "✅", key: msg.key } // Emoji de confirmación ✅
    });

  } catch (error) {
    console.error("❌ Error en el comando .nivelmascota:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: `❌ *Ocurrió un error al obtener la información de tu mascota. Inténtalo de nuevo.*` 
    }, { quoted: msg });
    // ❌ Enviar reacción de error
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "❌", key: msg.key } // Emoji de error ❌
    });
  }
};

module.exports.command = ['nivelmascota'];
