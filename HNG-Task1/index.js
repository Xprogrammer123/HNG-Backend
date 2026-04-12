import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/classify', async (req, res) => {
  try {
    const { name } = req.query;

    if (name === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameter: name'
      });
    }

    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Name parameter cannot be empty'
      });
    }

    const genderizeUrl = `https://api.genderize.io?name=${encodeURIComponent(name)}`;
    const genderizeResponse = await axios.get(genderizeUrl, { timeout: 5000 });

    const { gender, probability, count } = genderizeResponse.data;

    if (gender === null || count === 0) {
      return res.status(200).json({
        status: 'error',
        message: 'No prediction available for the provided name'
      });
    }

    const is_confident = probability >= 0.7 && count >= 100;
    const processed_at = new Date().toISOString();

    res.status(200).json({
      status: 'success',
      data: {
        name: name.toLowerCase(),
        gender,
        probability,
        sample_size: count,
        is_confident,
        processed_at
      }
    });

  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({ status: 'error', message: 'External API request timeout' });
    }

    if (error.response?.status === 502 || error.code === 'ECONNREFUSED') {
      return res.status(502).json({ status: 'error', message: 'External API unavailable' });
    }

    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


export default app;