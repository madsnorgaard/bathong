/** Benefit / programme list ruled with 2px frame lines, each row indexed in mono. */
export interface RuledListItem {
  /** mono index, e.g. 'B/01' */
  num?: string;
  label: React.ReactNode;
  /** muted sub-line under the label */
  note?: React.ReactNode;
}
export interface RuledListProps {
  items?: RuledListItem[];
  className?: string;
}
export function RuledList(props: RuledListProps): JSX.Element;
