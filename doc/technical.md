# Technical — W2–3

## 1. 技术栈

独立Vanilla JavaScript ES modules + Vite6.4.3 + Canvas2D、DOM和WebAudio。零运行时库，英文16:9桌面键鼠，不是AlterU宿主构建，无SDK/后台/广告/账号。本轮不公开部署、不提交平台。

## 2. 目录结构

- content/levels.js：10关+Sandbox、地图、目标/解锁/独立星规则。
- content/builds.js：轮胎/车架/模块与解锁代价、实际物理配置。
- src/core/game.js：固定步模拟、碰撞/坡道/油滑/推货/移动挡板/顺序门/抢点/生存/星。
- src/core/save.js：v2正规化、v1迁移、存储错误英文回退。
- src/game/render.js：Canvas2D原创几何、缓存木纹、目标/机关/VFX。
- src/audio/bank.js：本地授权录音解码播放；public/audio：音乐/音效与许可。
- src/main.js：键鼠、状态、菜单/车库/设置/教程、读写存档。
- src/ui/style.css：内部滚动响应菜单；tests：纯规则；_qa：真实输入及截图。

## 3. 核心模块

60Hz固定步，帧间差≤100ms、最多6步/帧；粒子96、滚珠12、8纸块、2货箱，DPR≤1.5。木纹缓存，零下载纹理。目标视图由同一模拟状态绘制。货箱圆形近似接触推力与质量有关，摩擦衰减；交付冻结以避免已送达箱堵住玩家。移动挡板位置由模拟时间正弦确定，暂停即冻结。油滑降低当前摩擦至40%。

状态menu/tutorial/playing/paused/result。失焦事件及200ms+模拟前检查暂停，无自动恢复。Sandbox安全无星无失败，测试锁定零件只更新当前实例，不写入竞技配置。原生localStorage key toy-arena-desk-clash:v1保持不变、内容升级version2：十关星/最佳用时、配置、音量/静音/高对比/教学。旧三关星继续保留，损坏数值逐项正规化。星数只增不减，解锁不花费星。

音频首次手势resume AudioContext后异步加载本地Ogg/解码，驾驶不等待网络。8短音+1背景，碰撞120ms限频，gain主音量与静音；暂停stop全部声源，恢复一条52.173787s完整循环。文件来源/固定版本/映射见THIRD_PARTY_NOTICES和原始许可。无实时振荡器回退，加载失败英文提示。

window.toyArena.snapshot只读，无移位/完成/存档作弊接口。浏览器自动化读取状态选择真实按键/鼠标，纯单测直接状态写入只算规则覆盖，不能算试玩。base './'支持子路径；全屏交由宿主，不调用自制fullscreen。

## 4. 扩展点

地图/目标/星/解锁在levels；零件数值在builds；碰撞与新规则在core；几何与低成本反馈在render；音频在bank及许可映射；UI/教学/输入在main。性能预算首屏gzip≤100KB、音频≤3MB、零纹理、既有池上限。真实Chromebook、人工听感、陌生真人理解另验，自动化与节流不能替代。
