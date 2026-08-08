A full-width ink strip of scrolling collective shorthand - sits directly under the hero, between sections, or above the footer.

```jsx
<Ticker items={['Bathong!', 'Photocall open', 'Marabastad, still here']} speed={26} />
```

This is a *voice* surface, so `Bathong!` with the exclamation belongs here. Always uppercase in rendering (the CSS handles it), always mono. Respects `prefers-reduced-motion` by stopping.
