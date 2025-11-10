import React, { useState } from 'react';

const Footer = () => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1 - Logo & About */}
          <div className="space-y-3 lg:col-span-1">
            <img
              src="/logo (1).webp"
              alt="Stanford Legal"
              className="h-10 w-auto object-contain brightness-0 invert mb-4"
            />
            <p className="text-slate-400 text-xs leading-relaxed">
              Being your Ipswich-based lawyers, serving Springfield, Brisbane and surrounds, we're proudly part of your community. For Family, Property, Commercial and Wills and Estate legal matters, we're here to reduce stress and anxiety, provide a service that's personal to you and deliver outcomes that are focused on how you can move forward with confidence.
            </p>
          </div>

          {/* Column 2 - Family Law */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Family Law</h3>
            <ul className="space-y-1.5">
              <li>
                <a href="https://stanfordlegal.com.au/family-law/divorce-lawyers/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Divorce Lawyers
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/family-law/family-dispute-resolution/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Family Dispute Resolution
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/family-law/mediation-arbitration/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Mediation & Arbitration
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/family-law/property-settlement-lawyers/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Property Settlement
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/family-law/parenting-arrangements/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Parenting Arrangements
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/family-law/consent-orders/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Consent Orders
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/family-law/binding-financial-agreement/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Binding Financial Agreement
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 - Property, Commercial & Wills */}
          <div>
            {/* Property Law */}
            <h3 className="font-semibold text-sm mb-3">Property Law</h3>
            <ul className="space-y-1.5 mb-6">
              <li>
                <a href="https://stanfordlegal.com.au/property-law/conveyancing/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Conveyancing
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/property-law/buying-a-property/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Buying a Property
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/property-law/selling-a-property/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Selling a Property
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/property-law/seller-disclosure-statement-qld/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Seller Disclosure Statement
                </a>
              </li>
            </ul>

            {/* Commercial Law */}
            <h3 className="font-semibold text-sm mb-3 mt-6">Commercial Law</h3>
            <ul className="space-y-1.5">
              <li>
                <a href="https://stanfordlegal.com.au/commercial-law/small-business-lawyer/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Small Business Lawyer
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 - Wills & Contact */}
          <div>
            {/* Wills & Estate Law */}
            <h3 className="font-semibold text-sm mb-3">Wills & Estate Law</h3>
            <ul className="space-y-1.5 mb-6">
              <li>
                <a href="https://stanfordlegal.com.au/wills-estate-planning/drafting-managing-legal-wills/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Drafting Legal Wills
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/wills-estate-planning/succession-planning/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Succession Planning
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/wills-estate-planning/estate-dispute-lawyer/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Estate Disputes
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/wills-estate-planning/enduring-power-of-attorney/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Power of Attorney
                </a>
              </li>
              <li>
                <a href="https://stanfordlegal.com.au/wills-estate-planning/deceased-estate-administration/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors text-xs">
                  Estate Administration
                </a>
              </li>
            </ul>

            {/* Contact Info */}
            <h3 className="font-semibold text-sm mb-3 mt-6">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a href="tel:0483980001" className="text-slate-400 hover:text-blue-400 transition-colors text-xs block">
                  0483 980 001
                </a>
              </li>
              <li>
                <a href="mailto:hello@stanfordlegal.au" className="text-slate-400 hover:text-blue-400 transition-colors text-xs block">
                  hello@stanfordlegal.au
                </a>
              </li>
              <li>
                <span className="text-slate-400 text-xs block">
                  Level 8, Springfield Tower<br />
                  145 Sinnathamby Blvd<br />
                  Springfield Central QLD 4300
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            {/* Copyright */}
            <p className="text-slate-500 text-xs">
              © {new Date().getFullYear()} Stanford Legal. All rights reserved.
            </p>

            {/* Links */}
            <div className="flex items-center gap-6">
              <a
                href="https://stanfordlegal.com.au/our-services/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-blue-400 transition-colors text-xs"
              >
                Our Services
              </a>
              <a
                href="https://stanfordlegal.com.au/news/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-blue-400 transition-colors text-xs"
              >
                News & Updates
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
