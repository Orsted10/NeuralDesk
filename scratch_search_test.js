require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function test() {
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY;

  console.log('CX exists?', !!cx);
  console.log('API Key exists?', !!apiKey);

  if (!cx || !apiKey) {
    console.error('Missing credentials');
    return;
  }

  try {
    const customsearch = google.customsearch('v1');
    const res = await customsearch.cse.list({
      cx: cx,
      q: 'elon musk',
      auth: apiKey,
      num: 5,
    });
    console.log('Success! Found', res.data.items?.length, 'items');
  } catch (error) {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}
test();
