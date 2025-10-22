import { app } from 'electron'
import crypto from 'crypto'
import os from 'os'
import fs from 'fs'
import path from 'path'

export interface LicenseInfo {
  isValid: boolean
  isTrialActive: boolean
  trialDaysRemaining: number
  licenseKey?: string
  deviceId: string
  firstLaunchDate: Date | null
  licenseActivatedDate?: Date
  expiryDate?: Date
}

export interface LicenseValidationResponse {
  valid: boolean
  deviceId: string
  expiryDate?: string
  error?: string
}

class LicensingService {
  private readonly CONFIG_FILE = 'copygum-license.dat'
  private readonly TRIAL_DAYS = 7
  private deviceId: string
  private configPath: string

  constructor() {
    this.deviceId = this.generateDeviceId()
    this.configPath = path.join(app.getPath('userData'), this.CONFIG_FILE)
  }

  // Generate unique device fingerprint
  private generateDeviceId(): string {
    const machineId = os.hostname()
    const platform = os.platform()
    const arch = os.arch()
    const cpus = os.cpus()[0]?.model || 'unknown'
    const memory = os.totalmem().toString()
    
    // Create unique fingerprint
    const fingerprint = `${machineId}-${platform}-${arch}-${cpus}-${memory}`
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 32)
  }

  // Load license configuration
  private loadConfig(): any {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8')
        // Simple obfuscation - reverse base64
        const decoded = Buffer.from(data, 'base64').toString('utf8')
        return JSON.parse(decoded.split('').reverse().join(''))
      }
    } catch (error) {
      console.error('Failed to load license config:', error)
    }
    return null
  }

  // Save license configuration
  private saveConfig(config: any): void {
    try {
      // Simple obfuscation - reverse and base64
      const jsonString = JSON.stringify(config)
      const reversed = jsonString.split('').reverse().join('')
      const encoded = Buffer.from(reversed, 'utf8').toString('base64')
      fs.writeFileSync(this.configPath, encoded, 'utf8')
    } catch (error) {
      console.error('Failed to save license config:', error)
    }
  }

  // Initialize trial on first launch
  private initializeTrial(): void {
    const config = {
      deviceId: this.deviceId,
      firstLaunchDate: new Date().toISOString(),
      version: app.getVersion(),
      trialUsed: true
    }
    this.saveConfig(config)
  }

  // Validate license key online
  async validateLicenseOnline(licenseKey: string): Promise<LicenseValidationResponse> {
    try {
      // Production license server endpoint (replace with your actual Vercel URL)
      const response = await fetch('https://copy-gum.vercel.app/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey,
          deviceId: this.deviceId,
          version: app.getVersion()
        })
      })

      if (!response.ok) {
        throw new Error(`License validation failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Online license validation failed:', error)
      return {
        valid: false,
        deviceId: this.deviceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Activate license with key
  async activateLicense(licenseKey: string): Promise<boolean> {
    try {
      const validation = await this.validateLicenseOnline(licenseKey)
      
      if (validation.valid) {
        const config = this.loadConfig() || {}
        config.licenseKey = licenseKey
        config.licenseActivatedDate = new Date().toISOString()
        config.deviceId = this.deviceId
        
        if (validation.expiryDate) {
          config.expiryDate = validation.expiryDate
        }
        
        this.saveConfig(config)
        return true
      }
      
      return false
    } catch (error) {
      console.error('License activation failed:', error)
      return false
    }
  }

  // Get current license status
  async getLicenseInfo(): Promise<LicenseInfo> {
    const config = this.loadConfig()
    
    // First launch - initialize trial
    if (!config) {
      this.initializeTrial()
      return {
        isValid: true,
        isTrialActive: true,
        trialDaysRemaining: this.TRIAL_DAYS,
        deviceId: this.deviceId,
        firstLaunchDate: new Date()
      }
    }

    // Check if license is activated
    if (config.licenseKey) {
      // Validate license periodically (every 7 days)
      const lastValidation = config.lastValidation ? new Date(config.lastValidation) : null
      const shouldRevalidate = !lastValidation || 
        (Date.now() - lastValidation.getTime()) > (7 * 24 * 60 * 60 * 1000)

      if (shouldRevalidate) {
        const validation = await this.validateLicenseOnline(config.licenseKey)
        if (!validation.valid) {
          return {
            isValid: false,
            isTrialActive: false,
            trialDaysRemaining: 0,
            deviceId: this.deviceId,
            firstLaunchDate: config.firstLaunchDate ? new Date(config.firstLaunchDate) : null
          }
        }
        
        // Update last validation
        config.lastValidation = new Date().toISOString()
        this.saveConfig(config)
      }

      return {
        isValid: true,
        isTrialActive: false,
        trialDaysRemaining: 0,
        licenseKey: config.licenseKey,
        deviceId: this.deviceId,
        firstLaunchDate: config.firstLaunchDate ? new Date(config.firstLaunchDate) : null,
        licenseActivatedDate: config.licenseActivatedDate ? new Date(config.licenseActivatedDate) : undefined
      }
    }

    // Check trial status
    const firstLaunchDate = new Date(config.firstLaunchDate)
    const daysSinceLaunch = Math.floor((Date.now() - firstLaunchDate.getTime()) / (1000 * 60 * 60 * 24))
    const trialDaysRemaining = Math.max(0, this.TRIAL_DAYS - daysSinceLaunch)
    
    // Anti-bypass: Check device ID matches
    if (config.deviceId !== this.deviceId) {
      return {
        isValid: false,
        isTrialActive: false,
        trialDaysRemaining: 0,
        deviceId: this.deviceId,
        firstLaunchDate: firstLaunchDate
      }
    }

    return {
      isValid: trialDaysRemaining > 0,
      isTrialActive: trialDaysRemaining > 0,
      trialDaysRemaining,
      deviceId: this.deviceId,
      firstLaunchDate: firstLaunchDate
    }
  }

  // Check if app should continue running
  async shouldAllowUsage(): Promise<boolean> {
    const licenseInfo = await this.getLicenseInfo()
    return licenseInfo.isValid
  }

  // Get device ID for display
  getDeviceId(): string {
    return this.deviceId
  }
}

export const licensingService = new LicensingService()