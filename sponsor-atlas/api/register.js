const PAGE_URL = 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers';
const FALLBACK_URL = 'https://www.gov.uk/csv-preview/6aa1382d9f95f408139c64b7/SP_-_Worker_and_Temporary_Worker_Web_Register_-_2026-09-09.csv';

function decodeHTML(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&#38;', '&');
}

function findCSV(html) {
  const links = [];
  const re = /href=["']([^"']+)["']/gi;
  for (const match of html.matchAll(re)) {
    try {
      const url = new URL(decodeHTML(match[1]), PAGE_URL);
      if (!/(^|\.)gov\.uk$/i.test(url.hostname) && !/(^|\.)publishing\.service\.gov\.uk$/i.test(url.hostname)) continue;
      if (/\.csv(?:$|\?)/i.test(url.href) || url.pathname.includes('/csv-preview/')) links.push(url.href);
    } catch {}
  }
  return links.find((url) => /worker/i.test(url)) || links[0] || null;
}

function registerDate(url, response) {
  const fromName = url.match(/(20\d{2}-\d{2}-\d{2})/);
  return fromName?.[1] || response.headers.get('last-modified') || new Date().toISOString();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let csvUrl = FALLBACK_URL;
    try {
      const page = await fetch(PAGE_URL, { headers: { 'user-agent': 'SponsorAtlas/1.0 (+https://sponsor-atlas.vercel.app)' }, signal: AbortSignal.timeout(8000) });
      if (page.ok) csvUrl = findCSV(await page.text()) || csvUrl;
    } catch {}

    const upstream = await fetch(csvUrl, { headers: { 'user-agent': 'SponsorAtlas/1.0 (+https://sponsor-atlas.vercel.app)' }, signal: AbortSignal.timeout(20000) });
    if (!upstream.ok || !upstream.body) throw new Error(`Official register returned ${upstream.status}`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Sponsor-Source', csvUrl);
    res.setHeader('X-Sponsor-Register-Date', registerDate(csvUrl, upstream));
    if (req.method === 'HEAD') return res.end();

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) await new Promise((resolve) => res.once('drain', resolve));
    }
    res.end();
  } catch (error) {
    console.error('Sponsor register proxy failed:', error);
    if (!res.headersSent) res.status(502).json({ error: 'The official sponsor register is temporarily unavailable.' });
    else res.end();
  }
};