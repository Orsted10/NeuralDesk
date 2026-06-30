const query = 'elons networth';
fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
})
.then(r => {
  if (!r.ok) {
    console.error('Failed with status:', r.status);
    return;
  }
  return r.text();
})
.then(html => {
  if (!html) return;
  const results = [];
  const resultBlocks = html.split('result__body').slice(1);
  
  for (const block of resultBlocks) {
    if (results.length >= 5) break;
    
    const titleMatch = block.match(/class="result__title"[^>]*>[\s\S]*?<a[^>]*>(.*?)<\/a>/i);
    const snippetMatch = block.match(/class="result__snippet[^>]*>(.*?)<\/a>/i);
    const linkMatch = block.match(/href="([^"]+)"/i);
    
    if (titleMatch && snippetMatch) {
      const cleanTitle = titleMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
      const cleanSnippet = snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
      const link = linkMatch ? linkMatch[1] : '';
      
      results.push({
        title: cleanTitle,
        snippet: cleanSnippet,
        link: link.startsWith('//') ? 'https:' + link : link
      });
    }
  }
  console.log(JSON.stringify(results, null, 2));
})
.catch(console.error);
