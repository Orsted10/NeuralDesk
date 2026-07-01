const query = 'elon musk net worth';
fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://search.yahoo.com/search?p=' + query)}`)
  .then(res => res.json())
  .then(data => {
    const html = data.contents;
    const results = []
    const resultBlocks = html.split('<div class="compTitle')
    
    for (let i = 1; i < resultBlocks.length; i++) {
      if (results.length >= 4) break
      const block = resultBlocks[i]
      
      const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i)
      const snippetMatch = block.match(/<div class="compText[^>]*>([\s\S]*?)<\/div>/i)
      
      if (titleMatch) {
        let title = titleMatch[2].replace(/<\/?[^>]+(>|$)/g, "").trim()
        let snippet = snippetMatch ? snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : ''
        
        if (!title.toLowerCase().includes('yahoo') && title && snippet) {
          results.push({ title, snippet })
        }
      }
    }
    console.log(JSON.stringify(results, null, 2))
  })
  .catch(console.error);
