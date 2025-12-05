import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Rutas from "./pages/Rutas";
import Comprar from "./pages/Comprar";
import MiBoleto from "./pages/MiBoleto";
import MisBoletos from "./pages/MisBoletos";
import Perfil from "./pages/Perfil";
import Fidelidad from "./pages/Fidelidad";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/rutas" element={<Rutas />} />
            <Route path="/comprar" element={<Comprar />} />
            <Route path="/mi-boleto" element={<MiBoleto />} />
            <Route path="/mis-boletos" element={<MisBoletos />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/fidelidad" element={<Fidelidad />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
