// Enhanced Content Analysis for Accurate Source Detection

export interface DetectionResult {
  contentType: string
  sourceApp: string
  confidence: number
  reasoning: string[]
}

export interface ContentTypeResult {
  type: string
  confidence: number
  patterns: string[]
}

export interface SourcePlatformResult {
  platform: string
  confidence: number
  indicators: string[]
}

// Enhanced Content Type Detection
export function analyzeContentType(content: string): ContentTypeResult {
  const trimmed = content.trim()
  const patterns: string[] = []
  
  // API Keys/Tokens (High confidence patterns)
  if (/^sk-[a-zA-Z0-9-]{40,}$/.test(trimmed)) {
    return { type: 'api-key', confidence: 95, patterns: ['OpenAI API key format'] }
  }
  if (/^pk_test_[a-zA-Z0-9]{24}$/.test(trimmed) || /^sk_test_[a-zA-Z0-9]{24}$/.test(trimmed)) {
    return { type: 'api-key', confidence: 95, patterns: ['Stripe API key format'] }
  }
  if (/^ghp_[a-zA-Z0-9]{36}$/.test(trimmed)) {
    return { type: 'api-key', confidence: 95, patterns: ['GitHub personal access token'] }
  }
  if (/^[A-Za-z0-9+/]{40,}={0,2}$/.test(trimmed) && trimmed.length > 40) {
    patterns.push('Base64 pattern (possible token)')
  }
  
  // Code Detection (Multiple indicators)
  const codeIndicators = [
    { pattern: /\b(function|const|let|var|class|import|export|if|else|for|while|return)\b/, desc: 'JavaScript keywords' },
    { pattern: /\b(def|class|import|from|if|elif|else|for|while|return|try|except)\b/, desc: 'Python keywords' },
    { pattern: /^\s*[\w.]+\s*[=:]\s*/, desc: 'Assignment pattern' },
    { pattern: /{\s*[\s\S]*\s*}/, desc: 'Code block braces' },
    { pattern: /^\s*\/\/.*|^\s*\/\*.*\*\/|^\s*#.*/, desc: 'Code comments' },
    { pattern: /;\s*$/, desc: 'Statement terminator' },
    { pattern: /^\s*(public|private|protected|static)\s+/, desc: 'Access modifiers' },
    { pattern: /\.(js|ts|py|java|cpp|cs|php|rb|go|rs)[:.]/, desc: 'File extension in content' }
  ]
  
  let codeScore = 0
  codeIndicators.forEach(indicator => {
    if (indicator.pattern.test(trimmed)) {
      codeScore += 15
      patterns.push(indicator.desc)
    }
  })
  
  if (codeScore >= 30) {
    return { type: 'code', confidence: Math.min(95, codeScore), patterns }
  }
  
  // JSON Detection
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed)
      return { type: 'json', confidence: 90, patterns: ['Valid JSON structure'] }
    } catch {
      patterns.push('JSON-like structure but invalid')
    }
  }
  
  // URLs
  if (/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(trimmed)) {
    return { type: 'url', confidence: 95, patterns: ['HTTP/HTTPS URL format'] }
  }
  
  // Email
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return { type: 'email', confidence: 95, patterns: ['Email format'] }
  }
  
  // Image Detection (Base64 or data URIs)
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/.test(trimmed)) {
    return { type: 'image', confidence: 95, patterns: ['Data URI image format'] }
  }
  if (/^iVBORw0KGgoAAAANSUhEUgAA/.test(trimmed) || /^\/9j\//.test(trimmed) || /^R0lGODlh/.test(trimmed)) {
    return { type: 'image', confidence: 90, patterns: ['Base64 image signature (PNG/JPEG/GIF)'] }
  }
  
  // Color codes
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) {
    return { type: 'color', confidence: 95, patterns: ['Hex color code'] }
  }
  
  // High entropy (possible password/token)
  const entropy = calculateEntropy(trimmed)
  if (entropy > 3.5 && trimmed.length >= 8 && trimmed.length <= 128) {
    if (/[A-Z]/.test(trimmed) && /[a-z]/.test(trimmed) && /\d/.test(trimmed) && /[!@#$%^&*(),.?":{}|<>]/.test(trimmed)) {
      return { type: 'password', confidence: 70, patterns: ['High entropy with mixed character types'] }
    }
  }
  
  return { type: 'text', confidence: 60, patterns: ['No specific patterns detected'] }
}

// Source Platform Detection based on content
export function detectSourcePlatform(content: string): SourcePlatformResult {
  const trimmed = content.trim()
  const indicators: string[] = []
  
  // VS Code / Code Editor indicators
  if (trimmed.includes('Write(') && /\.(ts|js|py|java|cpp|cs|php|rb|go|rs|tsx|jsx)/.test(trimmed)) {
    return { platform: 'VS Code', confidence: 85, indicators: ['VS Code Write command pattern'] }
  }
  if (/^\s*⏺\s*Write\(.*\.(ts|js|py|java)/.test(trimmed)) {
    return { platform: 'VS Code', confidence: 90, indicators: ['VS Code file operation'] }
  }
  if (trimmed.includes('src/') || trimmed.includes('lib/') || trimmed.includes('components/')) {
    indicators.push('Project structure paths')
  }
  if (/^\s*\/\/.*TODO|^\s*\/\/.*FIXME|^\s*#.*TODO/.test(trimmed)) {
    indicators.push('Code comments with TODO/FIXME')
  }
  
  // Terminal indicators
  if (/^\$ /.test(trimmed) || /^> /.test(trimmed)) {
    return { platform: 'Terminal', confidence: 80, indicators: ['Command prompt prefix'] }
  }
  if (/\x1b\[[0-9;]*m/.test(trimmed)) {
    return { platform: 'Terminal', confidence: 85, indicators: ['ANSI color codes'] }
  }
  if (trimmed.includes('Error:') && trimmed.includes('at ')) {
    indicators.push('Stack trace format')
  }
  
  // Browser indicators
  if (trimmed.includes('http://') || trimmed.includes('https://')) {
    indicators.push('Contains URLs')
  }
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return { platform: 'Browser', confidence: 75, indicators: ['HTML tags'] }
  }
  if (trimmed.includes('window.') || trimmed.includes('document.')) {
    indicators.push('Browser DOM references')
  }
  
  // Social Media indicators
  if (trimmed.includes('@') && trimmed.length < 280 && !trimmed.includes('.com')) {
    indicators.push('Mention pattern (possible social media)')
  }
  if (/^.{1,280}$/.test(trimmed) && trimmed.includes('#')) {
    indicators.push('Short text with hashtags')
  }
  
  // File path indicators
  if (/^\/[a-zA-Z0-9_\-/.]+$/.test(trimmed.split('\n')[0])) {
    return { platform: 'File Explorer', confidence: 70, indicators: ['Unix file path'] }
  }
  if (/^[A-Z]:\\[a-zA-Z0-9_\-\\]+$/.test(trimmed.split('\n')[0])) {
    return { platform: 'File Explorer', confidence: 70, indicators: ['Windows file path'] }
  }
  
  // Documentation/Notes indicators
  if (trimmed.includes('# ') || trimmed.includes('## ')) {
    indicators.push('Markdown headers')
  }
  if (trimmed.includes('- [ ]') || trimmed.includes('- [x]')) {
    return { platform: 'Notes App', confidence: 75, indicators: ['Markdown checkboxes'] }
  }
  
  // If we have VS Code indicators, boost confidence
  if (indicators.length > 0 && indicators.some(i => i.includes('Code') || i.includes('Project'))) {
    return { platform: 'VS Code', confidence: 70, indicators }
  }
  
  return { platform: 'Unknown', confidence: 20, indicators }
}

// Enhanced detection that combines both analyses
export function enhancedDetection(content: string, detectedApp: string): DetectionResult {
  const contentAnalysis = analyzeContentType(content)
  const platformAnalysis = detectSourcePlatform(content)
  
  const reasoning: string[] = []
  
  // Start with detected app
  let finalApp = detectedApp
  let confidence = 50
  
  // Override with content-based detection if confidence is high
  if (platformAnalysis.confidence > 70) {
    finalApp = platformAnalysis.platform
    confidence = platformAnalysis.confidence
    reasoning.push(`Content analysis suggests ${platformAnalysis.platform} (${platformAnalysis.confidence}% confidence)`)
    reasoning.push(...platformAnalysis.indicators)
  } else if (detectedApp && detectedApp !== 'System' && detectedApp !== 'Finder') {
    // Use the detected app if it's not a system fallback (including Chrome)
    finalApp = detectedApp
    confidence = 60
    reasoning.push(`Using detected app: ${detectedApp}`)
  } else {
    // Use content analysis as fallback only when no reliable app detected
    finalApp = platformAnalysis.platform
    confidence = Math.max(30, platformAnalysis.confidence)
    reasoning.push(`Fallback to content analysis: ${platformAnalysis.platform}`)
  }
  
  // Add content type reasoning
  reasoning.push(`Content type: ${contentAnalysis.type} (${contentAnalysis.confidence}% confidence)`)
  reasoning.push(...contentAnalysis.patterns)
  
  return {
    contentType: contentAnalysis.type,
    sourceApp: finalApp,
    confidence,
    reasoning
  }
}

// Utility function to calculate entropy
function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {}
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1
  }
  
  let entropy = 0
  const len = str.length
  for (const count of Object.values(freq)) {
    const p = count / len
    entropy -= p * Math.log2(p)
  }
  
  return entropy
}