# Technical

## 1. 技术栈

独立 Vanilla JavaScript ES modules + Vite 6.4.3 + Canvas2D，DOM菜单与 WebAudio；没有运行时外部依赖、账号、后台或平台SDK。16:9桌面英文产品，不属于AlterU宿主构建。

## 2. 目录结构

- `content/levels.js`：3个原创地图、规则种类、星级文案。
- `src/core/game.js`：可单测模拟、固定资源池、碰撞/坡道/目标/结算。
- `src/core/save.js`：版本1的存档验证和失败回退。
- `src/game/render.js`：原创车/桌面/目标/粒子，静态背景预绘。
- `src/ui/style.css`：内部响应DOM，800×450最小主要目标。
- `src/audio/synth.js`：原创循环旋律与短音效。
- `src/main.js`：按键/鼠标、屏幕状态、教学、暂停、存档协调。
- `tests/`：规则单测；`_qa/`：真实键鼠浏览器路径与截图。

## 3. 核心模块

60Hz固定步长，帧间差封顶100ms、每帧最多6步；时间跟模拟走而非后台墙钟。粒子96/滚珠12池，Canvas DPR封顶1.5。移动车以屏幕方向加速，dash指向鼠标；碰撞反弹/跳台空中免伤，顺序门/碎块占点/生存螺帽分别独立目标。

`menu → safe tutorial / playing → paused → result` 明确状态。教程30秒安全暂停，玩家可继续或进入首局，不宣称学会；失焦暂停模拟和音频，主动恢复。除了blur/visibilitychange/pagehide事件，还在每次模拟前与独立200ms检查document.hasFocus/visibility，兜底事件漏发，不在焦点返回时自动恢复。顺序门HUD始终显示下一门，接触后续错序门显示1.5秒英文反馈且不计进度。原生localStorage是独立站点唯一存储；key `toy-arena-desk-clash:v1`，错误英文非阻断，最佳星仅增加。无云存档。

音乐96BPM、312.5ms八分音符节拍，64步循环，最多12音符；手势解锁、失败不阻断、暂停停止当前声部，静音即时并持久。资产全部程序化原创，无远程素材请求。固定 `base:'./'`，可以静态子路径部署。

`window.toyArena.snapshot()`只读诊断，不含完成/移位/作弊接口。浏览器QA读取状态来决定键鼠动作；单测直接设置状态用于规则覆盖，不被当作真实试玩。

## 4. 扩展点

规则/参数在core，地图/目标文案在content，绘图在renderer，声音在synth，菜单/输入在main。W2–3零件、成长、sandbox和更多关卡仍未实现；须先真人手感/首30秒验收。平台SDK、正式海报/视频、CrazyGames提交均不在本原型交付范围。正式平台检查另行复核官方要求，原型测试不承诺审核。
