import React, { useState } from "react";
import { Button, Input, Card } from "../../components/ui";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // backend login logic goes here
    console.log("Logging in with:", { email, password });

    // transition to main page will go here, for now we just simulate a delay
    setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Card
        className="
        w-[380px] 
        rounded-2xl 
        bg-white/95 
        border border-white/10 
        shadow-[0_25px_80px_rgba(0,0,0,0.55)]
        transform 
        perspective-[1200px] 
        -rotate-x-1 
        hover:-rotate-x-0 
        hover:-translate-y-1.5 
        hover:shadow-[0_35px_100px_rgba(0,0,0,0.75)]
        transition-all 
        duration-300 
        ease-out
        backdrop-blur-xl
      "
      >
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-gray-500">
            Sign in to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"

              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <div className="text-xs text-center text-gray-500">
          <a href="#" className="hover:underline">
            {" "}
            Forgot your password?
          </a>
        </div>

        <div className="text-xs text-center text-gray-500">
          <span>Don't have an account yet?</span>{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Create One
          </Link>
        </div>
      </Card>

      <div className="absolute blur-3xl opacity-50 pointer-events-none">
        <div className="w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply animate-pulse"></div>
        <div className="w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply animate-pulse delay-1000"></div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-300 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-300 rounded-full opacity-30 blur-3xl"></div>
      </div>
    </div>
  );
}
