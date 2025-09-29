"use client";

import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  return (
    <div>
      <h1>Deep Finance Research Chatbot</h1>
      {/* Chat UI components will go here */}
    </div>
  );
}
