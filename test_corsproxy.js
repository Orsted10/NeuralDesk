const query = 'elon musk net worth';
fetch(`https://corsproxy.io/?url=${encodeURIComponent('https://html.duckduckgo.com/html/?q=' + query)}`)
  .then(res => res.text())
  .then(html => {
    console.log('HTML length:', html.length);
    console.log(html.substring(0, 200));
  })
  .catch(console.error);
