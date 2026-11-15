// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 历法口径（命理组 11-02 五条裁定）的验收锚点。生辰全是编的。
// 节气时刻：2000 芒种 北京 6-5 16:58:34（命理组独立复算值）＝世界时 08:58:34；2000 立春 北京 2-4 20:40:24＝世界时 12:40:24；
// 2000 小暑 北京 7-7 03:13:56；2007 惊蛰 北京 3-6 07:17:59＝世界时 3-5 23:17:59。时区偏移另用 Python zoneinfo 核过。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { paipan, parseInput } from '../src/paipan.js';

const LA = ['洛杉矶', 'America/Los_Angeles', '34.0522,-118.2437'];
const NY = ['纽约', 'America/New_York', '40.7143,-74.006'];
const SYD = ['悉尼', 'Australia/Sydney', '-33.8688,151.2093'];
const BJZ = ['北京', 'Asia/Shanghai', '39.9042,116.4074'];
const at = (date, time, [city, zone, ll], extra = {}) => paipan({ date, time, city, zone, ll, gender: 'female', ...extra });
const dom = (date, time, city, extra = {}) => paipan({ date, time, city, gender: 'female', ...extra });
const month = (r) => r.bazi.pillars.month.ganZhi, year = (r) => r.bazi.pillars.year.ganZhi;

test('① 芒种：洛杉矶 2000-06-05 08:00（夏令时，＝北京 23:00）已过芒种，新算法壬午月；老算法拿当地钟面比北京节气是辛巳月', () => {
  assert.equal(month(at('2000-06-05', '08:00', LA)), '壬午');
  assert.equal(month(at('2000-06-05', '08:00', LA, { calendarRule: 'v1_legacy' })), '辛巳');
});

test('① 芒种那一刻前后：洛杉矶 01:57（世界时 08:57）辛巳、01:59（08:59）壬午；北京 16:57 辛巳、16:59 壬午', () => {
  assert.equal(month(at('2000-06-05', '01:57', LA)), '辛巳');
  assert.equal(month(at('2000-06-05', '01:59', LA)), '壬午');
  assert.equal(month(at('2000-06-05', '16:57', BJZ)), '辛巳');
  assert.equal(month(at('2000-06-05', '16:59', BJZ)), '壬午');
});

test('② 立春：同一刻（世界时 2000-02-04 12:41）在北京 20:41、洛杉矶 04:41、悉尼 23:41 年柱都是庚辰；早两分钟（12:39）都是己卯', () => {
  const after = [at('2000-02-04', '20:41', BJZ), at('2000-02-04', '04:41', LA), at('2000-02-04', '23:41', SYD)];
  const before = [at('2000-02-04', '20:39', BJZ), at('2000-02-04', '04:39', LA), at('2000-02-04', '23:39', SYD)];
  assert.deepEqual(after.map(year), ['庚辰', '庚辰', '庚辰']);
  assert.deepEqual(before.map(year), ['己卯', '己卯', '己卯']);
  // 月柱跟着年走：立春后寅月
  assert.deepEqual(after.map(month), ['戊寅', '戊寅', '戊寅']);
  // 日柱、时柱各按当地真太阳时（悉尼 23:41 夏令时，真太阳时约 22:30，还是亥时）
  assert.equal(after[2].bazi.pillars.hour.zhi, '亥');
});

test('③ 国内交节边界：北京 2000-06-05 16:59 新算法壬午（已过芒种）；老档案（不带时区）真太阳时约 16:47 还在芒种前，辛巳，照旧', () => {
  assert.equal(month(dom('2000-06-05', '16:59', '北京', { calendarRule: 'v2_absolute' })), '壬午');
  assert.equal(month(dom('2000-06-05', '16:59', '北京')), '辛巳');
  assert.equal(dom('2000-06-05', '16:59', '北京').version.calendarRule, 'v1_legacy');
});

test('③ 国内交节边界：乌鲁木齐 2000-06-05 18:00（北京时间，已过芒种约一小时）新算法壬午；老档案真太阳时约 15:52，辛巳；16:00 两种都是辛巳', () => {
  assert.equal(month(dom('2000-06-05', '18:00', '乌鲁木齐', { calendarRule: 'v2_absolute' })), '壬午');
  assert.equal(month(dom('2000-06-05', '18:00', '乌鲁木齐')), '辛巳');
  assert.equal(month(dom('2000-06-05', '16:00', '乌鲁木齐', { calendarRule: 'v2_absolute' })), '辛巳');
  assert.equal(month(dom('2000-06-05', '16:00', '乌鲁木齐')), '辛巳');
});

test('③ 老档案逐字复现：76 张国内盘（交节前后、夏令时那几年、新疆、时辰不详、钟表口径）不带 calendarRule 算，整份回包跟改之前（5034428）一模一样', () => {
  const fx = JSON.parse(readFileSync(new URL('./fixtures/v1_legacy_head.json', import.meta.url), 'utf8'));
  const strip = (r) => { const x = JSON.parse(JSON.stringify(r)); delete x.version.calendarRule; delete x.input.calendarRule; return x; };
  const bad = fx.filter(({ c, h }) => createHash('sha256').update(JSON.stringify(strip(paipan(c)))).digest('hex') !== h);
  assert.equal(fx.length, 76);
  assert.deepEqual(bad.map((x) => x.c), []);
});

// 起运：出生到目标节的真实间隔（世界时相减），三天折一年
const yearsBetween = (aUtc, bUtc) => Math.abs(bUtc - aUtc) / 864e5 / 3;
test('④ 起运顺排：洛杉矶 2000-06-10 12:00（世界时 19:00），庚辰阳年男顺排到小暑（世界时 7-6 19:13:56），约 8.67 年', () => {
  const r = paipan({ date: '2000-06-10', time: '12:00', city: LA[0], zone: LA[1], ll: LA[2], gender: 'male' });
  const want = yearsBetween(Date.UTC(2000, 5, 10, 19, 0), Date.UTC(2000, 6, 6, 19, 13, 56));
  assert.ok(r.bazi.luck.cycles.length > 0);
  assert.ok(Math.abs(r.bazi.liupan.qiyun.age - want) < 0.1, `${r.bazi.liupan.qiyun.age} 应约 ${want.toFixed(2)}`);
  // 老算法拿当地钟面（约 11:08）比北京节气，间隔多出约 16 小时，起运差 0.2 年以上
  const old = paipan({ date: '2000-06-10', time: '12:00', city: LA[0], zone: LA[1], ll: LA[2], gender: 'male', calendarRule: 'v1_legacy' });
  assert.ok(Math.abs(old.bazi.liupan.qiyun.age - want) > 0.15);
});

test('④ 起运逆排、跨夏令时：纽约 2007-03-20 10:00（夏令时，世界时 14:00），丁亥年男逆排到惊蛰（世界时 3-5 23:17:59），中间 3-11 拨了钟，按真实间隔约 4.87 年；同一刻写成北京时间（3-20 22:00）起运一样', () => {
  const ny = paipan({ date: '2007-03-20', time: '10:00', city: NY[0], zone: NY[1], ll: NY[2], gender: 'male' });
  const bj = paipan({ date: '2007-03-20', time: '22:00', city: BJZ[0], zone: BJZ[1], ll: BJZ[2], gender: 'male' });
  const want = yearsBetween(Date.UTC(2007, 2, 20, 14, 0), Date.UTC(2007, 2, 5, 23, 17, 59));
  assert.ok(Math.abs(ny.bazi.liupan.qiyun.age - want) < 0.1, `${ny.bazi.liupan.qiyun.age} 应约 ${want.toFixed(2)}`);
  assert.equal(ny.bazi.liupan.qiyun.age, bj.bazi.liupan.qiyun.age);
  assert.equal(ny.bazi.luck.startInfo, bj.bazi.luck.startInfo);
  assert.deepEqual(ny.bazi.luck.cycles.map((c) => c.ganZhi), bj.bazi.luck.cycles.map((c) => c.ganZhi));
  assert.equal(ny.bazi.luck.cycles[0].ganZhi, '壬寅');   // 癸卯月逆排第一步
});

test('⑤ 南半球不对冲：悉尼 2000-07-10 12:00 小暑后，月柱癸未（未月），不冲成子月', () => {
  const r = at('2000-07-10', '12:00', SYD);
  assert.equal(r.bazi.pillars.month.zhi, '未');
  assert.equal(month(r), '癸未');
});

test('⑦ 八字年界按立春、不跟正月初一：2005-02-06（立春 2-4 已过、正月初一 2-9 还没到）八字乙酉年', () => {
  assert.equal(year(at('2005-02-06', '12:00', BJZ)), '乙酉');
  assert.equal(year(dom('2005-02-06', '12:00', '北京', { calendarRule: 'v2_absolute' })), '乙酉');
});

test('境外看得懂：出生落在哪个节之后、交运日子、流月日子按出生地当地钟点；北京口径照旧', () => {
  const r = at('2000-06-05', '08:00', LA);
  assert.equal(r.input.birthTerm.name, '芒种');
  assert.equal(r.input.birthTerm.time, '2000.06.05 01:58');   // 世界时 08:58 → 洛杉矶夏令时 01:58
  assert.equal(r.bazi.liupan.months[2000].d[4], '6.5');      // 第五个节＝芒种
  assert.equal(r.bazi.liupan.months[2000].d[0], '2.4');      // 立春 北京 2-4 20:40 → 洛杉矶 2-4 04:40
  assert.equal(r.bazi.liupan.months[2007].d[1], '3.5');      // 2007 惊蛰 北京 3-6 07:17 → 洛杉矶 3-5 15:17
  const d = dom('2007-03-20', '10:00', '北京');
  assert.equal(d.bazi.liupan.months[2007].d[1], '3.6');
});

test('时辰不详的境外盘：按当地中午那一刻比节气（洛杉矶 2000-06-05 中午＝世界时 19:00，已过芒种）', () => {
  const r = at('2000-06-05', null, LA);
  assert.equal(month(r), '壬午');
  assert.equal(r.bazi.pillars.hour, null);
});

test('司令、月令跟着绝对时刻走：洛杉矶 2000-06-05 08:00 月令午', () => {
  const r = at('2000-06-05', '08:00', LA);
  assert.equal(r.bazi.pillars.month.zhi, '午');
  assert.ok(r.bazi.wuxingSeason && r.bazi.wuxingSeason['火'] === '旺', JSON.stringify(r.bazi.wuxingSeason));
});

test('口径写进回包；乱填报 CALENDAR_RULE_INVALID；带时区不填默认新算法', () => {
  assert.equal(at('2000-06-05', '08:00', LA).version.calendarRule, 'v2_absolute');
  assert.equal(at('2000-06-05', '08:00', LA).input.calendarRule, 'v2_absolute');
  assert.equal(dom('2000-06-05', '08:00', '北京', { calendarRule: 'v2_absolute' }).version.calendarRule, 'v2_absolute');
  assert.throws(() => parseInput({ date: '2000-01-01', time: '12:00', city: '北京', gender: 'male', calendarRule: 'v3' }), (e) => e.code === 'CALENDAR_RULE_INVALID');
});
