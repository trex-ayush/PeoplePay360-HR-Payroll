const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function underHundred(n) {
  if (n < 20) return ONES[n]
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`
}

function underThousand(n) {
  if (n < 100) return underHundred(n)
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${underHundred(n % 100)}` : ''}`
}

// Indian grouping: crore, lakh, thousand — a payslip says "Sixty Eight Thousand
// Eight Hundred", never "Sixty Eight Point Eight Thousand".
export function amountInWords(value) {
  const rupees = Math.floor(Math.abs(value))
  const paise = Math.round((Math.abs(value) - rupees) * 100)

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only'

  const parts = []
  const groups = [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand'],
  ]

  let left = rupees
  for (const [size, name] of groups) {
    if (left >= size) {
      parts.push(`${underThousand(Math.floor(left / size))} ${name}`)
      left %= size
    }
  }
  if (left) parts.push(underThousand(left))

  const words = parts.join(' ')
  const rupeeText = rupees ? `${words} Rupee${rupees === 1 ? '' : 's'}` : ''
  const paiseText = paise ? `${underHundred(paise)} Paise` : ''

  return `${[rupeeText, paiseText].filter(Boolean).join(' and ')} Only`
}
