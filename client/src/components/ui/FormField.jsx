import { Label } from './Label'

export function FormField({ label, htmlFor, required, error, hint, children }) {
  return (
    <div className="w-full">
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  )
}
