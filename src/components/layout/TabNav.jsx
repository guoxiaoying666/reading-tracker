import { useReading } from '../../context/ReadingContext';

const TABS = [
  { key: 'home', label: '🏠 首页' },
  { key: 'bookshelf', label: '📚 书架' },
  { key: 'voice_record', label: '🎙️ 说说' },
  { key: 'diagnosis', label: '🧠 阅读洞察' },
];

export default function TabNav() {
  const { activeTab, setActiveTab } = useReading();

  return (
    <nav className="tab-nav">
      {TABS.map(tab => (
        <button
          key={tab.key}
          className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
