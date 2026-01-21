"use client";

import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography, Box } from "@mui/material";
import { StaffEmailPayload } from "@/lib/types";

export default function EmailPreviewDialog({
  open,
  onClose,
  payload,
}: {
  open: boolean;
  onClose: () => void;
  payload: StaffEmailPayload | null;
}) {
  if (!payload) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Email Preview</DialogTitle>
      <DialogContent>
        <Typography variant="overline" color="text.secondary">
          To
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {payload.to}
        </Typography>
        <Typography variant="overline" color="text.secondary">
          Subject
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {payload.subject}
        </Typography>
        <Typography variant="overline" color="text.secondary">
          Body
        </Typography>
        <Box
          component="pre"
          sx={{
            backgroundColor: "grey.100",
            borderRadius: 2,
            p: 2,
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}
        >
          {payload.body}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
