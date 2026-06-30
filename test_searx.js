const query = 'elon musk net worth';


async function performSearch() {
  try {
    const spaceRes = await fetch('https://searx.space/data/instances.json');
    const data = await spaceRes.json();
    // Get ALL instances
    const instances = Object.keys(data.instances).sort(() => 0.5 - Math.random()).slice(0, 40);
    
    console.log(`Trying 40 random instances in parallel...`);
    const start = performance.now();
    
    const fetchPromises = instances.map(url => {
      return new Promise(async (resolve, reject) => {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 8000);
          
          const res = await fetch(`${url}search?q=${encodeURIComponent(query)}&format=json`, {
            signal: controller.signal
          });
          clearTimeout(id);
          
          if (res.ok) {
            const json = await res.json();
            if (json.results && json.results.length > 0) {
              resolve({ url, results: json.results.slice(0, 5) });
              return;
            }
          }
          reject('No good results or not ok');
        } catch (e) {
          reject(e);
        }
      });
    });

    const winner = await Promise.any(fetchPromises);
    const end = performance.now();
    
    console.log(`Success with ${winner.url} in ${Math.round(end - start)}ms`);
    console.log(winner.results[0].title);
  } catch (err) {
    console.error('All failed');
  }
}
performSearch();
