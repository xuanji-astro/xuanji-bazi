// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 调候派 v1.1：按《穷通宝鉴》取用，不论强弱；按天干记、按天干打分；忌照原文（可带条件）、无原文按推法。生辰和四柱全部虚构。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baziCalculator, HIDDEN_STEMS } from 'mingyu-core/bazi';
import { paipan } from '../src/paipan.js';
import { tiaohouUseful, ORIGINAL_JI } from '../src/schools/tiaohou.js';

const raw = (ps) => { const P = Object.fromEntries(['year', 'month', 'day', 'hour'].map((k, i) => [k, { gan: ps[i][0], zhi: ps[i][1] }])); return { pillars: P, hiddenStems: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, HIDDEN_STEMS[v.zhi]])), wuxingSeasonStatus: {}, seasonInfo: {} }; };
const calc = (y, m, d, h) => baziCalculator.calculateBazi({ year: y, month: m, day: d, hour: h, minute: 0, gender: 'male', isLunar: false, shenShaScope: 'common', useTrueSolarTime: false });

test('取的规则和顺序跟引擎自己叠调候那一步一样（普通格局逐张自证）', () => {
  let seed = 11, n = 0; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 300; i++) {
    const r = calc(1950 + Math.floor(rnd() * 60), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24));
    if (r.analysis.mingGe.isSpecial) continue;
    const t = (r.analysis.usefulGod.strategyTrace || []).find((x) => x.startsWith('调候优先:')), u = tiaohouUseful(r);
    assert.deepEqual(u.abstain ? [] : u.favorableWuxing, t ? t.slice(5).split(' -> ') : []);
    n++;
  }
  assert.ok(n > 200);
});

test('推法（按天干）：用神大喜、佐神小喜；克用神的天干大忌；克佐神的、合绊用神的小忌；跟喜撞了不算忌', () => {
  const u = tiaohouUseful(calc(1985, 8, 12, 14));   // 癸水申月，先丙后辛
  assert.equal(u.rule.id, 'shen-month-gui-bing-xin-first');
  assert.deepEqual(u.stems, { yong: ['丙'], zuo: ['辛'], da: ['壬', '癸'], xiao: ['丁'] });   // 丙辛合，辛是佐神不算忌；克辛的丙是用神不算忌
  assert.deepEqual(u.favorableWuxing, ['火', '金']);
  assert.equal(u.ji_source, '推法');
});

test('原文的忌照原文、按天干；条件忌：壬水酉月原局无甲才忌戊，有甲就不算，改按推法', () => {
  const noJia = tiaohouUseful(raw(['庚申', '己酉', '壬子', '辛亥']));
  assert.equal(noJia.rule.id, 'you-month-ren-jia-drain-soil');
  assert.deepEqual([noJia.stems.da, noJia.ji_source], [['戊'], '原文']);
  const jia = tiaohouUseful(raw(['庚申', '己酉', '壬子', '甲辰']));
  assert.ok(!jia.stems.da.includes('戊') && !jia.stems.xiao.includes('戊'));
  assert.match(jia.ji_source, /条件不成立/);
  const cold = tiaohouUseful(raw(['癸卯', '庚子', '辛巳', '丙午']));   // 辛金子月「切忌癸出冻金，而困丙火」
  assert.equal(cold.rule.id, 'zi-month-xin-gui-visible-bing-visible-no-ren');
  assert.deepEqual([cold.stems.yong, cold.stems.da], [['丙'], ['癸']]);
  const b = tiaohouUseful(calc(1969, 7, 17, 11));   // 癸水未月：忌丁火透出
  assert.equal(b.rule.id, 'wei-month-gui-ding-break-metal');
  assert.deepEqual([b.stems.da, b.ji_source], [['丁'], '原文']);
  assert.equal(Object.keys(ORIGINAL_JI).length, 7);
});

test('排盘回包并排出调候派，带大运流年顺逆；时辰不详也出', () => {
  const b = paipan({ date: '1985-08-12', time: '14:20', city: '北京', gender: 'male' }).bazi;
  const t = b.schools.tiaohou;
  assert.equal(t.school, '调候');
  assert.equal(t.luck.length, b.luck.cycles.length);
  assert.equal(t.luck[0].years.length, b.luck.cycles[0].years.length);
  const three = paipan({ date: '1985-08-12', time: null, city: '北京', gender: 'male' }).bazi.schools.tiaohou;
  assert.ok(three.abstain || three.luck.length > 0);
});
