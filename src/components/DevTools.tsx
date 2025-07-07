import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  Button,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon 
} from '@mui/icons-material';

/**
 * Debug console that displays network activity and errors
 * Only for development use
 */
const DevConsole: React.FC = () => {
  const [logs, setLogs] = useState<Array<{type: string; message: string; details?: any; timestamp: Date}>>([]);
  const [isOpen, setIsOpen] = useState(true);
  
  // Override console methods to capture logs
  useEffect(() => {
    // Save original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    
    // Override console.log
    console.log = (...args) => {
      originalConsoleLog(...args);
      setLogs(prev => [
        ...prev, 
        { 
          type: 'log', 
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '), 
          timestamp: new Date()
        }
      ]);
    };
    
    // Override console.error
    console.error = (...args) => {
      originalConsoleError(...args);
      setLogs(prev => [
        ...prev, 
        { 
          type: 'error', 
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '), 
          timestamp: new Date()
        }
      ]);
    };
    
    // Override console.warn
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      setLogs(prev => [
        ...prev, 
        { 
          type: 'warn', 
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '), 
          timestamp: new Date()
        }
      ]);
    };
    
    // Override console.info
    console.info = (...args) => {
      originalConsoleInfo(...args);
      setLogs(prev => [
        ...prev, 
        { 
          type: 'info', 
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '), 
          timestamp: new Date()
        }
      ]);
    };

    // Set up the fetch override to monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      const startTime = Date.now();
      console.info(`🌐 Fetch request: ${url}`, options);
      
      try {
        const response = await originalFetch(url, options);
        
        // Clone the response so we can read its body
        const clonedResponse = response.clone();
        
        // Try to parse the response as JSON
        let responseData;
        try {
          responseData = await clonedResponse.json();
          console.info(`✅ Fetch response: ${url}`, {
            status: response.status,
            data: responseData
          });
        } catch (e) {
          // Response is not JSON
          const text = await clonedResponse.text();
          console.info(`✅ Fetch response (text): ${url}`, {
            status: response.status,
            text: text.substring(0, 500) + (text.length > 500 ? '...' : '')
          });
        }
        
        return response;
      } catch (error) {
        console.error(`❌ Fetch error: ${url}`, error);
        throw error;
      }
    };
    
    // Restore original console methods when component unmounts
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.info = originalConsoleInfo;
      window.fetch = originalFetch;
    };
  }, []);
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return '#f44336';
      case 'warn': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#757575';
    }
  };

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
  };
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: isOpen ? '30vh' : '40px',
        backgroundColor: '#1e1e1e',
        color: 'white',
        zIndex: 2000,
        transition: 'max-height 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 1,
          backgroundColor: '#2c2c2c',
          borderBottom: isOpen ? '1px solid #444' : 'none'
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Dev Console {logs.length > 0 && `(${logs.length})`}
        </Typography>
        <Box>
          <Button 
            size="small" 
            variant="outlined" 
            color="primary"
            sx={{ mr: 1, display: isOpen ? 'inline-flex' : 'none' }}
            onClick={clearLogs}
          >
            Clear
          </Button>
          <IconButton size="small" onClick={toggleOpen} color="inherit">
            {isOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        </Box>
      </Box>
      
      <Collapse in={isOpen}>
        <Box 
          sx={{ 
            overflowY: 'auto',
            maxHeight: 'calc(30vh - 40px)',
            p: 1,
            backgroundColor: '#1e1e1e'
          }}
        >
          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No console output yet. Actions will appear here.
            </Typography>
          ) : (
            <List dense disablePadding>
              {logs.map((log, index) => (
                <ListItem 
                  key={index}
                  sx={{ 
                    borderLeft: `4px solid ${getLogColor(log.type)}`,
                    pl: 1,
                    py: 0.5,
                    backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    display: 'block'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: getLogColor(log.type),
                        fontWeight: 'bold',
                        width: '50px'
                      }}
                    >
                      {log.type.toUpperCase()}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ color: '#888', ml: 1 }}
                    >
                      {log.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word', 
                    fontSize: '0.8rem'
                  }}>
                    {log.message}
                  </pre>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default DevConsole;
