# JH Pet Shop Website

A modern, responsive website for JH Pet Shop, a pet care service provider in Klang, Malaysia.

## Features

- Responsive design that works on all devices
- Modern UI with smooth animations
- WhatsApp integration for customer service
- Google Maps integration
- Contact form with email integration
- Services showcase for both dogs and cats
- About Us section
- Contact information

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Configuration

Before deploying, make sure to:

1. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `src/App.tsx` with your actual Google Maps API key
2. Set up EmailJS credentials in `src/App.tsx`:
   - `YOUR_SERVICE_ID`
   - `YOUR_TEMPLATE_ID`
   - `YOUR_PUBLIC_KEY`

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- Vite
- EmailJS
- Lucide Icons

## 如何运行项目

1. **打开项目**
   - 在桌面找到 "Pet Shop" 文件夹
   - 或直接打开：`C:\Users\admin\Desktop\Pet Shop`

2. **启动项目**
   - 按 `Win + R` 打开运行窗口
   - 输入 `powershell` 并按回车打开终端
   - 在终端中输入以下命令：
     ```
     cd "C:\Users\admin\Desktop\Pet Shop"
     npm run dev
     ```

3. **查看网站**
   - 等待终端显示成功信息
   - 浏览器会自动打开网站
   - 或手动访问：http://localhost:5173

## 注意事项
- 确保电脑已连接网络
- 如果遇到问题，可以尝试重新运行 `npm install` 安装依赖
- 所有代码更改都会自动保存 