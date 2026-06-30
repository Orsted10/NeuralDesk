const query = 'elon musk net worth';
fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`)
  .then(res => res.text())
  .then(xml => {
    const items = xml.split('<item>');
    const results = [];
    for (let i = 1; i < Math.min(items.length, 6); i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      if (titleMatch && linkMatch) {
        results.push({
          title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1'),
          link: linkMatch[1],
          snippet: 'Latest news regarding this topic.'
        });
      }
    }
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(console.error);
