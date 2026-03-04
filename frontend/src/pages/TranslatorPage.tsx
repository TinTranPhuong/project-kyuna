import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslatorStore } from '@/store/translatorStore'
import type { TranslationJob } from '@/store/translatorStore'
import PageViewer from '@/components/translator/PageViewer'
import FileUploader from '@/components/translator/FileUploader'
import OriginalPanel from '@/components/translator/OriginalPanel'
import TranslationProgress from '@/components/translator/TranslationProgress'
import JobList from '@/components/translator/JobList'

export default function TranslatorPage() {
  const loadJobs      = useTranslatorStore(state => state.loadJobs)
  const pollJobStatus = useTranslatorStore(state => state.pollJobStatus)
  const jobs          = useTranslatorStore(state => state.jobs)

  const activeJobId = useTranslatorStore(state => state.activeJobId)
  const activeJob: TranslationJob | null =
    activeJobId ? (jobs.find(j => j.id === activeJobId) ?? null) : null

  useEffect(() => { loadJobs() }, [loadJobs])

  useEffect(() => {
    if (!activeJobId || activeJob?.status !== 'processing') return
    const intervalId = setInterval(() => pollJobStatus(activeJobId), 2000)
    return () => clearInterval(intervalId)
  }, [activeJobId, activeJob?.status, pollJobStatus])

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-transparent">

      {/* Left Column (65%) — Viewer */}
      <div className="flex-[65] flex flex-col h-full min-w-0 relative bg-transparent">
        {activeJob?.status === 'processing' ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <TranslationProgress />
          </div>
        ) : activeJob ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col h-full">
            <div className="flex-1 overflow-hidden p-4">
              <PageViewer />
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/50 font-display text-center p-8">
            <p className="bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/5">
              Select "NEW" to start.
            </p>
          </div>
        )}
      </div>

      {/* Right Column (35%) — Flexible Sidebar */}
      <div className="flex-[35] flex flex-col h-full min-w-0 shrink-0 bg-black/50 ">

        {/* BOX 1: HISTORY (20% split) */}
        {jobs.length > 0 && (
          <div className="flex-[20] min-h-0 overflow-y-auto p-4 custom-scrollbar flex flex-col bg-transparent">
            <h4 className="text-[14px] font-bold text-white/40 uppercase tracking-wider mb-3 sticky top-0 z-10">
              History
            </h4>
            <div className="flex-1">
              <JobList />
            </div>
          </div>
        )}

        {/* BOX 2: REFERENCE / UPLOAD (80% split) */}
        <div className="flex-[80] min-h-0 overflow-hidden flex flex-col bg-transparent">
          {!activeJob ? (
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-transparent">
                <FileUploader />
              </motion.div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="flex-1 flex flex-col h-full overflow-hidden bg-transparent"
            >
              <OriginalPanel />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}