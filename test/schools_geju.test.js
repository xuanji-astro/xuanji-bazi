// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 格局派 v1：取格、从格专旺、成败救应、相神喜忌、岁运注记。四柱都是编的结构，不对应真人。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_STEMS } from 'mingyu-core/bazi';
import { paipan } from '../src/paipan.js';
import { gejuSchool, gejuL0 } from '../src/schools/geju.js';

const raw = (ps, season = {}) => { const P = Object.fromEntries(['year', 'month', 'day', 'hour'].map((k, i) => [k, { gan: ps[i][0], zhi: ps[i][1] }])); return { pillars: P, hiddenStems: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, HIDDEN_STEMS[v.zhi]])), wuxingSeasonStatus: season, luckInfo: { cycles: [] } }; };
const G = (ps, season) => gejuSchool(raw(ps, season));

test('取格：月令本气是比劫时，先看会局——月支被两个中神半合、化财成格，月支的力量挪到财那边', () => {
  const g = G(['己酉', '丁巳', '丁酉', '辛亥']);
  assert.equal(g.name, '偏财格');
  assert.match(g.steps.取格.step, /会局/);
});

test('财格身弱难任：比劫透出是救应不是破格；相神比劫，印作闲（双面刃），忌财和官杀，生财的食伤小忌', () => {
  const g = G(['己酉', '丁巳', '丁酉', '辛亥']);
  assert.equal(g.ge_bing, '财格身弱难任');
  assert.deepEqual([g.steps.成败.status, g.steps.成败.rescue], ['破而有救', '比劫帮身任财（此时比劫是救应，不是破格）']);
  assert.deepEqual(g.stems.yong, ['丙', '丁']);
  assert.ok(!g.stems.zuo.includes('甲') && !g.stems.da.includes('甲') && !g.stems.xiao.includes('甲'), '木作闲');
  assert.deepEqual(g.stems.da, ['庚', '辛', '壬', '癸']);
});

test('正官格伤官见官：有印透出就破而有救，相神是印', () => {
  const g = G(['癸卯', '辛酉', '甲子', '丁卯']);
  assert.equal(g.name, '正官格');
  assert.deepEqual([g.steps.成败.status, g.steps.成败.hits[0], g.steps.成败.rescue], ['破而有救', '伤官见官', '有印制伤']);
  assert.deepEqual(g.stems.yong, ['壬', '癸']);
  assert.ok(g.stems.da.includes('丁'));
});

test('七杀格杀逢食制：相神食神留在喜里（不因它生财就算仇），忌财', () => {
  const g = G(['辛未', '辛卯', '己巳', '乙亥']);
  assert.deepEqual([g.name, g.steps.成败.status, g.steps.成败.hits[0]], ['七杀格', '成格', '杀逢食制']);
  assert.deepEqual(g.stems.yong, ['庚', '辛']);
  assert.deepEqual(g.stems.da, ['壬', '癸']);
});

test('伤官格见官本是破格；金水伤官（金日主生亥子丑月）喜见官', () => {
  const g = G(['壬子', '己亥', '辛酉', '丙申']);
  assert.deepEqual([g.name, g.steps.成败.status, g.steps.成败.hits[0]], ['伤官格', '成格', '金水伤官喜见官（调候条款）']);
});

test('从格：日主无根、印比力量不到 1、一方成势就从；印比有一点算假从；喜顺势、忌印比', () => {
  const g = G(['庚申', '庚申', '乙酉', '辛巳'], { 金: '旺', 土: '相', 水: '相', 木: '死', 火: '囚' });
  assert.deepEqual([g.kind, g.name, g.jia], ['从格', '从杀格', true]);
  assert.deepEqual(g.stems.yong, ['庚', '辛']);
  for (const s of ['甲', '乙', '壬', '癸', '丙', '丁']) assert.ok(g.stems.da.includes(s), s);
});

test('专旺：日主同气占全局八成以上、官杀无力', () => {
  const g = G(['乙卯', '乙卯', '乙卯', '乙卯'], { 木: '旺' });
  assert.deepEqual([g.kind, g.name], ['专旺', '曲直格']);
  assert.ok(g.stems.da.includes('庚') && g.stems.da.includes('辛'));
});

test('排盘回包并排出格局派，岁运按天干打分、注记只标不改分', () => {
  const b = paipan({ date: '1985-08-12', time: '14:20', city: '北京', gender: 'male' }).bazi;
  const g = b.schools.geju;
  assert.equal(g.school, '格局');
  if (!g.abstain) { assert.equal(g.luck.length, b.luck.cycles.length); assert.ok(g.steps.取格 || g.steps.从格专旺); }
});

test('v1.1 破格之神永不抵消：财格比劫争财、无食伤官杀＝破格无救；比劫大忌（不因它生食伤就作闲），生比劫的印小忌；顺用格财入喜', () => {
  const g = G(['甲子', '甲戌', '乙亥', '甲申']);
  assert.deepEqual([g.name, g.steps.成败.status, g.steps.成败.hits[0]], ['正财格', '破格', '比劫争财']);
  assert.deepEqual(g.stems.yong, ['丙', '丁']);
  assert.deepEqual(g.stems.da, ['甲', '乙']);
  assert.ok(g.stems.xiao.includes('壬') && g.stems.xiao.includes('癸'));
  assert.ok(g.stems.zuo.includes('戊') && g.stems.zuo.includes('己'), '顺用格：格神财入喜');
});

test('v1.1 破格无救，相神原局不透：岁运见相神标「药到」，只标不改分', () => {
  const r = raw(['甲子', '甲戌', '乙亥', '甲申']);
  r.luckInfo = { cycles: [{ ganZhi: '丙寅', year: 2000, years: [] }, { ganZhi: '壬申', year: 2010, years: [] }] };
  const g = gejuSchool(r);
  assert.ok(g.luck[0].notes?.some((n) => n.kind === '药到'));
  assert.ok(!g.luck[1].notes?.some((n) => n.kind === '药到'));
});

test('v1.2 偏印格独立成败：官杀生印成格；财不是破格之神（生官杀的财入佐），印本身和同类小忌', () => {
  const g = G(['丙戌', '庚子', '乙未', '丁亥']);
  assert.deepEqual([g.name, g.steps.成败.status], ['偏印格', '成格']);
  assert.deepEqual(g.stems.yong, ['庚', '辛']);
  assert.deepEqual(g.stems.da, []);
  assert.ok(g.stems.zuo.includes('戊') && g.stems.zuo.includes('己'));
  for (const s of ['壬', '癸']) assert.ok(!g.stems.zuo.includes(s) && g.stems.xiao.includes(s), s);
});

test('v1.2 偏印格见财＝制枭（偏印遇财，反辱为荣）：成格，相神是财', () => {
  const g = G(['丙戌', '庚子', '乙未', '戊寅']);
  assert.deepEqual([g.name, g.steps.成败.status, g.steps.成败.hits[0]], ['偏印格', '成格', '偏印遇财（制枭）']);
  assert.deepEqual(g.stems.yong, ['戊', '己']);
});

test('v1.2 佐神克相神作闲：财格用官，生财的食伤克官，不入喜也不入忌；格神财本身照喜', () => {
  const g = G(['戊子', '壬戌', '乙酉', '庚辰']);
  assert.deepEqual([g.name, g.steps.成败.hits[0]], ['正财格', '财生官']);
  for (const s of ['丙', '丁']) assert.ok(!g.stems.zuo.includes(s) && !g.stems.xiao.includes(s) && !g.stems.da.includes(s), s);
  assert.ok(g.stems.zuo.includes('戊') && g.stems.zuo.includes('己'));
});

test('v1.2 佐神撞仇作闲：正官格印护官，财生官（佐）又生七杀（仇）、又坏印，作闲；破格之神照旧大忌', () => {
  const g = G(['癸卯', '辛酉', '甲子', '丁卯']);
  for (const s of ['戊', '己']) assert.ok(!g.stems.zuo.includes(s) && !g.stems.xiao.includes(s), s);
  assert.ok(g.stems.da.includes('丁') && g.stems.da.includes('庚'));
});

test('v1.1 七杀格杀逢食制：七杀本身和同类不入喜（助虐小忌）', () => {
  const g = G(['辛未', '辛卯', '己巳', '乙亥']);
  for (const s of ['甲', '乙']) assert.ok(g.stems.xiao.includes(s), s);
});

test('v1.1 体检红线：有破格必有忌（两千张编盘逐张查）', () => {
  const JZ = Array.from({ length: 60 }, (_, i) => '甲乙丙丁戊己庚辛壬癸'[i % 10] + '子丑寅卯辰巳午未申酉戌亥'[i % 12]);
  let s = 7; const rnd = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  let checked = 0;
  for (let i = 0; i < 2000; i++) {
    const g = G(Array.from({ length: 4 }, () => JZ[Math.floor(rnd() * 60)]));
    if (!g || g.abstain || g.kind !== '正格') continue;
    if (/^破/.test(g.steps.成败.status)) { checked++; assert.ok(g.stems.da.length > 0, JSON.stringify(g.steps)); }
    assert.ok(g.stems.yong.length > 0, JSON.stringify(g.steps));
  }
  assert.ok(checked > 100);
});

test('v1.2.1 偏印格枭重逢无制：透干两个偏印又没有财制，破格；枭是破格之神大忌，相神取财', () => {
  const g = G(['癸巳', '甲子', '乙未', '癸未']);   // v1.3 起原来那张（年柱癸卯）印比过 70% 线，翻成假从强，见下面从强那几条
  assert.deepEqual([g.name, g.steps.成败.status, g.steps.成败.hits[0], g.ge_bing], ['偏印格', '破格', '枭重逢无制', '枭重逢无制']);
  assert.deepEqual(g.stems.da, ['癸']);
  assert.deepEqual(g.stems.yong, ['戊', '己']);
});

test('v1.2.1 配置有疵：财格配印，财印在年月两干挨着＝相碍，成败层标注，喜忌不动格神', () => {
  const g = G(['戊辰', '壬戌', '乙卯', '戊寅']);
  assert.deepEqual([g.name, g.steps.成败.hits[0], g.steps.成败.flaw], ['正财格', '财格配印', '财印相碍，配置有疵']);
  assert.ok(g.stems.zuo.includes('戊') || g.stems.yong.includes('戊'));
});

test('v1.2.1 格病：破格的盘附上破在哪（给投票层跟扶抑派的强弱之病对表）', () => {
  assert.equal(G(['甲子', '甲戌', '乙亥', '甲申']).ge_bing, '比劫争财');
});

// v1.3 从强（10-08 命理组定）：四柱都是编的
const withLuck = (ps, cycles, season = {}) => ({ ...raw(ps, season), luckInfo: { cycles } });
const yearOf = (g, y) => g.luck.flatMap((c) => c.years).find((x) => x.year === y);

test('v1.3 真从强：印比连日主 ≥85%，克泄方无本气根、无透干；喜印比、食伤小喜、忌财官', () => {
  const g = G(['壬子', '癸卯', '乙亥', '甲子']);
  assert.deepEqual([g.kind, g.name, !!g.jia], ['从强', '从强格', false]);
  assert.equal(g.steps.从格专旺.从强.share, 1);
  assert.deepEqual(g.stems.yong, ['甲', '乙', '壬', '癸']);
  assert.deepEqual(g.stems.zuo, ['丙', '丁']);
  assert.deepEqual(g.stems.da, ['戊', '己', '庚', '辛']);
});

test('v1.4 假从强：占比 ≥75%、克泄方只有微根弱透（单点 <1.5），直接翻面', () => {
  const g = G(['癸卯', '甲子', '甲寅', '癸未']);
  assert.deepEqual([g.kind, g.jia, g.qiang_doubt], ['从强', true, undefined]);
  assert.deepEqual([g.steps.从格专旺.从强.share, g.steps.从格专旺.从强.kx_root, g.steps.从格专旺.从强.kx_point], [0.81, true, 1]);
  assert.equal(G(['癸巳', '甲子', '乙未', '癸未']).kind, '正格', '不到 70% 照旧走正格');
});

test('v1.4 从强疑似：占比 0.70～0.75 照正格走、页面不出从强喜忌；从强读法另附给投票层核', () => {
  const g = G(['癸卯', '甲子', '甲戌', '癸未']);
  assert.deepEqual([g.kind, g.name, g.steps.从格专旺.从强.share, g.steps.从格专旺.从强.doubt], ['正格', '正印格', 0.72, true]);
  assert.deepEqual([g.qiang_doubt.kind, g.qiang_doubt.doubt, g.qiang_doubt.jia], ['从强', true, true]);
  assert.deepEqual(g.qiang_doubt.stems.da, ['戊', '己', '庚', '辛']);
  assert.equal(G(['癸卯', '甲子', '甲寅', '癸未']).qiang_doubt, undefined);
});

test('v1.3 专旺、从强两条门槛都过时专旺优先', () => {
  assert.equal(G(['乙卯', '乙卯', '乙卯', '乙卯']).kind, '专旺');
});

test('v1.3 假从强：岁运带来财、官杀之根记「破从强」，只标不改分', () => {
  const g = gejuSchool(withLuck(['癸卯', '甲子', '甲寅', '癸未'], [{ ganZhi: '丙寅', year: 2000, years: [{ year: 2001, ganZhi: '辛巳' }, { year: 2002, ganZhi: '壬辰' }, { year: 2003, ganZhi: '癸亥' }] }]));
  assert.ok(yearOf(g, 2002).notes.some((n) => n.kind === '破从强'), '辰（本气戊＝财）');
  assert.ok(!(yearOf(g, 2003).notes ?? []).some((n) => n.kind === '破从强'), '亥是印');
});

test('v1.4 从强例外：财官的流年字不进遭遇层——辰子半合化水也不改姓、戊被癸合也不算，出现即按大忌', () => {
  const g = gejuSchool(withLuck(['癸卯', '甲子', '甲寅', '癸未'], [{ ganZhi: '丙寅', year: 2000, years: [{ year: 2000, ganZhi: '戊辰' }] }], { 水: '旺' }));
  const y = yearOf(g, 2000);
  assert.deepEqual([y.score, y.tier], [38, 4]);
  assert.deepEqual(y.notes.map((n) => n.kind), ['破从强']);
});

test('运年合看第 1 类（v1.4 收窄）：大运挂着财印交战，流年支跟运支冲刑破才点燃；交战一方透干不算扳机', () => {
  const g = gejuSchool(withLuck(['己酉', '丁巳', '丁酉', '辛亥'], [{ ganZhi: '乙卯', year: 2010, years: [{ year: 2014, ganZhi: '甲午' }, { year: 2012, ganZhi: '甲辰' }, { year: 2017, ganZhi: '辛酉' }] }]));
  assert.ok(g.luck[0].notes.some((n) => n.kind === '财印交战'));
  const y14 = yearOf(g, 2014), y12 = yearOf(g, 2012), y17 = yearOf(g, 2017);
  assert.ok(y14.tier >= 3 && y14.notes.some((n) => n.kind === '点燃' && /午破运支卯/.test(n.why.join())));
  const lit = y14.notes.find((n) => n.kind === '点燃');
  assert.match(lit.why[0], /^乙卯运财印交战（.+）$/, '点燃要说得出哪步运、什么病、病因');
  assert.deepEqual([lit.run, lit.src.map((s) => s.kind), lit.trig], ['乙卯', ['财印交战'], [{ how: '破', zhi: '午', to: '卯', at: '运' }]], '结构化给文字层按派重说');
  assert.ok(!(y12.notes ?? []).some((n) => n.kind === '点燃'), '甲透出印、辰卯不冲刑破：不点');
  assert.ok(y17.tier >= 3 && y17.notes.some((n) => n.kind === '点燃' && /酉冲运支卯/.test(n.why.join())));
});

test('v1.4 交战、破格、破从是原局结构，三派共用（gejuL0）；破从强是从强的私见，不共用', () => {
  const l0 = gejuL0(withLuck(['己酉', '丁巳', '丁酉', '辛亥'], []));
  assert.deepEqual(l0.notes('乙卯').map((n) => n.kind), ['财印交战']);
  assert.ok(l0.ignite('乙卯')(['甲', '午']));
  assert.equal(l0.ignite('乙卯')(['甲', '辰']), null);
  const q = gejuL0(withLuck(['癸卯', '甲子', '甲寅', '癸未'], []));
  assert.deepEqual(q.notes('戊辰'), []);
});

