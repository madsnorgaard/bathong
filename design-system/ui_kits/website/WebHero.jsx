const { Wordmark, Kicker, Ticker } = window.BathongDesignSystem_45a193;

function WebHero({ onNav }) {
  const doors = [['01 - Build','Join the collective','membership'],['02 - Engage · 29 Aug','Walk with us','walks'],['03 - Show','Submit your work','submit']];
  return (
    <>
      <header className="w-hero" id="top">
        <Kicker chip="Pitori · 012">Street &amp; documentary photography collective - Pretoria, South Africa</Kicker>
        <Wordmark size="hero" as="h1" />
        <div className="w-hero-sub">
          <p className="b-lede">The word you say out loud when the street shows you something unbelievable. We build photographers who are there when it happens.</p>
          <p className="translate">ba·thong - Sepedi / Setswana. Literally <em>among the people</em>. Colloquially: an exclamation of astonishment. Both meanings intended.</p>
        </div>
        <div className="w-cta">
          {doors.map(([n,t,id]) => (
            <a key={id} href={'#'+id} onClick={(e)=>{e.preventDefault();onNav(id);}}>
              <span className="n">{n}</span><span className="t">{t}</span><span className="arrow">→</span>
            </a>
          ))}
        </div>
      </header>
      <Ticker items={['Bathong!','Among the people','Pitori','012','Next walk 29 Aug','Rooftops','Salvokop','Marabastad','Photo stories','Workshops','Exhibitions']} />
    </>
  );
}
Object.assign(window, { WebHero });
