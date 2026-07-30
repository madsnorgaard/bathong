const { Frame, Tag, Button, EssayStrip } = window.BathongDesignSystem_45a193;
const PH = '../../assets/photos/johannesburg/';

function StoryOverlay({ story, onClose }) {
  if (!story) return null;
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'color-mix(in srgb, var(--ink) 88%, transparent)',overflowY:'auto',padding:'22px'}}>
      <div onClick={(e)=>e.stopPropagation()} style={{maxWidth:1000,margin:'40px auto',background:'var(--paper)',border:'2px solid var(--ink)',boxShadow:'var(--shadow-print-jacaranda)',padding:'26px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:20}}>
          <div>
            <Tag>{story.tag}</Tag>
            <h2 className="b-display-1" style={{fontSize:'2.4rem',marginTop:12}}>{story.title}<span style={{color:'var(--jacaranda)'}}>.</span></h2>
            <p className="b-caption" style={{marginTop:8}}>{story.label} · Photographs © Mads Nørgaard</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close ✕</Button>
        </div>
        <p style={{maxWidth:'62ch',marginTop:18,fontSize:'1rem',color:'var(--grey-ink)'}}>{story.text}</p>
        <div style={{marginTop:22}}>
          <EssayStrip credit="Mads Nørgaard" frames={[
            {src:PH+'doc-0001.jpg'},{src:PH+'doc-0013-portrait.jpg',ratio:'4/5'},{src:PH+'doc-0012.jpg'},
            {src:PH+'doc-0016.jpg'},{src:PH+'street-0002.jpg'},{src:PH+'doc-0024.jpg'}
          ]} />
        </div>
        <p className="b-caption" style={{marginTop:16}}>Essay unit: 12-20 frames, sequenced. Six shown.</p>
      </div>
    </div>
  );
}

function WebApp() {
  const [story, setStory] = React.useState(null);
  const [booked, setBooked] = React.useState(false);
  const go = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 56, behavior: 'smooth' });
  };
  return (
    <>
      <WebNav onNav={go} />
      <WebHero onNav={go} />
      <WebManifesto />
      <WebStories onOpen={setStory} />
      <WebWalks onBook={()=>setBooked(true)} booked={booked} />
      <WebMembership />
      <WebExhibitions />
      <WebCollective />
      <WebSubmit />
      <WebFooter onNav={go} />
      <StoryOverlay story={story} onClose={()=>setStory(null)} />
    </>
  );
}
Object.assign(window, { WebApp, StoryOverlay });
