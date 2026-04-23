import { AlertTriangle, ShieldAlert } from 'lucide-react';

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  const isDestructive = /(delete|incinerate|remove|permanently|critical|warning|pull back)/i.test(message);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-in-center animate-in zoom-in-95 duration-200">
        <div className={`p-6 border-b ${isDestructive ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isDestructive ? 'bg-red-100/50' : 'bg-indigo-100/50'}`}>
              {isDestructive ? <ShieldAlert className="w-6 h-6 text-red-600" /> : <AlertTriangle className="w-6 h-6 text-indigo-600" />}
            </div>
            <div>
              <h3 className={`text-lg font-black ${isDestructive ? 'text-red-900' : 'text-indigo-900'}`}>
                {isDestructive ? 'Critical Action' : 'Confirm Action'}
              </h3>
              <p className={`text-sm font-medium ${isDestructive ? 'text-red-700/80' : 'text-indigo-700/80'}`}>
                Please review carefully
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-slate-700 font-bold leading-relaxed">{message}</p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-sm transition-all active:scale-95 ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {isDestructive ? 'Acknowledge & Proceed' : 'Yes, continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
