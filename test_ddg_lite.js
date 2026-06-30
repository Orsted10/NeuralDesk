const query = 'elons networth';
fetch(`https://lite.duckduckgo.com/lite/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  body: `q=${encodeURIComponent(query)}`
})
.then(r => {
  console.log('Status:', r.status);
  return r.text();
})
.then(html => {
  const results = [];
  const linkRegex = /<a[^>]+class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;
  
  const linkMatches = [...html.matchAll(linkRegex)];
  const snippetMatches = [...html.matchAll(snippetRegex)];
  
  for (let i = 0; i < Math.min(linkMatches.length, 5); i++) {
      const aTagMatch = linkMatches[i][0].match(/href=['"]([^'"]+)['"]/i);
      const link = aTagMatch ? aTagMatch[1] : '';
      const title = linkMatches[i][1].replace(/<\/?[^>]+(>|$)/g, "").trim();
      const snippet = snippetMatches[i] ? snippetMatches[i][1].replace(/<\/?[^>]+(>|$)/g, "").trim() : '';
      
      results.push({
        title,
        snippet,
        link: link.startsWith('//') ? 'https:' + link : link
      });
  }
  console.log(JSON.stringify(results, null, 2));
})
.catch(console.error);
