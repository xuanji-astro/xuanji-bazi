// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 流盘：六十甲子整列、地势≠自坐、小运顺逆、流月十二节、出生节气（全部虚构生辰）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liupan, liuyue, birthTerm, monthTable } from '../src/liupan.js';
import { paipan } from '../src/paipan.js';

const natal = { year: '癸卯', month: '辛酉', day: '壬午', hour: '辛丑' };

test('六十甲子各一列；地势看日主、自坐看本柱天干', () => {
  const r = liupan({ natal, birthYear: 1963, gender: 'male' });
  assert.equal(Object.keys(r.cols).length, 60);
  assert.equal(r.cols['癸卯'].lifeStage, '死');    // 壬 在卯 死
  assert.equal(r.cols['癸卯'].ziZuo, '长生');      // 癸 在卯 长生
  assert.equal(r.cols['辛丑'].tenGod, '正印');
});

test('运上神煞：跟本命同一套查法；柱位专属的不出现', () => {
  const r = liupan({ natal, birthYear: 1963, gender: 'male' });
  assert.deepEqual(r.cols['辛丑'].shensha, ['福星贵人', '金舆', '寡宿', '吊客']);   // 跟本命时柱一致
  for (const c of Object.values(r.cols)) for (const n of ['十灵日', '童子煞', '魁罡', '六秀日']) assert.ok(!c.shensha.includes(n));
});

test('小运：时柱起；阴年生男逆排，阳年生男顺排；时辰不详没有小运', () => {
  const back = liupan({ natal, birthYear: 1963, gender: 'male' });
  assert.equal(back.forward, false);
  assert.equal(back.years[0].xiaoyun, '庚子');
  const fwd = liupan({ natal, birthYear: 1963, gender: 'female' });
  assert.equal(fwd.forward, true);
  assert.equal(fwd.years[0].xiaoyun, '壬寅');
  const none = liupan({ natal: { ...natal, hour: null }, birthYear: 1963, gender: 'male' });
  assert.equal(none.years[0].xiaoyun, null);
  assert.equal(back.years[0].age, 1);
  assert.equal(back.years[63].ganZhi, '丙午');   // 2026
});

test('流月：立春起十二个节，月干支五虎遁', () => {
  const m = liuyue(2026);
  assert.equal(m.length, 12);
  assert.deepEqual([m[0].term, m[0].date, m[0].ganZhi], ['立春', '2.4', '庚寅']);
  assert.deepEqual([m[11].term, m[11].ganZhi], ['小寒', '辛丑']);
  const t = monthTable(2099, 5);
  assert.deepEqual(Object.keys(t), ['2099', '2100']);   // 引擎节气表到 2100
});

test('出生节气：落在哪个节之后多久；时辰不详只到天', () => {
  assert.deepEqual(birthTerm({ year: 1963, month: 10, day: 6, hour: 2, minute: 28 }), { name: '白露', time: '1963.09.08 17:11', days: 27, hours: 9 });
  assert.equal(birthTerm({ year: 1990, month: 8, day: 21 }).hours, null);
  assert.equal(birthTerm({ year: 1961, month: 1, day: 19, hour: 22, minute: 5 }).name, '小寒');   // 一月出生落在上一年的小寒月
});

test('接口带上流盘和出生节气；本命地势不再等于自坐', () => {
  const r = paipan({ date: '1963-10-06', time: '02:30', city: '北京市', gender: 'male' });
  assert.ok(r.bazi.liupan.cols['甲子']);
  assert.ok(r.bazi.liupan.qiyun.date);
  assert.equal(r.input.birthTerm.name, '白露');
  const P = r.bazi.pillars;
  assert.ok(['year', 'month', 'hour'].some((k) => P[k].lifeStage !== P[k].ziZuo));
  assert.equal(P.year.lifeStage, '死');
  assert.deepEqual(r.bazi.wuxingSeason, { 金: '旺', 水: '相', 木: '死', 火: '囚', 土: '休' });   // 酉月
});

test('参数：胎元胎息命宫身宫命卦；时辰不详不给命宫身宫', () => {
  const r = paipan({ date: '1963-10-06', time: '02:30', city: '北京市', gender: 'male' });
  const p = r.bazi.params;
  for (const k of ['taiYuan', 'taiXi', 'mingGong', 'shenGong']) assert.match(p[k], /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  assert.ok(p.mingGua.gua && /[东西]四命/.test(p.mingGua.eastWest));
  const n = paipan({ date: '1990-08-21', time: null, city: '北京市', gender: 'female' }).bazi.params;
  assert.equal(n.mingGong, null);
  assert.equal(n.shenGong, null);
  assert.ok(n.taiYuan && n.taiXi);
});
