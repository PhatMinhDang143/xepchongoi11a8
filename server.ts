import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { ADMIN_TEACHER_PASSWORD, INITIAL_STUDENTS_LIST, DEFAULT_LAYOUT_CONFIG, CLASS_INFO } from './src/data/students';

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent state file path
const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'classroom_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ClassroomState {
  className: string;
  teacherName: string;
  schoolYear: string;
  layoutConfig: typeof DEFAULT_LAYOUT_CONFIG;
  perspective: 'from-teacher' | 'from-students';
  isLocked: boolean;
  assignments: Record<string, string>; // seatId -> studentId
  lastUpdated: string;
}

// Initial state
const defaultState: ClassroomState = {
  className: CLASS_INFO.className,
  teacherName: CLASS_INFO.teacherName,
  schoolYear: CLASS_INFO.schoolYear,
  layoutConfig: DEFAULT_LAYOUT_CONFIG,
  perspective: 'from-students',
  isLocked: false,
  assignments: {},
  lastUpdated: new Date().toISOString(),
};

// Load saved state or create default
function loadState(): ClassroomState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...defaultState,
        ...parsed,
        assignments: parsed.assignments || {},
      };
    }
  } catch (err) {
    console.error('Error reading state file:', err);
  }
  return { ...defaultState };
}

let currentState: ClassroomState = loadState();

function saveState() {
  try {
    currentState.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(currentState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving state file:', err);
  }
}

// Real-time SSE Clients list
const sseClients = new Set<Response>();

function broadcastStateUpdate() {
  const data = JSON.stringify(currentState);
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  });
}

// ---------------- API ROUTES ----------------

// 1. Get current classroom state
app.get('/api/classroom', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: currentState,
  });
});

// 2. Real-time Server-Sent Events (SSE) Stream
app.get('/api/classroom/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial data
  res.write(`data: ${JSON.stringify(currentState)}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 3. Student assigns themselves to a seat (Atomic & Concurrency-safe)
app.post('/api/classroom/assign', (req: Request, res: Response) => {
  const { seatId, studentId, studentPassword } = req.body;

  if (currentState.isLocked) {
    return res.status(403).json({
      success: false,
      message: 'Sơ đồ lớp đã bị khóa bởi Giáo viên Chủ nhiệm.',
    });
  }

  // Validate student identity & password
  const student = INITIAL_STUDENTS_LIST.find((s) => s.id === studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông tin học sinh trong danh sách lớp.',
    });
  }

  const cleanPass = String(studentPassword || '').trim().replace(/\D/g, '');
  if (cleanPass !== student.password) {
    return res.status(401).json({
      success: false,
      message: 'Mật khẩu ngày tháng sinh không chính xác.',
    });
  }

  // Check if target seat is already taken by someone else
  const currentOccupant = currentState.assignments[seatId];
  if (currentOccupant && currentOccupant !== studentId) {
    const occupantStudent = INITIAL_STUDENTS_LIST.find((s) => s.id === currentOccupant);
    return res.status(409).json({
      success: false,
      message: `Ghế này vừa được bạn ${occupantStudent?.name || 'khác'} chọn trước đó một tích tắc! Vui lòng chọn ghế trống khác.`,
      data: currentState,
    });
  }

  // If student already occupies another seat, free the old seat
  const newAssignments = { ...currentState.assignments };
  for (const [sId, studId] of Object.entries(newAssignments)) {
    if (studId === studentId) {
      delete newAssignments[sId];
    }
  }

  // Assign to new seat
  newAssignments[seatId] = studentId;
  currentState.assignments = newAssignments;
  saveState();
  broadcastStateUpdate();

  return res.json({
    success: true,
    message: `Đã xếp chỗ cho bạn ${student.name} thành công!`,
    data: currentState,
  });
});

// 4. Student unassigns themselves from current seat
app.post('/api/classroom/unassign', (req: Request, res: Response) => {
  const { studentId, studentPassword } = req.body;

  if (currentState.isLocked) {
    return res.status(403).json({
      success: false,
      message: 'Sơ đồ lớp đã bị khóa bởi Giáo viên Chủ nhiệm.',
    });
  }

  const student = INITIAL_STUDENTS_LIST.find((s) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh.' });
  }

  const cleanPass = String(studentPassword || '').trim().replace(/\D/g, '');
  if (cleanPass !== student.password) {
    return res.status(401).json({ success: false, message: 'Mật khẩu không đúng.' });
  }

  const newAssignments = { ...currentState.assignments };
  let removed = false;
  for (const [sId, studId] of Object.entries(newAssignments)) {
    if (studId === studentId) {
      delete newAssignments[sId];
      removed = true;
    }
  }

  if (removed) {
    currentState.assignments = newAssignments;
    saveState();
    broadcastStateUpdate();
  }

  return res.json({
    success: true,
    message: 'Đã hủy chỗ ngồi thành công.',
    data: currentState,
  });
});

// 5. Admin (Teacher) operations
app.post('/api/classroom/admin', (req: Request, res: Response) => {
  const { action, password, payload } = req.body;

  if (password !== ADMIN_TEACHER_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: 'Mật khẩu quản trị không chính xác!',
    });
  }

  if (action === 'toggle_lock') {
    currentState.isLocked = !currentState.isLocked;
  } else if (action === 'set_locked') {
    currentState.isLocked = Boolean(payload?.locked);
  } else if (action === 'reset_assignments') {
    currentState.assignments = {};
  } else if (action === 'set_assignments') {
    if (payload?.assignments) {
      currentState.assignments = payload.assignments;
    }
  } else if (action === 'set_perspective') {
    if (payload?.perspective) {
      currentState.perspective = payload.perspective;
    }
  } else if (action === 'admin_assign') {
    const { seatId, studentId } = payload || {};
    const newAssignments = { ...currentState.assignments };
    if (studentId) {
      for (const [sId, studId] of Object.entries(newAssignments)) {
        if (studId === studentId) delete newAssignments[sId];
      }
      if (seatId) newAssignments[seatId] = studentId;
    } else if (seatId) {
      delete newAssignments[seatId];
    }
    currentState.assignments = newAssignments;
  }

  saveState();
  broadcastStateUpdate();

  return res.json({
    success: true,
    message: 'Thực hiện thao tác quản trị thành công!',
    data: currentState,
  });
});

// ---------------- VITE MIDDLEWARE / STATIC SERVING ----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Classroom Server running on port ${PORT}`);
  });
}

startServer();
