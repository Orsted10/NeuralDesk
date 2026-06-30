const query = 'elons networth';
fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`)
.then(r => r.json())
.then(json => console.log(json))
.catch(console.error);
