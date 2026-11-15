// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 国内老档案换新历法口径会变几张（命理组 11-02 裁定第 1 条：上线前报一次交节边界附近的差异数量与样例）。
// 同一份生辰各按 v1_legacy、v2_absolute 排一遍，比年柱、月柱、起运（大运第一步、起运岁数差 0.05 年以上）。
// 用法：node scripts/calendar-rule-diff.mjs <生辰清单.jsonl>
//   每行一个 JSON：{ "date": "YYYY-MM-DD", "time": "HH:mm" | null, "city": "…", "gender": "male" | "female", "timeMode"?: "clock" }
//   只在服务器上读、只打印数字和去掉日子的样例（年月＋节气名＋柱子变化），不打印完整生辰，不写文件。
import { readFileSync } from 'node:fs';
import { paipan } from '../src/paipan.js';

const lines = readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => l.trim());
const stat = { total: 0, skipped: 0, year: 0, month: 0, luck: 0, qiyun: 0, any: 0 };
const samples = [];
for (const l of lines) {
  let c; try { c = JSON.parse(l); } catch (_) { stat.skipped++; continue; }
  let a, b;
  try { a = paipan({ ...c, calendarRule: 'v1_legacy' }); b = paipan({ ...c, calendarRule: 'v2_absolute' }); } catch (_) { stat.skipped++; continue; }
  stat.total++;
  const P = (r, k) => r.bazi.pillars[k].ganZhi;
  const d = {
    year: P(a, 'year') !== P(b, 'year'),
    month: P(a, 'month') !== P(b, 'month'),
    luck: (a.bazi.luck.cycles[0] || {}).ganZhi !== (b.bazi.luck.cycles[0] || {}).ganZhi,
    qiyun: Math.abs((a.bazi.liupan.qiyun?.age ?? 0) - (b.bazi.liupan.qiyun?.age ?? 0)) >= 0.05,
  };
  for (const k of Object.keys(d)) if (d[k]) stat[k]++;
  if (Object.values(d).some(Boolean)) {
    stat.any++;
    if (samples.length < 12) samples.push(`${c.date.slice(0, 7)} ${b.input.birthTerm?.name ?? ''}前后 ${c.city.slice(0, 6)}：年 ${P(a, 'year')}→${P(b, 'year')}，月 ${P(a, 'month')}→${P(b, 'month')}，起运 ${a.bazi.liupan.qiyun?.age}→${b.bazi.liupan.qiyun?.age} 岁`);
  }
}
console.log(JSON.stringify(stat));
console.log(samples.join('\n'));
