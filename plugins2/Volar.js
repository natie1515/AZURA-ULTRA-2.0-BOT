const fs = require("fs");

module.exports = async (msg, { conn }) => {
    try {
        const rpgFile = "./rpg.json";
        const userId = msg.key.participant || msg.key.remoteJid;
        const cooldownTime = 6 * 60 * 1000; // 6 minutos

        // 🛸 Reacción antes de procesar
        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: "🛸", key: msg.key }
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
                text: `❌ *No tienes personajes para entrenar su vuelo.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
            }, { quoted: msg });
        }

        let personaje = usuario.personajes[0]; // Primer personaje como principal

        // 🚑 Verificar si el personaje tiene 0 de vida
        if (personaje.vida <= 0) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: `🚑 *¡${personaje.nombre} no puede entrenar vuelo, está sin vida!*\n📜 Usa \`${global.prefix}bolasdeldragon\` para curarlo.`
            }, { quoted: msg });
        }

        // 🕒 Verificar cooldown
        let now = Date.now();
        if (personaje.cooldowns?.volar && now - personaje.cooldowns.volar < cooldownTime) {
            let mins = ((personaje.cooldowns.volar + cooldownTime - now) / (60 * 1000)).toFixed(1);
            return conn.sendMessage(msg.key.remoteJid, {
                text: `⏳ *Debes esperar ${mins} minutos antes de volver a entrenar el vuelo de tu personaje.*`
            }, { quoted: msg });
        }

        // 🎖️ Generar recompensas aleatorias
        let diamonds = Math.floor(Math.random() * 500) + 1;
        let xp = Math.floor(Math.random() * (3000 - 300 + 1)) + 300;

        // 💰 Incrementar experiencia y diamantes
        usuario.diamantes += diamonds;
        personaje.experiencia += xp;

        // ❤️ Reducir vida entre 5 y 20 puntos
        let lost = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
        personaje.vida = Math.max(0, personaje.vida - lost);

        // 🕒 Guardar cooldown
        personaje.cooldowns = personaje.cooldowns || {};
        personaje.cooldowns.volar = now;

        // ✈️ Mensajes de recompensa
        const texts = [
            `🛸 *${personaje.nombre} entrenó su vuelo y ahora puede moverse más rápido.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `🌬️ *${personaje.nombre} logró perfeccionar el control de su energía en el aire.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `🔥 *Con una increíble explosión de poder, ${personaje.nombre} alcanzó una gran velocidad en el aire.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `🌀 *${personaje.nombre} realizó maniobras aéreas impresionantes, mejorando su control de vuelo.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `💨 *Después de un duro entrenamiento, ${personaje.nombre} ahora vuela sin esfuerzo.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `⚡ *${personaje.nombre} alcanzó una nueva fase de vuelo, pudiendo moverse a la velocidad de la luz.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`
        ];

        await conn.sendMessage(msg.key.remoteJid, {
            text: texts[Math.floor(Math.random() * texts.length)]
        }, { quoted: msg });

        // 📊 Manejar subida de nivel
        let xpMax = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
        const ranks = [
            { lvl: 1, tag: "🌟 Principiante" },
            { lvl: 10, tag: "⚔️ Guerrero del Cielo" },
            { lvl: 20, tag: "🔥 Maestro Aéreo" },
            { lvl: 30, tag: "👑 Dominador del Vuelo" },
            { lvl: 40, tag: "🌀 Señor del Viento" },
            { lvl: 50, tag: "💀 Espíritu Celestial" },
            { lvl: 60, tag: "🚀 Viajero Dimensional" },
            { lvl: 70, tag: "🔱 Dios del Vuelo" }
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

        // 🌟 Probabilidad de mejora de habilidad
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
        console.error("❌ Error en el comando .volar:", e);
        await conn.sendMessage(msg.key.remoteJid, {
            text: "❌ *Ocurrió un error al entrenar el vuelo. Inténtalo de nuevo.*"
        }, { quoted: msg });
    }
};

module.exports.command = ["volar"];
