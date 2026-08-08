The single container for every photograph in the system. Use it for essay grids, story cards, hero frames and archive rows.

```jsx
<Frame src="assets/photos/johannesburg/street-0001.jpg" ratio="21/9"
  tag="Photocall open" label="Essay 001 · Marabastad" credit="Mads Nørgaard" />
<Frame ratio="4/5" label="Frame 04/12" credit="Member name" />   {/* empty = PHOTO SLOT */}
```

Non-negotiables: the `credit` prop is always filled (the `©` is added for you), the photograph is never tinted or filtered by the brand, and no colour is laid over the image - tags and captions carry it instead. Grids keep generous gaps (`--space-3` to `--space-4`).
