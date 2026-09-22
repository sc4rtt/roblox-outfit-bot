require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);

async function processOutfit(ctx, code) {
    const cleanCode = code.trim().toUpperCase(); // Convertir a mayúsculas como en el juego

    if (!cleanCode) return;

    ctx.reply(`🔍 Buscando outfit: \`${cleanCode}\`...`, { parse_mode: 'Markdown' });

    try {
        // Probamos la API con headers completos para saltar bloqueos
        const response = await axios.get(`https://catalog-avatar-creator.itsmunze.com/api/outfit/${cleanCode}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://catalog-avatar-creator.itsmunze.com',
                'Referer': 'https://catalog-avatar-creator.itsmunze.com/'
            },
            timeout: 15000
        });

        const data = response.data;
        let rawAssets = data.assets || data.items || data.outfitAssets || [];
        let assetIds = [];

        if (Array.isArray(rawAssets)) {
            assetIds = rawAssets.map(item => typeof item === 'object' ? (item.id || item.assetId) : item).filter(Boolean);
        }

        if (assetIds.length === 0) {
            return ctx.reply('⚠️ El outfit no contiene accesorios o IDs legibles.');
        }

        const msg = 
            `✨ **Outfit:** ${data.name || cleanCode}\n` +
            `📦 **Total IDs:** ${assetIds.length}\n\n` +
            `📋 **IDs:**\n\`${assetIds.join(', ')}\``;

        await ctx.reply(msg, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error("Error en consola:", error.message);
        
        if (error.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
            return ctx.reply(`❌ **Error de DNS/Internet:** Tu PC no puede conectarse a la API de CAC. Revisa tu conexión o usa VPN.`);
        }
        
        if (error.response && error.response.status === 404) {
            return ctx.reply(`❌ El código \`${cleanCode}\` no existe.`, { parse_mode: 'Markdown' });
        }

        ctx.reply(`❌ **Error:** ${error.message}`);
    }
}

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;
    await processOutfit(ctx, text);
});

bot.launch();
console.log('🤖 Bot listo en la consola...');