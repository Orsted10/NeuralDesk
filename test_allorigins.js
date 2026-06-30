const query = 'elon musk net worth';
fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://search.yahoo.com/search?p=' + query)}`)
  .then(res => res.json())
  .then(data => {
    if (data.contents) {
      console.log('Success, HTML length:', data.contents.length);
    } else {
      console.log('Failed:', data);
    }
  })
  .catch(console.error);
