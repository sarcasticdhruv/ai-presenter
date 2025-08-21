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
  RotateCcw,
  Settings,
  FileText,
  Users,
  Video,
  CheckCircle,
  Download,
  Share2,
  Maximize2,
  Volume2,
  SkipBack,
  SkipForward,
  Mic,
  Camera,
  Monitor,
  Presentation,
  BarChart3,
  Calendar,
  Users2,
  MessageSquare,
  Star,
  ChevronLeft,
  Eye,
  Filter,
  HelpCircle,
  Link,
  Loader2,
  StepForwardIcon as Progress,
  Zap,
} from "lucide-react"

export default function AIPresenterApp(): ReactElement {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isPresenting, setIsPresenting] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [selectedAvatar, setSelectedAvatar] = useState("sarah")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">(
    "idle",
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [processingSteps, setProcessingSteps] = useState<
    Array<{
      id: string
      name: string
      status: "pending" | "processing" | "complete"
      duration?: number
    }>
  >([])
  const [currentProcessingStep, setCurrentProcessingStep] = useState(0)
  const [extractedSlides, setExtractedSlides] = useState<
    Array<{
      id: number
      title: string
      content: string
      thumbnail: string
    }>
  >([])
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(525) // 8:45 in seconds
  const [currentTime, setCurrentTime] = useState(0)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [annotationMode, setAnnotationMode] = useState<"none" | "pointer" | "highlight" | "draw" | "text" | "shape">(
    "none",
  )
  const [annotationColor, setAnnotationColor] = useState("#ff0000")
  const [showNotes, setShowNotes] = useState(false)
  const [showAudience, setShowAudience] = useState(false)
  const [bookmarks, setBookmarks] = useState<number[]>([])
  const [presentationMode, setPresentationMode] = useState<"presenter" | "audience" | "rehearsal">("presenter")
  const [timerActive, setTimerActive] = useState(false)
  const [timerDuration, setTimerDuration] = useState(0)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [audienceQuestions, setAudienceQuestions] = useState<
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

  useEffect(() => {
    if (processingStatus === "complete" && workflowStep === "processing") {
      setWorkflowStep("customize")
      setActiveTab("customize")
    }
  }, [processingStatus, workflowStep])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleVideoProgress = () => {
    if (isPresenting) {
      setCurrentTime((prev) => {
        const newTime = prev + 1
        setVideoProgress((newTime / videoDuration) * 100)

        // Update current slide based on time
        const slideIndex = Math.floor((newTime / videoDuration) * 12) + 1
        if (slideIndex !== currentSlide && slideIndex <= 12) {
          setCurrentSlide(slideIndex)
        }

        if (newTime >= videoDuration) {
          setIsPresenting(false)
          return videoDuration
        }
        return newTime
      })

      if (timerActive) {
        setTimerDuration((prev) => prev + 1)
      }
    }
  }

  const handleSeek = (progress: number) => {
    setCurrentTime((progress / 100) * videoDuration)
    setVideoProgress(progress)
  }

  const restartPresentation = () => {
    setCurrentTime(0)
    setVideoProgress(0)
    setIsPresenting(false)
    setTimerDuration(0)
  }

  const jumpToSlide = (slideNumber: number) => {
    setCurrentSlide(slideNumber)
    setCurrentTime(((slideNumber - 1) / 12) * videoDuration)
    setVideoProgress(((slideNumber - 1) / 12) * 100)
  }

  const toggleBookmark = (slideNumber: number) => {
    setBookmarks((prev) =>
      prev.includes(slideNumber) ? prev.filter((b) => b !== slideNumber) : [...prev, slideNumber],
    )
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const interval = setInterval(handleVideoProgress, 1000 / playbackSpeed)

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return

    const file = files[0]
    setUploadedFile(file)
    setProcessingStatus("processing")
    setWorkflowStep("processing")

    const steps = [
      { id: "extract", name: "Extracting slides from PowerPoint", status: "pending" as const, duration: 2000 },
      { id: "analyze", name: "Analyzing content structure and flow", status: "pending" as const, duration: 3000 },
      { id: "script", name: "Generating natural presentation script", status: "pending" as const, duration: 2500 },
      { id: "voice", name: "Optimizing AI voice parameters", status: "pending" as const, duration: 1500 },
      { id: "avatar", name: "Preparing avatar animations", status: "pending" as const, duration: 2000 },
      { id: "sync", name: "Synchronizing content with timing", status: "pending" as const, duration: 1800 },
      { id: "render", name: "Rendering presentation video", status: "pending" as const, duration: 4000 },
    ]

    const simulateBackendProcessing = async () => {
      const steps = [
        { id: "extract", name: "Extracting slides from PowerPoint", status: "pending" as const, duration: 2000 },
        { id: "analyze", name: "Analyzing content with AI", status: "pending" as const, duration: 3000 },
        { id: "script", name: "Generating presentation script", status: "pending" as const, duration: 2500 },
        { id: "voice", name: "Preparing AI voice synthesis", status: "pending" as const, duration: 1500 },
        { id: "render", name: "Rendering avatar video", status: "pending" as const, duration: 4000 },
      ]

      setProcessingSteps(steps)
      setCurrentProcessingStep(0)

      // Simulate slide extraction
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setExtractedSlides([
        {
          id: 1,
          title: "Welcome to Our Company",
          content: "Introduction and overview",
          thumbnail: "/business-presentation-slide-1.png",
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
          content: "Tools and platforms overview",
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
          title: "Competitive Analysis",
          content: "Market positioning comparison",
          thumbnail: "/placeholder-jpkc9.png",
        },
        { id: 11, title: "Next Steps", content: "Action items and follow-up", thumbnail: "/action-plan-checklist.png" },
        {
          id: 12,
          title: "Thank You",
          content: "Contact information and Q&A",
          thumbnail: "/thank-you-contact-slide.png",
        },
      ])

      // Process each step
      for (let i = 0; i < steps.length; i++) {
        setCurrentProcessingStep(i)
        setProcessingSteps((prev) =>
          prev.map((step, index) => (index === i ? { ...step, status: "processing" } : step)),
        )

        await new Promise((resolve) => setTimeout(resolve, steps[i].duration))

        setProcessingSteps((prev) => prev.map((step, index) => (index === i ? { ...step, status: "complete" } : step)))
      }

      setGeneratedVideoUrl("/ai-presenter.png")
      setProcessingStatus("complete")
      setWorkflowStep("customize")
    }

    simulateBackendProcessing()
  }

  const handleGeneratePresentation = async () => {
    setIsGenerating(true)
    setGenerationProgress(0)
    setWorkflowStep("generate")

    const generationSteps = [
      "Finalizing avatar synchronization",
      "Loading presentation environment",
      "Calibrating audio-visual timing",
      "Preparing interactive controls",
      "Starting presentation system",
    ]

    for (let i = 0; i < generationSteps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      setGenerationProgress(((i + 1) / generationSteps.length) * 100)
    }

    setIsGenerating(false)
    setPresentationReady(true)
    setWorkflowStep("present")
    setActiveTab("present")
    setIsVideoLoaded(true)
  }

  const handleTabChange = (value: string) => {
    if (value === "customize" && processingStatus !== "complete") return
    if (value === "present" && !presentationReady) return
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
    setUploadProgress(0)
    setGeneratedVideoUrl(null)
    setProcessingSteps([])
    setExtractedSlides([])
  }

  const avatars = [
    {
      id: "sarah",
      name: "Sarah Chen",
      role: "Business Executive",
      image: "/professional-asian-woman-business-suit.png",
      accent: "American",
      expertise: "Corporate Strategy",
      tone: "Professional & Confident",
      languages: ["English", "Mandarin"],
      rating: 4.9,
      presentations: 2847,
    },
    {
      id: "marcus",
      name: "Marcus Johnson",
      role: "Tech Presenter",
      image: "/professional-black-man-tech-presenter.png",
      accent: "American",
      expertise: "Technology & Innovation",
      tone: "Engaging & Technical",
      languages: ["English", "Spanish"],
      rating: 4.8,
      presentations: 1923,
    },
    {
      id: "elena",
      name: "Elena Rodriguez",
      role: "Creative Director",
      image: "/latina-creative-director.png",
      accent: "International",
      expertise: "Design & Marketing",
      tone: "Creative & Inspiring",
      languages: ["English", "Spanish", "Portuguese"],
      rating: 4.9,
      presentations: 1654,
    },
    {
      id: "david",
      name: "David Kim",
      role: "Sales Expert",
      image: "/professional-asian-sales-expert.png",
      accent: "American",
      expertise: "Sales & Persuasion",
      tone: "Persuasive & Friendly",
      languages: ["English", "Korean"],
      rating: 4.7,
      presentations: 2156,
    },
  ]

  const totalSlides = 12
  const slideImages = [
    "/business-presentation-slide-1.png",
    "/market-analysis-charts.png",
    "/product-solution-diagram.png",
    "/timeline-gantt-chart.png",
    "/team-org-chart.png",
    "/financial-charts-graphs.png",
    "/risk-matrix-analysis.png",
    "/technology-architecture-diagram.png",
    "/customer-testimonial-quotes.png",
    "/placeholder-jpkc9.png",
    "/action-plan-checklist.png",
    "/thank-you-contact-slide.png",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <Presentation className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-900">AI Presenter</h1>
                <p className="text-xs text-slate-500 -mt-1">Transform presentations with AI</p>
              </div>
            </div>

            {/* Useful Actions */}
            <div className="flex items-center gap-4">
              {presentationReady && (
                <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4" />
                  Export Video
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
                <HelpCircle className="w-4 h-4" />
                Help
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarImage src="/placeholder-user.png" />
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">JD</AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg mb-8 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Create AI Presentation</h2>
                  <p className="text-slate-600 mt-1">
                    Upload your slides and let AI create a professional video presentation
                  </p>
                </div>
                {/* Progress indicator */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${processingStatus !== "idle" ? "bg-green-500" : activeTab === "upload" ? "bg-blue-500" : "bg-slate-300"}`}
                    />
                    <span className="text-sm font-medium text-slate-600">Upload</span>
                  </div>
                  <div className="w-6 h-px bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${presentationReady ? "bg-green-500" : activeTab === "customize" ? "bg-blue-500" : "bg-slate-300"}`}
                    />
                    <span className="text-sm font-medium text-slate-600">Customize</span>
                  </div>
                  <div className="w-6 h-px bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${activeTab === "present" ? "bg-blue-500" : "bg-slate-300"}`}
                    />
                    <span className="text-sm font-medium text-slate-600">Present</span>
                  </div>
                </div>
              </div>
            </div>

            <TabsList className="grid w-full grid-cols-3 bg-slate-50/50 p-1 m-6 rounded-xl">
              <TabsTrigger value="upload" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger
                value="customize"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                disabled={processingStatus !== "complete"}
              >
                <Users className="w-4 h-4" />
                Customize
              </TabsTrigger>
              <TabsTrigger
                value="present"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                disabled={!presentationReady}
              >
                <Video className="w-4 h-4" />
                Present
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {processingStatus === "idle" && (
              <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
                <CardContent className="p-12">
                  <div
                    className={`text-center space-y-6 ${isDragOver ? "scale-105" : ""} transition-transform`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Your Presentation</h3>
                      <p className="text-slate-600 max-w-md mx-auto">
                        Drag and drop your PowerPoint file here, or click to browse. Supports .pptx, .ppt files up to
                        50MB.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                        <Upload className="w-4 h-4" />
                        Choose File
                      </Button>
                      <Button variant="outline" className="gap-2 bg-transparent">
                        <Link className="w-4 h-4" />
                        Import from URL
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ppt,.pptx"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {processingStatus === "uploading" && (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">Uploading...</h3>
                      <p className="text-slate-600">Please wait while we upload your file</p>
                    </div>
                    <div className="w-full max-w-xs mx-auto">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-slate-500 mt-1">{uploadProgress}% complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing State */}
            {processingStatus === "processing" && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                      <Zap className="w-10 h-10 text-white animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">AI Processing in Progress</h3>
                    <p className="text-slate-600 text-lg">
                      Transforming your presentation into an engaging AI experience...
                    </p>
                  </div>

                  <div className="max-w-lg mx-auto space-y-4">
                    {processingSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-4 text-left p-3 rounded-lg bg-white/50 backdrop-blur-sm"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                            step.status === "complete"
                              ? "bg-green-500 text-white shadow-lg shadow-green-200"
                              : step.status === "processing"
                                ? "bg-blue-500 text-white shadow-lg shadow-blue-200 animate-pulse"
                                : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {step.status === "complete" ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : step.status === "processing" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span
                          className={`font-medium transition-colors duration-300 ${
                            step.status === "complete"
                              ? "text-green-700"
                              : step.status === "processing"
                                ? "text-blue-700"
                                : "text-slate-500"
                          }`}
                        >
                          {step.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {processingStatus === "complete" && extractedSlides.length > 0 && (
              <Card className="max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Extracted Slides Preview</CardTitle>
                  <CardDescription>
                    We've successfully extracted {extractedSlides.length} slides from your presentation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {extractedSlides.map((slide) => (
                      <div key={slide.id} className="group cursor-pointer">
                        <div className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden mb-2 border-2 border-transparent group-hover:border-blue-400 transition-colors">
                          <img
                            src={slide.thumbnail || "/placeholder.svg"}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{slide.title}</p>
                          <p className="text-xs text-slate-600 truncate">{slide.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      All slides processed successfully
                    </div>
                    <Button className="gap-2" onClick={() => setActiveTab("customize")}>
                      <Users className="w-4 h-4" />
                      Choose Avatar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Customize Tab */}
          <TabsContent value="customize" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Avatar Selection Panel */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Choose Your AI Presenter</h3>
                      <p className="text-sm text-slate-600 mt-1">Select from our professional AI avatars</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-1 gap-6">
                    {avatars.map((avatar) => (
                      <Card
                        key={avatar.id}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                          selectedAvatar === avatar.id
                            ? "ring-2 ring-blue-500 shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50"
                            : "hover:border-slate-300 hover:shadow-lg"
                        }`}
                        onClick={() => setSelectedAvatar(avatar.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-6">
                            <div className="relative">
                              <Avatar className="w-20 h-20 border-3 border-white shadow-lg">
                                <AvatarImage src={avatar.image || "/placeholder.svg"} alt={avatar.name} />
                                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                  {avatar.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              {selectedAvatar === avatar.id && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-xl font-bold text-slate-900">{avatar.name}</h4>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                  {avatar.role}
                                </span>
                              </div>

                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-500 font-medium">Expertise:</span>
                                    <p className="text-slate-700">{avatar.expertise}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 font-medium">Tone:</span>
                                    <p className="text-slate-700">{avatar.tone}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 font-medium">Accent:</span>
                                    <p className="text-slate-700">{avatar.accent}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 font-medium">Languages:</span>
                                    <p className="text-slate-700">{avatar.languages.join(", ")}</p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                    <span className="text-sm font-medium text-slate-700">{avatar.rating}</span>
                                    <span className="text-xs text-slate-500">
                                      ({avatar.presentations} presentations)
                                    </span>
                                  </div>
                                  <Button variant="outline" size="sm" className="text-xs bg-transparent">
                                    <Play className="w-3 h-3 mr-1" />
                                    Preview Voice
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">Presentation Settings</h4>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Speaking Speed</label>
                        <select className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                          <option>Normal (1.0x)</option>
                          <option>Slow (0.8x)</option>
                          <option>Fast (1.2x)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Presentation Style</label>
                        <select className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                          <option>Professional</option>
                          <option>Conversational</option>
                          <option>Energetic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Background</label>
                        <select className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                          <option>Office Environment</option>
                          <option>Studio Setup</option>
                          <option>Conference Room</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Preview</h3>
                  <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden mb-4">
                    <img src="/ai-presenter.png" alt="AI Presenter Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Button size="sm" className="gap-2">
                      <Play className="w-4 h-4" />
                      Test Voice
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">
                    "Hello, I'm {avatars.find((a) => a.id === selectedAvatar)?.name}. I'll be presenting your slides
                    today with a professional and engaging delivery."
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Presentation Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Auto-advance slides</span>
                      <Button variant="outline" size="sm" className="bg-green-50 border-green-200">
                        On
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Show slide numbers</span>
                      <Button variant="ghost" size="sm">
                        Off
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Include Q&A</span>
                      <Button variant="outline" size="sm" className="bg-green-50 border-green-200">
                        On
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setActiveTab("upload")}>
                <ChevronLeft className="w-4 h-4" />
                Back to Upload
              </Button>
              <Button
                onClick={handleGeneratePresentation}
                disabled={!selectedAvatar || isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting Presentation...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start AI Presentation
                  </>
                )}
              </Button>
            </div>

            {isGenerating && (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Video className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Generating Your AI Presentation</h3>
                      <p className="text-slate-600">This may take a few minutes...</p>
                    </div>
                    <div className="w-full max-w-md mx-auto">
                      <Progress value={generationProgress} className="h-2" />
                      <p className="text-xs text-slate-500 mt-1">{Math.round(generationProgress)}% complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Present Tab */}
          <TabsContent value="present" className="space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Main Video Player */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Video Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-slate-700">Live Presentation</span>
                      </div>
                      <div className="w-px h-4 bg-slate-300" />
                      <span className="text-sm text-slate-600">
                        Slide {currentSlide} of {totalSlides}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Video Player */}
                  <div className="relative aspect-video bg-slate-900">
                    <img src="/ai-presenter.png" alt="AI Presenter" className="w-full h-full object-cover" />

                    {/* Slide Overlay */}
                    <div className="absolute top-4 right-4 w-48 aspect-video bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
                      <img
                        src={slideImages[currentSlide - 1] || "/placeholder.svg"}
                        alt={`Slide ${currentSlide}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Play/Pause Overlay */}
                    {!isPresenting && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Button size="lg" className="w-16 h-16 rounded-full" onClick={() => setIsPresenting(true)}>
                          <Play className="w-8 h-8" />
                        </Button>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${(currentSlide / totalSlides) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Professional Controls */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      {/* Playback Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentSlide(Math.max(1, currentSlide - 1))}
                          disabled={currentSlide === 1}
                        >
                          <SkipBack className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setIsPresenting(!isPresenting)}>
                          {isPresenting ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentSlide(Math.min(totalSlides, currentSlide + 1))}
                          disabled={currentSlide === totalSlides}
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-slate-300 mx-2" />
                        <Button variant="ghost" size="sm" onClick={restartPresentation}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Audio/Video Controls */}
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Volume2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Camera className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Mic className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-slate-300 mx-2" />
                        <Button variant="ghost" size="sm">
                          <Monitor className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Presentation Timeline */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">Presentation Timeline</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Filter className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {slideImages.map((slide, index) => (
                      <div
                        key={index}
                        className={`flex-shrink-0 w-24 aspect-video rounded-lg border-2 cursor-pointer transition-all ${
                          currentSlide === index + 1
                            ? "border-blue-500 shadow-md"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        onClick={() => setCurrentSlide(index + 1)}
                      >
                        <img
                          src={slide || "/placeholder.svg"}
                          alt={`Slide ${index + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Control Panel */}
              <div className="space-y-6">
                {/* Presentation Stats */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Session Stats</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Duration</span>
                      <span className="text-sm font-medium">{formatTime(currentTime)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Viewers</span>
                      <span className="text-sm font-medium">24</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Engagement</span>
                      <span className="text-sm font-medium text-green-600">94%</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-transparent">
                      <MessageSquare className="w-4 h-4" />
                      Q&A Session
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-transparent">
                      <BarChart3 className="w-4 h-4" />
                      Live Poll
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-transparent">
                      <Users2 className="w-4 h-4" />
                      Breakout Rooms
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-transparent">
                      <Share2 className="w-4 h-4" />
                      Screen Share
                    </Button>
                  </div>
                </div>

                {/* Audience Engagement */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Live Feedback</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-slate-600">Great explanation!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm text-slate-600">Can you repeat slide 3?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span className="text-sm text-slate-600">Audio is perfect</span>
                    </div>
                  </div>
                </div>

                {/* Export Options */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Export & Share</h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-transparent">
                      <Download className="w-4 h-4" />
                      Download MP4
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-transparent">
                      <Share2 className="w-4 h-4" />
                      Share Link
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-transparent">
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
