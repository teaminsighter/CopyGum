import { useState, useEffect } from 'react'
import { LicenseInfo } from '../../services/licensing'

interface LicenseModalProps {
  isOpen: boolean
  licenseInfo: LicenseInfo
  onActivate: (licenseKey: string) => Promise<boolean>
  onClose: () => void
}

function LicenseModal({ isOpen, licenseInfo, onActivate, onClose }: LicenseModalProps) {
  const [licenseKey, setLicenseKey] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState('')
  const [showDeviceId, setShowDeviceId] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLicenseKey('')
      setError('')
      setIsActivating(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key')
      return
    }

    setIsActivating(true)
    setError('')

    try {
      const success = await onActivate(licenseKey.trim())
      if (success) {
        onClose()
      } else {
        setError('Invalid license key. Please check and try again.')
      }
    } catch (error) {
      setError('Failed to activate license. Please try again.')
    } finally {
      setIsActivating(false)
    }
  }

  const copyDeviceId = () => {
    navigator.clipboard.writeText(licenseInfo.deviceId)
  }

  const isTrialExpired = !licenseInfo.isTrialActive && !licenseInfo.licenseKey

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">
            {isTrialExpired ? '🔒' : '⏰'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isTrialExpired ? 'License Required' : 'Trial Period'}
          </h2>
          
          {licenseInfo.isTrialActive ? (
            <div className="text-gray-600">
              <p className="mb-2">Your free trial is active!</p>
              <p className="text-lg font-semibold text-blue-600">
                {licenseInfo.trialDaysRemaining} days remaining
              </p>
              <p className="text-sm mt-2">
                Get your license key to continue using ClipFlow after the trial ends.
              </p>
            </div>
          ) : (
            <div className="text-gray-600">
              <p className="mb-2">Your trial period has ended.</p>
              <p className="text-sm">
                Please enter your license key to continue using ClipFlow.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Key
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Enter your license key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isActivating}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <button
              onClick={handleActivate}
              disabled={isActivating}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActivating ? 'Activating...' : 'Activate License'}
            </button>

            {licenseInfo.isTrialActive && (
              <button
                onClick={onClose}
                className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Continue Trial
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <p className="mb-3 font-medium">Choose your plan:</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <a 
                  href="https://clipflow.com/purchase?plan=monthly" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 border border-blue-200 rounded-lg hover:border-blue-400 transition-colors"
                >
                  <div className="text-blue-600 font-semibold">Monthly</div>
                  <div className="text-lg font-bold text-gray-900">$9.99</div>
                  <div className="text-xs text-gray-500">per month</div>
                </a>
                <a 
                  href="https://clipflow.com/purchase?plan=yearly" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 border border-green-200 rounded-lg hover:border-green-400 transition-colors relative"
                >
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Save 59%
                  </div>
                  <div className="text-green-600 font-semibold">Yearly</div>
                  <div className="text-lg font-bold text-gray-900">$49</div>
                  <div className="text-xs text-gray-500">per year</div>
                </a>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="text-xs text-gray-500 text-center">
                  Secure payment via Stripe • Cancel anytime
                </div>
                <button
                  onClick={() => setShowDeviceId(!showDeviceId)}
                  className="text-blue-600 hover:text-blue-800 underline text-left"
                >
                  → Show Device ID (for support)
                </button>
              </div>
            </div>

            {showDeviceId && (
              <div className="mt-3 p-3 bg-gray-100 rounded-md">
                <p className="text-xs text-gray-600 mb-1">Device ID:</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs font-mono text-gray-800 bg-white px-2 py-1 rounded border flex-1">
                    {licenseInfo.deviceId}
                  </code>
                  <button
                    onClick={copyDeviceId}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LicenseModal