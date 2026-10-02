# Visual Bible

## 1. Visual thesis

原创桌面玩具的触感：木桌、纸胶带与可辨认的轮式机械车。原型候选为木桌工坊/工程蓝图/塑料竞技盒；以低成本木桌切片验证，不将其称为最终商业美术。

## 2. Composition and camera

固定俯视 960×540；游戏区 x48–912/y100–490，HUD在顶部，目标比装饰醒目，教程底部两行。16:9 内含桌角文具，不使用3D相机。

## 3. Color

木桌 #dabd8b、墨 #203239、纸 #fff3d6、玩家青 #168c91、目标琥珀 #ffc857、危险珊瑚 #df6350。避免危险/目标只靠颜色，辅以刺轮/编号。

## 4. Typography

本机 system-ui，标题粗体32–52px，正文16px，HUD14–18px；数字等宽，英文产品文案。

## 5. Shape, material, and lighting

圆头金属车、四个黑轮、纸块顶面折线、坡道斜纹；左上光、右下短实影。4px间距、8px控件圆角、2px深墨描边。

## 6. Characters, environments, and assets

全原创Canvas路径，无下载素材。车长42宽28，目标轮廓/编号可见。木纹预绘，粒子池96，滚珠12，DPR≤1.5。

## 7. UI and icons

英文文字按钮，不依赖图标；图示用同风格线条SVG与键帽。44px目标，focus明确；按下短移位，禁用降低强调。顶部导航固定，菜单内部滚动，不整页transform。无emoji。

## 8. Motion and VFX

即时响应；冲撞拖尾0.2秒、碎片0.4秒、伤害闪1.3秒；不屏幕震动。reduce-motion禁用粒子和跳台视觉缩放但保留规则提示。反馈：移动→轮转；冲撞→鼻尖光/短声；碎块→碎片+计数；受伤→生命变化；结算→明确英文结果+和弦。

## 9. References translated into principles

只借鉴已过审作品的操作教学、明确结算和成长完整度，不复制Toy Rampage地图、素材、视觉IP或代码。

## 10. Anti-patterns

禁止手机投掷机制、套用旧游戏、霓虹玻璃卡片、功能emoji、无标记色块、长段教学遮挡竞技场。

## 11. Vertical-slice acceptance

标题、教学、三关、暂停、成功失败截图；800×450按钮可见，门/块/滚珠可区分；窄屏提示键鼠。先自动验证路径与性能，真人三问理解待验收。W2–3关闭。
