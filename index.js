require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Función para obtener datos de la API de CAC
async function getCACData(code) {
    const cleanCode = code.trim().toUpperCase();
    const url = `https://catalog-avatar-creator.itsmunze.com/api/outfit/${cleanCode}`;

    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        },
        timeout: 10000
    });

    return response.data;
}

// Manejador de la petición
async function handleOutfitRequest(ctx, code) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    await ctx.reply(`🔍 Buscando outfit **${cleanCode}** en CAC...`, { parse_mode: 'Markdown' });

    try {
        const data = await getCACData(cleanCode);

        let rawAssets = data.assets || data.items || data.outfitAssets || [];
        let assetIds = [];

        if (Array.isArray(rawAssets)) {
            assetIds = rawAssets.map(item => typeof item === 'object' ? (item.id || item.assetId) : item).filter(Boolean);
        }

        if (assetIds.length === 0) {
            return ctx.reply(`⚠️ El outfit **${cleanCode}** no contiene Asset IDs cargables.`);
        }

        const outfitPayload = {
            code: cleanCode,
            name: data.name || `Outfit ${cleanCode}`,
            total_assets: assetIds.length,
            asset_ids: assetIds
        };

        const jsonBuffer = Buffer.from(JSON.stringify(outfitPayload, null, 2));

        const msgText = 
            `✅ **Outfit Encontrado:** ${outfitPayload.name}\n` +
            `🏷️ **Código:** \`${cleanCode}\`\n` +
            `📦 **Accesorios (${assetIds.length}):**\n` +
            `\`${assetIds.join(', ')}\``;

        await ctx.reply(msgText, { parse_mode: 'Markdown' });
        await ctx.replyWithDocument({
            source: jsonBuffer,
            filename: `outfit_${cleanCode}.json`
        }, { caption: "📄 Archivo listo para importar en Roblox Studio." });

    } catch (error) {
        console.error("Error al consultar CAC:", error.message);
        if (error.response && error.response.status === 404) {
            return ctx.reply(`❌ El código **${cleanCode}** no existe en Catalog Avatar Creator.`);
        }
        ctx.reply(`❌ Error al conectar con la API de CAC: ${error.message}`);
    }
}

bot.start((ctx) => {
    ctx.reply("🤖 Envíame un código de Catalog Avatar Creator (ejemplo: `DD034F`) para extraer sus IDs.");
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    if (/^[a-zA-Z0-9]{4,10}$/.test(text)) {
        await handleOutfitRequest(ctx, text);
    } else {
        ctx.reply("⚠️ Ingresa un código válido de CAC (ejemplo: `DD034F`).");
    }
});

bot.launch();
console.log('🚀 Bot activo en Railway...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
