import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { VocabListPreview } from './components/VocabListPreview';
import { AnkiGuideModal } from './components/AnkiGuideModal';
import { VocabItem, VocabItemRaw } from './types';
import { generateVocabFromGemini } from './services/geminiService';
import { AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'anki_vocab_generated_items';

export default function App() {
  const [items, setItems] = useState<VocabItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved items:', e);
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Save items to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items to local storage:', e);
    }
  }, [items]);

  const handleGenerate = async (words: string[]) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessToast(null);

    try {
      const rawItems: VocabItemRaw[] = await generateVocabFromGemini(words);

      if (!rawItems || rawItems.length === 0) {
        throw new Error('Không nhận được dữ liệu từ vựng từ Gemini AI.');
      }

      // Map raw items to VocabItem with unique IDs
      const newVocabItems: VocabItem[] = rawItems.map((raw, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        word: raw.word || words[idx] || 'Word',
        partOfSpeech: raw.partOfSpeech || '',
        ipa: raw.ipa || '',
        nghiaChinh: raw.nghiaChinh || '',
        nghiaPhu: raw.nghiaPhu || '',
        dongNghia: raw.dongNghia || '',
        traiNghia: raw.traiNghia || '',
        tuLoaiKhac: raw.tuLoaiKhac || '',
        gioiTu: raw.gioiTu || '',
        collocations: raw.collocations || '',
        viDu: raw.viDu || [],
      }));

      // Merge or set new items
      setItems(newVocabItems);
      setSuccessToast(`Đã tạo thành công ${newVocabItems.length} thẻ từ vựng Anki!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Generate error:', err);
      setErrorMsg(err.message || 'Không thể kết nối với máy chủ AI. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = (updated: VocabItem) => {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả thẻ đã tạo không?')) {
      setItems([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F3] text-[#4A4A4A] flex flex-col font-sans antialiased">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs sm:text-sm shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block text-red-900">Lỗi khi tạo từ vựng:</strong>
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-800 text-xs font-bold px-1.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="p-4 bg-[#F0F2EF] border border-[#82937A]/30 rounded-2xl flex items-center gap-3 text-[#3D4439] text-xs sm:text-sm shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-[#82937A] shrink-0" />
            <div className="flex-1 font-medium">{successToast}</div>
          </div>
        )}

        {/* Word Input Section */}
        <InputSection onGenerate={handleGenerate} isLoading={isLoading} />

        {/* Generated Cards Preview and Export Section */}
        <VocabListPreview
          items={items}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onClearAll={handleClearAll}
          onOpenGuide={() => setShowGuide(true)}
        />
      </main>

      {/* Guide Modal */}
      {showGuide && <AnkiGuideModal onClose={() => setShowGuide(false)} />}

      {/* Footer */}
      <footer className="bg-white border-t border-[#E8E6D9] py-6 text-center text-xs text-[#7A7A6A]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#82937A]" />
            <span>Anki Vocab Generator - Xuất file Excel (.xlsx) 2 cột chuẩn HTML &lt;br&gt;</span>
          </div>
          <p className="text-[#9A9A8C] text-[11px]">Dành cho việc học từ vựng Anki dễ dàng và chính xác</p>
        </div>
      </footer>
    </div>
  );
}
