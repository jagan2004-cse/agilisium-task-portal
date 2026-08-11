import React, { useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { rotationAPI } from '../api';

export default function PresentationSubmissionModal({ schedule, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a presentation file (PPT, PDF, ZIP).');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('schedule_id', schedule.id);
    formData.append('file', file);

    try {
      await rotationAPI.submitPresentation(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload presentation evidence.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-white/20 shadow-2xl relative space-y-4">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white">Upload Presentation Evidence</h3>
        <p className="text-xs text-purple-300 font-semibold">{schedule?.topic}</p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="border-2 border-dashed border-white/20 hover:border-purple-400/50 rounded-2xl p-6 text-center bg-white/5">
            <label className="cursor-pointer space-y-2 block">
              <UploadCloud className="w-10 h-10 text-purple-400 mx-auto" />
              <p className="font-semibold text-white">{file ? file.name : 'Select PPT, PDF, DOCX, ZIP file'}</p>
              <p className="text-[10px] text-slate-400">Supported files up to 100 MB</p>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 font-bold">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 font-bold text-white shadow-lg">
              {loading ? 'Uploading...' : 'Confirm Submission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
