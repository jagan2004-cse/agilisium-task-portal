import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  File, 
  Trash2, 
  FolderPlus 
} from 'lucide-react';
import { submissionsAPI } from '../api';

export default function EvidenceUploadModal({ assignment, task, isOpen, onClose, onSuccess, theme = 'dark' }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [comments, setComments] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overallError, setOverallError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const activeTask = task || assignment?.task_details || assignment?.task;
  const isLight = theme === 'light';

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    setOverallError('');
    const formatted = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      progress: 0,
      status: 'IDLE', // IDLE, UPLOADING, SUCCESS, ERROR
      errorMessage: ''
    }));

    setSelectedFiles((prev) => [...prev, ...formatted]);
  };

  const removeFile = (id) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingleFileToS3 = async (fileItem) => {
    // 1. Update status to UPLOADING
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'UPLOADING', progress: 5, errorMessage: '' } : f))
    );

    try {
      // 2. Request S3 Presigned Upload URL from Backend
      const urlRes = await submissionsAPI.getS3UploadURL({
        task_id: activeTask?.id,
        assignment_id: assignment?.id,
        filename: fileItem.name,
        file_size: fileItem.size,
        content_type: fileItem.type
      });

      const { upload_url, s3_key, s3_bucket } = urlRes.data;

      // 3. Direct Client Upload to AWS S3 using Presigned PUT URL
      await axios.put(upload_url, fileItem.file, {
        headers: {
          'Content-Type': fileItem.type
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || fileItem.size));
          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, progress: Math.min(percent, 95) } : f))
          );
        }
      });

      // 4. Confirm Upload with Backend to store S3 object metadata in database
      await submissionsAPI.confirmS3Upload({
        task_id: activeTask?.id,
        assignment_id: assignment?.id,
        s3_key,
        s3_bucket,
        file_name: fileItem.name,
        file_type: fileItem.type,
        file_size: fileItem.size,
        comments
      });

      // 5. Update status to SUCCESS
      setSelectedFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'SUCCESS', progress: 100 } : f))
      );
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'S3 Upload failed. Please try again.';
      setSelectedFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'ERROR', errorMessage: msg } : f))
      );
      return false;
    }
  };

  const handleStartAllUploads = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setOverallError('Please select at least one evidence file to upload.');
      return;
    }

    setIsUploading(true);
    setOverallError('');

    let successCount = 0;
    for (const fileItem of selectedFiles) {
      if (fileItem.status !== 'SUCCESS') {
        const ok = await uploadSingleFileToS3(fileItem);
        if (ok) successCount++;
      } else {
        successCount++;
      }
    }

    setIsUploading(false);

    if (successCount === selectedFiles.length) {
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } else {
      setOverallError('Some files failed to upload. You can click Retry on failed files.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 border shadow-2xl relative transition-all ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09222f] border-[#144052] text-white'
      }`}>
        <button
          onClick={onClose}
          disabled={isUploading}
          className={`absolute top-4 right-4 p-1.5 rounded-xl transition ${
            isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title & Task Info */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600">AWS S3 Direct Upload</span>
            <h3 className="text-lg font-black">{activeTask?.title || 'Upload Task Evidence'}</h3>
            <p className="text-xs text-slate-400">Canonical Path: <code className="text-teal-400 font-mono text-[10px]">users/{"{id}"}/{"{name}"}/{"{task}"}/</code></p>
          </div>
        </div>

        {overallError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{overallError}</span>
          </div>
        )}

        {/* 📥 Drag and Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-2xl border-2 border-dashed text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-teal-400 bg-teal-500/10 scale-[1.01]'
              : isLight
              ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-teal-500'
              : 'border-[#18485e] bg-[#061b27] hover:bg-[#092638] hover:border-teal-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <FolderPlus className="w-10 h-10 text-teal-500 mb-1" />
          <h4 className="text-sm font-bold">Drag and drop files here, or <span className="text-teal-500 underline">Browse</span></h4>
          <p className="text-[11px] text-slate-400">
            Supports PDF, DOCX, XLSX, PPTX, PNG, JPG, MP4, ZIP (Max: 100 MB per file)
          </p>
        </div>

        {/* Selected Files List with Realtime S3 Upload Progress */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span>Selected Evidence Files ({selectedFiles.length})</span>
              <span>S3 Upload Status</span>
            </div>

            {selectedFiles.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border text-xs space-y-2 transition ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#061b27] border-[#18485e]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                    <div className="truncate">
                      <p className="font-bold truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(item.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'SUCCESS' && (
                      <span className="text-emerald-500 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Uploaded to S3 ✓
                      </span>
                    )}

                    {item.status === 'ERROR' && (
                      <button
                        type="button"
                        onClick={() => uploadSingleFileToS3(item)}
                        className="text-rose-400 font-bold text-[10px] underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    )}

                    {item.status === 'IDLE' && !isUploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition cursor-pointer"
                        title="Remove selected file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar Component */}
                {item.status === 'UPLOADING' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold">
                      <span>Uploading directly to AWS S3...</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-400 to-cyan-500 h-full transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.status === 'ERROR' && (
                  <p className="text-[10px] text-rose-400 font-medium">{item.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Optional Comments */}
        <div className="mt-4">
          <label className="block text-xs font-bold mb-1">Optional Notes / Comments</label>
          <input
            type="text"
            placeholder="Add any notes about this evidence submission..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-600' : 'bg-[#061b27] border-[#18485e] text-white focus:border-teal-400'
            }`}
          />
        </div>

        {/* Submit Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartAllUploads}
            disabled={isUploading || selectedFiles.length === 0}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Uploading to S3...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Evidence Files ({selectedFiles.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
