fetch("https://neural-desk-three.vercel.app/api/webhooks/slack", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "url_verification",
    challenge: "my_challenge_string_123"
  }),
  redirect: "manual"
}).then(async res => {
  console.log("STATUS:", res.status);
  console.log("HEADERS:", Object.fromEntries(res.headers.entries()));
  console.log("TEXT:", await res.text());
}).catch(console.error);
