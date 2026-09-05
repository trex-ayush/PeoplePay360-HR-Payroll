import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

const TOKEN = /[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[-+*/()]/g
const OPERATORS = new Set(['+', '-', '*', '/', '(', ')'])

const parse = (text) => (text ? (text.match(TOKEN) ?? []) : [])

// Token-based rather than free text, so an unknown code never becomes a chip and a
// typo is visible while typing.
export function CodeInput({ value = '', onChange, codes = [], placeholder, id }) {
  const [tokens, setTokens] = useState(() => parse(value))
  const [draft, setDraft] = useState('')
  const [highlighted, setHighlighted] = useState(0)

  const inputRef = useRef(null)
  const emitted = useRef(value)

  const known = new Map(codes.map((c) => [c.code.toUpperCase(), c]))

  // Adopt a formula set from outside (loading a rule, resetting the form).
  useEffect(() => {
    if (value !== emitted.current) {
      setTokens(parse(value))
      setDraft('')
      emitted.current = value
    }
  }, [value])

  const publish = (nextTokens, nextDraft) => {
    setTokens(nextTokens)
    setDraft(nextDraft)

    const text = [...nextTokens, nextDraft].filter(Boolean).join(' ')
    emitted.current = text
    onChange(text)
  }

  const matches = draft
    ? codes.filter(
        (c) =>
          c.code.toUpperCase().startsWith(draft.toUpperCase()) &&
          c.code.toUpperCase() !== draft.toUpperCase()
      )
    : []

  useEffect(() => {
    setHighlighted(0)
  }, [draft])

  const commit = (text, rest = '') => {
    const parsed = parse(text)
    publish(parsed.length ? [...tokens, ...parsed] : tokens, rest)
  }

  const handleChange = (e) => {
    const next = e.target.value

    // An operator or a space ends the token being typed.
    const trailing = next.slice(-1)
    if (OPERATORS.has(trailing)) {
      commit(next.slice(0, -1) + ' ' + trailing)
      return
    }
    if (trailing === ' ') {
      commit(next.trim())
      return
    }

    publish(tokens, next)
  }

  const handleKeyDown = (e) => {
    if (matches.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setHighlighted((i) => (i + step + matches.length) % matches.length)
      return
    }

    if (matches.length && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault()
      commit(matches[highlighted].code)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (draft) commit(draft)
      return
    }

    if (e.key === 'Backspace' && !draft && tokens.length) {
      e.preventDefault()
      publish(tokens.slice(0, -1), '')
    }
  }

  const removeToken = (index) => {
    publish(tokens.filter((_, i) => i !== index), draft)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5',
          'border-neutral-300 bg-white focus-within:border-neutral-500',
          'dark:border-neutral-600 dark:bg-neutral-800 dark:focus-within:border-neutral-400'
        )}
      >
        {tokens.map((token, index) =>
          OPERATORS.has(token) ? (
            <span
              key={`${token}-${index}`}
              className="px-0.5 font-mono text-sm text-neutral-500 dark:text-neutral-400"
            >
              {token}
            </span>
          ) : (
            <button
              key={`${token}-${index}`}
              type="button"
              title={known.get(token.toUpperCase())?.label ?? 'Not a known code — click to remove'}
              onClick={(e) => {
                e.stopPropagation()
                removeToken(index)
              }}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-xs font-medium transition-opacity hover:opacity-70',
                known.has(token.toUpperCase())
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              )}
            >
              {token}
            </button>
          )
        )}

        <input
          ref={inputRef}
          id={id}
          value={draft}
          placeholder={tokens.length ? '' : placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="min-w-[80px] flex-1 border-0 bg-transparent p-0 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none dark:text-neutral-100"
        />
      </div>

      {matches.length ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          {matches.map((match, index) => (
            <li key={match.code}>
              <button
                type="button"
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => commit(match.code)}
                className={cn(
                  'flex w-full items-baseline gap-2 px-3 py-1.5 text-left',
                  index === highlighted
                    ? 'bg-neutral-100 dark:bg-neutral-700'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                )}
              >
                <span className="font-mono text-xs font-semibold">{match.code}</span>
                <span className="truncate text-xs text-neutral-500">{match.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
