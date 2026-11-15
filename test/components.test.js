// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 组件算法测试。全部用虚构干支，不含任何真人生辰。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartFromGanZhi } from '../src/chart.js';
import { wuxingRing, classify, strengthType, strengthBasis } from '../src/components/wuxingRing.js';
import { tenGodBar } from '../src/components/tenGodBar.js';
import { shenshaPanel } from '../src/components/shensha.js';
import { scoreGanZhi } from '../src/components/luck.js';
import { fixShenshaTables } from '../src/shenshaFix.js';

const FOUR = { year: '丙午', month: '庚寅', day: '戊子', hour: '癸亥' };

test('十神条：扁平计数、日主不计、固定顺序、零值保留', () => {
  const bar = tenGodBar(chartFromGanZhi(FOUR));
  // 3 个天干（去掉日主）+ 午2 寅3 子1 亥2 = 11
  assert.equal(bar.total, 11);
  assert.deepEqual(
    bar.rows.map((r) => r.tenGod),
    ['比肩', '劫财', '食神', '伤官', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
  );
  assert.equal(bar.rows.length, 10);
  for (const r of bar.rows) assert.equal(r.percent, Math.floor((r.count * 100) / 11));
  assert.ok(bar.sum <= 100);
});

test('十神条：去尾取整不被浮点误差多砍', () => {
  // 3/7、4/7 这类除不尽的去尾
  const bar = tenGodBar(chartFromGanZhi({ year: '甲子', month: '甲子', day: '庚子', hour: '甲子' }));
  const zhengcai = bar.rows.find((r) => r.tenGod === '偏财');
  const shangguan = bar.rows.find((r) => r.tenGod === '伤官');
  assert.equal(bar.total, 7);
  assert.equal(zhengcai.count, 3);
  assert.equal(shangguan.count, 4);
  assert.equal(shangguan.percent, 57);
});

test('五行环：总和 100，日主挂在本行最后', () => {
  const ring = wuxingRing(chartFromGanZhi(FOUR));
  assert.equal(ring.rows.reduce((s, r) => s + r.percent, 0), 100);
  const earth = ring.rows.find((r) => r.element === '土');
  assert.equal(earth.tenGods.at(-1), '日主');
});

test('五行环：两个藏干的地支按 0.7 / 0.3', () => {
  // 只有午（丁己）：天干 4 个
  const ring = wuxingRing(chartFromGanZhi({ year: '丙午', month: '丙午', day: '丙午', hour: '丙午' }));
  const fire = ring.rows.find((r) => r.element === '火');
  const earth = ring.rows.find((r) => r.element === '土');
  // 火 = 4 + 4×0.7 = 6.8，土 = 4×0.3 = 1.2，合计 8
  assert.equal(fire.exact, 85);
  assert.equal(earth.exact, 15);
});

test('五行环：时辰不详只算三柱', () => {
  const ring = wuxingRing(chartFromGanZhi({ ...FOUR, hour: null }));
  assert.equal(ring.rows.reduce((s, r) => s + r.percent, 0), 100);
  const bar = tenGodBar(chartFromGanZhi({ ...FOUR, hour: null }));
  assert.equal(bar.total, 2 + 2 + 3 + 1);
});

test('类型标签阈值', () => {
  assert.equal(classify({ 木: 20, 火: 20, 土: 20, 金: 20, 水: 20 }).type, '均衡型');
  assert.equal(classify({ 木: 40, 火: 15, 土: 15, 金: 15, 水: 15 }).type, '均衡型');
  assert.equal(classify({ 木: 45, 火: 15, 土: 15, 金: 15, 水: 10 }).type, '木旺型');
  assert.equal(classify({ 木: 5, 火: 10, 土: 10, 金: 60, 水: 15 }).type, '极强型');
});

function withShensha(pillars, shensha) {
  const chart = chartFromGanZhi(pillars);
  for (const key of Object.keys(shensha)) chart.pillars[key].shensha = shensha[key];
  for (const key of Object.keys(chart.pillars)) chart.pillars[key] && (chart.pillars[key].shensha ??= []);
  return chart;
}

test('神煞图谱：权重求和、封顶 99、没命中的维度不出', () => {
  const chart = withShensha(FOUR, {
    year: ['天乙贵人', '天德贵人'],
    month: ['月德贵人', '天乙贵人'],
    day: ['太极贵人', '华盖', '十灵日', '童子煞'],
    hour: ['勾绞煞'],
  });
  const panel = shenshaPanel(chart);
  const byName = Object.fromEntries(panel.dimensions.map((d) => [d.name, d]));
  assert.equal(byName['贵人'].score, 35 + 33 + 25);
  assert.equal(byName['慧根'].score, 99);
  assert.equal(byName['考验'].score, 15);
  assert.equal(byName['才华'], undefined);
  assert.equal(byName['贵人'].tier, 0);
  assert.equal(byName['考验'].tier, 3);
  const tianyi = panel.all.find((s) => s.name === '天乙贵人');
  assert.deepEqual(tianyi.pillars, ['year', 'month']);
});

test('劫煞、亡神按三合局古法重算', () => {
  // 年支卯（亥卯未木局）：劫煞在申、亡神在寅
  const chart = withShensha(
    { year: '丁卯', month: '戊申', day: '甲子', hour: '丙寅' },
    { month: ['亡神'], hour: ['劫煞'] },
  );
  fixShenshaTables(chart);
  assert.ok(chart.pillars.month.shensha.includes('劫煞'));
  assert.ok(!chart.pillars.month.shensha.includes('亡神'));
  assert.ok(chart.pillars.hour.shensha.includes('亡神'));
  assert.ok(!chart.pillars.hour.shensha.includes('劫煞'));
});

test('大运分：方案 A（喜忌 ×8，十神项不计）', () => {
  const useful = {
    primaryFavorableWuxing: '水',
    favorableWuxing: ['水', '木'],
    primaryUnfavorableWuxing: '土',
    unfavorableWuxing: ['土', '金'],
    useful: '食伤',
    avoid: '印星',
  };
  // 日主辛：癸亥 干支本气都是第一喜用 → 70 + 8×4 = 102，夹到 98
  assert.equal(scoreGanZhi('癸亥', '辛', useful), 98);
  // 戊辰 干支本气都是第一忌 → 70 − 32 = 38，落在最低档
  assert.equal(scoreGanZhi('戊辰', '辛', useful), 38);
  // 甲寅 都是次喜 → 70 + 16
  assert.equal(scoreGanZhi('甲寅', '辛', useful), 86);
  // 辛酉 都是次忌 → 70 − 16
  assert.equal(scoreGanZhi('辛酉', '辛', useful), 54);
  assert.equal(scoreGanZhi('甲寅', '辛', {}), null);
});

test('福星贵人按原诀重算，去掉引擎误标的岁神「福星」', () => {
  // 年干甲、日干辛：福星贵人只在寅、子、巳；未不是
  const chart = withShensha(
    { year: '甲戌', month: '辛未', day: '辛亥', hour: '乙未' },
    { month: ['福星贵人'], hour: ['福星贵人'] },
  );
  fixShenshaTables(chart);
  for (const k of ['year', 'month', 'day', 'hour']) assert.ok(!chart.pillars[k].shensha.includes('福星贵人'), k);
  // 年干庚：午上有福星贵人，引擎没标也要补上
  const c2 = withShensha({ year: '庚午', month: '丙午', day: '甲申', hour: '丙寅' }, {});
  fixShenshaTables(c2);
  assert.ok(c2.pillars.year.shensha.includes('福星贵人'));
  assert.ok(c2.pillars.hour.shensha.includes('福星贵人'));   // 日干甲：寅
});

test('天乙贵人用「庚辛逢马虎」版：庚日看午、寅', () => {
  const c = withShensha({ year: '丁巳', month: '丙午', day: '庚申', hour: '庚辰' }, {});
  fixShenshaTables(c);
  assert.ok(c.pillars.month.shensha.includes('天乙贵人'));   // 午
  assert.ok(!c.pillars.hour.shensha.includes('天乙贵人'));  // 辰不是
});

test('羊刃只认阳干：阴干日主在帝旺位不出羊刃，阳干照旧（10-06 命理组定）', () => {
  // 丁日巳月：引擎按帝旺位标了羊刃，阴干去掉
  const yin = withShensha({ year: '甲子', month: '己巳', day: '丁卯', hour: '庚子' }, { month: ['羊刃', '将星'] });
  fixShenshaTables(yin);
  assert.ok(!yin.pillars.month.shensha.includes('羊刃'));
  assert.ok(yin.pillars.month.shensha.includes('将星'));   // 别的星不动
  // 丙日午月：阳干，羊刃留着
  const yang = withShensha({ year: '甲子', month: '庚午', day: '丙寅', hour: '戊子' }, { month: ['羊刃'] });
  fixShenshaTables(yang);
  assert.ok(yang.pillars.month.shensha.includes('羊刃'));
});

test('大运卡周岁：起运周岁取「出生后 N 年」，每步加十，起止年写到下一步交运那年（10-06 命理组定）', async () => {
  const { luckCycles } = await import('../src/components/luck.js');
  const raw = { luckInfo: { startInfo: '出生后 3 年 8 月 5 天 起运', cycles: [
    { ganZhi: '丙辰', age: 5, year: 1997, years: [{ year: 1997, age: 5, ganZhi: '丁丑' }] },
    { ganZhi: '乙卯', age: 15, year: 2007, years: [{ year: 2007, age: 15, ganZhi: '丁亥' }] }] } };
  const L = luckCycles(raw, '丁', {}, 1993);
  assert.equal(L.cycles[0].label, '3 周岁起运 · 丙辰（1997–2007）');
  assert.equal(L.cycles[1].label, '13 周岁交运 · 乙卯（2007–2017）');
  assert.deepEqual([L.cycles[0].startAgeFull, L.cycles[0].years[0].ageFull], [3, 4]);
  assert.equal(L.cycles[0].startAge, 5);   // 引擎虚岁留着兼容，界面不用
  assert.equal(luckCycles({ luckInfo: { startInfo: '', cycles: raw.luckInfo.cycles } }, '丁', {}, null).cycles[0].label, '丙辰（1997–2007）');
});

test('学堂按日柱纳音再查一次', () => {
  const c = withShensha({ year: '甲子', month: '乙亥', day: '壬子', hour: '甲辰' }, {});
  c.pillars.day.nayin = '桑柘木';   // 木长生在亥
  fixShenshaTables(c);
  assert.ok(c.pillars.month.shensha.includes('学堂'));
});

test('德秀贵人取古法口径的结果', () => {
  const c = withShensha({ year: '甲戌', month: '辛未', day: '辛亥', hour: '乙未' }, { year: ['德秀贵人'], hour: ['德秀贵人'] });
  fixShenshaTables(c, { shensha: { year: [], month: [], day: [], hour: ['德秀贵人'] } });
  assert.ok(!c.pillars.year.shensha.includes('德秀贵人'));
  assert.ok(c.pillars.hour.shensha.includes('德秀贵人'));
});

test('类型标签：引擎七档映射', () => {
  const st = (status) => strengthType({ status }).type;
  assert.deepEqual(['极强', '身强', '偏强', '中和', '偏弱', '身弱', '极弱'].map(st),
    ['极强型', '身强型', '偏强型', '均衡型', '偏弱型', '偏弱型', '偏弱型']);
  assert.equal(st('未知'), null);
  assert.equal(strengthType(null).type, null);
  assert.equal(strengthType({ status: '身强' }, false).type, null);   // 时辰不详不给标签
});

test('身强弱依据：从引擎 ruleBasis 读出月令／通根／得势', () => {
  const mk = (month, strong, has, momentum) => ({ status: '身强', details: { hasStrongRoot: strong, hasRoot: has, ruleBasis: [`月令与司令合看为${month}；通根条件为相持；成局、明根明透及中余气合看为${momentum}`] } });
  assert.deepEqual(strengthBasis(mk('扶身', false, true, '扶身')), { month: '扶身', root: 'has', momentum: '扶身' });
  assert.deepEqual(strengthBasis(mk('制身', true, true, '相持')), { month: '制身', root: 'strong', momentum: '相持' });
  assert.equal(strengthBasis(mk('扶身', true, true, '扶身'), false), null);   // 时辰不详不给
  assert.equal(strengthBasis({ status: '未知', details: { ruleBasis: [] } }), null);
});
