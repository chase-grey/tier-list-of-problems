import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, Button, Slider } from '@mui/material';
import StageNavigation, { AppStage } from './StageNavigation';

/**
 * Test component to verify StageNavigation with various user roles and scenarios
 */
const TestStageNavigation: React.FC = () => {
  // User info state
  const [role, setRole] = useState<string>('developer');
  const [canHelp, setCanHelp] = useState<boolean>(true);
  
  // Progress state
  const [totalPitchCount, setTotalPitchCount] = useState<number>(10);
  const [appetiteCount, setAppetiteCount] = useState<number>(0);
  const [rankCount, setRankCount] = useState<number>(0);
  const [interestCount, setInterestCount] = useState<number>(0);
  
  const [totalProjectCount, setTotalProjectCount] = useState<number>(10);
  const [rankedProjectCount, setRankedProjectCount] = useState<number>(0);
  const [projectInterestCount, setProjectInterestCount] = useState<number>(0);
  
  // Navigation state
  const [activeStage, setActiveStage] = useState<AppStage>('priority');
  const [completedStages, setCompletedStages] = useState<AppStage[]>([]);
  const [exportEnabled, setExportEnabled] = useState<boolean>(false);
  
  // Stage settings
  const [currentAppStage, setCurrentAppStage] = useState<'problems' | 'projects'>('problems');
  
  // Helper to reset progress
  const resetProgress = () => {
    setAppetiteCount(0);
    setRankCount(0);
    setInterestCount(0);
    setRankedProjectCount(0);
    setProjectInterestCount(0);
    setCompletedStages([]);
    setActiveStage('priority');
    setExportEnabled(false);
  };
  
  // Helper to simulate completing Stage 1
  const completeStage1 = () => {
    setAppetiteCount(Math.ceil(totalPitchCount / 2));
    setRankCount(Math.ceil(totalPitchCount / 2));
    
    if (role === 'developer' && canHelp) {
      setInterestCount(Math.ceil(totalPitchCount / 2));
      setCompletedStages(['priority', 'interest']);
    } else {
      setCompletedStages(['priority']);
    }
    
    setCurrentAppStage('projects');
    setActiveStage('projects');
  };
  
  // Helper to simulate completing Stage 2
  const completeStage2 = () => {
    setRankedProjectCount(Math.ceil(totalProjectCount / 2));
    
    if ((role === 'developer' || role === 'qm' || role === 'dev tl') && canHelp) {
      setProjectInterestCount(Math.ceil(totalProjectCount / 2));
      setCompletedStages([...completedStages, 'projects', 'project-interest']);
    } else {
      setCompletedStages([...completedStages, 'projects']);
    }
    
    setExportEnabled(true);
  };
  
  // Mock access control based on current role and progress
  const canAccessStage = (stage: AppStage): boolean => {
    // Always allow access to completed stages
    if (completedStages.includes(stage)) return true;
    
    // In Stage 1, block Projects-related stages
    if (currentAppStage === 'problems' && (stage === 'projects' || stage === 'project-interest')) {
      return false;
    }
    
    // In Stage 2, block Problem-related stages
    if (currentAppStage === 'projects' && (stage === 'priority' || stage === 'interest')) {
      return false;
    }
    
    // Problem Interest is only for Developers who can help
    if (stage === 'interest' && (role !== 'developer' || !canHelp)) {
      return false;
    }
    
    // Project Interest is only for QMs, Dev TLs, and Developers who can help
    if (stage === 'project-interest' && 
        !((role === 'qm' || role === 'dev tl' || role === 'developer') && canHelp)) {
      return false;
    }
    
    // Sequential access within each stage
    if (stage === 'interest' && !completedStages.includes('priority')) {
      return rankCount >= Math.ceil(totalPitchCount / 2) &&
             appetiteCount >= Math.ceil(totalPitchCount / 2);
    }
    
    if (stage === 'project-interest' && !completedStages.includes('projects')) {
      return rankedProjectCount >= Math.ceil(totalProjectCount / 2);
    }
    
    return true;
  };
  
  // Handle finish button click
  const handleFinish = () => {
    alert(`Finished with role: ${role}, can help: ${canHelp}, stage: ${currentAppStage}`);
  };
  
  // Handle stage change
  const handleStageChange = (newStage: AppStage) => {
    setActiveStage(newStage);
  };
  
  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        StageNavigation Test Component
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>User Settings</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel>User Role</InputLabel>
            <Select
              value={role}
              label="User Role"
              onChange={(e) => {
                setRole(e.target.value as string);
                resetProgress();
              }}
            >
              <MenuItem value="developer">Developer</MenuItem>
              <MenuItem value="qm">QM</MenuItem>
              <MenuItem value="dev tl">Dev TL</MenuItem>
              <MenuItem value="qm tl">QM TL</MenuItem>
              <MenuItem value="uxd">UXD</MenuItem>
              <MenuItem value="tltl">TLTL</MenuItem>
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={canHelp}
                onChange={(e) => {
                  setCanHelp(e.target.checked);
                  resetProgress();
                }}
              />
            }
            label="Can help with projects next quarter"
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Current App Stage</InputLabel>
            <Select
              value={currentAppStage}
              label="Current App Stage"
              onChange={(e) => {
                setCurrentAppStage(e.target.value as 'problems' | 'projects');
                resetProgress();
                if (e.target.value === 'projects') {
                  setCompletedStages(['priority']);
                  if (role === 'developer' && canHelp) {
                    setCompletedStages(['priority', 'interest']);
                  }
                  setActiveStage('projects');
                } else {
                  setActiveStage('priority');
                }
              }}
            >
              <MenuItem value="problems">Stage 1 (Problems)</MenuItem>
              <MenuItem value="projects">Stage 2 (Projects)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Progress Simulation</Typography>
        
        <Typography gutterBottom>Problem Appetite ({appetiteCount}/{totalPitchCount})</Typography>
        <Slider
          value={appetiteCount}
          onChange={(_, value) => setAppetiteCount(value as number)}
          step={1}
          marks
          min={0}
          max={totalPitchCount}
          valueLabelDisplay="auto"
        />
        
        <Typography gutterBottom>Problem Ranking ({rankCount}/{totalPitchCount})</Typography>
        <Slider
          value={rankCount}
          onChange={(_, value) => setRankCount(value as number)}
          step={1}
          marks
          min={0}
          max={totalPitchCount}
          valueLabelDisplay="auto"
        />
        
        {(role === 'developer' && canHelp) && (
          <>
            <Typography gutterBottom>Problem Interest ({interestCount}/{totalPitchCount})</Typography>
            <Slider
              value={interestCount}
              onChange={(_, value) => setInterestCount(value as number)}
              step={1}
              marks
              min={0}
              max={totalPitchCount}
              valueLabelDisplay="auto"
            />
          </>
        )}
        
        <Typography gutterBottom>Project Ranking ({rankedProjectCount}/{totalProjectCount})</Typography>
        <Slider
          value={rankedProjectCount}
          onChange={(_, value) => setRankedProjectCount(value as number)}
          step={1}
          marks
          min={0}
          max={totalProjectCount}
          valueLabelDisplay="auto"
        />
        
        {((role === 'developer' || role === 'qm' || role === 'dev tl') && canHelp) && (
          <>
            <Typography gutterBottom>Project Interest ({projectInterestCount}/{totalProjectCount})</Typography>
            <Slider
              value={projectInterestCount}
              onChange={(_, value) => setProjectInterestCount(value as number)}
              step={1}
              marks
              min={0}
              max={totalProjectCount}
              valueLabelDisplay="auto"
            />
          </>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={completeStage1}
          >
            Complete Stage 1
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={completeStage2}
          >
            Complete Stage 2
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            onClick={resetProgress}
          >
            Reset Progress
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ mb: 4, p: 2, bgcolor: '#222', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>Timeline Preview</Typography>
        
        <AppBar position="static" sx={{ mb: 4 }}>
          <Toolbar>
            <StageNavigation
              activeStage={activeStage}
              completedStages={completedStages}
              onStageSelect={handleStageChange}
              canAccessStage={canAccessStage}
              onFinish={handleFinish}
              isExportEnabled={exportEnabled}
              totalPitchCount={totalPitchCount}
              appetiteCount={appetiteCount}
              rankCount={rankCount}
              interestCount={interestCount}
              totalProjectCount={totalProjectCount}
              rankedProjectCount={rankedProjectCount}
              voterRole={role}
              available={canHelp}
              projectInterestCount={projectInterestCount}
            />
          </Toolbar>
        </AppBar>
        
        <Box sx={{ bgcolor: '#333', p: 2, borderRadius: 1 }}>
          <Typography variant="body2">
            Active Stage: <strong>{activeStage}</strong><br />
            Completed Stages: <strong>{completedStages.join(', ') || 'None'}</strong><br />
            User Role: <strong>{role}</strong><br />
            Can Help: <strong>{canHelp ? 'Yes' : 'No'}</strong><br />
            App Stage: <strong>{currentAppStage}</strong>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TestStageNavigation;
