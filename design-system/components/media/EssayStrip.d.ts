/** A sequenced contact-sheet run of frames - the photo-essay unit. */
export interface EssayFrame {
  src?: string;
  ratio?: '3/2' | '4/5' | '1/1';
  credit?: string;
}
export interface EssayStripProps {
  /** frames in sequence - an essay is 12 to 20 */
  frames?: EssayFrame[];
  /** first frame number, for continuing a sequence */
  startAt?: number;
  /** default credit for every frame */
  credit?: string;
  className?: string;
  style?: React.CSSProperties;
}
export function EssayStrip(props: EssayStripProps): JSX.Element;
