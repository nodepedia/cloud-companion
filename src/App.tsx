import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ApiKeys from "./pages/admin/ApiKeys";
import AdminDroplets from "./pages/admin/AdminDroplets";
import AdminUsers from "./pages/admin/AdminUsers";
import UserDashboard from "./pages/user/UserDashboard";
import UserDroplets from "./pages/user/UserDroplets";
import CreateDroplet from "./pages/user/CreateDroplet";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/droplets" element={<AdminDroplets />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/api-keys" element={<ApiKeys />} />
          
          {/* User Routes */}
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/dashboard/droplets" element={<UserDroplets />} />
          <Route path="/dashboard/droplets/create" element={<CreateDroplet />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
