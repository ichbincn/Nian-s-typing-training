# 年雯玥的爱心打字练习

一个可直接本地运行的纯前端 IELTS 机考英文打字练习网站，适合练习英文录入速度、准确率和考试节奏。

## 如何运行

1. 直接双击打开 `/Users/chennuo/Documents/ielts-love-typing-practice/index.html`。
2. 如果浏览器因为本地安全策略无法读取 `sample-texts.json`，请在项目目录启动一个本地静态服务器后再访问。
3. 例如可以在该目录执行：

```bash
python3 -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 如何替换 JSON 题库

1. 打开 `/Users/chennuo/Documents/ielts-love-typing-practice/sample-texts.json`。
2. 按现有数组结构替换或新增题目对象。
3. 每篇文章至少保留以下字段：

```json
{
  "id": "task2-001",
  "type": "task2",
  "title": "Title",
  "topic": "Education",
  "prompt": "Essay question",
  "content": "Full sample essay",
  "wordCount": 280,
  "difficulty": "6.5"
}
```

4. `type` 使用 `task1` 或 `task2`。
5. `content` 是实际练习原文，系统会按字符逐位比对。

## WPM 和准确率如何计算

- `WPM = 正确输入字符数 / 5 / 用时分钟数`
- `CPM = 正确输入字符数 / 用时分钟数`
- `准确率 = 正确字符数 / 总输入字符数 × 100%`
- `错误率 = 错误字符数 / 总输入字符数 × 100%`
- 当总输入字符数为 0 时，页面会自动显示为 `0`，避免出现 `NaN`

这里的“正确字符数”和“错误字符数”都只基于当前输入框内容与原文逐字符比较，不记录历史击键。

## 这个项目适合什么用途

- IELTS 机考英文打字练习
- 英文作文跟打和熟悉考试录入节奏
- 练习大小写、空格、标点的准确输入
- 做定时练习、Task 1 / Task 2 分开训练
- 记录每一次成绩，并通过历史趋势观察自己的进步

## 主要功能

- 本地 JSON 题库读取
- 题型和主题筛选
- 上一篇、下一篇、随机一篇、只练 Task 2
- 开始、暂停、继续、重置
- 自动首字符开表
- 实时逐字符高亮对比
- WPM、CPM、准确率、错误率实时统计
- 完成后结果弹窗和随机鼓励语
- 深色模式、考试模式、字体大小调节
- 显示/隐藏中文提示
- 自动聚焦输入框开关
- 历史成绩弹窗、WPM 折线图和理想速度区间分析
- 本地保存主题偏好和全部历史成绩
