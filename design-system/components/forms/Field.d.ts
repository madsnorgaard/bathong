/**
 * Text input / textarea in mono with a hard ink border.
 */
export interface FieldProps {
  /** mono uppercase label above the field */
  label?: string;
  as?: 'input' | 'textarea';
  rows?: number;
  placeholder?: string;
  type?: string;
  name?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  className?: string;
  id?: string;
}
export function Field(props: FieldProps): JSX.Element;
