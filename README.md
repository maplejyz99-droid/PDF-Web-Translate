# PDF Web Translate

PDF 划词翻译扩展。用鼠标选中 PDF 里的一个词或一句话，译文会显示在选区旁。扩展内置 PDF.js，使用自己的 DeepSeek API Key 翻译为简体中文。

## 安装

支持 Chrome 151+ 和提供同一 PDF 接管接口的 Chromium 浏览器。

1. 在本仓库点 **Code → Download ZIP** 并解压，或在终端克隆。

   ```sh
   git clone https://github.com/maplejyz99-droid/PDF-Web-Translate.git
   ```

2. 在 Chrome 打开 `chrome://extensions`。在 Arc 按 `⌘T`，搜索 **Manage Extensions**。
3. 打开**开发者模式**，点**加载已解压的扩展程序**，选择包含 `manifest.json` 的目录。
4. 打开「PDF 划词翻译」的**扩展程序选项**，填写并保存你自己的 DeepSeek API Key。也可以从 PDF 阅读器的「更多工具 → DeepSeek 设置」进入。[Chrome 本地加载文档](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) · [Arc 扩展管理](https://resources.arc.net/hc/en-us/articles/19335714372759-Troubleshoot-or-Report-a-Problem-in-Arc)

拉取新版代码后，在扩展管理页点「重新加载」，再重新打开 PDF。

## 划词翻译

1. 打开一份带可选中文字的 PDF。
2. 划选正文，点选区旁的「翻译」，或按 `Alt` + `T`（Mac 为 `Option` + `T`）。
3. 在浮窗中阅读译文。每次支持最多 4,000 个字符。[试用论文](https://arxiv.org/pdf/2510.19093v2)

扩展默认接管单独打开的 PDF 标签页，并保留原链接。「更多工具」菜单可以为当前文档切回浏览器内置阅读器。扩展设置里的开关控制后续 PDF 是否自动接管。[Chrome PDF 接管机制](https://developer.chrome.com/docs/extensions/reference/api/mimeHandler)

如果 arXiv PDF 仍由浏览器内置阅读器显示，点浏览器工具栏里的「PDF 划词翻译」图标即可手动打开。阅读已下载的文件时，从扩展设置页底部点「打开本地 PDF」。

## 批注和导出

鼠标移到高亮、文字或手绘图标上时会展开颜色、粗细等选项。鼠标离开图标和菜单后，选项会收起。单击图标选中工具，再点一次取消。

批注先保存在当前打开的文档中。想保留新增的高亮、手绘或文字，点阅读器工具栏上的**下载按钮**导出带批注的 PDF。下次可以打开这份副本。重新打开原链接会读取原始 PDF。

## DeepSeek 与本地数据

PDF 由内置的 PDF.js 在浏览器里解析。API Key 存在当前浏览器配置的扩展本地存储中，用于向 DeepSeek 官方接口鉴权。触发翻译时，请求包含选中的文字和通用翻译指令，使用 `deepseek-flash`，思考模式关闭。[DeepSeek API 文档](https://api-docs.deepseek.com/api/create-chat-completion/)

## 第三方组件

- PDF 阅读器使用 PDF.js 6.5.438。阅读器的 `viewer.html` 增加了扩展入口和译文浮窗，PDF.js 的许可证随组件一起提供。[PDF.js 发布包](https://github.com/mozilla/pdf.js/releases/tag/v6.5.438) · [PDF.js 许可证](vendor/pdfjs/LICENSE)
- 划词按钮和选区浮窗的交互参考了陪读蛙。[陪读蛙划词翻译](https://www.readfrog.app/zh/docs/selection-translation)
