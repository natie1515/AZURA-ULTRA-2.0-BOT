const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // 🔄 Enviar reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🐾", key: msg.key } // Emoji de mascota 🐾
    });

    const rpgFile = "./rpg.json";

    // Verificar si el archivo RPG existe
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes una cuenta en el gremio Azura Ultra.*\n\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
        },
        { quoted: msg }
      );
      return;
    }

    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
    let userId = msg.key.participant || msg.key.remoteJid;

    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes una cuenta registrada.*\n\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
        },
        { quoted: msg }
      );
      return;
    }

    let usuario = rpgData.usuarios[userId];

    if (!usuario.mascotas || usuario.mascotas.length === 0) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes mascotas en tu inventario.*\n🔹 Usa \`${global.prefix}tiendamascotas\` para comprar una.`
        },
        { quoted: msg }
      );
      return;
    }

    // Tomamos el valor introducido en "text"
    const numeroMascota = parseInt(text);

    // Validar que sea un número correcto
    if (
      isNaN(numeroMascota) ||
      numeroMascota <= 0 ||
      numeroMascota > usuario.mascotas.length
    ) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `⚠️ *Uso incorrecto.*\nEjemplo: \`${global.prefix}mascota <número>\`\n🔹 Usa \`${global.prefix}vermascotas\` para ver la lista de mascotas.`
        },
        { quoted: msg }
      );
      return;
    }

    // Obtener la mascota seleccionada (la pasamos al primer lugar del array)
    let nuevaMascotaPrincipal = usuario.mascotas.splice(numeroMascota - 1, 1)[0];
    usuario.mascotas.unshift(nuevaMascotaPrincipal);

    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    let mensaje = `🐾 *¡Has cambiado tu mascota principal!* 🐾\n\n`;
    mensaje += `🔹 *Nueva Mascota Principal:* ${nuevaMascotaPrincipal.nombre}\n`;
    mensaje += `📊 *Rango:* ${nuevaMascotaPrincipal.rango}\n`;
    mensaje += `🎚️ *Nivel:* ${nuevaMascotaPrincipal.nivel}\n`;
    mensaje += `❤️ *Vida:* ${nuevaMascotaPrincipal.vida} HP\n`;
    mensaje += `✨ *Experiencia:* ${nuevaMascotaPrincipal.experiencia} / ${nuevaMascotaPrincipal.xpMax} XP\n`;
    mensaje += `🌟 *Habilidades:*\n`;
    Object.entries(nuevaMascotaPrincipal.habilidades).forEach(([habilidad, datos]) => {
      mensaje += `      🔹 ${habilidad} (Nivel ${datos.nivel})\n`;
    });
    mensaje += `\n📜 Usa \`${global.prefix}nivelmascota\` para ver sus estadísticas.\n`;

    // Enviar la imagen y el mensaje
    await conn.sendMessage(
      msg.key.remoteJid,
      {
        image: { url: nuevaMascotaPrincipal.imagen },
        caption: mensaje
      },
      { quoted: msg }
    );

    // ✅ Reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .mascota:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      {
        text: "❌ *Ocurrió un error al cambiar tu mascota principal. Inténtalo de nuevo.*"
      },
      { quoted: msg }
    );

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['mascota'];
