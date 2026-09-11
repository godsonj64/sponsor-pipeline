(() => {
  const state = { q: '', town: '', route: '', sort: 'name', page: 1, pageSize: 20, total: 0, data: null };
  const $ = id => document.getElementById(id);
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const fmt = new Intl.NumberFormat('en-GB');

  function prettyDate(value) {
    if (!value) return '—';
    const d = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  }

  function readURL() {
    const p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.town = p.get('town') || '';
    state.route = p.get('route') || '';
    state.sort = ['name', 'town', 'routes'].includes(p.get('sort')) ? p.get('sort') : 'name';
    state.page = Math.max(1, Number(p.get('page')) || 1);
    state.pageSize = [20, 50, 100].includes(Number(p.get('size'))) ? Number(p.get('size')) : 20;
  }

  function writeURL() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.town) p.set('town', state.town);
    if (state.route) p.set('route', state.route);
    if (state.sort !== 'name') p.set('sort', state.sort);
    if (state.page > 1) p.set('page', String(state.page));
    if (state.pageSize !== 20) p.set('size', String(state.pageSize));
    const qs = p.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  }

  function filtered() {
    const qTokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const townTokens = state.town.toLowerCase().split(/\s+/).filter(Boolean);
    const items = state.data.organisations.filter(e => {
      const nameMatch = !qTokens.length || qTokens.every(t => e._name.includes(t));
      const townMatch = !townTokens.length || townTokens.every(t => e._town.includes(t));
      const routeMatch = !state.route || e.licences.some(l => l.route === state.route);
      return nameMatch && townMatch && routeMatch;
    });

    items.sort((a, b) => {
      if (state.sort === 'town') {
        return (a.town_city || 'ZZZZ').localeCompare(b.town_city || 'ZZZZ') || a.organisation_name.localeCompare(b.organisation_name);
      }
      if (state.sort === 'routes') {
        return b.licences.length - a.licences.length || a.organisation_name.localeCompare(b.organisation_name);
      }
      return a.organisation_name.localeCompare(b.organisation_name);
    });
    return items;
  }

  function renderRoutes(e) {
    const unique = [...new Set(e.licences.map(l => l.route).filter(Boolean))];
    const shown = unique.slice(0, 2).map(r => `<span class="pill">${esc(r)}</span>`).join('');
    const more = unique.length > 2 ? `<span class="pill">+${unique.length - 2}</span>` : '';
    return shown + more || '<span class="pill">Sponsor licence</span>';
  }

  function activeFilterText() {
    const bits = [];
    if (state.q) bits.push(`employer: “${state.q}”`);
    if (state.town) bits.push(`location: “${state.town}”`);
    if (state.route) bits.push(`route: ${state.route}`);
    return bits.length ? bits.join(' · ') : 'Showing the full register';
  }

  function render() {
    const all = filtered();
    state.total = all.length;
    const pages = Math.max(1, Math.ceil(all.length / state.pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.pageSize;
    const items = all.slice(start, start + state.pageSize);

    $('resultCount').textContent = `${fmt.format(all.length)} matching employers`;
    $('activeFilters').textContent = activeFilterText();
    $('pageInfo').textContent = `Page ${fmt.format(state.page)} of ${fmt.format(pages)} · ${fmt.format(all.length)} results`;
    $('prev').disabled = state.page <= 1;
    $('next').disabled = state.page >= pages;

    $('rows').innerHTML = items.length ? items.map(e => `
      <a class="row" href="/employers?id=${encodeURIComponent(e.organisation_id)}">
        <div>
          <div class="org">${esc(e.organisation_name)}</div>
          <div class="sub">Stable ID ${esc(e.organisation_id)}</div>
          <div class="mobileMeta">
            <span class="pill">${esc(e.town_city || e.county || 'United Kingdom')}</span>
            ${renderRoutes(e)}
          </div>
        </div>
        <div>
          <div>${esc(e.town_city || '—')}</div>
          <div class="sub">${esc(e.county && e.county !== 'Not set' ? e.county : 'United Kingdom')}</div>
        </div>
        <div class="routeStack">${renderRoutes(e)}</div>
        <span class="pill official">Official register</span>
        <span class="arrow">›</span>
      </a>`).join('') : `
      <div class="emptyState">
        <strong>No employers found</strong>
        <span>Try a broader employer name, location, or visa route.</span>
      </div>`;

    writeURL();
  }

  function sync(resetPage = true) {
    state.q = $('q').value.trim();
    state.town = $('town').value.trim();
    state.route = $('route').value;
    state.sort = $('sort').value;
    state.pageSize = Number($('pageSize').value);
    if (resetPage) state.page = 1;
    render();
  }

  function populateInputs() {
    $('q').value = state.q;
    $('town').value = state.town;
    $('sort').value = state.sort;
    $('pageSize').value = String(state.pageSize);
  }

  async function init() {
    readURL();
    populateInputs();
    try {
      $('resultCount').textContent = 'Loading official sponsor register…';
      state.data = await SponsorDB.open();
      $('route').insertAdjacentHTML('beforeend', state.data.routes.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join(''));
      $('route').value = state.data.routes.includes(state.route) ? state.route : '';
      state.route = $('route').value;
      document.querySelectorAll('[data-org-count]').forEach(el => el.textContent = fmt.format(state.data.organisations.length));
      document.querySelectorAll('[data-licence-count]').forEach(el => el.textContent = fmt.format(state.data.licenceCount));
      document.querySelectorAll('[data-updated]').forEach(el => el.textContent = prettyDate(state.data.updated));
      render();
    } catch (err) {
      console.error(err);
      $('resultCount').textContent = 'Unable to initialise sponsor database';
      $('rows').innerHTML = '<div class="emptyState"><strong>Register unavailable</strong><span>The official GOV.UK register could not be loaded. Reload the page to try again.</span></div>';
    }
  }

  let timer;
  ['q', 'town'].forEach(id => {
    $(id).addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => sync(true), 240);
    });
    $(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') { clearTimeout(timer); sync(true); }
    });
  });

  $('route').addEventListener('change', () => sync(true));
  $('sort').addEventListener('change', () => sync(true));
  $('pageSize').addEventListener('change', () => sync(true));
  $('searchButton').addEventListener('click', () => sync(true));
  $('clearFilters').addEventListener('click', () => {
    $('q').value = '';
    $('town').value = '';
    $('route').value = '';
    state.page = 1;
    sync(true);
  });
  $('prev').addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      render();
      document.querySelector('#directory').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  $('next').addEventListener('click', () => {
    const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page < pages) {
      state.page++;
      render();
      document.querySelector('#directory').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  window.addEventListener('popstate', () => {
    readURL();
    populateInputs();
    if (state.data) render();
  });

  init();
})();
