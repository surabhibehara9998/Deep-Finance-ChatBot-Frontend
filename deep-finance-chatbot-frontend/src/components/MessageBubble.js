"use client";

import React from "react";
import { Box, Paper, Typography } from "@mui/material";

const MessageBubble = ({ message }) => {
  const isUser = message.sender === "user";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 2,
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          backgroundColor: isUser ? "primary.main" : "grey.200",
          color: isUser ? "primary.contrastText" : "text.primary",
          maxWidth: "70%",
          borderRadius: isUser ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
        }}
      >
        <Typography variant="body1">{message.content}</Typography>
      </Paper>
    </Box>
  );
};

export default MessageBubble;
