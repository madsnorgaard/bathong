/**
 * Section title + archive index, baseline aligned - the standard page section opener.
 */
export interface SectionHeadProps {
  /** title text, set uppercase by the CSS - no full stop, the component adds the dot */
  title: string;
  /** the archive index, e.g. '02 / The work comes first' */
  index?: string;
  /** dot colour override: signal on ink sections, paper on jacaranda sections */
  dotColor?: string;
  level?: 1 | 2 | 3;
  className?: string;
}
export function SectionHead(props: SectionHeadProps): JSX.Element;
