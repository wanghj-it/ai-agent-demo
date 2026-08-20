// Planner - Task decomposition and progress tracking
const Planner = (() => {
  let tasks = [];
  let currentIdx = -1;

  function init() { tasks = []; currentIdx = -1; }

  function decompose(msg) {
    const complex = msg.length > 80 || /首先|然后|步骤|计划|第[一二三四五六七八九\d]+步/.test(msg);
    if (!complex) {
      tasks = [{ id: 1, title: msg.slice(0, 60), status: 'pending' }];
      return tasks;
    }
    const lines = msg.split(/[。\n；;]/).filter(s => s.trim());
    if (lines.length <= 1) {
      tasks = [{ id: 1, title: msg.slice(0, 60), status: 'pending' }];
    } else {
      tasks = lines.map((l, i) => {
        const m = l.trim().match(/^第?[一二三四五六七八九\d]+[步、.，,)]\s*(.+)/);
        return { id: i + 1, title: (m ? m[1] : l).trim().slice(0, 80), status: 'pending' };
      });
    }
    currentIdx = -1;
    return tasks;
  }

  function next() {
    const t = tasks.find(t => t.status === 'pending');
    if (!t) return null;
    t.status = 'in_progress';
    t.startTime = Date.now();
    currentIdx = tasks.indexOf(t);
    return t;
  }

  function complete(result) {
    if (currentIdx >= 0 && currentIdx < tasks.length) {
      tasks[currentIdx].status = 'completed';
      tasks[currentIdx].result = result;
    }
    return next();
  }

  function fail(err) {
    if (currentIdx >= 0 && currentIdx < tasks.length) {
      tasks[currentIdx].status = 'failed';
      tasks[currentIdx].error = err;
    }
  }

  function progress() {
    const done = tasks.filter(t => t.status === 'completed').length;
    return { completed: done, total: tasks.length, tasks: [...tasks] };
  }

  function allDone() { return tasks.every(t => t.status === 'completed' || t.status === 'failed'); }
  function hasPending() { return tasks.some(t => t.status === 'pending'); }
  function current() { return currentIdx >= 0 ? tasks[currentIdx] : null; }

  return { init, decompose, next, complete, fail, progress, allDone, hasPending, current };
})();