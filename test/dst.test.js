// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 1986–1991 夏令时（10-10）：北京时间口径也扣回标准时；开始那天跳过的一小时按标准时排、结束那天重复的一小时按夏令时那一遍，都不报错、给提示。生辰都是编的。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paipan } from '../src/paipan.js';

const run = (date, time, timeMode) => paipan({ date, time, city: '北京', gender: 'female', ...(timeMode ? { timeMode } : {}) });

test('夏令时期间按北京时间排也扣 1 小时：1988-07-15 11:30 是巳时（标准时 10:30）', () => {
  assert.equal(run('1988-07-15', '11:30', 'clock').bazi.pillars.hour.zhi, '巳');
  assert.equal(run('1995-07-15', '11:30', 'clock').bazi.pillars.hour.zhi, '午');   // 不是夏令时的年份不动
  const r = run('1988-07-15', '11:30');
  assert.equal(r.timeCheck.differs, false);   // 两种口径同一个时柱，不再误报「接近时辰交界」
});

test('夏令时开始那天 02:30（钟表上不存在）：不报错，按标准时排，回显照填的，给提示', () => {
  const r = run('1986-05-04', '02:30');
  assert.equal(r.input.time, '02:30');
  assert.ok(r.warnings.some((w) => /夏令时开始/.test(w)));
  assert.equal(run('1986-05-04', '02:30', 'clock').bazi.pillars.hour.zhi, '丑');
});

test('夏令时结束那天 01:30（走了两遍）：不报错，按夏令时那一遍排，给提示', () => {
  const r = run('1991-09-15', '01:30');
  assert.ok(r.warnings.some((w) => /夏令时结束/.test(w)));
  assert.equal(r.bazi.pillars.hour.zhi, '子');
});
