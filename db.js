(() => {
  const DB_NAME = 'SponsorAtlasRegister';
  const DB_VERSION = 2;
  const META_KEY = 'snapshot';
  let openPromise;

  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (db.objectStoreNames.contains('organisations')) db.deleteObjectStore('organisations');
        const store = db.createObjectStore('organisations', { keyPath: 'organisation_id' });
        store.createIndex('name', '_name');
        store.createIndex('town', '_town');
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function reqP(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
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

  function stableId(key) {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    const mask = 0xffffffffffffffffn;
    for (let i = 0; i < key.length; i++) {
      hash ^= BigInt(key.charCodeAt(i));
      hash = (hash * prime) & mask;
    }
    return `sa_${hash.toString(16).padStart(16, '0')}`;
  }

  async function fetchMeta() {
    const res = await fetch('/api/register?meta=1', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Register metadata failed (${res.status})`);
    return res.json();
  }

  async function fetchRegister() {
    const res = await fetch('/api/register', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Register fetch failed (${res.status})`);
    return {
      text: await res.text(),
      updated: res.headers.get('x-sponsor-updated') || '',
      sourceUrl: res.headers.get('x-sponsor-source') || ''
    };
  }

  function normalize(rows, snapshot) {
    if (!rows.length) return { organisations: [], routes: [], licenceCount: 0 };
    const header = rows[0].map(x => x.replace(/^\uFEFF/, '').trim().toLowerCase());
    const col = (...names) => {
      for (const n of names) {
        const i = header.indexOf(n);
        if (i >= 0) return i;
      }
      return -1;
    };
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

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const name = (r[oi] || '').trim();
      if (!name) continue;
      const town = ti >= 0 ? (r[ti] || '').trim() : '';
      const county = ci >= 0 ? (r[ci] || '').trim() : '';
      const route = (r[ri] || '').trim();
      const typeRating = yi >= 0 ? (r[yi] || '').trim() : '';
      const key = `${name}\u0000${town}\u0000${county}`;
      let org = byKey.get(key);

      if (!org) {
        org = {
          organisation_id: stableId(key),
          legacy_id: organisations.length + 1,
          organisation_name: name,
          town_city: town,
          county,
          source_snapshot_date: snapshot,
          _name: name.toLowerCase(),
          _town: `${town} ${county}`.toLowerCase(),
          licences: []
        };
        byKey.set(key, org);
        organisations.push(org);
      }

      if (route || typeRating) {
        if (!org.licences.some(l => l.route === route && l.type_rating === typeRating)) {
          org.licences.push({ route, type_rating: typeRating });
          licenceCount++;
        }
        if (route) routes.add(route);
      }
    }

    return {
      organisations,
      routes: [...routes].sort((a, b) => a.localeCompare(b)),
      licenceCount
    };
  }

  async function readAll(db) {
    const tx = db.transaction(['organisations', 'meta'], 'readonly');
    const organisations = await reqP(tx.objectStore('organisations').getAll());
    const meta = await reqP(tx.objectStore('meta').get(META_KEY));
    await txDone(tx);
    return {
      organisations,
      byId: new Map(organisations.map(o => [String(o.organisation_id), o])),
      byLegacy: new Map(organisations.map(o => [Number(o.legacy_id), o])),
      routes: meta?.routes || [],
      licenceCount: meta?.licenceCount || 0,
      updated: meta?.snapshot || '',
      sourceUrl: meta?.sourceUrl || ''
    };
  }

  async function rebuild(db, knownMeta) {
    const response = await fetchRegister();
    const snapshot = response.updated || knownMeta?.updated || new Date().toISOString().slice(0, 10);
    const data = normalize(parseCSV(response.text), snapshot);
    const tx = db.transaction(['organisations', 'meta'], 'readwrite');
    const store = tx.objectStore('organisations');
    store.clear();
    for (const org of data.organisations) store.put(org);
    tx.objectStore('meta').put({
      key: META_KEY,
      snapshot,
      routes: data.routes,
      licenceCount: data.licenceCount,
      sourceUrl: response.sourceUrl || knownMeta?.sourceUrl || '',
      updatedAt: new Date().toISOString()
    });
    await txDone(tx);
    return readAll(db);
  }

  window.SponsorDB = {
    async open() {
      if (openPromise) return openPromise;
      openPromise = (async () => {
        const db = await openIDB();
        const tx = db.transaction('meta', 'readonly');
        const cached = await reqP(tx.objectStore('meta').get(META_KEY));
        await txDone(tx);

        try {
          const latest = await fetchMeta();
          if (!cached || !cached.snapshot || cached.snapshot !== latest.updated) return rebuild(db, latest);
          return readAll(db);
        } catch (err) {
          if (cached?.snapshot) return readAll(db);
          throw err;
        }
      })();
      return openPromise;
    },
    async refresh() {
      openPromise = (async () => rebuild(await openIDB(), await fetchMeta().catch(() => null)))();
      return openPromise;
    }
  };
})();
