/**
 * The photo frame - 2px ink border, caption bar, non-negotiable credit.
 */
export interface FrameProps {
  /** image URL. Omit to render a marked PHOTO SLOT placeholder. */
  src?: string;
  alt?: string;
  /** 3/2 (default), 21/9 wide, 4/5 tall, 1/1 square */
  ratio?: '3/2' | '21/9' | '4/5' | '1/1';
  /** signal status chip, auto-positioned top-left */
  tag?: string;
  /** left side of the caption bar - essay number, place, frame index */
  label?: React.ReactNode;
  /** the photographer. Required wherever the work appears. */
  credit?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function Frame(props: FrameProps): JSX.Element;
