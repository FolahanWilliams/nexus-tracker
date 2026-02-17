'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, TimelineEvent } from '@/store/useGameStore';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TimelinePage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const { timelineEvents, addTimelineEvent, deleteTimelineEvent } = useGameStore();

  const goToPrevMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventSubject, setNewEventSubject] = useState('Math');
  const [newEventStatus, setNewEventStatus] = useState<'Ready' | 'Not Ready' | 'Confident' | 'Getting There'>('Not Ready');

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim() || !newEventDate) return;

    const statusColorMap = {
      'Ready': 'blue' as const,
      'Not Ready': 'red' as const,
      'Confident': 'green' as const,
      'Getting There': 'orange' as const,
    };

    addTimelineEvent(
      newEventName,
      newEventDate,
      newEventSubject,
      newEventStatus,
      statusColorMap[newEventStatus]
    );

    setNewEventName('');
    setNewEventDate('');
    setNewEventSubject('Math');
    setNewEventStatus('Not Ready');
    setShowAddEvent(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day opacity-0" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear();

      // Check if any timeline event falls on this day
      const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasEvent = timelineEvents.some(e => e.date === dayStr);

      days.push(
        <motion.div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} relative`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {day}
          {hasEvent && (
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-purple)]" />
          )}
        </motion.div>
      );
    }

    return days;
  };

  const getStatusBadgeClass = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-[var(--color-badge-blue)] text-white';
      case 'green':
        return 'bg-[var(--color-badge-green)] text-white';
      case 'orange':
        return 'bg-[var(--color-badge-yellow)] text-white';
      case 'red':
        return 'bg-[var(--color-badge-red)] text-white';
      default:
        return 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]';
    }
  };

  const getSubjectBadgeClass = (subject: string) => {
    switch (subject) {
      case 'Math':
        return 'bg-[var(--color-badge-yellow)]/20 text-[var(--color-badge-yellow)]';
      case 'Science':
        return 'bg-[var(--color-badge-blue)]/20 text-[var(--color-badge-blue)]';
      case 'Humanities':
        return 'bg-[var(--color-badge-green)]/20 text-[var(--color-badge-green)]';
      case 'English':
        return 'bg-[var(--color-badge-yellow)]/20 text-[var(--color-badge-yellow)]';
      default:
        return 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]';
    }
  };

  return (
    <motion.div 
      className="min-h-screen pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Timeline</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Intro Text */}
        <motion.div 
          className="mb-8 border-l-4 border-[var(--color-purple)] pl-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[var(--color-purple)] italic font-medium">
            This is your master calendar and test tracker.
          </p>
        </motion.div>

        {/* Calendar Section */}
        <div className="mb-12">
          <motion.div 
            className="rpg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Calendar</h2>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded text-sm font-medium hover:bg-[var(--color-bg-hover)] transition-colors">
                    Week
                  </button>
                  <button className="px-3 py-1.5 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded text-sm font-medium hover:bg-[var(--color-bg-hover)] transition-colors">
                    Month
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevMonth}
                  className="p-1 hover:bg-[var(--color-bg-hover)] rounded transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={goToToday}
                  className="text-sm font-medium px-2 py-0.5 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-1 hover:bg-[var(--color-bg-hover)] rounded transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-[var(--color-text-secondary)] py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {renderCalendar()}
            </div>
          </motion.div>
        </div>

        {/* Upcoming Tests Section */}
        <div>
          <motion.div 
            className="rpg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Upcoming Tests</h2>
              <button
                onClick={() => setShowAddEvent(!showAddEvent)}
                className="px-3 py-1 bg-[var(--color-blue)] text-white rounded text-xs font-medium hover:bg-[var(--color-purple)] transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
                New
              </button>
            </div>

            <AnimatePresence>
              {showAddEvent && (
                <motion.form
                  onSubmit={handleAddEvent}
                  className="mb-6 p-4 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      placeholder="Test name"
                      className="input-field"
                    />
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="input-field"
                    />
                    <select
                      value={newEventSubject}
                      onChange={(e) => setNewEventSubject(e.target.value)}
                      className="input-field"
                    >
                      <option>Math</option>
                      <option>Science</option>
                      <option>English</option>
                      <option>Humanities</option>
                    </select>
                    <select
                      value={newEventStatus}
                      onChange={(e) => setNewEventStatus(e.target.value as 'Ready' | 'Not Ready' | 'Confident' | 'Getting There')}
                      className="input-field"
                    >
                      <option>Ready</option>
                      <option>Not Ready</option>
                      <option>Confident</option>
                      <option>Getting There</option>
                    </select>
                    <button type="submit" className="rpg-button w-full !bg-[var(--color-purple)] !text-white">
                      Add Event
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <AnimatePresence>
                {timelineEvents.map((test: TimelineEvent, index: number) => (
                  <motion.div
                    key={test.id}
                    className="flex items-center justify-between p-3 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--color-text-muted)]">📄</span>
                      <span className="font-medium">{test.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {new Date(test.date).toLocaleDateString()}
                      </span>
                      <span className={`rpg-badge ${getSubjectBadgeClass(test.subject)}`}>
                        {test.subject}
                      </span>
                      <span className={`rpg-badge ${getStatusBadgeClass(test.statusColor)}`}>
                        {test.status}
                      </span>
                      <button
                        onClick={() => deleteTimelineEvent(test.id)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {timelineEvents.length === 0 && (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">
                  No upcoming tests. Click &quot;New&quot; to add one!
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
