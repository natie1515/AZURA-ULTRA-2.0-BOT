const fs = require("fs");

module.exports = async (msg, { conn }) => {
    try {
        const rpgFile = "./rpg.json";
        const userId = msg.key.participant || msg.key.remoteJid;
        const cooldownTime = 6 * 60 * 1000; // 6 minutos

        // ⚡ Reacción antes de procesar
        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: "⚡", key: msg.key }
        });

        // 📂 Verificar si el archivo existe
        if (!fs.existsSync(rpgFile)) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: "❌ *Los datos del RPG no están disponibles.*"
            }, { quoted: msg });
        }

        // 📥 Cargar datos del usuario
        let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

        // ❌ Verificar si el usuario está registrado
        if (!rpgData.usuarios[userId]) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: `❌ *No tienes una cuenta registrada en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
            }, { quoted: msg });
        }

        let usuario = rpgData.usuarios[userId];

        // ❌ Verificar si el usuario tiene personajes
        if (!usuario.personajes || usuario.personajes.length === 0) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: `❌ *No tienes personajes para entrenar su poder.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
            }, { quoted: msg });
        }

        let personaje = usuario.personajes[0]; // Primer personaje como principal

        // 🚑 Verificar si el personaje tiene 0 de vida
        if (personaje.vida <= 0) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: `🚑 *¡${personaje.nombre} no puede entrenar su poder, está sin vida!*\n📜 Usa \`${global.prefix}bolasdeldragon\` para curarlo.`
            }, { quoted: msg });
        }

        // 🕒 Verificar cooldown
        let now = Date.now();
        if (personaje.cooldowns?.poder && now - personaje.cooldowns.poder < cooldownTime) {
            let mins = ((personaje.cooldowns.poder + cooldownTime - now) / (60 * 1000)).toFixed(1);
            return conn.sendMessage(msg.key.remoteJid, {
                text: `⏳ *Debes esperar ${mins} minutos antes de volver a entrenar el poder de tu personaje.*`
            }, { quoted: msg });
        }

        // 🎖️ Generar recompensas aleatorias
        let diamonds = Math.floor(Math.random() * 800) + 1; // 1 a 800
        let xp = Math.floor(Math.random() * (2500 - 300 + 1)) + 300; // 300 a 2500

        // 💰 Incrementar experiencia y diamantes
        usuario.diamantes += diamonds;
        personaje.experiencia += xp;

        // ❤️ Reducir vida entre 5 y 25 puntos
        let lost = Math.floor(Math.random() * (25 - 5 + 1)) + 5;
        personaje.vida = Math.max(0, personaje.vida - lost);

        // 🕒 Guardar cooldown
        personaje.cooldowns = personaje.cooldowns || {};
        personaje.cooldowns.poder = now;

        // ⚡ Mensajes de recompensa
        const texts = [
            `⚡ *${personaje.nombre} entrenó su poder y se siente más fuerte.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `🔥 *${personaje.nombre} aumentó su ki y ahora su aura brilla intensamente.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `💥 *${personaje.nombre} liberó una explosión de energía impresionante.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `🌀 *${personaje.nombre} logró concentrar su poder y alcanzó un nuevo nivel de energía.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `🔮 *${personaje.nombre} entrenó con un maestro legendario y su poder se elevó.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `⚔️ *${personaje.nombre} dominó una nueva técnica de combate.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`
        ];

        await conn.sendMessage(msg.key.remoteJid, {
            text: texts[Math.floor(Math.random() * texts.length)]
        }, { quoted: msg });

        // 📊 Manejo de subida de nivel
        let xpMax = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
        const ranks = [
            { lvl: 1, tag: "🌟 Principiante" },
            { lvl: 10, tag: "⚔️ Guerrero" },
            { lvl: 20, tag: "🔥 Maestro de Batalla" },
            { lvl: 30, tag: "👑 Líder Supremo" },
            { lvl: 40, tag: "🌀 Legendario" },
            { lvl: 50, tag: "💀 Dios de la Guerra" },
            { lvl: 60, tag: "🚀 Titán de la Arena" },
            { lvl: 70, tag: "🔱 Inmortal" }
        ];

        while (personaje.experiencia >= xpMax && personaje.nivel < 70) {
            personaje.experiencia -= xpMax;
            personaje.nivel++;
            xpMax = personaje.nivel * 1500;
            personaje.xpMax = xpMax;
            personaje.rango = ranks.reduce(
                (a, c) => (personaje.nivel >= c.lvl ? c.tag : a),
                personaje.rango
            );

            await conn.sendMessage(msg.key.remoteJid, {
                text: `🎉 *¡${personaje.nombre} ha subido al nivel ${personaje.nivel}! 🏆*\n🏅 *Nuevo Rango:* ${personaje.rango}`
            }, { quoted: msg });
        }

        // 🌟 Mejora de habilidad con 30% de probabilidad
        let skills = Object.keys(personaje.habilidades);
        if (skills.length && Math.random() < 0.3) {
            let skill = skills[Math.floor(Math.random() * skills.length)];
            personaje.habilidades[skill] += 1;
            await conn.sendMessage(msg.key.remoteJid, {
                text: `🌟 *¡${personaje.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${skill}: Nivel ${personaje.habilidades[skill]}*`
            }, { quoted: msg });
        }

        // 📂 Guardar cambios
        fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

        // ✅ Confirmación
        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: "✅", key: msg.key }
        });

    } catch (e) {
        console.error("❌ Error en el comando .poder:", e);
        await conn.sendMessage(msg.key.remoteJid, {
            text: "❌ *Ocurrió un error al entrenar el poder. Inténtalo de nuevo.*"
        }, { quoted: msg });
    }
};

module.exports.command = ["poder"];
