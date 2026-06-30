const query = 'elons networth';
fetch(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
  headers: {
  }
})
.then(r => r.text())
.then(html => {
  const results = [];
  
  // A robust way to parse Yahoo search results without a DOM library
  // Each result is typically within a div with class containing 'algo'
  const resultBlocks = html.split('<div class="compTitle');
  
  for (let i = 1; i < resultBlocks.length; i++) {
    if (results.length >= 5) break;
    const block = resultBlocks[i];
    
    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = block.match(/<div class="compText[^>]*>([\s\S]*?)<\/div>/i);
    
    if (titleMatch) {
      const link = titleMatch[1];
      const title = titleMatch[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
      let snippet = snippetMatch ? snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : '';
      
      // Some Yahoo links are redirect links, we can try to extract the real RU= url
      let finalLink = link;
      const ruMatch = link.match(/\/RU=([^/]+)\//);
      if (ruMatch) {
        finalLink = decodeURIComponent(ruMatch[1]);
      }
      
      results.push({ title, snippet, link: finalLink });
    }
  }
  
  console.log(JSON.stringify(results, null, 2));
})
.catch(console.error);
