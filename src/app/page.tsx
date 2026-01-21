"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  AutoAwesomeRounded,
  ShieldRounded,
  TimelineRounded,
} from "@mui/icons-material";
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

const delayStyle = (delayMs: number): CSSProperties =>
  ({ ["--delay" as string]: `${delayMs}ms` } as CSSProperties);

const heroHighlights = [
  {
    title: "Idempotent by design",
    description: "Metafield guard blocks duplicate discounts across stages.",
    icon: ShieldRounded,
  },
  {
    title: "Flow plus API harmony",
    description: "Shopify Flow orchestrates Recharge calls without custom app debt.",
    icon: AutoAwesomeRounded,
  },
  {
    title: "Audit-ready delivery",
    description: "Runs, retries, and logs support operational visibility.",
    icon: TimelineRounded,
  },
];

export default function Home() {
  const [tab, setTab] = useState(0);
  const [selectedRun, setSelectedRun] = useState<FlowRun | null>(null);
  const [stageResult, setStageResult] = useState<StageSimulationResult | null>(null);
  const [demoMode, setDemoMode] = useState(false);
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
  const demoSettings: Settings = {
    applyTo: "active_and_paused",
    existingDiscount: "override",
    discountPercent: 10,
    durationDays: 60,
    applyToFutureSubscriptions: true,
  };

  const runDemoTrigger = (payload: FlowInput, nextTab?: number) => {
    triggerForm.reset(payload);
    triggerMutation.mutate(payload);
    if (typeof nextTab === "number") {
      setTab(nextTab);
    }
  };

  const runDemoStageBatch = (nextTab?: number) => {
    const payload: StageSimulationInput = { stage: 2, count: 12 };
    stageForm.reset(payload);
    stageMutation.mutate(payload);
    if (typeof nextTab === "number") {
      setTab(nextTab);
    }
  };

  const applyDemoSettings = (nextTab?: number) => {
    settingsForm.reset(demoSettings);
    settingsMutation.mutate(demoSettings);
    if (typeof nextTab === "number") {
      setTab(nextTab);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box className="hero-shell">
            <Box className="hero-orb hero-orb--one" />
            <Box className="hero-orb hero-orb--two" />
            <Box className="hero-orb hero-orb--three" />
            <Paper
              elevation={0}
              className="hero-panel"
              sx={{
                p: { xs: 3, md: 4 },
                border: "1px solid rgba(20,90,122,0.15)",
              }}
            >
              <Stack spacing={2}>
                <Stack
                  className="reveal"
                  style={delayStyle(0)}
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
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    className="reveal"
                    style={delayStyle(120)}
                  >
                    <Chip label="Shopify Flow trigger" variant="outlined" />
                    <Chip label="Recharge API simulation" variant="outlined" />
                    <Chip label="Observability built-in" variant="outlined" />
                  </Stack>
                </Stack>
                <Alert severity="info" variant="outlined" className="reveal" style={delayStyle(200)}>
                  This simulator demonstrates the logic described in the provided PDFs. It focuses on
                  realism over production hardening.
                </Alert>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  flexWrap="wrap"
                >
                  {heroHighlights.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Paper
                        key={item.title}
                        elevation={0}
                        className="stat-card reveal"
                        style={delayStyle(280 + index * 120)}
                        sx={{ p: 2, borderRadius: 3, flex: 1, minWidth: 220 }}
                      >
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Box className="stat-icon">
                            <Icon fontSize="small" />
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {item.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.description}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
                <Paper
                  elevation={0}
                  className="glass-panel reveal"
                  style={delayStyle(520)}
                  sx={{ p: 2.5, borderRadius: 3 }}
                >
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Demo mode
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          One-click scenarios for a confident walkthrough.
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={demoMode}
                            onChange={(_, checked) => setDemoMode(checked)}
                          />
                        }
                        label={demoMode ? "On" : "Off"}
                      />
                    </Stack>
                    {demoMode ? (
                      <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
                        <Button
                          variant="contained"
                          onClick={() =>
                            runDemoTrigger(
                              {
                                customerId: "cust_demo_4021",
                                email: "winner@raffle.demo",
                                stage: 1,
                                forceFail: false,
                              },
                              1
                            )
                          }
                        >
                          Run happy path
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() =>
                            runDemoTrigger(
                              {
                                customerId: "cust_demo_4512",
                                email: "review@raffle.demo",
                                stage: 2,
                                forceFail: true,
                              },
                              2
                            )
                          }
                        >
                          Force failure
                        </Button>
                        <Button variant="outlined" onClick={() => runDemoStageBatch(3)}>
                          Stage batch
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={() => applyDemoSettings(4)}
                        >
                          Apply demo settings
                        </Button>
                      </Stack>
                    ) : null}
                  </Stack>
                </Paper>
              </Stack>
            </Paper>
          </Box>

          <Paper elevation={0} className="glass-panel" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} className="reveal" style={delayStyle(240)}>
              <Tab label="Trigger" />
              <Tab label="Runs" />
              <Tab label="Failed / Needs Review" />
              <Tab label="Stages" />
              <Tab label="Settings" />
            </Tabs>
            <Divider sx={{ my: 2 }} />

            {tab === 0 && (
              <Stack spacing={3}>
                <Typography variant="h5" className="reveal" style={delayStyle(120)}>
                  Simulate rafflewinner tag
                </Typography>
                <Paper
                  elevation={0}
                  className="glass-panel reveal"
                  style={delayStyle(200)}
                  sx={{ p: 3, borderRadius: 3, border: "1px solid #eee" }}
                >
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
                <Typography variant="h5" className="reveal" style={delayStyle(120)}>
                  All runs
                </Typography>
                {runsLoading ? (
                  <Typography color="text.secondary">Loading runs...</Typography>
                ) : runRows.length === 0 ? (
                  <Typography color="text.secondary">No runs yet.</Typography>
                ) : (
                  <Paper
                    elevation={0}
                    className="glass-panel reveal"
                    style={delayStyle(200)}
                    sx={{ p: 2, borderRadius: 3, border: "1px solid #eee" }}
                  >
                    <Stack spacing={1}>
                      {runRows.map((run, index) => (
                        <Paper
                          key={run.runId}
                          variant="outlined"
                          className="reveal"
                          style={delayStyle(280 + Math.min(index, 6) * 60)}
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
                                {run.customerId}
                                {" -> "}Stage {run.stage}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {run.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(run.createdAt)}
                                {" -> "}
                                {run.runId}
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
                <Typography variant="h5" className="reveal" style={delayStyle(160)}>
                  Audit log
                </Typography>
                {logs.length === 0 ? (
                  <Typography color="text.secondary">No audit entries yet.</Typography>
                ) : (
                  <Paper
                    elevation={0}
                    className="glass-panel reveal"
                    style={delayStyle(240)}
                    sx={{ p: 2, borderRadius: 3, border: "1px solid #eee" }}
                  >
                    <Stack spacing={1}>
                      {logs.slice(0, 12).map((log, index) => (
                        <Stack
                          key={log.logId}
                          spacing={0.5}
                          className="reveal"
                          style={delayStyle(300 + Math.min(index, 6) * 50)}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(log.createdAt)}
                            {" -> "}
                            {log.type}
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
                <Typography variant="h5" className="reveal" style={delayStyle(120)}>
                  Needs review
                </Typography>
                {needsReviewRuns.length === 0 ? (
                  <Typography color="text.secondary">No runs require review.</Typography>
                ) : (
                  <Paper
                    elevation={0}
                    className="glass-panel reveal"
                    style={delayStyle(200)}
                    sx={{ p: 2, borderRadius: 3, border: "1px solid #eee" }}
                  >
                    <Stack spacing={1}>
                      {needsReviewRuns.map((run, index) => (
                        <Paper
                          key={run.runId}
                          variant="outlined"
                          className="reveal"
                          style={delayStyle(280 + Math.min(index, 6) * 60)}
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
                                {run.customerId}
                                {" -> "}Stage {run.stage}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {run.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(run.createdAt)}
                                {" -> "}
                                {run.runId}
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
                <Typography variant="h5" className="reveal" style={delayStyle(120)}>
                  Stage batch simulator
                </Typography>
                <Paper
                  elevation={0}
                  className="glass-panel reveal"
                  style={delayStyle(200)}
                  sx={{ p: 3, borderRadius: 3, border: "1px solid #eee" }}
                >
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
                  <Paper
                    elevation={0}
                    className="glass-panel reveal"
                    style={delayStyle(260)}
                    sx={{ p: 2, borderRadius: 3, border: "1px solid #eee" }}
                  >
                    <Stack spacing={1}>
                      <Typography variant="subtitle1">
                        Stage {stageResult.stage} scheduled
                        {" -> "}
                        {stageResult.count} winners
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Throttle: {stageResult.throttleMs / 1000}s per customer
                        {" -> "}
                        Started {formatTime(stageResult.startedAt)}
                      </Typography>
                      <Divider />
                      {stageResult.runs.slice(0, 10).map((run, index) => (
                        <Stack
                          key={run.runId}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          className="reveal"
                          style={delayStyle(320 + Math.min(index, 6) * 50)}
                        >
                          <StatusChip status={run.status} />
                          <Typography variant="body2">
                            {run.customerId}
                            {" -> "}
                            Scheduled {formatTime(run.scheduledAt)}
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
                <Typography variant="h5" className="reveal" style={delayStyle(120)}>
                  Settings & policy engine
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="reveal"
                  style={delayStyle(160)}
                >
                  These settings clarify merchant intent and drive the automation behavior in real
                  time.
                </Typography>
                <Paper
                  elevation={0}
                  className="glass-panel reveal"
                  style={delayStyle(220)}
                  sx={{ p: 3, borderRadius: 3, border: "1px solid #eee" }}
                >
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


