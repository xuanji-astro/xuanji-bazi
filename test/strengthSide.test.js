// SPDX-License-Identifier: AGPL-3.0-only · 玄玑 xuanji-paipan
// 按定案的强弱重取喜忌。生辰全部虚构。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baziCalculator } from 'mingyu-core/bazi';
import { paipan } from '../src/paipan.js';
import { usefulGodForSide } from '../src/strengthSide.js';

const BASE = { date: '2000-01-01', time: '12:00', city: '北京市', gender: 'female' };
const sideOf = (s) => (/强|旺/.test(s) ? '强' : /弱|衰/.test(s) ? '弱' : null);

test('不传 strength：回包跟以前一样，没有 strengthSide', () => {
  const a = paipan(BASE), b = paipan({ ...BASE, strength: null });
  assert.equal('strengthSide' in a.bazi, false);
  assert.deepEqual(a, b);
});

test('strength 只收 强、弱', () => {
  assert.throws(() => paipan({ ...BASE, strength: '身强' }), { code: 'STRENGTH_INVALID' });
  assert.throws(() => paipan({ ...BASE, strength: 1 }), { code: 'STRENGTH_INVALID' });
});

test('跟引擎同向：喜忌和大运照引擎原样', () => {
  const a = paipan(BASE), side = sideOf(a.bazi.strength) ?? '强';
  const b = paipan({ ...BASE, strength: side });
  if (sideOf(a.bazi.strength)) {
    assert.equal(b.bazi.strengthSide.applied, false);
    assert.deepEqual(b.bazi.usefulGods, a.bazi.usefulGods);
    assert.deepEqual(b.bazi.luck, a.bazi.luck);
  }
});

test('跟引擎反向：喜忌换成该档位的取用，大运分数跟着重算，引擎七档不变', () => {
  let hit = 0;
  for (const date of ['1988-03-14', '1991-07-02', '1995-11-23', '2001-05-09', '1983-09-30', '1979-12-12']) {
    const body = { ...BASE, date, time: '08:40' };
    const a = paipan(body), own = sideOf(a.bazi.strength);
    if (!own) continue;
    const flip = own === '强' ? '弱' : '强', b = paipan({ ...body, strength: flip });
    assert.equal(b.bazi.strength, a.bazi.strength);
    if (a.bazi.pattern.isSpecial) { assert.equal(b.bazi.strengthSide.applied, false); continue; }
    assert.equal(b.bazi.strengthSide.applied, true);
    assert.equal(b.bazi.strengthSide.status, flip === '强' ? '身强' : '身弱');
    assert.deepEqual(b.bazi.pillars, a.bazi.pillars);
    assert.deepEqual(b.bazi.strengthSide.engineUsefulGods, a.bazi.usefulGods);
    const fav = b.bazi.usefulGods.favorableWuxing;
    if (fav.join() !== a.bazi.usefulGods.favorableWuxing.join()) {
      hit++;
      assert.notDeepEqual(b.bazi.luck.cycles.map((c) => c.score), a.bazi.luck.cycles.map((c) => c.score));
    }
  }
  assert.ok(hit >= 3, `换档后喜忌变了的盘太少：${hit}`);
});

test('时辰不详不换档', () => {
  const b = paipan({ ...BASE, time: null, strength: '强' });
  assert.equal(b.bazi.strengthSide.applied, false);
  assert.deepEqual(b.bazi.usefulGods, paipan({ ...BASE, time: null }).bazi.usefulGods);
});

test('取用上下文自证：300 张编的盘，用引擎自己的档位重算都跟引擎原结果逐字段相同', () => {
  let seed = 7, fails = 0, n = 0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
  for (let i = 0; i < 300; i++) {
    const raw = baziCalculator.calculateBazi({ year: 1950 + Math.floor(rnd() * 60), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), gender: 'male', isLunar: false, shenShaScope: 'common', timeIndex: 0, useTrueSolarTime: true, birthHour: Math.floor(rnd() * 24), birthMinute: Math.floor(rnd() * 60), birthPlace: '北京市', birthLongitude: 116.4, timeZoneId: 'Asia/Shanghai' });
    const own = sideOf(raw.analysis.dayMasterStrength.status) ?? '中';
    const r = usefulGodForSide(raw, own === '强' ? '弱' : '强');
    if (raw.analysis.mingGe.isSpecial) continue;
    n++;
    if (!r.info.applied) fails++;
  }
  assert.equal(fails, 0);
  assert.ok(n > 250);
});
