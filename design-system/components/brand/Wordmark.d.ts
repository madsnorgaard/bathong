/**
 * The Bathong. wordmark - Archivo Black, uppercase, jacaranda full stop.
 */
export interface WordmarkProps {
  /** hero (fluid masthead), xl, lg, md, sm - or any CSS font-size string */
  size?: 'hero' | 'xl' | 'lg' | 'md' | 'sm' | string;
  /** element to render when not a link */
  as?: 'span' | 'h1' | 'h2' | 'div';
  /** renders an <a> instead */
  href?: string;
  /** override the dot colour - only for jacaranda grounds (flip to paper) or ink manifesto inversions (signal) */
  dotColor?: string;
  style?: React.CSSProperties;
}
export function Wordmark(props: WordmarkProps): JSX.Element;
