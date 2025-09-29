"use client";

import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";

const ChatInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleSend();
    }
  };

  return (
    <Box sx={{ display: "flex", p: 2 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <Button variant="contained" onClick={handleSend} sx={{ ml: 1 }}>
        Send
      </Button>
    </Box>
  );
};

export default ChatInput;
