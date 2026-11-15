// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 扶抑派 v1：先看病在哪再定药；中和不表态；三档并排出，现有的混合版喜忌不动。四柱都是编的结构，不对应真人。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_STEMS } from 'mingyu-core/bazi';
import { paipan } from '../src/paipan.js';
import { fuyiUseful, forcesOf } from '../src/schools/fuyi.js';

const raw = (pillars, { commander = null, season = {} } = {}) => {
  const P = Object.fromEntries(['year', 'month', 'day', 'hour'].map((k, i) => [k, { gan: pillars[i][0], zhi: pillars[i][1] }]));
  const H = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, HIDDEN_STEMS[v.zhi]]));
  return { pillars: P, hiddenStems: H, monthCommander: commander, wuxingSeasonStatus: season };
};

test('身弱官杀重：用印、喜比劫，忌官杀、仇财', () => {
  const u = fuyiUseful(raw(['庚申', '辛酉', '甲午', '庚午']), '弱');
  assert.equal(u.ill, '官杀');
  assert.deepEqual(u.favorableWuxing, ['水', '木']);
  assert.deepEqual(u.unfavorableWuxing, ['金', '土']);
  assert.equal(u.useful, '印星');
});

test('身弱财重：用比劫、喜印；印也透干＝财印有战，单用比劫', () => {
  const plain = fuyiUseful(raw(['辛酉', '癸酉', '丁酉', '庚子']), '弱');
  assert.equal(plain.ill, '财');
  assert.deepEqual(plain.favorableWuxing, ['火', '木']);
  const war = fuyiUseful(raw(['辛酉', '癸酉', '丁酉', '甲子']), '弱');
  assert.deepEqual(war.favorableWuxing, ['火']);
  assert.match(war.why, /财印有战/);
  assert.ok(!war.unfavorableWuxing.includes('木'), '印不取也不进忌（作闲）');
});

test('身强印多：用财破印、喜食伤；比劫多用官杀；中和不表态', () => {
  const yin = fuyiUseful(raw(['壬子', '癸亥', '甲寅', '壬申']), '强');
  assert.equal(yin.ill, '印');
  assert.deepEqual(yin.favorableWuxing.slice(0, 1), ['土']);
  const bi = fuyiUseful(raw(['甲寅', '乙卯', '甲寅', '乙亥']), '强');
  assert.equal(bi.ill, '比劫');
  assert.equal(bi.favorableWuxing[0], '金');
  assert.deepEqual(fuyiUseful(raw(['甲寅', '乙卯', '甲寅', '乙亥']), '中').abstain, true);
});

test('没有单一重病时司令排整组先后；有单一重病时用神不动，只排次取', () => {
  const mixed = raw(['甲子', '丙寅', '庚辰', '戊子'], { commander: '甲' });
  const a = fuyiUseful(mixed, '弱');
  if (a.ill === null) assert.equal(a.favorableWuxing[0], '土', '无单一重病，司令甲（木）不在印比里就照印先');
  const ill = fuyiUseful(raw(['庚申', '辛酉', '甲午', '庚午'], { commander: '甲' }), '弱');
  assert.deepEqual(ill.favorableWuxing, ['水', '木'], '用神印不被司令挤掉');
});

test('力量：透干、本气、藏干、月令都算进去', () => {
  const f = forcesOf(raw(['庚申', '辛酉', '甲午', '庚午']));
  assert.ok(f['金'] > f['火'] && f['火'] > f['土']);
});

test('排盘回包并排出扶抑派：强、弱两档带大运顺逆，中和不表态；混合版 usefulGods 原样', () => {
  const b = paipan({ date: '1985-08-12', time: '14:20', city: '北京', gender: 'male' }).bazi;
  const f = b.schools.fuyi;
  assert.equal(f.school, '扶抑');
  assert.equal(f.sides['中'].abstain, true);
  for (const s of [f.sides['弱'], f.sides['强']]) {
    assert.equal(s.luck.length, b.luck.cycles.length);
    assert.equal(s.luck[0].years.length, b.luck.cycles[0].years.length);
  }
  assert.ok(Array.isArray(b.usefulGods.favorableWuxing));
  const three = paipan({ date: '1985-08-12', time: null, city: '北京', gender: 'male' }).bazi.schools.fuyi;
  assert.ok(three.sides['弱'].luck.length > 0, '时辰不详的三柱盘也出');
});

// 制衡扫描（命理组 10-10）：身强印多，官杀生印本该作仇；财有力制印＝官杀免罪、回喜（喜中带压），印照旧忌
test('身强印多＋财透干制印：官杀回喜，忌只剩印；没有财制印就照旧连坐', () => {
  const ok = fuyiUseful(raw(['戊戌', '己未', '辛丑', '甲午']), '强');
  assert.equal(ok.ill, '印');
  assert.ok(ok.favorableWuxing.includes('火'), '官杀（火）该回喜');
  assert.deepEqual(ok.unfavorableWuxing, ['土']);
  assert.equal(ok.scan.verdict, '免罪');
  assert.equal(ok.scan.place, '回喜（喜中带压）');
  const no = fuyiUseful(raw(['戊戌', '己未', '辛丑', '己丑']), '强');
  assert.equal(no.ill, '印');
  assert.ok(!no.favorableWuxing.includes('火'));
  assert.deepEqual(no.unfavorableWuxing, ['土', '火']);
  assert.equal(no.scan.verdict, '定罪');
  // 命理组 10-10：只占通根（地支本气，不透不当令）＝药在库，不算有力
  const store = fuyiUseful(raw(['戊戌', '己未', '辛丑', '己卯']), '强');
  assert.equal(store.ill, '印');
  assert.equal(store.scan.verdict, '定罪');
  assert.ok(store.scan.inStore);
  assert.deepEqual(store.unfavorableWuxing, ['土', '火']);
});
