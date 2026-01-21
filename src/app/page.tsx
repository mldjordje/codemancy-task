"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusChip from "@/components/StatusChip";
import FlowRunDrawer from "@/components/FlowRunDrawer";
import { flowInputSchema, settingsSchema, stageSimulationSchema } from "@/lib/schema";
import {
  AuditLog,
  FlowInput,
  FlowRun,
  Settings,
  StageSimulationInput,
} from "@/lib/types";
import { z } from "zod";

type StageSimulationResult = {
  stage: number;
  count: number;
  throttleMs: number;
  startedAt: string;
  runs: Array<{
    runId: string;
    customerId: string;
    email: string;
    scheduledAt: string;
    status: FlowRun["status"];
  }>;
};

const fetchRuns = async (): Promise<FlowRun[]> => {
  const response = await fetch("/api/runs");
  if (!response.ok) {
    throw new Error("Failed to load runs");
  }
  return response.json();
};

const fetchLogs = async (): Promise<AuditLog[]> => {
  const response = await fetch("/api/logs");
  if (!response.ok) {
    throw new Error("Failed to load logs");
  }
  return response.json();
};

const fetchSettings = async (): Promise<Settings> => {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error("Failed to load settings");
  }
  return response.json();
};

const formatTime = (value: string) => new Date(value).toLocaleString();

export default function Home() {
  const [tab, setTab] = useState(0);
  const [selectedRun, setSelectedRun] = useState<FlowRun | null>(null);
  const [stageResult, setStageResult] = useState<StageSimulationResult | null>(null);
  const queryClient = useQueryClient();

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: fetchLogs,
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const triggerForm = useForm<FlowInput>({
    resolver: zodResolver(flowInputSchema),
    defaultValues: {
      customerId: "cust_1001",
      email: "winner@merchant.demo",
      stage: 1,
      forceFail: false,
    },
  });

  type SettingsFormValues = z.input<typeof settingsSchema>;

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      applyTo: "active_only",
      existingDiscount: "skip",
      discountPercent: 10,
      durationDays: null,
      applyToFutureSubscriptions: false,
    },
  });

  type StageSimulationFormValues = z.input<typeof stageSimulationSchema>;

  const stageForm = useForm<StageSimulationFormValues>({
    resolver: zodResolver(stageSimulationSchema),
    defaultValues: {
      stage: 1,
      count: 10,
    },
  });

  useEffect(() => {
    if (settings) {
      settingsForm.reset(settings);
    }
  }, [settings, settingsForm]);

  const triggerMutation = useMutation({
    mutationFn: async (payload: FlowInput) => {
      const response = await fetch("/api/flow/rafflewinner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Trigger failed");
      }
      return response.json();
    },
    onSuccess: (run: FlowRun) => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      setSelectedRun(run);
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(`/api/runs/${runId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error("Retry failed");
      }
      return response.json();
    },
    onSuccess: (run: FlowRun) => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      setSelectedRun(run);
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async (payload: Settings) => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Settings save failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });

  const stageMutation = useMutation({
    mutationFn: async (payload: StageSimulationInput) => {
      const response = await fetch("/api/stages/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Stage simulation failed");
      }
      return response.json();
    },
    onSuccess: (result: StageSimulationResult) => {
      setStageResult(result);
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });

  const runRows = useMemo(
    () => runs.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [runs]
  );

  const needsReviewRuns = runRows.filter((run) => run.status === "needs_review");

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              border: "1px solid rgba(20,90,122,0.15)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(246,243,235,0.9))",
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h2">Raffle Winner Automation Simulator</Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    A proof-of-concept Flow + Recharge automation showcase with idempotency,
                    retries, audit logs, and multi-stage raffle execution.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label="Shopify Flow trigger" variant="outlined" />
                  <Chip label="Recharge API simulation" variant="outlined" />
                  <Chip label="Observability built-in" variant="outlined" />
                </Stack>
              </Stack>
              <Alert severity="info" variant="outlined">
                This simulator demonstrates the logic described in the provided PDFs. It focuses on
                realism over production hardening.
              </Alert>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)}>
              <Tab label="Trigger" />
              <Tab label="Runs" />
              <Tab label="Failed / Needs Review" />
              <Tab label="Stages" />
              <Tab label="Settings" />
            </Tabs>
            <Divider sx={{ my: 2 }} />

            {tab === 0 && (
              <Stack spacing={3}>
                <Typography variant="h5">Simulate rafflewinner tag</Typography>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #eee" }}>
                  <Stack spacing={2}>
                    <TextField
                      label="Customer ID"
                      {...triggerForm.register("customerId")}
                      error={Boolean(triggerForm.formState.errors.customerId)}
                      helperText={triggerForm.formState.errors.customerId?.message}
                    />
                    <TextField
                      label="Email"
                      {...triggerForm.register("email")}
                      error={Boolean(triggerForm.formState.errors.email)}
                      helperText={triggerForm.formState.errors.email?.message}
                    />
                    <Controller
                      control={triggerForm.control}
                      name="stage"
                      render={({ field }) => (
                        <FormControl>
                          <FormLabel>Stage</FormLabel>
                          <Select
                            {...field}
                            value={field.value ?? 1}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                          >
                            <MenuItem value={1}>Stage 1</MenuItem>
                            <MenuItem value={2}>Stage 2</MenuItem>
                            <MenuItem value={3}>Stage 3</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                    <Controller
                      control={triggerForm.control}
                      name="forceFail"
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={field.value ?? false} onChange={field.onChange} />}
                          label="Force failure (test retries / needs review)"
                        />
                      )}
                    />
                    <Button
                      variant="contained"
                      onClick={triggerForm.handleSubmit((values) => triggerMutation.mutate(values))}
                      disabled={triggerMutation.isPending}
                    >
                      {triggerMutation.isPending ? "Running..." : "Run automation"}
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            )}

            {tab === 1 && (
              <Stack spacing={3}>
                <Typography variant="h5">All runs</Typography>
                {runsLoading ? (
                  <Typography color="text.secondary">Loading runs...</Typography>
                ) : runRows.length === 0 ? (
                  <Typography color="text.secondary">No runs yet.</Typography>
                ) : (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #eee" }}>
                    <Stack spacing={1}>
                      {runRows.map((run) => (
                        <Paper
                          key={run.runId}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 3 }}
                        >
                          <Stack
                            direction={{ xs: "column", md: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", md: "center" }}
                            spacing={2}
                          >
                            <Stack spacing={0.5}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {run.customerId} • Stage {run.stage}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {run.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(run.createdAt)} • {run.runId}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <StatusChip status={run.status} />
                              <Button size="small" variant="outlined" onClick={() => setSelectedRun(run)}>
                                View
                              </Button>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                )}

                <Divider />
                <Typography variant="h5">Audit log</Typography>
                {logs.length === 0 ? (
                  <Typography color="text.secondary">No audit entries yet.</Typography>
                ) : (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #eee" }}>
                    <Stack spacing={1}>
                      {logs.slice(0, 12).map((log) => (
                        <Stack key={log.logId} spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(log.createdAt)} • {log.type}
                          </Typography>
                          <Typography variant="body2">{log.message}</Typography>
                          {log.runId ? (
                            <Typography variant="caption" color="text.secondary">
                              Run {log.runId}
                            </Typography>
                          ) : null}
                          <Divider />
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}

            {tab === 2 && (
              <Stack spacing={3}>
                <Typography variant="h5">Needs review</Typography>
                {needsReviewRuns.length === 0 ? (
                  <Typography color="text.secondary">No runs require review.</Typography>
                ) : (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #eee" }}>
                    <Stack spacing={1}>
                      {needsReviewRuns.map((run) => (
                        <Paper
                          key={run.runId}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 3 }}
                        >
                          <Stack
                            direction={{ xs: "column", md: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", md: "center" }}
                            spacing={2}
                          >
                            <Stack spacing={0.5}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {run.customerId} • Stage {run.stage}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {run.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(run.createdAt)} • {run.runId}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <StatusChip status={run.status} />
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setSelectedRun(run)}
                              >
                                View
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                onClick={() => retryMutation.mutate(run.runId)}
                              >
                                Retry
                              </Button>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}

            {tab === 3 && (
              <Stack spacing={3}>
                <Typography variant="h5">Stage batch simulator</Typography>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #eee" }}>
                  <Stack spacing={2}>
                    <Controller
                      control={stageForm.control}
                      name="stage"
                      render={({ field }) => (
                        <FormControl>
                          <FormLabel>Raffle stage</FormLabel>
                          <Select
                            {...field}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                          >
                            <MenuItem value={1}>Stage 1</MenuItem>
                            <MenuItem value={2}>Stage 2</MenuItem>
                            <MenuItem value={3}>Stage 3</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                    <TextField
                      label="Customers to simulate"
                      type="number"
                      {...stageForm.register("count", { valueAsNumber: true })}
                      error={Boolean(stageForm.formState.errors.count)}
                      helperText={stageForm.formState.errors.count?.message}
                    />
                    <Button
                      variant="contained"
                      onClick={stageForm.handleSubmit((values) =>
                        stageMutation.mutate(stageSimulationSchema.parse(values))
                      )}
                      disabled={stageMutation.isPending}
                    >
                      {stageMutation.isPending ? "Simulating..." : "Run stage batch"}
                    </Button>
                  </Stack>
                </Paper>
                {stageResult ? (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #eee" }}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle1">
                        Stage {stageResult.stage} scheduled • {stageResult.count} winners
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Throttle: {stageResult.throttleMs / 1000}s per customer • Started{" "}
                        {formatTime(stageResult.startedAt)}
                      </Typography>
                      <Divider />
                      {stageResult.runs.slice(0, 10).map((run) => (
                        <Stack key={run.runId} direction="row" spacing={1} alignItems="center">
                          <StatusChip status={run.status} />
                          <Typography variant="body2">
                            {run.customerId} • Scheduled {formatTime(run.scheduledAt)}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                ) : null}
              </Stack>
            )}

            {tab === 4 && (
              <Stack spacing={3}>
                <Typography variant="h5">Settings & policy engine</Typography>
                <Typography variant="body2" color="text.secondary">
                  These settings clarify merchant intent and drive the automation behavior in real
                  time.
                </Typography>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #eee" }}>
                  <Stack spacing={2}>
                    <FormControl>
                      <FormLabel>Apply discount to</FormLabel>
                      <Controller
                        name="applyTo"
                        control={settingsForm.control}
                        render={({ field }) => (
                          <RadioGroup {...field} row>
                            <FormControlLabel
                              value="active_only"
                              control={<Radio />}
                              label="Active only"
                            />
                            <FormControlLabel
                              value="active_and_paused"
                              control={<Radio />}
                              label="Active + paused"
                            />
                          </RadioGroup>
                        )}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Existing discount behavior</FormLabel>
                      <Controller
                        name="existingDiscount"
                        control={settingsForm.control}
                        render={({ field }) => (
                          <RadioGroup {...field} row>
                            <FormControlLabel value="skip" control={<Radio />} label="Skip" />
                            <FormControlLabel value="override" control={<Radio />} label="Override" />
                          </RadioGroup>
                        )}
                      />
                    </FormControl>
                    <TextField
                      label="Discount percent"
                      type="number"
                      {...settingsForm.register("discountPercent", { valueAsNumber: true })}
                      error={Boolean(settingsForm.formState.errors.discountPercent)}
                      helperText={settingsForm.formState.errors.discountPercent?.message}
                    />
                    <TextField
                      label="Duration (days) - optional"
                      type="number"
                      {...settingsForm.register("durationDays", { valueAsNumber: true })}
                      error={Boolean(settingsForm.formState.errors.durationDays)}
                      helperText={settingsForm.formState.errors.durationDays?.message}
                    />
                    <Controller
                      name="applyToFutureSubscriptions"
                      control={settingsForm.control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={Boolean(field.value)}
                              onChange={(_, checked) => field.onChange(checked)}
                            />
                          }
                          label="Apply to future subscriptions"
                        />
                      )}
                    />
                    <Button
                      variant="contained"
                      onClick={settingsForm.handleSubmit((values) =>
                        settingsMutation.mutate(settingsSchema.parse(values))
                      )}
                      disabled={settingsMutation.isPending}
                    >
                      {settingsMutation.isPending ? "Saving..." : "Save settings"}
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            )}
          </Paper>
        </Stack>
      </Container>
      <FlowRunDrawer
        run={selectedRun}
        open={Boolean(selectedRun)}
        onClose={() => setSelectedRun(null)}
        onRetry={(runId) => retryMutation.mutate(runId)}
      />
    </Box>
  );
}
