# 好读·冷启动书单库

无需用户数据的系统推荐书单，来源包括官方书目、专业推荐、市场畅销榜。

## 架构

```
scripts/catalog/
├── schema.sql          # Supabase DDL（catalog_books 表）
├── spider.mjs          # 递归链接爬虫（白/黑名单 + 深度限制）
├── depth.js            # 深度层级判定引擎
├── db_catalog.js       # 目录库写入工具（去重合并）
├── seed_crawler.mjs    # 种子 URL 爬虫（公众号文章提取）
├── pipeline.mjs        # 主流水线（编排所有步骤）
└── README.md

api/recommend.mjs       # 推荐 API（权重排序 + 来源限额）

scripts/book_crawler/   # 原有爬虫框架（库依赖）
```

## 数据表：catalog_books

| 字段 | 类型 | 说明 |
|:--|:--|:--|
| `title` | text NOT NULL | 书名 |
| `author` | text | 作者 |
| `translator` | text | 译者 |
| `publisher` | text | 出版社 |
| `isbn` | text | ISBN |
| `age_min` / `age_max` | int | 适龄区间 |
| `dimension` | enum | 五维分类（中文） |
| `level2` | text | 二级分类 |
| `depth_level` | enum | 入门层/进阶层/鉴赏层 |
| `source_tag` | text[] | 来源标签数组（支持多来源合并） |
| `source_weight` | int | 最高来源权重 |
| `cover_url` / `description` | text | 封面/推荐语 |

## 来源权重与限额体系

| 层级 | 来源 | 权重 | 限额 |
|:--|:--|:--:|:--:|
| T1 官方基石 | 国家图书馆·四季童读 | 10 | ≤ 40% |
| T1 官方基石 | 亲近母语分级阅读 | 9 | ≤ 40% |
| T2 专业口碑 | 百班千人/红泥巴/阿甲/三联/丹妈/童书妈妈 | 8 | ≤ 30% |
| T3 市场热度 | 当当/京东畅销榜 | 5 | ≤ 20% |

**来源限额规则**：推荐列表中同一来源的书不超过该层级限额比例，防止刷屏。

## 使用方式

### 1. 数据库初始化

在 Supabase SQL Editor 执行 `supabase-schema.sql` 中的 catalog_books 建表部分。

### 2. 环境变量

确保 `.env.local` 中有：
```
VITE_SUPABASE_URL=your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key   # 写入时推荐使用
```

### 3. 爬取并入库

```bash
# 只跑种子爬虫并写入数据库
node scripts/catalog/pipeline.mjs --db

# 全量爬取（种子 + 所有已有爬虫）并入库
node scripts/catalog/pipeline.mjs --db --crawlers-only

# Dry-run（仅打印，不写入）
node scripts/catalog/pipeline.mjs --seed-only
```

### 4. 推荐 API

```
GET /api/recommend?dimension=自然科学&depth=进阶层&age=7-9&limit=20

# 参数说明:
#   dimension  - 五维分类（文学叙事/自然科学/人文社会/艺术创想/自我成长）
#   depth      - 深度层级（入门层/进阶层/鉴赏层）
#   age        - 适龄区间（0-3/4-6/7-9/10-12/13+）
#   keyword    - 关键字搜索
#   limit      - 每页条数（默认 20，最大 50）
#   page       - 页码（默认 1）
```

## 递归爬取规则

```
种子URL → 提取子链接
         → 白名单：/s/, booklist, recommend, book
         → 黑名单：buy, mall, item, cart, pay, order
         → 深度限制：最多 2 层
         → 同源限制：仅同域
```

## 深度层级判定

`depth_level` = f(level2, age, source_tags)

- **基准值**由二级分类决定（如绘本→入门层，文学赏析→鉴赏层）
- **年龄修正**：10岁以上自动上浮一级
- **来源权威修正**：多个来源（含T1）交叉验证的书上浮一级
- **书名关键词精修**：含"启蒙""低幼"等下调，含"全集""典藏"等上调

## 去重合并规则

相同 `书名 + 作者` → 合并 `source_tag` 数组 → `source_weight` 取最高值
