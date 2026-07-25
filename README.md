# ⚡ Tele Manager

**Enterprise Lead & Communications Hub**

Tele Manager is a custom full-stack CRM dashboard developed for Coshare Loan Consultancy. It is designed to streamline lead management, automate data sanitization, and enable one-click agent communication, solving critical operational bottlenecks for a sales team of 100+ agents.

---

## 🎯 Business Impact (UniPact Bounty #UP-001)

This system was built to solve real-world SME constraints:
- **Efficiency:** Saves an estimated **14 hours a week per agent** by eliminating manual lead processing and copy-pasting.
- **Cost Reduction:** Replaces expensive third-party CRM subscriptions, saving the business an estimated **RM 2,500 annually**.
- **Data Integrity:** Prevents cross-device session conflicts and "stale data" states when agents switch between devices for SMS/WhatsApp outreach.

---

## ✨ Key Features

*   **Role-Based Access Control:** Secure, customized workspaces and routing for `super_admin`, `general_manager`, `manager`, and `agent` (staff) roles.
*   **Smart Lead Extraction & Sanitization:** Upload `.xlsx` or `.csv` files to automatically scrub, format, and deduplicate Malaysian phone numbers. Includes an advanced extraction mode that filters leads by age range through Malaysian IC parsing.
*   **Real-Time Analytics:** Interactive bar and pie charts visualizing pipeline health, lead statuses, and team volume metrics using Recharts.
*   **One-Click Communications:** Native OS deep-linking for quick WhatsApp and SMS outreach. Agents can toggle between Personal and Business WhatsApp routing and utilize customizable, locally-saved promo scripts.
*   **Live Data Synchronization:** Dashboards automatically update in real-time across devices using Supabase Postgres channels and React Query.
*   **Customer Pipeline Management:** Track returning customers, manage document uploads (like payslips), and monitor "stuck" cases that have been inactive.
*   **Over-The-Air Updates:** Built-in version checker that polls for updates and cleanly prompts users to refresh when a new version of the app is deployed.
*   **Feedback Hub:** Built-in modal for staff to submit bug reports and feature suggestions directly to admins.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), JavaScript, Tailwind CSS
- **Backend & Database:** Node.js, Supabase (PostgreSQL)
- **Deployment:** Vercel (Frontend), GitHub Actions
- **State Management & Fetching:** `@tanstack/react-query`
- **UI Components:** `lucide-react` (icons), `recharts` (charts), `sonner` (toast notifications)

---
