import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, File, Image as ImageIcon, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { submissionsAPI } from '../api';

export default function SubmissionDrawer({ assignment, onClose, onSuccess, theme = localStorage.getItem('theme') || 'dark' }) {
  const [file, setFile] = useState(null);
  const [comments, setComments] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const task = assignment?.task_details || assignment?.task || (assignment?.title ? assignment : null);
  const allowedFmt = task?.allowed_format || 'ANY';
  const isLight = theme === 'light';

  // Return clean extension filters for OS File Explorer file picker dialog
  const getAcceptString = () => {
    if (allowedFmt === 'PDF') return '.pdf';
    if (allowedFmt === 'PPT') return '.ppt,.pptx';
    if (allowedFmt === 'DOC') return '.doc,.docx';
    if (allowedFmt === 'IMAGE') return '.png,.jpg,.jpeg';
    return '*';
  };

  const validateFileFormat = (selectedFile) => {
    if (!selectedFile) return false;
    const fileName = selectedFile.name.toLowerCase();

    if (allowedFmt === 'PDF') {
      const isPdf = fileName.endsWith('.pdf') || selectedFile.type === 'application/pdf';
      if (!isPdf) {
        setError('❌ Invalid format! This task strictly requires a PDF document (.pdf).');
        return false;
      }
    } else if (allowedFmt === 'PPT') {
      const isPpt = fileName.endsWith('.ppt') || fileName.endsWith('.pptx');
      if (!isPpt) {
        setError('❌ Invalid format! This task strictly requires a PPT presentation (.ppt, .pptx).');
        return false;
      }
    } else if (allowedFmt === 'DOC') {
      const isDoc = fileName.endsWith('.doc') || fileName.endsWith('.docx');
      if (!isDoc) {
        setError('❌ Invalid format! This task strictly requires a Word document (.doc, .docx).');
        return false;
      }
    } else if (allowedFmt === 'IMAGE') {
      const isImg = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || selectedFile.type.startsWith('image/');
      if (!isImg) {
        setError('❌ Invalid format! This task strictly requires an Image screenshot (.png, .jpg, .jpeg).');
        return false;
      }
    }
    return true;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setError('');
      if (!validateFileFormat(selectedFile)) {
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a valid evidence file matching the required format.');
      return;
    }

    if (!validateFileFormat(file)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const targetTaskId = assignment?.task_id || assignment?.task?.id || assignment?.id;
      const targetAssignmentId = assignment?.id;

      // 1. Request AWS S3 Presigned Upload URL from Backend API
      const urlRes = await submissionsAPI.getS3UploadURL({
        task_id: targetTaskId,
        assignment_id: targetAssignmentId,
        filename: file.name,
        file_size: file.size,
        content_type: file.type || 'application/octet-stream'
      });

      const { upload_url, s3_key, s3_bucket } = urlRes.data;

      // 2. Direct Client Upload to AWS S3 Bucket
      await axios.put(upload_url, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' }
      });

      // 3. Confirm S3 Upload with Backend API to store object key in Database
      await submissionsAPI.confirmS3Upload({
        task_id: targetTaskId,
        assignment_id: targetAssignmentId,
        s3_key,
        s3_bucket,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        comments
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit evidence to AWS S3.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
      <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl relative ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09222f] border-[#144052] text-white'
      }`}>
        <button
          onClick={onClose}
          className={`absolute top-5 right-5 p-2 rounded-xl border transition cursor-pointer ${
            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300' : 'bg-slate-700 hover:bg-slate-600 text-slate-400 border-slate-600'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold mb-1">Submit Evidence</h3>
        <p className="text-xs text-teal-700 font-semibold mb-3">{task?.title}</p>

        {/* Format Requirement Banner */}
        <div className={`p-3 rounded-xl mb-3 text-xs font-bold border flex items-center gap-2 ${
          isLight ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
        }`}>
          {allowedFmt === 'PDF' && <span>📄 Required File Format: PDF Document (.pdf)</span>}
          {allowedFmt === 'PPT' && <span>📊 Required File Format: PPT Presentation (.ppt, .pptx)</span>}
          {allowedFmt === 'DOC' && <span>📝 Required File Format: Word Document (.doc, .docx)</span>}
          {allowedFmt === 'IMAGE' && <span>🖼️ Required File Format: Image Screenshot (.png, .jpg, .jpeg)</span>}
          {allowedFmt === 'ANY' && <span>📁 Required File Format: Any File (.pdf, .zip, docs, images)</span>}
        </div>

        {/* Approval Banner */}
        <div className={`p-3 rounded-xl mb-4 text-xs font-semibold border ${
          task?.approval_required
            ? (isLight ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-purple-950/60 border-purple-500/40 text-purple-300')
            : (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300')
        }`}>
          {task?.approval_required
            ? '📌 Requires Admin Approval before marking Completed.'
            : '⚡ Auto-Completes immediately upon evidence upload!'}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-600 text-xs font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* File Picker Input Restricted by accept */}
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptString()}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Drag & Drop File Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isLight ? 'border-slate-300 hover:border-teal-500 bg-slate-50' : 'border-slate-700 hover:border-cyan-400/50 bg-[#061b27]'
            }`}
          >
            {previewUrl ? (
              <div className="space-y-2">
                <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-xl border border-slate-300 shadow-lg object-contain" />
                <p className="text-xs text-emerald-600 font-semibold">{file.name}</p>
                <span className="text-[10px] text-slate-500 underline block mt-1">Click to change file</span>
              </div>
            ) : file ? (
              <div className="space-y-2 py-4">
                <File className="w-10 h-10 text-teal-600 mx-auto" />
                <p className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{file.name}</p>
                <p className="text-[11px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <span className="text-[10px] text-slate-500 underline block mt-1">Click to change file</span>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className={`w-10 h-10 mx-auto ${isLight ? 'text-teal-600' : 'text-slate-400'}`} />
                <p className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Click or drag & drop evidence file</p>
                <p className="text-[10px] text-teal-700 font-medium">
                  {allowedFmt === 'PDF' && 'Only .pdf files allowed'}
                  {allowedFmt === 'PPT' && 'Only .ppt and .pptx files allowed'}
                  {allowedFmt === 'DOC' && 'Only .doc and .docx files allowed'}
                  {allowedFmt === 'IMAGE' && 'Only .png, .jpg, and .jpeg files allowed'}
                  {allowedFmt === 'ANY' && 'PNG, JPEG, PDF, PPT, DOCX, ZIP (Max 100 MB)'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold mb-1">Submission Notes / Comments</label>
            <textarea
              rows="3"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add details about your submission..."
              className={`w-full px-3.5 py-2.5 rounded-xl outline-none border transition ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#061b27] border-[#18485e] text-white placeholder:text-slate-500'
              }`}
            />
          </div>

          <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
            isLight ? 'border-slate-200' : 'border-[#144052]'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
                isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 font-bold text-white shadow-lg cursor-pointer"
            >
              {loading ? 'Uploading...' : 'Confirm Evidence Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
