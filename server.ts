import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getAllUsersFromDb,
  upsertUserInDb,
  deleteUserFromDb,
  getAllTripsFromDb,
  saveTripsInDb,
  deleteTripFromDb,
  getAllCustomRoutesFromDb,
  saveCustomRoutesInDb,
  deleteCustomRouteFromDb,
  getTravelNotesConfigFromDb,
  saveTravelNotesConfigInDb,
  getAllArticlesFromDb,
  saveArticlesInDb,
  deleteArticleFromDb,
  getFaqConfigFromDb,
  saveFaqConfigInDb
} from './src/db/queries.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Health check endpoint for online-only connectivity monitoring
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', online: true, timestamp: Date.now() });
});

// --- API ENDPOINTS FOR RELATIONAL CLOUD SQL DATABASE ---

// 1. Users API
app.get('/api/db/users', async (req, res) => {
  try {
    const users = await getAllUsersFromDb();
    res.json(users);
  } catch (error: any) {
    console.error('API /api/db/users error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

app.post('/api/db/users', async (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.id || !user.email) {
      return res.status(400).json({ error: 'Invalid user payload' });
    }
    const saved = await upsertUserInDb(user);
    res.json(saved);
  } catch (error: any) {
    console.error('API POST /api/db/users error:', error);
    res.status(500).json({ error: error.message || 'Failed to save user' });
  }
});

app.delete('/api/db/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUserFromDb(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/db/users error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// 2. Companion Trips API
app.get('/api/db/trips', async (req, res) => {
  try {
    const trips = await getAllTripsFromDb();
    res.json(trips);
  } catch (error: any) {
    console.error('API /api/db/trips error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trips' });
  }
});

app.post('/api/db/trips', async (req, res) => {
  try {
    const { trips } = req.body;
    if (!Array.isArray(trips)) {
      return res.status(400).json({ error: 'trips array is required' });
    }
    await saveTripsInDb(trips);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API POST /api/db/trips error:', error);
    res.status(500).json({ error: error.message || 'Failed to save trips' });
  }
});

app.delete('/api/db/trips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTripFromDb(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/db/trips error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete trip' });
  }
});

// 3. Custom Routes API
app.get('/api/db/routes', async (req, res) => {
  try {
    const routes = await getAllCustomRoutesFromDb();
    res.json(routes);
  } catch (error: any) {
    console.error('API /api/db/routes error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch custom routes' });
  }
});

app.post('/api/db/routes', async (req, res) => {
  try {
    const { routes } = req.body;
    if (!Array.isArray(routes)) {
      return res.status(400).json({ error: 'routes array is required' });
    }
    await saveCustomRoutesInDb(routes);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API POST /api/db/routes error:', error);
    res.status(500).json({ error: error.message || 'Failed to save routes' });
  }
});

app.delete('/api/db/routes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCustomRouteFromDb(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/db/routes error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete custom route' });
  }
});

// 4. Travel Notes and Crew Reviews API
app.get('/api/db/travel-notes', async (req, res) => {
  try {
    const notesConfig = await getTravelNotesConfigFromDb();
    res.json(notesConfig);
  } catch (error: any) {
    console.error('API /api/db/travel-notes error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch travel notes' });
  }
});

app.post('/api/db/travel-notes', async (req, res) => {
  try {
    const configData = req.body;
    await saveTravelNotesConfigInDb(configData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API POST /api/db/travel-notes error:', error);
    res.status(500).json({ error: error.message || 'Failed to save travel notes' });
  }
});

// 5. Articles API
app.get('/api/db/articles', async (req, res) => {
  try {
    const articlesList = await getAllArticlesFromDb();
    res.json(articlesList);
  } catch (error: any) {
    console.error('API /api/db/articles error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch articles' });
  }
});

app.post('/api/db/articles', async (req, res) => {
  try {
    const { articles } = req.body;
    if (!Array.isArray(articles)) {
      return res.status(400).json({ error: 'articles array is required' });
    }
    await saveArticlesInDb(articles);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API POST /api/db/articles error:', error);
    res.status(500).json({ error: error.message || 'Failed to save articles' });
  }
});

app.delete('/api/db/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteArticleFromDb(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/db/articles error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete article' });
  }
});

// 6. FAQ & Safety Handbook API
app.get('/api/db/faq', async (req, res) => {
  try {
    const faqConfig = await getFaqConfigFromDb();
    res.json(faqConfig);
  } catch (error: any) {
    console.error('API /api/db/faq error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch FAQ' });
  }
});

app.post('/api/db/faq', async (req, res) => {
  try {
    const configData = req.body;
    await saveFaqConfigInDb(configData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API POST /api/db/faq error:', error);
    res.status(500).json({ error: error.message || 'Failed to save FAQ' });
  }
});

// 5. Telegram Notification API for Trip Applications
app.post('/api/notifications/telegram-application', async (req, res) => {
  try {
    const {
      tripTitle,
      riverName,
      organizerTelegram,
      organizerName,
      applicantName,
      applicantPhone,
      applicantEmail,
      experienceLevel,
      vesselType,
      notes
    } = req.body;

    const vesselLabel = vesselType ? String(vesselType).toUpperCase() : 'Каяк / Байдарка / Паккрафт';
    const messageText = `🌊 *Splav86: Новая заявка в экипаж!*\n\n` +
      `📍 *Поход:* ${tripTitle || 'Без названия'} (р. ${riverName || ''})\n` +
      `👑 *Капитан:* ${organizerName || 'Организатор'}\n\n` +
      `👤 *Участник:* ${applicantName || 'Турист'}\n` +
      `📞 *Телефон:* ${applicantPhone || 'Не указан'}\n` +
      (applicantEmail ? `✉️ *Email:* ${applicantEmail}\n` : '') +
      `🛶 *Судно:* ${vesselLabel}\n` +
      `🏆 *Опыт:* ${experienceLevel || 'Любитель'}\n` +
      (notes ? `💬 *Сообщение:* "${notes}"\n\n` : '\n') +
      `⚙️ _Управление заявками доступно в Личном кабинете Splav86._`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const defaultChatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken) {
      let targetChatId = defaultChatId;
      if (organizerTelegram && /^-?\d+$/.test(organizerTelegram.trim())) {
        targetChatId = organizerTelegram.trim();
      }
      if (targetChatId) {
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetChatId,
              text: messageText,
              parse_mode: 'Markdown'
            })
          });
        } catch (fetchErr) {
          console.warn('Failed to dispatch telegram bot notification:', fetchErr);
        }
      }
    }

    res.json({
      success: true,
      message: 'Telegram notification triggered',
      preview: messageText
    });
  } catch (error: any) {
    console.error('Telegram notification error:', error);
    res.status(500).json({ error: error.message || 'Notification error' });
  }
});

// Serve static assets in production
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
