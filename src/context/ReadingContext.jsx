import { createContext, useContext, useState, useEffect, useCallback, useRef} from 'react';
import { v4 as uuidv4 } from 'uuid';
import sampleBooks from '../data/sampleBooks';
import { deleteImage } from '../utils/imageDB';
import { syncBooks, fetchCloudBooks, deleteBookRemote } from '../supabase';

const ReadingContext = createContext(null);

const STORAGE_KEY = 'reading-tracker-books';
const TAB_KEY = 'reading-tracker-tab';
const CHILD_KEY = 'reading-tracker-child';
const MAP_KEY = 'wonderead-map-unlocked';
const DATA_VERSION = 'v20-wonderead';

export function ReadingProvider({ children, useSamples, userUuid }) {
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
      if (useSamples === false) {
        localStorage.setItem(versionKey, DATA_VERSION);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(versionKey, DATA_VERSION);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleBooks));
    } catch (e) {
      console.warn('localStorage 数据损坏');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(useSamples === false ? [] : sampleBooks));
    }
    return useSamples === false ? [] : sampleBooks;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(TAB_KEY);
    if (saved) return saved;
    return 'home'; // v2.0 默认首页
  });

  const [childSettings, setChildSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(CHILD_KEY);
      return saved ? JSON.parse(saved) : { name: '', age: '', grade: '' };
    } catch { return { name: '', age: '', grade: '' }; }
  });

  // ---- v2.0 引导/解锁状态 ----
  const [mapUnlocked, setMapUnlocked] = useState(() => {
    return localStorage.getItem(MAP_KEY) === 'true';
  });

  const [showTalent, setShowTalent] = useState(false);
  const [talentBook, setTalentBook] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // ---- 图书录入反馈弹窗状态 ----
  const [feedbackBook, setFeedbackBook] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // ref 跟踪 books 最新值，供 addBook 使用（addBook 不含 books 依赖以避免重渲染风暴）
  const booksRef = useRef(books);
  useEffect(() => { booksRef.current = books; }, [books]);

  // 持久化
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(books)); }, [books]);
  useEffect(() => { localStorage.setItem(CHILD_KEY, JSON.stringify(childSettings)); }, [childSettings]);
  useEffect(() => { localStorage.setItem(TAB_KEY, activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem(MAP_KEY, String(mapUnlocked)); }, [mapUnlocked]);

  // 清除旧版本缓存
  useEffect(() => {
    for (let i = 1; i <= 6; i++) {
      localStorage.removeItem(`reading-tracker-v${i}-books`);
      localStorage.removeItem(`reading-tracker-v${i}-tab`);
    }
  }, []);

  // ---- 新增书的回调 ----
  const addBook = useCallback((bookData) => {
    const newBook = {
      difficulty_avg: null, source_tag: '', is_foreign_classic: false,
      feedbackEmoji: '', reading_records: [],
      ...bookData,
      id: uuidv4(), createdAt: new Date().toISOString(),
    };
    const dimLabelMap = {
      narrative: '文学叙事', science: '自然科学', humanity: '人文社会',
      art_create: '艺术创想', self_growth: '自我成长',
    };

    // 在 setBooks 外部计算反馈数据，避免在 updater 中写 side effect
    const prevBooks = booksRef.current || [];
    const prevDims = new Set(prevBooks.filter(b => b.id).map(b => b.dimension).filter(Boolean));
    const newDimension = newBook.dimension && !prevDims.has(newBook.dimension)
      ? newBook.dimension : null;
    const feedbackInfo = {
      title: newBook.title,
      booksCount: prevBooks.length + 1,
      newDimension: newDimension ? dimLabelMap[newDimension] || newDimension : null,
    };

    setBooks(prev => {
      const updated = [newBook, ...prev];
      if (userUuid) {
        syncBooks(userUuid, updated).catch(e => console.warn('[sync] 同步失败:', e.message));
      }
      return updated;
    });

    setTimeout(() => {
      setFeedbackBook(feedbackInfo);
      setShowFeedback(true);
    }, 0);

    return newBook;
  }, [userUuid]);

  // 从云端拉取书目（用户登录后与本地数据合并）
  useEffect(() => {
    if (userUuid) {
      fetchCloudBooks(userUuid).then(cloudBooks => {
        if (cloudBooks.length > 0) {
          setBooks(prev => {
            const localMap = new Map(prev.map(b => [b.id, b]));
            let changed = false;
            const merged = [...prev];
            for (const cb of cloudBooks) {
              if (!localMap.has(cb.id)) {
                // 将 Supabase 字段名映射到前端字段
                merged.push({
                  id: cb.id,
                  title: cb.title,
                  author: cb.author || '',
                  translator: cb.translator || '',
                  month: cb.month || '',
                  source: cb.source || '',
                  language: cb.language || '中文',
                  classic: cb.classic || false,
                  fiction: cb.fiction || '虚构',
                  dimension: cb.dimension || 'narrative',
                  level2: cb.level2 || '',
                  level3: cb.level3 || '',
                  childStar: cb.childstar || 0,
                  note: cb.note || '',
                  isbn: cb.isbn || '',
                  createdAt: cb.created_at || new Date().toISOString(),
                  _cloud: true,
                });
                changed = true;
              }
            }
            if (changed) {
              console.log('[cloud] 合并了', cloudBooks.length, '本云端数据');
              return merged;
            }
            return prev;
          });
        } else {
          console.log('[cloud] 云端无数据，保留本地');
        }
      }).catch(e => console.warn('[cloud] 拉取失败:', e.message));
    }
  }, [userUuid]);

  // ---- 引导/弹窗操作 ----
  const dismissFeedback = useCallback(() => {
    setShowFeedback(false);
    setFeedbackBook(null);
  }, []);

  const dismissTalent = useCallback(() => { setShowTalent(false); setTalentBook(null); }, []);
  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
    setMapUnlocked(true);
    setActiveTab('home');
  }, []);

  const updateBook = useCallback((id, bookData) => {
    setBooks(prev => {
      const updated = prev.map(b => (b.id === id ? { ...b, ...bookData } : b));
      if (userUuid) {
        syncBooks(userUuid, updated).catch(e => console.warn('[sync] 更新同步失败:', e.message));
      }
      return updated;
    });
  }, [userUuid]);

  // 【已修复】删除书籍：本地立即移除 + 调用真正的服务端删除接口
  // 不再依赖"重新同步剩余列表"的方式模拟删除，避免退出重登后被云端数据"复活"
  const deleteBook = useCallback((id) => {
    setBooks(prev => {
      const book = prev.find(b => b.id === id);
      if (book?.imageId) deleteImage(book.imageId).catch(() => {});
      return prev.filter(b => b.id !== id);
    });
    if (userUuid) {
      deleteBookRemote(userUuid, id).catch(e => console.warn('[sync] 删除同步失败:', e.message));
    }
  }, [userUuid]);

  const resetData = useCallback(() => { setBooks(sampleBooks); }, []);

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
    books, activeTab, setActiveTab,
    addBook, updateBook, deleteBook, resetData, exportData,
    childSettings, setChildSettings,
    // 引导状态
    showTalent, talentBook, dismissTalent,
    showCelebration, dismissCelebration,
    mapUnlocked,
    // 录入反馈
    feedbackBook, showFeedback, dismissFeedback,
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
