/** Mono uppercase lead-in line with an optional inverted chip - sits above a display title. */
export interface KickerProps {
  /** short inverted chip, e.g. 'Pitori · 012' */
  chip?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}
export function Kicker(props: KickerProps): JSX.Element;
