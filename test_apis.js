const exaKey = '1fae84df-5208-41b6-afa0-bfe78bd4735a';
const zenserpKey = '64166aa0-74fc-11f1-bf3e-5994ba198079';
const firecrawlKey = 'fc-1cfcb73276c3456f85addaea4ec28c13';
const scrapeDoKey = 'd4135cb6a0c5407f9d4cd78cb85b1ba5f58ce8e4741';

async function testExa() {
  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': exaKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'elon musk net worth', numResults: 3, useAutoprompt: true })
    });
    console.log('EXA STATUS:', res.status);
    if (res.ok) { const data = await res.json(); console.log('EXA OK', data.results?.length); }
    else console.log(await res.text());
  } catch(e){ console.log(e.message) }
}

async function testZenserp() {
  try {
    const res = await fetch(`https://app.zenserp.com/api/v2/search?apikey=${zenserpKey}&q=elon+musk+net+worth`);
    console.log('ZENSERP STATUS:', res.status);
    if (res.ok) { const data = await res.json(); console.log('ZENSERP OK', data.organic?.length); }
    else console.log(await res.text());
  } catch(e){ console.log(e.message) }
}

async function testFirecrawl() {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'elon musk net worth' })
    });
    console.log('FIRECRAWL STATUS:', res.status);
    if (res.ok) { const data = await res.json(); console.log('FIRECRAWL OK', data.data?.length); }
    else console.log(await res.text());
  } catch(e){ console.log(e.message) }
}

async function testScrapedDo() {
  try {
    const targetUrl = encodeURIComponent('https://html.duckduckgo.com/html/?q=elon+musk+net+worth');
    const res = await fetch(`http://api.scrape.do?token=${scrapeDoKey}&url=${targetUrl}`);
    console.log('SCRAPEDO STATUS:', res.status);
    if (res.ok) { const html = await res.text(); console.log('SCRAPEDO OK HTML length:', html.length); }
    else console.log(await res.text());
  } catch(e){ console.log(e.message) }
}

async function run() {
  await testExa();
  await testZenserp();
  await testFirecrawl();
  await testScrapedDo();
}
run();
