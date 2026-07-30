const { SectionHead, Card, Button, RuledList, MemberCard } = window.BathongDesignSystem_45a193;

function WebWalks({ onBook, booked }) {
  const progs = [
    ['W/01','Monthly photowalks','A new route through Pretoria every month - planned like an assignment, ending in a group edit. Free or discounted for members.'],
    ['W/02','Rooftop sessions','Sunrise and sunset access to closed rooftops - beginning with the Voortrekker Monument, in partnership with the Press Club NPC.'],
    ['W/03','Everyone shoots','Inclusive workshops built with our members - including a programme for children with disabilities, led from lived experience. Photography belongs to every body.']
  ];
  return (
    <section className="w-sec on-jacaranda" id="walks">
      <SectionHead title="Walks &amp; Workshops" index="03 / Where skill is built" dotColor="var(--paper)" />
      <Card className="w-walkfeat" style={{padding:30}}>
        <div className="date">29<br />Aug<small>Saturday · 2026</small></div>
        <div>
          <h3>Photowalk № 1 - The Layers Route</h3>
          <p>One morning, three strata of the capital: rooftops for the big view, Salvokop for the in-between, Marabastad for the street itself. Shoot with working photographers, end with a group edit - your best frame critiqued, sequenced and considered for publication.</p>
          <p className="route">Rooftops → Salvokop → Marabastad · Limited places · Members priority</p>
        </div>
        <Button onClick={onBook} style={{whiteSpace:'nowrap'}}>{booked ? 'Place held ✓' : 'Reserve a place →'}</Button>
      </Card>
      <div className="w-prog">
        {progs.map(([n,t,p]) => <div key={n}><span className="num">{n}</span><h4>{t}</h4><p>{p}</p></div>)}
      </div>
    </section>
  );
}

function WebMembership() {
  return (
    <section className="w-sec" id="membership">
      <SectionHead title="Membership" index="04 / Anyone can join" />
      <div className="w-mem">
        <RuledList items={[
          {num:'B/01',label:'Workshops & monthly photowalks',note:'Member pricing on every event, priority booking on limited-access shoots.'},
          {num:'B/02',label:'Photocalls & publication',note:'Submit to themed calls - selected work is published on the Bathong platform with full credit.'},
          {num:'B/03',label:'The newsletter',note:"Assignments, critique notes, opportunities and the collective's calendar, monthly."},
          {num:'B/04',label:'Exhibitions',note:'A real chance to show work on walls - collective shows, NPC-supported projects, and beyond.'},
          {num:'B/05',label:'Community & mentorship',note:'Group edits, portfolio reviews and honest critique from photographers who show up.'}
        ]} />
        <MemberCard style={{position:'sticky',top:90}} />
      </div>
    </section>
  );
}
Object.assign(window, { WebWalks, WebMembership });
