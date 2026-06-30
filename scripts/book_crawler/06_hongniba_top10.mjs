// ============================================================
// 爬虫 #6：红泥巴 × 父母必读「年度优秀童书排行榜TOP10」
// 权重：8 | 来源标签：红泥巴推荐
//
// 中国持续时间最长的媒体童书推荐榜单
// 2005-2025 连续21年，每年TOP10
// ============================================================

import { classifyBooks } from './lib/classifier.js';
import { SOURCES } from './lib/config.js';

const SOURCE = SOURCES.hongniba;

/**
 * 精校数据：红泥巴年度TOP10（2021-2025）+ 经典推荐
 * 来源：红泥巴官网 + 微博2005-2025完整书单
 */
function getSeedData() {
  return [
    // === 2025年度TOP10（第21届）===
    { title: '倒立的兔子', author: '李星明', language: '中文' },
    { title: '亮世界', author: '吴启昇', language: '中文' },
    { title: '那个那个', author: '午夏', language: '中文' },
    { title: '09：47', author: '张维', language: '中文' },
    { title: '麻烦的裂缝', author: '张玥', language: '中文' },
    { title: '神奇的胖胖—蓬蓬—小小', author: '赵梦雅', language: '中文' },
    { title: '一角天空', author: '李琳', language: '中文' },
    { title: '回家的路，嗒嗒嗒', author: '陆薇尔', language: '中文' },
    { title: '小黑与樱花', author: '林小杯', language: '中文' },
    { title: '小罐子，大世界', author: '孙昱', language: '中文' },
    // === 2024年度TOP10（第20届）===
    { title: '白熊的短裤', author: 'tupera tupera', language: '外文', translator: '陈志宇' },
    { title: '10只狗狗分香肠', author: '埃米莉·格雷维特', language: '外文', translator: '刘嘉' },
    { title: '外婆的菜园', author: '唐唯', language: '中文' },
    { title: '萝卜大厦', author: '和畅团', language: '中文' },
    { title: '我们何以成为人类', author: '菲利普·森普特', language: '外文', translator: '陈小齐' },
    { title: '莉齐和她的云朵', author: '马修·伯吉斯', language: '外文', translator: '林岚' },
    { title: '小狗什么都不少', author: '郭婧', language: '中文' },
    { title: '章鱼没有骨头', author: '安妮·理查森', language: '外文', translator: '徐德荣' },
    { title: '我们 它们', author: '劳伦·奥莱利', language: '外文', translator: '胡良' },
    { title: '马鹿卓玛', author: '白玛娜珍', language: '中文' },
    // === 2023年度TOP10 ===
    { title: '窗里有什么？', author: '卡特里娜·齐特', language: '外文', translator: '王星' },
    { title: '牛言·蜚语', author: '许匡匡', language: '中文' },
    { title: '鸡蛋讲的故事', author: '盐谷真实子', language: '外文', translator: '彭懿' },
    { title: '琴声飞过旷野', author: '徐鲁', language: '中文' },
    { title: '宇宙在你眼中', author: '斯科特·斯图尔特', language: '外文', translator: '孙昱' },
    { title: '如何造一座山', author: '爱丽丝·波特', language: '外文', translator: '王芳' },
    { title: '绿树如你的父亲', author: '曹文轩', language: '中文' },
    { title: '寻梦奇遇记', author: '李东华', language: '中文' },
    { title: '虫子间', author: '朱赢椿', language: '中文' },
    { title: '追光的向日葵', author: '赵丽宏', language: '中文' },
    // === 2022年度TOP10 ===
    { title: '喜鹊窝', author: '海飞', language: '中文' },
    { title: '水与墨的故事', author: '李青', language: '中文' },
    { title: '最好的面包店', author: '张越', language: '中文' },
    { title: '大运河送来爷爷的车', author: '王林', language: '中文' },
    { title: '不一样的1', author: '吴亚男', language: '中文' },
    { title: '这里是新疆', author: '查璇', language: '中文' },
    { title: '画画带你逛北京', author: '徐佳', language: '中文' },
    { title: '夏天', author: '孙玉虎', language: '中文' },
    { title: '太阳和阴凉儿', author: '张之路', language: '中文' },
    { title: '一本关于颜色的黑书', author: '梅米娜·科登', language: '外文', translator: '朱晓卉' },
    // === 2021年度TOP10 ===
    { title: '荷花镇的早市', author: '周翔', language: '中文' },
    { title: '北冥有鱼', author: '刘畅', language: '中文' },
    { title: '冬夜说书人', author: '王勇英', language: '中文' },
    { title: '小喜鹊和岩石山', author: '刘清彦', language: '中文' },
    { title: '我们不要放屁虫开巴士', author: '彭懿', language: '中文' },
    { title: '小鱼的春天', author: '保冬妮', language: '中文' },
    { title: '小樟树', author: '苏梅', language: '中文' },
    { title: '桃花鱼婆婆', author: '彭学军', language: '中文' },
    { title: '龙的传说', author: '李娜', language: '中文' },
    { title: '一只特立独行的猪', author: '王小波', language: '中文' },
    // === 阿甲经典推荐（绘本方向）===
    { title: '野兽国', author: '莫里斯·桑达克', language: '外文', translator: '宋珮' },
    { title: '石头汤', author: '琼·穆特', language: '外文', translator: '阿甲' },
    { title: '勇气', author: '伯纳德·韦伯', language: '外文', translator: '阿甲' },
    { title: '阿莫的生病日', author: '菲利普·斯蒂德', language: '外文', translator: '阿甲' },
    { title: '田鼠阿佛', author: '李欧·李奥尼', language: '外文', translator: '阿甲' },
    { title: '大脚丫跳芭蕾', author: '埃米·扬', language: '外文', translator: '柯倩华' },
    { title: '小房子', author: '维吉尼亚·李·伯顿', language: '外文', translator: '阿甲' },
    { title: '彼得兔的故事', author: '毕翠克丝·波特', language: '外文', translator: '阿甲' },
    { title: '月亮，晚安', author: '玛格丽特·怀兹·布朗', language: '外文', translator: '阿甲' },
    { title: '让路给小鸭子', author: '罗伯特·麦克洛斯基', language: '外文', translator: '阿甲' },
  ];
}

export async function run() {
  console.log(`\n===== ${SOURCE.name} (权重${SOURCE.weight}) =====`);
  const books = getSeedData();
  const classified = classifyBooks(books, 'hongniba');
  console.log(`  共 ${classified.length} 本（红泥巴年度TOP10 + 阿甲推荐）`);
  return classified;
}

if (process.argv[1]?.endsWith('06_hongniba_top10.mjs')) {
  const result = await run();
  console.log(JSON.stringify(result, null, 2));
}
