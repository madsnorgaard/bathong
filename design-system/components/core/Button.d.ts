/**
 * The Bathong button - display type, square, hard-bordered.
 */
export interface ButtonProps {
  /** solid = ink fill (default); signal = the member CTA, the only default signal fill; ghost = transparent */
  variant?: 'solid' | 'signal' | 'ghost';
  size?: 'md' | 'sm';
  /** renders an <a> instead of a <button> */
  href?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}
export function Button(props: ButtonProps): JSX.Element;
