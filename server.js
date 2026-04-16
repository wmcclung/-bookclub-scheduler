const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      voter_name TEXT NOT NULL,
      color TEXT NOT NULL,
      availability JSONB NOT NULL,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(poll_id, voter_name)
    );
  `);
  console.log('DB initialized');
}

app.post('/api/polls', async (req, res) => {
  try {
    const { title, creatorName } = req.body;
    if (!creatorName) return res.status(400).json({ error: 'Missing creatorName' });
    const id = uuidv4().slice(0, 8);
    await pool.query('INSERT INTO polls (id, title, creator_name) VALUES ($1, $2, $3)',
      [id, title || 'Book Club', creatorName]);
    res.json({ id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/polls/:id', async (req, res) => {
  try {
    const { rows: p } = await pool.query('SELECT * FROM polls WHERE id = $1', [req.params.id]);
    if (!p.length) return res.status(404).json({ error: 'Poll not found' });
    const { rows: v } = await pool.query(
      'SELECT voter_name, color, availability FROM votes WHERE poll_id = $1 ORDER BY submitted_at ASC',
      [req.params.id]);
    res.json({ poll: p[0], votes: v });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Full replace — whatever is sent is the source of truth for this name
app.post('/api/polls/:id/vote', async (req, res) => {
  try {
    const { voterName, availability } = req.body;
    if (!voterName) return res.status(400).json({ error: 'Missing voterName' });
    const { rows: existing } = await pool.query(
      'SELECT voter_name, color FROM votes WHERE poll_id = $1 ORDER BY submitted_at ASC',
      [req.params.id]);
    const COLORS = ['#e05a2b','#2b7be0','#2ba84a','#9b2be0','#e0a82b','#2bc4e0','#e02b9b','#5be02b'];
    const match = existing.find(v => v.voter_name.toLowerCase() === voterName.toLowerCase());
    const color = match ? match.color : COLORS[existing.length % COLORS.length];
    await pool.query(`
      INSERT INTO votes (poll_id, voter_name, color, availability)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (poll_id, voter_name)
      DO UPDATE SET availability = $4, submitted_at = NOW()
    `, [req.params.id, voterName, color, JSON.stringify(availability || {})]);
    res.json({ ok: true, color });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Delete entire voter
app.delete('/api/polls/:id/votes/:voterName', async (req, res) => {
  try {
    await pool.query('DELETE FROM votes WHERE poll_id = $1 AND LOWER(voter_name) = LOWER($2)',
      [req.params.id, decodeURIComponent(req.params.voterName)]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
initDb().then(() => app.listen(PORT, () => console.log(`Running on :${PORT}`))).catch(err => { console.error(err); process.exit(1); });
