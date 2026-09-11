(async () => {
  const root = document.getElementById('employerRoot');
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const id = new URLSearchParams(location.search).get('id') || '';
  const formatDate = (raw) => {
    if (!raw) return 'Latest available register';
    const d = new Date(raw);
    if (Number.isNaN(d.valueOf())) return raw;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  };

  try {
    const data = await SponsorDB.open();
    const e = data.byId.get(String(id));
    if (!e) {
      root.innerHTML = '<section class="detailHero"><div class="shell"><a class="back" href="../index.html#directory">← Back to sponsor directory</a><h1 class="detailHeading">Employer not found.</h1><p class="sub">The employer identifier may come from an older SponsorAtlas version. Search the current directory by organisation name.</p></div></section>';
      return;
    }

    document.title = `${e.organisation_name} — SponsorAtlas`;
    const locationText = [e.town_city, e.county].filter(Boolean).join(', ') || 'United Kingdom';
    const govSearch = 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers';
    const chSearch = `https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(e.organisation_name)}`;
    const mapSearch = `https://www.openstreetmap.org/search?query=${encodeURIComponent(locationText)}`;
    const webSearch = `https://www.google.com/search?q=${encodeURIComponent(`"${e.organisation_name}" ${locationText}`)}`;
    const licences = e.licences.map((l) => `<div class="license"><div class="org">${esc(l.route || 'Sponsor licence')}</div><div class="sub">${esc(l.type_rating || 'Rating not stated')}</div></div>`).join('');
    const tags = [...new Set(e.licences.map((l) => l.route).filter(Boolean))].map((route) => `<span class="pill">${esc(route)}</span>`).join('');

    root.innerHTML = `
      <section class="detailHero"><div class="shell">
        <a class="back" href="../index.html#directory">← Back to sponsor directory</a>
        <div class="detailTitle"><div>
          <span class="eyebrow">Official sponsor-register record</span>
          <h1 class="detailHeading mt16">${esc(e.organisation_name)}</h1>
          <div class="detailMeta"><span class="pill">${esc(locationText)}</span>${tags}<span class="pill official">Listed on GOV.UK</span></div>
        </div></div>
      </div></section>
      <div class="shell detailGrid">
        <div class="detailMain">
          <section class="card"><h2>Sponsor licences</h2>${licences || '<p class="sub">No route details were present in this register row.</p>'}</section>
          <section class="card"><h2>Company verification</h2>
            <p class="sub">The sponsor register identifies licensed organisations, not necessarily the exact Companies House entity behind every trading name. Use the organisation name below as a starting point and confirm the legal entity before relying on a match.</p>
            <div class="actionList"><a class="actionLink" href="${chSearch}" target="_blank" rel="noopener noreferrer"><span>Search Companies House</span><span aria-hidden="true">↗</span></a></div>
          </section>
          <section class="card"><h2>Web and vacancies</h2>
            <p class="sub">Sponsor status does not imply that an employer is currently hiring or that a particular vacancy qualifies for sponsorship.</p>
            <div class="actionList"><a class="actionLink" href="${webSearch}" target="_blank" rel="noopener noreferrer"><span>Search the organisation on the web</span><span aria-hidden="true">↗</span></a><a class="actionLink" href="${govSearch}" target="_blank" rel="noopener noreferrer"><span>Open the official sponsor register</span><span aria-hidden="true">↗</span></a></div>
          </section>
        </div>
        <aside class="detailAside">
          <section class="card"><h2>Location</h2><div class="locationPanel"><strong>${esc(locationText)}</strong><p>Location as published in the sponsor register. It may differ from a registered office or hiring location.</p><a class="btn" href="${mapSearch}" target="_blank" rel="noopener noreferrer">View on OpenStreetMap ↗</a></div></section>
          <section class="card"><h2>Data provenance</h2>
            <div class="kv oneCol"><span class="k">SponsorAtlas ID</span><strong>${esc(e.organisation_id)}</strong></div>
            <div class="kv oneCol"><span class="k">Register date</span><strong>${esc(formatDate(data.sourceDate))}</strong></div>
            <div class="kv oneCol"><span class="k">Authoritative source</span><strong>UK Visas and Immigration</strong></div>
            <p class="sub provenance">Organisation name, published location, route and sponsorship rating are taken from the official Worker and Temporary Worker register. Companies House, map and web links are separate discovery aids.</p>
          </section>
        </aside>
      </div>`;
  } catch (err) {
    console.error(err);
    root.innerHTML = '<section class="detailHero"><div class="shell"><a class="back" href="../index.html#directory">← Back to sponsor directory</a><h1 class="detailHeading">Unable to load employer data.</h1><p class="sub">The official register could not be loaded. Reload to retry.</p></div></section>';
  }
})();