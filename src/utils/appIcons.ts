export interface AppIconMapping {
  [key: string]: string
}

export const APP_ICONS: AppIconMapping = {
  // Browsers
  chrome: '🌐',
  'google chrome': '🌐',
  'google chrome canary': '🟡',
  'chrome canary': '🟡',
  firefox: '🦊',
  safari: '🧭',
  edge: '🌊',
  'microsoft edge': '🌊',
  arc: '🌈',
  brave: '🦁',
  opera: '🎭',
  
  // Development
  vscode: '💻',
  'visual studio code': '💻',
  'vs code': '💻',
  code: '💻',
  cursor: '⚡',
  atom: '⚛️',
  sublime: '📝',
  'sublime text': '📝',
  webstorm: '🔧',
  intellij: '💡',
  'intellij idea': '💡',
  'android studio': '🤖',
  xcode: '🛠️',
  
  // Terminals
  terminal: '⌨️',
  iterm: '💻',
  iterm2: '💻',
  hyper: '🚀',
  warp: '⚡',
  'command prompt': '⌨️',
  powershell: '💙',
  
  // Communication
  discord: '🎮',
  slack: '💬',
  telegram: '✈️',
  whatsapp: '📱',
  'microsoft teams': '👥',
  teams: '👥',
  zoom: '📹',
  skype: '📞',
  messages: '💬',
  
  // Design
  figma: '🎨',
  sketch: '✏️',
  photoshop: '🖼️',
  'adobe photoshop': '🖼️',
  illustrator: '🎨',
  'adobe illustrator': '🎨',
  canva: '🖌️',
  
  // Productivity
  notion: '📚',
  obsidian: '🔮',
  bear: '🐻',
  evernote: '📓',
  onenote: '📄',
  notes: '📝',
  textedit: '📄',
  word: '📄',
  'microsoft word': '📄',
  excel: '📊',
  'microsoft excel': '📊',
  powerpoint: '📊',
  'microsoft powerpoint': '📊',
  
  // Email
  gmail: '📧',
  outlook: '📨',
  mail: '📧',
  
  // Media
  spotify: '🎵',
  'apple music': '🎵',
  vlc: '🎬',
  quicktime: '🎬',
  photos: '📸',
  youtube: '📺',
  twitch: '🎮',
  
  // Development Tools
  docker: '🐳',
  postman: '📮',
  'github desktop': '🐱',
  github: '🐙',
  sourcetree: '🌳',
  tableplus: '🗃️',
  
  // System
  windows: '🪟',
  macos: '🍎',
  linux: '🐧',
  finder: '📁',
  explorer: '📂',
  system: '⚙️',
  electron: '⚡',
  clipflow: '📋',
  
  // Social
  twitter: '🐦',
  facebook: '📘',
  instagram: '📷',
  
  // Default
  default: '📱'
}

export function getAppIcon(source?: string): string {
  if (!source) return APP_ICONS.default
  
  const normalizedSource = source.toLowerCase().trim()
  
  // Try exact match first
  if (APP_ICONS[normalizedSource]) {
    return APP_ICONS[normalizedSource]
  }
  
  // Try partial matches
  for (const [key, icon] of Object.entries(APP_ICONS)) {
    if (normalizedSource.includes(key) || key.includes(normalizedSource)) {
      return icon
    }
  }
  
  return APP_ICONS.default
}

export function getTypeIcon(type: string): string {
  const typeIcons: Record<string, string> = {
    // 🟢 100% Accurate
    text: '📄',
    email: '📧',
    url: '🔗',
    color: '🎨',
    number: '🔢',
    uuid: '🔑',
    ip: '🌐',
    mac: '📡',
    
    // 🟡 High Accuracy
    code: '💻',
    json: '📄',
    jwt: '🎫',
    'api-key': '🔐',
    sql: '🗃️',
    
    // Custom User Types
    password: '🔒',
    'credit-card': '💳',
    phone: '📞',
    
    // Legacy
    api: '⚡'
  }
  
  return typeIcons[type.toLowerCase()] || typeIcons.text
}

export function getTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    text: 'bg-green-500/20 text-green-300 border-green-400/50',
    code: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
    color: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    url: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
    email: 'bg-pink-500/20 text-pink-300 border-pink-400/50',
    password: 'bg-red-500/20 text-red-300 border-red-400/50',
    number: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
    api: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50',
    uuid: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
    ip: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
    mac: 'bg-slate-500/20 text-slate-300 border-slate-400/50',
    json: 'bg-violet-500/20 text-violet-300 border-violet-400/50',
    jwt: 'bg-orange-500/20 text-orange-300 border-orange-400/50',
    'api-key': 'bg-red-600/20 text-red-300 border-red-500/50',
    sql: 'bg-teal-500/20 text-teal-300 border-teal-400/50',
    'credit-card': 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50',
    phone: 'bg-lime-500/20 text-lime-300 border-lime-400/50'
  }
  
  return typeColors[type.toLowerCase()] || typeColors.text
}

export function getAppColor(appName?: string): string {
  if (!appName) return '#6B7280'
  
  const normalizedApp = appName.toLowerCase()
  const colors: Record<string, string> = {
    // Browsers
    'chrome': '#4285F4',
    'google chrome': '#4285F4',
    'safari': '#006CFF',
    'firefox': '#FF7139',
    'edge': '#0078D4',
    'microsoft edge': '#0078D4',
    'arc': '#FF6B6B',
    
    // Code Editors
    'vs code': '#007ACC',
    'visual studio code': '#007ACC',
    'code': '#007ACC',
    'cursor': '#8B5CF6',
    'webstorm': '#000000',
    'intellij': '#000000',
    'intellij idea': '#000000',
    'xcode': '#1575F9',
    
    // Terminals
    'terminal': '#000000',
    'iterm': '#000000',
    'iterm2': '#000000',
    'hyper': '#000000',
    'warp': '#6366F1',
    
    // Communication
    'slack': '#4A154B',
    'discord': '#5865F2',
    'telegram': '#0088cc',
    'whatsapp': '#25D366',
    
    // Productivity
    'notion': '#000000',
    'obsidian': '#7C3AED',
    'bear': '#DF5348',
    
    // Design
    'figma': '#F24E1E',
    'sketch': '#F7B500',
    'photoshop': '#31A8FF',
    'adobe photoshop': '#31A8FF',
    'illustrator': '#FF9A00',
    'adobe illustrator': '#FF9A00',
    
    // System
    'system': '#6B7280',
    'electron': '#47848F',
    'clipflow': '#3B82F6'
  }
  
  // Try exact match first
  if (colors[normalizedApp]) {
    return colors[normalizedApp]
  }
  
  // Try partial matches
  for (const [key, color] of Object.entries(colors)) {
    if (normalizedApp.includes(key) || key.includes(normalizedApp)) {
      return color
    }
  }
  
  return '#6B7280'
}

// Get custom category color with fallback to default
export function getCategoryCustomColor(category: string): string {
  // First try to get custom color from localStorage
  const defaultColors = localStorage.getItem('clipflow-category-colors')
  if (defaultColors) {
    try {
      const colorMap = JSON.parse(defaultColors)
      if (colorMap[category]) {
        return colorMap[category]
      }
    } catch (error) {
      console.warn('Failed to parse clipflow-category-colors from localStorage:', error)
    }
  }

  // Fallback to default color mapping
  const defaultColorMap: Record<string, string> = {
    text: '#10B981',
    code: '#8B5CF6', 
    color: '#F59E0B',
    url: '#3B82F6',
    email: '#EC4899',
    password: '#EF4444',
    number: '#06B6D4',
    api: '#6366F1',
    uuid: '#059669',
    ip: '#0EA5E9',
    mac: '#64748B',
    json: '#8B5CF6',
    jwt: '#F97316',
    'api-key': '#DC2626',
    sql: '#14B8A6',
    'credit-card': '#EAB308',
    phone: '#84CC16'
  }
  
  return defaultColorMap[category.toLowerCase()] || '#10B981'
}

// Get category color styles as object for inline styling
export function getCategoryColorStyles(category: string): {
  backgroundColor: string
  color: string
  borderColor: string
} {
  const color = getCategoryCustomColor(category)
  
  // Convert hex to RGB for opacity
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  
  const rgb = hexToRgb(color)
  if (!rgb) {
    // Fallback to default green if color parsing fails
    return {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      color: 'rgba(16, 185, 129, 0.9)',
      borderColor: 'rgba(16, 185, 129, 0.5)'
    }
  }
  
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
  }
}