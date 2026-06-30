const query = 'elon musk net worth';
const instances = [
  'https://search.mdosch.de/',
  'https://searx.tiekoetter.com/',
  'https://search.ononoki.org/',
  'https://etsi.me/'
];

async function test() {
  for (const url of instances) {
    try {
      console.log(`Trying ${url}...`);
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000); // 3 sec timeout per instance
      
      const res = await fetch(`${url}search?q=${encodeURIComponent(query)}&format=json`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(id);
      
      if (res.ok) {
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          console.log(`Success with ${url}:`, json.results[0].title);
          return;
        }
      }
    } catch (err) {
      console.log(`Failed ${url}: ${err.message}`);
    }
  }
  console.log('All failed');
}
test();
