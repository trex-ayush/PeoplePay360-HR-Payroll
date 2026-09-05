export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-prose">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
      ) : null}
    </div>
  )
}
