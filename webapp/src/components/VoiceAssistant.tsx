import { useState, useRef, useEffect } from 'react'
import { Mic, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { trpc } from '../utils/trpc'
import { AudioRecorder, type RecordingState } from '../lib/audio'
import { useQueryClient } from '@tanstack/react-query'

type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export function VoiceAssistant() {
  const { i18n, t } = useTranslation()
  const queryClient = useQueryClient()
  const [state, setState] = useState<RecordingState>('idle')
  const [recorder] = useState(() => new AudioRecorder())
  const [showResponse, setShowResponse] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')
  const [responseType, setResponseType] = useState<'success' | 'error' | 'info'>('info')

  // Conversation history (resets on page refresh)
  const conversationHistory = useRef<ConversationMessage[]>([])

  // Calculate display duration based on text length (min 3 seconds, ~50ms per character)
  const calculateDisplayDuration = (text: string) => {
    const minDuration = 3000 // 3 seconds minimum
    const msPerCharacter = 50 // 50ms per character for reading time
    return Math.max(minDuration, text.length * msPerCharacter)
  }

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

      // Show AI's response message in bubble
      if (data.message) {
        // Check if any actions failed
        const hasFailures = data.actions?.some((action) => !action.success)

        setResponseMessage(data.message)
        setResponseType(hasFailures ? 'error' : data.actions && data.actions.length > 0 ? 'success' : 'info')
        setShowResponse(true)

        // Auto-hide based on message length
        const duration = calculateDisplayDuration(data.message)
        setTimeout(() => {
          setShowResponse(false)
        }, duration)
      }

      // Invalidate all queries to refresh data if any actions were performed
      if (data.actions && data.actions.length > 0) {
        // Invalidate all tRPC queries to refetch data
        queryClient.invalidateQueries()
      }

      setState('idle')
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to process voice command'
      setResponseMessage(errorMessage)
      setResponseType('error')
      setShowResponse(true)

      // Auto-hide based on message length
      const duration = calculateDisplayDuration(errorMessage)
      setTimeout(() => {
        setShowResponse(false)
      }, duration)

      setState('idle')
    },
  })

  // Push-to-talk: Start recording on mouse/touch down
  const handlePushStart = async () => {
    // Check browser support
    if (!AudioRecorder.isSupported()) {
      toast.error(t('voiceAssistant.unsupportedBrowser'))
      return
    }

    // Only start if idle
    if (state === 'idle') {
      try {
        await recorder.startRecording()
        setState('recording')
        toast.info(t('voiceAssistant.recording'))
      } catch (error: any) {
        toast.error(error.message || 'Failed to start recording')
      }
    }
  }

  // Push-to-talk: Stop recording and send on mouse/touch up
  const handlePushEnd = async () => {
    // Only process if currently recording
    if (state === 'recording') {
      try {
        setState('processing')
        const audioBlob = await recorder.stopRecording()

        // Convert to base64
        const base64Audio = await recorder.blobToBase64(audioBlob)

        // Send to backend with conversation history and user's language
        processVoiceMutation.mutate({
          audioData: base64Audio,
          conversationHistory: conversationHistory.current,
          language: i18n.language,
        })
      } catch (error: any) {
        toast.error(error.message || 'Failed to process recording')
        setState('idle')
      }
    }
  }

  return (
    <>
      {/* Response bubble */}
      {showResponse && (
        <div
          className={`fixed bottom-24 end-6 z-50 max-w-xs rounded-2xl px-4 py-3 pe-10 shadow-xl animate-in slide-in-from-bottom-2 fade-in ${
            responseType === 'success'
              ? 'bg-green-500 text-white'
              : responseType === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
          }`}
        >
          <p className="text-sm">{responseMessage}</p>

          {/* Close button */}
          <button
            onClick={() => setShowResponse(false)}
            className="absolute top-2 end-2 rounded-full p-1 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Speech bubble tail */}
          <div
            className={`absolute -bottom-2 end-8 h-4 w-4 rotate-45 ${
              responseType === 'success'
                ? 'bg-green-500'
                : responseType === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
            }`}
          />
        </div>
      )}

      {/* Voice button */}
      <button
        onMouseDown={handlePushStart}
        onMouseUp={handlePushEnd}
        onMouseLeave={handlePushEnd}
        onTouchStart={handlePushStart}
        onTouchEnd={handlePushEnd}
        disabled={state === 'processing'}
        className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none"
        aria-label={
          state === 'idle'
            ? t('voiceAssistant.holdToSpeak')
            : state === 'recording'
              ? t('voiceAssistant.recording')
              : t('voiceAssistant.processing')
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
    </>
  )
}
