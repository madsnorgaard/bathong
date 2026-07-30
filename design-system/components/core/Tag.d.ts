/** Small mono status chip - photocall state, funding note, 'open call'. */
export interface TagProps {
  /** signal = default flash chip; ink = inverted; outline = transparent with an ink border */
  variant?: 'signal' | 'ink' | 'outline';
  children?: React.ReactNode;
  className?: string;
}
export function Tag(props: TagProps): JSX.Element;
