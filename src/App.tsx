import { useEffect, useState } from 'react'
import OverlayPanel from './components/OverlayPanel'
import LicenseModal from './components/modals/LicenseModal'
import { db } from './services/database'
import { licensingService, LicenseInfo } from './services/licensing'

function App() {
  const [isReady, setIsReady] = useState(false)
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)
  const [showLicenseModal, setShowLicenseModal] = useState(false)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      // Initialize database
      await db.init()
      console.log('📱 Database initialized')

      // Check license status
      const license = await licensingService.getLicenseInfo()
      setLicenseInfo(license)

      console.log('🔐 License status:', {
        isValid: license.isValid,
        isTrialActive: license.isTrialActive,
        trialDaysRemaining: license.trialDaysRemaining,
        hasLicense: !!license.licenseKey
      })

      // Show license modal if needed
      if (!license.isValid || (license.isTrialActive && license.trialDaysRemaining <= 3)) {
        setShowLicenseModal(true)
      }

      setIsReady(true)
    } catch (error) {
      console.error('❌ Failed to initialize app:', error)
      setIsReady(true)
    }
  }

  const handleLicenseActivation = async (licenseKey: string): Promise<boolean> => {
    const success = await licensingService.activateLicense(licenseKey)
    if (success) {
      const updatedLicense = await licensingService.getLicenseInfo()
      setLicenseInfo(updatedLicense)
      setShowLicenseModal(false)
    }
    return success
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Initializing CopyGum...</p>
        </div>
      </div>
    )
  }

  // Block usage if license expired
  if (licenseInfo && !licenseInfo.isValid) {
    return (
      <>
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold mb-2">CopyGum License Required</h1>
            <p className="text-gray-300 mb-4">Your trial period has ended.</p>
            <button
              onClick={() => setShowLicenseModal(true)}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Enter License Key
            </button>
          </div>
        </div>
        
        {licenseInfo && (
          <LicenseModal
            isOpen={showLicenseModal}
            licenseInfo={licenseInfo}
            onActivate={handleLicenseActivation}
            onClose={() => setShowLicenseModal(false)}
          />
        )}
      </>
    )
  }

  // This is a clipboard-only app - always show overlay panel
  return (
    <>
      <OverlayPanel />
      
      {licenseInfo && (
        <LicenseModal
          isOpen={showLicenseModal}
          licenseInfo={licenseInfo}
          onActivate={handleLicenseActivation}
          onClose={() => setShowLicenseModal(false)}
        />
      )}
    </>
  )
}

export default App