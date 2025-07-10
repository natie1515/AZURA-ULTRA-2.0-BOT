const fs = require('fs');

module.exports = async (msg, { conn, args }) => {
  try {
    // 🔄 Enviar reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "💰", key: msg.key } // Emoji de venta 💰
    });

    // Verificar que el usuario ingresó los parámetros correctos
    if (args.length < 2) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `⚠️ *Uso incorrecto.*\nEjemplo: \`${global.prefix}vender <nombre_personaje> <precio>\`` 
      }, { quoted: msg });
      return;
    }

    let nombrePersonaje = args.slice(0, -1).join("_")
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_]/g, ""); // Limpiar emojis y caracteres especiales
    let precioVenta = parseInt(args[args.length - 1]);
    let userId = msg.key.participant || msg.key.remoteJid;

    if (isNaN(precioVenta) || precioVenta <= 0) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: "❌ *El precio debe ser un número válido mayor a 0.*" 
      }, { quoted: msg });
      return;
    }

    const rpgFile = "./rpg.json";
    let rpgData = fs.existsSync(rpgFile)
      ? JSON.parse(fs.readFileSync(rpgFile, "utf-8"))
      : { usuarios: {}, mercadoPersonajes: [] };

    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una cuenta registrada.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.` 
      }, { quoted: msg });
      return;
    }

    let usuario = rpgData.usuarios[userId];
    let indexPersonaje = usuario.personajes.findIndex(p =>
      p.nombre.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "") === nombrePersonaje
    );

    if (indexPersonaje === -1) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes ese personaje en tu cartera.*\n📜 Usa \`${global.prefix}verper\` para ver tu lista de personajes.` 
      }, { quoted: msg });
      return;
    }

    let personajeVendido = usuario.personajes.splice(indexPersonaje, 1)[0];
    personajeVendido.precioOriginal = personajeVendido.precio; // Guardar precio original
    personajeVendido.precio = precioVenta; // Precio de venta
    personajeVendido.vendedor = userId; // Guardar el ID del vendedor

    rpgData.mercadoPersonajes.push(personajeVendido);
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // Construcción del mensaje de venta
    let habilidadesPersonaje = Object.entries(personajeVendido.habilidades)
      .map(([habilidad, nivel]) => `   🔹 ${habilidad} (Nivel ${nivel})`)
      .join("\n");

    let mensajeVenta = `💰 *¡Has puesto a la venta un personaje!* 💰\n\n`;
    mensajeVenta += `🎭 *Personaje:* ${personajeVendido.nombre}\n`;
    mensajeVenta += `🏅 *Rango:* ${personajeVendido.rango}\n`;
    mensajeVenta += `🎚️ *Nivel:* ${personajeVendido.nivel}\n`;
    mensajeVenta += `❤️ *Vida:* ${personajeVendido.vida} HP\n`;
    mensajeVenta += `✨ *Experiencia:* ${personajeVendido.experiencia} / ${personajeVendido.xpMax} XP\n`;
    mensajeVenta += `🌟 *Habilidades:*\n${habilidadesPersonaje}\n`;
    mensajeVenta += `💎 *Precio de Venta:* ${precioVenta} diamantes\n\n`;
    mensajeVenta += `📜 Usa \`${global.prefix}quitarventa <nombre_personaje>\` si deseas retirarlo del mercado.\n`;

    await conn.sendMessage(msg.key.remoteJid, { 
      image: { url: personajeVendido.imagen }, 
      caption: mensajeVenta
    }, { quoted: msg });

    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "✅", key: msg.key } 
    });

  } catch (error) {
    console.error("❌ Error en el comando .vender:", error);
  }
};

module.exports.command = ['vender'];
