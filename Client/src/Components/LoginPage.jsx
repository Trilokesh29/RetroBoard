import React, { useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useAuth } from "../AuthContext";
import Config from "../Configuration";
import { demoProfiles } from "../demo/demoProfiles";

const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const userNameRegexp = /^[a-zA-Z][a-zA-Z0-9_-]{2,31}$/;

function LoginPage() {
  const { login, register } = useAuth();
  const [registerMode, setRegisterMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = useMemo(() => {
    if (!userNameRegexp.test(userName) || userPassword.length < 8) {
      return false;
    }

    if (!registerMode) {
      return true;
    }

    return emailRegexp.test(email) && userPassword === confirmPassword;
  }, [confirmPassword, email, registerMode, userName, userPassword]);

  async function submitCredentials(nextRegisterMode, credentials) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (nextRegisterMode) {
        await register(credentials);
      } else {
        await login(credentials);
      }
    } catch (error) {
      const serverMessage =
        error.response && typeof error.response.data === "string"
          ? error.response.data
          : nextRegisterMode
            ? "We couldn't create your account right now."
            : "We couldn't sign you in with those credentials.";

      setErrorMessage(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isFormValid) {
      return;
    }

    await submitCredentials(registerMode, registerMode
      ? {
          userName,
          emailId: email,
          password: userPassword,
        }
      : {
          userName,
          password: userPassword,
        });
  }

  async function handleDemoAccess(profile) {
    setRegisterMode(false);
    setUserName(profile.userName);
    setEmail(profile.emailId);
    setUserPassword(profile.password);
    setConfirmPassword(profile.password);
    await submitCredentials(false, {
      userName: profile.userName,
      password: profile.password,
    });
  }

  return (
    <div className="login-shell">
      <section className="login-hero">
        <div>
          <span className="hero-eyebrow">Team ritual, redesigned</span>
          <h1 className="hero-title">Turn every retro into a sharper next sprint.</h1>
          <p className="hero-copy">
            Capture the signal, align the room, and keep decisions visible with a cleaner
            board, living trends, and a more secure workspace.
          </p>
          <div className="feature-list">
            <div className="feature-item">
              <strong>Focused board flow</strong>
              Faster capture, cleaner structure, and less clutter during live retros.
            </div>
            <div className="feature-item">
              <strong>Shared team memory</strong>
              Trend lines, top-voted items, and action points stay easy to revisit.
            </div>
            <div className="feature-item">
              <strong>Safer authentication</strong>
              Sessions now stay server-side in secure cookies instead of browser storage.
            </div>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="hero-metric">
            <strong>3</strong>
            <span>Core columns tuned for fast facilitation</span>
          </div>
          <div className="hero-metric">
            <strong>Live</strong>
            <span>Happiness, velocity, and voting insights</span>
          </div>
          <div className="hero-metric">
            <strong>1 board</strong>
            <span>A calmer ritual from start to export</span>
          </div>
        </div>
      </section>

      <section className="login-card">
        <div className="section-heading">
          <div>
            <h2>{registerMode ? "Create your workspace access" : "Welcome back"}</h2>
            <p className="section-caption">
              {registerMode
                ? "Create an account with a stronger password and jump straight into your retro."
                : "Sign in to continue into your team's retrospective space."}
            </p>
          </div>
        </div>

        {Config.isDemoMode() ? (
          <Alert variant="info">
            {Config.isDemoJiraBridgeEnabled()
              ? "Demo mode is running with the local Jira bridge. New Jira-backed teams can validate against real Jira boards while the rest of the app stays server-free."
              : "Demo mode includes multiple seeded users, sample teams, historical sprints, and reset support."}
          </Alert>
        ) : null}

        {Config.isDemoMode() ? (
          <div className="demo-access-grid">
            {demoProfiles.map((profile) => (
              <button
                key={profile.userName}
                type="button"
                className="demo-access-card"
                onClick={() => handleDemoAccess(profile)}
              >
                <strong>{profile.label}</strong>
                <span>{profile.userName}</span>
                <small>{profile.description}</small>
              </button>
            ))}
          </div>
        ) : null}

        <div className="auth-toggle">
          <Button
            variant={registerMode ? "outline-secondary" : "secondary"}
            type="button"
            onClick={() => setRegisterMode(false)}
          >
            Log in
          </Button>
          <Button
            variant={registerMode ? "secondary" : "outline-secondary"}
            type="button"
            onClick={() => setRegisterMode(true)}
          >
            Register
          </Button>
        </div>

        <Form noValidate onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <Form.Group controlId="formUserName">
            <Form.Label>User name</Form.Label>
            <Form.Control
              placeholder="retro_lead"
              autoComplete="username"
              onChange={(event) => setUserName(event.target.value.trim())}
              value={userName}
              isValid={userName === "" ? false : userNameRegexp.test(userName)}
              isInvalid={userName !== "" && !userNameRegexp.test(userName)}
              required
            />
            <Form.Text className="text-muted">
              Start with a letter. Use letters, numbers, `_` or `-`.
            </Form.Text>
          </Form.Group>

          {registerMode ? (
            <Form.Group controlId="formBasicEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value.trim())}
                value={email}
                isValid={email === "" ? false : emailRegexp.test(email)}
                isInvalid={email !== "" && !emailRegexp.test(email)}
                required
              />
            </Form.Group>
          ) : null}

          <Form.Group controlId="formPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="At least 8 characters"
              autoComplete={registerMode ? "new-password" : "current-password"}
              onChange={(event) => setUserPassword(event.target.value)}
              value={userPassword}
              isValid={userPassword.length >= 8}
              isInvalid={userPassword !== "" && userPassword.length < 8}
              required
            />
          </Form.Group>

          {registerMode ? (
            <Form.Group controlId="formConfirmPassword">
              <Form.Label>Confirm password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                value={confirmPassword}
                isValid={confirmPassword !== "" && confirmPassword === userPassword}
                isInvalid={confirmPassword !== "" && confirmPassword !== userPassword}
                required
              />
            </Form.Group>
          ) : null}

          <Button variant="primary" disabled={!isFormValid || isSubmitting} type="submit" className="w-100">
            {isSubmitting ? "Working..." : registerMode ? "Create account" : "Enter RetroBoard"}
          </Button>
        </Form>
      </section>
    </div>
  );
}

export default LoginPage;
