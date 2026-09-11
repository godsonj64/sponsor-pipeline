(async () => {
  const root = document.getElementById('employerRoot');
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const idRaw = new URLSearchParams(location.search).get('id') || '';

  function prettyDate(value) {
    if (!value) return '—';
    const d = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  }

  function externalLinks(e) {
    const q = encodeURIComponent(e.organisation_name);
    const loc = encodeURIComponent([e.organisation_name, e.town_city, e.county].filter(Boolean).join(', '));
    return `
      <a class="btn dark" href="https://www.google.com/search?q=${q}+careers" target="_blank" rel="noopener noreferrer">Search careers ↗</a>
      <a class="btn" href="https://find-and-update.company-information.service.gov.uk/search/companies?q=${q}" target="_blank" rel="noopener noreferrer">Companies House ↗</a>
      <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${loc}" target="_blank" rel="noopener noreferrer">Open location ↗</a>`;
  }

  try {
    const data = await SponsorDB.open();
    const legacy = /^\d+$/.test(idRaw) ? Number(idRaw) : NaN;
    const e = data.byId.get(idRaw) || (!Number.isNaN(legacy) ? data.byLegacy.get(legacy) : null);

    if (!e) {
      root.innerHTML = `<section class="detailHero"><div class="shell"><a class="back" href="/#directory">← Back to sponsor directory</a><span class="eyebrow">Employer profile</span><h1 class="detailHeading">Employer not found.</h1><p class="heroCopy">The organisation may have left the register or the profile link may be invalid.</p></div></section>`;
      return;
    }

    if (idRaw !== String(e.organisation_id)) {
      history.replaceState(null, '', `/employers?id=${encodeURIComponent(e.organisation_id)}`);
    }

    document.title = `${e.organisation_name} — SponsorAtlas`;
    const licences = e.licences.map(l => `
      <div class="license">
        <div class="licenseTitle">${esc(l.route || 'Sponsor licence')}</div>
        <div class="sub">${esc(l.type_rating || 'Rating not specified')}</div>
      </div>`).join('');
    const tags = [...new Set(e.licences.map(l => l.route).filter(Boolean))].map(r => `<span class="pill">${esc(r)}</span>`).join('');
    const location = [e.town_city, e.county && e.county !== 'Not set' ? e.county : ''].filter(Boolean).join(', ') || 'United Kingdom';
    const sourceUrl = data.sourceUrl || 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers';

    root.innerHTML = `
      <section class="detailHero">
        <div class="shell">
          <a class="back" href="/#directory">← Back to sponsor directory</a>
          <div class="detailTitle">
            <div>
              <span class="eyebrow">Official sponsor-register profile</span>
              <h1 class="detailHeading">${esc(e.organisation_name)}</h1>
              <div class="detailMeta">
                <span class="pill official">Listed on official register</span>
                <span class="pill">${esc(location)}</span>
                ${tags}
              </div>
              <div class="detailActions">${externalLinks(e)}</div>
            </div>
          </div>
        </div>
      </section>

      <div class="shell detailGrid">
        <div class="detailMain">
          <section class="card">
            <h2>Licensed routes</h2>
            ${licences || '<p>No route details were supplied in this register row.</p>'}
          </section>

          <section class="card">
            <h2>What this listing means</h2>
            <div class="notice">This organisation appears on the UK Visas and Immigration Worker and Temporary Worker sponsor register. A sponsor licence does not mean every vacancy is eligible for sponsorship, that the employer is currently hiring, or that sponsorship will be offered to every eligible candidate.</div>
          </section>

          <section class="card">
            <h2>Next checks before applying</h2>
            <p>Confirm that the vacancy is current, check whether its occupation and salary meet the relevant visa rules, and verify the employer’s own sponsorship policy. SponsorAtlas deliberately keeps these separate from the authoritative register fields.</p>
            <div class="detailActions">${externalLinks(e)}</div>
          </section>
        </div>

        <aside class="detailAside">
          <section class="card">
            <h2>Employer details</h2>
            <div class="kv"><span class="k">Organisation</span><strong>${esc(e.organisation_name)}</strong></div>
            <div class="kv"><span class="k">Town / city</span><strong>${esc(e.town_city || 'Not specified')}</strong></div>
            <div class="kv"><span class="k">County</span><strong>${esc(e.county || 'Not specified')}</strong></div>
            <div class="kv"><span class="k">Stable SponsorAtlas ID</span><strong>${esc(e.organisation_id)}</strong></div>
          </section>

          <section class="card">
            <h2>Data provenance</h2>
            <div class="kv"><span class="k">Register snapshot</span><strong>${esc(prettyDate(data.updated || e.source_snapshot_date))}</strong></div>
            <div class="kv"><span class="k">Publisher</span><strong>UK Visas and Immigration</strong></div>
            <div class="kv"><span class="k">Source</span><a class="sourceLink" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">Official GOV.UK CSV ↗</a></div>
          </section>
        </aside>
      </div>`;
  } catch (err) {
    console.error(err);
    root.innerHTML = '<section class="detailHero"><div class="shell"><a class="back" href="/#directory">← Back to sponsor directory</a><span class="eyebrow">Employer profile</span><h1 class="detailHeading">Unable to load employer data.</h1><p class="heroCopy">Reload the page to try again.</p></div></section>';
  }
})();
