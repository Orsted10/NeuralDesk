const query = 'elons networth';
fetch(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
  headers: {
  }
})
.then(r => r.text())
.then(html => {
  const results = [];
  const linkRegex = /<a[^>]+class=['"][^'"]*ac-algo[^'"]*['"][^>]*href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi;
  const snippetRegex = /<div[^>]+class=['"][^'"]*compTitle[^'"]*['"][\s\S]*?<div[^>]+class=['"][^'"]*compText[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi;
  
  const linkMatches = [...html.matchAll(linkRegex)];
  const snippetMatches = [...html.matchAll(snippetRegex)];
  
  for (let i = 0; i < Math.min(linkMatches.length, 5); i++) {
      const link = linkMatches[i][1];
      const title = linkMatches[i][2].replace(/<\/?[^>]+(>|$)/g, "").trim();
      const snippet = snippetMatches[i] ? snippetMatches[i][1].replace(/<\/?[^>]+(>|$)/g, "").trim() : '';
      
      results.push({
        title,
        snippet,
        link
      });
  }
  console.log(JSON.stringify(results, null, 2));
})
.catch(console.error);
