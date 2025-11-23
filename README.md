# Jacob PLD Camera

A retro-aesthetic web camera application built with React, featuring Polaroid-style photo development, drag-and-drop interactions, and AI-powered handwritten captions.

![Project Status](https://img.shields.io/badge/status-active-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

-   **Retro Interface**: Beautifully crafted UI mimicking a classic instant camera.
-   **Instant Developing**: Realistic photo developing animation (blur to clear).
-   **Drag & Drop**: Interactive "Photo Wall" experience powered by Framer Motion.
-   **AI Captions**: Automatic generation of warm, handwritten-style blessings using OpenAI (GPT-4o Vision).
-   **Configurable**: Custom settings for API Endpoint, API Key, and Model selection.
-   **Export**: Download your developed Polaroids as high-resolution PNGs.

## 🛠 Technical Stack

-   **Framework**: [React](https://react.dev/) (Vite)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Imaging**: [html2canvas](https://html2canvas.hertzen.com/)
-   **AI Integration**: OpenAI API compatible (Supports Custom Base URL)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/retro-camera.git
    cd retro-camera
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Start the development server**

    ```bash
    npm run dev
    ```

4.  Open your browser at `http://localhost:5173`.

## ⚙️ Configuration

### AI Settings

To enable AI captioning:

1.  Click the **Settings (Gear)** icon in the top-right corner.
2.  Enter your **API Base URL** (Default: `https://api.openai.com/v1`).
3.  Enter your **API Key** (e.g., `sk-...`).
4.  Select the **Model** (Default: `gpt-4o`).
5.  Click **Save Configuration**.

_Note: Settings are persisted locally in your browser._

## 📂 Project Structure

```
src/
├── App.tsx          # Main application logic and layout
├── main.tsx         # Entry point
├── index.css        # Global styles & Tailwind directives
└── vite-env.d.ts    # Vite type definitions
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
