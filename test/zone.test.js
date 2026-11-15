// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 境外／港澳台（1102jw，11-02）：调用方给出生地时区名 zone＋经纬度 ll，按它们排。生辰都是编的。
// 期望的真太阳时另用 Python zoneinfo（出生地时区→世界时）＋经度×4 分＋NOAA 均时差算，不拿引擎对自己；均时差两套公式差 1～2 分，容差 3 分。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paipan, parseInput } from '../src/paipan.js';

const run = (date, time, city, zone, ll, timeMode) => paipan({ date, time, city, gender: 'female', zone, ll, ...(timeMode ? { timeMode } : {}) });
const near = (a, b, min) => Math.abs(Date.parse(a.replace(' ', 'T') + ':00Z') - Date.parse(b.replace(' ', 'T') + ':00Z')) <= min * 6e4;
const CASES = [
  ['香港 1988 夏（那几年香港没有夏令时）', '1988-07-01', '12:00', '香港', 'Asia/Hong_Kong', '22.2783,114.1747', '1988-07-01 11:33', '午'],
  ['洛杉矶 2000-06（夏令时）', '2000-06-01', '12:00', '洛杉矶', 'America/Los_Angeles', '34.0522,-118.2437', '2000-06-01 11:09', '午'],
  ['洛杉矶 2000-12（冬令时）', '2000-12-01', '12:00', '洛杉矶', 'America/Los_Angeles', '34.0522,-118.2437', '2000-12-01 12:17', '午'],
  ['悉尼 2000-01（南半球夏令时）', '2000-01-15', '13:30', '悉尼', 'Australia/Sydney', '-33.8688,151.2093', '2000-01-15 12:26', '午'],
  ['加尔各答 1990（东五区半）', '1990-05-05', '12:00', '加尔各答', 'Asia/Kolkata', '22.5626,88.363', '1990-05-05 12:26', '午'],
  ['加德满都 1990（东五区四十五分）', '1990-05-05', '12:00', '加德满都', 'Asia/Kathmandu', '27.7017,85.3206', '1990-05-05 11:59', '午'],
  ['伦敦 1995-07 23:40（夏令时，真太阳时还在前一个时辰）', '1995-07-10', '23:40', '伦敦', 'Europe/London', '51.5085,-0.1257', '1995-07-10 22:34', '亥'],
];
for (const [name, date, time, city, zone, ll, tst, zhi] of CASES) {
  test(`真太阳时按出生地时区和经度：${name}`, () => {
    const r = run(date, time, city, zone, ll);
    assert.ok(near(r.input.trueSolarTime, tst, 3), `${r.input.trueSolarTime} 应约 ${tst}`);
    assert.equal(r.bazi.pillars.hour.zhi, zhi);
    assert.equal(r.input.city, city);   // 城市名只回显
  });
}

test('香港 1988-07-01 12:00：带香港时区是丙午时；只给城市名照旧按大陆口径（扣夏令时）是乙巳时，老档案不变', () => {
  assert.equal(run('1988-07-01', '12:00', '香港', 'Asia/Hong_Kong', '22.2783,114.1747').bazi.pillars.hour.ganZhi, '丙午');
  assert.equal(paipan({ date: '1988-07-01', time: '12:00', city: '香港', gender: 'female' }).bazi.pillars.hour.ganZhi, '乙巳');
});

test('北京时间（钟表）口径：境外按当地标准时排——悉尼一月 13:30 夏令时＝标准时 12:30 午时；伦敦七月 23:40＝标准时 22:40 亥时', () => {
  assert.equal(run('2000-01-15', '13:30', '悉尼', 'Australia/Sydney', '-33.8688,151.2093', 'clock').bazi.pillars.hour.zhi, '午');
  assert.equal(run('1995-07-10', '23:40', '伦敦', 'Europe/London', '51.5085,-0.1257', 'clock').bazi.pillars.hour.zhi, '亥');
  assert.equal(run('2000-07-15', '13:30', '悉尼', 'Australia/Sydney', '-33.8688,151.2093', 'clock').bazi.pillars.hour.zhi, '未');   // 七月悉尼没有夏令时，不扣
});

test('境外夏令时：结束那天重复的一小时、开始那天跳过的一小时都不报错，提示写「当地夏令时」', () => {
  const a = run('2007-11-04', '01:30', '纽约', 'America/New_York', '40.7143,-74.006');
  assert.ok(a.warnings.some((w) => /当地夏令时结束/.test(w)));
  const b = run('2007-03-11', '02:30', '纽约', 'America/New_York', '40.7143,-74.006');
  assert.ok(b.warnings.some((w) => /当地夏令时开始/.test(w)));
  assert.equal(b.input.time, '02:30');
});

test('时区名、经纬度不对就报错，不悄悄按上海时间排', () => {
  const bad = (zone, ll) => assert.throws(() => parseInput({ date: '2000-01-01', time: '12:00', city: 'x', gender: 'male', zone, ll }), (e) => ['ZONE_INVALID', 'PLACE_INVALID'].includes(e.code));
  bad('Mars/Base', '1.0,2.0'); bad('Asia/Hong_Kong', '22.27'); bad('Asia/Hong_Kong', '95.0,10.0'); bad('', '22.2783,114.1747'); bad('Asia/Hong_Kong', null);
});

test('老名字兜底：Europe/Kyiv 认不出时换 Europe/Kiev（本机认得就直接用）', () => {
  const p = parseInput({ date: '2000-01-01', time: '12:00', city: '基辅', gender: 'male', zone: 'Europe/Kyiv', ll: '50.4501,30.5234' });
  assert.ok(['Europe/Kyiv', 'Europe/Kiev'].includes(p.place.timeZoneId));
});
