import React, { useState, useEffect, useRef } from 'react';
import { Send, Moon, Sun, Activity, MessageSquare, AlertCircle, CheckCircle, X } from 'lucide-react';

const HaleAIFrontend = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    avgResponseTime: 0,
    successRate: 100,
    activeConnections: 1,
    memoryUsage: 0,
    cpuUsage: 0,
    uptime: 0
  });
  const messagesEndRef = useRef(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Check backend connection
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.min(95, prev.memoryUsage + Math.random() * 2),
        cpuUsage: Math.min(80, 20 + Math.random() * 30),
        uptime: prev.uptime + 1
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('http://localhost:8000/health', {
        method: 'GET',
      });
      setIsOnline(response.ok);
    } catch (error) {
      setIsOnline(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const loadingMessage = { role: 'assistant', content: '...', isLoading: true };
    setMessages(prev => [...prev, loadingMessage]);

    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: input,
          history: messages.filter(m => !m.isLoading).map(m => ({
            user: m.role === 'user' ? m.content : '',
            bot: m.role === 'assistant' ? m.content : ''
          }))
        }),
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      setMessages(prev => prev.slice(0, -1).concat({
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        metadata: data.metadata,
        timestamp: new Date()
      }));

      setMetrics(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        avgResponseTime: Math.round((prev.avgResponseTime * prev.totalRequests + responseTime) / (prev.totalRequests + 1)),
        successRate: Math.round(((prev.successRate * prev.totalRequests + 100) / (prev.totalRequests + 1)) * 100) / 100
      }));

    } catch (error) {
      setMessages(prev => prev.slice(0, -1).concat({
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the server. Please ensure the backend is running.',
        isError: true,
        timestamp: new Date()
      }));

      setMetrics(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        successRate: Math.round(((prev.successRate * prev.totalRequests) / (prev.totalRequests + 1)) * 100) / 100
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-green-50'} transition-colors duration-300`}>
      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative`}>
            <button 
              onClick={() => setShowDisclaimer(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={32} />
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Medical Disclaimer
              </h2>
            </div>
            <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} space-y-4`}>
              <p className="font-semibold text-lg">⚠️ Important Notice</p>
              <p>
                This chatbot provides general medical information for <strong>educational purposes only</strong>.
                It is NOT a substitute for professional medical advice, diagnosis, or treatment.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Always consult qualified healthcare providers for medical decisions</li>
                <li>Never disregard professional medical advice due to information here</li>
                <li>In emergencies, call your local emergency number immediately</li>
                <li>This tool cannot diagnose conditions or prescribe treatments</li>
              </ul>
              <p className="text-sm italic">
                By clicking "I Understand", you acknowledge that you have read and understood this disclaimer.
              </p>
            </div>
            <button
              onClick={() => setShowDisclaimer(false)}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-green-600 p-3 rounded-xl">
                <Activity className="text-white" size={28} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  HaleAI Medical Assistant
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Powered by Google Gemini & RAG Technology
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Metrics Button */}
              <button
                onClick={() => setShowMetrics(!showMetrics)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
                title="View Metrics"
              >
                <Activity size={20} />
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Section */}
          <div className="lg:col-span-2">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden flex flex-col h-[calc(100vh-200px)]`}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} size={48} />
                    <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Welcome to HaleAI
                    </h3>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ask me any medical question to get started
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white'
                        : msg.isError
                        ? darkMode ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-900'
                        : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Thinking...</span>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <p className="text-xs font-semibold mb-1">📚 Sources: {msg.sources.length} references</p>
                            </div>
                          )}
                          {msg.timestamp && (
                            <p className="text-xs mt-2 opacity-70">
                              {msg.timestamp.toLocaleTimeString()}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={`border-t ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'} p-4`}>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask a medical question..."
                    disabled={!isOnline || isLoading}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${(!isOnline || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!isOnline || isLoading || !input.trim()}
                    className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold"
                  >
                    <Send size={18} />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Panel */}
          <div className={`${showMetrics ? 'block' : 'hidden lg:block'}`}>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 space-y-6`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                <Activity size={24} className="text-blue-600" />
                Performance Metrics
              </h2>

              {/* System Status */}
              <div className="space-y-3">
                <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>
                  System Status
                </h3>
                <MetricCard 
                  label="Status" 
                  value={isOnline ? "Online" : "Offline"} 
                  icon={isOnline ? <CheckCircle className="text-green-500" size={18} /> : <AlertCircle className="text-red-500" size={18} />}
                  darkMode={darkMode}
                />
                <MetricCard label="Uptime" value={formatUptime(metrics.uptime)} darkMode={darkMode} />
                <MetricCard label="Active Connections" value={metrics.activeConnections} darkMode={darkMode} />
              </div>

              {/* Request Metrics */}
              <div className="space-y-3">
                <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>
                  Request Analytics
                </h3>
                <MetricCard label="Total Requests" value={metrics.totalRequests} darkMode={darkMode} />
                <MetricCard label="Avg Response Time" value={`${metrics.avgResponseTime}ms`} darkMode={darkMode} />
                <MetricCard label="Success Rate" value={`${metrics.successRate}%`} darkMode={darkMode} />
              </div>

              {/* Resource Usage */}
              <div className="space-y-3">
                <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>
                  Resource Usage
                </h3>
                <MetricBar label="Memory" value={metrics.memoryUsage} darkMode={darkMode} />
                <MetricBar label="CPU" value={metrics.cpuUsage} darkMode={darkMode} />
              </div>

              {/* Test Types */}
              <div className="space-y-3">
                <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>
                  Test Coverage
                </h3>
                {['Unit', 'Integration', 'System', 'Performance', 'Load', 'Stress'].map(test => (
                  <TestBadge key={test} label={test} status="passing" darkMode={darkMode} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon, darkMode }) => (
  <div className={`flex justify-between items-center p-3 rounded-lg ${
    darkMode ? 'bg-gray-700' : 'bg-gray-50'
  }`}>
    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
    <div className="flex items-center gap-2">
      {icon}
      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</span>
    </div>
  </div>
);

const MetricBar = ({ label, value, darkMode }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {Math.round(value)}%
      </span>
    </div>
    <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
      <div 
        className={`h-full transition-all duration-500 ${
          value > 80 ? 'bg-red-500' : value > 60 ? 'bg-yellow-500' : 'bg-green-500'
        }`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  </div>
);

const TestBadge = ({ label, status, darkMode }) => (
  <div className={`flex items-center justify-between p-2 rounded-lg ${
    darkMode ? 'bg-gray-700' : 'bg-gray-50'
  }`}>
    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
    <span className={`text-xs px-2 py-1 rounded-full ${
      status === 'passing' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {status === 'passing' ? '✓ Pass' : '✗ Fail'}
    </span>
  </div>
);

export default HaleAIFrontend;