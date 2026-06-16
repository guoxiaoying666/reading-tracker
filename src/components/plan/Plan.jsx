import { useState } from 'react';
import { DIMENSIONS } from '../../data/framework';

// 理论来源（含中文替代链接）
const THEORY_REF = [
  {
    name: 'IB MYP（国际文凭中学项目）',
    org: '国际文凭组织 IBO',
    url: 'https://www.ibo.org/cn/programmes/middle-years-programme/',
    refUrl: 'https://www.ibo.org/globalassets/new-structure/brochures-and-infographics/pdfs/myp-brochure-cn-final_hr_web.pdf',
    refLabel: '中文手册 PDF',
    usage: '七大维度均衡分布逻辑、知识论贯穿方式',
  },
  {
    name: 'GB/T 13745-2009 学科分类',
    org: '国家技术监督局',
    url: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=4B3E3D4D3E7A1B6F1C9E8A1D3E4F7B8C',
    usage: '二级学科划分参考',
  },
  {
    name: '义务教育课程方案（2022版）',
    org: '中华人民共和国教育部',
    url: 'https://www.gov.cn/zhengce/zhengceku/2022-04/21/content_5686535.htm',
    usage: '中国史、语文、艺术内容深度参考',
  },
  {
    name: '北师大 5C 核心素养模型（2018）',
    org: '北京师范大学中国教育创新研究院',
    url: 'https://chinaiid.bnu.edu.cn/',
    refUrl: 'https://news.bnu.edu.cn/zx/xzdt/118137.htm',
    refLabel: '研究报告',
    usage: '能力副轴标注，不驱动选书',
  },
  {
    name: '让·皮亚杰认知发展理论',
    org: 'Jean Piaget',
    url: 'https://baike.baidu.com/item/%E8%AE%A4%E7%9F%A5%E5%8F%91%E5%B1%95%E7%90%86%E8%AE%BA/7876079',
    usage: '儿童认知发展阶段参考',
  },
  {
    name: '丹妈读童书 + 小花生网',
    org: '自媒体阅读博主',
    url: '',
    usage: '文学体裁题材拆分、虚构/非虚构二分法参考',
  },
];

const C5_MAP = {
  culture: { label: '文化理解与传承', color: '#8C7DA8' },
  critical: { label: '审辨思维', color: '#C47A6E' },
  creativity: { label: '创新', color: '#E8B44F' },
  communication: { label: '沟通', color: '#6B8CA0' },
  collaboration: { label: '合作', color: '#6F9177' },
};

// 树节点：一个二级分类可展开到三级
function TreeNode({ l2, dimKey, depth }) {
  const [open, setOpen] = useState(false);
  const hasChildren = l2.children && l2.children.length > 0;

  return (
    <div className="mm-node">
      <div
        className="mm-l2"
        onClick={() => hasChildren && setOpen(!open)}
        style={{ cursor: hasChildren ? 'pointer' : 'default', paddingLeft: depth * 16 }}
      >
        {hasChildren ? (
          <span className="mm-arrow">{open ? '▾' : '▸'}</span>
        ) : (
          <span className="mm-arrow" style={{ visibility: 'hidden' }}>▸</span>
        )}
        <span className="mm-l2-label">{l2.label}</span>
        {!hasChildren && <span className="mm-empty-hint">（无细分）</span>}
      </div>
      {open && hasChildren && (
        <div className="mm-l3-wrap">
          {l2.children.map((l3, i) => (
            <div key={i} className="mm-l3" style={{ paddingLeft: depth * 16 + 24 }}>
              <span className="mm-dot" />
              {l3}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Plan() {
  const [expandedDim, setExpandedDim] = useState(null);

  return (
    <div>
      <h2 className="section-title">📐 青少年阅读成长体系</h2>

      {/* 七大维度思维导图 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {DIMENSIONS.map(dim => {
          const isExpanded = expandedDim === dim.key;
          return (
            <div key={dim.key} className="mm-dim"
              style={{
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.15s',
              }}
            >
              {/* 维度标题行 */}
              <div
                className="mm-dim-header"
                onClick={() => setExpandedDim(isExpanded ? null : dim.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px', cursor: 'pointer',
                  background: isExpanded ? `${dim.color}06` : 'transparent',
                  borderLeft: `3px solid ${dim.color}`,
                }}
              >
                <span style={{ fontSize: 20 }}>{dim.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                    {dim.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span>📐 参考比例 {dim.pct}%</span>
                    {dim.c5 && dim.c5.map(c => (
                      <span key={c} style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 4,
                        background: `${C5_MAP[c].color}18`,
                        color: C5_MAP[c].color,
                        fontWeight: 600,
                      }}>
                        {C5_MAP[c].label}
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink3)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </span>
              </div>

              {/* 展开的树形二级三级 */}
              {isExpanded && (
                <div className="mm-tree" style={{ padding: '0 16px 12px 16px' }}>
                  {dim.children.map((l2, i) => (
                    <TreeNode key={l2.key} l2={l2} dimKey={dim.key} depth={1} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 体系说明 */}
      <div className="card" style={{ fontSize: 12, lineHeight: 2 }}>
        <p style={{ color: '#5C5244', marginBottom: 6, fontSize: 13 }}>
          本体系以<strong style={{ color: '#C8815C' }}>IB MYP 七大维度</strong>为骨架，
          以<strong style={{ color: '#C8815C' }}>孩子认识世界的视角</strong>构建分类。
          二级参考<strong style={{ color: '#C8815C' }}>中国学科分类国标 (GB/T 13745-2009)</strong>，
          文学体裁题材参考丹妈读童书及小花生网分类法，
          能力标注参考<strong style={{ color: '#C8815C' }}>北师大 5C 模型</strong>。
        </p>
        <p style={{ color: '#9B9082', fontSize: 12, marginBottom: 10, lineHeight: 1.6 }}>
          各维度参考比例基于开卷图书零售市场少儿品类数据标定，反映当前童书供给结构，作为均衡阅读的参照坐标，非硬性指标。
        </p>
        <div className="theory-links">
          {THEORY_REF.map((t, i) => (
            <div key={i} className="theory-card"
              onClick={() => t.url && window.open(t.url, '_blank')}
              style={{
                marginBottom: 8, padding: '10px 14px',
                borderRadius: 8, border: '1px solid #E8E2D8',
                cursor: t.url ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <strong style={{ color: '#6B8CA0', fontSize: 12.5 }}>{t.name}</strong>
                {t.url && (
                  <span style={{ fontSize: 12, color: '#C4BBAE', flexShrink: 0 }}>›</span>
                )}
              </div>
              <div style={{ color: '#9B9082', fontSize: 11, marginTop: 2 }}>
                {t.org} · {t.usage}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#C4BBAE', lineHeight: 1.8 }}>
        IB MYP · GB/T 13745-2009 · 2022 义务教育课标 · 北师大 5C<br />
        版本：v1.6 · 七大维度
      </div>
    </div>
  );
}
