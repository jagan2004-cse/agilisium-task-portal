import React, { useState, useEffect, useRef } from 'react';
import { 
  Dices, RotateCcw, Trophy, X, Shuffle, AlertCircle, CheckCircle2, 
  Users, History, Trash2, Sparkles
} from 'lucide-react';

const DEFAULT_28_NAMES = [
  "Karthik Thiyagarajan",
  "AnanyaSree Sridharan",
  "Arakatavemula Lakshmi",
  "Aruna Kiruthija",
  "Jagan Saravanan",
  "Janarthanan Karuppasamy",
  "Jayashree Sankar",
  "Jeevanantham Balamurugan",
  "Jeyakrishnan Rajendran",
  "Karthick Saravanan",
  "Kethireddy Sivani",
  "Lakshan VijayaSekar",
  "Lingesh Thirumalai",
  "Mittapalli Bhanu Vardhan",
  "Monaleesaa Karthikeyan",
  "Nandimandalam Akanksha",
  "Nithish Balaji",
  "Pentela Ajay Kumar",
  "Priyatharshini Kannan",
  "SandhiyaSri Dhandapani",
  "Shandrakala Nagendran",
  "Sivakumar NandaKumar",
  "Srinithi Santhoshkumar",
  "Umesh Kumar",
  "Sanjay Kumar",
  "Agilisium Trainer",
  "Batch Engineer 27",
  "Batch Engineer 28"
];

const SLICE_COLORS = [
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
  '#10b981', '#14b8a6', '#6366f1', '#a855f7', '#0284c7', '#d97706',
  '#059669', '#7c3aed', '#db2777', '#e11d48', '#ca8a04', '#16a34a',
  '#0891b2', '#2563eb', '#9333ea', '#c026d3', '#e11d48', '#ea580c',
  '#65a30d', '#0d9488', '#0284c7', '#4f46e5'
];

export default function LuckySpinWheel() {
  const [namesText, setNamesText] = useState(DEFAULT_28_NAMES.join('\n'));
  const [participants, setParticipants] = useState(DEFAULT_28_NAMES);
  
  // Controls & State
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [winnerIndexState, setWinnerIndexState] = useState(null);
  const [winnerHistory, setWinnerHistory] = useState([]);
  const [removeWinnerAfterSpin, setRemoveWinnerAfterSpin] = useState(true); // Default ON to easily select all 28 people
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const canvasRef = useRef(null);
  const currentAngleRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Parse names & validate
  const parsedNames = namesText
    .split('\n')
    .map(n => n.trim())
    .filter(n => n.length > 0);

  const nameCount = parsedNames.length;
  // Valid if 1 <= nameCount <= 28 (Allows spinning as winners are removed until all 28 are selected!)
  const isValid = nameCount > 0 && nameCount <= 28;

  // Check duplicate names
  const duplicateNames = parsedNames.filter((item, index) => parsedNames.indexOf(item) !== index);
  const hasDuplicates = duplicateNames.length > 0;

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [participants, winnerIndexState]);

  const drawWheel = (angle = currentAngleRef.current) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 25;

    ctx.clearRect(0, 0, width, height);

    if (participants.length === 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎉 All 28 participants have been selected!', centerX, centerY - 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Click "Reset 28 Names" to start a new session.', centerX, centerY + 15);
      return;
    }

    const sliceAngle = (2 * Math.PI) / participants.length;

    participants.forEach((name, i) => {
      const startAngle = angle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const isWinnerSlice = winnerIndexState === i;

      // Draw segment slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      if (isWinnerSlice) {
        ctx.fillStyle = '#fbbf24'; // Highlight winning slice in bright yellow/amber
      } else {
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      }
      ctx.fill();
      ctx.lineWidth = isWinnerSlice ? 3 : 1.5;
      ctx.strokeStyle = isWinnerSlice ? '#ffffff' : 'rgba(15, 23, 42, 0.7)';
      ctx.stroke();

      // Draw text inside segment slice
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = isWinnerSlice ? '#0f172a' : '#ffffff';

      // Dynamic font auto-scaling
      const fontSize = participants.length > 20 ? 10 : participants.length > 12 ? 11 : 12;
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      if (!isWinnerSlice) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
      }

      const formattedName = name.length > 18 ? name.substring(0, 17) + '..' : name;
      ctx.fillText(formattedName, radius - 15, 4);
      ctx.restore();
    });

    // Central hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#06b6d4';
    ctx.stroke();

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUCKY', centerX, centerY - 3);
    ctx.fillText('WHEEL', centerX, centerY + 10);
  };

  const handleUpdateWheel = () => {
    setParticipants(parsedNames);
    setWinnerIndexState(null);
    setWinner(null);
  };

  const handleShuffleNames = () => {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    setParticipants(shuffled);
    setNamesText(shuffled.join('\n'));
    setWinnerIndexState(null);
    setWinner(null);
  };

  const handleSpin = () => {
    if (isSpinning || participants.length === 0 || !isValid) return;

    setIsSpinning(true);
    setWinner(null);
    setWinnerIndexState(null);

    // 1. Single Source of Truth: Pick winning index FIRST
    const winnerIndex = Math.floor(Math.random() * participants.length);
    const selectedWinnerName = participants[winnerIndex];

    const sliceAngle = (2 * Math.PI) / participants.length;

    // 2. Exact mathematical calculation to stop pointer (at 1.5 * PI) directly on winnerIndex slice midpoint
    const pointerAngle = 1.5 * Math.PI;
    const winnerSliceMid = (winnerIndex + 0.5) * sliceAngle;

    const currentModulo = currentAngleRef.current % (2 * Math.PI);

    let targetDelta = (pointerAngle - currentModulo - winnerSliceMid) % (2 * Math.PI);
    while (targetDelta < 0) {
      targetDelta += 2 * Math.PI;
    }

    // Add 6 full 360-degree rotations (12 * PI)
    const fullSpins = 6 * 2 * Math.PI;
    const startAngle = currentAngleRef.current;
    const finalAngle = startAngle + fullSpins + targetDelta;

    const duration = 4500; // 4.5 seconds deceleration
    const startTime = performance.now();

    const animateSpin = (now) => {
      const elapsed = now - startTime;
      if (elapsed >= duration) {
        currentAngleRef.current = finalAngle;
        setWinnerIndexState(winnerIndex);
        drawWheel(finalAngle);
        setIsSpinning(false);
        setWinner(selectedWinnerName);
        setWinnerHistory(prev => [selectedWinnerName, ...prev]);

        // Auto-remove winner if toggle ON
        if (removeWinnerAfterSpin) {
          const remaining = participants.filter((_, idx) => idx !== winnerIndex);
          setParticipants(remaining);
          setNamesText(remaining.join('\n'));
        }
        return;
      }

      const progress = elapsed / duration;
      const easeProgress = easeOutQuart(progress);
      const currentPos = startAngle + (finalAngle - startAngle) * easeProgress;
      currentAngleRef.current = currentPos;
      drawWheel(currentPos);

      animationFrameRef.current = requestAnimationFrame(animateSpin);
    };

    animationFrameRef.current = requestAnimationFrame(animateSpin);
  };

  const easeOutQuart = (x) => {
    return 1 - Math.pow(1 - x, 4);
  };

  const handleConfirmReset = () => {
    setParticipants(DEFAULT_28_NAMES);
    setNamesText(DEFAULT_28_NAMES.join('\n'));
    setWinner(null);
    setWinnerIndexState(null);
    setWinnerHistory([]);
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 bg-gradient-to-r from-cyan-950/60 via-purple-950/40 to-slate-900/60 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Lucky Wheel</h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">Spin to randomly select all 28 people one by one until everyone is picked.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-white/20 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset 28 Names</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN — LUCKY WHEEL CANVAS (7 cols) */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden border border-white/15 min-h-[520px]">
          {/* Pointer Arrow fixed at TOP */}
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[26px] border-t-cyan-400 absolute top-5 z-20 drop-shadow-[0_4px_12px_rgba(6,182,212,0.9)]" />

          {/* Wheel Canvas */}
          <canvas
            ref={canvasRef}
            width={460}
            height={460}
            className="rounded-full shadow-2xl transition-transform"
          />

          {/* SPIN BUTTON */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || !isValid || participants.length === 0}
            className={`mt-6 px-10 py-4 rounded-2xl font-black text-lg shadow-2xl flex items-center gap-3 cursor-pointer transition transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              isSpinning
                ? 'bg-purple-600 text-white animate-pulse'
                : winner
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30'
                : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-cyan-500/30'
            }`}
          >
            <Dices className={`w-6 h-6 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>
              {isSpinning ? '🎡 SPINNING...' : participants.length === 0 ? '🎉 ALL 28 SELECTED!' : winner ? '🎉 SPIN AGAIN' : '🎯 SPIN THE WHEEL'}
            </span>
          </button>
        </div>

        {/* RIGHT COLUMN — NAME MANAGER PANEL (5 cols) */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4 border border-white/15">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Participants Remaining ({nameCount} / 28)</span>
            </h3>

            {/* Validation Badge */}
            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
              isValid ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
              nameCount === 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {isValid ? `${nameCount} Remaining ✓` : nameCount === 0 ? '0 Remaining — All Picked 🎉' : `Remove ${nameCount - 28} name(s)`}
            </span>
          </div>

          {/* Validation Warning Notes */}
          {hasDuplicates && (
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Duplicate names detected: {duplicateNames.slice(0, 2).join(', ')}</span>
            </div>
          )}

          {/* Names Textarea */}
          <div>
            <textarea
              rows="12"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder="Enter participant names line-by-line..."
              className="w-full p-3.5 rounded-2xl glass-input text-xs font-semibold text-white outline-none font-mono focus:ring-2 focus:ring-cyan-400 leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdateWheel}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-xs text-white shadow-lg cursor-pointer hover:from-cyan-400"
            >
              Update Wheel
            </button>
            <button
              onClick={handleShuffleNames}
              className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs text-slate-200 border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          </div>

          {/* Toggle Remove Winner */}
          <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 cursor-pointer">
            <span className="font-medium">Remove winner after spin</span>
            <input
              type="checkbox"
              checked={removeWinnerAfterSpin}
              onChange={(e) => setRemoveWinnerAfterSpin(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 cursor-pointer"
            />
          </label>
        </div>

      </div>

      {/* BOTTOM SECTION — WINNER HISTORY */}
      <div className="glass-card rounded-2xl p-6 border border-white/15">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Winner History ({winnerHistory.length} / 28 Picked)</span>
          </h3>
          {winnerHistory.length > 0 && (
            <button
              onClick={() => setWinnerHistory([])}
              className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {winnerHistory.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No winners picked yet. Spin the wheel!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {winnerHistory.map((name, idx) => (
              <span key={idx} className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-xs text-cyan-300 font-bold flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>#{winnerHistory.length - idx}: {name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* WINNER CELEBRATION MODAL */}
      {winner && (
        <div 
          role="region" 
          aria-live="polite" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
        >
          <div className="w-full max-w-md glass-card rounded-3xl p-8 border-2 border-cyan-400/60 shadow-2xl text-center relative space-y-4 animate-bounce-short">
            <button onClick={() => setWinner(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-400 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/50">
              <Trophy className="w-12 h-12 text-white animate-pulse" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">🎉 WINNER SELECTED 🎉</span>
            <h2 className="text-3xl font-black text-white tracking-tight">{winner}</h2>
            <p className="text-xs text-cyan-300 font-semibold">{winnerHistory.length} of 28 Selected</p>

            <button
              onClick={() => setWinner(null)}
              className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-sm text-white shadow-xl shadow-cyan-500/30 cursor-pointer hover:from-cyan-400"
            >
              {participants.length === 0 ? '🎉 All 28 People Picked!' : 'Continue Spinning Next Person'}
            </button>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">Reset Wheel?</h3>
            <p className="text-slate-300">This will restore all 28 participant names to the wheel and clear winner history.</p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 font-bold text-white shadow-lg"
              >
                Reset Wheel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
