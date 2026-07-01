const zenserpKey = '64166aa0-74fc-11f1-bf3e-5994ba198079';
fetch(`https://app.zenserp.com/api/v2/search?apikey=${zenserpKey}&q=elon+musk+net+worth`)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data.organic.slice(0,2), null, 2)));
