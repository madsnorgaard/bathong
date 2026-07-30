The only form control in the system - used by the photocall submission form and the newsletter signup.

```jsx
<Field label="Name" name="name" placeholder="NAME" required />
<Field as="textarea" name="note" placeholder="TELL US ABOUT THE WORK" rows={4} />
```

Placeholders are set in uppercase (the CSS enforces it) and read as instructions, not examples. The focus ring is a 3px jacaranda outline - never remove it.
