"use client";

import { useState, useEffect, useRef } from "react";

export const useWebSocket = (token) => {
  const [messages, setMessages] = useState();
  const [isConnecting, setIsConnecting] = useState(true);
  const ws = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Connect to the WebSocket server
    // Ensure this URL points to your backend WebSocket endpoint
    ws.current = new WebSocket("ws://localhost:8080");

    ws.current.onopen = () => {
      console.log("WebSocket connection established.");
      // Authenticate the connection immediately after opening
      ws.current.send(
        JSON.stringify({
          event: "authenticate",
          payload: { token },
        })
      );
      setIsConnecting(false);
    };

    ws.current.onmessage = (event) => {
      const receivedMessage = JSON.parse(event.data);
      console.log("Received from server:", receivedMessage);
      setMessages((prevMessages) => [...prevMessages, receivedMessage]);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnecting(false);
    };

    ws.current.onclose = () => {
      console.log("WebSocket connection closed.");
      setIsConnecting(false);
    };

    // Cleanup function to close the connection when the component unmounts
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [token]);

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected.");
    }
  };

  return { messages, sendMessage, isConnecting };
};
