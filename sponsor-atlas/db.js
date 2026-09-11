(() => {
  const DATA_URL = '/api/register';
  const DB_NAME = 'SponsorAtlasRegisterV2';
  const DB_VERSION = 1;
  const META_KEY = 'register';
  const REFRESH_MS = 6 * 60 * 60 * 1000;
  let openPromise;

  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('organisations')) {
          const s = db.createObjectStore('organisations', { keyPath: 'organisation_id' });
          s.createIndex('name', '_name');
          s.createIndex('town', '_town');
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function reqP(req) { return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  function txDone(tx) { return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted')); }); }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 1; }
          else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
      else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function stableId(value) {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= BigInt(value.charCodeAt(i));
      hash = BigInt.asUintN(64, hash * prime);
    }
    return hash.toString(36);
  }

  function cleanPlace(value) {
    const v = String(value || '').trim();
    if (!v || /^(not set|choose county|n\/a)$/i.test(v)) return '';
    return v;
  }

  function normalize(rows) {
    if (!rows.length) return { organisations: [], routes: [], licenceCount: 0 };
    const header = rows[0].map((x) => x.trim().replace(/^\uFEFF/, '').toLowerCase());
    const col = (...names) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
    const oi = col('organisation name', 'organization name');
    const ti = col('town/city', 'town / city', 'town city');
    const ci = col('county');
    const ri = col('route');
    const yi = col('type & rating', 'type and rating', 'type/rating');
    if (oi < 0 || ri < 0) throw new Error('Unexpected sponsor-register CSV columns');

    const byKey = new Map();
    const organisations = [];
    const routes = new Set();
    let licenceCount = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const r = rows[i];
      const name = (r[oi] || '').trim();
      if (!name) continue;
      const town = ti >= 0 ? cleanPlace(r[ti]) : '';
      const county = ci >= 0 ? cleanPlace(r[ci]) : '';
      const route = (r[ri] || '').trim();
      const typeRating = yi >= 0 ? (r[yi] || '').trim() : '';
      const key = `${name.toLocaleLowerCase()}\u0000${town.toLocaleLowerCase()}\u0000${county.toLocaleLowerCase()}`;
      let org = byKey.get(key);
      if (!org) {
        org = {
          organisation_id: stableId(key),
          organisation_name: name,
          town_city: town,
          county,
          _name: name.toLocaleLowerCase(),
          _town: `${town} ${county}`.toLocaleLowerCase(),
          licences: []
        };
        byKey.set(key, org);
        organisations.push(org);
      }
      if (route || typeRating) {
        if (!org.licences.some((l) => l.route === route && l.type_rating === typeRating)) {
          org.licences.push({ route, type_rating: typeRating });
          licenceCount += 1;
        }
        if (route) routes.add(route);
      }
    }

    organisations.sort((a, b) => a.organisation_name.localeCompare(b.organisation_name));
    return { organisations, routes: [...routes].sort((a, b) => a.localeCompare(b)), licenceCount };
  }

  async function readAll(db, metaOverride) {
    const tx = db.transaction(['organisations', 'meta'], 'readonly');
    const organisations = await reqP(tx.objectStore('organisations').getAll());
    const meta = metaOverride || await reqP(tx.objectStore('meta').get(META_KEY));
    await txDone(tx);
    organisations.sort((a, b) => a.organisation_name.localeCompare(b.organisation_name));
    const byId = new Map(organisations.map((o) => [String(o.organisation_id), o]));
    return {
      organisations,
      byId,
      routes: meta?.routes || [],
      licenceCount: meta?.licenceCount || 0,
      sourceUrl: meta?.sourceUrl || null,
      sourceDate: meta?.sourceDate || null,
      updatedAt: meta?.updatedAt || null,
      stale: Boolean(meta?.stale)
    };
  }

  async function fetchRegister() {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Register fetch failed (${res.status})`);
    const sourceUrl = res.headers.get('x-sponsor-source') || DATA_URL;
    const sourceDate = res.headers.get('x-sponsor-register-date') || res.headers.get('last-modified') || new Date().toISOString();
    return { text: await res.text(), sourceUrl, sourceDate };
  }

  async function rebuild(db) {
    const { text, sourceUrl, sourceDate } = await fetchRegister();
    const data = normalize(parseCSV(text));
    if (!data.organisations.length) throw new Error('Official register returned no organisations');
    const meta = { key: META_KEY, routes: data.routes, licenceCount: data.licenceCount, sourceUrl, sourceDate, updatedAt: new Date().toISOString(), stale: false };
    const tx = db.transaction(['organisations', 'meta'], 'readwrite');
    const store = tx.objectStore('organisations');
    store.clear();
    for (const org of data.organisations) store.put(org);
    tx.objectStore('meta').put(meta);
    await txDone(tx);
    return readAll(db, meta);
  }

  async function cachedMeta(db) {
    const tx = db.transaction('meta', 'readonly');
    const meta = await reqP(tx.objectStore('meta').get(META_KEY));
    await txDone(tx);
    return meta;
  }

  window.SponsorDB = {
    async open() {
      if (openPromise) return openPromise;
      openPromise = (async () => {
        const db = await openIDB();
        const meta = await cachedMeta(db);
        const fresh = meta?.updatedAt && (Date.now() - new Date(meta.updatedAt).valueOf()) < REFRESH_MS;
        if (fresh) return readAll(db, meta);
        try { return await rebuild(db); }
        catch (err) {
          if (meta) return readAll(db, { ...meta, stale: true });
          throw err;
        }
      })();
      return openPromise;
    },
    async refresh() {
      openPromise = (async () => rebuild(await openIDB()))();
      return openPromise;
    }
  };
})();