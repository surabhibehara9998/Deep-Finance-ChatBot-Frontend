"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Typography, List, Paper } from "@mui/material";
import api from "../../lib/api";
import MessageBubble from "../../components/MessageBubble";
import ChatInput from "../../components/ChatInput";

export default function ChatPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [threads, setThreads] = useState([]); // list of chat threads
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]); // messages in active thread
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch user's chat threads
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/chats");
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setThreads(data);
        if (data.length > 0) setActiveThreadId(data[0]._id);
      } catch (err) {
        console.error("Failed to fetch threads:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Fetch messages for the active thread
  useEffect(() => {
    if (!activeThreadId) return;
    let cancelled = false;

    (async () => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/chats/${activeThreadId}`);
        if (!cancelled) setMessages(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeThreadId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (newMessageContent) => {
    // optimistic UI update
    const newMessage = {
      _id: Date.now().toString(),
      sender: "user",
      content: newMessageContent,
    };
    setMessages((prev) => [...prev, newMessage]);
    // TODO: POST to server or send via websocket
  };

  // Show spinner while checking auth; render nothing while redirecting
  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <Box sx={{ display: "flex", height: "100vh", flexDirection: "column" }}>
      <Typography variant="h4" sx={{ p: 2, textAlign: "center" }}>
        Deep Finance Research Chatbot
      </Typography>

      <Paper elevation={3} sx={{ flexGrow: 1, overflowY: "auto", p: 2, m: 2 }}>
        {loadingMessages ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {messages.map((msg) => (
              <MessageBubble key={msg._id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Paper>

      <ChatInput onSendMessage={handleSendMessage} />
    </Box>
  );
}
