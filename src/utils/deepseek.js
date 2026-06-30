// ============================================================
// DeepSeek API 前端调用封装（v2.0）
// 所有对 DeepSeek 的调用统一走此模块，通过 Vite 插件代理，
// 确保 API Key 不暴露到前端。
//
// 使用方式：
//   import { generateDiscoveryCard, lookupTranslation } from './utils/deepseek';
//
//   const card = await generateDiscoveryCard({ text: '...', bookTitle: '...', author: '...' });
//   // → { discovery, question, feeling }
//
//   const translations = await lookupTranslation({ originalTitle: '...', author: '...' });
//   // → { top3: [{translator, publish_year, recommend_reason}] }
// ============================================================

const API_ENDPOINT = '/api/deepseek';

/**
 * 通用 DeepSeek 调用封装
 * @param {string} taskType - 任务类型: 'generate_card' | 'lookup_translation'
 * @param {object} params - 任务参数
 * @returns {Promise<object>} 解析后的 JSON 结果
 */
export async function callDeepSeek(taskType, params, fallback) {
  try {
    const resp = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_type: taskType, ...params }),
    });
    const data = await resp.json();
    if (!resp.ok && !data.error) throw new Error('HTTP ' + resp.status);
    if (data.error) throw new Error(data.error);
    return data.result;
  } catch (e) {
    console.warn(`[DeepSeek] ${taskType} 调用失败:`, e.message);
    if (fallback !== undefined) return fallback;
    throw e;
  }
}

/**
 * 任务A：根据孩子的口语录音生成三段式发现卡
 * 输入：语音转文字后的文本 + 书名 + 作者
 * 输出：{ discovery: string, question: string, feeling: string }
 * 约束：feeling 字段保留原话
 */
export async function generateDiscoveryCard({ text, bookTitle, author }) {
  return callDeepSeek('generate_card', { text, bookTitle, author });
}

/**
 * 任务B：查询外国经典名著的推荐译本
 * 输入：原版书名 + 作者
 * 输出：{ top3: [{translator, publish_year, recommend_reason}] }
 * 约束：仅返回 2000 年以后的版本
 */
export async function lookupTranslation({ originalTitle, author }) {
  return callDeepSeek('lookup_translation', { originalTitle, author });
}
