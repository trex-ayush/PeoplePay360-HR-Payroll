# PeoplePay360

An HR and payroll platform where the modules actually feed each other: an employee's
contract decides what payroll pays, their working schedule decides how long a month
is, and their approved leave shortens it.

Built for the Odoo hackathon. React + Vite on the front, Node + Express + MongoDB
behind it.

---

## Running it

You need Node 20 or newer and a MongoDB connection string — Atlas or a local `mongod`,
either works.

**1. Install**

```bash
cd server && npm install
cd ../client && npm install
```

**2. Configure the server**

```bash
cd server
cp .env.example .env
```

Fill in three values. The rest have working defaults.

| Variable | What it is |
| --- | --- |
| `MONGODB_URI` | `mongodb+srv://…` for Atlas, or `mongodb://127.0.0.1:27017/peoplepay360` |
| `JWT_SECRET` | any long random string — `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_SECRET` | a passphrase you choose; only needed to create the very first admin |

SMTP settings are optional. Without them invites still work — the link is created and
shown in the UI, it just isn't emailed.

**3. Load the demo data**

```bash
cd server && npm run seed
```

This wipes the database and rebuilds it. See [Demo data](#demo-data) for what you get.

**4. Start both**

```bash
cd server && npm run dev     # API on :4000
cd client && npm run dev     # UI on :5173
```

Open http://localhost:5173. The client proxies `/api` to the server, so nothing else
needs configuring.

**Tests**

```bash
cd server && npm test
```

47 tests covering the calculation logic — schedule hours, contract selection, leave
duration and attendance summarising.

---

## Signing in

The seed creates four accounts, one per role. Password for all of them is `oxp12345`.

| Email | Role | Sees |
| --- | --- | --- |
| `admin@oxp.test` | Admin | Everything, plus user accounts and role assignment |
| `hr@oxp.test` | HR Manager | People modules end to end. No payroll |
| `payroll@oxp.test` | HR Payroll Manager | The above plus payruns and salary configuration |
| `employee@oxp.test` | Employee | Only their own attendance, leave and balances |

Signing in as the employee is the quickest way to see the role gating: four menu items
instead of fifteen, and their own records rather than everyone's.

Without the seed, create the first admin by posting to `/api/auth/admin` with the
`ADMIN_SECRET` you set. Everyone after that is created from **User Management**, which
issues a one-time link the person uses to set their own password.

---

## What it does

**Employees & contracts** — Kanban and list views. Opening an employee reaches their
contracts, attendance, time off and allocations, each filtered to them. One employee can
have several contracts over time; two *running* contracts covering the same dates are
rejected, because payroll depends on exactly one match.

**Working schedules** — a weekly pattern of day, start, end and break. Weekly hours are
derived from that pattern, never typed. Night shifts that cross midnight are handled.

**Attendance** — check in and out from the home page or the navbar clock. A day can hold
several spells, so clocking out for lunch and back in is normal; worked hours add the
spells and leave the gap unpaid. Employees can ask HR to correct a day, and HR approves
or refuses.

**Time off** — types define the policy (unit, whether a balance is required, who
approves). Allocations grant balance, either as a fixed grant or accrued monthly.
Approving leave draws from the matching allocation.

**Payroll** — a payrun is created in two steps: pick the scope, then pick the employees.
Computing generates a payslip per employee from the salary structure's rules, which run
in sequence so a later rule can use what an earlier one produced. Warnings surface
problems before you commit. The flow is Draft → Compute → Validate → Mark Paid, and a
validated run can no longer be recomputed.

**Dashboard** — payroll totals, salary by department, monthly trend, attendance and
leave overviews, and a list of what is waiting on someone. All of it from real records.

---

## How the tricky parts work

Four decisions are worth knowing before reading the code.

**Payroll reads the period, not the newest record.** An employee with a raise has two
contracts. A September payrun must pay the September rate, so
[`findContractForPeriod`](server/src/services/contract.js) matches on dates rather than
picking the latest row.

**Leave balances are never stored.** The allocation records what was *granted*. `taken`
is summed from approved requests and `remaining` is derived, both on every read, in
[`getBalance`](server/src/services/leave.js). Nothing decrements a counter, so refusing
leave gives the balance back on its own and there is no stored number that can drift out
of step.

**Monthly accrual needs no scheduled job.** For an accrual allocation, `accruedOn()`
counts the months elapsed at the moment you look. There is no cron in this project, and
nothing to miss if the server was down overnight.

**Salary formulas are parsed, not evaluated.** Rules are configuration edited in the UI
and stored in the database, so `eval` would let anyone with rule-edit access run code on
the server. [`formula.js`](server/src/services/formula.js) is a small parser that
understands numbers, `+ - * /`, parentheses and previously-computed rule codes. Nothing
else.

---

## Demo data

`npm run seed` builds a company you can actually demonstrate:

- 5 departments, 3 working schedules, **30 employees**, 31 contracts
- 2 salary structures (Regular Salary with 7 rules, Intern Stipend with 4)
- 3 leave types, 32 allocations, 10 requests, 2 attendance corrections waiting
- **580 attendance records** across the last four weeks, on all three schedules
- **6 paid payruns** — June, July and August, one per structure — with 90 payslips

A few records exist to make specific behaviour visible:

- **Aarav Mehta** has two contracts — ₹45,000 until 30 September, ₹60,000 from 1 October.
  A September payrun must pick the first, and it warns that his contract ends inside the
  period.
- **John Dsouza** and **Neha Patel** have no bank account, so payruns warn about them and
  Mark Paid holds their payslips back until an account is added.
- **John's** allocation is left unapproved, so leave against it cannot be approved yet.
- **Karan Malhotra** took 10 days with only 6 days of balance. The 4 unpaid days prorate
  his August payslip to 17 of 21 working days.

**September is deliberately left empty** so there is a payrun to create live. Attendance
runs to yesterday; today is clear so the first check-in of the demo is a real one.

---

## Layout

```
server/
  src/
    config/       env and database connection
    controllers/  request handling
    middleware/   auth, role gates, error handling
    models/       one Mongoose model per file
    routes/       API surface, mounted at /api
    services/     the business logic — payroll, leave, attendance, schedules
    seed/         demo data
client/
  src/
    api/          typed calls to the server
    components/   shared UI
    pages/        one folder per module
```

The rules that matter live in `server/src/services`. Controllers stay thin — they read
the request, call a service, and shape the response.
