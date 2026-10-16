// ============================================================
// bookStatus — 统一处理 book.month 字段的三种含义
// month 字段可能的值：
//   ''        未设置
//   'reading' 阅读中
//   'pending' 待读
//   'YYYY-MM' 已读完，对应具体月份
// 不新增数据库字段，只是约定前端统一按这个规则读写 month，
// 避免录入/编辑/展示三处各写各的判断逻辑，导致状态对不上。
// ============================================================

/** 判断是否是合法的 'YYYY-MM' 具体月份值 */
export function isMonthValue(month) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '');
}

/** 把 month 字段换算成状态选择器要用的三态 key */
export function monthToStatusKey(month) {
  if (month === 'reading' || month === 'pending') return month;
  if (isMonthValue(month)) return 'month';
  return '';
}

/** 详情/说说卡展示用的完整文案，如"阅读中" / "7月读完" */
export function formatMonthLabel(month) {
  if (!month) return '';
  if (month === 'reading') return '阅读中';
  if (month === 'pending') return '待读';
  if (isMonthValue(month)) {
    const m = parseInt(month.split('-')[1], 10);
    return `${m}月读完`;
  }
  return month;
}

/** 书架列表用的短文案，如"阅读中" / "7月" */
export function formatMonthShort(month) {
  if (!month) return '';
  if (month === 'reading') return '阅读中';
  if (month === 'pending') return '待读';
  if (isMonthValue(month)) {
    const m = parseInt(month.split('-')[1], 10);
    return `${m}月`;
  }
  return month;
}
