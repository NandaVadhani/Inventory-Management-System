import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState } from "react";
import { AdminPanel } from "./components/AdminPanel";
import { CustomerInterface } from "./components/CustomerInterface";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";

export default function App() {
  const [activeTab, setActiveTab] = useState<"customer" | "admin" | "analytics">("customer");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-blue-600">Smart Inventory</h1>
            <Authenticated>
              <nav className="flex gap-1">
                <button
                  onClick={() => setActiveTab("customer")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "customer"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  🛒 Store
                </button>
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "admin"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  ⚙️ Admin
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "analytics"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  📊 Analytics
                </button>
              </nav>
            </Authenticated>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1">
        <Content activeTab={activeTab} />
      </main>
      
      <Toaster />
    </div>
  );
}

function Content({ activeTab }: { activeTab: "customer" | "admin" | "analytics" }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Authenticated>
        {activeTab === "customer" && <CustomerInterface />}
        {activeTab === "admin" && <AdminPanel />}
        {activeTab === "analytics" && <AnalyticsDashboard />}
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Smart Inventory
            </h2>
            <p className="text-gray-600">
              AI-powered inventory management system with real-time analytics
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
