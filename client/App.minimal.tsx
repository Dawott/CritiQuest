import React from 'react';

// Ultra minimal app with zero external dependencies
const App = () => {
  console.log('🎯 Minimal App component is rendering!');
  
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ 
        color: '#007AFF',
        fontSize: '32px',
        marginBottom: '20px' 
      }}>
        🎉 CritiQuest Web
      </h1>
      
      <p style={{
        fontSize: '18px',
        color: '#666',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        Minimal React app is working!
      </p>
      
      <div style={{
        backgroundColor: '#007AFF',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        ✅ No server imports • No Firebase • Pure React
      </div>
      
      <button 
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#34C759',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
        onClick={() => alert('Button clicked! React events work!')}
      >
        Test Button
      </button>
    </div>
  );
};

export default App;