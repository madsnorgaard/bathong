const { SectionHead, Field, Button, Tag, Wordmark } = window.BathongDesignSystem_45a193;

function WebExhibitions() {
  const rows = [
    ['2026/27','Arrivals - Stories of Immigration','A documentary exhibition on migration and the capital, developed with NPC funding. Members shoot, edit and hang the show together.','In development'],
    ['TBC','Press Club Exhibition',"A collective showcase with the Press Club - Pretoria's photographers on Pretoria's walls.",'In conversation'],
    ['Ongoing','The Open Archive','Every photocall builds the Bathong archive - a growing, member-made record of the city, published story by story.','Always open']
  ];
  return (
    <section className="w-sec on-ink" id="exhibit">
      <SectionHead title="Exhibitions" index="05 / From feed to wall" dotColor="var(--signal)" />
      <div className="w-ex">
        {rows.map(([y,t,p,s]) => (
          <div className="w-ex-item" key={t}>
            <span className="year">{y}</span>
            <div><h3>{t}</h3><p>{p}</p></div>
            <span className="status">{s}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WebCollective() {
  const people = [
    ['Man-e','Community & partnerships',"Founder of Pretoria's street photography movement pages; the connector between photographers, venues and the Press Club."],
    ['Alet','Operations & exhibitions','Keeps the collective standing - structure, finance, presentations, and the discipline behind the shows.'],
    ['Jacques','Photowalks & routes','Plans the walks like assignments - routes, light, access, pacing.'],
    ['Mads','Digital & photography','Street Photography South Africa; brand, platform and the photographic standard of what gets published.']
  ];
  return (
    <section className="w-sec" id="collective">
      <SectionHead title="The Collective" index="06 / Among the people" />
      <div className="w-people">
        {people.map(([n,r,b]) => (
          <div className="w-person" key={n}><div><h4>{n}</h4><span className="role">{r}</span></div><p>{b}</p></div>
        ))}
      </div>
      <div className="w-lineage">
        <div><h4>Where we come from</h4><p>Born from Street Photography South Africa and the Pretoria street photography community - pages followed by thousands, now growing into a working collective with a platform of its own.</p></div>
        <div><h4>Where we're going</h4><p>A member-owned body publishing photo stories, running workshops and hanging exhibitions - rooted in Pitori, in conversation with the world.</p></div>
      </div>
    </section>
  );
}

function WebSubmit() {
  const [sent, setSent] = React.useState(false);
  return (
    <section className="w-sec" id="submit" style={{background:'var(--signal)'}}>
      <SectionHead title="Submit" index="07 / Show us what you saw" dotColor="var(--jacaranda-deep)" />
      <div className="w-submit">
        <div className="w-rules">
          <p><b>Open photocall</b></p>
          <p>→ Street &amp; documentary work, made in South Africa</p>
          <p>→ Singles or series (max 12 frames)</p>
          <p>→ Selected work published with full credit</p>
          <p>→ Standout contributors invited to walks, workshops &amp; exhibitions</p>
          <p>→ You keep your copyright. Always.</p>
        </div>
        {sent ? (
          <div style={{border:'2px solid var(--ink)',background:'var(--paper)',padding:26}}>
            <Tag variant="ink">Received</Tag>
            <p style={{fontFamily:'var(--font-display)',textTransform:'uppercase',fontSize:'1.4rem',lineHeight:1,margin:'14px 0 10px'}}>Bathong! We'll be in touch.</p>
            <p style={{fontFamily:'var(--font-mono)',fontSize:'.7rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--grey-ink)'}}>We reply to every submission - with notes, frame by frame.</p>
          </div>
        ) : (
          <form style={{display:'flex',flexDirection:'column',gap:14}} onSubmit={(e)=>{e.preventDefault();setSent(true);}}>
            <Field name="name" placeholder="NAME" required />
            <Field name="email" type="email" placeholder="EMAIL" required />
            <Field name="ig" placeholder="INSTAGRAM / PORTFOLIO LINK" />
            <Field as="textarea" name="note" rows={4} placeholder="TELL US ABOUT THE WORK (OR WHICH CALL YOU'RE ANSWERING)" />
            <Button type="submit" onClick={()=>{}}>Send it - Bathong! →</Button>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--grey-ink)'}}>Opens your mail app · attach nothing yet - we'll reply with upload details</span>
          </form>
        )}
      </div>
    </section>
  );
}

function WebFooter({ onNav }) {
  const cols = [
    ['Collective',[['Manifesto','manifesto'],['Photo stories','stories'],['Exhibitions','exhibit'],['People','collective']]],
    ['Do',[['Join','membership'],['Photowalks & workshops','walks'],['Submit work','submit'],['Newsletter','submit']]]
  ];
  return (
    <footer className="w-foot">
      <div className="mark">Bathong<span className="dot">.</span></div>
      <div className="w-foot-grid">
        {cols.map(([h,links]) => (
          <div key={h}><h5>{h}</h5>{links.map(([l,id]) => <a key={l} href={'#'+id} onClick={(e)=>{e.preventDefault();onNav(id);}}>{l}</a>)}</div>
        ))}
        <div><h5>Find us</h5>
          <a href="#">Instagram - @bathong.collective</a>
          <a href="#">Facebook - Street Photography South Africa</a>
          <a href="mailto:hello@bathong.co.za">hello@bathong.co.za</a>
          <a href="#">Pretoria · South Africa · 012</a>
        </div>
      </div>
      <div className="w-legal">
        <span>© 2026 Bathong Collective · Pretoria</span>
        <span>Supported by the Press Club NPC</span>
        <span>Bathong! - among the people</span>
      </div>
    </footer>
  );
}
Object.assign(window, { WebExhibitions, WebCollective, WebSubmit, WebFooter });
