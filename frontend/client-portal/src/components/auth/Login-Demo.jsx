import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowRight, CheckCircle, Shield, Clock, AlertCircle } from 'lucide-react';
import { sendOTP, verifyOTP } from '../../services/authService';
import { ParticleWaves } from '../ui/ParticleWaves';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

export default function ConveyancingLogin() {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    setIsLoading(true);
    setError('');

    try {
      const identifier = loginMethod === 'email' ? email : mobile;
      const result = await sendOTP(identifier, loginMethod);

      console.log('OTP sent successfully:', result);
      // In development, show OTP in console
      if (result.otp) {
        console.log('🔑 Development OTP:', result.otp);
      }

      setIsLoading(false);
      setOtpSent(true);
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Failed to send OTP. Please try again.');
      console.error('Send OTP error:', err);
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    setError('');

    try {
      const identifier = loginMethod === 'email' ? email : mobile;
      const otpString = otp.join('');

      const result = await verifyOTP(identifier, otpString, loginMethod);

      console.log('Login successful:', result);

      setIsLoading(false);
      setIsTransitioning(true);

      // After transition completes, redirect to dashboard
      setTimeout(() => {
        navigate('../dashboard');
      }, 3500);
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Invalid OTP. Please try again.');
      console.error('Verify OTP error:', err);
      // Clear OTP fields on error
      setOtp(['', '', '', '', '', '']);
    }
  };

  const features = [
    { icon: Shield, title: 'Secure & Private', desc: 'Bank-level security for your documents' },
    { icon: Clock, title: 'Real-Time Updates', desc: 'Track every step of your settlement' },
    { icon: CheckCircle, title: 'Easy Access', desc: 'View documents and updates 24/7' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Particle Wave background */}
      <ParticleWaves isTransitioning={isTransitioning} />

      {/* Transition overlay - Fade to black after waves expand */}
      <div className={`absolute inset-0 bg-black pointer-events-none z-30 transition-opacity duration-2000 ${isTransitioning ? 'fade-to-black' : 'opacity-0'}`}></div>

      <div className={`w-full max-w-6xl grid lg:grid-cols-2 gap-8 relative z-10 transition-all duration-700 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="hidden lg:flex flex-col justify-center space-y-8 p-12">
          <div className="space-y-4 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-blue-600 rounded-full">
              <span className="text-white font-semibold text-sm tracking-wide">CLIENT PORTAL</span>
            </div>
            <h1 className="text-5xl font-bold text-slate-900 leading-tight">
              Welcome to Your
              <br />
              <span className="text-blue-600">Conveyancing Journey</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Track your property settlement progress in real-time with our secure client portal
            </p>
          </div>

          <div className="space-y-6 animate-fade-in-delay">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl transform transition-all hover:scale-105 hover:bg-white/80"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-slide-up">
            <div className="lg:hidden mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900">Client Portal</h2>
              <p className="text-slate-600 text-sm mt-1">Access your conveyancing details</p>
            </div>

            {!otpSent ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In</h2>
                  <p className="text-slate-600">Enter your details to access your portal</p>
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-6">
                  <button
                    onClick={() => setLoginMethod('email')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-medium transition-all ${
                      loginMethod === 'email'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={() => setLoginMethod('mobile')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-medium transition-all ${
                      loginMethod === 'mobile'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Mobile</span>
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {loginMethod === 'email' ? (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="h-12"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="0412 345 678"
                        className="h-12"
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleSendOTP}
                    disabled={isLoading || (loginMethod === 'email' ? !email : !mobile)}
                    className="w-full h-12 group"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-sm text-slate-600 text-center">
                    We'll send you a secure one-time code to verify your identity
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter Verification Code</h2>
                  <p className="text-slate-600">
                    We've sent a 6-digit code to<br />
                    <span className="font-semibold text-slate-900">
                      {loginMethod === 'email' ? email : mobile}
                    </span>
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    ))}
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isLoading || otp.some(d => !d)}
                    className="w-full h-12 group"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  <div className="text-center space-y-2">
                    <button
                      onClick={() => setOtpSent(false)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Change {loginMethod === 'email' ? 'email' : 'mobile number'}
                    </button>
                    <p className="text-sm text-slate-600">
                      Didn't receive the code?{' '}
                      <button
                        onClick={handleSendOTP}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Resend
                      </button>
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                Protected by 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.3s both;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }

        .fade-to-black {
          opacity: 1 !important;
          transition-delay: 1.5s !important;
        }

        .duration-2000 {
          transition-duration: 2000ms;
        }
      `}</style>
    </div>
  );
}
