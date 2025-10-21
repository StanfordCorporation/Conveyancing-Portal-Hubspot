import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CheckCircle, FileText, Users, LogOut } from 'lucide-react';

export default function ClientDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const dealId = location.state?.dealId;
  const message = location.state?.message;

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Conveyancing Portal</h1>
                <p className="text-sm text-slate-600">Client Dashboard</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 animate-slide-down">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">{message}</h3>
              {dealId && (
                <p className="text-sm text-green-700 mt-1">Deal ID: {dealId}</p>
              )}
            </div>
          </div>
        )}

        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Your Dashboard</h2>
          <p className="text-slate-600">
            Track your property settlement progress and access all your conveyancing documents in one place.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Property Details Card */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Property Details</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              View and update your property information and disclosure details.
            </p>
            <button className="text-blue-600 font-medium text-sm hover:text-blue-700 transition-colors">
              View Details →
            </button>
          </div>

          {/* Documents Card */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              Access contracts, forms, and other important documents.
            </p>
            <button className="text-purple-600 font-medium text-sm hover:text-purple-700 transition-colors">
              View Documents →
            </button>
          </div>

          {/* Team Card */}
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Your Team</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              Contact your conveyancer, agent, and other parties involved.
            </p>
            <button className="text-green-600 font-medium text-sm hover:text-green-700 transition-colors">
              View Team →
            </button>
          </div>
        </div>

        {/* Progress Timeline (Placeholder) */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Settlement Progress</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">Disclosure Form Submitted</h4>
                <p className="text-sm text-slate-600">Form received and under review</p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-300">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">Conveyancer Assigned</h4>
                <p className="text-sm text-slate-600">Awaiting assignment</p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-300">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">Contracts Prepared</h4>
                <p className="text-sm text-slate-600">Not started</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
