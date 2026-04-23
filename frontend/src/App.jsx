import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </>
  )
}

export default App
