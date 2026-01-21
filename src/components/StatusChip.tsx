import { Chip } from "@mui/material";

type Status =
  | "success"
  | "failed"
  | "already_processed"
  | "needs_review"
  | "pending"
  | "skipped";

const statusColor = (status: Status) => {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "error";
    case "already_processed":
      return "info";
    case "needs_review":
      return "warning";
    case "skipped":
      return "default";
    case "pending":
    default:
      return "default";
  }
};

const labelFor = (status: Status) => status.replace(/_/g, " ");

export default function StatusChip({ status }: { status: Status }) {
  return (
    <Chip
      size="small"
      color={statusColor(status)}
      label={labelFor(status)}
      variant={status === "pending" ? "outlined" : "filled"}
    />
  );
}
