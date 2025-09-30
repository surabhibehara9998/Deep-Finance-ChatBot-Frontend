"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  List,
  Paper,
  Drawer,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Button,
  Skeleton,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import LogoutIcon from "@mui/icons-material/Logout";
import api from "../../lib/api";
import MessageBubble from "../../components/MessageBubble";
import ChatInput from "../../components/ChatInput";

const drawerWidth = 320;

export default function ChatPage() {
  const {
    isAuthenticated,
    token,
    loading: authLoading,
    logout,
    user,
  } = useAuth();
  const router = useRouter();

  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const ws = useRef(null); // WebSocket reference

  // --- 1. WebSocket Connection Effect ---
  useEffect(() => {
    if (!token) return; // Don't connect if not authenticated

    ws.current = new WebSocket("ws://localhost:8080");

    ws.current.onopen = () => {
      console.log("WebSocket connection established.");
      ws.current.send(
        JSON.stringify({
          event: "authenticate",
          payload: { token },
        })
      );
    };

    ws.current.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        console.log("Received from server:", receivedData);
        setMessages((prevMessages) => [...prevMessages, receivedData]);
      } catch (error) {
        console.log("Received raw data:", event.data);
        const assistantResponse = {
          _id: `assistant-${Date.now()}`,
          sender: "assistant",
          content: event.data,
        };
        setMessages((prevMessages) => [...prevMessages, assistantResponse]);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.current.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    // Cleanup function to close connection
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [token]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, authLoading, router]);

  // Fetch threads function
  const fetchThreads = async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingThreads(true);
      const res = await api.get("/chats");
      const data = Array.isArray(res.data) ? res.data : [];
      setThreads(data);
      // Select first thread if none active
      if (data.length > 0 && !activeThreadId) {
        setActiveThreadId(data[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    } finally {
      setLoadingThreads(false);
    }
  };

  // Fetch user's chat threads on load
  useEffect(() => {
    if (isAuthenticated) {
      fetchThreads();
    }
  }, [isAuthenticated]);

  // Fetch messages for active thread
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]); // Clear messages if no thread active
      return;
    }
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

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 2. Send message handler ---
  const handleSendMessage = async (newMessageContent) => {
    // Optimistic UI update
    const userMessage = {
      _id: Date.now().toString(),
      sender: "user",
      content: newMessageContent,
    };
    setMessages((prev) => [...prev, userMessage]);

    let currentThreadId = activeThreadId;

    // Create thread if none exists
    if (!currentThreadId) {
      try {
        const res = await api.post("/chats", {
          initialMessage: newMessageContent,
        });
        currentThreadId = res.data._id;
        setActiveThreadId(currentThreadId);
        await fetchThreads(); // Refresh thread list
      } catch (error) {
        console.error("Failed to create new thread:", error);
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== userMessage._id)
        );
        return;
      }
    }

    // Send message via WebSocket
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          event: "message:send",
          payload: {
            threadId: currentThreadId,
            content: newMessageContent,
          },
        })
      );
    } else {
      console.error("WebSocket is not connected.");
      // Optionally handle UI error
    }
  };

  // --- 3. New thread handler ---
  const handleNewThread = () => {
    setActiveThreadId(null);
    setMessages([]);
    setMobileOpen(false);
  };

  const toggleMobile = () => setMobileOpen((v) => !v);

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

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar sx={{ width: 36, height: 36 }}>
          {(user?.name || "U").slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap fontWeight={600}>
            {user?.name || "User"}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.email || "signed in"}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="New conversation">
          <IconButton size="small" onClick={handleNewThread}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: "auto", px: 1 }}>
        {loadingThreads ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ px: 1, py: 1 }}>
              <Skeleton variant="rounded" height={56} />
            </Box>
          ))
        ) : threads.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            <Typography variant="body2">No conversations yet.</Typography>
            <Typography variant="caption">
              Start one from the bottom input.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {threads.map((t) => {
              const selected = t._id === activeThreadId;
              return (
                <ListItemButton
                  key={t._id}
                  selected={selected}
                  onClick={() => {
                    setActiveThreadId(t._id);
                    setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                    "&.Mui-selected": {
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": { bgcolor: "primary.main" },
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      {(t.title || "C").slice(0, 1).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={t.title || "Conversation"}
                    secondary={
                      t.updatedAt
                        ? new Date(t.updatedAt).toLocaleString()
                        : null
                    }
                    primaryTypographyProps={{ noWrap: true, fontWeight: 600 }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      <Divider />
      <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={() => {
            logout?.();
            router.replace("/login");
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(1200px 600px at 100% -20%, rgba(33,150,243,0.15) 0%, rgba(33,150,243,0) 70%), radial-gradient(800px 400px at -10% 110%, rgba(156,39,176,0.12) 0%, rgba(156,39,176,0) 70%)",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "saturate(180%) blur(8px)",
          backgroundColor: (t) =>
            t.palette.mode === "dark"
              ? "rgba(18,18,18,0.8)"
              : "rgba(255,255,255,0.7)",
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={toggleMobile}
            sx={{ mr: 1, display: { md: "none" } }}
            aria-label="open drawer"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Deep Finance Research Chatbot
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="chat threads"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={toggleMobile}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "&.MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "&.MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Toolbar />
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            m: { xs: 1.5, md: 2.5 },
            p: { xs: 1, md: 2 },
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            border: (t) => `1px solid ${t.palette.divider}`,
            background: (t) =>
              t.palette.mode === "dark"
                ? "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))"
                : "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.8))",
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              px: { xs: 0.5, md: 1 },
              py: 1,
            }}
          >
            {loadingMessages ? (
              <Box sx={{ p: { xs: 1.5, md: 3 } }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    height={56}
                    sx={{ my: 1, opacity: 0.7 }}
                  />
                ))}
              </Box>
            ) : messages.length === 0 ? (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "text.secondary",
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Say hello to your research copilot
                  </Typography>
                  <Typography variant="body2">
                    Ask questions about markets, companies, filings, or anything
                    finance.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <List sx={{ px: { xs: 0.5, md: 1 } }}>
                {messages.map((msg) => (
                  <MessageBubble key={msg._id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>

          <Box
            sx={{
              position: "sticky",
              bottom: 0,
              borderTop: (t) => `1px solid ${t.palette.divider}`,
              backgroundColor: "background.paper",
              px: { xs: 1, md: 2 },
              py: 1,
            }}
          >
            <ChatInput onSendMessage={handleSendMessage} />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
