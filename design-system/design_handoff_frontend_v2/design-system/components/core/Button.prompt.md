The one button in the system - display type, uppercase, square corners, 2px ink border.

```jsx
<Button href="#walks">Reserve a place →</Button>
<Button variant="signal" href="#join">Become a member →</Button>
<Button variant="ghost" size="sm">Read the essay</Button>
```

Reserve `variant="signal"` for the membership CTA - signal is a 2% colour. On ink surfaces use `ghost` (it inherits a paper border via `.on-ink`). Labels are short and imperative, often ending in `→`.
