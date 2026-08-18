import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Database, 
  Save, 
  X, 
  RefreshCw, 
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
  onTestConnection: (url: string) => Promise<boolean>;
}

export const APPS_SCRIPT_CODE = `// ========================================================
// GOOGLE APPS SCRIPT CHO SƠ ĐỒ CHỖ NGỒI LỚP 11A8
// Hướng dẫn: Dán mã này vào Tiện ích mở rộng -> Apps Script trong Google Sheet
// ========================================================

function doGet(e) {
  // Đảm bảo không bị lỗi khi bấm nút Chạy thủ công
  e = e || { parameter: {} };
  var params = e.parameter || {};
  var action = params.action || 'get_state';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ClassroomData');
  
  if (!sheet) {
    sheet = ss.insertSheet('ClassroomData');
    sheet.getRange('A1:C1').setValues([['Key', 'Value', 'Updated_At']]);
    sheet.getRange('A2:C2').setValues([['classroom_state', JSON.stringify({
      isLocked: false,
      assignments: {},
      lastUpdated: new Date().toISOString()
    }), new Date().toISOString()]]);
  }
  
  if (action === 'get_state') {
    var raw = sheet.getRange('B2').getValue();
    var data = {};
    try {
      data = JSON.parse(raw);
    } catch(err) {
      data = { isLocked: false, assignments: {}, lastUpdated: new Date().toISOString() };
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'save_state') {
    var payloadStr = params.payload;
    if (payloadStr) {
      sheet.getRange('B2').setValue(payloadStr);
      sheet.getRange('C2').setValue(new Date().toISOString());
      
      try {
        updateHumanReadableSheet(ss, JSON.parse(payloadStr));
      } catch(err) {}
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Đã lưu vào Google Sheet thành công!'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Khởi tạo Google Sheet thành công!'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  e = e || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ClassroomData');
  
  if (!sheet) {
    sheet = ss.insertSheet('ClassroomData');
    sheet.getRange('A1:C1').setValues([['Key', 'Value', 'Updated_At']]);
    sheet.getRange('A2:C2').setValues([['classroom_state', '{}', new Date().toISOString()]]);
  }
  
  try {
    var contents = (e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var requestData = JSON.parse(contents);
    var payloadStr = JSON.stringify(requestData);
    sheet.getRange('B2').setValue(payloadStr);
    sheet.getRange('C2').setValue(new Date().toISOString());
    
    updateHumanReadableSheet(ss, requestData);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: requestData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateHumanReadableSheet(ss, state) {
  try {
    var sheet = ss.getSheetByName('DanhSachChoNgoi');
    if (!sheet) {
      sheet = ss.insertSheet('DanhSachChoNgoi');
    }
    sheet.clear();
    sheet.getRange('A1:D1').setValues([['Vị trí ghế (Seat ID)', 'Mã Học Sinh', 'Trạng thái', 'Thời gian lưu']]);
    sheet.getRange('A1:D1').setFontWeight('bold').setBackground('#d1fae5');
    
    var rows = [];
    var assignments = state.assignments || {};
    for (var seatId in assignments) {
      rows.push([seatId, assignments[seatId], 'Đã chọn', state.lastUpdated || new Date().toISOString()]);
    }
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    }
  } catch(e) {}
}

// Thầy có thể chọn hàm này và bấm nút "Chạy" (Run) để kiểm tra thử nghiệm trực tiếp:
function testInitialSetup() {
  var result = doGet({ parameter: { action: 'get_state' } });
  Logger.log('Kết quả kiểm tra: ' + result.getContent());
}
`;

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  currentScriptUrl,
  onSaveScriptUrl,
  onTestConnection,
}) => {
  const [scriptUrl, setScriptUrl] = useState(currentScriptUrl);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTest = async () => {
    if (!scriptUrl.trim()) {
      setTestResult({ success: false, message: 'Vui lòng nhập đường link Web App!' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await onTestConnection(scriptUrl.trim());
      if (ok) {
        setTestResult({ success: true, message: 'Kết nối Google Sheet thành công! Dữ liệu đã đồng bộ.' });
      } else {
        setTestResult({ success: false, message: 'Không thể kết nối. Hãy kiểm tra quyền "Ai cũng có thể truy cập (Anyone)" khi triển khai Web App!' });
      }
    } catch {
      setTestResult({ success: false, message: 'Lỗi khi kiểm tra kết nối.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveScriptUrl(scriptUrl.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-['Outfit',sans-serif]">
                Kết Nối Google Sheets Làm Database
              </h2>
              <p className="text-xs text-emerald-100">
                Đồng bộ dữ liệu thời gian thực giữa tất cả máy tính và điện thoại học sinh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Step 1: Input URL */}
          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
            <label className="block font-bold text-slate-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-700" />
              <span>Dán đường link Web App Google Apps Script vào đây:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={scriptUrl}
                onChange={(e) => {
                  setScriptUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Đang thử...' : 'Kiểm tra'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg font-medium text-xs ${
                  testResult.success
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>

          {/* Step 2: 3-step Instructions */}
          <div className="space-y-2.5 text-slate-700">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>3 Bước thiết lập Google Sheet cực nhanh (1 phút):</span>
            </h3>

            <ol className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
              <li>
                Tạo 1 trang tính <strong>Google Sheet mới</strong> tại <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a>.
              </li>
              <li>
                Trên thanh menu Google Sheet: Vào <strong>Tiện ích mở rộng (Extensions) ➔ Apps Script</strong>.
              </li>
              <li>
                Xóa hết mã cũ trong ô soạn thảo, bấm nút <strong>Sao chép mã bên dưới</strong> rồi <strong>Dán vào</strong>:
              </li>
            </ol>
          </div>

          {/* Script Code Snippet */}
          <div className="relative border border-slate-300 rounded-xl bg-slate-900 text-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 text-[11px] font-mono text-slate-300">
              <span>Code.gs (Đã cập nhật chống lỗi)</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold transition-all text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono overflow-x-auto max-h-48 text-emerald-300">
              {APPS_SCRIPT_CODE}
            </pre>
          </div>

          {/* Deployment Step Note */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
            <div className="font-bold">⚠️ Bước quan trọng nhất khi Triển khai (Deploy):</div>
            <p>
              Trong Apps Script, bấm <strong>Triển khai (Deploy) ➔ Tùy chọn triển khai mới (New deployment)</strong> ➔ Chọn loại <strong>Ứng dụng web (Web app)</strong> ➔ Mục <strong>Người có quyền truy cập (Who has access)</strong> chọn bắt buộc là <strong>Bất kỳ ai (Anyone)</strong> ➔ Bấm Triển khai ➔ Sao chép đường link <strong>URL của ứng dụng web</strong> dán vào ô bên trên!
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Lưu & Kích Hoạt Database</span>
          </button>
        </div>

      </div>
    </div>
  );
};
