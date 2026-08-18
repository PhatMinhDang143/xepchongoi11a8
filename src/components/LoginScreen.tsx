import React, { useState, useMemo } from 'react';
import { Student, CurrentUser } from '../types';
import { ADMIN_TEACHER_PASSWORD } from '../data/students';
import { 
  Users, 
  Search, 
  Check, 
  ShieldCheck, 
  User, 
  ArrowRight,
  GraduationCap,
  Sparkles,
  School,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Calendar
} from 'lucide-react';

interface LoginScreenProps {
  students: Student[];
  teacherName: string;
  className: string;
  schoolYear: string;
  onLogin: (user: CurrentUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  students,
  teacherName,
  className,
  schoolYear,
  onLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [searchName, setSearchName] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Student password (4-digit ddmm)
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentError, setStudentError] = useState('');

  // Teacher password
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [teacherError, setTeacherError] = useState('');

  // Filter students based on search input
  const filteredStudents = useMemo(() => {
    if (!searchName.trim()) return students;
    const query = searchName.toLowerCase().trim();
    return students.filter((s) => {
      return (
        s.name.toLowerCase().includes(query) ||
        s.orderNumber.toString() === query ||
        `#${s.orderNumber}` === query
      );
    });
  }, [students, searchName]);

  // Handle student login submit
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    const targetStudent = selectedStudent || (filteredStudents.length === 1 ? filteredStudents[0] : null);

    if (!targetStudent) {
      setStudentError('Vui lòng chọn họ và tên của bạn trong danh sách');
      return;
    }

    const cleanInputPass = studentPassword.trim().replace(/\D/g, ''); // strip any non-digit
    const expectedPass = targetStudent.password;

    if (cleanInputPass.length !== 4) {
      setStudentError('Mật khẩu phải gồm đúng 4 chữ số ngày và tháng sinh (Ví dụ: 1910)');
      return;
    }

    if (cleanInputPass !== expectedPass) {
      setStudentError(`Mật khẩu không đúng! Hãy nhập 4 số ngày tháng sinh của bạn (Ví dụ ngày 19 tháng 10 nhập: 1910)`);
      return;
    }

    // Success!
    onLogin({ role: 'student', student: targetStudent });
  };

  // Handle teacher login submit
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');

    if (!teacherPassword) {
      setTeacherError('Vui lòng nhập mật khẩu quản trị');
      return;
    }

    if (teacherPassword.trim() !== ADMIN_TEACHER_PASSWORD) {
      setTeacherError('Mật khẩu quản trị không chính xác!');
      return;
    }

    // Success!
    onLogin({ role: 'teacher', teacherName });
  };

  return (
    <div className="min-h-screen bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-['Be_Vietnam_Pro',sans-serif]">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white p-5 sm:p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center mb-3 shadow-inner border border-white/20">
            <School className="w-6 h-6 text-amber-200" />
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-200 border border-emerald-400/20 inline-block mb-1.5">
            Năm học {schoolYear}
          </span>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight font-['Outfit',sans-serif]">
            SƠ ĐỒ CHỖ NGỒI {className}
          </h1>
          <p className="text-xs text-emerald-100 mt-1">
            GVCN: <strong>{teacherName}</strong>
          </p>
        </div>

        {/* Role Tab Selector */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setStudentError('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'student'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Học Sinh Chọn Chỗ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('teacher');
              setTeacherError('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'teacher'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
            <span>Giáo Viên Quản Trị</span>
          </button>
        </div>

        {/* Student Login Form */}
        {activeTab === 'student' ? (
          <form onSubmit={handleStudentSubmit} className="p-4 sm:p-5">
            
            {/* Step 1: Chọn Họ và Tên */}
            <div className="mb-3 text-left">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                1. Họ và Tên của bạn:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => {
                    setSearchName(e.target.value);
                    setSelectedStudent(null);
                    setStudentError('');
                  }}
                  placeholder="Gõ tên bạn (Ví dụ: Duy Bảo, Vy, Khoa...)"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
                />
              </div>
            </div>

            {/* Scrollable Student List for Picking Name */}
            <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Chạm để chọn đúng tên bạn ({filteredStudents.length} bạn):</span>
            </div>
            
            <div className="overflow-y-auto max-h-36 space-y-1 border border-slate-200 rounded-xl p-1.5 bg-slate-50/60 mb-3.5">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Không tìm thấy tên "{searchName}".
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(student);
                        setSearchName(student.name);
                        setStudentError('');
                      }}
                      className={`w-full p-1.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white text-emerald-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {student.orderNumber}
                        </span>
                        <span className="truncate">{student.name}</span>
                      </div>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Step 2: Nhập Mật Khẩu (Ngày Tháng Sinh - 4 ký tự) */}
            <div className="mb-3 text-left">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Mật khẩu (4 số Ngày Tháng Sinh):</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Định dạng: NgàyTháng</span>
              </div>

              <div className="relative">
                <input
                  type={showStudentPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={studentPassword}
                  onChange={(e) => {
                    setStudentPassword(e.target.value);
                    setStudentError('');
                  }}
                  placeholder="Ví dụ: Sinh ngày 19/10 thì nhập 1910"
                  className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowStudentPassword(!showStudentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>Ví dụ: Ngày 08/02 nhập <strong>0802</strong>, Ngày 24/07 nhập <strong>2407</strong></span>
              </p>
            </div>

            {/* Error message */}
            {studentError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold mb-3 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{studentError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={(!selectedStudent && filteredStudents.length !== 1) || studentPassword.length !== 4}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Vào Chọn Chỗ Ngồi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Teacher Login Form */
          <form onSubmit={handleTeacherSubmit} className="p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 mb-0.5">
              Giáo Viên Chủ Nhiệm
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              <strong>{teacherName}</strong> - Quản trị và khóa sơ đồ
            </p>

            <div className="mb-4 text-left">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nhập mật khẩu quản trị:
              </label>
              <div className="relative">
                <input
                  type={showTeacherPassword ? 'text' : 'password'}
                  autoFocus
                  value={teacherPassword}
                  onChange={(e) => {
                    setTeacherPassword(e.target.value);
                    setTeacherError('');
                  }}
                  placeholder="Nhập mật khẩu quản trị..."
                  className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Teacher Error */}
            {teacherError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold mb-3 flex items-start gap-1.5 text-left">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{teacherError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Đăng Nhập Quản Trị</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
