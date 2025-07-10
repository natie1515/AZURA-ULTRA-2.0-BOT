const fs = require('fs');

module.exports = async (msg, { conn, usedPrefix }) => {
  try {
    // ⚔️ Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "⚔️", key: msg.key }
    });

    const menuText = `

╭─━━━━━━━━━━━━━━━─╮
│ 🚀 𝗕𝗜𝗘𝗡𝗩𝗘𝗡𝗜𝗗𝗢 𝗔𝗟 𝗥𝗣𝗚 🚀 │
╰─━━━━━━━━━━━━━━━─╯
│
│  🌟 ¡Sumérgete en el mundo de Azura Ultra!  
│  🎭 Crea y mejora tus personajes  
│  🐾 Entrena a tus mascotas  
│  ⚔️ ¡Vive épicas aventuras y sube de nivel!
│
╰─━━━━━━━━━━━━━━━━─╯

🔰 Para empezar:  
✦ ${usedPrefix}rpg <nombre> <edad>  

🛡️===== 𝗨𝗦𝗨𝗔𝗥𝗜𝗢𝗦 =====🛡️
  • ${usedPrefix}nivel      • ${usedPrefix}picar  
  • ${usedPrefix}minar      • ${usedPrefix}minar2  
  • ${usedPrefix}work       • ${usedPrefix}crime  
  • ${usedPrefix}robar      • ${usedPrefix}cofre  
  • ${usedPrefix}claim      • ${usedPrefix}batallauser  
  • ${usedPrefix}hospital   • ${usedPrefix}hosp  

🎭===== 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗝𝗘𝗦 =====🎭
  • ${usedPrefix}per            • ${usedPrefix}nivelper  
  • ${usedPrefix}luchar         • ${usedPrefix}poder  
  • ${usedPrefix}volar          • ${usedPrefix}otromundo  
  • ${usedPrefix}otrouniverso   • ${usedPrefix}mododios  
  • ${usedPrefix}mododiablo     • ${usedPrefix}podermaximo  
  • ${usedPrefix}enemigos       • ${usedPrefix}verper  
  • ${usedPrefix}vender         • ${usedPrefix}quitarventa  

🐾===== 𝗠𝗔𝗦𝗖𝗢𝗧𝗔𝗦 =====🐾
  • ${usedPrefix}daragua        • ${usedPrefix}darcariño  
  • ${usedPrefix}darcomida      • ${usedPrefix}presumir  
  • ${usedPrefix}cazar          • ${usedPrefix}entrenar  
  • ${usedPrefix}pasear         • ${usedPrefix}supermascota  
  • ${usedPrefix}mascota        • ${usedPrefix}curar  
  • ${usedPrefix}nivelmascota   • ${usedPrefix}batallamascota  
  • ${usedPrefix}compra         • ${usedPrefix}tiendamascotas  
  • ${usedPrefix}vermascotas  

✨===== 𝗢𝗧𝗥𝗢𝗦 =====✨
  • ${usedPrefix}addmascota     • ${usedPrefix}addper  
  • ${usedPrefix}deleteuser     • ${usedPrefix}deleteper  
  • ${usedPrefix}deletemascota  • ${usedPrefix}totalper  
  • ${usedPrefix}tran           • ${usedPrefix}transferir  
  • ${usedPrefix}dame           • ${usedPrefix}dep  
  • ${usedPrefix}bal            • ${usedPrefix}saldo  
  • ${usedPrefix}retirar        • ${usedPrefix}depositar  
  • ${usedPrefix}delrpg         • ${usedPrefix}rpgazura  

🏆===== 𝗧𝗢𝗣 =====🏆
  • ${usedPrefix}topuser        • ${usedPrefix}topmascotas  
  • ${usedPrefix}topper       

✨ *Desarrollado por russell xz* ✨
`;

    // envía imagen + caption
    await conn.sendMessage(msg.key.remoteJid, {
      image: { url: "https://cdn.russellxz.click/0abb8549.jpeg" },
      caption: menuText
    }, { quoted: msg });

  } catch (error) {
    console.error("❌ Error en el comando .menurpg:", error);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Ocurrió un error al mostrar el menú RPG.*"
    }, { quoted: msg });
  }
};

module.exports.command = ['menurpg'];
