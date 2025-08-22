# Backend Integration Analysis & Fix Guide

## Overview
The AI Presenter React application has backend integration issues that prevent it from properly communicating with the Python backend API. This document provides a comprehensive analysis and solutions.

## Current Issues Identified

### 1. **File Upload Process**
**Problem**: The application is configured to send PowerPoint files but the backend might expect a specific format.

**Current Implementation**:
```tsx
formData.append("presentation_deck", uploadedFile)
```

**Solution Applied**: 
- Added better error handling with detailed logging
- Added support for both PPT/PPTX and PDF files
- Added debug console for real-time monitoring

### 2. **API Endpoint Communication**
**Endpoints Used**:
- `GET /health` - Health check
- `POST /start_generation/` - Start presentation generation
- `GET /generation_status/{sessionId}` - Poll generation status
- `POST /ask_question` - Send chat questions
- `POST /ask_voice_question` - Send voice questions

### 3. **Error Handling**
**Previous Issues**:
- Basic error handling without proper debugging
- No visibility into API communication
- No timeout handling

**Solutions Applied**:
- Enhanced error handling with detailed logging
- Added debug console with real-time logs
- Added connection timeout (10 seconds)
- Added polling timeout (5 minutes max)

## Key Features Added

### 1. **Debug Console**
- Real-time logging of all API communications
- Visual status indicators
- Toggle button in navigation
- Shows current state (API connection, session, status, slides count)

### 2. **Enhanced Error Handling**
```tsx
// Better error parsing
if (!response.ok) {
  let errorMessage = "Failed to start generation."
  try {
    const errData = await response.json()
    errorMessage = errData.detail || errData.message || errorMessage
  } catch {
    errorMessage = `HTTP ${response.status}: ${response.statusText}`
  }
  throw new Error(errorMessage)
}
```

### 3. **Comprehensive Logging**
- File upload details (name, size, type)
- API request/response logging
- Polling status updates
- Error diagnostics

### 4. **Test Functions**
- "Test Connection" button to verify API connectivity
- "Debug Test" button to log current application state

## Backend Expected Flow (from HTML reference)

Based on the provided HTML file, the backend should:

1. **Accept file upload** at `/start_generation/` endpoint
2. **Return initial data** with:
   ```json
   {
     "session_id": "unique_session_id",
     "slides": [
       {
         "id": 1,
         "title": "Slide Title",
         "content": "Slide content",
         "image_url": "/path/to/slide/image.png"
       }
     ],
     "total_slides": 5
   }
   ```

3. **Status polling** at `/generation_status/{sessionId}` should return:
   ```json
   {
     "status": "Processing" | "Completed" | "Error",
     "videos": [
       {
         "id": 1,
         "url": "/path/to/video.mp4"
       }
     ],
     "error": "Error message if status is Error"
   }
   ```

## Testing Steps

### 1. **Check Debug Console**
1. Open the application
2. Click "Debug" button in navigation
3. Monitor logs in real-time

### 2. **Test API Connection**
1. Go to Settings tab
2. Enter your backend URL (e.g., `https://your-ngrok-url.ngrok-free.app`)
3. Click "Test Connection"
4. Check debug console for detailed logs

### 3. **Upload File**
1. Ensure API is connected (green indicator)
2. Upload a PowerPoint file
3. Monitor debug console for:
   - File details
   - POST request to `/start_generation/`
   - Response data
   - Polling attempts

### 4. **Troubleshoot Common Issues**

#### **CORS Issues**
If you see CORS errors in browser console:
```python
# Add to your FastAPI backend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### **File Format Issues**
Ensure your backend accepts both formats:
```python
@app.post("/start_generation/")
async def start_generation(presentation_deck: UploadFile = File(...)):
    # Check file extension
    if not presentation_deck.filename.endswith(('.ppt', '.pptx', '.pdf')):
        raise HTTPException(status_code=400, detail="Unsupported file format")
```

#### **Response Format Issues**
Ensure backend returns expected JSON structure:
```python
return {
    "session_id": session_id,
    "slides": slides_data,
    "total_slides": len(slides_data)
}
```

## File Changes Made

### 1. **Enhanced Functions**
- `checkApiConnection()` - Better error handling and logging
- `generatePresentationFromBackend()` - Comprehensive debugging
- `pollGenerationStatus()` - Timeout handling and detailed logging

### 2. **New Features**
- Debug console UI component
- Debug logging system
- Test buttons for diagnostics
- Real-time status indicators

### 3. **UI Improvements**
- Debug button in navigation
- Debug console with logs and status
- Enhanced error messages
- Connection status indicators

## Next Steps for Backend Developer

1. **Enable CORS** on your backend
2. **Add debug logging** to your backend endpoints
3. **Verify response format** matches expected structure
4. **Test with ngrok** or your hosting solution
5. **Check file upload handling** for both PPT and PDF files

## Monitoring Backend Issues

Use the debug console to monitor:
- API connection status
- File upload progress
- Response data structure
- Polling frequency and responses
- Error messages and status codes

The debug console will help identify exactly where the communication breaks down between the frontend and backend.
