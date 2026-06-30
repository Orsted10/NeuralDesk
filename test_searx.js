const query = 'elon musk net worth';
const instances = [
  'https://searx.be/',
  'https://search.ononoki.org/',
  'https://searx.tiekoetter.com/',
  'https://searx.work/',
  'https://paulgo.io/'
];

async function test() {
  for (const url of instances) {
    try {
      const res = await fetch(`${url}search?q=${encodeURIComponent(query)}&format=json`);
      if (res.ok) {
        const json = await res.json();
        console.log(`Success with ${url}`);
        console.log(json.results.slice(0,2).map(r => r.title));
        return;
      } else {
        console.log(`Failed with ${url} - Status: ${res.status}`);
      }
    } catch (err) {
      console.error(`Error with ${url}:`, err.message);
    }
  }
}
test();
