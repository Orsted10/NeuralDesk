fetch('https://openrouter.ai/api/v1/models')
.then(res => res.json())
.then(data => {
  const onlineModels = data.data.filter(m => m.id.includes('perplexity') || m.id.includes('sonar'));
  console.log(onlineModels.map(m => m.id));
})
.catch(console.error);
