const express = require('express');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

const NUMVERIFY_KEY = process.env.NUMVERIFY_API_KEY;
const MAILBOXLAYER_KEY = process.env.MAILBOXLAYER_API_KEY;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/verify-phone', async (req, res) => {
  const number = (req.query.number || '').trim();
  if (!number) {
    return res.status(400).json({ error: 'Missing "number" query parameter.' });
  }
  if (!NUMVERIFY_KEY) {
    return res.status(500).json({ error: 'Server is missing NUMVERIFY_API_KEY.' });
  }

  const url = new URL('http://apilayer.net/api/validate');
  url.searchParams.set('access_key', NUMVERIFY_KEY);
  url.searchParams.set('number', number);
  url.searchParams.set('format', '1');

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      return res.status(502).json({ error: data.error.info || 'numverify returned an error.' });
    }
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach numverify.' });
  }
});

app.get('/api/verify-email', async (req, res) => {
  const email = (req.query.email || '').trim();
  if (!email) {
    return res.status(400).json({ error: 'Missing "email" query parameter.' });
  }
  if (!MAILBOXLAYER_KEY) {
    return res.status(500).json({ error: 'Server is missing MAILBOXLAYER_API_KEY.' });
  }

  const url = new URL('https://api.apilayer.net/mailboxlayer/api/check');
  url.searchParams.set('access_key', MAILBOXLAYER_KEY);
  url.searchParams.set('email', email);
  url.searchParams.set('smtp', '1');
  url.searchParams.set('format', '1');

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      return res.status(502).json({ error: data.error.info || 'mailboxlayer returned an error.' });
    }
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach mailboxlayer.' });
  }
});

app.listen(PORT, () => {
  console.log(`Contact verification server running at http://localhost:${PORT}`);
});
