const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const handler = async (msg, { conn, text }) => {
  try {
    const subbotID = (conn.user.id || "").split(":")[0] + "@s.whatsapp.net";
    const setMenuPath = path.resolve("setmenu.json");

    // Verificar si se respondió a una imagen
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    const imageMsg = quoted?.imageMessage;

    if (!imageMsg || !text) {
      return await conn.sendMessage(msg.key.remoteJid, {
        text: `📌 *Uso correcto del comando:*\n\nResponde a una imagen con el comando:\n*setmenu NombreDelBot*\n\nEjemplo:\n> setmenu Azura Infinity`
      }, { quoted: msg });
    }

    // Descargar imagen y convertir a base64
    const stream = await downloadContentFromMessage(imageMsg, "image");
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const base64 = buffer.toString("base64");

    // Cargar archivo existente o iniciar uno nuevo
    let data = fs.existsSync(setMenuPath)
      ? JSON.parse(fs.readFileSync(setMenuPath, "utf8"))
      : {};

    data[subbotID] = {
      nombre: text,
      imagen: base64
    };

    fs.writeFileSync(setMenuPath, JSON.stringify(data, null, 2));

    await conn.sendMessage(msg.key.remoteJid, {
      text: `✅ Menú personalizado guardado exitosamente como:\n*${text}*\n\n📸 Imagen personalizada aplicada.`,
      quoted: msg
    });

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });
  } catch (e) {
    console.error("❌ Error en setmenu:", e);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ Ocurrió un error al guardar el menú personalizado.",
      quoted: msg
    });
  }
};

handler.command = ["setmenu"];
module.exports = handler;
