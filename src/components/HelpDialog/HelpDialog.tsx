import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Divider,
} from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  userRole: string | null;
  showInterestStep: boolean;
  stage?: 'priority' | 'interest';
  allocationMode?: boolean;
  allocationStep?: 0 | 1;
}

const HelpDialog: React.FC<HelpDialogProps> = ({
  open, onClose, userRole, showInterestStep,
  stage = 'priority', allocationMode = false, allocationStep = 0,
}) => {
  const isCustomer = userRole === 'customer';
  const sharePointUrl = 'https://epic1.sharepoint.com/:f:/s/SmartTools-Docs/IgCMGRgsBqd0SZqSL-gZ9sQGAZjgncTeb_kmoGM6_OODz_4?e=wVa9u4';

  const titleMap: Record<string, string> = {
    stage1:      'Stage 1: Voting',
    allocation1: 'Allocation 1: Plan',
    stage2:      'Stage 2: Preferences',
    allocation2: 'Allocation 2: Team',
  };

  const currentKey = allocationMode
    ? (allocationStep === 0 ? 'allocation1' : 'allocation2')
    : (stage === 'interest' ? 'stage2' : 'stage1');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="help-dialog-title">
      <DialogTitle id="help-dialog-title" sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <HelpIcon color="info" />
          <Typography variant="h5">
            Instructions — {titleMap[currentKey]}
          </Typography>
        </Box>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>

        {/* ── Stage 1: Voting ── */}
        {currentKey === 'stage1' && (
          <>
            <Typography variant="h6" gutterBottom>Goal</Typography>
            <Typography variant="body1" paragraph>
              Rank each pitch by how high a priority you think it is for next quarter.
              Tier 1 = Highest Priority · Tier 2 = High · Tier 3 = Medium · Tier 4 = Low / Not Now.
            </Typography>

            <Typography variant="h6" gutterBottom>How to rank</Typography>
            <Typography variant="body1" paragraph>
              <strong>Drag and drop</strong> a pitch card into the tier column where it belongs.
              Or use the <strong>dropdown</strong> on the card if drag isn't working on your device.
              Hover over a card and click the <strong>ℹ︎</strong> icon to read the full pitch details before ranking.
            </Typography>

            <Typography variant="h6" gutterBottom>How much to rank</Typography>
            <Typography variant="body1" paragraph>
              Rank at least <strong>50% of pitches</strong> to enable export. You don't need to rank everything —
              an unranked pitch signals "I don't have an opinion either way."
            </Typography>

            {showInterestStep && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Next step after priority ranking</Typography>
                <Typography variant="body1" paragraph>
                  If you are a <strong>dev</strong> and are available next quarter, you'll also complete
                  interest ranking in Stage 2 after finishing priority ranking here.
                </Typography>
              </>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Submitting</Typography>
            <Typography variant="body1" paragraph>
              Click <strong>Finish</strong> (top right) to export your rankings as a CSV. Save it to SharePoint:
            </Typography>
            {!isCustomer ? (
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2, overflowX: 'auto' }}>
                <Typography
                  variant="body2"
                  component="a"
                  href={sharePointUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: (theme) => theme.palette.mode === 'dark' ? '#90caf9' : 'primary.main',
                    wordBreak: 'break-all',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {sharePointUrl}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1">
                Email your results to Chase Grey (<strong>cgrey@epic.com</strong>).
              </Typography>
            )}
          </>
        )}

        {/* ── Allocation 1: Plan ── */}
        {currentKey === 'allocation1' && (
          <>
            <Typography variant="h6" gutterBottom>Goal</Typography>
            <Typography variant="body1" paragraph>
              Build the plan for next quarter: choose which pitches to pursue, assign a developer to each,
              and decide which extras go on the backlog.
            </Typography>

            <Typography variant="h6" gutterBottom>Plans A / B / C</Typography>
            <Typography variant="body1" paragraph>
              Three near-optimal starting plans are auto-generated from vote data, differing only in how
              much weight they give to team vs. TL priority votes. Pick the one that looks closest to
              right and customize from there.
            </Typography>

            <Typography variant="h6" gutterBottom>Setting project status</Typography>
            <Typography variant="body1" paragraph>
              Each pitch has three status buttons on the right: <strong>Plan</strong> (in scope this quarter),{' '}
              <strong>Up Next</strong> (backlog — an EMC2 record will be created with blank staffing),
              and <strong>Not Now</strong> (cut). Click a button to change the status. Right-click also works.
            </Typography>

            <Typography variant="h6" gutterBottom>Assigning developers</Typography>
            <Typography variant="body1" paragraph>
              The developer dropdown for each pitch is sorted by that dev's interest tier (highest interest first).
              Interest chips use a blue ombre scale: deep blue = Highest, pale blue = Low.
              A <strong>—</strong> chip means the dev submitted interest data but skipped this pitch.
              A <strong>✕</strong> chip means the dev never submitted any interest data.
            </Typography>

            <Typography variant="h6" gutterBottom>Using the sidebar</Typography>
            <Typography variant="body1">
              The right sidebar updates live as you make assignments:
            </Typography>
            <Box component="ul" sx={{ mt: 0.5 }}>
              <li><Typography variant="body1"><strong>Average Project Priority</strong> — avg tier of selected projects (lower = better).</Typography></li>
              <li><Typography variant="body1"><strong>Category Mix</strong> — actual % vs. target bandwidth per category. Green = within ±5%.</Typography></li>
              <li><Typography variant="body1"><strong>Continuation Projects</strong> — alerts if any continuation projects were cut. Click to jump to them.</Typography></li>
              <li><Typography variant="body1"><strong>Interest Alignment</strong> — average interest tier of assigned dev–project pairs.</Typography></li>
              <li><Typography variant="body1"><strong>Developer Assignments</strong> — per-dev project list. Click a project name to jump to it.</Typography></li>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>When you're done</Typography>
            <Typography variant="body1" paragraph>
              Click <strong>Finish Plan</strong> (top right) to proceed to Allocation 2: Team.
            </Typography>
          </>
        )}

        {/* ── Stage 2: Preferences ── */}
        {currentKey === 'stage2' && (
          <>
            <Typography variant="h6" gutterBottom>Goal</Typography>
            <Typography variant="body1" paragraph>
              Rank your interest level on the subset of pitches that advanced from Stage 1.
              This data is used in Allocation 2 to match Dev TLs and QMs to projects they're excited about.
            </Typography>

            <Typography variant="h6" gutterBottom>Who completes this</Typography>
            <Typography variant="body1" paragraph>
              <strong>Dev TLs</strong> and <strong>QMs</strong> who are available next quarter.
            </Typography>

            <Typography variant="h6" gutterBottom>How to rank</Typography>
            <Typography variant="body1" paragraph>
              Drag each pitch card into an interest column: Very Interested → Somewhat Interested →
              Less Interested → Not Interested. Or use the dropdown on the card.
              Hover over a card and click <strong>ℹ︎</strong> to read full pitch details.
            </Typography>

            <Typography variant="h6" gutterBottom>How much to rank</Typography>
            <Typography variant="body1" paragraph>
              Rank at least <strong>50%</strong> of the pitches shown to enable export.
              Unranked pitches signal no strong preference.
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Submitting</Typography>
            <Typography variant="body1" paragraph>
              Click <strong>Finish</strong> to export as CSV, then upload to SharePoint using your full name as the filename.
            </Typography>
          </>
        )}

        {/* ── Allocation 2: Team ── */}
        {currentKey === 'allocation2' && (
          <>
            <Typography variant="h6" gutterBottom>Goal</Typography>
            <Typography variant="body1" paragraph>
              Assign a Dev TL and a QM to each project for the quarter. Then configure the kickoff email
              for each team.
            </Typography>

            <Typography variant="h6" gutterBottom>Auto-populated assignments</Typography>
            <Typography variant="body1" paragraph>
              Assignments are pre-filled by an algorithm that maximizes interest alignment and balances
              workload. <strong>Continuation projects</strong> are pre-assigned to their previous Dev TL
              and QM — review these manually and move them if needed.
            </Typography>

            <Typography variant="h6" gutterBottom>Dev TL and QM dropdowns</Typography>
            <Typography variant="body1" paragraph>
              Each dropdown is sorted by that person's interest tier for the pitch (highest interest first).
              Interest chips use the same blue ombre scale as Allocation 1.
            </Typography>

            <Typography variant="h6" gutterBottom>Using the sidebar</Typography>
            <Typography variant="body1" paragraph>
              The sidebar shows per-person project lists for both Dev TLs and QMs. Click a project
              name to jump to and highlight that row. Watch for warning icons indicating someone has
              no high-interest assignments.
            </Typography>

            <Typography variant="h6" gutterBottom>UXD column</Typography>
            <Typography variant="body1" paragraph>
              Check the UXD box for any project that needs a UXD for the kickoff meeting.
              This adds UXD to that project's kickoff email recipients.
            </Typography>

            <Typography variant="h6" gutterBottom>Kickoff emails</Typography>
            <Typography variant="body1" paragraph>
              Each pitch has a default kickoff email message. Click the <strong>✉</strong> icon to
              view and customize the message. Recipients include the Dev TL, Developer, QM,
              Testing Captain, and UXD (if checked).
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>When you're done</Typography>
            <Typography variant="body1" paragraph>
              Click <strong>Finalize</strong> (top right) to submit the allocation plan.
            </Typography>
          </>
        )}

      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">Got It</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
