const query = 'elon musk net worth';
fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
})
.then(res => res.text())
.then(html => {
  if (html.includes('result__snippet')) {
    console.log('Success! DuckDuckGo HTML is NOT blocking us.');
  } else {
    console.log('Failed or blocked. Length:', html.length);
  }
})
.catch(console.error);
