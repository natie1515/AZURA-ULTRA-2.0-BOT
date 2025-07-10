const fs = require('fs');

module.exports = async (msg, { conn, text }) => {
  try {
    // 🔄 Enviar reacción mientras se procesa el comando
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "🐾", key: msg.key } // Emoji de pata 🐾
    });

    // Archivo JSON donde se guardan los datos del RPG
    const rpgFile = "./rpg.json";

    // Verificar si el archivo existe
    if (!fs.existsSync(rpgFile)) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una cuenta en el gremio Azura Ultra.*\n\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }

    // Cargar los datos del RPG
    let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

    // Verificar si el usuario está registrado
    let userId = msg.key.participant || msg.key.remoteJid;
    if (!rpgData.usuarios[userId]) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes una cuenta en el gremio Azura Ultra.*\n\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
      }, { quoted: msg });
      return;
    }

    // Verificar si hay mascotas en la tienda
    if (!rpgData.tiendaMascotas || rpgData.tiendaMascotas.length === 0) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *Actualmente no hay mascotas en la tienda.*\n🔹 Usa \`${global.prefix}addmascota\` para agregar nuevas mascotas.`
      }, { quoted: msg });
      return;
    }

    // Verificar si el usuario ingresó un nombre o número
    const inputRaw = (text || "").trim();
    if (!inputRaw) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `⚠️ *Uso incorrecto.*\nEjemplo: \`${global.prefix}compra <nombre_mascota>\` o \`${global.prefix}compra <número_mascota>\``
      }, { quoted: msg });
      return;
    }

    // Convertir a minúsculas y limpiar de emojis/caracteres especiales
    let input = inputRaw.toLowerCase().replace(/[^a-z0-9]/gi, '');

    let mascotaSeleccionada = null;
    // Buscar por índice (número) o por nombre
    if (!isNaN(input) && rpgData.tiendaMascotas[parseInt(input) - 1]) {
      mascotaSeleccionada = rpgData.tiendaMascotas[parseInt(input) - 1];
    } else {
      mascotaSeleccionada = rpgData.tiendaMascotas.find(m => 
        m.nombre.toLowerCase().replace(/[^a-z0-9]/gi, '') === input
      );
    }

    // Verificar si la mascota existe
    if (!mascotaSeleccionada) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No se encontró la mascota en la tienda.*\n🔹 Usa \`${global.prefix}tiendamascotas\` para ver las mascotas disponibles.`
      }, { quoted: msg });
      return;
    }

    let usuario = rpgData.usuarios[userId];

    // Verificar si el usuario ya tiene la mascota
    if (usuario.mascotas && usuario.mascotas.some(m => m.nombre === mascotaSeleccionada.nombre)) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `⚠️ *Ya posees esta mascota.*\n🔹 Usa \`${global.prefix}vermascotas\` para ver tus mascotas compradas.`
      }, { quoted: msg });
      return;
    }

    // Verificar si el usuario tiene suficientes diamantes
    if (usuario.diamantes < mascotaSeleccionada.precio) {
      await conn.sendMessage(msg.key.remoteJid, { 
        text: `❌ *No tienes suficientes diamantes para comprar esta mascota.*\n💎 *Precio:* ${mascotaSeleccionada.precio} diamantes\n💰 *Tu saldo:* ${usuario.diamantes} diamantes`
      }, { quoted: msg });
      return;
    }

    // Descontar diamantes
    usuario.diamantes -= mascotaSeleccionada.precio;

    // Crear la mascota en la cartera del usuario
    let nuevaMascota = {
      nombre: mascotaSeleccionada.nombre,
      rango: mascotaSeleccionada.rango,
      nivel: 1,
      experiencia: 0,
      xpMax: mascotaSeleccionada.xpMax,
      vida: mascotaSeleccionada.vida,
      habilidades: {
        [Object.keys(mascotaSeleccionada.habilidades)[0]]: { nivel: 1 },
        [Object.keys(mascotaSeleccionada.habilidades)[1]]: { nivel: 1 }
      },
      imagen: mascotaSeleccionada.imagen
    };

    // Agregar la mascota al usuario
    if (!usuario.mascotas) usuario.mascotas = [];
    usuario.mascotas.push(nuevaMascota);

    // Guardar los cambios en el archivo JSON
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

    // Construir mensaje de confirmación
    let mensaje = `🎉 *¡Has comprado una nueva mascota!* 🎉\n\n`;
    mensaje += `🐾 *Nombre:* ${nuevaMascota.nombre}\n`;
    mensaje += `📊 *Rango:* ${nuevaMascota.rango}\n`;
    mensaje += `🎚️ *Nivel:* ${nuevaMascota.nivel}\n`;
    mensaje += `❤️ *Vida:* ${nuevaMascota.vida} HP\n`;
    mensaje += `✨ *Experiencia:* ${nuevaMascota.experiencia} / ${nuevaMascota.xpMax} XP\n`;
    mensaje += `🌟 *Habilidades:*\n`;
    Object.entries(nuevaMascota.habilidades).forEach(([habilidad, datos]) => {
      mensaje += `      🔹 ${habilidad} (Nivel ${datos.nivel})\n`;
    });
    mensaje += `💎 *Costo:* ${mascotaSeleccionada.precio} diamantes\n\n`;
    mensaje += `📜 Usa \`${global.prefix}vermascotas\` para ver todas tus mascotas compradas.\n`;

    // Enviar mensaje con la imagen de la mascota
    await conn.sendMessage(msg.key.remoteJid, {
      image: { url: nuevaMascota.imagen },
      caption: mensaje
    }, { quoted: msg });

    // ✅ Confirmación con reacción de éxito
    await conn.sendMessage(msg.key.remoteJid, { 
      react: { text: "✅", key: msg.key }
    });

  } catch (error) {
    console.error("❌ Error en el comando .compra:", error);
    await conn.sendMessage(msg.key.remoteJid, { 
      text: "❌ *Ocurrió un error al procesar la compra. Inténtalo de nuevo.*"
    }, { quoted: msg });

    // ❌ Enviar reacción de error
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

module.exports.command = ['compra'];
