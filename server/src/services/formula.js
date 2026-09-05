// Salary rule formulas are configuration edited in the UI and stored in the
// database, so evaluating them with eval or new Function would let anyone with
// rule-edit access run code on the server. This parser understands only
// numbers, the four operators, parentheses and previously-computed rule codes.

const NUMBER = /^\d+(\.\d+)?/
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*/

function tokenize(input) {
  const tokens = []
  let rest = input.trim()

  while (rest.length) {
    const char = rest[0]

    if (char === ' ' || char === '\t') {
      rest = rest.slice(1)
      continue
    }

    if ('+-*/()'.includes(char)) {
      tokens.push({ type: char })
      rest = rest.slice(1)
      continue
    }

    const num = rest.match(NUMBER)
    if (num) {
      tokens.push({ type: 'num', value: Number(num[0]) })
      rest = rest.slice(num[0].length)
      continue
    }

    const ident = rest.match(IDENT)
    if (ident) {
      tokens.push({ type: 'ident', value: ident[0].toUpperCase() })
      rest = rest.slice(ident[0].length)
      continue
    }

    throw new Error(`Unexpected character "${char}" in formula`)
  }

  return tokens
}

function parse(tokens, context) {
  let pos = 0

  const peek = () => tokens[pos]
  const eat = (type) => {
    if (!peek() || peek().type !== type) throw new Error(`Expected "${type}" in formula`)
    return tokens[pos++]
  }

  function primary() {
    const token = peek()
    if (!token) throw new Error('Unexpected end of formula')

    if (token.type === '-') {
      pos++
      return -primary()
    }
    if (token.type === '+') {
      pos++
      return primary()
    }
    if (token.type === 'num') {
      pos++
      return token.value
    }
    if (token.type === 'ident') {
      pos++
      if (!(token.value in context)) {
        throw new Error(
          `references "${token.value}", which has no value yet. Check the rule sequence — ` +
            `a formula can only use codes computed before it.`
        )
      }
      return context[token.value]
    }
    if (token.type === '(') {
      pos++
      const value = expression()
      eat(')')
      return value
    }
    throw new Error(`Unexpected token "${token.type}" in formula`)
  }

  function term() {
    let left = primary()
    while (peek() && (peek().type === '*' || peek().type === '/')) {
      const op = tokens[pos++].type
      const right = primary()
      if (op === '/' && right === 0) throw new Error('Division by zero in formula')
      left = op === '*' ? left * right : left / right
    }
    return left
  }

  function expression() {
    let left = term()
    while (peek() && (peek().type === '+' || peek().type === '-')) {
      const op = tokens[pos++].type
      const right = term()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  const result = expression()
  if (pos !== tokens.length) throw new Error('Trailing characters in formula')
  return result
}

export function evaluateFormula(expression, context = {}) {
  if (!expression || !expression.trim()) throw new Error('Formula is empty')
  return parse(tokenize(expression), context)
}
