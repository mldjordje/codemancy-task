"use client";

import { useMemo, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { FlowRun, StaffEmailPayload } from "@/lib/types";
import StatusChip from "./StatusChip";
import FlowRunTimeline from "./FlowRunTimeline";
import JsonBlock from "./JsonBlock";
import EmailPreviewDialog from "./EmailPreviewDialog";

type FlowRunDrawerProps = {
  run: FlowRun | null;
  open: boolean;
  onClose: () => void;
  onRetry?: (runId: string) => void;
};

export default function FlowRunDrawer({
  run,
  open,
  onClose,
  onRetry,
}: FlowRunDrawerProps) {
  const [emailOpen, setEmailOpen] = useState(false);

  const emailPayload = useMemo<StaffEmailPayload | null>(() => {
    if (!run) return null;
    const match = [...run.steps]
      .reverse()
      .find(
        (step) =>
          step.responsePayload &&
          typeof step.responsePayload === "object" &&
          "subject" in (step.responsePayload as Record<string, unknown>)
      );
    return (match?.responsePayload as StaffEmailPayload) ?? null;
  }, [run]);

  if (!run) {
    return null;
  }

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1300 }}>
        <Box sx={{ width: { xs: 360, md: 520 }, p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h4">Run details</Typography>
              <StatusChip status={run.status} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Run ID: {run.runId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Correlation ID: {run.correlationId}
            </Typography>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle1">Customer</Typography>
              <Typography variant="body2">{run.customerId}</Typography>
              <Typography variant="body2" color="text.secondary">
                {run.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stage {run.stage} • Created {new Date(run.createdAt).toLocaleString()}
              </Typography>
            </Stack>
            <Divider />
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Execution timeline
              </Typography>
              <FlowRunTimeline steps={run.steps} />
            </Box>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle1">Retry attempts</Typography>
              {run.attempts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No retries recorded.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Attempt</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Backoff</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {run.attempts.map((attempt, index) => (
                      <TableRow key={`${attempt.attempt}-${attempt.source}-${index}`}>
                        <TableCell>{attempt.attempt}</TableCell>
                        <TableCell>{attempt.source}</TableCell>
                        <TableCell>
                          <StatusChip status={attempt.status} />
                        </TableCell>
                        <TableCell>{attempt.backoffMs}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle1">Step details</Typography>
              {run.steps.map((step, index) => (
                <Accordion key={`${step.name}-${index}`} sx={{ boxShadow: "none" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {step.name}
                      </Typography>
                      <StatusChip status={step.status} />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        {step.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Started {new Date(step.startedAt).toLocaleString()} • Ended{" "}
                        {new Date(step.endedAt).toLocaleString()} • {step.durationMs}ms
                      </Typography>
                      {step.requestPayload ? (
                        <Box>
                          <Typography variant="overline" color="text.secondary">
                            Request payload
                          </Typography>
                          <JsonBlock value={step.requestPayload} />
                        </Box>
                      ) : null}
                      {step.responsePayload ? (
                        <Box>
                          <Typography variant="overline" color="text.secondary">
                            Response payload
                          </Typography>
                          <JsonBlock value={step.responsePayload} />
                        </Box>
                      ) : null}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {emailPayload ? (
                <Button variant="outlined" onClick={() => setEmailOpen(true)}>
                  Preview staff email
                </Button>
              ) : null}
              {run.status === "needs_review" && onRetry ? (
                <Button variant="contained" color="warning" onClick={() => onRetry(run.runId)}>
                  Retry run
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Box>
      </Drawer>
      <EmailPreviewDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        payload={emailPayload}
      />
    </>
  );
}
