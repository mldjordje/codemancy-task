import { Timeline, TimelineConnector, TimelineContent, TimelineDot, TimelineItem, TimelineSeparator } from "@mui/lab";
import { Box, Typography } from "@mui/material";
import { Step } from "@/lib/types";
import StatusChip from "./StatusChip";

const dotStyle = (status: Step["status"]) => {
  switch (status) {
    case "success":
      return { bgcolor: "success.main", color: "success.contrastText" };
    case "failed":
      return { bgcolor: "error.main", color: "error.contrastText" };
    case "skipped":
      return { bgcolor: "grey.300", color: "text.primary" };
    default:
      return { bgcolor: "primary.main", color: "primary.contrastText" };
  }
};

export default function FlowRunTimeline({ steps }: { steps: Step[] }) {
  return (
    <Timeline sx={{ p: 0, m: 0 }}>
      {steps.map((step, index) => (
        <TimelineItem key={`${step.name}-${index}`} sx={{ minHeight: 52 }}>
          <TimelineSeparator>
            <TimelineDot sx={dotStyle(step.status)} />
            {index < steps.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent sx={{ pb: 2 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {step.name}
              </Typography>
              <StatusChip status={step.status} />
              <Typography variant="caption" color="text.secondary">
                {step.durationMs}ms
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {step.message}
            </Typography>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
