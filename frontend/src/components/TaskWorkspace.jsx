import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Calendar, Clock, Filter, Users, Check, Upload, AlertCircle, ShieldCheck, ShieldAlert, X, CheckCircle2, Trash2, FileText, Image as ImageIcon, Presentation, File, RefreshCw, Bookmark } from 'lucide-react';
import { tasksAPI, authAPI } from '../api';

export default function TaskWorkspace({ user, onOpenSubmitModal, refreshKey }) {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for New Task Creation
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [allowedFormat, setAllowedFormat] = useState('ANY');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('NONE');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('18:00');
  const [priority, setPriority] = useState('MEDIUM');
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedCategory, refreshKey]);

  const fetchData = async () => {
    try {
      const promises = [
        tasksAPI.getTasks({ category_id: selectedCategory || undefined }),
        tasksAPI.getCategories(),
        authAPI.getUsers({ role: 'USER' })
      ];

      if (user?.role === 'USER') {
        promises.push(tasksAPI.getAssignments());
      }

      const results = await Promise.all(promises);
      const loadedTasks = results[0].data.results || results[0].data;
      const loadedCats = results[1].data.results || results[1].data;
      const loadedUsers = results[2].data.results || results[2].data;

      setTasks(loadedTasks);
      setCategories(loadedCats);
      setAllUsers(loadedUsers);

      if (results[3]) {
        setUserAssignments(results[3].data || []);
      }

      // Default selected category to "Tasks"
      if (loadedCats.length > 0 && !categoryId) {
        const tasksCat = loadedCats.find(c => c.name.toLowerCase() === 'tasks') || loadedCats[0];
        setCategoryId(tasksCat.id);
        setAllowedFormat('PPT');
        setIsRecurring(false);
        setRecurrenceType('NONE');
      }
      if (selectedUserIds.length === 0) {
        setSelectedUserIds(loadedUsers.map(u => u.id));
      }
    } catch (err) {
      console.error('Failed to load task workspace data', err);
    }
  };

  const handleCategorySelect = (catId) => {
    setCategoryId(catId);
    const catObj = categories.find(c => String(c.id) === String(catId));
    if (catObj) {
      const nameLower = catObj.name.toLowerCase();
      if (nameLower.includes('assessment') || nameLower === 'tasks') {
        setAllowedFormat('PPT');
        setIsRecurring(false);
        setRecurrenceType('NONE');
        setDueTime('18:00');
      } else if (nameLower.includes('tech updates') || nameLower.includes('public speaking')) {
        setAllowedFormat('DOC');
        setIsRecurring(false);
        setRecurrenceType('NONE');
        setDueTime('18:00');
      } else if (nameLower.includes('duolingo') || nameLower.includes('elevate')) {
        setAllowedFormat('IMAGE');
        setIsRecurring(true);
        setRecurrenceType('DAILY');
        setDueTime('00:00'); // 12:00 AM Midnight deadline for completed day cycle
      } else {
        setAllowedFormat('ANY');
        setIsRecurring(false);
        setRecurrenceType('NONE');
        setDueTime('18:00');
      }
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!dueDate) {
      setErrorMsg('Please select a valid due date.');
      return;
    }

    // Determine final title: Custom input title OR fallback to selected category name
    const selectedCatObj = categories.find(c => String(c.id) === String(categoryId));
    const finalTitle = title.trim() || selectedCatObj?.name || 'Task Assignment';

    setLoading(true);

    try {
      const payload = {
        title: finalTitle,
        description: '',
        due_date: dueDate,
        due_time: dueTime ? (dueTime.length === 5 ? `${dueTime}:00` : dueTime) : '18:00:00',
        priority,
        allowed_format: allowedFormat,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? 'DAILY' : 'NONE',
        approval_required: approvalRequired,
        assign_all: false
      };

      if (categoryId) {
        payload.category = categoryId;
      }

      const res = await tasksAPI.createTask(payload);

      // Assign to selected users
      if (res.data.id && selectedUserIds.length > 0) {
        await tasksAPI.assignUsers(res.data.id, selectedUserIds);
      }

      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Failed to create task', err);
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          const val = data[firstKey];
          setErrorMsg(`${firstKey}: ${Array.isArray(val) ? val.join(' ') : val}`);
        } else {
          setErrorMsg('Failed to create task. Please check form fields.');
        }
      } else {
        setErrorMsg('Network error. Failed to create task.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (window.confirm(`Are you sure you want to delete task "${taskTitle}"? This will delete the task and remove it for all assigned users.`)) {
      try {
        await tasksAPI.deleteTask(taskId);
        fetchData();
      } catch (err) {
        console.error('Failed to delete task', err);
        alert('Failed to delete task.');
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    const tasksCat = categories.find(c => c.name.toLowerCase() === 'tasks') || categories[0];
    setCategoryId(tasksCat?.id || '');
    setAllowedFormat('PPT');
    setIsRecurring(false);
    setRecurrenceType('NONE');
    setDueDate(new Date().toISOString().split('T')[0]);
    setDueTime('18:00');
    setPriority('MEDIUM');
    setApprovalRequired(true);
    setErrorMsg('');
  };

  const toggleUserSelection = (id) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(uId => uId !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  // Collect IDs of tasks for which the user has ALREADY submitted or completed evidence
  const submittedTaskIds = userAssignments
    .filter(a => ['PENDING_APPROVAL', 'SUBMITTED', 'APPROVED', 'COMPLETED'].includes(a.status))
    .map(a => a.task_details?.id || a.task);

  // Filter tasks: Regular users ONLY see tasks where evidence has NOT yet been submitted for the current cycle!
  const visibleTasks = user?.role === 'USER'
    ? tasks.filter(t => !submittedTaskIds.includes(t.id))
    : tasks;

  return (
    <div className="space-y-6">
      {/* Header Banner - Displayed ONLY for Admins */}
      {user?.role !== 'USER' && (
        <div className="glass-card rounded-3xl p-6 bg-slate-800 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Task Management Workspace</span>
            <h2 className="text-2xl font-bold text-white mt-1">Agilisium Batch Tasks</h2>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>
      )}

      {/* Interactive Category Option Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedCategory === ''
              ? 'glass-option-active text-white'
              : 'glass-option-btn text-slate-300'
          }`}
        >
          All Categories
        </button>

        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              String(selectedCategory) === String(c.id)
                ? 'glass-option-active text-white'
                : 'glass-option-btn text-slate-300'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Task List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleTasks.length === 0 ? (
          <div className="md:col-span-2 glass-card p-10 text-center text-slate-400 rounded-2xl border border-slate-700 bg-slate-800 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="font-bold text-white text-base">
              {user?.role === 'USER' ? 'All Current Tasks Completed! 🎉' : 'No tasks created yet.'}
            </p>
            <p className="text-xs text-slate-300">
              {user?.role === 'USER'
                ? 'Daily recurring tasks will reset at 12 AM for your next daily streak upload.'
                : 'Click "Create New Task" above to assign tasks to batch engineers.'}
            </p>
          </div>
        ) : (
          visibleTasks.map((task) => (
            <div key={task.id} className="glass-card rounded-2xl p-5 border border-slate-700 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {task.category_name || 'General Task'}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* TASK RECURRENCE BADGE */}
                    {task.is_recurring || task.recurrence_type === 'DAILY' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-400/50 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-cyan-400" />
                        <span>Daily 12 AM Cycle</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        <span>One-Time Task</span>
                      </span>
                    )}

                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-cyan-300 border border-slate-600 flex items-center gap-1">
                      {task.allowed_format === 'PPT' && '📊 PPT Only'}
                      {task.allowed_format === 'DOC' && '📝 Word Doc Only'}
                      {task.allowed_format === 'IMAGE' && '🖼️ Image Only'}
                      {(!task.allowed_format || task.allowed_format === 'ANY') && '📁 Any Format'}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      task.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      task.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                    }`}>
                      {task.priority}
                    </span>

                    {task.approval_required ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Needs Approval</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Auto-Complete</span>
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mt-2">{task.title}</h3>
                {task.description && <p className="text-xs text-slate-300 mt-1">{task.description}</p>}
              </div>

              <div className="pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Due: {task.due_date}</span>
                  </span>
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{task.due_time ? task.due_time.substring(0, 5) : '00:00'}</span>
                  </span>
                </div>

                {user?.role !== 'USER' ? (
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-300 font-bold">{task.assigned_count || 0} Assigned</span>
                    <button
                      onClick={() => handleDeleteTask(task.id, task.title)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenSubmitModal(task)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Submit Evidence</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
          <div className="w-full max-w-xl bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4 max-h-[90vh] flex flex-col relative">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create New Task & Assign Users</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2 border border-rose-500/40">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">New Task (Optional Custom Title)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. PySpark Window Functions & RDD Assessment (or leave blank to use Category name)"
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-white outline-none"
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`p-2.5 rounded-xl font-bold text-left transition cursor-pointer ${
                          String(categoryId) === String(cat.id)
                            ? 'glass-option-active text-white'
                            : 'glass-option-btn text-slate-300'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TASK RECURRENCE / CYCLE OPTION SELECTOR */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Task Cycle / Recurrence Option</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecurring(true);
                      setRecurrenceType('DAILY');
                      setDueTime('00:00');
                    }}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      isRecurring
                        ? 'bg-cyan-950 border-cyan-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-cyan-300">🔄 Daily 12 AM Cycle Task</span>
                    </div>
                    <p className="text-[10px] text-slate-300">Deadline sets to 12:00 AM Midnight. Task resets daily for a full 24h cycle once evidence is uploaded.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRecurring(false);
                      setRecurrenceType('NONE');
                      setDueTime('18:00');
                    }}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      !isRecurring
                        ? 'bg-indigo-950 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-indigo-300">📌 One-Time Task</span>
                    </div>
                    <p className="text-[10px] text-slate-300">Single day task that permanently disappears once evidence is submitted.</p>
                  </button>
                </div>
              </div>

              {/* ALLOWED FILE FORMAT SELECTOR */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Allowed File Format Option</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'PPT', label: 'PPT Only', ext: '.ppt, .pptx', icon: '📊' },
                    { id: 'DOC', label: 'Word Doc Only', ext: '.doc, .docx', icon: '📝' },
                    { id: 'IMAGE', label: 'Image Only', ext: '.png, .jpg, .jpeg', icon: '🖼️' },
                    { id: 'ANY', label: 'Any Format', ext: '.pdf, .zip, all', icon: '📁' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setAllowedFormat(fmt.id)}
                      className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                        allowedFormat === fmt.id
                          ? 'glass-option-active text-white border-cyan-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <span>{fmt.icon}</span>
                        <span className="truncate">{fmt.label}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1">{fmt.ext}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date, Due Time & Priority Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Due Time (12:00 AM Midnight for Daily)</label>
                  <input
                    type="time"
                    required
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Priority Option</label>
                  <div className="flex gap-1">
                    {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 rounded-xl font-bold text-center transition text-[11px] cursor-pointer ${
                          priority === p
                            ? 'glass-option-active text-white'
                            : 'glass-option-btn text-slate-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* WORKFLOW APPROVAL OPTION SELECTOR */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Workflow Approval Option</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setApprovalRequired(true)}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      approvalRequired
                        ? 'bg-purple-900/50 border-purple-500 text-white shadow-md'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-purple-300">Requires Admin Approval</span>
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-[10px] text-slate-300">Task stays in Pending Approval state until Admin reviews & approves.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovalRequired(false)}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      !approvalRequired
                        ? 'bg-cyan-900/50 border-cyan-500 text-white shadow-md'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-cyan-300">Auto-Completion</span>
                      <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-[10px] text-slate-300">Task automatically marks as Completed immediately upon evidence upload.</p>
                  </button>
                </div>
              </div>

              {/* User Assignee Selection Grid */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Assign to Participants ({selectedUserIds.length} Selected)</label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-900 border border-slate-700">
                  {allUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <label key={u.id} className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer ${
                        isSelected ? 'bg-cyan-950 text-cyan-200 border border-cyan-800' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <span>{u.full_name}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(u.id)}
                          className="w-4 h-4 accent-cyan-500 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-lg cursor-pointer">
                  {loading ? 'Creating...' : 'Create & Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
