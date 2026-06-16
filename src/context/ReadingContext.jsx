import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import sampleBooks from '../data/sampleBooks';
import { deleteImage } from '../utils/imageDB';

const ReadingContext = createContext(null);

const STORAGE_KEY = 'reading-tracker-books';
const TAB_KEY = 'reading-tracker-tab';
const DATA_VERSION = 'v11-dim7';  // v11: 7维度（文学/艺术拆分），升级强制刷新客户端缓存

export function ReadingProvider({ children }) {
  const [books, setBooks] = useState(() => {
    try {
      const versionKey = STORAGE_KEY + '-version';
      const savedVersion = localStorage.getItem(versionKey);
      if (savedVersion === DATA_VERSION) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) return parsed;
        }
      }
      // 版本不匹配或数据损坏，强制使用新数据
      localStorage.setItem(versionKey, DATA_VERSION);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleBooks));
    } catch (e) {
      console.warn('localStorage 数据损坏，使用示例数据');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleBooks));
    }
    return sampleBooks;
  });

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(TAB_KEY) || 'bookshelf';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }, [books]);

  // 清除旧版本缓存
  useEffect(() => {
    for (let i = 1; i <= 6; i++) {
      localStorage.removeItem(`reading-tracker-v${i}-books`);
      localStorage.removeItem(`reading-tracker-v${i}-tab`);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TAB_KEY, activeTab);
  }, [activeTab]);

  const addBook = useCallback((bookData) => {
    const newBook = {
      ...bookData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setBooks(prev => [newBook, ...prev]);
    return newBook;
  }, []);

  const updateBook = useCallback((id, bookData) => {
    setBooks(prev => prev.map(b => (b.id === id ? { ...b, ...bookData } : b)));
  }, []);

  const deleteBook = useCallback((id) => {
    setBooks(prev => {
      const book = prev.find(b => b.id === id);
      if (book?.imageId) deleteImage(book.imageId).catch(() => {});
      return prev.filter(b => b.id !== id);
    });
  }, []);

  const resetData = useCallback(() => {
    setBooks(sampleBooks);
  }, []);

  // 导出数据
  const exportData = useCallback(() => {
    const data = JSON.stringify(books, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reading-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [books]);

  const value = {
    books,
    activeTab,
    setActiveTab,
    addBook,
    updateBook,
    deleteBook,
    resetData,
    exportData,
  };

  return (
    <ReadingContext.Provider value={value}>
      {children}
    </ReadingContext.Provider>
  );
}

export function useReading() {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error('useReading must be used within ReadingProvider');
  return ctx;
}
