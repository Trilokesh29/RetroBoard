import React from "react";
import Header from "./Header";
import Body from "./Body";
import Footer from "./Footer";
import LoginPage from "./LoginPage";
import { AuthProvider, useAuth } from "../AuthContext";

function AppContent() {
  const { isLoading, user } = useAuth();

  return (
    <div className="app-shell">
      <div className="app-frame">
        <Header />
        <main className="app-main">
          <section className="app-surface app-content">
            {isLoading ? (
              <div className="loading-state">
                <h2>Preparing your workspace</h2>
                <p>Restoring your session and loading the latest retro context.</p>
              </div>
            ) : user ? (
              <Body />
            ) : (
              <LoginPage />
            )}
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
