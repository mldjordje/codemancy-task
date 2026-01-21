"use client";

import { useState } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#145a7a" },
    secondary: { main: "#d26a3a" },
    success: { main: "#1e7b4d" },
    warning: { main: "#c46d00" },
    error: { main: "#b3261e" },
    background: {
      default: "#f6f3eb",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: "var(--font-sans)",
    h1: { fontFamily: "var(--font-serif)", fontWeight: 600 },
    h2: { fontFamily: "var(--font-serif)", fontWeight: 600 },
    h3: { fontFamily: "var(--font-serif)", fontWeight: 600 },
    h4: { fontFamily: "var(--font-serif)", fontWeight: 600 },
    h5: { fontFamily: "var(--font-serif)", fontWeight: 600 },
    h6: { fontFamily: "var(--font-serif)", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </AppRouterCacheProvider>
  );
}
