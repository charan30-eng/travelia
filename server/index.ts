import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRoutes from './routes/ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to current dir

export const app = express();

app.use(express.json());

// Mount Travelia AI routes
app.use('/api/ai', aiRoutes);

// Root API test endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Travelia Backend API',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3005;

// Only start listening if run directly (e.g. `npx tsx server/index.ts`)
if (process.env.STANDALONE_SERVER === 'true' || process.argv[1]?.includes('server/index')) {
  app.listen(PORT, () => {
    console.log(`[Travelia AI Server] Running on http://localhost:${PORT}`);
  });
}

export default app;
