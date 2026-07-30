/* @ds-bundle: {"format":4,"namespace":"BathongDesignSystem_45a193","components":[{"name":"DictionaryCard","sourcePath":"components/brand/DictionaryCard.jsx"},{"name":"PunchDot","sourcePath":"components/brand/PunchDot.jsx"},{"name":"Ticker","sourcePath":"components/brand/Ticker.jsx"},{"name":"Wordmark","sourcePath":"components/brand/Wordmark.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Kicker","sourcePath":"components/core/Kicker.jsx"},{"name":"MemberCard","sourcePath":"components/core/MemberCard.jsx"},{"name":"RuledList","sourcePath":"components/core/RuledList.jsx"},{"name":"SectionHead","sourcePath":"components/core/SectionHead.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"EssayStrip","sourcePath":"components/media/EssayStrip.jsx"},{"name":"Frame","sourcePath":"components/media/Frame.jsx"}],"sourceHashes":{"components/brand/DictionaryCard.jsx":"f8cb1fadd7a2","components/brand/PunchDot.jsx":"cde81db77935","components/brand/Ticker.jsx":"771d5d42a433","components/brand/Wordmark.jsx":"bd5aa108a331","components/core/Button.jsx":"e7a5eda9958b","components/core/Card.jsx":"8c534eab88f5","components/core/Kicker.jsx":"930a282123b9","components/core/MemberCard.jsx":"b103ce55d008","components/core/RuledList.jsx":"39acdae00f1e","components/core/SectionHead.jsx":"11aee25f5e07","components/core/Tag.jsx":"2740f20e4020","components/forms/Field.jsx":"c8609be3e4af","components/media/EssayStrip.jsx":"bc8c233e797a","components/media/Frame.jsx":"86f35eda1103","ui_kits/website/WebApp.jsx":"8e68dd8d9cc8","ui_kits/website/WebArchive.jsx":"7e9812fa0f0c","ui_kits/website/WebHero.jsx":"168eea0e9000","ui_kits/website/WebNav.jsx":"2b3ba19480c2","ui_kits/website/WebProgramme.jsx":"483bed18c02d","ui_kits/website/WebStories.jsx":"cebd8c5b20e4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.BathongDesignSystem_45a193 = window.BathongDesignSystem_45a193 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/DictionaryCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The definition device. Explains the name without a paragraph of copy.
   Works as an Instagram slide, wall text, tote, the back of the membership card. */
function DictionaryCard({
  entry = 'bathong!',
  pos = 'excl. / loc.',
  senses = ["what you say when you can't believe what you're seeing.", 'ba-tho-ng: among the people - where this work is made.', 'a collective of photographers from Pretoria, for the world.'],
  surface = 'ink',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: 'b-dict' + (surface === 'paper' ? ' b-dict--paper' : ''),
    style: style
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "entry"
  }, entry), " ", /*#__PURE__*/React.createElement("span", {
    className: "pos"
  }, pos), senses.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, i + 1, ". ", s)));
}
Object.assign(__ds_scope, { DictionaryCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/DictionaryCard.jsx", error: String((e && e.message) || e) }); }

// components/brand/PunchDot.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The full stop, cut loose. Avatar, watermark, section punctuation. */
function PunchDot({
  size = 44,
  variant = 'dot',
  color = 'var(--jacaranda)',
  style,
  ...rest
}) {
  if (variant === 'avatar') {
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: 'var(--ink)',
        ...style
      }
    }, rest), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        width: size * 0.34,
        height: size * 0.34,
        background: color
      }
    }));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      background: color,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { PunchDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/PunchDot.jsx", error: String((e && e.message) || e) }); }

// components/brand/Ticker.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The street shouting. Mono, uppercase, wide-tracked, signal bullets.
   Items are duplicated internally so the -50% loop is seamless. */
function Ticker({
  items = ['Bathong!', 'Among the people', 'Pitori', '012', 'Next walk 29 Aug', 'Rooftops', 'Salvokop', 'Marabastad'],
  speed = 26,
  style,
  ...rest
}) {
  const run = items.map((t, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, t, " ", /*#__PURE__*/React.createElement("b", null, "\u25CF"), ' '));
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "b-ticker",
    "aria-hidden": "true",
    style: style
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "track",
    style: {
      animationDuration: speed + 's'
    }
  }, run, run));
}
Object.assign(__ds_scope, { Ticker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Ticker.jsx", error: String((e && e.message) || e) }); }

// components/brand/Wordmark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* BATHONG. - the wordmark. Archivo Black, uppercase, tight, jacaranda full stop.
   Never set in another typeface. Never with an exclamation mark. */
function Wordmark({
  size = 'md',
  as = 'span',
  href,
  dotColor,
  style,
  ...rest
}) {
  const sizes = {
    hero: 'var(--text-mark)',
    xl: 'clamp(3rem,10vw,7rem)',
    lg: '2.6rem',
    md: '1.9rem',
    sm: '1.25rem'
  };
  const Tag = href ? 'a' : as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: 'b-mark' + (size === 'hero' ? ' b-mark--hero' : ''),
    href: href,
    style: {
      fontSize: size === 'hero' ? undefined : sizes[size] || size,
      ...style
    }
  }, rest), "Bathong", /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: dotColor ? {
      color: dotColor
    } : undefined
  }, "."));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Archivo Black, uppercase, 2px ink border, hard 15/22 padding.
   Default ink fill flips to signal on hover. */
function Button({
  variant = 'solid',
  size = 'md',
  href,
  children,
  className = '',
  ...rest
}) {
  const cls = ['b-btn', variant === 'signal' && 'b-btn--signal', variant === 'ghost' && 'b-btn--ghost', size === 'sm' && 'b-btn--sm', className].filter(Boolean).join(' ');
  if (href) return /*#__PURE__*/React.createElement("a", _extends({
    className: cls,
    href: href
  }, rest), children);
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    type: "button"
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The print card: paper on colour, hard 10px ink offset shadow, square corners. */
function Card({
  children,
  className = '',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: 'b-card ' + className,
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Kicker.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The mono lead-in: an inverted chip plus a line of plain caps. */
function Kicker({
  chip,
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("p", _extends({
    className: 'b-kicker ' + className
  }, rest), chip ? /*#__PURE__*/React.createElement("b", null, chip) : null, chip ? '  ' : '', children);
}
Object.assign(__ds_scope, { Kicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Kicker.jsx", error: String((e && e.message) || e) }); }

// components/core/MemberCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The membership card: ink with a jacaranda offset shadow. Price may read 'R -' while TBC. */
function MemberCard({
  number = 'Member № 0001 · Pitori · 012',
  price = 'R -',
  priceNote = 'Launch pricing announced soon · anyone can join',
  cta = 'Become a member →',
  ctaHref = 'mailto:hello@bathong.co.za?subject=Membership%20-%20count%20me%20in',
  footnote = 'Membership cards supported by the Press Club NPC',
  className = '',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: 'b-card--member ' + className,
    style: style
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    size: "lg",
    style: {
      fontSize: '1.9rem'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "card-line"
  }, number), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '2.4rem',
      margin: '22px 0 2px',
      lineHeight: 1
    }
  }, price, priceNote ? /*#__PURE__*/React.createElement("small", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-mono)',
      fontSize: '.7rem',
      letterSpacing: '.14em',
      color: 'var(--signal)',
      marginTop: 6,
      lineHeight: 1.5
    }
  }, priceNote) : null), cta ? /*#__PURE__*/React.createElement("a", {
    href: ctaHref,
    style: {
      display: 'block',
      textAlign: 'center',
      background: 'var(--signal)',
      color: 'var(--ink)',
      textDecoration: 'none',
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      padding: 15,
      marginTop: 22,
      border: '2px solid var(--signal)',
      transition: '.18s ease'
    }
  }, cta) : null, footnote ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      paddingTop: 16,
      borderTop: '1px solid var(--grey-line)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-micro)',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'var(--grey-ghost)'
    }
  }, footnote) : null);
}
Object.assign(__ds_scope, { MemberCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MemberCard.jsx", error: String((e && e.message) || e) }); }

// components/core/RuledList.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Frame-width rules between rows. Mono index, display-weight label, muted sub-line. */
function RuledList({
  items = [],
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("ul", _extends({
    className: 'b-ruled ' + className
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, it.num ? /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, it.num) : null, /*#__PURE__*/React.createElement("div", null, it.label, it.note ? /*#__PURE__*/React.createElement("small", null, it.note) : null))));
}
Object.assign(__ds_scope, { RuledList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/RuledList.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionHead.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Display title with a jacaranda punch-dot, baseline-aligned with an archive index. */
function SectionHead({
  title,
  index,
  dotColor,
  level = 2,
  className = '',
  ...rest
}) {
  const H = 'h' + level;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: 'b-sechead ' + className
  }, rest), /*#__PURE__*/React.createElement(H, {
    className: "b-display-1"
  }, title, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      color: dotColor || 'var(--jacaranda)'
    }
  }, ".")), index ? /*#__PURE__*/React.createElement("span", {
    className: "idx"
  }, index) : null);
}
Object.assign(__ds_scope, { SectionHead });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHead.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The signal chip: photocall status, 'NPC funded', open calls. Mono micro caps. */
function Tag({
  variant = 'signal',
  children,
  className = '',
  ...rest
}) {
  const cls = ['b-tag', variant === 'ink' && 'b-tag--ink', variant === 'outline' && 'b-tag--outline', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mono input, 2px ink border, uppercase placeholder, jacaranda focus ring. */
function Field({
  label,
  as = 'input',
  rows = 4,
  className = '',
  id,
  ...rest
}) {
  const El = as === 'textarea' ? 'textarea' : 'input';
  const fieldId = id || (label ? 'f-' + String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);
  return /*#__PURE__*/React.createElement("div", null, label ? /*#__PURE__*/React.createElement("label", {
    className: "b-label",
    htmlFor: fieldId
  }, label) : null, /*#__PURE__*/React.createElement(El, _extends({
    id: fieldId,
    className: 'b-field ' + className,
    rows: as === 'textarea' ? rows : undefined
  }, rest)));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/media/Frame.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Every photograph lives in one. 2px ink border, mono caption bar, credit.
   The photograph is shown as shot - brand colour stays in the furniture. */
function Frame({
  src,
  alt = '',
  ratio = '3/2',
  tag,
  label,
  credit,
  className = '',
  style,
  children,
  ...rest
}) {
  const ratioCls = {
    '21/9': ' b-frame--wide',
    '4/5': ' b-frame--tall',
    '1/1': ' b-frame--square'
  }[ratio] || '';
  return /*#__PURE__*/React.createElement("figure", _extends({
    className: 'b-frame' + ratioCls + ' ' + className,
    role: "group",
    "aria-label": alt,
    style: {
      backgroundImage: src ? `url("${src}")` : undefined,
      backgroundColor: src ? undefined : 'var(--paper-dim)',
      ...style
    }
  }, rest), src ? null : /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-micro)',
      letterSpacing: 'var(--track-label)',
      textTransform: 'uppercase',
      color: 'var(--grey-warm)'
    }
  }, "Photo slot"), tag ? /*#__PURE__*/React.createElement(__ds_scope.Tag, null, tag) : null, children, label || credit ? /*#__PURE__*/React.createElement("figcaption", null, /*#__PURE__*/React.createElement("span", null, label), credit ? /*#__PURE__*/React.createElement("cite", {
    className: "b-credit"
  }, credit) : null) : null);
}
Object.assign(__ds_scope, { Frame });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/Frame.jsx", error: String((e && e.message) || e) }); }

// components/media/EssayStrip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* A sequenced run of frames - the essay is the unit: 12-20 frames, in order.
   Horizontal contact-sheet scroll, numbered in mono. */
function EssayStrip({
  frames = [],
  startAt = 1,
  credit,
  className = '',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      overflowX: 'auto',
      paddingBottom: 'var(--space-2)',
      ...style
    }
  }, rest), frames.map((fr, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: '0 0 auto',
      width: fr.ratio === '4/5' ? 260 : 380
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Frame, {
    src: fr.src,
    ratio: fr.ratio || '3/2',
    label: String(startAt + i).padStart(2, '0') + ' / ' + String(frames.length).padStart(2, '0'),
    credit: fr.credit || credit
  }))));
}
Object.assign(__ds_scope, { EssayStrip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/EssayStrip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/WebApp.jsx
try { (() => {
const {
  Frame,
  Tag,
  Button,
  EssayStrip
} = window.BathongDesignSystem_45a193;
const PH = '../../assets/photos/johannesburg/';
function StoryOverlay({
  story,
  onClose
}) {
  if (!story) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'color-mix(in srgb, var(--ink) 88%, transparent)',
      overflowY: 'auto',
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      maxWidth: 1000,
      margin: '40px auto',
      background: 'var(--paper)',
      border: '2px solid var(--ink)',
      boxShadow: 'var(--shadow-print-jacaranda)',
      padding: '26px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tag, null, story.tag), /*#__PURE__*/React.createElement("h2", {
    className: "b-display-1",
    style: {
      fontSize: '2.4rem',
      marginTop: 12
    }
  }, story.title, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--jacaranda)'
    }
  }, ".")), /*#__PURE__*/React.createElement("p", {
    className: "b-caption",
    style: {
      marginTop: 8
    }
  }, story.label, " \xB7 Photographs \xA9 Mads N\xF8rgaard")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: onClose
  }, "Close \u2715")), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: '62ch',
      marginTop: 18,
      fontSize: '1rem',
      color: 'var(--grey-ink)'
    }
  }, story.text), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(EssayStrip, {
    credit: "Mads N\xF8rgaard",
    frames: [{
      src: PH + 'doc-0001.jpg'
    }, {
      src: PH + 'doc-0013-portrait.jpg',
      ratio: '4/5'
    }, {
      src: PH + 'doc-0012.jpg'
    }, {
      src: PH + 'doc-0016.jpg'
    }, {
      src: PH + 'street-0002.jpg'
    }, {
      src: PH + 'doc-0024.jpg'
    }]
  })), /*#__PURE__*/React.createElement("p", {
    className: "b-caption",
    style: {
      marginTop: 16
    }
  }, "Essay unit: 12-20 frames, sequenced. Six shown.")));
}
function WebApp() {
  const [story, setStory] = React.useState(null);
  const [booked, setBooked] = React.useState(false);
  const go = id => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({
      top: el.offsetTop - 56,
      behavior: 'smooth'
    });
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(WebNav, {
    onNav: go
  }), /*#__PURE__*/React.createElement(WebHero, {
    onNav: go
  }), /*#__PURE__*/React.createElement(WebManifesto, null), /*#__PURE__*/React.createElement(WebStories, {
    onOpen: setStory
  }), /*#__PURE__*/React.createElement(WebWalks, {
    onBook: () => setBooked(true),
    booked: booked
  }), /*#__PURE__*/React.createElement(WebMembership, null), /*#__PURE__*/React.createElement(WebExhibitions, null), /*#__PURE__*/React.createElement(WebCollective, null), /*#__PURE__*/React.createElement(WebSubmit, null), /*#__PURE__*/React.createElement(WebFooter, {
    onNav: go
  }), /*#__PURE__*/React.createElement(StoryOverlay, {
    story: story,
    onClose: () => setStory(null)
  }));
}
Object.assign(window, {
  WebApp,
  StoryOverlay
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WebApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/WebArchive.jsx
try { (() => {
const {
  SectionHead,
  Field,
  Button,
  Tag,
  Wordmark
} = window.BathongDesignSystem_45a193;
function WebExhibitions() {
  const rows = [['2026/27', 'Arrivals - Stories of Immigration', 'A documentary exhibition on migration and the capital, developed with NPC funding. Members shoot, edit and hang the show together.', 'In development'], ['TBC', 'Press Club Exhibition', "A collective showcase with the Press Club - Pretoria's photographers on Pretoria's walls.", 'In conversation'], ['Ongoing', 'The Open Archive', 'Every photocall builds the Bathong archive - a growing, member-made record of the city, published story by story.', 'Always open']];
  return /*#__PURE__*/React.createElement("section", {
    className: "w-sec on-ink",
    id: "exhibit"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Exhibitions",
    index: "05 / From feed to wall",
    dotColor: "var(--signal)"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-ex"
  }, rows.map(([y, t, p, s]) => /*#__PURE__*/React.createElement("div", {
    className: "w-ex-item",
    key: t
  }, /*#__PURE__*/React.createElement("span", {
    className: "year"
  }, y), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, t), /*#__PURE__*/React.createElement("p", null, p)), /*#__PURE__*/React.createElement("span", {
    className: "status"
  }, s)))));
}
function WebCollective() {
  const people = [['Man-e', 'Community & partnerships', "Founder of Pretoria's street photography movement pages; the connector between photographers, venues and the Press Club."], ['Alet', 'Operations & exhibitions', 'Keeps the collective standing - structure, finance, presentations, and the discipline behind the shows.'], ['Jacques', 'Photowalks & routes', 'Plans the walks like assignments - routes, light, access, pacing.'], ['Mads', 'Digital & photography', 'Street Photography South Africa; brand, platform and the photographic standard of what gets published.']];
  return /*#__PURE__*/React.createElement("section", {
    className: "w-sec",
    id: "collective"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "The Collective",
    index: "06 / Among the people"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-people"
  }, people.map(([n, r, b]) => /*#__PURE__*/React.createElement("div", {
    className: "w-person",
    key: n
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, n), /*#__PURE__*/React.createElement("span", {
    className: "role"
  }, r)), /*#__PURE__*/React.createElement("p", null, b)))), /*#__PURE__*/React.createElement("div", {
    className: "w-lineage"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Where we come from"), /*#__PURE__*/React.createElement("p", null, "Born from Street Photography South Africa and the Pretoria street photography community - pages followed by thousands, now growing into a working collective with a platform of its own.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Where we're going"), /*#__PURE__*/React.createElement("p", null, "A member-owned body publishing photo stories, running workshops and hanging exhibitions - rooted in Pitori, in conversation with the world."))));
}
function WebSubmit() {
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    className: "w-sec",
    id: "submit",
    style: {
      background: 'var(--signal)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Submit",
    index: "07 / Show us what you saw",
    dotColor: "var(--jacaranda-deep)"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-submit"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-rules"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "Open photocall")), /*#__PURE__*/React.createElement("p", null, "\u2192 Street & documentary work, made in South Africa"), /*#__PURE__*/React.createElement("p", null, "\u2192 Singles or series (max 12 frames)"), /*#__PURE__*/React.createElement("p", null, "\u2192 Selected work published with full credit"), /*#__PURE__*/React.createElement("p", null, "\u2192 Standout contributors invited to walks, workshops & exhibitions"), /*#__PURE__*/React.createElement("p", null, "\u2192 You keep your copyright. Always.")), sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      border: '2px solid var(--ink)',
      background: 'var(--paper)',
      padding: 26
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    variant: "ink"
  }, "Received"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      fontSize: '1.4rem',
      lineHeight: 1,
      margin: '14px 0 10px'
    }
  }, "Bathong! We'll be in touch."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '.7rem',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--grey-ink)'
    }
  }, "We reply to every submission - with notes, frame by frame.")) : /*#__PURE__*/React.createElement("form", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    },
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    }
  }, /*#__PURE__*/React.createElement(Field, {
    name: "name",
    placeholder: "NAME",
    required: true
  }), /*#__PURE__*/React.createElement(Field, {
    name: "email",
    type: "email",
    placeholder: "EMAIL",
    required: true
  }), /*#__PURE__*/React.createElement(Field, {
    name: "ig",
    placeholder: "INSTAGRAM / PORTFOLIO LINK"
  }), /*#__PURE__*/React.createElement(Field, {
    as: "textarea",
    name: "note",
    rows: 4,
    placeholder: "TELL US ABOUT THE WORK (OR WHICH CALL YOU'RE ANSWERING)"
  }), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    onClick: () => {}
  }, "Send it - Bathong! \u2192"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '.68rem',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--grey-ink)'
    }
  }, "Opens your mail app \xB7 attach nothing yet - we'll reply with upload details"))));
}
function WebFooter({
  onNav
}) {
  const cols = [['Collective', [['Manifesto', 'manifesto'], ['Photo stories', 'stories'], ['Exhibitions', 'exhibit'], ['People', 'collective']]], ['Do', [['Join', 'membership'], ['Photowalks & workshops', 'walks'], ['Submit work', 'submit'], ['Newsletter', 'submit']]]];
  return /*#__PURE__*/React.createElement("footer", {
    className: "w-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mark"
  }, "Bathong", /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, ".")), /*#__PURE__*/React.createElement("div", {
    className: "w-foot-grid"
  }, cols.map(([h, links]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("h5", null, h), links.map(([l, id]) => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: '#' + id,
    onClick: e => {
      e.preventDefault();
      onNav(id);
    }
  }, l)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, "Find us"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Instagram - @bathong.collective"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Facebook - Street Photography South Africa"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:hello@bathong.co.za"
  }, "hello@bathong.co.za"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Pretoria \xB7 South Africa \xB7 012"))), /*#__PURE__*/React.createElement("div", {
    className: "w-legal"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Bathong Collective \xB7 Pretoria"), /*#__PURE__*/React.createElement("span", null, "Supported by the Press Club NPC"), /*#__PURE__*/React.createElement("span", null, "Bathong! - among the people")));
}
Object.assign(window, {
  WebExhibitions,
  WebCollective,
  WebSubmit,
  WebFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WebArchive.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/WebHero.jsx
try { (() => {
const {
  Wordmark,
  Kicker,
  Ticker
} = window.BathongDesignSystem_45a193;
function WebHero({
  onNav
}) {
  const doors = [['01 - Build', 'Join the collective', 'membership'], ['02 - Engage · 29 Aug', 'Walk with us', 'walks'], ['03 - Show', 'Submit your work', 'submit']];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("header", {
    className: "w-hero",
    id: "top"
  }, /*#__PURE__*/React.createElement(Kicker, {
    chip: "Pitori \xB7 012"
  }, "Street & documentary photography collective - Pretoria, South Africa"), /*#__PURE__*/React.createElement(Wordmark, {
    size: "hero",
    as: "h1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-hero-sub"
  }, /*#__PURE__*/React.createElement("p", {
    className: "b-lede"
  }, "The word you say out loud when the street shows you something unbelievable. We build photographers who are there when it happens."), /*#__PURE__*/React.createElement("p", {
    className: "translate"
  }, "ba\xB7thong - Sepedi / Setswana. Literally ", /*#__PURE__*/React.createElement("em", null, "among the people"), ". Colloquially: an exclamation of astonishment. Both meanings intended.")), /*#__PURE__*/React.createElement("div", {
    className: "w-cta"
  }, doors.map(([n, t, id]) => /*#__PURE__*/React.createElement("a", {
    key: id,
    href: '#' + id,
    onClick: e => {
      e.preventDefault();
      onNav(id);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, n), /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, t), /*#__PURE__*/React.createElement("span", {
    className: "arrow"
  }, "\u2192"))))), /*#__PURE__*/React.createElement(Ticker, {
    items: ['Bathong!', 'Among the people', 'Pitori', '012', 'Next walk 29 Aug', 'Rooftops', 'Salvokop', 'Marabastad', 'Photo stories', 'Workshops', 'Exhibitions']
  }));
}
Object.assign(window, {
  WebHero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WebHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/WebNav.jsx
try { (() => {
const {
  Wordmark
} = window.BathongDesignSystem_45a193;
function WebNav({
  onNav
}) {
  const [open, setOpen] = React.useState(false);
  const items = [['Manifesto', 'manifesto'], ['Stories', 'stories'], ['Walks & Workshops', 'walks'], ['Membership', 'membership'], ['Exhibitions', 'exhibit'], ['Collective', 'collective']];
  const go = id => e => {
    e.preventDefault();
    setOpen(false);
    onNav(id);
  };
  return /*#__PURE__*/React.createElement("nav", {
    className: "w-nav"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    onClick: go('top'),
    style: {
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: "sm"
  })), /*#__PURE__*/React.createElement("button", {
    className: "w-burger",
    onClick: () => setOpen(o => !o)
  }, "Menu"), /*#__PURE__*/React.createElement("ul", {
    className: open ? 'open' : ''
  }, items.map(([label, id]) => /*#__PURE__*/React.createElement("li", {
    key: id
  }, /*#__PURE__*/React.createElement("a", {
    href: '#' + id,
    onClick: go(id)
  }, label))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    className: "join",
    href: "#membership",
    onClick: go('membership')
  }, "Join"))));
}
Object.assign(window, {
  WebNav
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WebNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/WebProgramme.jsx
try { (() => {
const {
  SectionHead,
  Card,
  Button,
  RuledList,
  MemberCard
} = window.BathongDesignSystem_45a193;
function WebWalks({
  onBook,
  booked
}) {
  const progs = [['W/01', 'Monthly photowalks', 'A new route through Pretoria every month - planned like an assignment, ending in a group edit. Free or discounted for members.'], ['W/02', 'Rooftop sessions', 'Sunrise and sunset access to closed rooftops - beginning with the Voortrekker Monument, in partnership with the Press Club NPC.'], ['W/03', 'Everyone shoots', 'Inclusive workshops built with our members - including a programme for children with disabilities, led from lived experience. Photography belongs to every body.']];
  return /*#__PURE__*/React.createElement("section", {
    className: "w-sec on-jacaranda",
    id: "walks"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Walks & Workshops",
    index: "03 / Where skill is built",
    dotColor: "var(--paper)"
  }), /*#__PURE__*/React.createElement(Card, {
    className: "w-walkfeat",
    style: {
      padding: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "date"
  }, "29", /*#__PURE__*/React.createElement("br", null), "Aug", /*#__PURE__*/React.createElement("small", null, "Saturday \xB7 2026")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Photowalk \u2116 1 - The Layers Route"), /*#__PURE__*/React.createElement("p", null, "One morning, three strata of the capital: rooftops for the big view, Salvokop for the in-between, Marabastad for the street itself. Shoot with working photographers, end with a group edit - your best frame critiqued, sequenced and considered for publication."), /*#__PURE__*/React.createElement("p", {
    className: "route"
  }, "Rooftops \u2192 Salvokop \u2192 Marabastad \xB7 Limited places \xB7 Members priority")), /*#__PURE__*/React.createElement(Button, {
    onClick: onBook,
    style: {
      whiteSpace: 'nowrap'
    }
  }, booked ? 'Place held ✓' : 'Reserve a place →')), /*#__PURE__*/React.createElement("div", {
    className: "w-prog"
  }, progs.map(([n, t, p]) => /*#__PURE__*/React.createElement("div", {
    key: n
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, n), /*#__PURE__*/React.createElement("h4", null, t), /*#__PURE__*/React.createElement("p", null, p)))));
}
function WebMembership() {
  return /*#__PURE__*/React.createElement("section", {
    className: "w-sec",
    id: "membership"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Membership",
    index: "04 / Anyone can join"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-mem"
  }, /*#__PURE__*/React.createElement(RuledList, {
    items: [{
      num: 'B/01',
      label: 'Workshops & monthly photowalks',
      note: 'Member pricing on every event, priority booking on limited-access shoots.'
    }, {
      num: 'B/02',
      label: 'Photocalls & publication',
      note: 'Submit to themed calls - selected work is published on the Bathong platform with full credit.'
    }, {
      num: 'B/03',
      label: 'The newsletter',
      note: "Assignments, critique notes, opportunities and the collective's calendar, monthly."
    }, {
      num: 'B/04',
      label: 'Exhibitions',
      note: 'A real chance to show work on walls - collective shows, NPC-supported projects, and beyond.'
    }, {
      num: 'B/05',
      label: 'Community & mentorship',
      note: 'Group edits, portfolio reviews and honest critique from photographers who show up.'
    }]
  }), /*#__PURE__*/React.createElement(MemberCard, {
    style: {
      position: 'sticky',
      top: 90
    }
  })));
}
Object.assign(window, {
  WebWalks,
  WebMembership
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WebProgramme.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/WebStories.jsx
try { (() => {
const {
  SectionHead,
  DictionaryCard,
  Frame
} = window.BathongDesignSystem_45a193;
const P = '../../assets/photos/johannesburg/';
function WebManifesto() {
  return /*#__PURE__*/React.createElement("section", {
    className: "w-sec on-ink",
    id: "manifesto"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Manifesto",
    index: "01 / Why we exist",
    dotColor: "var(--signal)"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-man"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "big"
  }, "Photography is not taken ", /*#__PURE__*/React.createElement("em", null, "of"), " a city. It is made ", /*#__PURE__*/React.createElement("mark", null, "among its people"), " - on its pavements, rooftops and taxi ranks, in its first and last light."), /*#__PURE__*/React.createElement(DictionaryCard, {
    style: {
      marginTop: 28
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "We are a collective, not a club."), " Our reference is the great photography cooperatives - photographers owning their work, their standards and their platform together, publishing photo stories that outlive the scroll."), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "We build skill."), " Every walk is a working session. Every workshop moves you from taking pictures to telling stories: shooting, editing, sequencing, printing, exhibiting."), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "We build community."), " Grown from Street Photography South Africa and Pretoria street photography - thousands of followers becoming a working body of photographers. Anyone can join. Everyone is expected to grow."), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "We start in Pitori and speak to the world."), " The capital's layers - Marabastad to the Monument, Salvokop to Church Square - photographed by the people who live them."))));
}
function WebStories({
  onOpen
}) {
  const stories = [{
    wide: true,
    img: 'street-0005.jpg',
    tag: 'Photocall open',
    label: 'Essay 001 · demo frame',
    title: 'Marabastad, Still Here',
    text: "A century of trade, demolition and return. The first Bathong photo essay walks the block where Pretoria has always been most itself - made by members, edited together, published here.",
    byline: 'Open call - members · Deadline TBC'
  }, {
    img: 'street-0001.jpg',
    tag: 'In progress',
    label: 'Essay 002 · rooftop series',
    title: 'Above the Capital',
    text: 'Shot from roofs the public never reaches - starting with the Voortrekker Monument at first light.',
    byline: 'With the Press Club NPC'
  }, {
    img: 'street-0003.jpg',
    tag: 'NPC funded',
    label: 'Essay 003 · exhibition track',
    title: 'Arrivals - Stories of Immigration',
    text: 'Who comes to Pretoria, and what they carry. A documentary project heading for the wall, not just the feed.',
    byline: 'In development · Exhibition 2026/27'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "w-sec",
    id: "stories"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Photo Stories",
    index: "02 / The work comes first"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-stories"
  }, stories.map((s, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    className: 'w-story' + (s.wide ? ' wide' : ''),
    onClick: e => {
      e.preventDefault();
      onOpen(s);
    },
    href: "#stories"
  }, /*#__PURE__*/React.createElement(Frame, {
    src: P + s.img,
    ratio: s.wide ? '21/9' : '3/2',
    tag: s.tag,
    label: s.label,
    credit: "Mads N\xF8rgaard"
  }), /*#__PURE__*/React.createElement("h3", null, s.title), /*#__PURE__*/React.createElement("p", null, s.text), /*#__PURE__*/React.createElement("span", {
    className: "byline"
  }, s.byline)))));
}
Object.assign(window, {
  WebManifesto,
  WebStories
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WebStories.jsx", error: String((e && e.message) || e) }); }

__ds_ns.DictionaryCard = __ds_scope.DictionaryCard;

__ds_ns.PunchDot = __ds_scope.PunchDot;

__ds_ns.Ticker = __ds_scope.Ticker;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Kicker = __ds_scope.Kicker;

__ds_ns.MemberCard = __ds_scope.MemberCard;

__ds_ns.RuledList = __ds_scope.RuledList;

__ds_ns.SectionHead = __ds_scope.SectionHead;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.EssayStrip = __ds_scope.EssayStrip;

__ds_ns.Frame = __ds_scope.Frame;

})();
