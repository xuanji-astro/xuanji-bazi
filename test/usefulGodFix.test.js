// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 喜忌上游修正：身弱档调候不压扶抑（10-06 规则 v0）；调候挪空忌组时放回调候序列末位（10-04 定案）。生辰全部虚构。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paipan } from '../src/paipan.js';
import { fixUsefulGod, isClimateUseful, weakClimate } from '../src/usefulGodFix.js';

// 10-04 改前这 7 张忌组为空、五行全喜；back＝该放回的五行。
// 10-06 起身弱档先走「调候不压扶抑」，原来那 5 张庚日巳月偏弱的不再挪空忌组，挪到下面 WEAK_CLIMATE 里验；这里只剩身强、中和的
const EMPTIED = [
  { date: '1964-09-08', time: '23:30', gender: 'male', back: '金' }, // 辛日酉月身强，调候 土→金→水
  { date: '1989-02-06', time: '00:30', gender: 'female', back: '火' }, // 丁日寅月中和，调候 木→火
];

for (const c of EMPTIED) {
  test(`调候挪空忌组的盘放回一个忌：${c.date} ${c.time}`, () => {
    const u = paipan({ date: c.date, time: c.time, city: '北京', gender: c.gender }).bazi.usefulGods;
    assert.deepEqual(u.unfavorableWuxing, [c.back]);
    assert.equal(u.primaryUnfavorableWuxing, c.back);
    assert.equal(u.favorableWuxing.length, 4);
    assert.ok(!u.favorableWuxing.includes(c.back), '喜忌两组互斥');
    assert.equal(u.primaryFavorableWuxing, u.favorableWuxing[0]);
    assert.notEqual(u.avoid, '暂无');
  });
}

// 身弱档调候不压扶抑（10-06 规则 v0）：庚日巳月偏弱，调候 火→木→水。木（财）、水（食伤）泄耗不进喜；
// 火（官杀）克身，局里有土（印）通关作次喜。扶抑喜土金，司令是金就金在前。
const WEAK_CLIMATE = [
  { date: '2008-05-10', time: '12:30', gender: 'female', fav: ['金', '土', '火'] },
  { date: '1997-05-08', time: '21:30', gender: 'male', fav: ['土', '金', '火'] },
  { date: '1983-06-01', time: '05:30', gender: 'male', fav: ['土', '金', '火'] },
  { date: '1972-05-29', time: '14:30', gender: 'female', fav: ['土', '金', '火'] },
  { date: '1961-05-26', time: '23:30', gender: 'male', fav: ['土', '金', '火'] },
];
for (const c of WEAK_CLIMATE) {
  test(`身弱档调候不压扶抑：${c.date} ${c.time}`, () => {
    const u = paipan({ date: c.date, time: c.time, city: '北京', gender: c.gender }).bazi.usefulGods;
    assert.deepEqual(u.favorableWuxing, c.fav);
    assert.deepEqual(u.unfavorableWuxing, ['水', '木']);
    assert.equal(u.climateUseful, false, '用神回到扶抑，不再是调候取用');
  });
}

test('命理组 例盘（辛日亥月）换到身弱档：喜土金、次喜火，忌水木，用神印', () => {
  const b = { date: '1998-11-10', time: '12:00', city: '杭州市西湖区', gender: 'female' };
  const own = paipan(b).bazi.usefulGods, weak = paipan({ ...b, strength: '弱' }).bazi.usefulGods;
  assert.deepEqual([own.favorableWuxing, own.unfavorableWuxing], [['水', '火', '木'], ['土', '金']], '原档偏强，身强档不动');
  assert.deepEqual([weak.favorableWuxing, weak.unfavorableWuxing, weak.useful], [['土', '金', '火'], ['水', '木'], '印星']);
});

test('身弱档规则本身：泄耗不进喜；克身有印作次喜、没印不进；帮身不抢首位；身强档、特殊格局不动', () => {
  const u = (order, extra = {}) => ({ favorableWuxing: [...order, '土', '金'].filter((x, i, a) => a.indexOf(x) === i), unfavorableWuxing: ['水', '木', '火'].filter((x) => !order.includes(x)),
    strategyTrace: ['身弱取印比', `调候优先:${order.join(' -> ')}`], matchedRules: [{ id: 'balance-weak' }], ...extra });
  const withYin = { status: '身弱', present: new Set(['金', '土', '水']) }, noYin = { status: '身弱', present: new Set(['金', '水', '火']) };
  let r = weakClimate(u(['水', '火']), '金', withYin);
  assert.deepEqual([r.favorableWuxing, r.unfavorableWuxing], [['土', '金', '火'], ['水', '木']]);
  r = weakClimate(u(['水', '火']), '金', noYin);
  assert.deepEqual([r.favorableWuxing, r.unfavorableWuxing], [['土', '金'], ['水', '木', '火']]);
  r = weakClimate(u(['金']), '金', withYin);
  assert.deepEqual(r.favorableWuxing, ['土', '金'], '帮身的调候字排在扶抑喜神之后');
  r = weakClimate(u(['金']), '金', { ...withYin, commander: '金' });
  assert.equal(r.favorableWuxing[0], '金', '司令在扶抑喜里照旧排最前');
  const strong = u(['水', '火']);
  assert.equal(weakClimate(strong, '金', { ...withYin, status: '偏强' }), strong);
  const special = u(['水', '火'], { matchedRules: [{ id: 'follow-special-weak' }] });
  assert.equal(weakClimate(special, '金', withYin), special);
  const noClimate = { ...u([]), strategyTrace: ['身弱取印比'] };
  assert.equal(weakClimate(noClimate, '金', withYin), noClimate);
});

test('忌回来以后大运有分数下限：不再全是上／上上', () => {
  for (const c of [...EMPTIED, ...WEAK_CLIMATE]) {
    const cycles = paipan({ date: c.date, time: c.time, city: '北京', gender: c.gender }).bazi.luck.cycles;
    assert.ok(cycles.some((x) => x.score < 75), `${c.date} 大运仍全在 75 分以上`);
  }
});

test('忌组不空：原样返回，不碰', () => {
  const u = { favorableWuxing: ['火', '土'], unfavorableWuxing: ['水'], strategyTrace: ['调候优先:火'], matchedRules: [{ id: 'balance-weak' }] };
  assert.equal(fixUsefulGod(u, '土'), u);
});

test('忌组为空但取不到调候序列：不猜，原样返回', () => {
  const u = { favorableWuxing: ['火', '金', '木', '水', '土'], unfavorableWuxing: [], strategyTrace: ['身弱取印比'], matchedRules: [{ id: 'balance-weak' }] };
  assert.equal(fixUsefulGod(u, '金'), u);
});

test('调候序列没盖住扶抑的忌组（对不上）：不猜，原样返回', () => {
  const u = { favorableWuxing: ['火', '金', '木', '水', '土'], unfavorableWuxing: [], strategyTrace: ['调候优先:火 -> 木'], matchedRules: [{ id: 'balance-weak' }] };
  assert.equal(fixUsefulGod(u, '金'), u);
});

test('专旺格：扶抑忌组是财官', () => {
  // 木日专旺：忌土（财）金（官）；调候 金 -> 土 挪空后放回末位土
  const u = { favorableWuxing: ['金', '土', '水', '木', '火'], unfavorableWuxing: [], strategyTrace: ['专旺格顺势取用', '调候优先:金 -> 土'], matchedRules: [{ id: 'follow-special-strong' }] };
  const f = fixUsefulGod(u, '木');
  assert.deepEqual(f.unfavorableWuxing, ['土']);
  assert.deepEqual(f.favorableWuxing, ['金', '水', '木', '火']);
  assert.equal(f.useful, '官杀');
  assert.equal(f.avoid, '财星');
});

test('调候取用：用神按扶抑本该是忌时标出来', () => {
  const pick = (date, time, gender) => paipan({ date, time, city: '北京', gender }).bazi.usefulGods;
  const a = pick('2008-05-10', '12:30', 'female'); // 庚金偏弱：10-06 起身弱档调候不压扶抑，用神回到比劫，不再标调候取用
  assert.equal(a.useful, '比劫');
  assert.equal(a.climateUseful, false);
  const b = pick('1964-09-08', '23:30', 'male'); // 辛金身强，用神取土（印星）
  assert.equal(b.useful, '印星');
  assert.equal(b.climateUseful, true);
  assert.equal(pick('1989-04-07', '07:30', 'male').climateUseful, false); // 偏强用财星，扶抑本来就喜
});

test('调候取用只看用神那个五行是不是扶抑的忌', () => {
  const base = { strategyTrace: ['身弱取印比', '调候优先:火 -> 土'], matchedRules: [{ id: 'balance-weak' }] };
  // 土日身弱：扶抑喜火土、忌金水木。用神火＝印，本来就喜 → 不标
  assert.equal(isClimateUseful({ ...base, primaryFavorableWuxing: '火' }, '土'), false);
  // 庚日身弱：扶抑喜土金、忌水木火。用神火＝官杀，本该是忌 → 标
  assert.equal(isClimateUseful({ ...base, strategyTrace: ['身弱取印比', '调候优先:火 -> 木 -> 水'], primaryFavorableWuxing: '火' }, '金'), true);
  // 没有调候序列 → 不标
  assert.equal(isClimateUseful({ ...base, strategyTrace: ['身弱取印比'], primaryFavorableWuxing: '火' }, '金'), false);
});
