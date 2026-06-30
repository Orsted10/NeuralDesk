const query = 'elon musk net worth';
const targetUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

fetch(proxyUrl)
  .then(res => {
    console.log('Status:', res.status);
    return res.text();
  })
  .then(html => {
    console.log('Length:', html.length);
    if (html.includes('compTitle')) console.log('Yahoo HTML found!');
  })
  .catch(console.error);
