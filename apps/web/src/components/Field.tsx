import { useId } from 'react';

type Props = {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  textarea?: boolean;
  // Method syntax so handlers typed for either element are accepted.
  onChange?(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'>;

/** A labelled input with an inline error wired to aria-describedby. */
export function Field({ label, error, hint, textarea, className = '', ...rest }: Props) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const common = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, className: `field ${className}` };
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-cream/90">
        {label}
      </label>
      {textarea ? (
        <textarea {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} {...common} />
      ) : (
        <input {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} {...common} />
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1 text-sm font-medium text-rose" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
