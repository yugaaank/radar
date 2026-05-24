import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export const SyncIndicator = ({ loading, hasData }: { loading: boolean; hasData: boolean }) => {
  return (
    <AnimatePresence>
      {loading && hasData && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-8 right-32 z-[100] flex items-center gap-3 px-4 py-2 bg-black text-white rounded-full shadow-2xl border border-white/10"
        >
          <Loader2 size={14} className="animate-spin text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">Syncing...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
