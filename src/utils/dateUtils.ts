/**
 * Date and Timezone Utils for Malaysian Time (GMT+8)
 */

// 马来西亚时间是GMT+8
const MALAYSIA_TIMEZONE_OFFSET = 8;

/**
 * 将本地日期时间转换为UTC时间
 * @param date 日期字符串 YYYY-MM-DD
 * @param time 时间字符串 HH:MM
 * @returns ISO格式的UTC时间
 */
export const convertToUTC = (date: string, time: string): string => {
  // 构建完整的日期时间字符串: YYYY-MM-DDTHH:MM:00
  const dateTimeString = `${date}T${time}:00`;
  
  // 创建本地日期对象
  const localDate = new Date(dateTimeString);
  
  // 转换为UTC时间
  return localDate.toISOString();
};

/**
 * 将UTC时间转换为马来西亚本地时间
 * @param utcDateString UTC时间字符串
 * @returns 包含日期和时间的对象 { date: 'YYYY-MM-DD', time: 'HH:MM' }
 */
export const convertToMalaysiaTime = (utcDateString: string): { date: string, time: string } => {
  // 创建UTC日期对象
  const utcDate = new Date(utcDateString);
  
  // 调整为马来西亚时间 (GMT+8)
  // 获取UTC小时和分钟
  const utcHours = utcDate.getUTCHours();
  const malaysiaHours = (utcHours + MALAYSIA_TIMEZONE_OFFSET) % 24;
  
  // 如果时间跨天，需要调整日期
  let malaysiaDate = new Date(utcDate);
  if (utcHours + MALAYSIA_TIMEZONE_OFFSET >= 24) {
    malaysiaDate = new Date(utcDate);
    malaysiaDate.setUTCDate(malaysiaDate.getUTCDate() + 1);
  }
  
  // 格式化日期为 YYYY-MM-DD
  const year = malaysiaDate.getUTCFullYear();
  const month = String(malaysiaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(malaysiaDate.getUTCDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  
  // 格式化时间为 HH:MM
  const hours = String(malaysiaHours).padStart(2, '0');
  const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}`;
  
  return {
    date: formattedDate,
    time: formattedTime
  };
};

/**
 * 获取当前马来西亚时间的日期部分
 * @returns 当前马来西亚日期 YYYY-MM-DD
 */
export const getCurrentMalaysiaDate = (): string => {
  const now = new Date();
  
  // 获取UTC时间并调整为马来西亚时间
  const utcHours = now.getUTCHours();
  const malaysiaHours = (utcHours + MALAYSIA_TIMEZONE_OFFSET) % 24;
  
  // 处理跨天情况
  let malaysiaDate = new Date(now);
  if (utcHours + MALAYSIA_TIMEZONE_OFFSET >= 24) {
    malaysiaDate.setUTCDate(malaysiaDate.getUTCDate() + 1);
  }
  
  const year = malaysiaDate.getUTCFullYear();
  const month = String(malaysiaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(malaysiaDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 格式化日期时间为用户友好的显示格式
 * @param date 日期字符串 YYYY-MM-DD
 * @param time 时间字符串 HH:MM
 * @returns 格式化的日期时间字符串，例如 "2023年11月23日 14:30"
 */
export const formatDateTimeForDisplay = (date: string, time: string): string => {
  if (!date || !time) return '';
  
  const dateObj = new Date(`${date}T${time}:00`);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return dateObj.toLocaleDateString('zh-CN', options);
};

/**
 * 将任何日期格式化为马来西亚时间（12小时制）
 * @param date 日期对象或日期字符串
 * @returns 格式化后的马来西亚时间字符串
 */
export const formatToMalaysiaTime = (date: Date | string): string => {
  // 创建日期对象
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 使用 toLocaleString 设置为马来西亚时区 (Asia/Kuala_Lumpur) 和 12 小时制
  return dateObj.toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * 仅格式化日期部分（不含时间）
 * @param date 日期对象或日期字符串
 * @returns 格式化后的马来西亚日期字符串
 */
export const formatToMalaysiaDate = (date: Date | string): string => {
  // 创建日期对象
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 只返回日期部分
  return dateObj.toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}; 