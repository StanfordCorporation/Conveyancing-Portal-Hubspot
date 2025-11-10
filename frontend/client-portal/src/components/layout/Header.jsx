import React from 'react';
import { Phone, ArrowRight } from 'lucide-react';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/logo (1).webp"
              alt="Stanford Legal"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Right side - Phone & Contact Link */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Phone Number */}
            <a
              href="tel:0483980001"
              className="hidden sm:flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-5 h-5 text-primary" />
              <span className="font-medium">0483 980 001</span>
            </a>

            {/* Mobile Phone Icon Only */}
            <a
              href="tel:0483980001"
              className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Phone className="w-5 h-5" />
            </a>

            {/* Contact Us Link */}
            <a
              href="https://stanfordlegal.com.au/contact/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
            >
              <span className="hidden sm:inline">CONTACT US</span>
              <span className="sm:hidden">CONTACT</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
