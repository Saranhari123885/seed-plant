import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, ArrowRight, Sprout, AlertCircle, CheckCircle2 } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const API_BASE = 'http://localhost:8001/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isRegistering) {
        const res = await axios.post(`${API_BASE}/register`, { username, password });
        if (res.data.error) {
          setError(res.data.error);
        } else {
          setMessage('Account created! Please authenticate.');
          setIsRegistering(false);
          setPassword('');
        }
      } else {
        const res = await axios.post(`${API_BASE}/login`, { username, password });
        if (res.data.error) {
          setError(res.data.error);
        } else {
          onLogin();
        }
      }
    } catch (err) {
      setError('Connection to backend failed. Make sure FastAPI server is running on port 8001.');
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        <div className="login-brand animate-fade-in">
          <div className="login-logo-circle">
            <Sprout size={40} color="var(--accent-green)" />
          </div>
          <div style={{textAlign: 'center'}}>
            <h2>GrainGuard AI</h2>
            <p>{isRegistering ? 'Register Operator Access' : 'Authenticate Security Node'}</p>
          </div>
        </div>

        {error && (
          <div className="login-alert error animate-fade-in">
            <AlertCircle size={18} style={{minWidth: '18px'}}/>
            <span>{error}</span>
          </div>
        )}
        
        {message && (
          <div className="login-alert success animate-fade-in">
            <CheckCircle2 size={18} style={{minWidth: '18px'}}/>
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Operator ID" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <User className="input-icon" size={20} />
          </div>

          <div className="input-group">
            <input 
              type="password" 
              placeholder="Security Protocol (Password)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Lock className="input-icon" size={20} />
          </div>

          <button type="submit" className="login-btn" style={isRegistering ? {background: 'var(--accent-blue)'} : {}}>
            {isRegistering ? 'Initialize Account' : 'Authenticate'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isRegistering ? 'Security clearance valid? ' : 'Unregistered Operator? '}
            <span 
              className="login-link"
              onClick={() => { setIsRegistering(!isRegistering); setError(''); setMessage(''); }}
            >
              {isRegistering ? 'Initiate Login' : 'Request Access'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
