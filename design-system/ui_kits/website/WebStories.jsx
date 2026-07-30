const { SectionHead, DictionaryCard, Frame } = window.BathongDesignSystem_45a193;
const P = '../../assets/photos/johannesburg/';

function WebManifesto() {
  return (
    <section className="w-sec on-ink" id="manifesto">
      <SectionHead title="Manifesto" index="01 / Why we exist" dotColor="var(--signal)" />
      <div className="w-man">
        <div>
          <p className="big">Photography is not taken <em>of</em> a city. It is made <mark>among its people</mark> - on its pavements, rooftops and taxi ranks, in its first and last light.</p>
          <DictionaryCard style={{marginTop:28}} />
        </div>
        <div className="cols">
          <p><strong>We are a collective, not a club.</strong> Our reference is the great photography cooperatives - photographers owning their work, their standards and their platform together, publishing photo stories that outlive the scroll.</p>
          <p><strong>We build skill.</strong> Every walk is a working session. Every workshop moves you from taking pictures to telling stories: shooting, editing, sequencing, printing, exhibiting.</p>
          <p><strong>We build community.</strong> Grown from Street Photography South Africa and Pretoria street photography - thousands of followers becoming a working body of photographers. Anyone can join. Everyone is expected to grow.</p>
          <p><strong>We start in Pitori and speak to the world.</strong> The capital's layers - Marabastad to the Monument, Salvokop to Church Square - photographed by the people who live them.</p>
        </div>
      </div>
    </section>
  );
}

function WebStories({ onOpen }) {
  const stories = [
    { wide:true, img:'street-0005.jpg', tag:'Photocall open', label:'Essay 001 · demo frame', title:'Marabastad, Still Here',
      text:"A century of trade, demolition and return. The first Bathong photo essay walks the block where Pretoria has always been most itself - made by members, edited together, published here.", byline:'Open call - members · Deadline TBC' },
    { img:'street-0001.jpg', tag:'In progress', label:'Essay 002 · rooftop series', title:'Above the Capital',
      text:'Shot from roofs the public never reaches - starting with the Voortrekker Monument at first light.', byline:'With the Press Club NPC' },
    { img:'street-0003.jpg', tag:'NPC funded', label:'Essay 003 · exhibition track', title:'Arrivals - Stories of Immigration',
      text:'Who comes to Pretoria, and what they carry. A documentary project heading for the wall, not just the feed.', byline:'In development · Exhibition 2026/27' }
  ];
  return (
    <section className="w-sec" id="stories">
      <SectionHead title="Photo Stories" index="02 / The work comes first" />
      <div className="w-stories">
        {stories.map((s,i) => (
          <a key={i} className={'w-story' + (s.wide ? ' wide' : '')} onClick={(e)=>{e.preventDefault();onOpen(s);}} href="#stories">
            <Frame src={P+s.img} ratio={s.wide ? '21/9' : '3/2'} tag={s.tag} label={s.label} credit="Mads Nørgaard" />
            <h3>{s.title}</h3><p>{s.text}</p><span className="byline">{s.byline}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
Object.assign(window, { WebManifesto, WebStories });
