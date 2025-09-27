// WidgetApp.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  FileDown,
  Trash2,
  ChevronDown,
  StickyNote,
  Lightbulb,
  Volume2,
} from 'lucide-react';
import './VoiceNotes.css';

const WidgetApp = () => {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [activeTab, setActiveTab] = useState('notes');
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [position, setPosition] = useState({
    x: window.innerWidth / 2 - 180,
    y: window.innerHeight / 2 - 250,
  });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const recognitionRef = useRef(null);

  /** --- Dragging Logic --- **/
  const handleMouseDown = (e) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };

  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  /** --- Browser Support Check --- **/
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setBrowserSupported(false);
      setError('Speech recognition not supported.');
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => stream.getTracks().forEach((track) => track.stop()))
        .catch(() => setError('Microphone access denied.'));
    }
  }, []);

  /** --- Initialize Speech Recognition --- **/
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = finalTranscript;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const part = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += part + ' ';
        else interim += part;
      }

      setFinalTranscript(final);
      setTranscript(final + interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') setError('Microphone access denied.');
      else if (event.error !== 'no-speech') setError(`Error: ${event.error}`);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [finalTranscript]);

  /** --- Recording Logic --- **/
  const startRecording = () => {
    if (!recognitionRef.current) initSpeechRecognition();
    recognitionRef.current.start();
    setIsRecording(true);
    setError('');
  };

  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  const toggleRecording = () => (isRecording ? stopRecording() : startRecording());

  /** --- Transcript Management --- **/
  const clearTranscript = () => {
    setTranscript('');
    setFinalTranscript('');
  };

  const downloadTranscript = () => {
    if (!finalTranscript.trim()) return;
    const blob = new Blob([finalTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** --- Authentication Logic --- **/
  const handleAuth = (e) => {
    e.preventDefault();
    const emailTrimmed = credentials.email.trim();
    const passwordTrimmed = credentials.password.trim();

    if (!emailTrimmed || !passwordTrimmed) {
      setError('Email and password are required.');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');

    if (authMode === 'signup') {
      if (storedUsers[emailTrimmed]) {
        setError('User exists. Please login.');
        return;
      }
      storedUsers[emailTrimmed] = passwordTrimmed;
      localStorage.setItem('users', JSON.stringify(storedUsers));
      setUser({ email: emailTrimmed });
      setError('');
    } else {
      if (!storedUsers[emailTrimmed] || storedUsers[emailTrimmed] !== passwordTrimmed) {
        setError('Invalid email or password.');
        return;
      }
      setUser({ email: emailTrimmed });
      setError('');
    }

    setCredentials({ email: '', password: '' });
  };

  const handleLogout = () => {
    setUser(null);
    setAuthMode('login');
    setTranscript('');
    setFinalTranscript('');
  };

  return (
    <div
      className={`ai-widget-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      {!isExpanded && (
        <button className="expand-btn" onClick={() => setIsExpanded(true)}>
          <Mic size={20} />
        </button>
      )}

      {isExpanded && (
        <div className="ai-meeting-assistant glass-effect">
          <div className="widget-header">
            <h2>{user ? 'FairFrame' : 'Login / Sign Up'}</h2>
            <button className="collapse-btn" onClick={() => setIsExpanded(false)}>
              <ChevronDown size={18} />
            </button>
          </div>

          {!user ? (
            <div className="auth-box">
              {error && <div className="error-box">{error}</div>}
              <form onSubmit={handleAuth}>
                <input
                  type="email"
                  placeholder="Email"
                  value={credentials.email}
                  onChange={(e) =>
                    setCredentials({ ...credentials, email: e.target.value })
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  required
                />
                <button type="submit">{authMode === 'login' ? 'Login' : 'Sign Up'}</button>
              </form>
              <p>
                {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  className="switch-btn"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setError('');
                    setCredentials({ email: '', password: '' });
                  }}
                >
                  {authMode === 'login' ? 'Sign Up' : 'Login'}
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="top-buttons">
                <button
                  className={`start-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  disabled={!browserSupported}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  {isRecording ? 'Stop' : 'Start'}
                </button>

                <button
                  className="export-btn"
                  onClick={downloadTranscript}
                  disabled={!finalTranscript.trim()}
                >
                  <FileDown size={18} /> Export
                </button>

                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>

              {error && <div className="error-box">{error}</div>}

              <div className="tabs">
                <button
                  className={activeTab === 'voice' ? 'active' : ''}
                  onClick={() => setActiveTab('voice')}
                >
                  <Volume2 size={16} /> Voice
                </button>
                <button
                  className={activeTab === 'notes' ? 'active' : ''}
                  onClick={() => setActiveTab('notes')}
                >
                  <StickyNote size={16} /> Notes
                </button>
                <button
                  className={activeTab === 'tips' ? 'active' : ''}
                  onClick={() => setActiveTab('tips')}
                >
                  <Lightbulb size={16} /> Tips
                </button>
              </div>

              <div className="content-box">
                {activeTab === 'notes' && (
                  <div className={`notes-box ${!transcript.trim() ? 'empty' : ''}`}>
                    {transcript.trim() ||
                      'Your meeting notes will appear here automatically as you speak...'}
                  </div>
                )}
                {activeTab === 'voice' && (
                  <div className="placeholder">Voice settings and controls will appear here.</div>
                )}
                {activeTab === 'tips' && (
                  <div className="placeholder">Helpful tips will appear here.</div>
                )}
              </div>

              <div className="footer">
                <span>{finalTranscript.trim().split(/\s+/).filter(Boolean).length} words</span>
                <button
                  className="clear-btn"
                  onClick={clearTranscript}
                  disabled={!finalTranscript.trim()}
                >
                  <Trash2 size={16} /> Clear
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WidgetApp;
