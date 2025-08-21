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
  MessageSquare,
  Star,
  HelpCircle,
  Link,
  Loader2,
  Zap,
} from "lucide-react"

function App(): ReactElement {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isPresenting, setIsPresenting] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [selectedAvatar, setSelectedAvatar] = useState("sarah")
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
  const [extractedSlides, setExtractedSlides] = useState<
    Array<{
      id: number
      title: string
      content: string
      thumbnail: string
    }>
  >([])
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDuration] = useState(525) // 8:45 in seconds
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [annotationMode, setAnnotationMode] = useState<"none" | "pointer" | "highlight" | "draw" | "text" | "shape">(
    "none",
  )
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
    setProcessingStatus("processing")
    setWorkflowStep("processing")

    const simulateBackendProcessing = async () => {
      const steps = [
        { id: "extract", name: "Extracting slides from PowerPoint", status: "pending" as const, duration: 2000 },
        { id: "analyze", name: "Analyzing content with AI", status: "pending" as const, duration: 3000 },
        { id: "script", name: "Generating presentation script", status: "pending" as const, duration: 2500 },
        { id: "voice", name: "Preparing AI voice synthesis", status: "pending" as const, duration: 1500 },
        { id: "render", name: "Rendering avatar video", status: "pending" as const, duration: 4000 },
      ]

      setProcessingSteps(steps)

      // Simulate slide extraction
      await new Promise((resolve) => setTimeout(resolve, 1000))
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

      // Process each step
      for (let i = 0; i < steps.length; i++) {
        setProcessingSteps((prev) =>
          prev.map((step, index) => ({
            ...step,
            status: index === i ? "processing" : index < i ? "complete" : "pending",
          })),
        )

        await new Promise((resolve) => setTimeout(resolve, steps[i].duration))

        setProcessingSteps((prev) =>
          prev.map((step, index) => ({
            ...step,
            status: index <= i ? "complete" : "pending",
          })),
        )
      }

      // Set final video URL
      setGeneratedVideoUrl("/ai-presenter-avatar.png")
      setProcessingStatus("complete")
    }

    await simulateBackendProcessing()
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
    setGeneratedVideoUrl(null)
    setProcessingSteps([])
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

    // Simulate generation process
    const steps = [
      "Preparing avatar model...",
      "Generating voice synthesis...",
      "Synchronizing with slides...",
      "Rendering video segments...",
      "Finalizing presentation...",
      "Starting presentation...",
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
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

  const togglePlayPause = () => {
    setIsPresenting(!isPresenting)
  }

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime)
    setVideoProgress((newTime / videoDuration) * 100)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI Presenter
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {presentationReady && (
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <HelpCircle className="w-4 h-4" />
                Help
              </Button>
              <Avatar className="w-8 h-8">
                <AvatarImage src="/diverse-user-avatars.png" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="customize"
              disabled={processingStatus !== "complete"}
              className="gap-2 disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              Customize
            </TabsTrigger>
            <TabsTrigger value="present" disabled={!presentationReady} className="gap-2 disabled:opacity-50">
              <Presentation className="w-4 h-4" />
              Present
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Transform Your Presentations with AI
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Upload your PowerPoint and watch our AI avatar deliver it with professional excellence
              </p>
            </div>

            {processingStatus === "processing" ? (
              <Card className="max-w-2xl mx-auto bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <Zap className="w-6 h-6 text-blue-600" />
                    AI Processing in Progress
                  </CardTitle>
                  <CardDescription>
                    Our advanced AI is analyzing your presentation and preparing the avatar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Processing Steps */}
                  <div className="space-y-4">
                    {processingSteps.map((step) => (
                      <div key={step.id} className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.status === "complete"
                              ? "bg-green-100 text-green-600"
                              : step.status === "processing"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {step.status === "complete" ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : step.status === "processing" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <div className="w-2 h-2 bg-current rounded-full" />
                          )}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            step.status === "complete"
                              ? "text-green-600"
                              : step.status === "processing"
                                ? "text-blue-600"
                                : "text-slate-500"
                          }`}
                        >
                          {step.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Extracted Slides Preview */}
                  {extractedSlides.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-800">Extracted Slides ({extractedSlides.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {extractedSlides.slice(0, 6).map((slide) => (
                          <div key={slide.id} className="bg-white rounded-lg p-3 shadow-sm border">
                            <img
                              src={slide.thumbnail || "/placeholder.svg"}
                              alt={slide.title}
                              className="w-full h-20 object-cover rounded mb-2"
                            />
                            <h4 className="text-xs font-medium text-slate-800 truncate">{slide.title}</h4>
                            <p className="text-xs text-slate-500 truncate">{slide.content}</p>
                          </div>
                        ))}
                        {extractedSlides.length > 6 && (
                          <div className="bg-slate-100 rounded-lg p-3 flex items-center justify-center">
                            <span className="text-sm text-slate-600">+{extractedSlides.length - 6} more</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-2xl mx-auto bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-8">
                  <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                      isDragOver
                        ? "border-blue-400 bg-blue-50/50"
                        : uploadedFile
                          ? "border-green-400 bg-green-50/50"
                          : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/30"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {uploadedFile ? (
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                          <FileText className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800">{uploadedFile.name}</h3>
                          <p className="text-sm text-slate-500">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button onClick={removeFile} variant="outline" size="sm">
                            Remove
                          </Button>
                          <Button onClick={() => handleFileUpload([uploadedFile])} size="sm">
                            Process Presentation
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                          <Upload className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-slate-800 mb-2">Upload Your Presentation</h3>
                          <p className="text-slate-500 mb-6">
                            Drag and drop your PowerPoint file here, or click to browse
                          </p>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            size="lg"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          >
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
                        <div className="text-xs text-slate-400">Supported formats: PPT, PPTX • Max size: 50MB</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Customize Tab */}
          <TabsContent value="customize" className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-slate-800">Choose Your AI Presenter</h2>
              <p className="text-lg text-slate-600">Select the perfect avatar to deliver your presentation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {avatars.map((avatar) => (
                <Card
                  key={avatar.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedAvatar === avatar.id
                      ? "ring-2 ring-blue-500 bg-blue-50/50"
                      : "bg-white/70 backdrop-blur-sm hover:bg-white/90"
                  }`}
                  onClick={() => setSelectedAvatar(avatar.id)}
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="relative">
                      <img
                        src={avatar.image || "/placeholder.svg"}
                        alt={avatar.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {selectedAvatar === avatar.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg text-slate-800">{avatar.name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{avatar.role}</p>
                      <p className="text-xs text-slate-600">{avatar.description}</p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Expertise:</span>
                        <span className="font-medium">{avatar.expertise}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tone:</span>
                        <span className="font-medium">{avatar.tone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Accent:</span>
                        <span className="font-medium">{avatar.accent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Languages:</span>
                        <span className="font-medium">{avatar.languages.join(", ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{avatar.rating}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {avatar.presentations.toLocaleString()} presentations
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Customization Options */}
            <Card className="max-w-4xl mx-auto bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Presentation Settings</CardTitle>
                <CardDescription>Customize how your presentation will be delivered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Speaking Speed</label>
                    <select className="w-full p-2 border border-slate-300 rounded-md bg-white">
                      <option value="slow">Slow (0.8x)</option>
                      <option value="normal" selected>
                        Normal (1.0x)
                      </option>
                      <option value="fast">Fast (1.2x)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Presentation Style</label>
                    <select className="w-full p-2 border border-slate-300 rounded-md bg-white">
                      <option value="formal" selected>
                        Formal Business
                      </option>
                      <option value="casual">Casual & Friendly</option>
                      <option value="energetic">Energetic & Dynamic</option>
                      <option value="technical">Technical & Detailed</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Background</label>
                    <select className="w-full p-2 border border-slate-300 rounded-md bg-white">
                      <option value="office" selected>
                        Modern Office
                      </option>
                      <option value="studio">Professional Studio</option>
                      <option value="conference">Conference Room</option>
                      <option value="virtual">Virtual Background</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={generatePresentation}
                    size="lg"
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating... {Math.round(generationProgress)}%
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Generate AI Presentation
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Present Tab */}
          <TabsContent value="present" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Video Player */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="bg-black rounded-xl overflow-hidden">
                  <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
                    {generatedVideoUrl ? (
                      <img
                        src={generatedVideoUrl || "/placeholder.svg"}
                        alt="AI Presenter"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-white">
                          <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg">AI Presentation Ready</p>
                        </div>
                      </div>
                    )}

                    {/* Video Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="w-full bg-white/20 rounded-full h-1">
                          <div
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${videoProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Control Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={togglePlayPause}
                            className="text-white hover:bg-white/20"
                          >
                            {isPresenting ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={prevSlide}
                            className="text-white hover:bg-white/20"
                          >
                            <SkipBack className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={nextSlide}
                            className="text-white hover:bg-white/20"
                          >
                            <SkipForward className="w-4 h-4" />
                          </Button>
                          <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(videoDuration)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMuted(!isMuted)}
                            className="text-white hover:bg-white/20"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="text-white hover:bg-white/20"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Professional Controls */}
                <Card className="bg-white/70 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* Presentation Controls */}
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Mic className="w-4 h-4" />
                          Mute
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Camera className="w-4 h-4" />
                          Camera
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Monitor className="w-4 h-4" />
                          Share Screen
                        </Button>
                      </div>

                      {/* Annotation Tools */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={annotationMode === "pointer" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAnnotationMode(annotationMode === "pointer" ? "none" : "pointer")}
                        >
                          Pointer
                        </Button>
                        <Button
                          variant={annotationMode === "highlight" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAnnotationMode(annotationMode === "highlight" ? "none" : "highlight")}
                        >
                          Highlight
                        </Button>
                        <Button
                          variant={annotationMode === "draw" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAnnotationMode(annotationMode === "draw" ? "none" : "draw")}
                        >
                          Draw
                        </Button>
                      </div>

                      {/* Export & Share */}
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Download className="w-4 h-4" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Share2 className="w-4 h-4" />
                          Share
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Link className="w-4 h-4" />
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Slide Navigation */}
                <Card className="bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Slides ({extractedSlides.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {extractedSlides.map((slide) => (
                      <div
                        key={slide.id}
                        className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          currentSlide === slide.id ? "bg-blue-100 border border-blue-300" : "hover:bg-slate-100"
                        }`}
                        onClick={() => jumpToSlide(slide.id)}
                      >
                        <img
                          src={slide.thumbnail || "/placeholder.svg"}
                          alt={slide.title}
                          className="w-12 h-8 object-cover rounded border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{slide.title}</p>
                          <p className="text-xs text-slate-500 truncate">{slide.content}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Live Stats */}
                <Card className="bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Live Stats
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
                      <span className="text-slate-600">Duration</span>
                      <span className="font-medium">{formatTime(currentTime)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Questions</span>
                      <span className="font-medium text-blue-600">{audienceQuestions.length}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Audience Questions */}
                <Card className="bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Questions ({audienceQuestions.filter((q) => !q.answered).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                    {audienceQuestions
                      .filter((q) => !q.answered)
                      .map((question) => (
                        <div key={question.id} className="p-2 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-800 mb-1">{question.question}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">{formatTime(question.timestamp)}</span>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
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
      </div>
    </div>
  )
}

export default App
