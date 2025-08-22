"use client"

import type React from "react"
import type { ReactElement } from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  Play,
  Pause,
  FileText,
  Users,
  Video,
  CheckCircle,
  Download,
  SkipBack,
  SkipForward,
  Mic,
  Presentation,
  MessageSquare,
  Loader2,
  Zap,
  Settings,
  History,
  Menu,
  X,
  Server,
  Wifi,
  WifiOff,
  Volume2,
} from "lucide-react"

// Types
interface Slide {
  id: number
  title: string
  content: string
  thumbnail: string
}

interface VideoData {
  id: number
  url: string
}

interface PresentationData {
  slides: Slide[]
  videos: VideoData[]
  session_id: string
  total_slides: number
}

interface ChatMessage {
  id: string
  text: string
  type: 'user' | 'bot' | 'voice-input'
  timestamp: number
  videoUrl?: string
  isVideoResponse?: boolean
}

function App(): ReactElement {
  // Core State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [selectedAvatar, setSelectedAvatar] = useState("sarah")
  const [processingStatus, setProcessingStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle")
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Backend Integration State
  const [apiBaseUrl, setApiBaseUrl] = useState("")
  const [isApiConnected, setIsApiConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null)
  
  // Presentation Control State
  const [extractedSlides, setExtractedSlides] = useState<Slide[]>([])
  const [currentTime] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Voice & Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isChatbotVisible, setIsChatbotVisible] = useState(false)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [currentChatInput, setCurrentChatInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  
  // Settings State
  const [settings, setSettings] = useState({
    autoAdvanceSlides: true,
    showSlideNumbers: true,
    includeQA: true,
    speakingSpeed: "normal",
    presentationStyle: "formal",
    background: "office"
  })
  
  // Navigation State
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [currentView, setCurrentView] = useState<'main' | 'presentations' | 'config'>('main')
  const [activeTab, setActiveTab] = useState("upload")
  const [presentationReady, setPresentationReady] = useState(false)
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  
  // Debug State
  const [showDebugConsole, setShowDebugConsole] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  // Debug logging function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    setDebugLogs(prev => [...prev.slice(-49), logMessage])
    console.log(logMessage)
  }

  // Initialize Speech Recognition
  useEffect(() => {
    initializeSpeechRecognition()
    
    // Load saved API URL
    const savedApiUrl = localStorage.getItem("apiBaseUrl")
    if (savedApiUrl) {
      setApiBaseUrl(savedApiUrl)
      checkApiConnection(savedApiUrl)
    }
    
    // Initialize with welcome message
    setChatMessages([{
      id: '1',
      text: '👋 Welcome! You can type your questions or click the microphone button to speak them. I\'ll respond with both text and video answers about the presentation.',
      type: 'bot',
      timestamp: Date.now()
    }])
  }, [])

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      setupRecognition(recognition)
      setRecognition(recognition)
      setSpeechSupported(true)
    } else if ('SpeechRecognition' in window) {
      const recognition = new (window as any).SpeechRecognition()
      setupRecognition(recognition)
      setRecognition(recognition)
      setSpeechSupported(true)
    } else {
      setSpeechSupported(false)
      addDebugLog('Speech recognition not supported')
    }
  }

  const setupRecognition = (recognition: any) => {
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsVoiceRecording(true)
      addDebugLog('Voice recognition started')
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setCurrentChatInput(transcript)
      // Add voice input message first
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: transcript,
        type: 'voice-input',
        timestamp: Date.now()
      }])
      sendQuestion(transcript, true)
      setIsVoiceRecording(false)
    }

    recognition.onerror = (event: any) => {
      addDebugLog(`Voice recognition error: ${event.error}`)
      setIsVoiceRecording(false)
      
      let errorMessage = 'Voice recognition error: '
      switch(event.error) {
        case 'network':
          errorMessage += 'Network error. Please check your connection.'
          break
        case 'not-allowed':
          errorMessage += 'Microphone access denied. Please allow microphone access.'
          break
        case 'no-speech':
          errorMessage += 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage += 'No microphone found or audio capture error.'
          break
        default:
          errorMessage += event.error
      }
      alert(errorMessage)
    }

    recognition.onend = () => {
      setIsVoiceRecording(false)
    }
  }

  // API Functions
  const checkApiConnection = async (url: string) => {
    try {
      addDebugLog(`Checking API connection to: ${url}`)
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      addDebugLog(`API health check response: ${response.status} ${response.statusText}`)
      setIsApiConnected(response.ok)
      
      if (response.ok) {
        try {
          const healthData = await response.json()
          addDebugLog(`API health data: ${JSON.stringify(healthData)}`)
          
          // Store backend capabilities from health check
          if (healthData.voice_support !== undefined) {
            setSpeechSupported(healthData.voice_support)
            addDebugLog(`Voice support: ${healthData.voice_support}`)
          }
          if (healthData.video_response_support !== undefined) {
            addDebugLog(`Video response support: ${healthData.video_response_support}`)
          }
          if (healthData.live_avatar_support !== undefined) {
            addDebugLog(`Live avatar support: ${healthData.live_avatar_support}`)
          }
        } catch (e) {
          addDebugLog("API responded OK but no JSON data")
        }
      } else {
        addDebugLog(`API health check failed: ${response.status}`)
      }
    } catch (error) {
      addDebugLog(`API connection error: ${error}`)
      setIsApiConnected(false)
    }
  }

  const setApiUrl = () => {
    if (!apiBaseUrl.trim()) {
      alert("Please enter a valid API URL")
      return
    }
    const url = apiBaseUrl.replace(/\/$/, "")
    localStorage.setItem("apiBaseUrl", url)
    setApiBaseUrl(url)
    checkApiConnection(url)
  }

  // File Upload & Processing
  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return
    
    const file = files[0]
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.")
      return
    }
    
    setUploadedFile(file)
    addDebugLog(`File uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    
    // Auto-generate if API is connected
    if (isApiConnected) {
      await generatePresentationFromBackend(file)
    } else {
      // Demo mode
      generateDemoPresentation()
    }
  }

  const generatePresentationFromBackend = async (file: File) => {
    if (!apiBaseUrl) {
      addDebugLog("ERROR: No API URL configured")
      alert("Please set and connect to the API URL first.")
      return
    }

    addDebugLog(`Starting presentation generation with file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    setProcessingStatus("processing")

    const formData = new FormData()
    formData.append("presentation_deck", file)
    addDebugLog(`FormData created with file: ${file.type}`)

    try {
      addDebugLog(`Sending POST request to: ${apiBaseUrl}/start_generation/`)
      
      // Add headers for better compatibility
      const response = await fetch(`${apiBaseUrl}/start_generation/`, {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      })

      addDebugLog(`Response received: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        let errorMessage = "Failed to start generation."
        try {
          const errData = await response.json()
          errorMessage = errData.detail || errData.message || errorMessage
          addDebugLog(`Error data: ${JSON.stringify(errData)}`)
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
          addDebugLog(`No JSON error data, using status: ${errorMessage}`)
        }
        throw new Error(errorMessage)
      }

      const initialData = await response.json()
      addDebugLog(`Backend response: ${JSON.stringify(initialData, null, 2)}`)
      
      if (!initialData.slides || initialData.slides.length === 0) {
        addDebugLog("ERROR: No slides in response")
        alert("The presentation could not be processed or contains no slides.")
        setProcessingStatus("error")
        return
      }

      addDebugLog(`Received ${initialData.slides.length} slides, session ID: ${initialData.session_id}`)
      setSessionId(initialData.session_id)
      setPresentationData(initialData)
      
      // Convert backend data to our format
      const convertedSlides = initialData.slides.map((slide: any) => ({
        id: slide.id,
        title: slide.title || `Slide ${slide.id}`,
        content: slide.content || "",
        thumbnail: `${apiBaseUrl}${slide.image_url}`,
      }))
      
      addDebugLog(`Converted slides: ${JSON.stringify(convertedSlides, null, 2)}`)
      setExtractedSlides(convertedSlides)
      setActiveTab("customize")

      // Start polling for status
      addDebugLog(`Starting status polling for session: ${initialData.session_id}`)
      pollGenerationStatus(initialData.session_id)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      addDebugLog(`ERROR in generatePresentationFromBackend: ${errorMessage}`)
      console.error("Error generating presentation:", error)
      alert(`Error generating presentation: ${errorMessage}`)
      setProcessingStatus("error")
    }
  }

  const pollGenerationStatus = (sessionId: string) => {
    let pollCount = 0
    const maxPolls = 300 // 5 minutes max (300 seconds / 1 second interval)
    
    addDebugLog(`Starting polling for session: ${sessionId}`)
    
    const pollInterval = setInterval(async () => {
      pollCount++
      
      if (pollCount > maxPolls) {
        addDebugLog(`ERROR: Polling timeout reached after ${maxPolls} attempts`)
        clearInterval(pollInterval)
        setProcessingStatus("error")
        alert("Generation is taking longer than expected. Please check your backend connection.")
        return
      }

      try {
        addDebugLog(`Polling attempt ${pollCount}/${maxPolls} for session ${sessionId}`)
        
        const response = await fetch(`${apiBaseUrl}/generation_status/${sessionId}`, {
          headers: {
            'Accept': 'application/json',
          }
        })
        
        if (!response.ok) {
          addDebugLog(`Polling failed with status: ${response.status} ${response.statusText}`)
          return
        }

        const statusData = await response.json()
        addDebugLog(`Status response: ${JSON.stringify(statusData)}`)
        
        // Update processing status based on backend response
        if (statusData.status === "Completed") {
          addDebugLog("🎉 Generation completed successfully!")
          setProcessingStatus("complete")
          setPresentationReady(true)
          setActiveTab("present")
          setPresentationData(prev => prev ? { ...prev, videos: statusData.videos } : null)
          clearInterval(pollInterval)
        } else if (statusData.status === "Error" || statusData.status === "Failed") {
          const errorMsg = statusData.error || "Unknown error"
          addDebugLog(`❌ Generation failed: ${errorMsg}`)
          setProcessingStatus("error")
          clearInterval(pollInterval)
          alert(`Generation failed: ${errorMsg}`)
        } else {
          // Update videos as they complete
          addDebugLog(`⏳ Generation in progress: ${statusData.status}`)
          if (statusData.videos && statusData.videos.length > 0) {
            addDebugLog(`📹 Videos available: ${statusData.videos.length}`)
          }
          setPresentationData(prev => prev ? { ...prev, videos: statusData.videos || [] } : null)
        }
      } catch (error) {
        addDebugLog(`⚠️ Polling error: ${error}`)
        // Don't clear interval on single errors, but log them
        if (pollCount % 10 === 0) { // Every 10 attempts, show a warning
          addDebugLog(`⚠️ Polling has failed ${pollCount} times. Still trying...`)
        }
      }
    }, 1000) // Poll every 1 second
  }

  const generateDemoPresentation = () => {
    // Demo slides for when API is not connected
    const demoSlides = [
      {
        id: 1,
        title: "Welcome to Our Company",
        content: "Introduction and overview",
        thumbnail: "/business-presentation-slide.png",
      },
      {
        id: 2,
        title: "Market Analysis",
        content: "Current market trends and opportunities",
        thumbnail: "/market-analysis-charts.png",
      },
      {
        id: 3,
        title: "Our Solution",
        content: "Product features and benefits",
        thumbnail: "/product-solution-diagram.png",
      },
      {
        id: 4,
        title: "Implementation Timeline",
        content: "Project phases and milestones",
        thumbnail: "/timeline-gantt-chart.png",
      },
      {
        id: 5,
        title: "Team Structure",
        content: "Organizational chart and roles",
        thumbnail: "/team-org-chart.png",
      }
    ]

    setExtractedSlides(demoSlides)
    setProcessingStatus("complete")
    setPresentationReady(true)
    setActiveTab("customize")
    addDebugLog("Demo presentation generated")
  }

  // Chat & Voice Functions
  const sendQuestion = async (question: string, isVoiceInput = false) => {
    if (!question.trim()) return

    if (!apiBaseUrl) {
      alert("Please connect to the API first.")
      return
    }
    if (!sessionId) {
      alert("Please upload/generate a presentation first.")
      return
    }

    const messageId = Date.now().toString()
    
    // Only add message if it's not already added (for voice input)
    if (!isVoiceInput) {
      setChatMessages(prev => [...prev, {
        id: messageId,
        text: question,
        type: 'user',
        timestamp: Date.now()
      }])
    }

    setCurrentChatInput("")
    setIsTyping(true)

    try {
      const endpoint = isVoiceInput ? `${apiBaseUrl}/ask_voice_question` : `${apiBaseUrl}/ask_question`
      
      let payload
      if (isVoiceInput) {
        payload = {
          session_id: sessionId,
          question: question,
          confidence: 0.8, // Default confidence for voice input
          generate_video_response: true
        }
      } else {
        payload = {
          session_id: sessionId,
          question: question,
          is_voice_input: false,
          generate_video_response: true
        }
      }

      addDebugLog(`Sending question to ${endpoint}: ${JSON.stringify(payload)}`)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || response.statusText)
      }

      const data = await response.json()
      
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.answer || "I received your question and will respond shortly.",
        type: 'bot',
        timestamp: Date.now()
      }])

      // If video response is being generated, poll for it
      if (data.video_response_enabled && data.response_id) {
        pollVideoResponseStatus(data.response_id)
      }

    } catch (error) {
      console.error("Error sending question:", error)
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'bot',
        timestamp: Date.now()
      }])
    }

    setIsTyping(false)
  }

  const pollVideoResponseStatus = (responseId: string) => {
    const maxPollingTime = 120000 // 2 minutes
    const pollingInterval = 2000 // 2 seconds
    let elapsedTime = 0

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/video_response_status/${responseId}`)
        
        if (!response.ok) {
          throw new Error('Failed to get video status')
        }

        const statusData = await response.json()

        if (statusData.status === 'Completed' && statusData.video_url) {
          clearInterval(pollInterval)
          // Update the last bot message with video URL
          setChatMessages(prev => prev.map(msg => 
            msg.type === 'bot' && msg.timestamp === Math.max(...prev.filter(m => m.type === 'bot').map(m => m.timestamp))
              ? { ...msg, videoUrl: `${apiBaseUrl}${statusData.video_url}` }
              : msg
          ))
        } else if (statusData.status === 'Error') {
          clearInterval(pollInterval)
        }

        elapsedTime += pollingInterval
        if (elapsedTime >= maxPollingTime) {
          clearInterval(pollInterval)
          addDebugLog('Video response polling timed out')
        }

      } catch (error) {
        console.error('Error polling video status:', error)
        elapsedTime += pollingInterval
        if (elapsedTime >= maxPollingTime) {
          clearInterval(pollInterval)
          addDebugLog('Video response polling failed')
        }
      }
    }, pollingInterval)
  }

  const toggleVoiceRecognition = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (isVoiceRecording) {
      recognition?.stop()
    } else {
      // Request microphone permission and start recognition
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
          stream.getTracks().forEach(track => track.stop()) // Stop the stream
          recognition?.start()
        })
        .catch(function() {
          alert('Microphone access denied. Please allow microphone access and try again.')
        })
    }
  }

  // Presentation Control Functions
  const nextSlide = () => {
    if (currentSlide < extractedSlides.length) {
      setCurrentSlide(currentSlide + 1)
      loadSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1)
      loadSlide(currentSlide - 1)
    }
  }

  const loadSlide = (slideNumber: number) => {
    setCurrentSlide(slideNumber)
    
    // Load video if available
    if (presentationData?.videos) {
      const videoData = presentationData.videos.find(v => v.id === slideNumber)
      if (videoData && videoRef.current) {
        videoRef.current.src = `${apiBaseUrl}${videoData.url}`
        if (isPlaying) {
          videoRef.current.play()
        }
      }
    }
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Utility Functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // File Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }

  // Render Functions
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  AI Presenter
                </span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isApiConnected ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <span className="text-xs text-slate-500 font-medium">
                    {isApiConnected ? 'Connected' : 'Offline Mode'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center space-x-1">
              <Button
                variant={currentView === 'main' ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView('main')}
                className={`rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
                  currentView === 'main' 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Video className="w-4 h-4 mr-2" />
                Studio
              </Button>
              
              <Button
                variant={currentView === 'presentations' ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView('presentations')}
                className={`rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
                  currentView === 'presentations' 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4 mr-2" />
                Gallery
              </Button>
              
              <Button
                variant={currentView === 'config' ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView('config')}
                className={`rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
                  currentView === 'config' 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugConsole(!showDebugConsole)}
                className="rounded-lg px-4 py-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Toggle Debug Console"
              >
                <Settings className="w-4 h-4 mr-2" />
                Debug
              </Button>

              <Avatar className="w-8 h-8 border-2 border-slate-200">
                <AvatarImage src="/diverse-user-avatars.png" />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-semibold">U</AvatarFallback>
              </Avatar>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNavMenu(!showNavMenu)}
                className="p-2"
              >
                {showNavMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showNavMenu && (
            <div className="md:hidden border-t border-slate-200 py-4 space-y-2">
              <Button
                variant={currentView === 'main' ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setCurrentView('main')
                  setShowNavMenu(false)
                }}
                className="w-full justify-start"
              >
                <Video className="w-4 h-4 mr-2" />
                Studio
              </Button>
              <Button
                variant={currentView === 'presentations' ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setCurrentView('presentations')
                  setShowNavMenu(false)
                }}
                className="w-full justify-start"
              >
                <History className="w-4 h-4 mr-2" />
                Gallery
              </Button>
              <Button
                variant={currentView === 'config' ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setCurrentView('config')
                  setShowNavMenu(false)
                }}
                className="w-full justify-start"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'main' && (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger 
                value="upload" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-600 font-medium"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger 
                value="customize"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-600 font-medium"
              >
                <Users className="w-4 h-4 mr-2" />
                Customize
              </TabsTrigger>
              <TabsTrigger 
                value="present" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-600 font-medium"
              >
                <Presentation className="w-4 h-4 mr-2" />
                Present
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-8">
              {/* Hero Section */}
              <div className="text-center space-y-6 max-w-4xl mx-auto">
                <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
                  Upload your PDF presentation and watch our AI avatar deliver it with professional excellence. 
                </p>
              </div>

              {/* Upload Area */}
              <Card className="max-w-4xl mx-auto border-0 shadow-lg bg-white">
                <CardContent className="p-8">
                  <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                      isDragOver
                        ? "border-blue-400 bg-blue-50"
                        : uploadedFile
                        ? "border-green-400 bg-green-50"
                        : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {uploadedFile ? (
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">File Ready</h3>
                          <p className="text-slate-600 mb-2">{uploadedFile.name}</p>
                          <p className="text-slate-600">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button onClick={() => setUploadedFile(null)} variant="outline" className="rounded-lg">
                            Remove File
                          </Button>
                          <Button 
                            onClick={() => handleFileUpload([uploadedFile])} 
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6"
                            disabled={processingStatus === "processing"}
                          >
                            {processingStatus === "processing" ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Generate Presentation
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                          <Upload className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Your Presentation</h3>
                          <p className="text-slate-600 mb-6">
                            Drop your PDF file here or click to browse
                          </p>
                          <div className="flex gap-4 justify-center">
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
                            >
                              Choose File
                            </Button>
                          </div>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Processing Status */}
              {processingStatus === "processing" && (
                <Card className="max-w-4xl mx-auto border-0 shadow-lg bg-white">
                  <CardContent className="p-8 text-center">
                    <div className="space-y-4">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                      <h3 className="text-xl font-semibold text-slate-900">Processing Your Presentation</h3>
                      <p className="text-slate-600">
                        Our AI is analyzing your slides and generating the presentation. This may take a few minutes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Customize Tab */}
            <TabsContent value="customize" className="space-y-8">
              {extractedSlides.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Settings Panel */}
                  <div className="lg:col-span-1">
                    <Card className="border-0 shadow-lg bg-white sticky top-24">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl text-slate-900 flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Settings className="w-5 h-5 text-white" />
                          </div>
                          Presentation Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Avatar Selection */}
                        <div className="space-y-4">
                          <label className="text-lg font-medium text-slate-800 flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            AI Presenter
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: "sarah", name: "Sarah", image: "/professional-asian-woman-business-suit.png" },
                              { id: "alex", name: "Alex", image: "/professional-black-man-tech-presenter.png" },
                              { id: "maria", name: "Maria", image: "/latina-creative-director-professional.png" }
                            ].map((avatar) => (
                              <button
                                key={avatar.id}
                                onClick={() => setSelectedAvatar(avatar.id)}
                                className={`relative p-2 rounded-lg transition-all ${
                                  selectedAvatar === avatar.id
                                    ? "ring-2 ring-blue-500 bg-blue-50"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <img
                                  src={avatar.image}
                                  alt={avatar.name}
                                  className="w-full h-16 object-cover rounded-lg"
                                />
                                <p className="text-xs text-center mt-1 font-medium text-slate-700">
                                  {avatar.name}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Speaking Speed */}
                        <div className="space-y-4">
                          <label className="text-lg font-medium text-slate-800 flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <Volume2 className="w-4 h-4 text-white" />
                            </div>
                            Speaking Speed
                          </label>
                          <select 
                            value={settings.speakingSpeed}
                            onChange={(e) => setSettings(prev => ({...prev, speakingSpeed: e.target.value}))}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="slow">Slow (0.8x)</option>
                            <option value="normal">Normal (1.0x)</option>
                            <option value="fast">Fast (1.2x)</option>
                          </select>
                        </div>

                        {/* Presentation Style */}
                        <div className="space-y-4">
                          <label className="text-lg font-medium text-slate-800 flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                              <Zap className="w-4 h-4 text-white" />
                            </div>
                            Presentation Style
                          </label>
                          <select 
                            value={settings.presentationStyle}
                            onChange={(e) => setSettings(prev => ({...prev, presentationStyle: e.target.value}))}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="formal">Formal Business</option>
                            <option value="casual">Casual & Friendly</option>
                            <option value="energetic">Energetic & Dynamic</option>
                            <option value="technical">Technical & Detailed</option>
                          </select>
                        </div>

                        {/* Background */}
                        <div className="space-y-4">
                          <label className="text-lg font-medium text-slate-800 flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                              <Video className="w-4 h-4 text-white" />
                            </div>
                            Background
                          </label>
                          <select 
                            value={settings.background}
                            onChange={(e) => setSettings(prev => ({...prev, background: e.target.value}))}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="office">Modern Office</option>
                            <option value="studio">Professional Studio</option>
                            <option value="home">Home Office</option>
                            <option value="conference">Conference Room</option>
                          </select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Slides Preview */}
                  <div className="lg:col-span-2">
                    <Card className="border-0 shadow-lg bg-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl text-slate-900 flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          Slide Preview ({extractedSlides.length} slides)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                          {extractedSlides.map((slide, index) => (
                            <div
                              key={slide.id}
                              className={`group relative ${
                                currentSlide === index + 1
                                  ? "ring-2 ring-blue-500"
                                  : "hover:ring-2 hover:ring-blue-300"
                              } rounded-lg overflow-hidden transition-all cursor-pointer`}
                              onClick={() => setCurrentSlide(index + 1)}
                            >
                              <div className="w-full h-20 relative">
                                <img
                                  src={slide.thumbnail}
                                  alt={slide.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className={`absolute inset-0 ${
                                  currentSlide === index + 1 
                                    ? "bg-blue-500/20" 
                                    : "bg-black/0 group-hover:bg-black/10"
                                } transition-colors`} />
                                <div className="absolute bottom-1 left-1 bg-white/90 text-slate-700 px-1 py-0.5 rounded text-xs font-bold">
                                  {index + 1}
                                </div>
                              </div>
                              <div className="p-2 bg-white border-t">
                                <h4 className="text-xs font-medium text-slate-900 truncate">
                                  {slide.title}
                                </h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500">Upload a presentation first to customize it.</p>
                </div>
              )}
            </TabsContent>

            {/* Present Tab */}
            <TabsContent value="present" className="space-y-8">
              {presentationReady ? (
                <div className="space-y-6">
                  {/* Presentation Controls */}
                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="p-6">
                      {/* Main Display Area */}
                      <div className="relative bg-black rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                        {/* Current Slide */}
                        <img
                          src={extractedSlides[currentSlide - 1]?.thumbnail}
                          alt={`Slide ${currentSlide}`}
                          className="w-full h-full object-contain"
                        />
                        
                        {/* Video Overlay */}
                        <div className="absolute bottom-4 left-4 w-48 h-48 bg-black rounded-xl overflow-hidden border-4 border-white shadow-xl">
                          <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            muted={false}
                            playsInline
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>

                        {/* Slide Number and Timer */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          {settings.showSlideNumbers && (
                            <div className="bg-white/90 text-slate-700 px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
                              {currentSlide} / {extractedSlides.length}
                            </div>
                          )}
                          <div className="bg-white/90 text-slate-700 px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
                            {formatTime(currentTime)}
                          </div>
                        </div>

                        {/* Quick Navigation */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={prevSlide}
                            disabled={currentSlide === 1}
                            className="bg-white/90 text-slate-700 hover:bg-white rounded-lg shadow-lg disabled:opacity-50"
                          >
                            <SkipBack className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={togglePlayPause}
                            className="bg-white/90 text-slate-700 hover:bg-white rounded-lg shadow-lg"
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={nextSlide}
                            disabled={currentSlide === extractedSlides.length}
                            className="bg-white/90 text-slate-700 hover:bg-white rounded-lg shadow-lg disabled:opacity-50"
                          >
                            <SkipForward className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Control Panel */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSettings(prev => ({...prev, autoAdvanceSlides: !prev.autoAdvanceSlides}))}
                              className={`text-xs ${settings.autoAdvanceSlides ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}
                            >
                              Auto-advance: {settings.autoAdvanceSlides ? 'ON' : 'OFF'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSettings(prev => ({...prev, showSlideNumbers: !prev.showSlideNumbers}))}
                              className={`text-xs ${settings.showSlideNumbers ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}
                            >
                              Numbers: {settings.showSlideNumbers ? 'ON' : 'OFF'}
                            </Button>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={toggleFullscreen}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg"
                          >
                            <Presentation className="w-4 h-4 mr-2" />
                            Slideshow
                          </Button>
                          {settings.includeQA && (
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => setIsChatbotVisible(true)}
                              className="bg-green-600 hover:bg-green-700 text-white border-none rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Q&A
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="lg"
                            className="bg-purple-600 hover:bg-purple-700 text-white border-none rounded-lg"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500">Generate your presentation first to start presenting.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Configuration View */}
        {currentView === 'config' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900 mb-4">API Configuration</h1>
              <p className="text-lg text-slate-600">Configure your backend connection and settings</p>
            </div>

            <Card className="max-w-4xl mx-auto border-0 shadow-lg bg-white">
              <CardHeader className="border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-3">
                      Backend API Connection
                      <div className={`w-3 h-3 rounded-full ${isApiConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </CardTitle>
                    <CardDescription>Configure your backend API endpoint for AI processing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                      placeholder="https://your-backend-api.com"
                      className="flex-1 p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button 
                      onClick={setApiUrl}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    >
                      Connect
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {isApiConnected ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">Connected to backend API</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-red-500" />
                        <span className="text-red-600 font-medium">Not connected - Running in demo mode</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Chatbot */}
      {isChatbotVisible && (
        <div className="fixed right-6 bottom-6 w-96 max-h-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50">
          {/* Chatbot Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-xl">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Q&A Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsChatbotVisible(false)}
              className="text-white hover:bg-white/20 p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' || message.type === 'voice-input' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg text-sm ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'voice-input'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {message.type === 'voice-input' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Mic className="w-3 h-3" />
                      <span className="text-xs opacity-75">Voice input</span>
                    </div>
                  )}
                  <p>{message.text}</p>
                  {message.videoUrl && (
                    <video
                      src={message.videoUrl}
                      controls
                      className="w-full mt-2 rounded"
                      style={{ maxHeight: '120px' }}
                    >
                      Your browser does not support video.
                    </video>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-800 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={currentChatInput}
                onChange={(e) => setCurrentChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendQuestion(currentChatInput)}
                placeholder="Type your question..."
                className="flex-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
              {speechSupported && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleVoiceRecognition}
                  className={`p-2 ${isVoiceRecording ? 'bg-red-100 border-red-300' : ''}`}
                  disabled={isVoiceRecording}
                >
                  <Mic className={`w-4 h-4 ${isVoiceRecording ? 'text-red-600' : 'text-slate-600'}`} />
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => sendQuestion(currentChatInput)}
                disabled={!currentChatInput.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Console */}
      {showDebugConsole && (
        <div className="fixed bottom-6 left-6 w-96 h-64 bg-black text-green-400 rounded-lg p-4 font-mono text-xs overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-bold">Debug Console</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebugConsole(false)}
              className="text-green-400 hover:bg-green-400/20 p-1 h-auto"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {debugLogs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Slideshow */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Fullscreen Content */}
          <div className="flex-1 flex items-center justify-center relative">
            <img
              src={extractedSlides[currentSlide - 1]?.thumbnail}
              alt={`Slide ${currentSlide}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Video Overlay */}
            <div className="absolute bottom-8 left-8 w-64 h-64 bg-black rounded-xl overflow-hidden border-4 border-white shadow-xl">
              <video
                className="w-full h-full object-cover"
                muted={false}
                playsInline
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
          
          {/* Fullscreen Controls */}
          <div className="bg-black/80 backdrop-blur-sm p-6 flex items-center justify-between text-white">
            <div className="flex gap-4">
              <Button
                variant="ghost"
                onClick={prevSlide}
                disabled={currentSlide === 1}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="w-5 h-5 mr-2" />
                Previous
              </Button>
              <Button
                variant="ghost"
                onClick={togglePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                variant="ghost"
                onClick={nextSlide}
                disabled={currentSlide === extractedSlides.length}
                className="text-white hover:bg-white/20"
              >
                Next
                <SkipForward className="w-5 h-5 ml-2" />
              </Button>
            </div>
            
            <div className="text-lg font-medium">
              {currentSlide} / {extractedSlides.length}
            </div>
            
            <div className="flex gap-4">
              <Button
                variant="ghost"
                onClick={() => setIsChatbotVisible(true)}
                className="text-white hover:bg-white/20"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Ask Question
              </Button>
              <Button
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5 mr-2" />
                Exit Slideshow
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
