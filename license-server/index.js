// CopyGum License Server - Email-based licensing (temporary until Stripe setup)
// Deploy this to Vercel, Netlify, or any hosting service

const express = require('express')
const cors = require('cors')
const crypto = require('crypto')

const app = express()
app.use(cors())
app.use(express.json())

// In production, use a proper database (MongoDB, PostgreSQL, etc.)
const licenses = new Map()
const emailLicenses = new Map() // Store email-based licenses

// Example license keys (generate these securely)
const validLicenses = {
  'COPY-GUM-DEMO-KEY1': { 
    deviceLimit: 3, 
    subscriptionType: 'free_yearly',
    status: 'active',
    expiryDate: '2025-10-22',
    features: ['unlimited_storage', 'smart_categorization'],
    email: 'demo@copygum.com'
  }
}

// Generate secure license key
function generateLicenseKey() {
  const segments = []
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase())
  }
  return `COPY-${segments.join('-')}`
}

// Email-based license generation (temporary until Stripe setup)
app.post('/api/generate-license', (req, res) => {
  try {
    const { email } = req.body
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' })
    }

    // Check if email already has a license
    if (emailLicenses.has(email)) {
      const existingLicense = emailLicenses.get(email)
      return res.json({
        success: true,
        licenseKey: existingLicense.licenseKey,
        message: 'License already exists for this email',
        expiryDate: existingLicense.expiryDate
      })
    }

    const licenseKey = generateLicenseKey()
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1) // 1 year free for now

    const licenseData = {
      email,
      subscriptionType: 'free_yearly',
      status: 'active',
      deviceLimit: 3,
      expiryDate: expiryDate.toISOString().split('T')[0],
      features: ['unlimited_storage', 'smart_categorization'],
      licenseKey
    }

    validLicenses[licenseKey] = licenseData
    emailLicenses.set(email, licenseData)

    res.json({
      success: true,
      licenseKey,
      expiryDate: licenseData.expiryDate,
      message: 'Free 1-year license generated! Save this license key.'
    })
  } catch (error) {
    console.error('Generate license error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Validate license endpoint
app.post('/api/validate', (req, res) => {
  const { licenseKey, deviceId } = req.body

  console.log(`🔐 License validation request:`, { licenseKey, deviceId })

  // Check if license exists
  const licenseData = validLicenses[licenseKey]
  if (!licenseData) {
    return res.json({
      valid: false,
      deviceId,
      error: 'Invalid license key'
    })
  }

  // Check subscription status
  if (licenseData.status !== 'active') {
    return res.json({
      valid: false,
      deviceId,
      error: `Subscription is ${licenseData.status}`
    })
  }

  // Check expiry date
  if (new Date() > new Date(licenseData.expiryDate)) {
    return res.json({
      valid: false,
      deviceId,
      error: 'Subscription expired'
    })
  }

  // Check device limit
  const deviceKey = `${licenseKey}:devices`
  const registeredDevices = licenses.get(deviceKey) || []
  
  if (!registeredDevices.includes(deviceId)) {
    if (registeredDevices.length >= licenseData.deviceLimit) {
      return res.json({
        valid: false,
        deviceId,
        error: 'Device limit reached'
      })
    }
    // Register new device
    registeredDevices.push(deviceId)
    licenses.set(deviceKey, registeredDevices)
  }

  // License is valid
  res.json({
    valid: true,
    deviceId,
    expiryDate: licenseData.expiryDate,
    features: licenseData.features
  })
})

// Get license by email endpoint
app.post('/api/get-license', (req, res) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }

    const license = emailLicenses.get(email)
    
    if (!license) {
      return res.json({ 
        found: false,
        message: 'No license found for this email' 
      })
    }

    res.json({
      found: true,
      licenseKey: license.licenseKey,
      expiryDate: license.expiryDate,
      subscriptionType: license.subscriptionType
    })
  } catch (error) {
    console.error('Get license error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'CopyGum License Server',
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      '/api/generate-license': 'POST - Generate free license with email',
      '/api/validate': 'POST - Validate license key',
      '/api/get-license': 'POST - Get license by email'
    }
  })
})

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`)
})

// DEPLOYMENT INSTRUCTIONS:
// 1. Deploy to Vercel: vercel --prod
// 2. Update license server URL in licensing.ts
// 3. Set environment variables for production