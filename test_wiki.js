const query = 'elon musk net worth';
fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`)
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data.query.search, null, 2));
  })
  .catch(console.error);
