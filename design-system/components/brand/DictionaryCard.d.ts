/**
 * The Bathong dictionary card - the portable definition device.
 */
export interface DictionaryCardProps {
  /** the headword - 'bathong!' in voice contexts, 'bathong.' on the mark's register */
  entry?: string;
  /** part of speech, set italic in signal (ink) or jacaranda-deep (paper) */
  pos?: string;
  /** numbered senses, in order */
  senses?: string[];
  /** ink = dark card (default, as on manifesto sections); paper = light contexts */
  surface?: 'ink' | 'paper';
  style?: React.CSSProperties;
}
export function DictionaryCard(props: DictionaryCardProps): JSX.Element;
