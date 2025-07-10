const fs = require('fs');

module.exports = async (msg, { conn }) => {
  try {
    // 🔄 Enviar reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, {  
      react: { text: "🐾", key: msg.key } // Emoji de mascotas 🐾  
    });

    // 📂 Archivo JSON donde se guardan los datos del RPG  
    const rpgFile = "./rpg.json";

    // 📂 Verificar si el archivo existe  
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, {  
        text: `❌ *No tienes una cuenta en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`  
      }, { quoted: msg });
      return;
    }

    // 📥 Cargar los datos del RPG  
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // ❌ Verificar si el usuario está registrado  
    let userId = msg.key.participant || msg.key.remoteJid;
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, {  
        text: `❌ *No tienes una cuenta en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`  
      }, { quoted: msg });
      return;
    }

    let usuario = rpgData.usuarios[userId];

    // ❌ Verificar si el usuario tiene mascotas  
    if (!usuario.mascotas || usuario.mascotas.length === 0) {
      await conn.sendMessage(msg.key.remoteJid, {  
        text: `❌ *No tienes ninguna mascota comprada.*\n🔹 Usa \`${global.prefix}tiendamascotas\` para ver las mascotas disponibles en la tienda.`  
      }, { quoted: msg });
      return;
    }

    // 📜 Mensaje principal con explicación  
    let mensaje = `🐾 *Tus Mascotas - Azura Ultra* 🐾\n\n`;
    mensaje += `📜 *Aquí puedes ver todas las mascotas que has comprado y sus estadísticas.*\n\n`;
    mensaje += `🔹 Usa \`${global.prefix}mascota <número>\` para cambiar tu mascota principal.\n`;
    mensaje += `🔹 Usa \`${global.prefix}curar\` para restaurar la vida de tu mascota.\n`;
    mensaje += `🔹 Usa \`${global.prefix}nivelmascota\` para ver las estadísticas de tu mascota actual.\n\n`;

    // 🔥 Nuevas funciones  
    mensaje += `⚔️ *Batallas y Rankings:*\n`;
    mensaje += `🔹 Usa \`${global.prefix}batallamascota\` para luchar contra otra mascota.\n`;
    mensaje += `🔹 Usa \`${global.prefix}topmascotas\` para ver en qué puesto está tu mascota en el ranking.\n\n`;

    // 📜 Mostrar lista de mascotas del usuario  
    usuario.mascotas.forEach((mascota, index) => {  
      let habilidadesMascota = Object.entries(mascota.habilidades)  
        .map(([habilidad, data]) => `      🔹 ${habilidad} (Nivel ${data.nivel || 1})`)  
        .join("\n");

      mensaje += `═════════════════════\n`;  
      mensaje += `🔹 *${index + 1}. ${mascota.nombre}*\n`;  
      mensaje += `   📊 *Rango:* ${mascota.rango || "Sin Rango"}\n`;  
      mensaje += `   🎚️ *Nivel:* ${mascota.nivel || 1}\n`;  
      mensaje += `   ❤️ *Vida:* ${mascota.vida || 100} HP\n`;  
      mensaje += `   ✨ *Experiencia:* ${mascota.experiencia || 0} / ${mascota.xpMax || 500} XP\n`;  
      mensaje += `   🌟 *Habilidades:*\n${habilidadesMascota}\n`;  
      mensaje += `═════════════════════\n\n`;  
    });

    // 📜 Explicación Final  
    mensaje += `📜 **Estos son los comandos para subir de nivel a tu mascota:**\n`;  
    mensaje += `   🛠️ *${global.prefix}daragua*, *${global.prefix}darcomida*, *${global.prefix}darcariño*, *${global.prefix}pasear*, *${global.prefix}cazar*, *${global.prefix}entrenar*, *${global.prefix}presumir*, *${global.prefix}supermascota*\n\n`;  
    mensaje += `🚀 **¡Sigue entrenando a tus mascotas en el Gremio Azura Ultra!** 🏆`;

    // 🎥 Enviar mensaje con el video como GIF  
    await conn.sendMessage(msg.key.remoteJid, {  
      video: { url: "https://cdn.dorratz.com/files/1740655817564.mp4" },  
      gifPlayback: true,  
      caption: mensaje  
    }, { quoted: msg });

    // ✅ Confirmación con reacción de éxito  
    await conn.sendMessage(msg.key.remoteJid, {  
      react: { text: "✅", key: msg.key }  
    });

  } catch (error) {  
    console.error("❌ Error en el comando .vermascotas:", error);  
    await conn.sendMessage(msg.key.remoteJid, {  
      text: "❌ *Ocurrió un error al obtener tu lista de mascotas. Inténtalo de nuevo.*"  
    }, { quoted: msg });

    // ❌ Enviar reacción de error  
    await conn.sendMessage(msg.key.remoteJid, {  
      react: { text: "❌", key: msg.key }  
    });
  }
};

module.exports.command = ['vermascotas'];
