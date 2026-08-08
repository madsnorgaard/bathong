Lays a photo essay out as a sequenced, numbered contact-sheet strip - sequence is the story, so order matters more than size.

```jsx
<EssayStrip credit="Mads Nørgaard" frames={[
  { src: 'assets/photos/johannesburg/street-0001.jpg' },
  { src: 'assets/photos/johannesburg/doc-0013-portrait.jpg', ratio: '4/5' }
]} />
```

Intentional addition (not in the source stylesheet): the brief specifies the essay as the platform's core unit but the v1 site had no essay view yet. Frame numbering runs `04 / 12`, in mono.
