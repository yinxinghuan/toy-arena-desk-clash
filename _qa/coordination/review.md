# W0–1 独立Cua验收（协调员）

2026-10-02。开发owner为「跟Grok bot交流」。本文记录协调员独立操作，不把owner的Playwright结果当作本人通关。全部游戏操作通过Cua真实鼠标/方向键tap，未注入进度或完成状态；工具轮次间手动暂停规划，因此不是陌生人连续手感实验。

## 三关完整闭环（旧生产index-B0DlxETo.js）

| 关卡             | 独立成功                          | 独立失败         | 截图                                                        |
| ---------------- | --------------------------------- | ---------------- | ----------------------------------------------------------- |
| Tape Sprint      | 16.2秒，3星，0受伤                | 60秒自然超时     | race-success.jpg / race-timeout-failure.jpg                 |
| Stampede Station | 43.7秒，2星，0受伤；8玩具+4秒抢点 | 60秒自然超时     | capture-success.jpg / capture-timeout-failure.jpg           |
| Marble Mayhem    | 45秒，5螺帽，1受伤，1星           | idle8.7秒，3受伤 | survival-success-or-failure.jpg / survival-idle-failure.jpg |

成功和失败后均通过UI重开/选关；第二关Next实际进入第三关。刷新保留本人星级[3,2,1]和Sound off，见persisted-stars-mute.jpg。练习实际过门、撞碎纸玩具、看到下一目标；Skip无残留。自动教学30秒安全暂停可继续练习。

独立压力输入25鼠标dash、20R、20M、8P再P，状态Paused、60秒、0进度，未重复结算。800×450→640×360→800×450，暂停/恢复可用，无横向截断，见640x360-paused.jpg。冷却内连点不会产生重复冲刺；没有证明耳听质量，仅验证静音按钮和存档。

## 原生焦点测试及更正

最初debug-attached Chrome标签实际切New Tab，AX显示游戏标签off，但游戏计时继续；曾报告P1。随后CDP只读DOM诊断发现focus:true、visibility:visible持续不变，因此撤回“生产P1已确认”：调试连接污染焦点信号，旧版正常生产缺陷未被证明。native-tab-switch-not-paused.jpg只记录受调试环境现象。

新bundle index-DslnUBtA.js（SHA256 423889125bfd0710e573db63f727f00aa8d526f5405de5c12f27ee3eb2f22106）使用纯原生Chrome新标签，地址栏paste网址，不claim或附加页面调试器。原生AX启动第二关60秒→Cmd+T切出→原生AX点回游戏：Paused、60秒。Resume后再次切出/返回仍Paused、60秒。正常原生标签两次回归通过，截图native-unattached-tab-paused.jpg。防御性watchdog/pagehide保留，但不能声称旧版正常生产缺陷已证实并修复。

## 错序反馈回归（新bundle）

隐私说明：上节原生窗口截图包含无关浏览器标签与书签，`native-unattached-tab-paused.jpg`只在本机保留，已通过.gitignore排除公开仓库；此报告记录操作及结果。其余纯游戏截图可公开分发。

真实冲刺直接先到第二门，进度仍0，出现“Wrong order — Next: Gate 1”，暂停时提示可见（wrong-gate-paused-feedback.jpg）。重开后正确顺序完成5/5、3星、0受伤、8.1秒，错序提示清除（new-bundle-race-success.jpg）。

## 尚未达到的产品目标

没有未关闭的已确认P0/P1。短关仍是实质缺口：owner首两关8/26秒，本人首关16.2秒、新版熟悉路线8.1秒。零件解锁/配置未实现。真人复述理解、连续手感、听感、Chromebook实机未验证；这些不阻挡本轮已完成的agent功能测试，但阻挡原型产品验收通过。

最小后续建议（仅建议，未实施）：保持三地图，首关3圈15门并明确Lap；第二关增加一轮不同玩具/抢点位置而非纯增加等待。先在现有原型内验证挑战/时长，不增地图/Boss/PvP/榜单。W2–3未放行，无正式发布、无CrazyGames提交。
