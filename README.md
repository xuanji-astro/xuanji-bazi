# xuanji-paipan · 玄玑排盘服务

输入生辰，返回八字排盘和图表数据（四柱表、五行能量环、十神占比、神煞图谱、大运流年分数）。前端只负责画，不做任何计算。

基于 [mingyu-core](https://github.com/Brhiza/mingyu)（AGPL-3.0-only），本仓库同样以 AGPL-3.0-only 发布。

## 运行

需要 Node.js 18 以上。

```bash
npm ci
npm test            # 单元测试（全部为虚构生辰）
npm start           # 默认端口 8080
```

环境变量：

| 变量 | 说明 |
|---|---|
| `PORT` | 监听端口，默认 8080 |
| `BIND_HOST` | 监听地址，默认 `127.0.0.1`（只让本机的主站和反代连）；放进容器要对外时设 `0.0.0.0` |
| `PAIPAN_TOKEN` | 设置后，`/v1/bazi` 要求 `Authorization: Bearer <token>` |

## 接口

### `GET /v1/health`

```json
{ "ok": true, "engine": "mingyu-core@0.3.0", "config": "2026-10-10.v1.9.2" }
```

### `POST /v1/bazi`

请求体（JSON，最大 4KB）。网址不能带任何查询参数（`?` 后面的部分），带了一律拒绝，免得生辰进入代理或网关的访问日志：

| 字段 | 必填 | 说明 |
|---|---|---|
| `date` | 是 | 公历 `YYYY-MM-DD` |
| `time` | 否 | `HH:mm`；时辰不详传 `null`，按三柱排盘，时柱返回 `null`，不默认任何时辰 |
| `city` | 是 | 中国省市区名称或行政区代码，用于真太阳时经度校正 |
| `gender` | 是 | `male` / `female`，没有默认值 |
| `timeMode` | 否 | `true_solar`（默认，按出生地经度和均时差校正）或 `clock`（直接用北京时间） |
| `zone` | 否 | 出生地时区名（IANA，如 `America/Los_Angeles`、`Asia/Hong_Kong`）。境外、港澳台出生要传，跟 `ll` 一起传；传了就按它和经纬度排，城市名只回显。认不出报 `ZONE_INVALID`，不按上海时间猜 |
| `ll` | 否 | 出生地经纬度 `"纬度,经度"`（如 `"34.0522,-118.2437"`），跟 `zone` 一起传；格式或范围不对报 `PLACE_INVALID` |
| `calendarRule` | 否 | 历法口径。`v2_absolute`（新算法，国内境外同一套）：年柱、月柱、月令司令、起运交运大运、流年流月，一律拿出生那一刻（世界时）比节气那一刻；日柱、时柱照旧按出生地真太阳时。`v1_legacy`（老算法）：整盘拿当地真太阳时钟面比北京时间节气，没有时区名的国内老档案用它，旧盘逐字复现。不传：带了 `zone` 的按 `v2_absolute`，只给城市名的按 `v1_legacy`。新建的档案请明确传 `v2_absolute` 并跟档案一起存；乱填报 `CALENDAR_RULE_INVALID` |
| `strength` | 否 | 身强身弱的定案：`强` 或 `弱`。跟引擎自己判的方向相反时，喜忌按这一档重取（扶抑、调候、司令、病药各步照旧，只换档位），大运分数跟着重算；不传＝照引擎原样。时辰不详、特殊格局不换。引擎判「中和」时，`强`、`弱` 都会重取（中和不算任何一边，见下文「中和的口径」） |

返回（节选）：

```jsonc
{
  "version": { "api": "v1", "engine": "mingyu-core@0.3.0", "config": "2026-10-10.v1.9.2" , "calendarRule": "v2_absolute" },
  "input": { "date", "time", "city", "longitude", "gender", "timeKnown", "trueSolarTime",
             "birthTerm": { "name", "time", "days", "hours" } },   // 出生落在哪个节之后多久；时辰不详 hours 为 null
  "warnings": [],                      // 节气交界、时辰交界等提示（中文，可直接给用户看）
  "timeCheck": { "mode", "pillars", "other": { "mode", "pillars" }, "differs" },
                                        // 两种时间口径排出的日柱＋时柱；differs 为 true 时 warnings 里有一句交界提示
  "bazi": {
    "pillars": { "year": {...}, "month": {...}, "day": {...}, "hour": {...} | null },
                                        // 每柱：干支、十神、藏干及十神、纳音、空亡、地势（日主在本柱地支的十二长生）、自坐（本柱天干在自己地支）、神煞
    "dayMaster": { "gan", "element", "yinYang" },
    "strength": "身强",
    "strengthBasis": { "month", "root", "momentum" },   // 身强弱三项依据：月令／通根（strong·has·none）／得势，取值 扶身·相持·制身；时辰不详为 null
    "strengthSide": { "side", "status", "engine", "applied", "why", "engineUsefulGods" },   // 传了 strength 才有；applied＝喜忌真按定案换了档，这时 engineUsefulGods＝引擎自己那套。strength 字段始终是引擎自己的七档
    "pattern": { "name", "isSpecial", "status" },
    "usefulGods": { "favorableWuxing", "unfavorableWuxing", "primaryFavorableWuxing", ..., "climateUseful" },
                                        // climateUseful：用神由调候取、按扶抑（身强身弱）本该是忌时为 true，界面可标「调候取用」
    "luck": { "startInfo", "cycles": [{ "seq", "ganZhi", "startAge", "endAge", "startYear", "endYear",
                                         "score", "tier", "years": [{ "year", "age", "ganZhi", "score", "tier" }] }] },
    "wuxingSeason": { "金": "旺", "水": "相", "土": "休", "火": "囚", "木": "死" },   // 五行旺相休囚死（按月令）
    "params": { "taiYuan", "taiXi", "mingGong", "shenGong", "mingGua": { "gua", "eastWest" } },   // 胎元、胎息、命宫、身宫（时辰不详为 null）、命卦
    "liupan": {                         // 流盘：大运／流年／流月三列
      "qiyun": { "date", "age" },       // 首运交运日、出生到交运的实足年数（一位小数）
      "forward": true,                  // 小运顺排（阳年生男、阴年生女）还是逆排
      "cols": { "甲子": { "tenGod", "hidden", "lifeStage", "ziZuo", "shensha" }, … },   // 六十甲子各自对本命的整列，大运流年小运流月都查它
      "years": [{ "year", "age", "ganZhi", "xiaoyun" }],   // 出生起一百年，age 为虚岁；时辰不详 xiaoyun 为 null
      "months": { "2026": { "d": ["2.4", …12], "gz": "庚寅辛卯…" } }   // 每年十二个节的月.日＋月干支（立春到次年小寒），1900–2100
    }
  },
  "components": {
    "dayMasterCard": { "dayGanZhi", "gan", "element", "yinYang" },
    "wuxingRing": { "type", "range", "dominant", "dayMasterElement", "rows": [{ "element", "percent", "exact", "tenGods" }] },
    "tenGodBar": { "total", "sum", "rows": [{ "tenGod", "count", "percent" }] },
    "shenshaPanel": { "featured": [{ "name", "rarity", "stars", "pillars", "pillarCount" }], "dimensions": [{ "key", "name", "score", "tier", "shensha", "weights" }], "all": [...] }
  }
}
```

`tier` 是档位序号，0 为最高档。本服务只返回数字和档位，不含任何判词文案。

错误都返回 JSON：`{ "error": { "code", "message" } }`。

| 状态码 | code | 情况 |
|---|---|---|
| 400 | `QUERY_NOT_ALLOWED` | 网址带了查询参数 |
| 400 | `BAD_JSON` | 请求体不是合法 JSON |
| 400 | `DATE_REQUIRED`、`TIME_INVALID`、`GENDER_REQUIRED`、`CITY_REQUIRED`、`LOCATION_NOT_FOUND`、`TIME_MODE_INVALID`、`ENGINE_REJECTED` | 输入有问题 |
| 401 | `UNAUTHORIZED` | 设了 `PAIPAN_TOKEN` 但请求没带对 |
| 413 | `BODY_TOO_LARGE` | 请求体超过 4KB |

## 算法口径

所有权重和阈值在 `src/config.js`，改口径只改这一个文件，并升 `CONFIG_VERSION`（当前 `2026-10-10.v1.9.2`）。测试会检查本 README 写的版本号和五行权重跟代码一致。

- **五行能量环**：天干每字 1；三个藏干的地支按本气、中气、余气 0.5 / 0.25 / 0.05，两个藏干的地支 0.7 / 0.3，一个藏干的地支 1；日主计入；取整后残差归最大项。
- **十神占比**：天干、藏干每个 1，日主不计；每项去尾取整，总和可以不足 100。
- **神煞图谱**：七个维度，组内命中神煞的权重相加，封顶 99，没有命中的维度不返回；`weights` 与 `shensha` 一一对应，给前端按权重分段画条。
- **稀有前三**：从命中的吉神（外加华盖）里，按出现比例从小到大取前三。出现比例＝抽样排盘里有这颗星的盘占多少，表在 `src/rarity.js`，由 `scripts/rarity.mjs` 按日期枚举合成生辰统计：自 1950-01-01 起每 7 天取一天（全局网格，分段跑和整段跑抽到同一批日期）、每天 12 个时辰、北京、钟表时，统计 1950～2009 年。现行表：成功 37566 张，跳过 6 张（1986～1991 年夏令时拨钟那天凌晨 2 点多，钟表时间不存在），失败 0；比例以成功数为分母。重新生成：
  ```
  node scripts/rarity.mjs count 1950-01-01 1954-12-31 c1950.json   # 每 5 年一段，可并行；也可以一段跑完
  …
  node scripts/rarity.mjs build src/rarity.js c*.json
  ```
  `stars` 是 1～5 星：<15% 五星、15～30% 四星、30～45% 三星、45～60% 二星、≥60% 一星。改了神煞查法要重新生成比例表。
- **中和的口径**：mingyu-core 0.3.0 的取用规则（`baziUsefulGodRules.js` 里的 `balance-neutral`）是「中和取泄耗克基线，待调候司令格局细化」，跟身强用同一组五行，相当于默认「中和偏强」。这是引擎的口径选择，不是天然如此。调用方（profile-api）在几种判法的结论有方向、跟引擎档位不同时（例如引擎中和、另两路判弱），会带 `strength` 再排一次。3000 张编的盘里，引擎中和、结论偏强的 133 张，按身强重取后 132 张喜忌逐字相同；1 张五行集合相同、首选用神不同（病药那一步按档位匹配）。
- **调候压过扶抑**：同一档位里，调候取到的字会排到喜用最前面，同时从忌里拿掉，不管扶抑那一步把它放在哪边；调候生效时，病药那一步只给提示、不再调整排序。所以身弱档的喜用里可能出现泄身的字（例如辛日亥月，调候取壬丙，水排进喜用）。要看每一步取了什么字，看 `analysis.usefulGod.strategyTrace`（引擎原档）。
- **类型标签**：直接由引擎的身强弱七档映射，不另算分：极强→极强型、身强→身强型、偏强→偏强型、中和→均衡型，偏弱／身弱／极弱→偏弱型。时辰不详或引擎没给结论时不给标签（`type` 为 `null`）。
- **神煞查法**：默认用引擎的问真口径；德秀贵人取引擎古法口径；天乙贵人用「庚辛逢马虎」版；学堂按年柱、日柱纳音各查一次。
- **大运流年**：`70 + 8×(干喜忌 + 支喜忌)`，夹在 35～98，地支取本气，喜忌来自引擎的喜用神判断；档位 ≥90 / 75 / 60 / 45。每步大运的 `years` 正好是 `startYear`～`endYear` 这十年，跟下一步不重叠。

## 时间口径

默认按真太阳时排：北京时间按出生地经度校正，再加上当天的均时差；1986–1991 年的夏令时由引擎按历史时区处理。
传 `timeMode: "clock"` 就直接按北京时间排，只用钟表时间的软件都是这样排的。
每次排盘都会用另一种口径再算一遍日柱和时柱，结果不同就在 `warnings` 里加一句提示。出生时间离时辰交界比较近时，常会出现这种情况。

## 对上游的修正

- **劫煞、亡神**：mingyu-core 0.3.0 的查法表在「亥卯未」「巳酉丑」两组互换了。本服务按三合局古法重算（劫煞在局之绝地、亡神在局之临官），见 `src/shenshaFix.js`。
- **喜忌被调候挪空**：mingyu-core 0.3.0 调候一步把调候五行加进喜、同时从忌里删掉不补，调候序列盖住扶抑的整个忌组时会出现五行全喜、没有忌（大运流年也跟着没有扣分）。本服务只在忌组为空时放回一个：取被挪走的五行里调候序列最末位那个，撤出喜用、记入忌组；忌不空的盘不动。见 `src/usefulGodFix.js`。
- **神煞口径**：常用神煞（common）和全量神煞（all）两套名字不同，本服务以常用为主，只从全量中补入图谱需要打分的项目（如六厄）。

## 隐私

- 服务无状态，不连数据库，不做缓存。
- 日志只记录方法、路径、状态码和耗时，请求体（生辰）不写入日志。
- 生辰只能通过 POST 请求体传入，不接受 URL 参数。
- 测试数据全部为虚构生辰。

## 更多文档

- `docs/api-example.json`：一次完整返回的示例（虚构生辰，大运只截了前两步）。
- `docs/UPSTREAM.md`：上游依赖、许可证，以及本服务对引擎结果做的修正。
- `docs/KNOWN_ISSUES.md`：已知问题。

## 许可证

AGPL-3.0-only，全文见 `LICENSE`。本服务调用的排盘引擎为 mingyu-core 0.3.0（© 原作者，AGPL-3.0-only）；`src/` 下的服务层代码由玄玑编写。
