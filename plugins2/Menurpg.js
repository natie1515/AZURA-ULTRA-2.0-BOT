const fs = require('fs');

module.exports = async (msg, { conn, usedPrefix }) => {
  try {
    // 🎮 React to show the menu is loading
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🎮", key: msg.key }
    });

    const menu = `
═════════ 🔱 𝔄𝔃𝔲𝔯𝔞 𝕌𝔩𝔱𝔯𝔞 🔱 ═════════

📍 𝗣𝗥𝗘𝗙𝗜𝗝𝗢: *${usedPrefix}*
📍 𝗥𝗘𝗚𝗜𝗦𝗧𝗥𝗢: ${usedPrefix}rpg <nombre> <edad>

────────── 🧑‍💻 𝗨𝗦𝗨𝗔𝗥𝗜𝗢𝗦 ──────────
• ${usedPrefix}nivel       • ${usedPrefix}picar
• ${usedPrefix}minar       • ${usedPrefix}minar2
• ${usedPrefix}work        • ${usedPrefix}crime
• ${usedPrefix}robar       • ${usedPrefix}cofre
• ${usedPrefix}claim       • ${usedPrefix}batallauser
• ${usedPrefix}hospital    • ${usedPrefix}hosp

───────── ⚔️ 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗝𝗘𝗦 ─────────
• ${usedPrefix}luchar      • ${usedPrefix}poder
• ${usedPrefix}volar       • ${usedPrefix}otromundo
• ${usedPrefix}otrouniverso• ${usedPrefix}mododios
• ${usedPrefix}mododiablo  • ${usedPrefix}podermaximo
• ${usedPrefix}enemigos    • ${usedPrefix}nivelper
• ${usedPrefix}per         • ${usedPrefix}bolasdeldragon
• ${usedPrefix}vender      • ${usedPrefix}quitarventa
• ${usedPrefix}batallaanime• ${usedPrefix}comprar
• ${usedPrefix}tiendaper   • ${usedPrefix}alaventa
• ${usedPrefix}verper

───────── 🐾 𝗠𝗔𝗦𝗖𝗢𝗧𝗔𝗦 ─────────
• ${usedPrefix}daragua     • ${usedPrefix}darcariño
• ${usedPrefix}darcomida   • ${usedPrefix}presumir
• ${usedPrefix}cazar       • ${usedPrefix}entrenar
• ${usedPrefix}pasear      • ${usedPrefix}supermascota
• ${usedPrefix}mascota     • ${usedPrefix}curar
• ${usedPrefix}nivelmascota• ${usedPrefix}batallamascota
• ${usedPrefix}compra      • ${usedPrefix}tiendamascotas
• ${usedPrefix}vermascotas

───────── ✨ 𝗢𝗧𝗥𝗢𝗦 ✨ ─────────
• ${usedPrefix}addmascota    • ${usedPrefix}addper
• ${usedPrefix}deleteuser    • ${usedPrefix}deleteper
• ${usedPrefix}deletemascota • ${usedPrefix}totalper
• ${usedPrefix}tran          • ${usedPrefix}transferir
• ${usedPrefix}dame          • ${usedPrefix}dep
• ${usedPrefix}bal           • ${usedPrefix}saldo
• ${usedPrefix}retirar       • ${usedPrefix}depositar
• ${usedPrefix}delrpg        • ${usedPrefix}rpgazura

───────── 🏆 𝗧𝗢𝗣𝗦 ─────────
• ${usedPrefix}topuser       • ${usedPrefix}topmascotas
• ${usedPrefix}topper

═════════ © russell xz ═════════
`;

    await conn.sendMessage(msg.key.remoteJid, {
      image: { url: 'https://cdn.russellxz.click/0abb8549.jpeg' },
      caption: menu
    }, { quoted: msg });

  } catch (error) {
    console.error('❌ Error en .menurpg:', error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: '❌ *Ocurrió un error al mostrar el menú RPG.*'
    }, { quoted: msg });
  }
};

module.exports.command = ['menurpg'];
