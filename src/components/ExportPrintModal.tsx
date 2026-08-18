import React, { useState } from 'react';
import { ClassroomState, Student } from '../types';
import { exportStateToJson, generateShareUrl } from '../utils/storage';
import { 
  X, 
  Printer, 
  Download, 
  Upload, 
  Share2, 
  Copy, 
  Check, 
  FileJson, 
  Github,
  Award
} from 'lucide-react';

interface ExportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: ClassroomState;
  students: Student[];
  onImportState: (newState: ClassroomState) => void;
}

export const ExportPrintModal: React.FC<ExportPrintModalProps> = ({
  isOpen,
  onClose,
  state,
  students,
  onImportState,
}) => {
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = generateShareUrl(state);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && parsed.assignments) {
          onImportState(parsed);
          setImportError(null);
          onClose();
        } else {
          setImportError('Tệp JSON không hợp lệ hoặc thiếu dữ liệu chỗ ngồi.');
        }
      } catch (err) {
        setImportError('Không thể đọc tệp JSON này. Vui lòng kiểm tra lại định dạng.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                In & Xuất Sơ Đồ Chỗ Ngồi Lớp 11A8
              </h3>
              <p className="text-xs text-slate-500">
                Lưu trữ, in ra giấy A4 hoặc chia sẻ cho cả lớp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Options */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Shareable Link Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-emerald-700" />
              1. Liên kết chia sẻ trực tuyến (Bao gồm dữ liệu chỗ đã chọn)
            </h4>
            <p className="text-xs text-emerald-800/80 mb-2.5">
              Sao chép liên kết này để gửi vào nhóm Zalo/Facebook lớp 11A8, học sinh mở ra sẽ thấy ngay sơ đồ hiện tại.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg text-slate-700 select-all font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Đã sao chép!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Sao chép link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Print Options */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-slate-700" />
                2. In sơ đồ ra giấy A4 / Lưu PDF
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Định dạng chuẩn để in treo tường lớp học 11A8 hoặc báo cáo GVCN Đặng Minh Phát.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> In sơ đồ
            </button>
          </div>

          {/* Backup & Export JSON */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <FileJson className="w-4 h-4 text-blue-600" />
              3. Tải tệp JSON dữ liệu (Dành cho GitHub / Sao lưu)
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Xuất tệp JSON để lưu vào máy hoặc cam kết (commit) lên kho lưu trữ GitHub của lớp.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => exportStateToJson(state)}
                className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Tải về JSON
              </button>

              <label className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4 text-slate-600" /> Nhập tệp JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>

            {importError && (
              <p className="text-xs text-rose-600 font-semibold mt-2">
                {importError}
              </p>
            )}
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
