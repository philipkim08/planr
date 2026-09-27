import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = process.env.PORT || 3001
const dataDir = path.join(__dirname, '..', 'data')
const dbFile = path.join(dataDir, 'trips.json')

fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ trips: [] }, null, 2))

app.use(cors())
app.use(express.json())

function readDb() { return JSON.parse(fs.readFileSync(dbFile, 'utf8')) }
function writeDb(db) { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)) }
function publicTrip(trip) {
  const { edit_token, ...safeTrip } = trip
  return safeTrip
}
function makeDay(label, order) { return { id: crypto.randomUUID(), label, order, timeslots: [] } }
function makeToken() { return crypto.randomBytes(24).toString('base64url') }
function amountNumber(value) { return Number.parseFloat(String(value || '').replace(/[^0-9.]/g, '')) || 0 }
function settlementFor(slot) {
  const payments = slot.payments || []; const total = payments.reduce((sum, item) => sum + amountNumber(item.amount), 0)
  const people = [...new Set(payments.map((item) => item.paid_by?.trim()).filter(Boolean))]
  if (!people.length || !total) return { total, perPerson: 0, transfers: [], message: people.length ? 'Add payment amounts to calculate a split.' : 'Add at least one named payment to calculate a split.' }
  const perPerson = total / people.length; const balances = new Map(people.map((name) => [name, -perPerson]))
  for (const payment of payments) balances.set(payment.paid_by, (balances.get(payment.paid_by) || 0) + amountNumber(payment.amount))
  const creditors = [...balances].filter(([, value]) => value > 0.005).map(([name, value]) => ({ name, value }))
  const debtors = [...balances].filter(([, value]) => value < -0.005).map(([name, value]) => ({ name, value: -value })); const transfers = []
  for (const debtor of debtors) for (const creditor of creditors) { const amount = Math.min(debtor.value, creditor.value); if (amount > 0.005) { transfers.push({ from: debtor.name, to: creditor.name, amount: Math.round(amount * 100) / 100 }); debtor.value -= amount; creditor.value -= amount } }
  return { total, perPerson, transfers, message: transfers.length ? '' : 'Everyone is settled up.' }
}

app.post('/api/trips', (req, res) => {
  const { title, dates } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'A trip title is required.' })
  const labels = Array.isArray(dates) && dates.length ? dates : ['Day 1']
  const trip = {
    id: crypto.randomUUID(), title: title.trim(), created_at: new Date().toISOString(),
    edit_token: makeToken(), days: labels.map((label, index) => makeDay(label, index))
  }
  const db = readDb(); db.trips.push(trip); writeDb(db)
  res.status(201).json({ trip: publicTrip(trip), editToken: trip.edit_token })
})

app.get('/api/trips/:id', (req, res) => {
  const trip = readDb().trips.find((item) => item.id === req.params.id)
  if (!trip) return res.status(404).json({ error: 'Trip not found.' })
  res.json({ trip: publicTrip(trip) })
})

function getEditableTrip(req, res) {
  const trip = readDb().trips.find((item) => item.id === req.params.id)
  if (!trip) { res.status(404).json({ error: 'Trip not found.' }); return null }
  if (req.get('x-edit-token') !== trip.edit_token) { res.status(403).json({ error: 'That edit link is not valid.' }); return null }
  return trip
}

app.get('/api/trips/:id/edit', (req, res) => {
  const trip = getEditableTrip(req, res)
  if (trip) res.json({ trip: publicTrip(trip) })
})

app.put('/api/trips/:id', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  if (!req.body.title?.trim()) return res.status(400).json({ error: 'A trip title is required.' })
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id)
  saved.title = req.body.title.trim(); writeDb(db)
  res.json({ trip: publicTrip(saved) })
})

app.post('/api/trips/:id/days', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  const label = req.body.label?.trim() || `Day ${trip.days.length + 1}`
  const day = makeDay(label, trip.days.length)
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); saved.days.push(day); writeDb(db)
  res.status(201).json({ trip: publicTrip(saved) })
})

app.put('/api/trips/:id/days/:dayId', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  if (req.params.dayId === 'reorder') {
    if (!Array.isArray(req.body.ids) || req.body.ids.length !== trip.days.length) return res.status(400).json({ error: 'Invalid day order.' })
    const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); const byId = new Map(saved.days.map((item) => [item.id, item]))
    if (req.body.ids.some((id) => !byId.has(id))) return res.status(400).json({ error: 'Invalid day order.' })
    saved.days = req.body.ids.map((id, order) => ({ ...byId.get(id), order })); writeDb(db); return res.json({ trip: publicTrip(saved) })
  }
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); const day = saved.days.find((item) => item.id === req.params.dayId)
  if (!day) return res.status(404).json({ error: 'Day not found.' })
  day.label = req.body.label?.trim() || day.label; writeDb(db); res.json({ trip: publicTrip(saved) })
})

app.put('/api/trips/:id/days/reorder', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  if (!Array.isArray(req.body.ids) || req.body.ids.length !== trip.days.length) return res.status(400).json({ error: 'Invalid day order.' })
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); const byId = new Map(saved.days.map((day) => [day.id, day]))
  if (req.body.ids.some((id) => !byId.has(id))) return res.status(400).json({ error: 'Invalid day order.' })
  saved.days = req.body.ids.map((id, order) => ({ ...byId.get(id), order })); writeDb(db); res.json({ trip: publicTrip(saved) })
})

app.delete('/api/trips/:id/days/:dayId', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  if (trip.days.length === 1) return res.status(400).json({ error: 'A trip needs at least one day.' })
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); saved.days = saved.days.filter((item) => item.id !== req.params.dayId).map((item, i) => ({ ...item, order: i })); writeDb(db); res.json({ trip: publicTrip(saved) })
})

app.post('/api/trips/:id/days/:dayId/timeslots', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); const day = saved.days.find((item) => item.id === req.params.dayId)
  if (!day) return res.status(404).json({ error: 'Day not found.' })
  if (!req.body.title?.trim()) return res.status(400).json({ error: 'An activity title is required.' })
  const slot = { id: crypto.randomUUID(), time: req.body.time || '', title: req.body.title.trim(), location_text: req.body.location_text?.trim() || '', links: Array.isArray(req.body.links) ? req.body.links.filter(Boolean).map(String) : [], notes: req.body.notes?.trim() || '', attendance_required: Boolean(req.body.attendance_required), splitting_payments: Boolean(req.body.splitting_payments), attendance: [], comments: [], payments: [], order: day.timeslots.length }
  day.timeslots.push(slot); writeDb(db); res.status(201).json({ trip: publicTrip(saved) })
})

app.put('/api/trips/:id/days/:dayId/timeslots/:slotId', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); const day = saved.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId)
  if (!slot) return res.status(404).json({ error: 'Activity not found.' })
  for (const key of ['time', 'title', 'location_text', 'notes']) if (key in req.body) slot[key] = String(req.body[key]).trim()
  if ('links' in req.body) slot.links = Array.isArray(req.body.links) ? req.body.links.filter(Boolean).map(String) : []
  if ('attendance_required' in req.body) slot.attendance_required = Boolean(req.body.attendance_required)
  if ('splitting_payments' in req.body) slot.splitting_payments = Boolean(req.body.splitting_payments)
  if (!slot.title) return res.status(400).json({ error: 'An activity title is required.' })
  writeDb(db); res.json({ trip: publicTrip(saved) })
})

app.post('/api/trips/:id/days/:dayId/timeslots/:slotId/attendance', (req, res) => {
  const db = readDb(); const trip = db.trips.find((item) => item.id === req.params.id); const day = trip?.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId)
  const name = req.body.name?.trim(); const status = req.body.status
  if (!slot) return res.status(404).json({ error: 'Activity not found.' })
  if (!slot.attendance_required) return res.status(400).json({ error: 'Attendance is not enabled for this activity.' })
  if (!name || !['going', 'maybe', 'not-going'].includes(status)) return res.status(400).json({ error: 'Please add your name and response.' })
  slot.attendance ||= []; slot.attendance = [...slot.attendance.filter((response) => response.name.toLowerCase() !== name.toLowerCase()), { name, status }]
  writeDb(db); res.json({ trip: publicTrip(trip) })
})

app.post('/api/trips/:id/days/:dayId/timeslots/:slotId/comments', (req, res) => {
  const db = readDb(); const trip = db.trips.find((item) => item.id === req.params.id); const day = trip?.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId)
  const name = req.body.name?.trim(); const body = req.body.body?.trim()
  if (!slot) return res.status(404).json({ error: 'Activity not found.' })
  if (!name || !body) return res.status(400).json({ error: 'Add your name and a comment.' })
  slot.comments ||= []; slot.comments.push({ id: crypto.randomUUID(), name, body, created_at: new Date().toISOString() })
  writeDb(db); res.status(201).json({ trip: publicTrip(trip) })
})

app.delete('/api/trips/:id/days/:dayId/timeslots/:slotId/comments/:commentId', (req, res) => {
  const db = readDb(); const trip = db.trips.find((item) => item.id === req.params.id); const day = trip?.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId); const comment = slot?.comments?.find((item) => item.id === req.params.commentId)
  if (!comment) return res.status(404).json({ error: 'Comment not found.' })
  if (comment.name.toLowerCase() !== req.body.name?.trim().toLowerCase()) return res.status(403).json({ error: 'Only the commenter can delete this comment.' })
  slot.comments = slot.comments.filter((item) => item.id !== comment.id); writeDb(db); res.json({ trip: publicTrip(trip) })
})

app.post('/api/trips/:id/days/:dayId/timeslots/:slotId/payments', (req, res) => {
  const db = readDb(); const trip = db.trips.find((item) => item.id === req.params.id); const day = trip?.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId)
  const paid_by = req.body.paid_by?.trim(); const note = req.body.note?.trim() || ''; const amount = req.body.amount?.trim() || ''; const receipt_data = req.body.receipt_data || ''
  if (!slot) return res.status(404).json({ error: 'Activity not found.' })
  if (!slot.splitting_payments) return res.status(400).json({ error: 'Payment splitting is not enabled for this activity.' })
  if (!paid_by) return res.status(400).json({ error: 'Please say who paid.' })
  if (receipt_data && (!String(receipt_data).startsWith('data:image/') || String(receipt_data).length > 2_500_000)) return res.status(400).json({ error: 'Please use an image smaller than about 1.8 MB.' })
  slot.payments ||= []; slot.payments.push({ id: crypto.randomUUID(), paid_by, amount, note, receipt_data, created_at: new Date().toISOString() })
  writeDb(db); res.status(201).json({ trip: publicTrip(trip) })
})

app.put('/api/trips/:id/days/:dayId/timeslots/:slotId/payments/:paymentId', (req, res) => {
  const db = readDb(); const trip = db.trips.find((item) => item.id === req.params.id); const day = trip?.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId); const payment = slot?.payments?.find((item) => item.id === req.params.paymentId)
  if (!payment) return res.status(404).json({ error: 'Payment entry not found.' })
  if (req.body.delete === true) { slot.payments = slot.payments.filter((item) => item.id !== payment.id); writeDb(db); return res.json({ trip: publicTrip(trip) }) }
  if (!req.body.paid_by?.trim()) return res.status(400).json({ error: 'Please say who paid.' })
  payment.paid_by = req.body.paid_by.trim(); payment.amount = req.body.amount?.trim() || ''; payment.note = req.body.note?.trim() || ''
  writeDb(db); res.json({ trip: publicTrip(trip) })
})

app.delete('/api/trips/:id/days/:dayId/timeslots/:slotId/payments/:paymentId', (req, res) => {
  const db = readDb(); const trip = db.trips.find((item) => item.id === req.params.id); const day = trip?.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId)
  if (!slot?.payments?.some((item) => item.id === req.params.paymentId)) return res.status(404).json({ error: 'Payment entry not found.' })
  slot.payments = slot.payments.filter((item) => item.id !== req.params.paymentId); writeDb(db); res.json({ trip: publicTrip(trip) })
})

app.get('/api/trips/:id/days/:dayId/timeslots/:slotId/settlement', (req, res) => {
  const trip = readDb().trips.find((item) => item.id === req.params.id); const day = trip?.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId)
  if (!slot) return res.status(404).json({ error: 'Activity not found.' })
  res.json({ settlement: settlementFor(slot) })
})

app.post('/api/trips/:id/days/:dayId/timeslots/:slotId/payment-summary', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI summaries are not configured yet. Add OPENAI_API_KEY to the server environment.' })
  const trip = readDb().trips.find((item) => item.id === req.params.id); const day = trip?.days.find((item) => item.id === req.params.dayId); const slot = day?.timeslots.find((item) => item.id === req.params.slotId)
  if (!slot) return res.status(404).json({ error: 'Activity not found.' })
  const settlement = settlementFor(slot)
  try {
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5', instructions: 'Write a concise, friendly payment settlement summary. Use only the supplied facts. Do not invent payments, people, amounts, or transfers.', input: JSON.stringify({ activity: slot.title, payments: slot.payments || [], participants: [...new Set((slot.payments || []).map((item) => item.paid_by).filter(Boolean))], settlement }) }) })
    const result = await response.json(); if (!response.ok) return res.status(502).json({ error: result.error?.message || 'AI summary could not be generated.' })
    res.json({ summary: result.output_text || 'No summary was returned.', settlement })
  } catch { res.status(502).json({ error: 'Could not reach the AI summary service.' }) }
})

app.delete('/api/trips/:id/days/:dayId/timeslots/:slotId', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); const day = saved.days.find((item) => item.id === req.params.dayId)
  if (!day) return res.status(404).json({ error: 'Day not found.' })
  day.timeslots = day.timeslots.filter((item) => item.id !== req.params.slotId).map((item, i) => ({ ...item, order: i })); writeDb(db); res.json({ trip: publicTrip(saved) })
})

app.put('/api/trips/:id/days/:dayId/reorder', (req, res) => {
  const trip = getEditableTrip(req, res); if (!trip) return
  const db = readDb(); const saved = db.trips.find((item) => item.id === trip.id); const day = saved.days.find((item) => item.id === req.params.dayId)
  if (!day || !Array.isArray(req.body.ids)) return res.status(400).json({ error: 'Invalid reorder request.' })
  const byId = new Map(day.timeslots.map((slot) => [slot.id, slot]));
  if (req.body.ids.length !== byId.size || req.body.ids.some((id) => !byId.has(id))) return res.status(400).json({ error: 'Invalid activity list.' })
  day.timeslots = req.body.ids.map((id, order) => ({ ...byId.get(id), order })); writeDb(db); res.json({ trip: publicTrip(saved) })
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'This API endpoint does not exist. Restart planr after updating its server.' }))

const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.listen(port, () => console.log(`planr API running at http://localhost:${port}`))
