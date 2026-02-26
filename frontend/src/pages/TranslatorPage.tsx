import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslatorStore } from '@/store/translatorStore'
import type { TranslationJob } from '@/store/translatorStore'
import PageViewer from '@/components/translator/PageViewer'
import ControlBar from '@/components/translator/ControlBar'
import ActionBar from '@/components/translator/ActionBar'
import FileUploader from '@/components/translator/FileUploader'
import OriginalPanel from '@/components/translator/OriginalPanel'
import TranslationProgress from '@/components/translator/TranslationProgress'
import JobList from '@/components/translator/JobList'

export default function TranslatorPage() {
  const loadJobs      = useTranslatorStore(state => state.loadJobs)
  const pollJobStatus = useTranslatorStore(state => state.pollJobStatus)
  const jobs          = useTranslatorStore(state => state.jobs)
  // const selectJob     = useTranslatorStore(state => state.selectJob)

  // BUG 1 FIXED: state.activeJob does not exist in translatorStore.
  // The store has activeJobId: string | null. Accessing state.activeJob returns
  // undefined — activeJob?.status is always undefined, so the conditional rendering
  // always falls through to the idle "Upload a file" state even when a job is active.
  // Fix: read activeJobId from the store and derive the job object from the jobs array.
  const activeJobId = useTranslatorStore(state => state.activeJobId)
  const activeJob: TranslationJob | null =
    activeJobId ? (jobs.find(j => j.id === activeJobId) ?? null) : null

  // BUG 2 FIXED: state.sourceLang → state.sourceLanguage
  // BUG 3 FIXED: state.targetLang → state.targetLanguage
  // BUG 4 FIXED: state.setSourceLang → state.setSourceLanguage
  // BUG 5 FIXED: state.setTargetLang → state.setTargetLanguage
  // All four field names were wrong — every language selector read undefined
  // and setters were undefined functions → runtime TypeError on user interaction.
  const sourceLanguage    = useTranslatorStore(state => state.sourceLanguage)
  const setSourceLanguage = useTranslatorStore(state => state.setSourceLanguage)
  const targetLanguage    = useTranslatorStore(state => state.targetLanguage)
  const setTargetLanguage = useTranslatorStore(state => state.setTargetLanguage)

  // Load job history on mount so the JobList panel is populated immediately
  useEffect(() => { loadJobs() }, [loadJobs])

  // Poll every 2s while a job is actively translating.
  // Dependency on [activeJobId, activeJob?.status] means the effect re-runs when
  // status changes to 'completed'/'failed' — React's cleanup clears the old interval
  // before the new effect starts with no setInterval, stopping the polling automatically.
  useEffect(() => {
    if (!activeJobId || activeJob?.status !== 'processing') return
    const intervalId = setInterval(() => pollJobStatus(activeJobId), 2000)
    return () => clearInterval(intervalId)
  }, [activeJobId, activeJob?.status, pollJobStatus])

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-surface-900">

      {/* Left Column (65%) — Viewer */}
      <div className="flex-[65] flex flex-col h-full min-w-0 border-r border-white/10 relative">

        {activeJob?.status === 'processing' ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <TranslationProgress />
          </div>

        ) : activeJob ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col h-full">
            <div className="p-4 shrink-0 bg-white/5 border-b border-white/10">
              <ActionBar />
            </div>
            <div className="flex-1 overflow-hidden bg-black/20 p-4">
              <PageViewer />
            </div>
            <div className="p-4 shrink-0 bg-white/5 border-t border-white/10">
              <ControlBar />
            </div>
          </motion.div>

        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 font-display text-center p-8">
            Upload a file or select a past job to start translating.
          </div>
        )}
      </div>

      {/* Right Column (35%) — Controls */}
      <div className="flex-[35] flex flex-col h-full min-w-0 bg-white/5 backdrop-blur-md shrink-0">

        {/* Language selectors */}
        <div className="p-4 border-b border-white/10 shrink-0 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Translation Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              {/* BUG 2+4: htmlFor/id and value/onChange corrected */}
              <label className="text-xs text-white/50" htmlFor="sourceLanguage">Source</label>
              <select
                id="sourceLanguage"
                value={sourceLanguage}
                onChange={e => setSourceLanguage(e.target.value)}
                className="glass-input text-sm py-2 cursor-pointer"
                disabled={activeJob?.status === 'processing'}
              >
                <option value="auto">Auto Detect</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            <div className="space-y-1">
              {/* BUG 3+5: htmlFor/id and value/onChange corrected */}
              <label className="text-xs text-white/50" htmlFor="targetLanguage">Target</label>
              <select
                id="targetLanguage"
                value={targetLanguage}
                onChange={e => setTargetLanguage(e.target.value)}
                className="glass-input text-sm py-2 cursor-pointer"
                disabled={activeJob?.status === 'processing'}
              >
                <option value="en">English</option>
                <option value="vi">Vietnamese</option>
              </select>
            </div>
          </div>
        </div>

        {/* Past Jobs list — allows switching between previous translation jobs.
            Was missing from the original: users had no way to re-open finished jobs. */}
        {jobs.length > 0 && (
          <div className="border-b border-white/10 max-h-48 overflow-y-auto p-4 shrink-0">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Past Jobs</h4>
            <JobList />
          </div>
        )}

        {/* Upload or Original panel */}
        <div className="flex-1 overflow-y-auto p-4">
          {!activeJob ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <FileUploader />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full">
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Original Reference</h4>
              <OriginalPanel />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}