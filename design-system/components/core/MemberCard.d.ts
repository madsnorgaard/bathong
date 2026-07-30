/**
 * The membership card - ink ground, jacaranda offset shadow, signal CTA.
 */
export interface MemberCardProps {
  /** mono member line, e.g. 'Member № 0001 · Pitori · 012' */
  number?: string;
  /** price in display type - 'R -' while pricing is TBC */
  price?: string;
  /** signal note under the price */
  priceNote?: string;
  cta?: string;
  ctaHref?: string;
  /** the NPC support line */
  footnote?: string;
  className?: string;
  style?: React.CSSProperties;
}
export function MemberCard(props: MemberCardProps): JSX.Element;
