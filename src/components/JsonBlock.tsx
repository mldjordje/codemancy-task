import { Box } from "@mui/material";

export default function JsonBlock({ value }: { value: unknown }) {
  return (
    <Box
      component="pre"
      sx={{
        backgroundColor: "grey.100",
        borderRadius: 2,
        p: 2,
        overflow: "auto",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  );
}
