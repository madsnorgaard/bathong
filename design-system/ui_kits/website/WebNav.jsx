const { Wordmark } = window.BathongDesignSystem_45a193;

function WebNav({ onNav }) {
  const [open, setOpen] = React.useState(false);
  const items = [['Manifesto','manifesto'],['Stories','stories'],['Walks & Workshops','walks'],['Membership','membership'],['Exhibitions','exhibit'],['Collective','collective']];
  const go = (id) => (e) => { e.preventDefault(); setOpen(false); onNav(id); };
  return (
    <nav className="w-nav">
      <a href="#top" onClick={go('top')} style={{textDecoration:'none'}}><Wordmark size="sm" /></a>
      <button className="w-burger" onClick={() => setOpen(o => !o)}>Menu</button>
      <ul className={open ? 'open' : ''}>
        {items.map(([label,id]) => <li key={id}><a href={'#'+id} onClick={go(id)}>{label}</a></li>)}
        <li><a className="join" href="#membership" onClick={go('membership')}>Join</a></li>
      </ul>
    </nav>
  );
}
Object.assign(window, { WebNav });
