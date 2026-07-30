/** The punch-dot: the wordmark's full stop standing alone as avatar, watermark or punctuation. */
export interface PunchDotProps {
  /** px edge length of the dot (or of the avatar tile) */
  size?: number;
  /** dot = bare square dot; avatar = dot inset on an ink tile */
  variant?: 'dot' | 'avatar';
  /** always jacaranda, except on a jacaranda ground where it flips to paper */
  color?: string;
  style?: React.CSSProperties;
}
export function PunchDot(props: PunchDotProps): JSX.Element;
