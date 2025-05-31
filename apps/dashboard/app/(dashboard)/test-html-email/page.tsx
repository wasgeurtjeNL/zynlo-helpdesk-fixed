'use client'

import { useState } from 'react'
import { MessageContent } from '@/components/message-content'

const EXAMPLE_HTML_EMAIL = `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .header { background-color: #f0f0f0; padding: 20px; }
    .content { padding: 20px; }
    .footer { background-color: #f0f0f0; padding: 10px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to Namecheap</h1>
  </div>
  <div class="content">
    <p>Welkom bij Namecheap!</p>
    <p>We have everything you need to launch your online business.</p>
    <p>Check out our services:</p>
    <ul>
      <li><a href="https://www.namecheap.com/domains/">Domain Names</a></li>
      <li><a href="https://www.namecheap.com/hosting/">Web Hosting</a></li>
      <li><a href="https://www.namecheap.com/apps/">Apps</a></li>
    </ul>
    <p>Visit our website: <a href="https://namecheap.com">https://namecheap.com</a></p>
  </div>
  <div class="footer">
    <p>&copy; 2024 Namecheap. All rights reserved.</p>
  </div>
</body>
</html>
`

const BOOKING_EMAIL_EXAMPLE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #003580; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .vacation-deals { background-color: #febb02; color: #003580; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px; }
        .image-container { text-align: center; margin: 20px 0; }
        .image-container img { max-width: 100%; height: auto; border-radius: 8px; }
        .cta-button { display: inline-block; background-color: #0077cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Booking.com</h1>
        </div>
        
        <div class="content">
            <h2 style="color: #003580;">#31 - Bespaar tot 20% op Vakantiedeals voor jou en je dierbaren 🎉</h2>
            
            <div class="image-container">
                <img src="https://via.placeholder.com/500x300/0077cc/ffffff?text=Booking.com+Deals" alt="Vacation Deals">
            </div>
            
            <div class="vacation-deals">
                <h3>De perfecte verblijven en deals</h3>
            </div>
            
            <p>Breng je dierbaren bij elkaar door vakantiewoningen te boeken en te besparen met onze geweldige <strong>Vakantiedeals</strong>.</p>
            
            <center>
                <a href="#" class="cta-button">Boek nu</a>
            </center>
            
            <p>Combineer Vakantiedeals met je Genius-reisvoordelen en bespaar nog meer...</p>
        </div>
        
        <div class="footer">
            <p>email.campaign@sg.booking.com</p>
            <p>&copy; 2024 Booking.com. Alle rechten voorbehouden.</p>
        </div>
    </div>
</body>
</html>
`

const EXAMPLE_PLAIN_WITH_HTML = `Hello,

Check out this link: <a href="https://namecheap.com">Click here</a>

Best regards,
Support Team`

const EXAMPLE_PLAIN_TEXT = `Hello,

This is a plain text message without any HTML.
It should preserve line breaks and formatting.

Best regards,
Support Team`

export default function TestHtmlEmailPage() {
  const [selectedExample, setSelectedExample] = useState<'html' | 'booking' | 'mixed' | 'plain'>('booking')
  const [contentType, setContentType] = useState<string>('text/html')
  const [customContent, setCustomContent] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const getContent = () => {
    if (useCustom) return customContent
    switch (selectedExample) {
      case 'html':
        return EXAMPLE_HTML_EMAIL
      case 'booking':
        return BOOKING_EMAIL_EXAMPLE
      case 'mixed':
        return EXAMPLE_PLAIN_WITH_HTML
      case 'plain':
        return EXAMPLE_PLAIN_TEXT
    }
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">HTML Email Rendering Test</h1>
          <p className="text-sm text-gray-600 mt-1">
            Test hoe HTML emails worden weergegeven in het ticketsysteem
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Test Controls</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Example Type
              </label>
              <select
                value={selectedExample}
                onChange={(e) => {
                  setSelectedExample(e.target.value as any)
                  setUseCustom(false)
                  // Update content type based on selection
                  if (e.target.value === 'html' || e.target.value === 'booking') {
                    setContentType('text/html')
                  } else {
                    setContentType('text/plain')
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="booking">Booking.com Email (Realistic)</option>
                <option value="html">Basic HTML Email</option>
                <option value="mixed">Plain Text with HTML Tags</option>
                <option value="plain">Plain Text Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content-Type Header
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="text/html">text/html</option>
                <option value="text/plain">text/plain</option>
                <option value="">Not specified</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="mr-2"
              />
              Use Custom Content
            </label>
            {useCustom && (
              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Paste your HTML or text content here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                rows={8}
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Preview</h2>
          
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="mb-2 text-xs text-gray-500">
              Content-Type: {contentType || 'not specified'}
            </div>
            <div className="bg-white rounded border border-gray-200 p-4">
              <MessageContent
                content={getContent()}
                contentType={contentType}
                showControls={true}
                detectHtml={true}
                safeMode={false}
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Verbeteringen:</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Betere email-specifieke styling met goede spacing en kleuren</li>
            <li>Ondersteuning voor inline styles en email-specifieke HTML elementen</li>
            <li>Afbeeldingen worden mooi weergegeven met afgeronde hoeken</li>
            <li>Tabellen hebben nu proper styling met borders en padding</li>
            <li>Links zijn duidelijk zichtbaar en openen in nieuwe tabs</li>
            <li>Achtergrondkleuren en layout elementen worden correct getoond</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 