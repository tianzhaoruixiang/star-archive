/**
 * 兼容后端日期格式的解析与展示
 * 后端可能返回：ISO 字符串、"yyyy-MM-dd HH:mm:ss"、时间戳、或 Jackson 数组 [year,month,day,hour,minute,second]
 */

const EMPTY = '—';

/** 后端可能返回的日期类型（含 Jackson 曾序列化的数组格式） */
export type DateInput = string | number | number[] | null | undefined;

/**
 * 将后端返回的日期值解析为 Date，无效则返回 null
 * - 支持数组 [year, month, day, hour?, minute?, second?]（Java LocalDateTime 曾序列化为此格式，month 为 1-based）
 * - 支持 "yyyy-MM-dd HH:mm:ss"（空格形式，部分环境 new Date 会 Invalid Date）
 * - 支持 ISO "yyyy-MM-ddTHH:mm:ss"
 * - 支持时间戳（毫秒）
 */
export function parseDate(value: DateInput): Date | null {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = value.map(Number);
    if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return null;
    const date = new Date(y, mo - 1, d, h, mi, s);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(value).trim();
  if (!str) return null;
  const normalized = str.includes('T') ? str : str.replace(/(\d{4}-\d{2}-\d{2})\s+(\d)/, '$1T$2');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 仅日期，如 1997.12.15，用于出生日期等 */
export function formatDateOnly(value: DateInput, fallback: string = EMPTY): string {
  const d = parseDate(value);
  if (!d) return fallback;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 出生年月，如 1997.12（不含日） */
export function formatBirthMonth(value: DateInput, fallback: string = EMPTY): string {
  const d = parseDate(value);
  if (!d) return fallback;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 日期时间，本地化显示 */
export function formatDateTime(value: DateInput, fallback: string = EMPTY): string {
  const d = parseDate(value);
  if (!d) return fallback;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** 日期范围，如 "2016.09 - 2020.06"；单侧有值也可 */
export function formatDateRange(start: DateInput, end: DateInput): string {
  const s = parseDate(start);
  const e = parseDate(end);
  const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (s && e) return `${fmt(s)} - ${fmt(e)}`;
  if (s) return fmt(s);
  if (e) return fmt(e);
  return EMPTY;
}
