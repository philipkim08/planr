import { createClient } from '@supabase/supabase-js'

export const normalizeUsername = value => typeof value === 'string' ? value.trim().toLowerCase() : ''
export const validUsername = value => /^[a-z0-9_]{3,24}$/.test(value)

export function registerAccounts(app, { sb, authUser, wrap, makeClient = createClient }) {
  // Bound login attempts without persisting credentials or logging request bodies.
  const attempts = new Map()
  const windowMs = 15 * 60 * 1000
  const limited = (key, limit) => {
    const now = Date.now()
    for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k)
    if (!attempts.has(key) && attempts.size >= 10000) return true
    const entry = attempts.get(key) || { count: 0, until: now + windowMs }
    entry.count++; attempts.set(key, entry)
    return entry.count > limit
  }
  app.post('/api/auth/password', wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    if (!sb) return res.status(503).json({ error: 'Account sign-in is not configured.' })
    const username = normalizeUsername(req.body.username), password = req.body.password
    const ipBlocked = limited(`ip:${req.ip}`, 60)
    if (ipBlocked || limited(`name:${username.slice(0,24)}`, 15)) return res.status(429).json({ error: 'Too many sign-in attempts. Please try again in 15 minutes.' })
    const invalid = () => res.status(401).json({ error: 'Incorrect username or password, or your email has not been confirmed.' })
    if (!validUsername(username) || typeof password !== 'string' || !password || password.length > 1024) return invalid()
    const { data: profile, error } = await sb.from('account_usernames').select('user_id').eq('username', username).maybeSingle()
    if (error) throw error
    if (!profile) return invalid()
    const { data, error: userError } = await sb.auth.admin.getUserById(profile.user_id)
    if (userError || !data.user?.email) return invalid()
    // Never sign a user in on the shared service-role client.
    const client = makeClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
    const result = await client.auth.signInWithPassword({ email: data.user.email, password })
    if (result.error || !result.data.session) return invalid()
    const { access_token, refresh_token } = result.data.session
    res.json({ access_token, refresh_token })
  }))
  app.get('/api/me/username', wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const user = await authUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in.' })
    const { data, error } = await sb.from('account_usernames').select('username').eq('user_id', user.id).maybeSingle()
    if (error) throw error
    res.json({ username: data?.username || '' })
  }))
  app.put('/api/me/username', wrap(async (req, res) => {
    const user = await authUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in.' })
    const username = normalizeUsername(req.body.username)
    if (!validUsername(username)) return res.status(400).json({ error: 'Use 3–24 letters, numbers, or underscores for your username.' })
    const { error } = await sb.from('account_usernames').upsert({ user_id: user.id, username }, { onConflict: 'user_id' })
    if (error?.code === '23505') return res.status(409).json({ error: 'That username is taken. Please choose another.' })
    if (error) throw error
    res.json({ username })
  }))
}
