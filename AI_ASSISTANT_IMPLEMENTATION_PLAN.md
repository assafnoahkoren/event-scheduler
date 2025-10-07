# AI Voice Assistant Implementation Plan

## Overview
Implement an AI voice assistant that allows users to execute actions via voice commands. The assistant uses OpenAI's Whisper for speech-to-text and GPT-4 for processing commands with function calling.

## Architecture

### Backend (Server)
- **OpenAI Integration**: Whisper API for transcription, GPT-4 for command processing
- **AI Service**: Handles OpenAI API calls and tool execution
- **tRPC Router**: New `ai` router with `processVoice` endpoint
- **Action Metadata**: Map actions to user-friendly toast messages

### Frontend (Webapp)
- **FAB Component**: Floating Action Button (bottom-right)
- **Audio Recording**: MediaRecorder API (WebM format - natively supported by Whisper)
- **Toast Notifications**: Display action results to user
- **No Chat UI**: Minimal UX for fast interactions

## Implementation Steps

### Phase 1: Backend Setup

#### Step 1: Environment Configuration
- [ ] Add `OPENAI_API_KEY` to server environment variables
- [ ] Document in `.env.example`

#### Step 2: Create AI Service (`server/src/services/ai.service.ts`)
- [ ] Initialize OpenAI client
- [ ] Define tool schemas for GPT-4 function calling:
  - `createEvent` - Maps to `eventService.createEvent()`
  - `createClient` - Maps to `clientService.createClient()`
- [ ] Create `transcribeAudio()` method (Whisper API)
- [ ] Create `processCommand()` method (GPT-4 with tools)
- [ ] Create `executeTools()` method (calls actual tRPC procedures with user context)
- [ ] Define action metadata for toast messages:
  ```typescript
  {
    createEvent: { successMessage: "Event created successfully" },
    createClient: { successMessage: "Client added successfully" }
  }
  ```

#### Step 3: Create AI Router (`server/src/routers/ai.router.ts`)
- [ ] Create `processVoice` protected procedure
- [ ] Input: `z.object({ audioData: z.string() })` (base64 encoded WebM)
- [ ] Output: `z.object({ message: string, actions: array })`
- [ ] Flow:
  1. Decode base64 audio
  2. Convert to Buffer/File for Whisper
  3. Transcribe audio to text
  4. Process text with GPT-4 tools
  5. Execute tools with user context
  6. Return results with metadata

#### Step 4: Integrate AI Router
- [ ] Add AI router to `appRouter.ts`
- [ ] Export type for frontend consumption

### Phase 2: Frontend Setup

#### Step 5: Audio Recording Utilities (`webapp/src/lib/audio.ts`)
- [ ] Create `startRecording()` function
- [ ] Create `stopRecording()` function
- [ ] Return WebM blob
- [ ] Convert to base64 for transmission

#### Step 6: FAB Component (`webapp/src/components/VoiceAssistant.tsx`)
- [ ] Floating button (bottom-right: 24px from bottom and right)
- [ ] States:
  - Idle: Microphone icon
  - Recording: Pulsing red dot animation
  - Processing: Loading spinner
- [ ] Click handlers:
  - Idle → Recording: Start recording
  - Recording → Processing: Stop recording, send to backend
- [ ] Call tRPC `ai.processVoice` mutation
- [ ] Display toast notifications on success/error

#### Step 7: Toast System Integration
- [ ] Use existing toast library (or add one like `sonner` or `react-hot-toast`)
- [ ] Display success/error messages from AI response
- [ ] Show action details (e.g., "Event 'Birthday Party' created")

#### Step 8: App Integration
- [ ] Add `<VoiceAssistant />` to main app layout
- [ ] Ensure it appears on all authenticated pages
- [ ] Position: fixed bottom-right

### Phase 3: Testing & Refinement

#### Step 9: End-to-End Testing
- [ ] Test voice command: "Create an event called Birthday Party on December 25th"
- [ ] Test voice command: "Add a new client named John Doe with email john@example.com"
- [ ] Verify toast notifications appear
- [ ] Verify actions execute correctly
- [ ] Test error handling (invalid commands, missing data)

#### Step 10: Error Handling & Edge Cases
- [ ] Handle microphone permission denied
- [ ] Handle network errors
- [ ] Handle OpenAI API errors
- [ ] Handle ambiguous commands (GPT-4 should ask for clarification via message)
- [ ] Handle missing required fields (GPT-4 should prompt user)

#### Step 11: Performance Optimization
- [ ] Add timeout for long-running requests
- [ ] Optimize audio encoding if needed
- [ ] Cache OpenAI client instance

## Data Flow

```
User clicks FAB
  ↓
Start recording (MediaRecorder)
  ↓
User clicks again to stop
  ↓
Convert WebM blob → base64
  ↓
Send to backend: tRPC ai.processVoice({ audioData })
  ↓
Backend: Decode base64 → Buffer
  ↓
Backend: Whisper transcribes → "Create event Birthday Party Dec 25"
  ↓
Backend: GPT-4 processes with function calling
  ↓
Backend: GPT-4 calls createEvent({ title: "Birthday Party", startDate: "2025-12-25", ... })
  ↓
Backend: Execute eventService.createEvent(userId, input)
  ↓
Backend: Return { message: "Created event", actions: [{ type: "createEvent", success: true }] }
  ↓
Frontend: Show toast "Event 'Birthday Party' created successfully"
  ↓
Done ✓
```

## GPT-4 Tool Schema Example

```typescript
{
  name: "createEvent",
  description: "Create a new event for the user",
  parameters: {
    type: "object",
    properties: {
      siteId: { type: "string", description: "Site ID where event will be created" },
      title: { type: "string", description: "Event title" },
      startDate: { type: "string", description: "ISO datetime string" },
      endDate: { type: "string", description: "ISO datetime string (optional)" },
      clientId: { type: "string", description: "Client ID if event is for a client (optional)" },
      description: { type: "string", description: "Event description (optional)" }
    },
    required: ["siteId", "title", "startDate"]
  }
}
```

## Dependencies to Add

### Server
- [x] `openai` - OpenAI Node.js SDK

### Webapp
- [ ] Toast library (if not already present): `sonner` or `react-hot-toast`
- [ ] Icon library (if not already present): `lucide-react` for microphone icon

## Future Enhancements (Not in MVP)
- Multi-turn conversations
- Voice response (text-to-speech)
- Command history
- Undo actions
- More complex queries (search, update, delete)
- Context awareness (remember previous interactions)
- Support for multiple languages

## Security Considerations
- AI executes with user's auth context (respects permissions)
- No confirmation step (fast UX) - user trusts AI
- Audio data transmitted over HTTPS
- OpenAI API key stored securely in env variables
- Rate limiting on AI endpoint (prevent abuse)

## Estimated Time
- Backend: ~2-3 hours
- Frontend: ~2 hours
- Testing & refinement: ~1 hour
- **Total: 5-6 hours**
