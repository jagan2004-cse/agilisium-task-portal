import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Calendar, Clock, Filter, Users, Check, Upload, AlertCircle, ShieldCheck, ShieldAlert, X, CheckCircle2, Trash2, FileText, Image as ImageIcon, Presentation, File, RefreshCw, Bookmark } from 'lucide-react';
import { tasksAPI, authAPI } from '../api';

export default function TaskWorkspace({ user, onOpenSubmitModal, refreshKey, theme = localStorage.getItem('theme') || 'dark' }) {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for New Task Creation
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [allowedFormat, setAllowedFormat] = useState('DOC');
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
      const loadedCats = (results[1].data.results || results[1].data).filter(
        c => !['evidence tasks', 'core tasks', 'standard tasks'].includes(c.name.toLowerCase())
      );
      const loadedUsers = results[2].data.results || results[2].data;

      setTasks(loadedTasks);
      setCategories(loadedCats);
      setAllUsers(loadedUsers);

      if (results[3]) {
        setUserAssignments(results[3].data || []);
      }

      // Default selected category to "Tasks" with default format DOC
      if (loadedCats.length > 0 && !categoryId) {
        const tasksCat = loadedCats.find(c => c.name.toLowerCase() === 'tasks') || loadedCats[0];
        setCategoryId(tasksCat.id);
        setAllowedFormat('DOC');
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
      if (nameLower.includes('certification') || nameLower.includes('certificate')) {
        setAllowedFormat('PDF');
        setIsRecurring(false);
        setRecurrenceType('NONE');
        setDueTime('18:00');
      } else if (nameLower === 'tasks' || nameLower.includes('tech updates') || nameLower.includes('public speaking')) {
        setAllowedFormat('DOC');
        setIsRecurring(false);
        setRecurrenceType('NONE');
        setDueTime('18:00');
      } else if (nameLower.includes('assessment')) {
        setAllowedFormat('PPT');
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
    setAllowedFormat('DOC');
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

  // Filter tasks for user view:
  // For Daily Routine tasks (is_recurring=true or recurrence_type='DAILY'):
  // Removed/disabled for the user once uploaded today. Automatically re-appears at 12:00 AM Midnight for the next day.
  const todayStr = new Date().toISOString().split('T')[0];

  const visibleTasks = tasks.filter(t => {
    if (selectedCategory && String(t.category) !== String(selectedCategory) && String(t.category_id) !== String(selectedCategory)) {
      return false;
    }
    if (user?.role === 'USER') {
      const assign = userAssignments.find(a => String(a.task_details?.id || a.task) === String(t.id));
      if (assign && ['PENDING_APPROVAL', 'SUBMITTED', 'APPROVED', 'COMPLETED'].includes(assign.status)) {
        const isDailyRoutine = t.is_recurring || t.recurrence_type === 'DAILY';
        if (isDailyRoutine) {
          const completedDateStr = assign.completed_at 
            ? new Date(assign.completed_at).toISOString().split('T')[0]
            : todayStr;
          // Hide for remainder of today if submitted today. Re-appears automatically tomorrow at 12:00 AM
          return completedDateStr !== todayStr;
        }
        // One-time task: hide permanently once completed
        return false;
      }
    }
    return true;
  });

  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      {/* Header Button - Displayed ONLY for Admins */}
      {user?.role !== 'USER' && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#005f73] to-[#0a9396] hover:from-[#0a9396] hover:to-[#94d2bd] text-white font-extrabold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition hover:scale-105"
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
              ? 'bg-gradient-to-r from-[#005f73] to-[#0a9396] text-white border border-[#56e3ce] shadow-md'
              : (isLight ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-[#061b27] border border-[#18485e] text-slate-300 hover:bg-[#0d2836]')
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
                ? 'bg-gradient-to-r from-[#005f73] to-[#0a9396] text-white border border-[#56e3ce] shadow-md'
                : (isLight ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-[#061b27] border border-[#18485e] text-slate-300 hover:bg-[#0d2836]')
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Task List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleTasks.length === 0 ? (
          <div className={`md:col-span-2 p-10 text-center rounded-2xl border space-y-2 ${
            isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#09222f] border-[#144052] text-slate-400'
          }`}>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {user?.role === 'USER' ? 'All Current Tasks Completed! 🎉' : 'No tasks created yet.'}
            </p>
            <p className="text-xs text-slate-500">
              {user?.role === 'USER'
                ? 'Daily recurring tasks will reset at 12 AM for your next daily streak upload.'
                : 'Click "Create New Task" above to assign tasks to batch engineers.'}
            </p>
          </div>
        ) : (
          visibleTasks.map((task) => (
            <div key={task.id} className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
              isLight ? 'bg-white border-slate-200 shadow-sm hover:border-teal-500' : 'bg-[#09222f] border-[#144052] hover:border-[#56e3ce]/50'
            }`}>
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isLight ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-cyan-500/20 text-[#56e3ce] border-cyan-500/40'
                  }`}>
                    {task.category_name || 'General Task'}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* TASK RECURRENCE BADGE */}
                    {task.is_recurring || task.recurrence_type === 'DAILY' ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isLight ? 'bg-cyan-50 text-cyan-800 border-cyan-200' : 'bg-cyan-900/60 text-cyan-300 border-cyan-400/50'
                      }`}>
                        <RefreshCw className="w-3 h-3 text-cyan-500" />
                        <span>Daily 12 AM Cycle</span>
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isLight ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-indigo-950 text-indigo-300 border-indigo-700'
                      }`}>
                        <Bookmark className="w-3 h-3" />
                        <span>One-Time Task</span>
                      </span>
                    )}

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-900 text-cyan-300 border-slate-600'
                    }`}>
                      {task.allowed_format === 'PDF' && '📄 PDF Only'}
                      {task.allowed_format === 'PPT' && '📊 PPT Only'}
                      {task.allowed_format === 'DOC' && '📝 Word Doc Only'}
                      {task.allowed_format === 'IMAGE' && '🖼️ Image Only'}
                      {(!task.allowed_format || task.allowed_format === 'ANY') && '📁 Any Format'}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      task.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-600 border border-rose-500/40' :
                      task.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/40' :
                      'bg-slate-500/20 text-slate-600 border border-slate-500/40'
                    }`}>
                      {task.priority}
                    </span>

                    {task.approval_required ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 border border-purple-500/40 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Needs Approval</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/40 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Auto-Complete</span>
                      </span>
                    )}
                  </div>
                </div>

                <h3 className={`text-base font-bold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{task.title}</h3>
                {task.description && <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{task.description}</p>}
              </div>

              <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                isLight ? 'border-slate-200' : 'border-[#144052]'
              }`}>
                <div className="flex items-center gap-3 text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Due: {task.due_date}</span>
                  </span>
                  <span className="flex items-center gap-1 text-teal-700 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{task.due_time ? task.due_time.substring(0, 5) : '00:00'}</span>
                  </span>
                </div>

                {user?.role !== 'USER' ? (
                  <div className="flex items-center gap-3">
                    <span className="text-teal-700 font-bold">{task.assigned_count || 0} Assigned</span>
                    <button
                      onClick={() => handleDeleteTask(task.id, task.title)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/30 transition cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenSubmitModal(task)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#005f73] hover:bg-[#0a9396] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
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
          <div className={`w-full max-w-xl rounded-3xl p-6 border shadow-2xl space-y-4 max-h-[90vh] flex flex-col relative ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09222f] border-[#144052] text-white'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Create New Task & Assign Users</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-600 text-xs font-semibold flex items-center gap-2 border border-rose-500/40">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block font-semibold mb-1">New Task (Optional Custom Title)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. PySpark Window Functions & RDD Assessment (or leave blank to use Category name)"
                  className={`w-full px-3.5 py-2 rounded-xl outline-none border transition ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#061b27] border-[#18485e] text-white placeholder:text-slate-500'
                  }`}
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const isSelected = String(categoryId) === String(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`p-2.5 rounded-xl font-bold text-left transition cursor-pointer border ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#005f73] to-[#0a9396] text-white border-[#56e3ce] shadow-md'
                              : (isLight ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-[#061b27] border-[#18485e] text-slate-300 hover:bg-[#0d2836]')
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TASK RECURRENCE / CYCLE OPTION SELECTOR */}
              <div>
                <label className="block font-semibold mb-1">Task Cycle / Recurrence Option</label>
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
                        ? (isLight ? 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-md' : 'bg-cyan-950 border-cyan-400 text-white shadow-md')
                        : (isLight ? 'bg-slate-50 border-slate-300 text-slate-600' : 'bg-[#061b27] border-[#18485e] text-slate-400')
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">🔄 Daily 12 AM Cycle Task</span>
                    </div>
                    <p className="text-[10px] opacity-80">Deadline sets to 12:00 AM Midnight. Task resets daily for a full 24h cycle once evidence is uploaded.</p>
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
                        ? (isLight ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-md' : 'bg-indigo-950 border-indigo-400 text-white shadow-md')
                        : (isLight ? 'bg-slate-50 border-slate-300 text-slate-600' : 'bg-[#061b27] border-[#18485e] text-slate-400')
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">📌 One-Time Task</span>
                    </div>
                    <p className="text-[10px] opacity-80">Single day task that permanently disappears once evidence is submitted.</p>
                  </button>
                </div>
              </div>

              {/* ALLOWED FILE FORMAT SELECTOR */}
              <div>
                <label className="block font-semibold mb-1">Allowed File Format Option</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'PDF', label: 'PDF Only', ext: '.pdf', icon: '📄' },
                    { id: 'PPT', label: 'PPT Only', ext: '.ppt, .pptx', icon: '📊' },
                    { id: 'DOC', label: 'Word Doc', ext: '.doc, .docx', icon: '📝' },
                    { id: 'IMAGE', label: 'Image Only', ext: '.png, .jpg', icon: '🖼️' },
                    { id: 'ANY', label: 'Any Format', ext: '.zip, all', icon: '📁' },
                  ].map((fmt) => {
                    const isSelected = allowedFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setAllowedFormat(fmt.id)}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#005f73] to-[#0a9396] text-white border-[#56e3ce] shadow-md'
                            : (isLight ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-[#061b27] border-[#18485e] text-slate-400 hover:bg-[#0d2836]')
                        }`}
                      >
                        <div className="flex items-center gap-1 font-bold text-xs">
                          <span>{fmt.icon}</span>
                          <span className="truncate">{fmt.label}</span>
                        </div>
                        <span className={`text-[9px] mt-1 ${isSelected ? 'text-white' : 'text-slate-400'}`}>{fmt.ext}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due Date, Due Time & Priority Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl outline-none border transition ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#061b27] border-[#18485e] text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Due Time (12:00 AM Midnight for Daily)</label>
                  <input
                    type="time"
                    required
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl outline-none border transition ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#061b27] border-[#18485e] text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Priority Option</label>
                  <div className="flex gap-1">
                    {['LOW', 'MEDIUM', 'HIGH'].map((p) => {
                      const isSelected = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-2 rounded-xl font-bold text-center transition text-[11px] cursor-pointer border ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#005f73] to-[#0a9396] text-white border-[#56e3ce] shadow-md'
                              : (isLight ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-[#061b27] border-[#18485e] text-slate-400 hover:bg-[#0d2836]')
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* WORKFLOW APPROVAL OPTION SELECTOR */}
              <div>
                <label className="block font-semibold mb-1">Workflow Approval Option</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setApprovalRequired(true)}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      approvalRequired
                        ? (isLight ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-md' : 'bg-purple-900/50 border-purple-500 text-white shadow-md')
                        : (isLight ? 'bg-slate-50 border-slate-300 text-slate-600' : 'bg-[#061b27] border-[#18485e] text-slate-400')
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">Requires Admin Approval</span>
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-[10px] opacity-80">Task stays in Pending Approval state until Admin reviews & approves.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovalRequired(false)}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      !approvalRequired
                        ? (isLight ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-md' : 'bg-cyan-900/50 border-cyan-500 text-white shadow-md')
                        : (isLight ? 'bg-slate-50 border-slate-300 text-slate-600' : 'bg-[#061b27] border-[#18485e] text-slate-400')
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">Auto-Completion</span>
                      <ShieldAlert className="w-4 h-4 text-teal-500" />
                    </div>
                    <p className="text-[10px] opacity-80">Task automatically marks as Completed immediately upon evidence upload.</p>
                  </button>
                </div>
              </div>

              {/* User Assignee Selection Grid */}
              <div>
                <label className="block font-semibold mb-1">Assign to Participants ({selectedUserIds.length} Selected)</label>
                <div className={`max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#061b27] border-[#18485e]'
                }`}>
                  {allUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <label key={u.id} className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border ${
                        isSelected
                          ? (isLight ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold' : 'bg-cyan-950 border-cyan-800 text-cyan-200 font-semibold')
                          : (isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#09222f] border-[#144052] text-slate-400')
                      }`}>
                        <span>{u.full_name}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(u.id)}
                          className="w-4 h-4 accent-teal-600 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
                isLight ? 'border-slate-200' : 'border-[#144052]'
              }`}>
                <button type="button" onClick={() => setShowCreateModal(false)} className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
                  isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-200'
                }`}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#005f73] to-[#0a9396] hover:from-[#0a9396] hover:to-[#94d2bd] font-bold text-white shadow-lg cursor-pointer">
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
