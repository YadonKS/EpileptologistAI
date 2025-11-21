import React, { useState } from "react";
import { Button, Input, Card } from "../../components/ui";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function SignUp() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if(password !== confirm){
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        // backend signup logic goes here
        console.log("Signing up with:", { name, email, password  });

        // transition to main page will go here, for now we just simulate a delay
        setTimeout(() => {
            setLoading(false);
            navigate("/");
        }, 500);
    };

    return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-300 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-300 rounded-full opacity-30 blur-3xl" />
      </div>

      <Card
        className="
          w-[420px]
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
          p-6
          space-y-5
        "
      >
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-sm text-gray-500">
            Sign up to start using your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Full name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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

          <div className="space-y-1">
            <label htmlFor="confirm" className="text-sm font-medium">
              Confirm password
            </label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </Button>
        </form>

        <div className="text-xs text-center text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Log in
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