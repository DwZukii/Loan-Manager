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

- 🧹 **Automated Data Scrubbing:** Sanitizes malformed phone numbers automatically (stripping spaces, dashes, and country codes) to ensure 100% valid lead routing.
- 🔗 **Quick-Action Routing (Deep Linking):** One-click redirection using native OS URIs to seamlessly launch native WhatsApp and SMS applications with pre-filled, dynamic promotional scripts.
- 📊 **Cross-Platform Lead Attribution:** Matches sanitized numbers against legacy SQL databases to accurately track and attribute converted leads for commission payouts.
- 🔒 **Agent-Isolated Sessions:** Resolves Android Dual Messenger/WhatsApp Business routing quirks to ensure links fire to the correct hardware device.

---

## 🛠️ Tech Stack

- **Frontend:** React, JavaScript, Tailwind CSS
- **Backend & Database:** Node.js, Supabase (PostgreSQL)
- **Deployment:** Vercel (Frontend), GitHub Actions

---
