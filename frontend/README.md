# ⚡ TeleManager Frontend (`frontend`)

![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?logo=reactquery&logoColor=white)

The client workspace for **TeleManager**, an enterprise-grade telemarketing CRM and lead management application built with React 19, Vite, Tailwind CSS 4, and Supabase.

---

## 🛠️ Setup & Scripts

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation

```bash
npm install
```

### Available Scripts

- `npm run dev`: Starts the Vite development server on `http://localhost:5173`.
- `npm run build`: Runs pre-build version stamping (`scripts/stamp-version.js`) and compiles production assets into `dist/`.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint across project files.

---

## 🎨 Key UI Components

- `AdminDashboard.jsx`: Super Admin global system settings, user management, and audit tools.
- `GMDashboard.jsx`: General Manager macro pipeline charts and team volume metrics.
- `ManagerDashboard.jsx`: Team Manager lead allocation, pool distribution, and agent tracking.
- `StaffDashboard.jsx`: Telemarketing Agent personal lead queue, script picker, and 1-click WhatsApp/SMS routing.
- `Login.jsx`: Multi-role secure login interface.

---

## 📝 License

[MIT](LICENSE)
