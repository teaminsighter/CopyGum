import { app, BrowserWindow, globalShortcut, screen, ipcMain, clipboard, dialog } from 'electron'
import { join } from 'path'
import { exec } from 'child_process'
import { enhancedDetection } from './contentAnalyzer'

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('❌ Another instance is already running. Exiting...')
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null

const isDevelopment = process.env.NODE_ENV === 'development'


function createOverlayWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  
  const panelHeight = 480 // Fixed height that fits content properly

  overlayWindow = new BrowserWindow({
    width: width,
    height: panelHeight,
    x: 0,
    y: height, // Start below screen (hidden)
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // Set window level to appear above all other windows
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (isDevelopment) {
    overlayWindow.loadURL('http://127.0.0.1:5173#overlay')
  } else {
    overlayWindow.loadFile(join(__dirname, '../dist/index.html'), { hash: 'overlay' })
  }

  // Reset variable when window is closed/destroyed
  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  // Hide overlay when it loses focus (with delay to allow clicks and drag operations)
  overlayWindow.on('blur', () => {
    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isFocused() && !isDragActive) {
        hideOverlay()
      }
    }, 150) // Reasonable delay to allow for clicks and short operations
  })
}

function showOverlay(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow()
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const panelHeight = 480 // Fixed height that fits content properly
  
  // Start position (below screen)
  overlayWindow?.setBounds({
    x: 0,
    y: height,
    width: width,
    height: panelHeight
  })

  overlayWindow?.show()
  overlayWindow?.focus()
  
  console.log('🔧 Overlay window state:', {
    isDestroyed: overlayWindow?.isDestroyed(),
    isVisible: overlayWindow?.isVisible(),
    bounds: overlayWindow?.getBounds()
  })
  
  // Animate to final position
  setTimeout(() => {
    overlayWindow?.setBounds({
      x: 0,
      y: height - panelHeight,
      width: width,
      height: panelHeight
    })
    console.log('🔧 Overlay animated to final position:', overlayWindow?.getBounds())
  }, 10)
  
  // Send IPC to trigger any additional animations
  overlayWindow?.webContents.send('show-panel')
}

function hideOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { height } = primaryDisplay.workAreaSize
    
    // Animate to hide position (below screen)
    overlayWindow.setBounds({
      x: overlayWindow.getBounds().x,
      y: height,
      width: overlayWindow.getBounds().width,
      height: overlayWindow.getBounds().height
    })
    
    // Hide window after animation completes
    setTimeout(() => {
      overlayWindow?.hide()
    }, 200)
  }
}

function registerGlobalShortcuts(): void {
  // Register Ctrl+Shift+V (Cmd+Shift+V on Mac)
  const shortcut = process.platform === 'darwin' ? 'Cmd+Shift+V' : 'Ctrl+Shift+V'
  
  console.log(`🔥 Attempting to register global shortcut: ${shortcut}`)
  console.log(`🔥 Platform: ${process.platform}`)
  
  const success = globalShortcut.register(shortcut, async () => {
    console.log(`🔥 Global shortcut ${shortcut} triggered!`)
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      console.log('🔥 Hiding overlay...')
      hideOverlay()
    } else {
      // Capture the CURRENT active app before showing overlay
      try {
        const preOverlayApp = await getActiveApplication()
        if (preOverlayApp && preOverlayApp !== 'Electron' && preOverlayApp !== 'ClipFlow') {
          lastActiveApp = preOverlayApp
          console.log('🎯 Captured source app before overlay:', preOverlayApp)
        }
      } catch (error) {
        console.log('⚠️ Failed to capture source app:', error)
      }
      
      console.log('🔥 Showing overlay...')
      showOverlay()
    }
  })

  if (!success) {
    console.log(`❌ Failed to register global shortcut: ${shortcut}`)
    console.log(`❌ This could be due to:`)
    console.log(`❌ 1. Another app is using this shortcut`)
    console.log(`❌ 2. Accessibility permissions not granted`)
    console.log(`❌ 3. System security restrictions`)
    
    // Try alternative shortcuts
    const alternatives = [
      'Cmd+Shift+C',
      'Cmd+Option+V', 
      'Cmd+Ctrl+V',
      'F12'
    ]
    
    for (const alt of alternatives) {
      const altSuccess = globalShortcut.register(alt, () => {
        console.log(`🔥 Alternative shortcut ${alt} triggered!`)
        if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
          hideOverlay()
        } else {
          showOverlay()
        }
      })
      
      if (altSuccess) {
        console.log(`✅ Successfully registered alternative shortcut: ${alt}`)
        break
      }
    }
  } else {
    console.log(`✅ Successfully registered global shortcut: ${shortcut}`)
  }
  
  // List all registered shortcuts for debugging
  console.log('🔥 All registered shortcuts:', globalShortcut.isRegistered(shortcut) ? [shortcut] : [])
}

// Check permissions and show setup dialog if needed
async function checkPermissions(): Promise<boolean> {
  if (process.platform === 'darwin') {
    const { systemPreferences } = require('electron')
    
    // Check accessibility permissions
    const hasAccessibilityAccess = systemPreferences.isTrustedAccessibilityClient(false)
    
    if (!hasAccessibilityAccess) {
      const { dialog } = require('electron')
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Permissions Required',
        message: 'ClipFlow needs accessibility permissions to work with global shortcuts',
        detail: 'Please grant accessibility permissions in System Preferences > Security & Privacy > Privacy > Accessibility',
        buttons: ['Open System Preferences', 'Continue Anyway'],
        defaultId: 0
      })
      
      if (result.response === 0) {
        systemPreferences.isTrustedAccessibilityClient(true)
      }
    }
  }
  
  return true
}

// License validation
async function validateLicense(): Promise<boolean> {
  try {
    // Import licensing service (will be available after build)
    const { licensingService } = await import('../src/services/licensing')
    const shouldAllow = await licensingService.shouldAllowUsage()
    
    if (!shouldAllow) {
      console.log('🔐 License validation failed - blocking app usage')
      return false
    }
    
    console.log('🔐 License validation passed')
    return true
  } catch (error) {
    console.error('🔐 License validation error:', error)
    return true // Allow on error during development
  }
}

// App event handlers
app.whenReady().then(async () => {
  await checkPermissions()
  
  // Validate license before allowing app to run
  const licenseValid = await validateLicense()
  if (!licenseValid) {
    // Still create window but licensing will be handled in renderer
    console.log('🔐 Creating window for license activation')
  }
  
  // Only create overlay window for clipboard management
  createOverlayWindow()
  registerGlobalShortcuts()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy()
    mainWindow = null
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy()
    overlayWindow = null
  }
})

// Drag state tracking
let isDragActive = false

// Internal copy tracking to prevent duplicates from app copies
let isInternalCopy = false

// Track the last active application (before our app becomes active)
let lastActiveApp = 'System'
// let lastClipboardCheck = Date.now()
// let appAtLastClipboardCheck = 'System'
let appHistory: Array<{app: string, timestamp: number}> = []

// IPC handlers
ipcMain.handle('get-clipboard-text', () => {
  return clipboard.readText()
})

ipcMain.handle('set-clipboard-text', (_, text: string) => {
  // Mark as internal copy to prevent duplicate detection
  isInternalCopy = true
  clipboard.writeText(text)
  
  // Reset flag after a short delay to allow for clipboard monitoring
  setTimeout(() => {
    isInternalCopy = false
  }, 1000) // 1 second should be enough
})

ipcMain.handle('hide-overlay', () => {
  hideOverlay()
})

ipcMain.handle('get-screen-size', () => {
  const primaryDisplay = screen.getPrimaryDisplay()
  return primaryDisplay.workAreaSize
})

ipcMain.handle('set-drag-state', (_, isActive: boolean) => {
  isDragActive = isActive
})

ipcMain.handle('update-custom-detection-rules', (_, rules: typeof customDetectionRules) => {
  customDetectionRules = rules
  console.log('🔧 Updated custom detection rules:', rules.length, 'rules')
})

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(overlayWindow || mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select storage folder',
    buttonLabel: 'Select Folder'
  })
  return result
})

// Start clipboard monitoring
let lastClipboardContent = ''
let lastClipboardHash = ''
let lastProcessedTime = 0

// Function to get the active application
async function getActiveApplication(): Promise<string> {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      // macOS - get frontmost application
      const script = `tell application "System Events" to get name of first application process whose frontmost is true`
      exec(`osascript -e '${script}'`, { timeout: 2000 }, (error, stdout) => {
        if (error) {
          resolve('System')
          return
        }
        
        const appName = stdout.trim()
        
        // Enhanced app name mapping with more variations
        const appMapping: Record<string, string> = {
          // Browsers
          'Google Chrome': 'Chrome',
          'Google Chrome Canary': 'Chrome Canary', 
          'Microsoft Edge': 'Edge',
          'Safari': 'Safari',
          'Firefox': 'Firefox',
          'Arc': 'Arc',
          'Brave Browser': 'Brave',
          'Opera': 'Opera',
          
          // Code Editors & IDEs  
          'Visual Studio Code': 'VS Code',
          'Code': 'VS Code',
          'Code - Insiders': 'VS Code Insiders',
          'Cursor': 'Cursor',
          'WebStorm': 'WebStorm',
          'IntelliJ IDEA': 'IntelliJ',
          'IntelliJ IDEA Community Edition': 'IntelliJ',
          'IntelliJ IDEA Ultimate': 'IntelliJ',
          'PyCharm': 'PyCharm',
          'PhpStorm': 'PhpStorm',
          'CLion': 'CLion',
          'Xcode': 'Xcode',
          'Atom': 'Atom',
          'Sublime Text': 'Sublime Text',
          'Android Studio': 'Android Studio',
          
          // Terminals
          'Terminal': 'Terminal',
          'iTerm2': 'iTerm',
          'iTerm': 'iTerm',
          'Hyper': 'Hyper',
          'Warp': 'Warp',
          'Alacritty': 'Alacritty',
          
          // Communication
          'Slack': 'Slack',
          'Discord': 'Discord',
          'Telegram': 'Telegram',
          'WhatsApp': 'WhatsApp',
          'Microsoft Teams': 'Teams',
          'Zoom': 'Zoom',
          'Skype': 'Skype',
          
          // Email & Messages
          'Mail': 'Mail',
          'Messages': 'Messages',
          'Microsoft Outlook': 'Outlook',
          'Outlook': 'Outlook',
          
          // Productivity
          'Notes': 'Notes',
          'TextEdit': 'TextEdit',
          'Notion': 'Notion',
          'Obsidian': 'Obsidian',
          'Bear': 'Bear',
          'Evernote': 'Evernote',
          'Microsoft Word': 'Word',
          'Microsoft Excel': 'Excel',
          'Microsoft PowerPoint': 'PowerPoint',
          'Pages': 'Pages',
          'Numbers': 'Numbers',
          'Keynote': 'Keynote',
          
          // Design
          'Figma': 'Figma',
          'Sketch': 'Sketch',
          'Adobe Photoshop 2024': 'Photoshop',
          'Adobe Photoshop': 'Photoshop',
          'Adobe Illustrator 2024': 'Illustrator', 
          'Adobe Illustrator': 'Illustrator',
          'Adobe After Effects 2024': 'After Effects',
          'Adobe After Effects': 'After Effects',
          'Adobe Premiere Pro 2024': 'Premiere Pro',
          'Adobe Premiere Pro': 'Premiere Pro',
          'Canva': 'Canva',
          
          // Media
          'Spotify': 'Spotify',
          'Apple Music': 'Apple Music',
          'Music': 'Apple Music',
          'VLC media player': 'VLC',
          'VLC': 'VLC',
          'QuickTime Player': 'QuickTime',
          'Photos': 'Photos',
          
          // Development Tools
          'Docker Desktop': 'Docker',
          'Docker': 'Docker',
          'Postman': 'Postman',
          'GitHub Desktop': 'GitHub Desktop',
          'SourceTree': 'SourceTree',
          'TablePlus': 'TablePlus',
          'Sequel Pro': 'Sequel Pro',
          'Insomnia': 'Insomnia',
          'Paw': 'Paw',
          'RapidAPI': 'RapidAPI',
          
          // Project Management & Productivity
          'Height': 'Height',
          'Asana': 'Asana',
          'Trello': 'Trello',
          'Monday.com': 'Monday',
          'ClickUp': 'ClickUp',
          'Jira': 'Jira',
          'Confluence': 'Confluence',
          
          // AI & Modern Tools
          'ChatGPT': 'ChatGPT',
          'Claude': 'Claude',
          'Perplexity': 'Perplexity',
          'GitHub Copilot': 'Copilot',
          'Raycast': 'Raycast',
          'Alfred': 'Alfred',
          'Linear': 'Linear',
          'Arc Browser': 'Arc',
          'Zed': 'Zed',
          'Nova': 'Nova',
          'Fleet': 'Fleet',
          'Vim': 'Vim',
          'Neovim': 'Neovim',
          
          // Finance & Business
          'Stripe Dashboard': 'Stripe',
          'PayPal': 'PayPal',
          'QuickBooks': 'QuickBooks',
          'FreshBooks': 'FreshBooks',
          
          // Cloud & DevOps
          'AWS Console': 'AWS',
          'Google Cloud Console': 'GCP',
          'Azure Portal': 'Azure',
          'Vercel': 'Vercel',
          'Netlify': 'Netlify',
          'Railway': 'Railway',
          
          // System
          'Finder': 'Finder',
          'Activity Monitor': 'Activity Monitor',
          'System Preferences': 'System Preferences',
          'System Settings': 'System Settings',
          'ClipFlow': 'ClipFlow'
        }
        
        const mappedName = appMapping[appName] || appName || 'System'
        resolve(mappedName)
      })
    } else if (process.platform === 'win32') {
      // Windows - get foreground window
      exec('powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne \\"\\"} | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json"', (error, stdout) => {
        if (error) {
          resolve('System')
          return
        }
        try {
          const processes = JSON.parse(stdout)
          const activeProcess = Array.isArray(processes) ? processes[0] : processes
          resolve(activeProcess?.ProcessName || 'System')
        } catch {
          resolve('System')
        }
      })
    } else {
      // Linux and others
      exec('xdotool getactivewindow getwindowname', (error, stdout) => {
        if (error) {
          resolve('System')
          return
        }
        const windowTitle = stdout.trim()
        // Extract app name from window title (basic heuristic)
        const appName = windowTitle.split(' ')[0] || 'System'
        resolve(appName)
      })
    }
  })
}

// Function to continuously track active application (excluding our own app)
function startActiveAppTracking() {
  setInterval(async () => {
    try {
      const currentApp = await getActiveApplication()
      const now = Date.now()
      
      // Only update if it's not our app (Electron, ClipFlow)
      if (currentApp !== 'Electron' && currentApp !== 'ClipFlow') {
        // Add to history
        appHistory.push({app: currentApp, timestamp: now})
        // Keep only last 10 apps in history
        if (appHistory.length > 10) {
          appHistory.shift()
        }
        
        if (currentApp !== lastActiveApp) {
          lastActiveApp = currentApp
          console.log('🎯 Active app changed to:', currentApp)
        }
      }
    } catch (error) {
      // Silently handle errors in background tracking
    }
  }, 500) // Check every 500ms for better accuracy
}

function startClipboardMonitoring() {
  setInterval(async () => {
    let currentContent = clipboard.readText()
    let contentType = 'text'
    const now = Date.now()
    
    // Check for image content if text is empty
    if (!currentContent || currentContent.length === 0) {
      const image = clipboard.readImage()
      if (!image.isEmpty()) {
        currentContent = image.toDataURL()
        contentType = 'image'
      } else {
        return
      }
    }
    
    // IMMEDIATE duplicate check - skip if exactly the same
    if (currentContent === lastClipboardContent) {
      return
    }
    
    // Create a more robust hash for duplicate detection
    const contentHash = currentContent.length + currentContent.substring(0, 50) + currentContent.substring(currentContent.length - 50)
    
    // Enhanced duplicate detection with timing check
    if (contentHash !== lastClipboardHash &&
        currentContent.trim() !== lastClipboardContent.trim() &&
        now - lastProcessedTime > 500) { // At least 500ms between processing
      // Skip if this is an internal copy from the app
      if (isInternalCopy) {
        console.log('🔄 Skipping internal copy, preventing duplicate:', currentContent.substring(0, 50) + '...')
        lastClipboardContent = currentContent // Update last content to prevent future detection
        return
      }
      
      console.log('📋 New external clipboard content detected:', currentContent.substring(0, 50) + '...', 'PID:', process.pid)
      
      // Enhanced detection using content analysis
      let detectedApp = 'System'
      try {
        const realTimeApp = await getActiveApplication()
        console.log('🔍 Real-time frontmost app:', realTimeApp)
        console.log('🔍 Tracked lastActiveApp:', lastActiveApp)
        
        // Use real-time detection unless it's our own app
        if (realTimeApp && realTimeApp !== 'Electron' && realTimeApp !== 'ClipFlow') {
          detectedApp = realTimeApp
        } else {
          detectedApp = lastActiveApp || 'System'
        }
      } catch (error) {
        detectedApp = lastActiveApp || 'System'
        console.log('⚠️ App detection error:', error)
      }
      
      // Use enhanced content-based detection
      const analysis = enhancedDetection(currentContent, detectedApp)
      const sourceApp = analysis.sourceApp
      
      console.log('🧠 Enhanced Detection Results:')
      console.log('  📱 Source App:', sourceApp, `(${analysis.confidence}% confidence)`)
      console.log('  📄 Content Type:', analysis.contentType)
      console.log('  🔍 Reasoning:', analysis.reasoning.join('; '))
      
      lastClipboardContent = currentContent
      lastClipboardHash = contentHash
      // lastClipboardCheck = now
      lastProcessedTime = now
      // appAtLastClipboardCheck = lastActiveApp
      
      // Send clipboard change to both main and overlay windows
      const clipboardData = {
        content: currentContent,
        timestamp: Date.now(),
        type: analysis.contentType,
        source: sourceApp,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning
      }
      
      // Only send clipboard data to overlay window to prevent duplicates
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        console.log('📤 Sending clipboard data to overlay window')
        overlayWindow.webContents.send('clipboard-changed', clipboardData)
      }
      
    }
  }, 1000) // Check every 1 second to prevent rapid duplicates
}

// Custom detection rules (loaded from settings)
let customDetectionRules: Array<{
  id: string
  name: string
  pattern: string
  type: string
  enabled: boolean
  description?: string
}> = []

// Removed unused detectContentType function

// Start monitoring when app is ready
app.whenReady().then(() => {
  startActiveAppTracking()
  startClipboardMonitoring()
})