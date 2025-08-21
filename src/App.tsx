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
  Maximize2,
  SkipBack,
  SkipForward,
  Mic,
  Presentation,
  BarChart3,
  MessageSquare,
  Star,
  HelpCircle,
  Loader2,
  Zap,
  Settings,
  Grid,
  List,
  Share,
  History,
  Menu,
  X,
  Globe,
  Server,
  Wifi,
  WifiOff,
  Calendar,
  Volume2,
} from "lucide-react"

function App(): ReactElement {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [selectedAvatar, setSelectedAvatar] = useState("sarah")
  const [processingStatus, setProcessingStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">(
    "idle",
  )
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Backend API Integration State
  const [apiBaseUrl, setApiBaseUrl] = useState("")
  const [isApiConnected, setIsApiConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [presentationData, setPresentationData] = useState<{slides: any[], videos: any[], session_id: string, total_slides: number} | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{id: string, text: string, type: 'user' | 'bot' | 'voice-input', timestamp: number}>>([])
  const [isChatbotVisible, setIsChatbotVisible] = useState(false)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration] = useState(525) // 8:45 in seconds
  
  // Voice recognition setup
  const [recognition, setRecognition] = useState<any>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  
  // Navigation and Configuration State
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [currentView, setCurrentView] = useState<'main' | 'presentations' | 'config'>('main')
  const [pastPresentations] = useState<Array<{
    id: string,
    title: string,
    date: string,
    thumbnail: string,
    duration: string,
    status: 'completed' | 'processing' | 'failed'
  }>>([
    {
      id: '1',
      title: 'Q4 Business Review',
      date: '2025-08-15',
      thumbnail: '/business-presentation-slide-1.png',
      duration: '8:45',
      status: 'completed'
    },
    {
      id: '2', 
      title: 'Product Launch Strategy',
      date: '2025-08-10',
      thumbnail: '/market-analysis-charts.png',
      duration: '12:30',
      status: 'completed'
    },
    {
      id: '3',
      title: 'Team Training Materials',
      date: '2025-08-05',
      thumbnail: '/team-org-chart.png',
      duration: '6:20',
      status: 'processing'
    }
  ])
  
  // Configuration Settings
  const [settings, setSettings] = useState({
    autoAdvanceSlides: true,
    showSlideNumbers: false,
    includeQA: true,
    defaultVoiceSpeed: 1.0,
    videoQuality: 'high',
    enableNotifications: true,
    theme: 'light'
  })

  // Fullscreen and presentation states
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        setIsVoiceRecording(true)
      }
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        sendQuestion(transcript, true)
        setIsVoiceRecording(false)
      }
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsVoiceRecording(false)
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `❌ Voice recognition error: ${event.error}`,
          type: 'bot',
          timestamp: Date.now()
        }])
      }
      
      recognitionInstance.onend = () => {
        setIsVoiceRecording(false)
      }
      
      setRecognition(recognitionInstance)
      setSpeechSupported(true)
    } else {
      setSpeechSupported(false)
    }
  }, [])

  const toggleVoiceRecognition = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser.')
      return
    }

    if (isVoiceRecording && recognition) {
      recognition.stop()
    } else if (recognition) {
      recognition.start()
    }
  }
  const [extractedSlides, setExtractedSlides] = useState<
    Array<{
      id: number
      title: string
      content: string
      thumbnail: string
    }>
  >([])
  const [audienceQuestions] = useState<
    Array<{
      id: number
      question: string
      timestamp: number
      answered: boolean
    }>
  >([
    { id: 1, question: "What's the ROI timeline for this solution?", timestamp: 120, answered: false },
    { id: 2, question: "How does this compare to competitors?", timestamp: 180, answered: true },
    { id: 3, question: "What are the implementation requirements?", timestamp: 240, answered: false },
  ])

  const [activeTab, setActiveTab] = useState("upload")
  const [workflowStep, setWorkflowStep] = useState<"upload" | "processing" | "customize" | "generate" | "present">(
    "upload",
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [presentationReady, setPresentationReady] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Backend API Functions
  useEffect(() => {
    const savedApiUrl = localStorage.getItem("apiBaseUrl")
    if (savedApiUrl) {
      setApiBaseUrl(savedApiUrl)
      checkApiConnection(savedApiUrl)
    }
  }, [])

  const checkApiConnection = async (url: string) => {
    try {
      const response = await fetch(`${url}/health`)
      setIsApiConnected(response.ok)
    } catch (error) {
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

  const generatePresentationFromBackend = async () => {
    if (!apiBaseUrl) {
      alert("Please set and connect to the API URL first.")
      return
    }
    if (!uploadedFile) {
      alert("Please select a PDF file first.")
      return
    }

    setProcessingStatus("processing")
    setWorkflowStep("processing")

    const formData = new FormData()
    formData.append("presentation_deck", uploadedFile)

    try {
      const response = await fetch(`${apiBaseUrl}/start_generation/`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || "Failed to start generation.")
      }

      const initialData = await response.json()
      if (!initialData.slides || initialData.slides.length === 0) {
        alert("The PDF could not be processed or contains no slides.")
        setProcessingStatus("error")
        return
      }

      setSessionId(initialData.session_id)
      setPresentationData(initialData)
      
      // Convert backend data to our format
      setExtractedSlides(initialData.slides.map((slide: any) => ({
        id: slide.id,
        title: slide.title || `Slide ${slide.id}`,
        content: slide.content || "",
        thumbnail: `${apiBaseUrl}${slide.image_url}`,
      })))

      // Start polling for status
      pollGenerationStatus(initialData.session_id)

    } catch (error) {
      console.error("Error:", error)
      alert(`Error generating presentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setProcessingStatus("error")
    }
  }

  const pollGenerationStatus = (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/generation_status/${sessionId}`)
        if (!response.ok) return

        const statusData = await response.json()
        
        // Update processing status based on backend response
        if (statusData.status === "Completed") {
          setProcessingStatus("complete")
          setWorkflowStep("customize")
          setPresentationData((prev: any) => ({ ...prev, videos: statusData.videos }))
          clearInterval(pollInterval)
        } else if (statusData.status === "Error") {
          setProcessingStatus("error")
          clearInterval(pollInterval)
        } else {
          // Update videos as they complete
          setPresentationData((prev: any) => ({ ...prev, videos: statusData.videos || [] }))
        }
      } catch (error) {
        console.error("Polling error:", error)
        clearInterval(pollInterval)
        setProcessingStatus("error")
      }
    }, 1000) // Faster polling - every 1 second instead of 3
  }

  const sendQuestion = async (question: string, isVoiceInput = false) => {
    if (!apiBaseUrl || !sessionId) {
      alert("Please connect to API and generate a presentation first.")
      return
    }

    const messageId = Date.now().toString()
    setChatMessages(prev => [...prev, {
      id: messageId,
      text: question,
      type: isVoiceInput ? 'voice-input' : 'user',
      timestamp: Date.now()
    }])

    try {
      const endpoint = isVoiceInput ? `${apiBaseUrl}/ask_voice_question` : `${apiBaseUrl}/ask_question`
      const payload = {
        session_id: sessionId,
        question: question,
        generate_video_response: true
      }

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
  }

  const pollVideoResponseStatus = (responseId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/video_response_status/${responseId}`)
        
        if (!response.ok) {
          clearInterval(pollInterval)
          return
        }

        const statusData = await response.json()

        if (statusData.status === 'Completed' && statusData.video_url) {
          // Add video response message
          setChatMessages(prev => [...prev, {
            id: (Date.now() + 3).toString(),
            text: `🎥 Video response: ${apiBaseUrl}${statusData.video_url}`,
            type: 'bot',
            timestamp: Date.now()
          }])
          clearInterval(pollInterval)
        } else if (statusData.status === 'Error') {
          setChatMessages(prev => [...prev, {
            id: (Date.now() + 4).toString(),
            text: `❌ Error generating video response: ${statusData.error || 'Unknown error'}`,
            type: 'bot',
            timestamp: Date.now()
          }])
          clearInterval(pollInterval)
        }

      } catch (error) {
        console.error('Error polling video status:', error)
        clearInterval(pollInterval)
      }
    }, 1000) // Faster polling - every 1 second instead of 2
  }

  useEffect(() => {
    if (processingStatus === "complete" && workflowStep === "processing") {
      setWorkflowStep("customize")
      setActiveTab("customize")
    }
  }, [processingStatus, workflowStep])

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return

    const file = files[0]
    setUploadedFile(file)
    
    // If API is connected, use backend processing
    if (isApiConnected && apiBaseUrl) {
      await generatePresentationFromBackend()
      return
    }

    // Instant processing - no delays, directly set the slides and complete status
    setExtractedSlides([
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
      },
      {
        id: 6,
        title: "Financial Projections",
        content: "Revenue and growth forecasts",
        thumbnail: "/financial-charts-graphs.png",
      },
      {
        id: 7,
        title: "Risk Assessment",
        content: "Potential challenges and mitigation",
        thumbnail: "/risk-matrix-analysis.png",
      },
      {
        id: 8,
        title: "Technology Stack",
        content: "Technical architecture overview",
        thumbnail: "/technology-architecture-diagram.png",
      },
      {
        id: 9,
        title: "Customer Testimonials",
        content: "Success stories and feedback",
        thumbnail: "/customer-testimonial-quotes.png",
      },
      {
        id: 10,
        title: "Next Steps",
        content: "Action items and follow-up",
        thumbnail: "/business-presentation-slide.png",
      },
    ])

    // Instantly complete the processing
    setProcessingStatus("complete")
    setPresentationReady(true)
    
    // Enable all tabs immediately
    setActiveTab("customize")
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload([file])
    }
  }

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

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.includes("presentation") || file.name.endsWith(".ppt") || file.name.endsWith(".pptx")) {
        handleFileUpload([file])
      }
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setProcessingStatus("idle")
    setExtractedSlides([])
  }

  const avatars = [
    {
      id: "sarah",
      name: "Sarah Chen",
      role: "Business Executive",
      image: "/placeholder-6lbwa.png",
      accent: "American",
      expertise: "Corporate Strategy",
      tone: "Professional & Confident",
      languages: ["English", "Mandarin"],
      rating: 4.9,
      presentations: 2847,
      description: "Specializes in executive presentations and strategic communications",
    },
    {
      id: "marcus",
      name: "Marcus Johnson",
      role: "Tech Presenter",
      image: "/professional-black-man-tech-presenter.png",
      accent: "British",
      expertise: "Technology & Innovation",
      tone: "Engaging & Technical",
      languages: ["English", "French"],
      rating: 4.8,
      presentations: 1923,
      description: "Expert in technical presentations and product demonstrations",
    },
    {
      id: "elena",
      name: "Elena Rodriguez",
      role: "Creative Director",
      image: "/latina-creative-director-professional.png",
      accent: "Spanish",
      expertise: "Creative & Marketing",
      tone: "Dynamic & Inspiring",
      languages: ["English", "Spanish", "Portuguese"],
      rating: 4.9,
      presentations: 3156,
      description: "Brings creativity and passion to marketing and brand presentations",
    },
    {
      id: "david",
      name: "David Kim",
      role: "Sales Expert",
      image: "/asian-sales-expert.png",
      accent: "American",
      expertise: "Sales & Persuasion",
      tone: "Persuasive & Charismatic",
      languages: ["English", "Korean", "Japanese"],
      rating: 4.7,
      presentations: 2634,
      description: "Master of sales presentations and client communications",
    },
  ]

  const generatePresentation = async () => {
    setIsGenerating(true)
    setGenerationProgress(0)
    setWorkflowStep("generate")

    // Fast generation process
    const steps = [
      "Preparing avatar model...",
      "Generating voice synthesis...",
      "Synchronizing with slides...",
      "Rendering video segments...",
      "Finalizing presentation...",
      "Starting presentation...",
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      setGenerationProgress(((i + 1) / steps.length) * 100)
    }

    setPresentationReady(true)
    setIsGenerating(false)
    setWorkflowStep("present")
    setActiveTab("present")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const nextSlide = () => {
    if (currentSlide < extractedSlides.length) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const jumpToSlide = (slideNumber: number) => {
    setCurrentSlide(slideNumber)
    const timePerSlide = videoDuration / extractedSlides.length
    const newTime = (slideNumber - 1) * timePerSlide
    handleSeek(newTime)
  }

  const handleSeek = (time: number) => {
    setCurrentTime(time)
  }

  const startFullscreenSlideshow = () => {
    // setIsFullscreenMode(true) // Currently disabled
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
    }
  }

  const loadSlideVideo = (slideIndex: number) => {
    if (presentationData?.videos) {
      const slide = extractedSlides[slideIndex - 1]
      const videoData = presentationData.videos.find((v: any) => v.id === slide?.id)
      if (videoData?.url) {
        setCurrentVideoUrl(`${apiBaseUrl}${videoData.url}`)
        return true
      }
    }
    setCurrentVideoUrl(null)
    return false
  }

  useEffect(() => {
    loadSlideVideo(currentSlide)
  }, [currentSlide, presentationData])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // setIsFullscreenMode(false) // Currently disabled
      }
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Modern Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Video className="w-6 h-6 text-white" />
                </div>
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

              <div className="h-6 w-px bg-slate-200 mx-2" />

              <Button variant="outline" size="sm" className="rounded-lg px-4 py-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
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
                {/* <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                  Transform Your Presentations with{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    AI Power
                  </span>
                </h1> */}
                <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
                  Upload your PowerPoint and watch our AI avatar deliver it with professional excellence. 
                </p>

                {/* Feature Pills
                <div className="flex flex-wrap justify-center gap-3 mt-8">
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    <Zap className="w-4 h-4" />
                    AI-Powered
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Professional Quality
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                    <Video className="w-4 h-4" />
                    Interactive Experience
                  </div>
                </div> */}
              </div>

              {/* Upload Area */}
              <Card className="max-w-4xl mx-auto border-0 shadow-lg bg-white">
                <CardContent className="p-8">
                  <div
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                      isDragOver
                        ? "border-blue-400 bg-blue-50"
                        : uploadedFile
                          ? "border-green-400 bg-green-50"
                          : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/30"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {uploadedFile ? (
                      <div className="space-y-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                          <FileText className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900 mb-1">{uploadedFile.name}</h3>
                          <p className="text-slate-600">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button onClick={removeFile} variant="outline" className="rounded-lg">
                            Remove File
                          </Button>
                          <Button 
                            onClick={() => handleFileUpload([uploadedFile])} 
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Generate Presentation
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                          <Upload className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-semibold text-slate-900 mb-2">Upload Your Presentation</h3>
                          <p className="text-slate-600 mb-6">
                            Drag and drop your PowerPoint file here, or click to browse
                          </p>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-3"
                          >
                            <Upload className="w-5 h-5 mr-2" />
                            Choose File
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            onChange={handleFileInputChange}
                            className="hidden"
                          />
                        </div>
                        <div className="text-sm text-slate-500">
                          Supported formats: PPT, PPTX • Maximum size: 50MB
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          {/* Customize Tab */}
          <TabsContent value="customize" className="mt-8 space-y-8 animate-fade-in">
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-gradient animate-slide-up">
                Choose Your AI Presenter
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto animate-slide-up" style={{animationDelay: '0.1s'}}>
                Select the perfect avatar to deliver your presentation with style and expertise
              </p>
              {presentationData && (
                <div className="inline-flex items-center glass border border-slate-200 dark:border-slate-700 rounded-full px-6 py-3 animate-slide-up" style={{animationDelay: '0.2s'}}>
                  <FileText className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Processing {presentationData.total_slides} slides • {presentationData.videos?.length || 0} videos ready
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {avatars.map((avatar, index) => (
                <Card
                  key={avatar.id}
                  className={`group cursor-pointer card-modern transition-all duration-500 hover:scale-105 animate-slide-up ${
                    selectedAvatar === avatar.id
                      ? "ring-2 ring-blue-500 shadow-2xl shadow-blue-500/20 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"
                      : "hover:shadow-xl hover:shadow-slate-500/10"
                  }`}
                  style={{animationDelay: `${index * 0.1}s`}}
                  onClick={() => setSelectedAvatar(avatar.id)}
                >
                  <CardContent className="p-6 space-y-6">
                    <div className="relative overflow-hidden rounded-2xl">
                      <img
                        src={avatar.image || "/placeholder.svg"}
                        alt={avatar.name}
                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      {selectedAvatar === avatar.id && (
                        <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      )}
                      
                      {/* Avatar info overlay */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-semibold text-lg text-white mb-1">{avatar.name}</h3>
                        <p className="text-sm text-blue-200 font-medium">{avatar.role}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{avatar.description}</p>
                      
                      {/* Key metrics */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Expertise</span>
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">{avatar.expertise}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Accent</span>
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">{avatar.accent}</span>
                        </div>
                      </div>
                      
                      {/* Language tags */}
                      <div className="flex flex-wrap gap-2">
                        {avatar.languages.map((lang) => (
                          <span key={lang} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-md">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{avatar.rating}</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {avatar.presentations.toLocaleString()} uses
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enhanced Customization Options */}
            <Card className="max-w-6xl mx-auto card-modern shadow-2xl animate-slide-up">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-3xl font-bold text-gradient">
                  Presentation Settings
                </CardTitle>
                <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
                  Fine-tune your presentation delivery for maximum impact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <label className="text-lg font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Volume2 className="w-4 h-4 text-white" />
                      </div>
                      Speaking Speed
                    </label>
                    <select className="input-elegant w-full">
                      <option value="slow">Slow (0.8x)</option>
                      <option value="normal" selected>Normal (1.0x)</option>
                      <option value="fast">Fast (1.2x)</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-lg font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      Presentation Style
                    </label>
                    <select className="input-elegant w-full">
                      <option value="formal" selected>Formal Business</option>
                      <option value="casual">Casual & Friendly</option>
                      <option value="energetic">Energetic & Dynamic</option>
                      <option value="technical">Technical & Detailed</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-lg font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                      Background
                    </label>
                    <select className="input-elegant w-full">
                      <option value="office" selected>Modern Office</option>
                      <option value="studio">Professional Studio</option>
                      <option value="conference">Conference Room</option>
                      <option value="virtual">Virtual Background</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">Advanced Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-advance slides</label>
                        <input type="checkbox" checked={settings.autoAdvanceSlides} className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Show slide numbers</label>
                        <input type="checkbox" checked={settings.showSlideNumbers} className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Include Q&A session</label>
                        <input type="checkbox" checked={settings.includeQA} className="rounded" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Video quality</label>
                        <select className="px-3 py-1 border rounded-lg text-sm">
                          <option value="high" selected>High (1080p)</option>
                          <option value="medium">Medium (720p)</option>
                          <option value="low">Low (480p)</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable notifications</label>
                        <input type="checkbox" checked={settings.enableNotifications} className="rounded" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-8">
                  <Button
                    onClick={generatePresentation}
                    size="lg"
                    disabled={isGenerating}
                    className="btn-modern bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white text-lg px-12 py-4 rounded-2xl shadow-2xl animate-glow"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        Generating... {Math.round(generationProgress)}%
                        <Button
                          onClick={() => {
                            setIsGenerating(false)
                            setPresentationReady(true)
                            setWorkflowStep("present")
                            setActiveTab("present")
                          }}
                          variant="outline"
                          size="sm"
                          className="ml-4 text-white border-white/50 hover:bg-white/10"
                        >
                          Skip
                        </Button>
                      </>
                    ) : (
                      <>
                        <Zap className="w-6 h-6 mr-3" />
                        Generate AI Presentation
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Present Tab */}
          <TabsContent value="present" className="mt-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Slide Display */}
              <div className="lg:col-span-3 space-y-6">
                <Card className="bg-white border border-slate-200 shadow-xl overflow-hidden">
                  <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200">
                    {/* Slide Image */}
                    {extractedSlides.length > 0 && (
                      <img
                        src={extractedSlides[currentSlide - 1]?.thumbnail || "/placeholder.svg"}
                        alt={`Slide ${currentSlide}`}
                        className="w-full h-full object-contain"
                      />
                    )}

                    {/* Video Overlay - AI Presenter */}
                    {currentVideoUrl && (
                      <div className="absolute bottom-6 left-6 w-56 h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-white bg-black/80 backdrop-blur-sm">
                        <video
                          src={currentVideoUrl}
                          className="w-full h-full object-cover"
                          autoPlay
                          muted={false}
                          loop={false}
                          onPlay={() => setIsVideoPlaying(true)}
                          onPause={() => setIsVideoPlaying(false)}
                          onEnded={() => {
                            setIsVideoPlaying(false)
                            if (settings.autoAdvanceSlides && currentSlide < extractedSlides.length) {
                              setTimeout(() => nextSlide(), 1000)
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                      </div>
                    )}

                    {/* Enhanced Control Overlays */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={startFullscreenSlideshow}
                        className="bg-white/90 text-slate-700 hover:bg-white rounded-lg shadow-lg"
                        title="Enter Fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="bg-white/90 text-slate-700 hover:bg-white rounded-lg shadow-lg"
                        title="Presentation Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
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
                        onClick={() => {
                          const video = document.querySelector('video')
                          if (video) {
                            if (video.paused) {
                              video.play()
                            } else {
                              video.pause()
                            }
                          }
                        }}
                        disabled={!currentVideoUrl}
                        className="bg-white/90 text-slate-700 hover:bg-white rounded-lg shadow-lg disabled:opacity-50"
                      >
                        {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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

                  {/* Enhanced Controls Panel */}
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    {/* Primary Controls */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={prevSlide}
                          disabled={currentSlide === 1}
                          className="rounded-lg"
                        >
                          <SkipBack className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button
                          variant={isVideoPlaying ? "default" : "outline"}
                          size="lg"
                          onClick={() => {
                            const video = document.querySelector('video')
                            if (video) {
                              if (video.paused) {
                                video.play()
                              } else {
                                video.pause()
                              }
                            }
                          }}
                          disabled={!currentVideoUrl}
                          className="rounded-lg"
                        >
                          {isVideoPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                          {isVideoPlaying ? 'Pause' : 'Play'}
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={nextSlide}
                          disabled={currentSlide === extractedSlides.length}
                          className="rounded-lg"
                        >
                          Next
                          <SkipForward className="w-4 h-4 ml-2" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={startFullscreenSlideshow}
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

                    {/* Progress Bar and Info */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">Slide {currentSlide} of {extractedSlides.length}</span>
                          <span>{extractedSlides[currentSlide - 1]?.title}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{formatTime(currentTime)} / {formatTime(videoDuration)}</span>
                          <span className="text-green-600 font-medium">
                            {Math.round((currentSlide / extractedSlides.length) * 100)}% Complete
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${(currentSlide / extractedSlides.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Advanced Controls */}
                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-slate-700">Speed:</label>
                          <select className="px-2 py-1 border border-slate-300 rounded text-sm">
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1" selected>1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-slate-700">Volume:</label>
                          <input type="range" min="0" max="100" defaultValue="80" className="w-20" />
                        </div>
                      </div>
                      
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
                  </div>
                </Card>

                {/* Enhanced Slide Thumbnails */}
                <Card className="p-4 bg-white border border-slate-200 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">Slide Navigation</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs">
                        <Grid className="w-3 h-3 mr-1" />
                        Grid View
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs">
                        <List className="w-3 h-3 mr-1" />
                        List View
                      </Button>
                    </div>
                  </div>
                  <div className="flex space-x-3 overflow-x-auto pb-2">
                    {extractedSlides.map((slide, index) => (
                      <button
                        key={slide.id}
                        onClick={() => jumpToSlide(index + 1)}
                        className={`flex-shrink-0 group relative ${
                          currentSlide === index + 1
                            ? "ring-2 ring-blue-500"
                            : "hover:ring-2 hover:ring-blue-300"
                        } rounded-lg overflow-hidden transition-all`}
                      >
                        <div className="w-28 h-20 relative">
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
                          <p className="text-xs font-medium text-slate-800 truncate w-28">{slide.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Enhanced Sidebar */}
              <div className="space-y-4">
                {/* Presentation Info */}
                <Card className="bg-white border border-slate-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Presentation className="w-4 h-4" />
                      Presentation Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Slides</span>
                      <span className="font-medium">{extractedSlides.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Current Slide</span>
                      <span className="font-medium">{currentSlide}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-medium text-green-600">
                        {Math.round((currentSlide / extractedSlides.length) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Duration</span>
                      <span className="font-medium">{formatTime(currentTime)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Slide Notes */}
                <Card className="bg-white border border-slate-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Speaker Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-32 overflow-y-auto">
                    <p className="text-sm text-slate-700">
                      {extractedSlides[currentSlide - 1]?.content || "No notes available for this slide."}
                    </p>
                  </CardContent>
                </Card>

                {/* Live Stats */}
                <Card className="bg-white border border-slate-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Live Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Viewers</span>
                      <span className="font-medium">247</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Engagement</span>
                      <span className="font-medium text-green-600">94%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Avg. Time/Slide</span>
                      <span className="font-medium">2m 15s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Questions</span>
                      <span className="font-medium text-blue-600">{audienceQuestions.length}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-white border border-slate-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                      <MessageSquare className="w-3 h-3 mr-2" />
                      Open Q&A Panel
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                      <Download className="w-3 h-3 mr-2" />
                      Export as PDF
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                      <Share className="w-3 h-3 mr-2" />
                      Share Presentation
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                      <Star className="w-3 h-3 mr-2" />
                      Save as Template
                    </Button>
                  </CardContent>
                </Card>

                {/* Audience Questions */}
                <Card className="bg-white border border-slate-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Questions ({audienceQuestions.filter((q) => !q.answered).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                    {audienceQuestions
                      .filter((q) => !q.answered)
                      .map((question) => (
                        <div key={question.id} className="p-2 bg-slate-50 rounded-lg border">
                          <p className="text-xs text-slate-800 mb-1">{question.question}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">{formatTime(question.timestamp)}</span>
                            <Button variant="ghost" size="sm" className="h-5 px-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
                              Answer
                            </Button>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        )}

        {/* Configuration View */}
        {currentView === 'config' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Configuration Settings
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Manage your AI Presenter settings and backend configuration
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
              {/* Backend API Configuration */}
              <Card className="bg-white/70 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-slate-200">
                  <div className="flex items-center gap-3">
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
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                      />
                      <Button onClick={setApiUrl} size="lg" className="bg-blue-600 hover:bg-blue-700 px-6">
                        {isApiConnected ? (
                          <>
                            <Wifi className="w-4 h-4 mr-2" />
                            Connected
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-4 h-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                    {isApiConnected && (
                      <div className="text-sm text-green-600 flex items-center gap-2 bg-green-50 p-3 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                        Successfully connected to backend API
                      </div>
                    )}
                    {!isApiConnected && apiBaseUrl && (
                      <div className="text-sm text-red-600 flex items-center gap-2 bg-red-50 p-3 rounded-lg">
                        <X className="w-4 h-4" />
                        Unable to connect to backend API. Please check the URL and try again.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Presentation Settings */}
              <Card className="bg-white/70 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Presentation Settings</CardTitle>
                      <CardDescription>Customize default presentation behavior and quality</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Default Voice Speed</label>
                        <select 
                          value={settings.defaultVoiceSpeed} 
                          onChange={(e) => setSettings(prev => ({...prev, defaultVoiceSpeed: parseFloat(e.target.value)}))}
                          className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={0.8}>Slow (0.8x)</option>
                          <option value={1.0}>Normal (1.0x)</option>
                          <option value={1.2}>Fast (1.2x)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Video Quality</label>
                        <select 
                          value={settings.videoQuality}
                          onChange={(e) => setSettings(prev => ({...prev, videoQuality: e.target.value}))}
                          className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="high">High (1080p)</option>
                          <option value="medium">Medium (720p)</option>
                          <option value="low">Low (480p)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Auto-advance slides</span>
                        <Button 
                          variant={settings.autoAdvanceSlides ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setSettings(prev => ({...prev, autoAdvanceSlides: !prev.autoAdvanceSlides}))}
                        >
                          {settings.autoAdvanceSlides ? "On" : "Off"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Show slide numbers</span>
                        <Button 
                          variant={settings.showSlideNumbers ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setSettings(prev => ({...prev, showSlideNumbers: !prev.showSlideNumbers}))}
                        >
                          {settings.showSlideNumbers ? "On" : "Off"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Include Q&A</span>
                        <Button 
                          variant={settings.includeQA ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setSettings(prev => ({...prev, includeQA: !prev.includeQA}))}
                        >
                          {settings.includeQA ? "On" : "Off"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Enable notifications</span>
                        <Button 
                          variant={settings.enableNotifications ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setSettings(prev => ({...prev, enableNotifications: !prev.enableNotifications}))}
                        >
                          {settings.enableNotifications ? "On" : "Off"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Information */}
              <Card className="bg-white/70 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">System Information</CardTitle>
                      <CardDescription>Current system status and information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Backend Status</span>
                        <span className={`text-sm font-medium ${isApiConnected ? 'text-green-600' : 'text-red-600'}`}>
                          {isApiConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Version</span>
                        <span className="text-sm font-medium text-slate-600">v2.1.0</span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Last Updated</span>
                        <span className="text-sm font-medium text-slate-600">August 21, 2025</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Speech Recognition</span>
                        <span className={`text-sm font-medium ${speechSupported ? 'text-green-600' : 'text-red-600'}`}>
                          {speechSupported ? 'Supported' : 'Not Supported'}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Browser</span>
                        <span className="text-sm font-medium text-slate-600">
                          {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                           navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                           navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Active Session</span>
                        <span className="text-sm font-medium text-slate-600">
                          {sessionId ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Past Presentations View */}
        {currentView === 'presentations' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Past Presentations
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                View, manage, and analyze your presentation history
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Presentations</p>
                      <p className="text-3xl font-bold">{pastPresentations.length}</p>
                    </div>
                    <Video className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Completed</p>
                      <p className="text-3xl font-bold">{pastPresentations.filter(p => p.status === 'completed').length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm">Processing</p>
                      <p className="text-3xl font-bold">{pastPresentations.filter(p => p.status === 'processing').length}</p>
                    </div>
                    <Loader2 className="w-8 h-8 text-yellow-200 animate-spin" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Total Duration</p>
                      <p className="text-3xl font-bold">27m</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Presentations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pastPresentations.map((presentation) => (
                <Card key={presentation.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/70 backdrop-blur-sm border-2 hover:border-blue-300">
                  <div className="aspect-video bg-slate-100 rounded-t-lg overflow-hidden relative">
                    <img 
                      src={presentation.thumbnail} 
                      alt={presentation.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <Button 
                        size="lg" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 text-slate-900 hover:bg-white"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        View
                      </Button>
                    </div>
                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
                      presentation.status === 'completed' ? 'bg-green-500 text-white' :
                      presentation.status === 'processing' ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {presentation.status}
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {presentation.title}
                    </h3>
                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Date
                        </span>
                        <span className="font-medium">{presentation.date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          Duration
                        </span>
                        <span className="font-medium">{presentation.duration}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 group-hover:border-blue-300">
                        <Play className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="group-hover:border-blue-300">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="group-hover:border-blue-300">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card className="bg-white/70 backdrop-blur-sm shadow-xl">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-xl">Quick Actions</CardTitle>
                <CardDescription>Common tasks for managing your presentations</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    className="h-16 flex-col gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => setCurrentView('main')}
                  >
                    <Upload className="w-5 h-5" />
                    Create New Presentation
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 flex-col gap-2 bg-white/70 hover:bg-white/90"
                  >
                    <Download className="w-5 h-5" />
                    Export All
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 flex-col gap-2 bg-white/70 hover:bg-white/90"
                  >
                    <BarChart3 className="w-5 h-5" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Q&A Chatbot */}
        {isChatbotVisible && (
          <div className="fixed right-6 bottom-6 w-96 max-h-96 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-2xl z-50">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Q&A Assistant</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatbotVisible(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
            
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-8">
                  👋 Ask me anything about the presentation!
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg text-sm ${
                      message.type === 'user' || message.type === 'voice-input'
                        ? 'bg-blue-100 ml-8 text-blue-900'
                        : 'bg-slate-100 mr-8 text-slate-900'
                    }`}
                  >
                    {message.type === 'voice-input' && <span className="text-blue-600">🎤 </span>}
                    {message.text.startsWith('🎥 Video response:') ? (
                      <div>
                        <p className="mb-2">🎥 Video Response:</p>
                        <video
                          src={message.text.replace('🎥 Video response: ', '')}
                          controls
                          className="w-full max-h-32 rounded"
                        />
                      </div>
                    ) : (
                      message.text
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="flex items-center gap-2 p-4 border-t border-slate-200">
              <input
                type="text"
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    sendQuestion(e.currentTarget.value.trim())
                    e.currentTarget.value = ''
                  }
                }}
              />
              <Button
                size="sm"
                onClick={toggleVoiceRecognition}
                disabled={!speechSupported}
                className={`px-3 ${isVoiceRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                title={speechSupported ? (isVoiceRecording ? 'Recording... Click to stop' : 'Click to start voice input') : 'Voice recognition not supported'}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Ask a question..."]') as HTMLInputElement
                  if (input?.value.trim()) {
                    sendQuestion(input.value.trim())
                    input.value = ''
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Send
              </Button>
            </div>
          </div>
        )}

        {/* Floating Q&A Button */}
        {presentationReady && !isChatbotVisible && (
          <Button
            onClick={() => setIsChatbotVisible(true)}
            className="fixed right-6 bottom-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl z-40"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default App
