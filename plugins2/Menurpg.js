const fs = require('fs');

module.exports = async (msg, { conn, prefix }) => {
  try {
    // ⚔️ Reacción inicial
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "⚔️", key: msg.key }
    });

    const menuText = `╔═════════════════╗  
║  𝘼𝙕𝙐𝙍𝘼 𝙐𝙇𝙏𝙍𝘼 MENU RPG       
╚═════════════════╝  

✦ 𝐁𝐈𝐄𝐍𝐕𝐄𝐍𝐈𝐃𝐎 𝐀𝐋 𝐌𝐄𝐍𝐔 𝐑𝐏𝐆 ✦  
━━━━━━━━━━━━━━━━━━  
➤ 𝗣𝗥𝗘𝗙𝗜𝗝𝗢 𝗔𝗖𝗧𝗨𝗔𝗟: ${prefix}  
➤ 𝗣𝗔𝗥𝗔 𝗘𝗠𝗣𝗘𝗭𝗔𝗥, 𝗨𝗦𝗔:  
${prefix}rpg <nombre> <edad>  
Así te registras  
━━━━━━━━━━━━━━━━━━  

📌 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 𝗗𝗘 𝗨𝗦𝗨𝗔𝗥𝗜𝗢𝗦  
➤ ${prefix}nivel ➤ ${prefix}picar  
➤ ${prefix}minar ➤ ${prefix}minar2  
➤ ${prefix}work ➤ ${prefix}crime  
➤ ${prefix}robar ➤ ${prefix}cofre  
➤ ${prefix}claim ➤ ${prefix}batallauser  
➤ ${prefix}hospital ➤ ${prefix}hosp  

📌 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 𝗗𝗘 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗝𝗘𝗦  
➤ ${prefix}luchar ➤ ${prefix}poder  
➤ ${prefix}volar ➤ ${prefix}otromundo  
➤ ${prefix}otrouniverso ➤ ${prefix}mododios  
➤ ${prefix}mododiablo ➤ ${prefix}podermaximo  
➤ ${prefix}enemigos ➤ ${prefix}nivelper  
➤ ${prefix}per ➤ ${prefix}bolasdeldragon  
➤ ${prefix}vender ➤ ${prefix}quitarventa  
➤ ${prefix}batallaanime ➤ ${prefix}comprar  
➤ ${prefix}tiendaper ➤ ${prefix}alaventa  
➤ ${prefix}verper

📌 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 𝗗𝗘 𝗠𝗔𝗦𝗖𝗢𝗧𝗔𝗦  
➤ ${prefix}daragua ➤ ${prefix}darcariño  
➤ ${prefix}darcomida ➤ ${prefix}presumir  
➤ ${prefix}cazar ➤ ${prefix}entrenar  
➤ ${prefix}pasear ➤ ${prefix}supermascota  
➤ ${prefix}mascota ➤ ${prefix}curar  
➤ ${prefix}nivelmascota ➤ ${prefix}batallamascota  
➤ ${prefix}compra ➤ ${prefix}tiendamascotas  
➤ ${prefix}vermascotas

📌 𝗢𝗧𝗥𝗢𝗦 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦  
➤ ${prefix}addmascota ➤ ${prefix}addper  
➤ ${prefix}deleteuser ➤ ${prefix}deleteper  
➤ ${prefix}deletemascota ➤ ${prefix}totalper  
➤ ${prefix}tran ➤ ${prefix}transferir  
➤ ${prefix}dame ➤ ${prefix}dep  
➤ ${prefix}bal ➤ ${prefix}saldo  
➤ ${prefix}retirar ➤ ${prefix}depositar  
➤ ${prefix}delrpg ➤ ${prefix}rpgazura  

📌 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 𝗗𝗘 𝗧𝗢𝗣  
➤ ${prefix}topuser ➤ ${prefix}topmascotas  
➤ ${prefix}topper  

━━━━━━━━━━━━━━━━━━  
𝗗𝗘𝗦𝗔𝗥𝗥𝗢𝗟𝗟𝗔𝗗𝗢 𝗣𝗢𝗥: russell xz  

╭────────────╮  
│ 𝘼𝙕𝙐𝙍𝘼 𝙐𝙇𝙏𝙍𝘼          
╰────────────╯`;

    // Enviar imagen con caption del menú
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
