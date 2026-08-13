# Kivo POS 🏪

Kivo POS is a modern, responsive Point of Sale application designed to help you manage your store, inventory, and transactions efficiently. Built with an industry-standard separated architecture.

## 🏗️ Architecture

- **Frontend**: [Next.js 15+](https://nextjs.org/) (App Router) with [shadcn/ui](https://ui.shadcn.com/) and Tailwind CSS.
- **Backend**: [Laravel 11](https://laravel.com/) with SQLite (default) providing RESTful APIs.
- **Authentication**: Laravel Sanctum (Token-based API Authentication).

## 🚀 Getting Started

Since the project is separated into `frontend` and `backend`, you need to run two separate development servers.

### 1. Backend Setup (Laravel)

Navigate to the `backend` directory:
```bash
cd backend
```

Install dependencies and start the server:
```bash
composer install
php artisan migrate
php artisan db:seed # Optional: if you have seeders
php artisan serve
```
The backend API will run on `http://127.0.0.1:8000`.

### 2. Frontend Setup (Next.js)

Open a new terminal and navigate to the `frontend` directory:
```bash
cd frontend
```

Install dependencies and start the Next.js server:
```bash
npm install
npm run dev
```
The frontend UI will be available at `http://localhost:3000`.

## 🔐 Default Credentials

To log into the Kivo POS Dashboard, use the following credentials (if you have seeded the database):
- **Email:** `admin@kivo.com`
- **Password:** `password123`

## 🌟 Features

- **Dashboard**: Real-time charts and recent transactions overview.
- **POS / Checkout**: Interactive cart system with cash and QRIS payment simulations.
- **Inventory & Products**: Manage your catalog, pricing, and track stock levels.
- **Categories**: Organize products efficiently.
- **Transactions & Reports**: Historical records and performance metrics.
- **Settings**: Store configurations.

## 💻 Tech Stack Highlights
- `React 19` & `Next.js`
- `Tailwind CSS` & `lucide-react` icons
- `Laravel 11` & `Eloquent ORM`
- `Recharts` for interactive data visualization
