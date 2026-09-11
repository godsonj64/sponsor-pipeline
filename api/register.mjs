const PUBLICATION_URL = 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers';

function extractCsvUrl(html) {
  const direct = html.match(/https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"'<>\s]+\.csv/gi);
  if (direct?.length) return direct[0].replaceAll('&amp;', '&');

  const href = html.match(/href=["']([^"']+\.csv)["']/i)?.[1];
  if (href) return new URL(href.replaceAll('&amp;', '&'), PUBLICATION_URL).toString();

  throw new Error('Could not locate the sponsor-register CSV on GOV.UK');
}

function extractDate(csvUrl, html) {
  const fromFile = csvUrl.match(/_(\d{4}-\d{2}-\d{2})\.csv(?:$|\?)/)?.[1];
  if (fromFile) return fromFile;

  const datetime = html.match(/<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})[^"']*["']/i)?.[1];
  return datetime || new Date().toISOString().slice(0, 10);
}

async function sourceMetadata() {
  const page = await fetch(PUBLICATION_URL, {
    headers: {
      'user-agent': 'SponsorAtlas/1.0 (+https://sponsor-atlas.vercel.app)',
      'accept': 'text/html,application/xhtml+xml'
    },
    redirect: 'follow'
  });

  if (!page.ok) throw new Error(`GOV.UK publication request failed (${page.status})`);
  const html = await page.text();
  const csvUrl = extractCsvUrl(html);
  const updated = extractDate(csvUrl, html);
  return { csvUrl, updated };
}

export default async function handler(req, res) {
  try {
    const { csvUrl, updated } = await sourceMetadata();
    const wantsMeta = String(req.query?.meta || '') === '1';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    res.setHeader('X-Sponsor-Source', csvUrl);
    res.setHeader('X-Sponsor-Updated', updated);

    if (wantsMeta) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({ updated, sourceUrl: csvUrl, publicationUrl: PUBLICATION_URL });
    }

    const csv = await fetch(csvUrl, {
      headers: {
        'user-agent': 'SponsorAtlas/1.0 (+https://sponsor-atlas.vercel.app)',
        'accept': 'text/csv,text/plain;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    });

    if (!csv.ok) throw new Error(`GOV.UK CSV request failed (${csv.status})`);
    const body = Buffer.from(await csv.arrayBuffer());
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="uk-sponsor-register-${updated}.csv"`);
    return res.status(200).send(body);
  } catch (error) {
    console.error(error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Unable to load the official sponsor register' });
  }
}
