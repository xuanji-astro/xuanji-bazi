// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 运年合看（遭遇层，10-09 收窄：强信号动分、弱信号只注记）：合化改姓、牵绊、天干合走、天干冲克、冲、点燃、从强例外。四柱都是编的结构，不对应真人。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_STEMS } from 'mingyu-core/bazi';
import { encounterYear, huaOf } from '../src/schools/encounter.js';

const raw = (ps, season = {}) => { const P = Object.fromEntries(['year', 'month', 'day', 'hour'].map((k, i) => [k, { gan: ps[i][0], zhi: ps[i][1] }])); return { pillars: P, hiddenStems: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, HIDDEN_STEMS[v.zhi]])), wuxingSeasonStatus: season, luckInfo: { cycles: [] } }; };
const xjBy = (m) => (s) => m[s] ?? 0;
const kinds = (e) => e.notes.map((n) => n.kind);

test('合化改姓：流年巳补齐原局酉丑三合，金当令又没被冲＝化成，巳按辛算；年干庚合住流年乙，喜落空', () => {
  const r = raw(['庚子', '己酉', '甲辰', '丁丑'], { 金: '旺' });
  const e = encounterYear(r, '戊午', '乙巳', xjBy({ 辛: 2, 乙: 1, 丙: -2 }));
  assert.deepEqual(kinds(e), ['合化', '喜落空']);
  assert.deepEqual([e.score, e.tier], [86, 1]);
});

test('天干合走只看原局年月时干：大运干、日干合住流年干都不算', () => {
  const e = encounterYear(raw(['甲子', '己酉', '庚辰', '丁丑'], { 金: '旺' }), '庚午', '乙巳', xjBy({ 辛: 2, 乙: 1 }));
  assert.deepEqual([kinds(e), e.score], [['合化'], 94]);
});

test('化不成＝牵绊：只出注记，流年支照原样算、不打折', () => {
  const r = raw(['庚子', '己酉', '甲辰', '丁丑'], { 金: '囚' });
  const e = encounterYear(r, '戊午', '乙巳', xjBy({ 辛: 2, 乙: 1, 丙: -2 }));
  assert.deepEqual(kinds(e), ['牵绊', '喜落空']);
  assert.deepEqual([e.score, e.tier], [54, 3]);
});

test('局外有支冲局里的支＝化不成；带中神的半合也算合', () => {
  assert.equal(huaOf(raw(['甲卯', '己酉', '庚辰', '丁丑'], { 金: '旺' }), null, '巳').cheng, false, '卯冲酉');
  assert.deepEqual(huaOf(raw(['甲子', '己酉', '庚辰', '丁寅'], { 金: '旺' }), null, '巳').how, '半合');
  assert.equal(huaOf(raw(['甲子', '己未', '庚辰', '丁寅'], {}), null, '巳'), null, '巳未不是带中神的半合');
});

test('忌神被合只出注记，照算不解凶；合住它的庚贪合忘克，不算冲克', () => {
  const e = encounterYear(raw(['庚午', '己未', '甲辰', '丁酉']), '戊午', '乙亥', xjBy({ 乙: -2 }));
  assert.deepEqual([kinds(e), e.score, e.tier], [['忌神被合'], 54, 3]);
  assert.deepEqual(kinds(encounterYear(raw(['甲午', '己未', '庚辰', '丁酉']), '戊午', '乙亥', xjBy({ 乙: -2 }))), [], '日干庚不算');
});

test('天干冲克：大喜、大忌之神被原局干克，只记注记不动档', () => {
  const r = raw(['壬申', '乙卯', '丙辰', '辛卯']);
  const xi = encounterYear(r, '戊申', '甲午', xjBy({ 甲: 2, 丁: 2 }));
  assert.deepEqual([xi.tier, kinds(xi), xi.notes[0].why], [0, ['喜被克'], ['甲被辛克']]);
  const ji = encounterYear(r, '戊申', '甲午', xjBy({ 甲: -2, 丁: -2 }));
  assert.deepEqual([ji.tier, kinds(ji)], [4, ['忌被克']]);
  assert.deepEqual(kinds(encounterYear(r, '戊申', '甲午', xjBy({ 甲: 1 }))), [], '小喜小忌不论');
});

test('冲：冲大喜、或冲的提纲是喜，降一档；冲小喜只记变动；冲提纲记大忌年；冲忌神只记注记', () => {
  const xi = encounterYear(raw(['甲子', '己亥', '庚辰', '丁丑']), '戊申', '丁巳', xjBy({ 壬: 2 }));
  assert.deepEqual([xi.tier, kinds(xi)], [3, ['喜损', '大忌年']]);
  assert.deepEqual(xi.notes[1].why, ['巳冲提纲亥']);
  const ti = encounterYear(raw(['甲子', '己亥', '庚辰', '丁丑']), '戊申', '丁巳', xjBy({ 壬: 1 }));
  assert.deepEqual([ti.tier, kinds(ti)], [3, ['喜损', '大忌年']], '提纲是小喜也降');
  const xiao = encounterYear(raw(['乙亥', '己卯', '庚辰', '丁丑']), '戊申', '丁巳', xjBy({ 壬: 1 }));
  assert.deepEqual([xiao.tier, kinds(xiao)], [2, ['变动']]);
  assert.match(xiao.notes[0].why.join(), /小喜/);
  const ji = encounterYear(raw(['乙亥', '己卯', '庚辰', '丁丑']), '戊申', '丁巳', xjBy({ 壬: -2 }));
  assert.deepEqual([ji.tier, kinds(ji)], [2, ['冲忌']]);
});

test('同年有大喜级信号（用神透干、派给的药到），冲不降档，只记变动', () => {
  const r = raw(['甲子', '乙亥', '庚辰', '丁丑']);
  const tou = encounterYear(r, '戊申', '癸巳', xjBy({ 壬: 2, 癸: 2 }));
  assert.deepEqual([tou.tier, kinds(tou)], [1, ['变动']]);
  const yao = encounterYear(r, '戊申', '丁巳', xjBy({ 壬: 2 }), { big: () => ['药到'] });
  assert.deepEqual([yao.tier, kinds(yao)], [2, ['变动']]);
  assert.match(yao.notes[0].why.join(), /同年药到/);
});

test('点燃：派给的引动判断成立，喜神年也至少偏紧', () => {
  const e = encounterYear(raw(['甲子', '己卯', '庚辰', '丁丑']), '戊申', '丙午', xjBy({ 丙: 2, 丁: 2 }), { fire: () => ({ why: ['测试注记'] }) });
  assert.deepEqual([e.score, e.tier, kinds(e)], [98, 3, ['变动', '点燃']], '午冲子：丙是用神透出，冲只记变动；点燃照样');
});

test('化成同一行不改姓：亥补齐子丑成水局，仍按亥的本气壬算', () => {
  const r = raw(['甲子', '己丑', '庚辰', '丁卯'], { 水: '旺' });
  const e = encounterYear(r, '戊申', '辛亥', xjBy({ 壬: 2, 癸: -2 }));
  assert.deepEqual([kinds(e), e.score], [[], 86]);
});

test('从强例外：财官的字不进遭遇层——不合化改姓、不合走，出现即按大忌出分', () => {
  const r = raw(['庚子', '己酉', '甲辰', '丁丑'], { 金: '旺' });
  const e = encounterYear(r, '戊午', '乙巳', xjBy({ 乙: -2, 丙: -2, 辛: 2 }), { hard: (s) => ['乙', '丙'].includes(s) });
  assert.deepEqual([kinds(e), e.score, e.tier], [[], 38, 4]);
});
