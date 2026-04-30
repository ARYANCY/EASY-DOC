"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, setCurrentUser } from "../../features/auth/authService";
import { Scale, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(name, email);
      setCurrentUser(user);
      router.push("/");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please check server connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-4 font-mono selection:bg-[#00ff00] selection:text-black">
      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]" />
      
      <div className="w-full max-w-md border-2 border-[#00ff00] bg-[#0c0c0c] shadow-[0_0_20px_rgba(0,255,0,0.2)] overflow-hidden relative">
        {/* Terminal Header */}
        <div className="bg-[#00ff00] px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-3 h-3 text-black" />
            <span className="text-[10px] font-bold text-black uppercase tracking-tighter">C:\SYSTEM\LEGAL_AI\AUTH.EXE</span>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 border border-black" />
            <div className="w-2 h-2 border border-black bg-black" />
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-[#00ff00] mb-2 uppercase tracking-widest leading-none">
              > ACCESS_GATEWAY
            </h1>
            <div className="h-1 w-12 bg-[#00ff00] mb-4 animate-pulse" />
            <p className="text-[#00ff00]/60 text-xs leading-relaxed">
              INITIALIZING ENCRYPTED UPLOAD PROTOCOL...<br />
              READY FOR AUTHENTICATION SEED.
            </p>
          </div>

          {error && (
            <div className="border border-red-500 bg-red-500/10 text-red-500 px-3 py-2 mb-6 text-[10px] uppercase">
              [!] ERROR: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-[10px] text-[#00ff00] uppercase opacity-70">User_Identifier</label>
              <div className="relative group">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#00ff00] text-xs">$</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[#00ff00]/30 border-dashed focus:border-[#00ff00] focus:border-solid transition-all outline-none text-[#00ff00] text-sm pl-4 py-2"
                  placeholder="ID_GIBSON"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-[#00ff00] uppercase opacity-70">Encrypted_Mail_Link</label>
              <div className="relative group">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#00ff00] text-xs">$</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[#00ff00]/30 border-dashed focus:border-[#00ff00] focus:border-solid transition-all outline-none text-[#00ff00] text-sm pl-4 py-2"
                  placeholder="MAIL@NODE.SYS"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00ff00] text-black font-bold py-3 uppercase text-xs tracking-[0.2em] hover:bg-[#00ff00]/90 transition-all disabled:opacity-50 relative group active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>DECRYPTING...</span>
                </div>
              ) : (
                "EXECUTE_SIGN_IN"
              )}
              {/* Button Corners */}
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#00ff00] group-hover:top-0 group-hover:left-0 transition-all" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#00ff00] group-hover:bottom-0 group-hover:right-0 transition-all" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#00ff00]/20 flex justify-between items-center text-[8px] text-[#00ff00]/40 uppercase tracking-widest">
            <span>SECURE_SHELL_V4.2</span>
            <span>LEVEL_03_CLEARANCE</span>
          </div>
        </div>
      </div>
      
      {/* Visual Glitch Elements */}
      <div className="fixed bottom-4 right-4 text-[#00ff00]/20 text-[8px] font-mono pointer-events-none hidden md:block">
        CORE_LOAD: 12%<br />
        MEM_ADDR: 0x8FF21A<br />
        UPLINK: ACTIVE
      </div>
    </div>
  );
}
