const fetch = require('node-fetch');

async function login(username, password) {
  const url = `https://apsystemsema.com:443/ema/loginEMA.action?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.headers.get('set-cookie'); // sessiecookie voor vervolg
}

// async function getData(cookie) {
//   const url = 'https://apsystemsema.com/ema/ajax/getDashboardApiAjax/getDashboardProductionInfoAjax';
//   const res = await fetch(url, {
//     method: 'POST',
//     headers: { 'Cookie': cookie },
//   });
async function login(username, password) {
  const url = `https://apsystemsema.com:443/ema/loginEMA.action`;
  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });




  if (!res.ok) throw new Error(`Data fetch failed: ${res.status}`);
  
  const json = await res.json();
  console.log("Response received from APS API", json);
  const currentPower = parseInt(json.lastPower.replace('.', '')) / 1_000_000;
  const today = parseInt(json.today.replace('.', '')) / 1000;
  const lifetime = parseInt(json.lifetime.replace('.', '')) / 1000;

  return { currentPower, today, lifetime };
}

module.exports = { login, getData };
