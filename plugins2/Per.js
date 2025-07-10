const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // 🔄 Reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🎭", key: msg.key }
    });

    const rpgFile = "./rpg.json";

    // 📂 Verificar si el archivo existe
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

    // ❌ Verificar si el usuario está registrado
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

    // ❌ Verificar si el usuario tiene personajes
    if (!usuario.personajes || usuario.personajes.length === 0) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *No tienes personajes comprados.*\n🔹 Usa \`${global.prefix}tiendaper\` para comprar uno.`
        },
        { quoted: msg }
      );
      return;
    }

    // 📥 Tomar input desde 'text'
    const input = (text || "").trim();

    // ❌ Validar input numérico
    if (!input || isNaN(input)) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `⚠️ *Uso incorrecto.*\nEjemplo: \`${global.prefix}per <número>\`\n🔹 Usa \`${global.prefix}verper\` para ver la lista de personajes.`
        },
        { quoted: msg }
      );
      return;
    }

    const idx = parseInt(input);
    if (idx <= 0 || idx > usuario.personajes.length) {
      await conn.sendMessage(
        msg.key.remoteJid,
        {
          text: `⚠️ *Uso incorrecto.*\nEjemplo: \`${global.prefix}per <número>\`\n🔹 Usa \`${global.prefix}verper\` para ver la lista de personajes.`
        },
        { quoted: msg }
      );
      return;
    }

    // 🎭 Cambiar personaje principal
    let nuevo = usuario.personajes.splice(idx - 1, 1)[0];
    usuario.personajes.unshift(nuevo);

    // 💾 Guardar cambios
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // 📜 Mensaje de confirmación
    let mensaje = `🎭 *¡Has cambiado tu personaje principal!* 🎭\n\n`;
    mensaje += `🔹 *Nuevo Personaje Principal:* ${nuevo.nombre}\n`;
    mensaje += `📊 *Rango:* ${nuevo.rango}\n`;
    mensaje += `🎚️ *Nivel:* ${nuevo.nivel}\n`;
    mensaje += `❤️ *Vida:* ${nuevo.vida} HP\n`;
    mensaje += `✨ *Experiencia:* ${nuevo.experiencia} / ${nuevo.xpMax} XP\n`;
    mensaje += `🌟 *Habilidades:*\n`;
    Object.entries(nuevo.habilidades).forEach(([hab, nivel]) => {
      mensaje += `   🔸 ${hab} (Nivel ${nivel})\n`;
    });
    mensaje += `\n📜 Usa \`${global.prefix}nivelper\` para ver sus estadísticas.\n`;

    await conn.sendMessage(
      msg.key.remoteJid,
      {
        image: { url: nuevo.imagen },
        caption: mensaje
      },
      { quoted: msg }
    );

    // ✅ Reacción de confirmación
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .per:", error);
    await conn.sendMessage(
      msg.key.remoteJid,
      {
        text: "❌ *Ocurrió un error al cambiar tu personaje principal. Inténtalo de nuevo.*"
      },
      { quoted: msg }
    );
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['per'];
