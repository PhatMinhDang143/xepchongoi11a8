import React, { useState } from 'react';
import { ClassroomState } from '../types';
import { exportStateToJson } from '../utils/storage';
import { 
  X, 
  Github, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  Check, 
  Copy, 
  Code2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

interface GithubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: ClassroomState;
  onImportState: (newState: ClassroomState) => void;
}

export const GithubSyncModal: React.FC<GithubSyncModalProps> = ({
  isOpen,
  onClose,
  state,
  onImportState,
}) => {
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleFetchFromGithub = async () => {
    if (!githubUrl.trim()) {
      setSyncStatus({ type: 'error', message: 'Vui lòng nhập đường dẫn URL Raw của tệp JSON trên GitHub' });
      return;
    }

    setLoading(true);
    setSyncStatus(null);

    try {
      // Normalize github url if user gave standard github blob url
      let fetchUrl = githubUrl.trim();
      if (fetchUrl.includes('github.com') && fetchUrl.includes('/blob/')) {
        fetchUrl = fetchUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const data = await res.json();
      if (data && data.assignments) {
        onImportState(data);
        setSyncStatus({ type: 'success', message: 'Đồng bộ thành công dữ liệu từ GitHub!' });
      } else {
        throw new Error('Dữ liệu JSON tải về không đúng cấu trúc sơ đồ lớp học.');
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        message: `Không thể tải dữ liệu từ GitHub: ${err.message || 'Lỗi kết nối'}. Vui lòng kiểm tra lại URL công khai (Public Repo hoặc Raw URL).`
      });
    } finally {
      setLoading(false);
    }
  };

  const sampleJsonCode = JSON.stringify(
    {
      className: state.className,
      teacherName: state.teacherName,
      schoolYear: state.schoolYear,
      lastUpdated: state.lastUpdated,
      totalStudents: 45,
      assignments: state.assignments,
    },
    null,
    2
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleJsonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                Liên Kết & Đồng Bộ Với GitHub
              </h3>
              <p className="text-xs text-slate-400">
                Lưu trữ vị trí ngồi lớp 11A8 trên kho lưu trữ Git
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Step 1: Export seating-chart.json */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tải tệp dữ liệu seating-chart.json
                </h4>
              </div>
              <button
                type="button"
                onClick={() => exportStateToJson(state)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Tải về tệp .json
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có thể tải tệp JSON này rồi tạo tệp <code className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[11px]">seating-chart.json</code> trong kho lưu trữ GitHub của lớp 11A8.
            </p>
          </div>

          {/* Step 2: Fetch & Sync from GitHub Raw URL */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Đồng bộ trực tiếp từ GitHub URL
              </h4>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Dán đường dẫn tệp JSON từ GitHub hoặc GitHub Gist để nạp lại sơ đồ đã lưu:
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="https://raw.githubusercontent.com/user/repo/main/seating.json"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                disabled={loading}
                onClick={handleFetchFromGithub}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Đang nạp...' : 'Đồng bộ'}</span>
              </button>
            </div>

            {syncStatus && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
                  syncStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {syncStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{syncStatus.message}</span>
              </div>
            )}
          </div>

          {/* JSON Payload Preview */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-300 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-sans text-xs flex items-center gap-1.5 font-bold">
                <Code2 className="w-4 h-4 text-emerald-400" />
                Cấu trúc dữ liệu JSON lớp 11A8
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1 font-sans font-medium"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>
            <pre className="max-h-36 overflow-y-auto text-[11px] text-emerald-300/90 leading-tight">
              {sampleJsonCode}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
