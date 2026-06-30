require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ googleSearch: {} }]
    });

    const result = await model.generateContent("What is Elon Musk's current net worth?");
    console.log(result.response.text());
    
    // Attempt to extract grounding metadata
    if (result.response.candidates && result.response.candidates[0].groundingMetadata) {
      console.log('Grounding metadata:', JSON.stringify(result.response.candidates[0].groundingMetadata.searchEntryPoint, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
