// Telegram‑бот.  Отправляет кнопку web_app, чтобы пользователи могли
// открыть Mini App прямо из чата, отвечает на /start и /help, и
// обрабатывает данные, возвращаемые из Mini App через веб‑клиент.
import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';

// Load environment from root .env file
dotenv.config({ path: '../../.env' });

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINIAPP_URL = process.env.MINIAPP_URL || 'http://localhost:5173/';

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN not defined in environment');
}

const bot = new Telegraf(BOT_TOKEN);

// /start command: send web_app button to launch the Mini App
bot.start((ctx) => {
  return ctx.reply(
    'Welcome! Tap the button below to open the game.',
    Markup.keyboard([
      [Markup.button.webApp('Play', MINIAPP_URL)]
    ]).resize()
  );
});

// /help command: basic instructions
bot.help((ctx) => ctx.reply('Use /start to receive a button that opens the Mini App.'));

// Handle web_app_data messages when Mini App sends data via Telegram.WebApp.sendData()
bot.on('message', async (ctx) => {
  const message: any = ctx.message;
  if (message?.web_app_data) {
    // Respond to data sent from the Mini App.  For example, echo it back.
    try {
      const data = JSON.parse(message.web_app_data.data);
      await ctx.reply(`Received data from web app: ${JSON.stringify(data)}`);
    } catch (e) {
      await ctx.reply('Received data from web app.');
    }
  }
});

// Launch the bot
bot.launch().then(() => console.log('Bot started'));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));