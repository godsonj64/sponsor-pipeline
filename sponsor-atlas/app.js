(() => {
  const PAGE_SIZE = 20;
  const state = { q: '', town: '', route: '', sort: 'name', page: 1, total: 0, data: null };
  const $ = (id) => document.getElementById(id);
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const fmt = new Intl.NumberFormat('en-GB');

  function readURL() {
    const p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.town = p.get('town') || '';
    state.route = p.get('route') || '';
    state.sort = p.get('sort') === 'town' ? 'town' : 'name';
    state.page = Math.max(1, Number.parseInt(p.get('page') || '1', 10) || 1);
    $('q').value = state.q;
    $('town').value = state.town;
    $('route').value = state.route;
    $('sort').value = state.sort;
  }

  function writeURL() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.town) p.set('town', state.town);
    if (state.route) p.set('route', state.route);
    if (state.sort !== 'name') p.set('sort', state.sort);
    if (state.page > 1) p.set('page', String(state.page));
    const next = `${location.pathname}${p.size ? `?${p}` : ''}${location.hash}`;
    history.replaceState(null, '', next);
  }

  function hasFilters() { return Boolean(state.q || state.town || state.route || state.sort !== 'name'); }

  function filtered() {
    const q = state.q.toLocaleLowerCase();
    const town = state.town.toLocaleLowerCase();
    let items = state.data.organisations;
    if (q) items = items.filter((e) => e._name.includes(q));
    if (town) items = items.filter((e) => e._town.includes(town));
    if (state.route) items = items.filter((e) => e.licences.some((l) => l.route === state.route));
    if (state.sort === 'town') {
      items = [...items].sort((a, b) => (a.town_city || 'ZZZZ').localeCompare(b.town_city || 'ZZZZ') || a.organisation_name.localeCompare(b.organisation_name));
    }
    return items;
  }

  function routeSummary(e) {
    const routes = [...new Set(e.licences.map((l) => l.route).filter(Boolean))];
    if (!routes.length) return 'Sponsor licence';
    return routes.length === 1 ? routes[0] : `${routes[0]} +${routes.length - 1} more`;
  }

  function render() {
    if (!state.data) return;
    const all = filtered();
    state.total = all.length;
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const items = all.slice(start, start + PAGE_SIZE);

    $('resultCount').textContent = `${fmt.format(all.length)} matching employer${all.length === 1 ? '' : 's'}`;
    $('pageInfo').textContent = `Page ${fmt.format(state.page)} of ${fmt.format(pages)}`;
    $('prev').disabled = state.page <= 1;
    $('next').disabled = state.page >= pages;
    $('clearFilters').hidden = !hasFilters();

    $('rows').innerHTML = items.length ? items.map((e) => {
      const route = routeSummary(e);
      const location = [e.town_city, e.county].filter(Boolean).join(', ') || 'United Kingdom';
      return `<a class="row" href="./employers/?id=${encodeURIComponent(e.organisation_id)}" aria-label="Open ${esc(e.organisation_name)}">
        <div><div class="org">${esc(e.organisation_name)}</div><div class="sub">SponsorAtlas ID ${esc(e.organisation_id)}</div><div class="mobileMeta"><span class="pill">${esc(route)}</span><span class="pill official">Official register</span></div></div>
        <div class="locationCell"><div>${esc(e.town_city || 'United Kingdom')}</div><div class="sub">${esc(e.county || '')}</div></div>
        <span class="pill routeCell">${esc(route)}</span>
        <span class="pill official sourceCell">Official register</span>
        <span class="arrow" aria-hidden="true">›</span>
      </a>`;
    }).join('') : '<div class="emptyState"><strong>No employers found</strong><span>Try a broader employer name, location or visa route.</span></div>';

    $('rows').setAttribute('aria-busy', 'false');
    writeURL();
  }

  function syncFromControls(resetPage = true) {
    state.q = $('q').value.trim();
    state.town = $('town').value.trim();
    state.route = $('route').value;
    state.sort = $('sort').value;
    if (resetPage) state.page = 1;
    render();
  }

  function displayDate(raw) {
    if (!raw) return 'latest available';
    const d = new Date(raw);
    if (Number.isNaN(d.valueOf())) return raw;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  }

  async function init() {
    try {
      $('rows').innerHTML = '<div class="loadingRows">Building the directory from the official register…</div>';
      state.data = await SponsorDB.open();
      $('route').insertAdjacentHTML('beforeend', state.data.routes.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join(''));
      readURL();
      document.querySelectorAll('[data-org-count]').forEach((el) => { el.textContent = fmt.format(state.data.organisations.length); });
      document.querySelectorAll('[data-licence-count]').forEach((el) => { el.textContent = fmt.format(state.data.licenceCount); });
      const sourceDate = displayDate(state.data.sourceDate);
      document.querySelectorAll('[data-snapshot-date]').forEach((el) => { el.textContent = sourceDate; });
      render();
    } catch (err) {
      console.error(err);
      $('resultCount').textContent = 'Unable to initialise sponsor database';
      $('rows').setAttribute('aria-busy', 'false');
      $('rows').innerHTML = '<div class="emptyState"><strong>Official register unavailable</strong><span>Reload to retry. SponsorAtlas does not substitute unofficial sponsor data when the source cannot be reached.</span></div>';
    }
  }

  let timer;
  ['q', 'town'].forEach((id) => $(id).addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => syncFromControls(true), 240);
  }));
  $('route').addEventListener('change', () => syncFromControls(true));
  $('sort').addEventListener('change', () => syncFromControls(true));
  $('searchForm').addEventListener('submit', (event) => { event.preventDefault(); syncFromControls(true); document.querySelector('#directory').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('clearFilters').addEventListener('click', () => {
    $('q').value = ''; $('town').value = ''; $('route').value = ''; $('sort').value = 'name';
    syncFromControls(true);
  });
  $('prev').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; render(); document.querySelector('#directory').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  $('next').addEventListener('click', () => { const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE)); if (state.page < pages) { state.page += 1; render(); document.querySelector('#directory').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  addEventListener('popstate', () => { if (state.data) { readURL(); render(); } });

  init();
})();