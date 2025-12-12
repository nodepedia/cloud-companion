import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cloud, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isAuthPage = location.pathname === "/auth";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Cloud className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">CloudManager</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Beranda
            </Link>
            <Link 
              to="/#features" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Fitur
            </Link>
            <Link 
              to="/#about" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Tentang
            </Link>
          </div>

          {/* Auth Buttons */}
          {!isAuthPage && (
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/auth">Masuk</Link>
              </Button>
              <Button variant="default" asChild>
                <Link to="/auth?mode=register">Daftar</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-up">
            <div className="flex flex-col gap-4">
              <Link 
                to="/" 
                className="text-muted-foreground hover:text-foreground transition-colors px-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Beranda
              </Link>
              <Link 
                to="/#features" 
                className="text-muted-foreground hover:text-foreground transition-colors px-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Fitur
              </Link>
              <Link 
                to="/#about" 
                className="text-muted-foreground hover:text-foreground transition-colors px-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Tentang
              </Link>
              {!isAuthPage && (
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Masuk</Link>
                  </Button>
                  <Button variant="default" asChild>
                    <Link to="/auth?mode=register" onClick={() => setIsMenuOpen(false)}>Daftar</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
