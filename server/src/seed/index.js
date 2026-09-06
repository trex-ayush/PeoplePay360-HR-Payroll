import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { Attendance } from '../models/Attendance.js'
import { AttendanceCorrection } from '../models/AttendanceCorrection.js'
import { Contract } from '../models/Contract.js'
import { Department } from '../models/Department.js'
import { Employee } from '../models/Employee.js'
import { Invite } from '../models/Invite.js'
import { Payrun } from '../models/Payrun.js'
import { Payslip } from '../models/Payslip.js'
import { SalaryRule } from '../models/SalaryRule.js'
import { SalaryStructure } from '../models/SalaryStructure.js'
import { TimeOffAllocation } from '../models/TimeOffAllocation.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { TimeOffType } from '../models/TimeOffType.js'
import { User } from '../models/User.js'
import { WorkingSchedule } from '../models/WorkingSchedule.js'
import { computePayslipLines } from '../services/payroll.js'
import { summarise } from '../services/attendance.js'
import { workingDaysBetween } from '../services/schedule.js'
import { unpaidDaysInPeriod } from '../services/leave.js'

const PASSWORD = 'oxp12345'

// toISOString would shift the day back for anyone east of UTC.
const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const day = (value) => new Date(`${value}T00:00:00`)
const at = (value, time) => new Date(`${value}T${time}:00`)

const weekdays = (dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 60,
})

async function wipe() {
  const models = [
    Attendance,
    AttendanceCorrection,
    Contract,
    Department,
    Employee,
    Invite,
    Payrun,
    Payslip,
    SalaryRule,
    SalaryStructure,
    TimeOffAllocation,
    TimeOffRequest,
    TimeOffType,
    User,
    WorkingSchedule,
  ]

  for (const model of models) await model.deleteMany({})
}

async function seed() {
  await wipe()

  const [engineering, finance, hr, sales, operations] = await Department.create([
    { name: 'Engineering', code: 'ENG' },
    { name: 'Finance', code: 'FIN' },
    { name: 'HR', code: 'HR' },
    { name: 'Sales', code: 'SLS' },
    { name: 'Operations', code: 'OPS' },
  ])

  const [fullTime, nightShift, partTime] = await WorkingSchedule.create([
    { name: '40 Hours / Week', type: 'full_time', lines: [0, 1, 2, 3, 4].map(weekdays) },
    {
      name: 'Night Shift',
      type: 'shift',
      lines: [0, 1, 2, 3, 4].map((d) => ({
        dayOfWeek: d,
        startTime: '21:00',
        endTime: '06:00',
        breakMinutes: 30,
      })),
    },
    {
      name: 'Part-time 20h',
      type: 'part_time',
      lines: [0, 1, 2, 3].map((d) => ({
        dayOfWeek: d,
        startTime: '09:00',
        endTime: '14:00',
        breakMinutes: 0,
      })),
    },
  ])

  // Two people are left without bank details on purpose — the payrun warnings
  // have to have something to find during the demo.
  const PEOPLE = [
    ['Aarav Mehta', finance, fullTime, 'Payroll Specialist', 'Mumbai', 'HDFC 5012 8891', '2025-04-01'],
    ['Sara Khan', hr, fullTime, 'HR Manager', 'Mumbai', 'ICICI 7745 2210', '2024-06-10'],
    ['John Dsouza', engineering, fullTime, 'Developer', 'Bengaluru', '', '2025-11-03'],
    ['Neha Patel', hr, partTime, 'Recruiter', 'Pune', '', '2026-02-16', 'contract'],
    ['Priya Nair', engineering, nightShift, 'Senior Developer', 'Bengaluru', 'SBI 3390 1187', '2024-01-08'],
    ['Rohan Sharma', engineering, fullTime, 'Developer', 'Bengaluru', 'AXIS 8821 4407', '2025-02-17'],
    ['Ananya Iyer', sales, fullTime, 'Account Executive', 'Delhi', 'HDFC 2290 7731', '2025-08-04'],
    ['Vikram Rao', sales, fullTime, 'Sales Manager', 'Delhi', 'KOTAK 4417 9902', '2023-09-11'],
    ['Meera Joshi', operations, fullTime, 'Operations Lead', 'Pune', 'ICICI 6612 3390', '2024-03-25'],
    ['Karan Malhotra', operations, nightShift, 'Support Engineer', 'Pune', 'SBI 7708 1145', '2025-06-02'],
    ['Divya Menon', finance, fullTime, 'Accountant', 'Mumbai', 'AXIS 3315 8820', '2025-01-13'],
    ['Arjun Reddy', engineering, partTime, 'Engineering Intern', 'Bengaluru', 'HDFC 9901 2277', '2026-06-15', 'intern'],
    ['Ishaan Verma', engineering, fullTime, 'Developer', 'Bengaluru', 'HDFC 4471 2039', '2025-03-10'],
    ['Kavya Nambiar', engineering, fullTime, 'QA Engineer', 'Bengaluru', 'ICICI 8823 5510', '2025-07-21'],
    ['Rahul Bose', engineering, nightShift, 'Support Engineer', 'Bengaluru', 'AXIS 1194 6603', '2024-11-05'],
    ['Sneha Kulkarni', engineering, partTime, 'Design Intern', 'Pune', 'SBI 2278 4419', '2026-07-01', 'intern'],
    ['Aditya Ghosh', sales, fullTime, 'Account Executive', 'Kolkata', 'KOTAK 6690 1128', '2025-05-19'],
    ['Riya Chawla', sales, fullTime, 'Sales Development Rep', 'Delhi', 'HDFC 3312 9974', '2026-01-06'],
    ['Manish Tiwari', sales, fullTime, 'Regional Manager', 'Delhi', 'ICICI 7756 2018', '2023-12-04'],
    ['Pooja Deshmukh', finance, fullTime, 'Financial Analyst', 'Mumbai', 'AXIS 5540 8871', '2025-09-15'],
    ['Nikhil Jain', finance, fullTime, 'Accounts Payable', 'Mumbai', '', '2026-03-02'],
    ['Tara Fernandes', finance, partTime, 'Bookkeeper', 'Mumbai', 'SBI 9012 3345', '2025-10-27', 'contract'],
    ['Aryan Kapoor', hr, fullTime, 'Talent Partner', 'Pune', 'HDFC 1123 7788', '2024-08-12'],
    ['Simran Kaur', hr, fullTime, 'HR Generalist', 'Pune', 'KOTAK 4402 6619', '2025-12-01'],
    ['Devansh Pillai', operations, fullTime, 'Operations Analyst', 'Chennai', 'ICICI 3390 1174', '2025-04-28'],
    ['Nandini Rao', operations, fullTime, 'Logistics Coordinator', 'Chennai', 'AXIS 6672 0093', '2026-02-09'],
    ['Yash Agarwal', operations, nightShift, 'Night Operations', 'Chennai', 'SBI 1145 8820', '2024-05-16'],
    ['Farah Sheikh', operations, partTime, 'Operations Assistant', 'Pune', 'HDFC 7719 3304', '2026-04-20', 'contract'],
    ['Gaurav Dutta', engineering, fullTime, 'DevOps Engineer', 'Bengaluru', 'KOTAK 8834 5521', '2024-10-08'],
    ['Leela Krishnan', sales, nightShift, 'Support Specialist', 'Kolkata', 'ICICI 2201 9938', '2025-06-30'],
  ]

  const staff = await Employee.create(
    PEOPLE.map(([name, department, schedule, jobPosition, workLocation, bankAccount, joined, type], i) => ({
      code: `EMP${String(i + 1).padStart(3, '0')}`,
      name,
      workEmail: `${name.toLowerCase().replace(' ', '.')}@oxp.test`,
      department: department._id,
      schedule: schedule._id,
      jobPosition,
      workLocation,
      bankAccount,
      employeeType: type ?? 'full_time',
      joinedOn: day(joined),
    }))
  )

  const by = (name) => staff.find((e) => e.name === name)
  const [aarav, sara, john, neha, priya] = [
    by('Aarav Mehta'),
    by('Sara Khan'),
    by('John Dsouza'),
    by('Neha Patel'),
    by('Priya Nair'),
  ]

  // Managers matter: Paid Time Off is approved by the employee's own manager.
  const REPORTS = {
    'Sara Khan': ['John Dsouza', 'Neha Patel', 'Priya Nair', 'Divya Menon'],
    'Priya Nair': ['Rohan Sharma', 'Arjun Reddy'],
    'Vikram Rao': ['Ananya Iyer'],
    'Meera Joshi': ['Karan Malhotra', 'Devansh Pillai', 'Nandini Rao', 'Yash Agarwal', 'Farah Sheikh'],
    'Manish Tiwari': ['Aditya Ghosh', 'Riya Chawla', 'Leela Krishnan'],
    'Aryan Kapoor': ['Simran Kaur'],
    'Gaurav Dutta': ['Ishaan Verma', 'Kavya Nambiar', 'Rahul Bose', 'Sneha Kulkarni'],
    'Divya Menon': ['Pooja Deshmukh', 'Nikhil Jain', 'Tara Fernandes'],
  }

  for (const [manager, reports] of Object.entries(REPORTS)) {
    await Employee.updateMany(
      { _id: { $in: reports.map((n) => by(n)._id) } },
      { $set: { manager: by(manager)._id } }
    )
  }

  const structure = await SalaryStructure.create({
    name: 'Regular Salary',
    code: 'REG',
    description: 'Standard monthly structure for salaried staff.',
  })

  await SalaryRule.create([
    {
      structure: structure._id,
      sequence: 10,
      code: 'BASIC',
      name: 'Basic Salary',
      category: 'BASIC',
      computeType: 'formula',
      expression: 'WAGE * RATIO',
    },
    {
      structure: structure._id,
      sequence: 20,
      code: 'HRA',
      name: 'House Rent Allowance',
      category: 'ALW',
      computeType: 'percent',
      baseCode: 'BASIC',
      amount: 40,
    },
    {
      structure: structure._id,
      sequence: 30,
      code: 'DA',
      name: 'Dearness Allowance',
      category: 'ALW',
      computeType: 'percent',
      baseCode: 'BASIC',
      amount: 10,
    },
    {
      structure: structure._id,
      sequence: 40,
      code: 'GROSS',
      name: 'Gross Salary',
      category: 'GROSS',
      computeType: 'formula',
      expression: 'BASIC + HRA + DA',
    },
    {
      structure: structure._id,
      sequence: 50,
      code: 'PF',
      name: 'Provident Fund',
      category: 'DED',
      computeType: 'percent',
      baseCode: 'BASIC',
      amount: -12,
    },
    {
      structure: structure._id,
      sequence: 60,
      code: 'PT',
      name: 'Professional Tax',
      category: 'DED',
      computeType: 'fixed',
      amount: -200,
    },
    {
      structure: structure._id,
      sequence: 70,
      code: 'NET',
      name: 'Net Salary',
      category: 'NET',
      computeType: 'formula',
      expression: 'GROSS + PF + PT',
    },
  ])

  // Interns are paid on a shorter structure, so a payrun has a real choice of
  // structure rather than only one.
  const internStructure = await SalaryStructure.create({
    name: 'Intern Stipend',
    code: 'INT',
    description: 'Flat stipend with no allowances or provident fund.',
  })

  await SalaryRule.create([
    {
      structure: internStructure._id,
      name: 'Stipend',
      code: 'BASIC',
      category: 'BASIC',
      sequence: 10,
      computeType: 'formula',
      expression: 'WAGE * RATIO',
    },
    {
      structure: internStructure._id,
      name: 'Gross Stipend',
      code: 'GROSS',
      category: 'GROSS',
      sequence: 20,
      computeType: 'formula',
      expression: 'BASIC',
    },
    {
      structure: internStructure._id,
      name: 'Professional Tax',
      code: 'PT',
      category: 'DED',
      sequence: 30,
      computeType: 'fixed',
      amount: -200,
    },
    {
      structure: internStructure._id,
      name: 'Net Stipend',
      code: 'NET',
      category: 'NET',
      sequence: 40,
      computeType: 'formula',
      expression: 'GROSS + PT',
    },
  ])

  const structureFor = (employee) =>
    employee.employeeType === 'intern' ? internStructure._id : structure._id

  const contractFor = (employee, reference, startDate, endDate, wage) => ({
    reference,
    employee: employee._id,
    department: employee.department,
    structure: structureFor(employee),
    schedule: employee.schedule,
    jobPosition: employee.jobPosition,
    wage,
    startDate,
    endDate,
    state: 'running',
  })

  // Aarav has two contracts that do not overlap. A September payrun must pick the
  // first one — this is the moment that shows payroll reads the period, not the
  // newest record. It also ends inside September, so the run raises a warning.
  const WAGES = {
    'Aarav Mehta': 45000,
    'Sara Khan': 70000,
    'John Dsouza': 55000,
    'Neha Patel': 28000,
    'Priya Nair': 90000,
    'Rohan Sharma': 52000,
    'Ananya Iyer': 48000,
    'Vikram Rao': 85000,
    'Meera Joshi': 62000,
    'Karan Malhotra': 38000,
    'Divya Menon': 41000,
    'Arjun Reddy': 18000,
    'Ishaan Verma': 58000,
    'Kavya Nambiar': 46000,
    'Rahul Bose': 40000,
    'Sneha Kulkarni': 16000,
    'Aditya Ghosh': 47000,
    'Riya Chawla': 34000,
    'Manish Tiwari': 92000,
    'Pooja Deshmukh': 54000,
    'Nikhil Jain': 36000,
    'Tara Fernandes': 24000,
    'Aryan Kapoor': 51000,
    'Simran Kaur': 39000,
    'Devansh Pillai': 44000,
    'Nandini Rao': 33000,
    'Yash Agarwal': 37000,
    'Farah Sheikh': 21000,
    'Gaurav Dutta': 66000,
    'Leela Krishnan': 35000,
  }

  await Contract.create([
    // Aarav's second contract starts the day after the first ends, so a September
    // payrun must pick the first one and an October payrun the second.
    contractFor(aarav, 'CON/2026/0001', day('2026-01-01'), day('2026-09-30'), 45000),
    contractFor(aarav, 'CON/2026/0002', day('2026-10-01'), null, 60000),
    ...staff
      .filter((e) => e.name !== 'Aarav Mehta')
      .map((e, i) =>
        contractFor(e, `CON/2026/${String(i + 10).padStart(4, '0')}`, day('2026-01-01'), null, WAGES[e.name])
      ),
  ])

  const [paidTimeOff, sickLeave, compOff] = await TimeOffType.create([
    { name: 'Paid Time Off', unit: 'days', requiresAllocation: true, approvalBy: 'manager', payrollCode: 'PTO', color: 'blue' },
    { name: 'Sick Leave', unit: 'days', requiresAllocation: false, approvalBy: 'hr', payrollCode: 'SICK', color: 'red' },
    { name: 'Comp Off', unit: 'hours', requiresAllocation: true, approvalBy: 'hr', payrollCode: 'COMP', color: 'green' },
  ])

  const year = { validFrom: day('2026-01-01'), validTo: day('2026-12-31') }

  const allocated = await TimeOffAllocation.create([
    {
      employee: aarav._id,
      type: paidTimeOff._id,
      mode: 'fixed',
      allocated: 20,
      ...year,
      state: 'approved',
      description: 'Annual leave granted at the start of the policy year.',
    },
    {
      employee: sara._id,
      type: paidTimeOff._id,
      mode: 'accrual',
      allocated: 18,
      accrualRate: 1.5,
      ...year,
      state: 'approved',
      description: 'Earned month by month.',
    },
    // Left in draft on purpose: leave against it cannot be approved yet.
    {
      employee: john._id,
      type: paidTimeOff._id,
      mode: 'fixed',
      allocated: 12,
      ...year,
      state: 'draft',
      description: 'Waiting for HR sign-off.',
    },
    ...staff
      .filter((e) => !['Aarav Mehta', 'Sara Khan', 'John Dsouza'].includes(e.name))
      .map((e, i) => ({
        employee: e._id,
        type: paidTimeOff._id,
        mode: i % 2 ? 'accrual' : 'fixed',
        allocated: i % 2 ? 18 : 15,
        accrualRate: i % 2 ? 1.5 : 0,
        ...year,
        state: 'approved',
        description: i % 2 ? 'Earned month by month.' : 'Annual leave for the policy year.',
      })),
    // Comp Off is granted in hours, so the balance maths is exercised in both units.
    {
      employee: by('Rahul Bose')._id,
      type: compOff._id,
      mode: 'fixed',
      allocated: 24,
      ...year,
      state: 'approved',
      description: 'Hours banked for weekend releases.',
    },
    {
      employee: by('Yash Agarwal')._id,
      type: compOff._id,
      mode: 'fixed',
      allocated: 16,
      ...year,
      state: 'approved',
      description: 'Hours banked for holiday cover.',
    },
  ])

  const aaravLeave = allocated[0]
  const compOffFor = allocated.find(
    (a) => String(a.employee) === String(by('Rahul Bose')._id) && String(a.type) === String(compOff._id)
  )

  const leaveFor = (employee, from, to, duration, reason, state, paid) => ({
    employee: employee._id,
    type: paidTimeOff._id,
    dateFrom: day(from),
    dateTo: day(to),
    duration,
    paidDuration: state === 'approved' ? (paid ?? duration) : 0,
    unpaidDuration: state === 'approved' ? duration - (paid ?? duration) : 0,
    reason,
    allocation: state === 'approved' ? allocated.find((a) => a.employee.equals(employee._id))?._id : null,
    state,
  })

  await TimeOffRequest.create([
    leaveFor(aarav, '2026-08-10', '2026-08-12', 3, 'Family wedding', 'approved'),
    {
      employee: sara._id,
      type: sickLeave._id,
      dateFrom: day('2026-08-19'),
      dateTo: day('2026-08-19'),
      duration: 1,
      paidDuration: 1,
      unpaidDuration: 0,
      reason: 'Fever',
      allocation: null,
      state: 'approved',
    },
    leaveFor(john, '2026-09-21', '2026-09-23', 3, 'Short holiday', 'draft'),
    leaveFor(by('Rohan Sharma'), '2026-07-06', '2026-07-08', 3, 'Moving house', 'approved'),
    leaveFor(by('Ananya Iyer'), '2026-08-17', '2026-08-21', 5, 'Trip home', 'approved'),
    // More than the balance covers, so the overflow is unpaid and payroll prorates.
    leaveFor(by('Karan Malhotra'), '2026-08-03', '2026-08-14', 10, 'Extended family leave', 'approved', 6),
    leaveFor(by('Meera Joshi'), '2026-09-28', '2026-09-30', 3, 'Personal', 'draft'),
    leaveFor(by('Divya Menon'), '2026-06-15', '2026-06-16', 2, 'Exam', 'refused'),
    // Comp Off is measured in hours, so one request exercises the other unit.
    {
      employee: by('Rahul Bose')._id,
      type: compOff._id,
      dateFrom: day('2026-08-24'),
      dateTo: day('2026-08-24'),
      duration: 8,
      paidDuration: 8,
      unpaidDuration: 0,
      reason: 'Time back for the weekend release',
      state: 'approved',
      allocation: compOffFor._id,
      approver: sara._id,
    },
    {
      employee: by('Yash Agarwal')._id,
      type: compOff._id,
      dateFrom: day('2026-09-21'),
      dateTo: day('2026-09-21'),
      duration: 8,
      reason: 'Covered a public holiday',
      state: 'draft',
    },
  ])

  // Enough days for the dashboard's attendance health to mean something, with a
  // late arrival and a long day so every status appears at least once.
  const attendance = []

  // Four weeks up to yesterday rather than fixed dates, so the current month is
  // never empty whenever the seed is run. Today is left clear for the demo's own
  // check-in.
  const until = new Date()
  until.setDate(until.getDate() - 1)
  const from = new Date(until)
  from.setDate(from.getDate() - 27)

  const workdays = []
  for (const cursor = new Date(from); cursor <= until; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = (cursor.getDay() + 6) % 7
    if (weekday < 5) workdays.push(iso(cursor))
  }

  const schedules = [fullTime, nightShift, partTime]
  const scheduleOf = (employee) => schedules.find((s) => s._id.equals(employee.schedule))
  const worksOn = (schedule, date) =>
    schedule.lines.some((line) => line.dayOfWeek === (day(date).getDay() + 6) % 7)

  // Each schedule is worked the way it is written: the night shift runs past
  // midnight as one spell, part-timers take no lunch, and office staff clock out
  // for theirs.
  function sessionsFor(schedule, date, { late, long }) {
    if (schedule === nightShift) {
      const nextDay = new Date(day(date))
      nextDay.setDate(nextDay.getDate() + 1)
      return [
        {
          checkIn: at(date, late ? '21:26' : '21:02'),
          checkOut: at(iso(nextDay), long ? '07:40' : '06:04'),
        },
      ]
    }

    if (schedule === partTime) {
      return [
        {
          checkIn: at(date, late ? '09:37' : '09:02'),
          checkOut: at(date, long ? '15:20' : '14:03'),
        },
      ]
    }

    return [
      { checkIn: at(date, late ? '09:42' : '09:03'), checkOut: at(date, '13:00') },
      { checkIn: at(date, '14:00'), checkOut: at(date, long ? '20:30' : '18:03') },
    ]
  }

  for (const [index, date] of workdays.entries()) {
    for (const [seat, employee] of staff.entries()) {
      const schedule = scheduleOf(employee)
      if (!worksOn(schedule, date)) continue

      // A handful of absences and exceptions, spread so every status shows up on
      // every schedule rather than only on the office one.
      const absent = (index + seat) % 23 === 4
      if (absent) {
        attendance.push({
          employee: employee._id,
          date: day(date),
          ...summarise({ schedule, sessions: [] }),
        })
        continue
      }

      const late = (index + seat) % 11 === 3
      const long = (index + seat) % 9 === 5

      attendance.push({
        employee: employee._id,
        date: day(date),
        ...summarise({ schedule, sessions: sessionsFor(schedule, date, { late, long }) }),
      })
    }
  }

  const marked = await Attendance.create(attendance)

  // Two corrections waiting on HR, so the alert on the dashboard and the review
  // flow both have something real behind them.
  const correctionFor = (employee, checkIn, checkOut, reason) => {
    const record = marked.find(
      (a) => String(a.employee) === String(employee._id) && a.checkIn && a.checkOut
    )
    return {
      attendance: record._id,
      employee: employee._id,
      previousCheckIn: record.checkIn,
      previousCheckOut: record.checkOut,
      checkIn: at(iso(record.date), checkIn),
      checkOut: at(iso(record.date), checkOut),
      reason,
      state: 'draft',
    }
  }

  await AttendanceCorrection.create([
    correctionFor(by('Kavya Nambiar'), '08:30', '18:45', 'Came in early for the release, forgot to check in.'),
    correctionFor(by('Nandini Rao'), '09:00', '19:15', 'Stayed back for the stock count.'),
  ])

  // One finished payrun so the dashboard has history and Send Payslips has
  // something to send. September is left for the live demo.
  const rules = await SalaryRule.find({ structure: structure._id }).lean()
  const internRules = await SalaryRule.find({ structure: internStructure._id }).lean()
  const contracts = await Contract.find({ state: 'running' }).populate('schedule').lean()

  const PERIODS = [
    ['June 2026', '2026-06-01', '2026-06-30'],
    ['July 2026', '2026-07-01', '2026-07-31'],
    ['August 2026', '2026-08-01', '2026-08-31'],
  ]

  // A payrun carries one structure and only picks up the employees whose running
  // contract uses it, so each period gets one run per structure.
  const books = [
    { structure, rules },
    { structure: internStructure, rules: internRules },
  ]

  const payslips = []
  for (const [name, from, to] of PERIODS) {
    const august = { start: day(from), end: day(to) }

    for (const book of books) {
      const covered = contracts.filter(
        (c) =>
          String(c.structure) === String(book.structure._id) &&
          c.startDate <= august.end &&
          (!c.endDate || c.endDate >= august.start)
      )
      if (!covered.length) continue

      const payrun = await Payrun.create({
        name: `${name} · ${book.structure.name}`,
        structure: book.structure._id,
        periodStart: august.start,
        periodEnd: august.end,
        employees: covered.map((c) => c.employee),
        state: 'paid',
      })

      for (const employeeId of payrun.employees) {
        const employee = staff.find((e) => String(e._id) === String(employeeId))
        const contract = covered.find((c) => String(c.employee) === String(employeeId))

        // Same arithmetic the real compute uses, so a seeded payslip is exactly
        // what recomputing the run would produce.
        const totalWorkingDays = workingDaysBetween(contract.schedule, august.start, august.end)
        const unpaid = await unpaidDaysInPeriod(employeeId, august.start, august.end)
        const workedDays = Math.max(0, totalWorkingDays - unpaid)
        const { lines, gross, deductions, net } = computePayslipLines(book.rules, {
          wage: contract.wage,
          workedDays,
          totalWorkingDays,
        })

        payslips.push({
          payrun: payrun._id,
          employee: employeeId,
          contract: contract._id,
          structure: book.structure._id,
          structureName: book.structure.name,
          wage: contract.wage,
          periodStart: august.start,
          periodEnd: august.end,
          workedDays,
          totalWorkingDays,
          lines,
          grossAmount: gross,
          deductionAmount: deductions,
          netAmount: net,
          // The same rule paying a run applies: with no account to pay into, the
          // payslip is computed but never settled.
          state: employee?.bankAccount ? 'paid' : 'done',
        })
      }
    }
  }

  await Payslip.insertMany(payslips)

  await User.create([
    { name: 'Aarav Mehta', email: 'admin@oxp.test', password: PASSWORD, roles: ['admin'], employeeId: aarav._id },
    { name: 'Sara Khan', email: 'hr@oxp.test', password: PASSWORD, roles: ['hr_manager'], employeeId: sara._id },
    {
      name: 'Priya Nair',
      email: 'payroll@oxp.test',
      password: PASSWORD,
      roles: ['hr_payroll_manager'],
      employeeId: priya._id,
    },
    { name: 'John Dsouza', email: 'employee@oxp.test', password: PASSWORD, roles: ['employee'], employeeId: john._id },
  ])

  console.log('Seeded:')
  console.log(`  5 departments · 3 working schedules · ${staff.length} employees · ${staff.length + 1} contracts`)
  console.log(
    `  ${await SalaryStructure.countDocuments()} salary structures with ` +
      `${await SalaryRule.countDocuments()} rules`
  )
  console.log(
    `  3 time off types · ${allocated.length} allocations · ` +
      `${await TimeOffRequest.countDocuments()} requests · ` +
      `${await AttendanceCorrection.countDocuments()} corrections waiting`
  )
  console.log(`  ${attendance.length} attendance records over the last 4 weeks`)
  const held = payslips.filter((payslip) => payslip.state !== 'paid').length
  console.log(
    `  ${await Payrun.countDocuments()} paid payruns with ${payslips.length} payslips` +
      (held ? `, ${held} held back without a bank account` : '')
  )
  console.log('')
  console.log(`Sign in with any of these — password is "${PASSWORD}":`)
  console.log('  admin@oxp.test      admin')
  console.log('  hr@oxp.test         HR manager')
  console.log('  payroll@oxp.test    HR payroll manager')
  console.log('  employee@oxp.test   employee')
}

await mongoose.connect(env.mongoUri)
await seed()
await mongoose.disconnect()
