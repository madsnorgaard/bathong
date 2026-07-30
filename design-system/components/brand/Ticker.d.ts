/** The marquee strip of collective shorthand - ink ground, mono caps, signal bullets. */
export interface TickerProps {
  /** phrases, separated automatically by signal bullets */
  items?: string[];
  /** seconds for one full loop */
  speed?: number;
  style?: React.CSSProperties;
}
export function Ticker(props: TickerProps): JSX.Element;
