const query = 'elon musk net worth';
fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`)
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(console.error);
