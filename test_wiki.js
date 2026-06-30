const query = 'elon musk net worth';
fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`)
.then(r => r.json())
.then(json => {
  const results = json.query.search.map(r => ({
    title: r.title,
    snippet: r.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
    link: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`
  }));
  console.log(JSON.stringify(results.slice(0,5), null, 2));
})
.catch(console.error);
