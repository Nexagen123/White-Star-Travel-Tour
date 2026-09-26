import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import logo from "../../../assets/images/whitestarlogo.png";
import { brandImages } from "../../../theme/brandImages";
import { Mail, Lock, Phone, ShieldCheck } from "lucide-react";
import { theme } from "../../../theme/theme";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    agentCode: "",
  });

  const [loading, setLoading] = useState(false);
  const [autoLoginTriggered, setAutoLoginTriggered] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const performLogin = useCallback(async (payload) => {
    setLoading(true);
    try {
      const identifier = payload.email.trim();
      const isPhone = /^[\d\s\+\-\(\)]+$/.test(identifier);

      const res = await axiosInstance.post(
        "/auth/login",
        {
          ...(isPhone ? { phone: identifier } : { email: identifier }),
          password: payload.password,
          agentCode: payload.agentCode || undefined,
        },
        {
          withCredentials: true,
        },
      );

      if (res.status === 200 && res.data.success) {
        toast.success("Login successful!");

        if (res.data.redirectUrl) {
          window.location.href = res.data.redirectUrl;
          return;
        }

        if (res.data.token && res.data.user) {
          localStorage.setItem("frontend_token", res.data.token);
          localStorage.setItem("frontend_user", JSON.stringify(res.data.user));

          if (
            res.data.user.role === "Admin" ||
            res.data.user.role === "Super Admin"
          ) {
            window.location.href = "/admin-portal/";
          } else {
            window.location.href = "/dashboard";
          }
          return;
        }
        toast.error("Login response is missing redirect or token.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Server error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email") || "";
    const password = params.get("password") || "";
    const agentCode = params.get("agentCode") || "";
    const auto = params.get("auto") === "true";

    if (!email && !password && !agentCode) return;

    const payload = {
      email: decodeURIComponent(email),
      password: decodeURIComponent(password),
      agentCode: decodeURIComponent(agentCode),
    };

    setFormData(payload);

    if (auto && payload.email && payload.password && !autoLoginTriggered) {
      setAutoLoginTriggered(true);
      performLogin(payload);
    }
  }, [autoLoginTriggered, performLogin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performLogin(formData);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      toast.error("Email is required.");
      return;
    }
    setForgotLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", {
        email: forgotEmail,
      });
      toast.success("Password reset link sent successfully.");
      setShowForgot(false);
      setForgotEmail("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send reset link.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans relative">
      {/* ── TOP FLOATING BRAND LOGO ── */}
      <Link
        to="/"
        className="absolute top-6 left-6 lg:top-8 lg:left-8 z-50 block rounded-xl bg-white border border-neutral-100 px-4 py-2 shadow-sm"
      >
        <img
          style={{
            height: "60px",
          }}
          src={logo}
          alt="White Star Travel & Tours"
          className="h-10 w-auto object-contain"
        />
      </Link>

      {/* ── LEFT SECTION: BRAND ARCHITECTURE PANEL ── */}
      <div className="w-full lg:w-5/12 relative min-h-90 lg:min-h-0 flex flex-col justify-end p-8 md:p-16 text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ backgroundImage: `url(${brandImages.makkahPackage})` }}
        />
        <div className="absolute inset-0 bg-neutral-900/75" />

        <div className="relative z-10 space-y-4 max-w-md">
          <span className="text-[10px] uppercase tracking-widest font-bold bg-white/10 text-white border border-white/10 px-2.5 py-1 rounded">
            Enterprise Console
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight pt-2">
            White Star Travel & Tours
          </h1>
          <p className="text-white/70 text-xs leading-relaxed font-medium border-t border-white/10 pt-4">
            Secure access for agents to manage bookings, browse live seats,
            and coordinate Umrah and international travel requests.
          </p>
        </div>
      </div>

      {/* ── RIGHT SECTION: AUTHENTICATION INTERFACE ── */}
      <div
        className="w-full lg:w-7/12 p-6 md:p-16 flex flex-col justify-center items-center"
        style={{ backgroundColor: theme?.colors?.lightBg || "#f8fafc" }}
      >
        <div className="w-full max-w-md bg-white border border-neutral-100 rounded-xl shadow-sm p-8 md:p-10 flex flex-col gap-6">
          <header className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Agent Portal
            </p>
            <h2 className="text-2xl font-black text-gray-900">Sign In</h2>
            <p className="text-xs text-gray-400 font-medium">
              Access your global control panel session securely.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center gap-1">
                  <Mail size={14} />
                </div>
                <input
                  type="text"
                  name="email"
                  placeholder="Email ..."
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-14 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Lock size={14} />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-xs font-bold tracking-wider uppercase text-white shadow-sm transition-colors mt-2 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
              style={{
                backgroundColor: loading
                  ? undefined
                  : theme?.colors?.primary || "#0B2C56",
              }}
            >
              {loading ? "Verifying..." : "Login"}
            </button>
          </form>

          {/* SYSTEM INTERFACES AND NAVIGATION LINKS */}
          <div className="pt-4 border-t border-neutral-100 flex flex-col gap-2.5 text-center text-xs font-medium">
            <p className="text-gray-400">
              Not registered?{" "}
              <Link
                to="/auth/register"
                className="font-bold hover:underline"
                style={{ color: theme?.colors?.accent || "#E95432" }}
              >
                Apply for Account
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors inline-block mx-auto"
            >
              Forgot system access rules?{" "}
              <span className="font-bold underline">Reset credentials</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CLEAN SYSTEM MODAL: CREDEENTIAL RECOVERY ── */}
      {showForgot && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-sm w-full p-6 md:p-8 shadow-xl text-center space-y-5">
            <div className="w-12 h-12 bg-neutral-50 border border-neutral-100 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="text-neutral-500" size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900">
                Credential Recovery
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Provide your corporate email identity code below to distribute
                initialization tokens.
              </p>
            </div>

            <input
              type="email"
              placeholder="name@company.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm text-gray-900 outline-none focus:border-neutral-400 placeholder:text-gray-400"
            />

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="w-full py-2.5 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm disabled:bg-neutral-200"
                style={{
                  backgroundColor: forgotLoading
                    ? undefined
                    : theme?.colors?.primary || "#0B2C56",
                }}
              >
                {forgotLoading ? "Transmitting..." : "Send Verification Token"}
              </button>

              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full py-1 text-gray-400 hover:text-gray-600 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
