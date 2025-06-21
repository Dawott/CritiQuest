console.log('🚀 Starting MINIMAL CritiQuest Web App...');

// Global error handler with more details
window.addEventListener('error', (event) => {
  console.error('💥 Global Error:', event.error);
  console.error('💥 Error message:', event.message);
  console.error('💥 Filename:', event.filename);
  console.error('💥 Line number:', event.lineno);
  console.error('💥 Stack:', event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled Promise Rejection:', event.reason);
});

try {
  console.log('📦 Loading MINIMAL App component...');
  
  // Test 1: Can we load React?
  console.log('Testing React import...');
  const React = require('react');
  console.log('✅ React loaded:', !!React);
  
  // Test 2: Can we load our minimal app?
  console.log('Testing App import...');
  const App = require('./App.minimal').default;
  console.log('✅ Minimal App loaded:', !!App);
  
  // Test 3: Can we create a React element?
  console.log('Testing React.createElement...');
  const testElement = React.createElement('div', null, 'Test');
  console.log('✅ React.createElement works:', !!testElement);
  
  // Test 4: Check if we can render to DOM
  const rootElement = document.getElementById('root');
  console.log('✅ Root element found:', !!rootElement);
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  // Test 5: Try React DOM render (manual, no AppRegistry)
  console.log('📦 Loading ReactDOM...');
  const ReactDOM = require('react-dom/client');
  console.log('✅ ReactDOM loaded:', !!ReactDOM);
  
  console.log('🎯 Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('🎨 Rendering app...');
  root.render(React.createElement(App));
  
  console.log('🎉 MINIMAL APP RENDERED SUCCESSFULLY!');
  
} catch (error) {
  console.error('💥 Critical Error during app initialization:', error);
  console.error('💥 Error name:', error.name);
  console.error('💥 Error message:', error.message);
  console.error('💥 Stack:', error.stack);
  
  // Show error in UI
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace; background: #ffe6e6;">
      <h1>🚨 App Failed to Load</h1>
      <p><strong>Error Name:</strong> ${error.name}</p>
      <p><strong>Error Message:</strong> ${error.message}</p>
      <details>
        <summary>Stack Trace</summary>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
      </details>
    </div>
  `;
}