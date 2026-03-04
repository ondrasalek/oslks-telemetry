# ⚡ OSLKS Radar — Dashboard Frontend

The OSLKS Radar Dashboard is a high-performance, real-time analytics visualization interface built with **React**, **TypeScript**, and **Vite**.

## ✨ Features

- **Real-time Visualization** — Powered by WebSockets for instant data updates.
- **Glassmorphic UI** — Modern, futuristic design with neon accents and dark mode.
- **Interactive Charts** — Comprehensive analytics view using Recharts.
- **Radar Animation** — Custom hero animation synchronized with scanner sweeps.
- **Multi-Tenant** — Support for teams, user roles, and website management.
- **Public Sharing** — Generate read-only analytics links for transparency.

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **npm** or **bun**
- A running **OSLKS Collector** instance

### Setup

1. **Install dependencies**:

    ```bash
    npm install
    ```

2. **Environment Variables**:
    Create a `.env` file in this directory:

    ```env
    # URL of your dashboard (for script generation)
    VITE_APP_URL=http://localhost:5173
    ```

3. **Run Development Server**:

    ```bash
    npm run dev
    ```

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [Lucide React](https://lucide.dev/)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **Charts**: [Recharts](https://recharts.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Routing**: [React Router 7](https://reactrouter.com/)

## 🏗️ Project Structure

```text
src/
├── components/     # Reusable UI parts (Shadcn-like)
├── pages/          # Full-page route components
├── hooks/          # API & helper hooks
├── lib/            # Utilities & API client
├── types/          # TypeScript definitions
└── App.tsx         # Main entry & Routing
```

## 🚢 Production Deployment

The frontend is built as a static site and served via Nginx in the provided Docker configuration.

```bash
npm run build
```

The resulting `dist` folder can be hosted on any static provider or via Docker.
