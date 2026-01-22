/**
 * Calendar helper utilities for training diary
 */

/**
 * Aggregate logs by day for a specific month
 * @param {Array} logs - All workout logs
 * @param {number} month - Month (0-11)
 * @param {number} year - Full year
 * @returns {Map} Map where key is date string (YYYY-MM-DD) and value is DayData
 */
export function aggregateLogsByDay(logs, month, year) {
  const dayMap = new Map();

  if (!logs || logs.length === 0) {
    return dayMap;
  }

  // Filter logs for the specified month
  const monthLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate.getMonth() === month && logDate.getFullYear() === year;
  });

  // Group by date
  monthLogs.forEach(log => {
    const date = new Date(log.date);
    const dateKey = formatDateKey(date);

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date: dateKey,
        logs: [],
        totalVolume: 0,
        exerciseCount: 0,
        hasPB: false,
        hasWorkouts: false,
        mood: null,
        energyLevel: null,
        notes: null,
        isRestDay: false,
      });
    }

    const dayData = dayMap.get(dateKey);
    dayData.logs.push(log);

    const volume = (log.weight || 0) * (log.reps || 0);
    dayData.totalVolume += volume;
    dayData.exerciseCount += 1;

    if (log.isPB) {
      dayData.hasPB = true;
    }
    dayData.hasWorkouts = true;

    // Store reflection data if present on any log
    if (log.dayNotes && !dayData.notes) {
      dayData.notes = log.dayNotes;
    }
    if (log.mood && !dayData.mood) {
      dayData.mood = log.mood;
    }
    if (log.energyLevel && !dayData.energyLevel) {
      dayData.energyLevel = log.energyLevel;
    }
    if (log.restDay) {
      dayData.isRestDay = true;
    }
  });

  return dayMap;
}

/**
 * Get calendar month grid with padding days
 * @param {number} year - Full year
 * @param {number} month - Month (0-11)
 * @returns {Array} Array of day objects (35-42 days)
 */
export function getCalendarMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Get day of week for first day (0 = Sunday)
  const firstDayOfWeek = firstDay.getDay();

  // Calculate total cells needed (always show 6 weeks for consistency)
  const totalCells = 42; // 7 columns × 6 rows

  const calendar = [];

  // Add padding days from previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calendar.push({
      date: new Date(prevYear, prevMonth, prevMonthLastDay - i),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Add days of current month
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    calendar.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
    });
  }

  // Add padding days from next month
  const remainingCells = totalCells - calendar.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  for (let day = 1; day <= remainingCells; day++) {
    calendar.push({
      date: new Date(nextYear, nextMonth, day),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return calendar;
}

/**
 * Get day data for a specific date
 * @param {Date|string} date - Date or date string
 * @param {Map} dayMap - Map from aggregateLogsByDay
 * @returns {Object|null} Day data or null if no data
 */
export function getDayData(date, dayMap) {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateKey = formatDateKey(dateObj);
  return dayMap.get(dateKey) || null;
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same day
 */
export function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Calculate stats for a single day's logs
 * @param {Array} dayLogs - Logs for a single day
 * @returns {Object} Stats object
 */
export function calculateDayStats(dayLogs) {
  if (!dayLogs || dayLogs.length === 0) {
    return {
      totalVolume: 0,
      exerciseCount: 0,
      hasPB: false,
      exercises: [],
    };
  }

  const totalVolume = dayLogs.reduce((sum, log) => {
    return sum + (log.weight || 0) * (log.reps || 0);
  }, 0);

  const exercises = dayLogs.map(log => ({
    id: log.id,
    exercise: log.exercise,
    reps: log.reps,
    weight: log.weight,
    volume: (log.weight || 0) * (log.reps || 0),
    isPB: log.isPB || false,
    pbNote: log.pbNote || null,
  }));

  return {
    totalVolume,
    exerciseCount: dayLogs.length,
    hasPB: dayLogs.some(log => log.isPB),
    exercises,
  };
}

/**
 * Get mood emoji for display
 * @param {string} mood - Mood value
 * @returns {string} Emoji
 */
export function getMoodEmoji(mood) {
  const moodMap = {
    great: '🔥',
    good: '😊',
    neutral: '😐',
    tired: '😫',
    exhausted: '😴',
  };
  return moodMap[mood] || '😐';
}

/**
 * Format date for display (e.g., "Jan 15, 2026")
 * @param {Date|string} date - Date
 * @returns {string} Formatted date
 */
export function formatDisplayDate(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
}

/**
 * Get relative date string (Today, Yesterday, etc.)
 * @param {Date|string} date - Date
 * @returns {string} Relative date string
 */
export function getRelativeDate(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(dateObj, today)) {
    return 'Today';
  }
  if (isSameDay(dateObj, yesterday)) {
    return 'Yesterday';
  }

  const diffDays = Math.ceil(Math.abs(today - dateObj) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return formatDisplayDate(dateObj);
}

/**
 * Detect if a log is a personal best based on exercise history
 * @param {Object} log - Current log
 * @param {Array} allLogs - All logs for this exercise
 * @returns {boolean} True if this is a PB
 */
export function detectPersonalBest(log, allLogs) {
  if (!log || !allLogs || allLogs.length === 0) return false;

  // Filter logs for the same exercise
  const exerciseLogs = allLogs.filter(l => l.exercise === log.exercise && l.id !== log.id);

  if (exerciseLogs.length === 0) {
    // First time doing this exercise - it's a PB!
    return true;
  }

  // Calculate volume for current log
  const currentVolume = (log.weight || 0) * (log.reps || 0);

  // Check if current volume is higher than all previous
  const maxPreviousVolume = Math.max(
    ...exerciseLogs.map(l => (l.weight || 0) * (l.reps || 0))
  );

  return currentVolume > maxPreviousVolume;
}
