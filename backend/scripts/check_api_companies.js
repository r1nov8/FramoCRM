const url = process.env.API_URL || 'http://localhost:4000/api/companies';
(async () => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    console.log('rows:', Array.isArray(data) ? data.length : 'not array');
    if (Array.isArray(data) && data.length) {
      console.log('first.Company:', data[0]['Company']);
      console.log('first keys:', Object.keys(data[0]).slice(0, 15).join(', '));
    }
  } catch (e) {
    console.error('fetch error:', e.message);
    process.exit(1);
  }
})();
