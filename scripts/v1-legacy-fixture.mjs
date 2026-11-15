// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 生成 test/fixtures/v1_legacy_head.json：拿改历法口径之前的代码（git archive 5034428 到别的目录）算这批盘，存每张整份回包的指纹；
// 用法：node scripts/v1-legacy-fixture.mjs <那份老代码的目录>。新代码不带 calendarRule（＝v1_legacy）算同一批，指纹必须一样。
// 国内老档案（不带时区）的一批编的生辰：交节前后、夏令时那几年、新疆、时辰不详、钟表口径、两种性别、定案强弱
import { createHash } from 'node:crypto';
const root = process.argv[2];
const { paipan } = await import(root + '/src/paipan.js');
const { SolarTerm } = await import('tyme4ts');
const cities = ['北京', '上海', '广州', '乌鲁木齐', '拉萨', '哈尔滨', '杭州', '成都'];
const terms = [[1988, '立秋'], [1990, '白露'], [1995, '清明'], [2000, '芒种'], [2000, '立春'], [2005, '立春'], [2007, '惊蛰'], [2007, '立冬'], [2010, '惊蛰'], [1986, '小暑'], [1991, '白露'], [1979, '大雪']];
const pad = (n) => String(n).padStart(2, '0');
const cases = [];
let i = 0;
for (const [y, n] of terms) {
  const t = SolarTerm.fromName(y, n).getJulianDay().getSolarTime();
  for (const dm of [-150, -40, -5, 5, 40, 150]) {
    const d = new Date(Date.UTC(t.getYear(), t.getMonth() - 1, t.getDay(), t.getHour(), t.getMinute()) + dm * 6e4);
    const city = cities[i++ % cities.length];
    cases.push({ date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`, city, gender: i % 2 ? 'male' : 'female', ...(i % 7 === 0 ? { timeMode: 'clock' } : {}), ...(i % 11 === 0 ? { strength: '弱' } : {}) });
  }
}
cases.push({ date: '1988-07-01', time: null, city: '杭州', gender: 'female' }, { date: '2000-06-05', time: null, city: '乌鲁木齐', gender: 'male' }, { date: '1987-09-13', time: '01:30', city: '上海', gender: 'male' }, { date: '1990-04-15', time: '02:30', city: '北京', gender: 'female' });
const strip = (r) => { const x = JSON.parse(JSON.stringify(r)); if (x.version) delete x.version.calendarRule; if (x.input) delete x.input.calendarRule; return x; };
const out = cases.map((c) => ({ c, h: createHash('sha256').update(JSON.stringify(strip(paipan(c)))).digest('hex') }));
console.log(JSON.stringify(out));
