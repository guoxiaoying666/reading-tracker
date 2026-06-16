import { useReading } from '../../context/ReadingContext';

const TABS = [
  { key: 'bookshelf', label: '📚 书架' },
  { key: 'record', label: '✍️ 记录' },
  { key: 'discovery', label: '💭 说说' },
  { key: 'plan', label: '📐 体系' },
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
