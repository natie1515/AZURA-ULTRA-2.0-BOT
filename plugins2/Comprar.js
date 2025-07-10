const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // Verificar si el usuario ingresó algo
    const input = (text || "").trim();
    if (!input) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `⚠️ *Uso incorrecto.*\nEjemplo:\n📌 \`${global.prefix}comprar Satoru_Gojo\`\n📌 \`${global.prefix}comprar 1\``
      }, { quoted: msg });
      return;
    }

    const rpgFile = "./rpg.json";
    // Carga del archivo si existe, sino crea estructura vacía
    let rpgData = fs.existsSync(rpgFile)
      ? JSON.parse(fs.readFileSync(rpgFile, "utf-8"))
      : { usuarios: {}, tiendaPersonajes: [], mercadoPersonajes: [] };

    let userId = msg.key.participant || msg.key.remoteJid;

    // Verificar si el usuario está registrado
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No estás registrado en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }

    let usuario = rpgData.usuarios[userId];
    let personajeSeleccionado = null;

    // Primero, vemos si 'input' es un número
    if (!isNaN(input)) {
      let index = parseInt(input) - 1;
      if (index >= 0 && index < rpgData.tiendaPersonajes.length) {
        personajeSeleccionado = rpgData.tiendaPersonajes[index];
      }
    } else {
      let nombreBuscado = input
        .replace(/\s+/g, "_")
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_]/g, "");
      personajeSeleccionado = rpgData.tiendaPersonajes.find(p =>
        p.nombre
         .toLowerCase()
         .replace(/[^a-zA-Z0-9_]/g, "") === nombreBuscado
      );
    }

    // Si el personaje no existe, mostramos mensaje
    if (!personajeSeleccionado) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No se encontró ese personaje en la tienda.*\n📜 Usa \`${global.prefix}tiendaper\` para ver los personajes disponibles.`
      }, { quoted: msg });
      return;
    }

    // Verificar si el usuario tiene suficientes diamantes
    if (usuario.diamantes < personajeSeleccionado.precio) {
      await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *No tienes suficientes diamantes.*\n💎 *Precio:* ${personajeSeleccionado.precio} diamantes\n💰 *Tu saldo:* ${usuario.diamantes} diamantes.`
      }, { quoted: msg });
      return;
    }

    // Restar diamantes al usuario
    usuario.diamantes -= personajeSeleccionado.precio;

    // Agregar el personaje a la cartera del usuario
    if (!usuario.personajes) usuario.personajes = [];
    usuario.personajes.push({
      nombre: personajeSeleccionado.nombre,
      rango: personajeSeleccionado.rango,
      nivel: personajeSeleccionado.nivel,
      experiencia: personajeSeleccionado.experiencia,
      xpMax: personajeSeleccionado.xpMax,
      vida: personajeSeleccionado.vida,
      habilidades: personajeSeleccionado.habilidades,
      precio: personajeSeleccionado.precio,
      imagen: personajeSeleccionado.imagen
    });

    // Eliminar el personaje de la tienda
    rpgData.tiendaPersonajes = rpgData.tiendaPersonajes.filter(
      p => p.nombre !== personajeSeleccionado.nombre
    );

    // Guardar cambios en el archivo
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // Mensaje de confirmación de compra con imagen
    let mensajeCompra = `🎭 *¡Has comprado un nuevo personaje!* 🎭\n\n`;
    mensajeCompra += `🔹 *Nombre:* ${personajeSeleccionado.nombre}\n`;
    mensajeCompra += `   🎚️ *Nivel:* ${personajeSeleccionado.nivel}\n`;
    mensajeCompra += `   ❤️ *Vida:* ${personajeSeleccionado.vida} HP\n`;
    mensajeCompra += `   ✨ *Experiencia:* ${personajeSeleccionado.experiencia} / ${personajeSeleccionado.xpMax} XP\n`;
    mensajeCompra += `   🌟 *Habilidades:*\n`;
    Object.entries(personajeSeleccionado.habilidades).forEach(([habilidad, nivel]) => {
      mensajeCompra += `      🔹 ${habilidad} (Nivel ${nivel})\n`;
    });
    mensajeCompra += `\n💎 *Costo:* ${personajeSeleccionado.precio} diamantes\n`;
    mensajeCompra += `📜 Usa \`${global.prefix}nivelper\` para ver sus estadísticas.\n`;
    mensajeCompra += `📜 Usa \`${global.prefix}verper\` para ver todos tus personajes comprados.`;

    await conn.sendMessage(msg.key.remoteJid, {
      image: { url: personajeSeleccionado.imagen },
      caption: mensajeCompra
    }, { quoted: msg });

    // ✅ Enviar reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .comprar:", error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Ocurrió un error al procesar la compra. Inténtalo de nuevo.*"
    }, { quoted: msg });
    // ❌ Enviar reacción de error
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['comprar'];
