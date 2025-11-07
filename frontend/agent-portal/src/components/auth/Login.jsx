import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, Phone, ArrowRight, Shield, Clock, CheckCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { VideoBackground } from "../ui/VideoBackground";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { useVideoTheme } from "../../context/ThemeVideoContext";
import api from "../../services/api";

const AgentLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { isDarkMode } = useVideoTheme();
  const [loginMethod, setLoginMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // Pre-fill email/mobile and message from redirect
  useEffect(() => {
    if (location.state) {
      if (location.state.email) {
        setEmail(location.state.email);
        setLoginMethod("email");
      } else if (location.state.phone) {
        setMobile(location.state.phone);
        setLoginMethod("mobile");
      }
      if (location.state.message) {
        setSuccessMessage(location.state.message);
      }
    }
  }, [location.state]);

  // Format phone number with spaces: 0412345678 -> 0412 345 678
  const formatPhoneNumber = (value) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');

    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);

    // Format as XXXX XXX XXX (4 digits, space, 3 digits, space, 3 digits)
    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 4)} ${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7)}`;
    }
  };

  // Validate phone number: must be exactly 10 digits (Australian format)
  const isValidPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.length === 10 && cleaned.startsWith('0');
  };

  const handleMobileChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setMobile(formatted);
  };

  const handleSendOTP = async () => {
    setError("");
    setIsLoading(true);

    try {
      // Strip spaces from mobile numbers before sending
      const cleanIdentifier = loginMethod === "email" ? email : mobile.replace(/\s/g, '');

      if (!cleanIdentifier) {
        setError(`Please enter your ${loginMethod}`);
        setIsLoading(false);
        return;
      }

      // Additional validation for mobile
      if (loginMethod === "mobile" && !isValidPhoneNumber(cleanIdentifier)) {
        setError("Please enter a valid 10-digit Australian mobile number (starting with 0)");
        setIsLoading(false);
        return;
      }

      console.log(`📤 Sending OTP to agent ${loginMethod}: ${cleanIdentifier}`);

      const response = await api.post('/auth/send-otp?type=agent', {
        identifier: cleanIdentifier,
        method: loginMethod
      });

      console.log('✅ OTP sent successfully:', response.data);
      setOtpSent(true);
      setError("");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send OTP';
      console.error('❌ Error sending OTP:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    setIsLoading(true);

    try {
      // Strip spaces from mobile numbers before sending
      const cleanIdentifier = loginMethod === "email" ? email : mobile.replace(/\s/g, '');
      const otpCode = otp.join("");

      if (!otpCode || otpCode.length !== 6) {
        setError("Please enter a valid 6-digit code");
        setIsLoading(false);
        return;
      }

      console.log(`🔐 Verifying OTP for agent ${loginMethod}: ${cleanIdentifier}`);

      const response = await api.post('/auth/verify-otp?type=agent', {
        identifier: cleanIdentifier,
        otp: otpCode,
        method: loginMethod
      });

      console.log('✅ OTP verified successfully:', response.data);

      // Use auth context login method
      authLogin(response.data.user, response.data.token);

      setError("");

      // Wait for animation then redirect
      setTimeout(() => {
        console.log('✅ Redirecting to agent dashboard...');
        navigate('/agent/dashboard');
      }, 1500);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to verify OTP';
      console.error('❌ Error verifying OTP:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Shield, title: "Secure & Private", desc: "Bank-level security for your data" },
    { icon: Clock, title: "Real-Time Updates", desc: "Track progress as it happens" },
    { icon: CheckCircle, title: "Easy Access", desc: "Manage deals anytime, anywhere" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4 overflow-hidden relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Video Background */}
      <VideoBackground isDarkMode={isDarkMode} />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 relative z-10">
        {/* Left side - Features */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 p-12">
          <div className="space-y-4 animate-fade-in">
            <div className={`inline-block px-5 py-2 rounded-full shadow-lg transition-colors duration-700 ${
              isDarkMode ? "bg-blue-500" : "bg-blue-600"
            }`}>
              <span className="text-white font-bold text-sm tracking-wider">
                AGENT PORTAL
              </span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight drop-shadow-lg">
              Welcome to Your
              <br />
              <span className={`drop-shadow-[0_0_20px_rgba(96,165,250,0.5)] transition-colors duration-700 ${
                isDarkMode ? "text-blue-300" : "text-blue-400"
              }`}>Agent Portal</span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed drop-shadow-md">
              Manage your deals and clients securely with our modern agent portal
            </p>
          </div>

          <div className="space-y-6 animate-fade-in-delay">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-4 p-5 backdrop-blur-md rounded-xl transform transition-all hover:scale-105 border shadow-xl ${
                    isDarkMode 
                      ? "bg-slate-800/40 hover:bg-slate-800/60 border-slate-700/50" 
                      : "bg-white/20 hover:bg-white/30 border-white/30"
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg text-white flex-shrink-0 shadow-lg transition-colors duration-700 ${
                    isDarkMode ? "bg-blue-500" : "bg-blue-500"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1 drop-shadow-md">{feature.title}</h3>
                    <p className="text-sm text-white/80 drop-shadow-sm">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex items-center justify-center p-4">
          <div className={`w-full max-w-md backdrop-blur-lg rounded-2xl shadow-2xl p-8 animate-slide-up border transition-colors duration-700 ${
            isDarkMode 
              ? "bg-slate-900/95 border-slate-700/50" 
              : "bg-white/95 border-white/50"
          }`}>
            <div className="lg:hidden mb-8 text-center">
              <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Agent Portal</h2>
              <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>Access your secure portal</p>
            </div>

            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">{successMessage}</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {!otpSent ? (
              <>
                <div className="mb-8">
                  <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Sign In</h2>
                  <p className={isDarkMode ? "text-slate-300" : "text-gray-600"}>Enter your details to access your portal</p>
                </div>

                <div className={`flex gap-2 p-1 rounded-lg mb-6 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
                  <button
                    onClick={() => setLoginMethod("email")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-medium transition-all ${
                      loginMethod === "email"
                        ? isDarkMode 
                          ? "bg-blue-600 text-white shadow-md" 
                          : "bg-white text-blue-600 shadow-md"
                        : isDarkMode
                          ? "text-slate-400 hover:text-white"
                          : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={() => setLoginMethod("mobile")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-medium transition-all ${
                      loginMethod === "mobile"
                        ? isDarkMode 
                          ? "bg-blue-600 text-white shadow-md" 
                          : "bg-white text-blue-600 shadow-md"
                        : isDarkMode
                          ? "text-slate-400 hover:text-white"
                          : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Mobile</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {loginMethod === "email" ? (
                    <div className="space-y-2">
                      <Label htmlFor="email" className={isDarkMode ? "text-white" : "text-gray-900"}>Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className={`h-12 ${
                          isDarkMode 
                            ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-blue-500/20" 
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="mobile" className={isDarkMode ? "text-white" : "text-gray-900"}>Mobile Number</Label>
                      <div>
                        <Input
                          id="mobile"
                          type="tel"
                          value={mobile}
                          onChange={handleMobileChange}
                          placeholder="0412 345 678"
                          className={`h-12 ${
                            mobile && !isValidPhoneNumber(mobile)
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                              : isDarkMode 
                                ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-blue-500/20" 
                                : "bg-white border-gray-300 text-gray-900"
                          }`}
                          maxLength="14"
                        />
                        {mobile && !isValidPhoneNumber(mobile) && (
                          <p className={`text-sm mt-1 ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                            Please enter a valid 10-digit Australian mobile number (starting with 0)
                          </p>
                        )}
                        {mobile && isValidPhoneNumber(mobile) && (
                          <p className={`text-sm mt-1 ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                            ✓ Valid phone number
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSendOTP}
                    disabled={isLoading || (loginMethod === "email" ? !email : !isValidPhoneNumber(mobile))}
                    className="w-full h-12 group"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                        <span className="ml-2">Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>

                <div className={`mt-6 pt-6 border-t ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
                  <p className={`text-sm text-center ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                    We'll send you a secure one-time code to verify your identity
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    isDarkMode ? "bg-blue-600/20" : "bg-blue-100"
                  }`}>
                    <Mail className={`w-8 h-8 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                  </div>
                  <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    Enter Verification Code
                  </h2>
                  <p className={isDarkMode ? "text-slate-300" : "text-gray-600"}>
                    We've sent a 6-digit code to
                    <br />
                    <span className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {loginMethod === "email" ? email : mobile}
                    </span>
                  </p>
                </div>

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
                        className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg outline-none transition-all ${
                          isDarkMode
                            ? "bg-slate-800 border-slate-600 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                            : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        }`}
                      />
                    ))}
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isLoading || otp.some((d) => !d)}
                    className="w-full h-12 group"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                        <span className="ml-2">Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  <div className="text-center space-y-2">
                    <button
                      onClick={() => setOtpSent(false)}
                      className={`text-sm font-medium ${
                        isDarkMode 
                          ? "text-blue-400 hover:text-blue-300" 
                          : "text-blue-600 hover:text-blue-700"
                      }`}
                    >
                      Change {loginMethod === "email" ? "email" : "mobile number"}
                    </button>
                    <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                      Didn't receive the code?{" "}
                      <button
                        onClick={handleSendOTP}
                        className={`font-medium ${
                          isDarkMode 
                            ? "text-blue-400 hover:text-blue-300" 
                            : "text-blue-600 hover:text-blue-700"
                        }`}
                      >
                        Resend
                      </button>
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className={`mt-8 pt-6 border-t text-center ${
              isDarkMode ? "border-slate-700" : "border-gray-200"
            }`}>
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                Protected by 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.3s both;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }

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
      `}</style>
    </div>
  );
};

export default AgentLogin;
