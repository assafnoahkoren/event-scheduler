import { useState, useRef } from 'react'
import { Mic, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '../utils/trpc'
import { AudioRecorder, type RecordingState } from '../lib/audio'

type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export function VoiceAssistant() {
  const [state, setState] = useState<RecordingState>('idle')
  const [recorder] = useState(() => new AudioRecorder())

  // Conversation history (resets on page refresh)
  const conversationHistory = useRef<ConversationMessage[]>([])

  const processVoiceMutation = trpc.ai.processVoice.useMutation({
    onSuccess: (data) => {
      // Add user's transcribed text to conversation history
      if (data.transcribedText) {
        conversationHistory.current.push({
          role: 'user',
          content: data.transcribedText,
        })
      }

      // Add assistant response to conversation history
      if (data.message) {
        conversationHistory.current.push({
          role: 'assistant',
          content: data.message,
        })
      }

      // Show success toast for each action
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action) => {
          if (action.success) {
            toast.success(action.message)
          } else {
            toast.error(action.message)
          }
        })
      } else if (data.message) {
        // If no actions but there's a message, show it
        toast.info(data.message)
      }

      setState('idle')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to process voice command')
      setState('idle')
    },
  })

  const handleClick = async () => {
    // Check browser support
    if (!AudioRecorder.isSupported()) {
      toast.error('Voice recording is not supported in your browser')
      return
    }

    if (state === 'idle') {
      // Start recording
      try {
        await recorder.startRecording()
        setState('recording')
        toast.info('Listening... Click again to send')
      } catch (error: any) {
        toast.error(error.message || 'Failed to start recording')
      }
    } else if (state === 'recording') {
      // Stop recording and process
      try {
        setState('processing')
        const audioBlob = await recorder.stopRecording()

        // Convert to base64
        const base64Audio = await recorder.blobToBase64(audioBlob)

        // Send to backend with conversation history
        processVoiceMutation.mutate({
          audioData: base64Audio,
          conversationHistory: conversationHistory.current,
        })
      } catch (error: any) {
        toast.error(error.message || 'Failed to process recording')
        setState('idle')
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'processing'}
      className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={
        state === 'idle'
          ? 'Start voice command'
          : state === 'recording'
            ? 'Stop recording and send'
            : 'Processing...'
      }
    >
      {state === 'processing' ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <Mic
          className={`h-6 w-6 transition-all ${
            state === 'recording' ? 'animate-pulse text-red-100' : ''
          }`}
        />
      )}

      {/* Recording indicator (pulsing ring) */}
      {state === 'recording' && (
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
      )}
    </button>
  )
}
