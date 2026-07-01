const query = 'elon musk net worth';
fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://html.duckduckgo.com/html/?q=' + query)}`)
  .then(res => res.json())
  .then(data => {
    const html = data.contents;
    const results = [];
    const resultBlocks = html.split('result__body');
    
    for (let i = 1; i < resultBlocks.length; i++) {
      if (results.length >= 4) break;
      const block = resultBlocks[i];
      
      const titleMatch = block.match(/<a class="result__url" href="[^"]*">([^<]*)<\/a>/i);
      const snippetMatch = block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/i);
      
      if (titleMatch) {
        let title = titleMatch[1].trim();
        let snippet = snippetMatch ? snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : '';
        results.push({ title, snippet });
      }
    }
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(console.error);
