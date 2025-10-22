// LICENSE SERVER EXAMPLE (Node.js + Express)
// Deploy this to Vercel, Netlify, or any hosting service

const express = require('express')
const cors = require('cors')
const crypto = require('crypto')

const app = express()
app.use(cors())
app.use(express.json())

// In production, use a proper database (MongoDB, PostgreSQL, etc.)
const licenses = new Map()

// Example license keys (generate these securely)
const validLicenses = {
  'CLIP-MONTHLY-DEMO-KEY': { 
    deviceLimit: 1, 
    subscriptionType: 'monthly',
    subscriptionId: 'sub_example123',
    status: 'active',
    expiryDate: '2025-01-22',
    features: ['unlimited_storage', 'smart_categorization'],
    price: 9.99
  },
  'CLIP-YEARLY-DEMO-KEY1': { 
    deviceLimit: 1, 
    subscriptionType: 'yearly',
    subscriptionId: 'sub_example456',
    status: 'active',
    expiryDate: '2025-10-22',
    features: ['unlimited_storage', 'smart_categorization', 'priority_support'],
    price: 49.00
  },
  'CLIP-TRIAL-EXPIRED-01': { 
    deviceLimit: 1, 
    subscriptionType: 'trial',
    status: 'expired',
    expiryDate: '2024-10-15',
    features: ['basic']
  }
}

// Generate secure license key
function generateLicenseKey() {
  const segments = []
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase())
  }
  return `CLIP-${segments.join('-')}`
}

// Validate license endpoint
app.post('/api/validate', (req, res) => {
  const { licenseKey, deviceId, version } = req.body

  console.log(`🔐 License validation request:`, { licenseKey, deviceId })

  // Check if license exists
  const licenseData = validLicenses[licenseKey]
  if (!licenseData) {
    return res.status(400).json({
      valid: false,
      error: 'Invalid license key'
    })
  }

  // Check subscription status
  if (licenseData.status !== 'active') {
    return res.status(400).json({
      valid: false,
      error: `Subscription is ${licenseData.status}`
    })
  }

  // Check expiry date
  if (new Date() > new Date(licenseData.expiryDate)) {
    return res.status(400).json({
      valid: false,
      error: 'Subscription expired'
    })
  }

  // Check device limit
  const deviceKey = `${licenseKey}:devices`
  const registeredDevices = licenses.get(deviceKey) || []
  
  if (!registeredDevices.includes(deviceId)) {
    if (registeredDevices.length >= licenseData.deviceLimit) {
      return res.status(400).json({
        valid: false,
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

// Generate new license (for your internal use)
app.post('/api/generate', (req, res) => {
  const { adminKey, deviceLimit = 1, expiryDays = 365 } = req.body
  
  // Simple admin protection
  if (adminKey !== 'your-secret-admin-key') {
    return res.status(403).json({ error: 'Unauthorized' })
  }
  
  const licenseKey = generateLicenseKey()
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + expiryDays)
  
  validLicenses[licenseKey] = {
    deviceLimit,
    expiryDate: expiryDate.toISOString().split('T')[0],
    features: ['unlimited_storage']
  }
  
  res.json({
    licenseKey,
    expiryDate: expiryDate.toISOString().split('T')[0]
  })
})

// Health check
app.get('/health', (req, res) => {
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