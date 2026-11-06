"use client";

import { useEffect, useState } from "react";

interface PreviewRecord {
  sourceId: string;
  cusRef: string;
  displayName: string;
  firstnameTh: string;
  lastnameTh: string;
  firstnameEn: string;
  lastnameEn: string;
  phoneNo: string;
  email: string;
  tierCode: string | null;
  tierId: number | null;
  tierGroupId: number | null;
  tierMapped: boolean;
  genderDescription: string;
  birthDate: string;
  provinceNameTh: string;
  districtNameTh: string;
  subDistrictNameTh: string;
  zipcode: string;
  createdDate: string;
  lineImageUrl: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface MembersResponse {
  data: PreviewRecord[];
  pagination: Pagination;
}

const TIER_OPTIONS = [
  { value: "", label: "ทุก Tier" },
  { value: "welcome", label: "Welcome" },
  { value: "living", label: "Living" },
  { value: "life", label: "Life" },
  { value: "sublime", label: "Sublime" },
  { value: "superior", label: "Superior" },
  { value: "staff1", label: "Staff1" },
  { value: "staff2", label: "Staff2" },
  { value: "staff3", label: "Staff3" },
  { value: "staff4", label: "Staff4" },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Strips the "HH:MM" time portion off a "DD/MM/YYYY HH:MM" string for display. */
function dateOnly(value: string): string {
  return value.split(" ")[0] ?? value;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, imageUrl, seed }: { name: string; imageUrl: string | null; seed: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imageUrl && !imgFailed) {
    // eslint-disable-next-line @next/next/no-img-element -- external LINE CDN avatars, next/image would need a remotePatterns allowlist for this domain
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
      />
    );
  }

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ring-1 ring-black/5 dark:ring-white/10 ${avatarColor(seed)}`}
    >
      {initials(name)}
    </div>
  );
}

const TIER_GROUP_BADGE: Record<number, string> = {
  1: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  2: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
};

// Per-tier overrides requested explicitly; anything not listed here falls
// back to the tier_group color above.
const TIER_CODE_BADGE: Record<string, string> = {
  welcome: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  living: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  life: "bg-zinc-900 text-zinc-50 ring-1 ring-inset ring-zinc-700 dark:bg-black dark:text-zinc-100 dark:ring-zinc-600",
  sublime: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  superior: "bg-white text-zinc-900 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-400",
  // "black" like life, but a visibly different (blue-tinted) shade so the two don't read as the same color
  staff1: "bg-slate-800 text-slate-50 ring-1 ring-inset ring-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600",
  staff2: "bg-slate-800 text-slate-50 ring-1 ring-inset ring-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600",
  staff3: "bg-slate-800 text-slate-50 ring-1 ring-inset ring-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600",
  staff4: "bg-slate-800 text-slate-50 ring-1 ring-inset ring-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600",
};

function TierBadge({ record }: { record: PreviewRecord }) {
  if (!record.tierMapped) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        unmapped: {record.tierCode ?? "null"}
      </span>
    );
  }
  const colorClass =
    (record.tierCode && TIER_CODE_BADGE[record.tierCode.toLowerCase()]) ??
    (record.tierGroupId && TIER_GROUP_BADGE[record.tierGroupId]) ??
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass}`}>
      {record.tierCode}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}

/**
 * Real download progress — every state comes from the actual request:
 * "preparing" lasts until the server answers (it builds the whole file before responding),
 * "downloading" counts the bytes actually received against Content-Length.
 */
type DownloadState =
  | { phase: "idle" }
  | { phase: "preparing"; startedAt: number }
  | { phase: "downloading"; loaded: number; total: number | null }
  | { phase: "error"; message: string };

function filenameFromDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^";]+)"?/);
  return match?.[1] ?? fallback;
}

async function downloadFile(url: string, fallbackName: string, onState: (s: DownloadState) => void) {
  onState({ phase: "preparing", startedAt: Date.now() });
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Request failed (${res.status})`);
    }

    const totalHeader = Number(res.headers.get("Content-Length"));
    const total = totalHeader > 0 ? totalHeader : null;
    const reader = res.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let loaded = 0;
    onState({ phase: "downloading", loaded, total });
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onState({ phase: "downloading", loaded, total });
    }

    const blob = new Blob(chunks, { type: res.headers.get("Content-Type") ?? "application/octet-stream" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filenameFromDisposition(res.headers.get("Content-Disposition"), fallbackName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    onState({ phase: "idle" });
  } catch (err) {
    onState({ phase: "error", message: err instanceof Error ? err.message : "Download failed" });
  }
}

function formatMb(bytes: number): string {
  return (bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0);
}

/** Label for a download button: real elapsed time while the server works, real MB while receiving. */
function DownloadLabel({ state, idle, now }: { state: DownloadState; idle: string; now: number }) {
  if (state.phase === "preparing") {
    const secs = Math.max(0, Math.floor((now - state.startedAt) / 1000));
    return (
      <span className="flex items-center gap-1.5">
        <Spinner /> กำลังเตรียมไฟล์… {secs} วิ
      </span>
    );
  }
  if (state.phase === "downloading") {
    const pct = state.total ? Math.floor((state.loaded / state.total) * 100) : null;
    return (
      <span className="flex items-center gap-1.5">
        <Spinner /> กำลังดาวน์โหลด {formatMb(state.loaded)}
        {state.total ? ` / ${formatMb(state.total)} MB (${pct}%)` : " MB"}
      </span>
    );
  }
  return <>{idle}</>;
}

function Spinner() {
  return <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

export default function Home() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tier, setTier] = useState("");
  const [result, setResult] = useState<MembersResponse | null>(null);
  // `loading` is derived: we're loading whenever the latest settled request
  // doesn't match the current filters, so the effect never sets state synchronously.
  const requestKey = `${page}|${pageSize}|${tier}`;
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const loading = settledKey !== requestKey;
  const [fetchError, setFetchError] = useState<string | null>(null);
  const error = loading ? null : fetchError;

  const [exportOpen, setExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportTier, setExportTier] = useState("");
  // Blank = export everyone matching the filters; otherwise cap at N people.
  const [exportLimit, setExportLimit] = useState("");
  // Which end of the register_date timeline to take from: earliest registrants or most recent.
  const [exportOrder, setExportOrder] = useState<"asc" | "desc">("desc");
  const exportLimitValid = exportLimit === "" || (/^\d+$/.test(exportLimit) && Number(exportLimit) > 0);
  const [exportSummary, setExportSummary] = useState<{ total: number; valid: number; needsReview: number } | null>(
    null
  );
  const [exportSummaryLoading, setExportSummaryLoading] = useState(false);
  const [exportSummaryError, setExportSummaryError] = useState<string | null>(null);

  const [zipDownload, setZipDownload] = useState<DownloadState>({ phase: "idle" });
  const [reviewDownload, setReviewDownload] = useState<DownloadState>({ phase: "idle" });
  const downloadBusy = (s: DownloadState) => s.phase === "preparing" || s.phase === "downloading";
  const anyDownloadBusy = downloadBusy(zipDownload) || downloadBusy(reviewDownload);
  // Ticks once a second only while a server is preparing a file, to show the real elapsed time.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (zipDownload.phase !== "preparing" && reviewDownload.phase !== "preparing") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [zipDownload.phase, reviewDownload.phase]);

  function startDownload(url: string, fallbackName: string, setState: (s: DownloadState) => void) {
    setNow(Date.now());
    void downloadFile(url, fallbackName, setState);
  }

  function handleExportStartDateChange(value: string) {
    setExportStartDate(value);
    if (exportEndDate && value && exportEndDate < value) setExportEndDate(value);
  }

  const exportQuery = (() => {
    const params = new URLSearchParams({ order: exportOrder });
    if (exportStartDate) params.set("startDate", exportStartDate);
    if (exportEndDate) params.set("endDate", exportEndDate);
    if (exportTier) params.set("tier", exportTier);
    if (exportLimit) params.set("limit", exportLimit);
    return params.toString();
  })();

  useEffect(() => {
    // The summary panel is only rendered when the limit is valid, so there's nothing to reset here.
    if (!exportOpen || !exportLimitValid) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setExportSummaryLoading(true);
      setExportSummaryError(null);

      fetch(`/api/export/summary?${exportQuery}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Request failed (${res.status})`);
          return res.json();
        })
        .then((data: { total: number; valid: number; needsReview: number }) => setExportSummary(data))
        .catch((err) => {
          if (err.name !== "AbortError") setExportSummaryError(err.message ?? "Failed to load summary");
        })
        .finally(() => setExportSummaryLoading(false));
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [exportOpen, exportQuery, exportLimitValid]);

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (tier) params.set("tier", tier);

    fetch(`/api/members?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data: MembersResponse) => {
        setResult(data);
        setFetchError(null);
        setSettledKey(requestKey);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setFetchError(err.message ?? "Failed to load");
        setSettledKey(requestKey);
      });

    return () => controller.abort();
  }, [page, pageSize, tier, requestKey]);

  const pagination = result?.pagination;
  const rangeStart = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const rangeEnd = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;

  function goToPage(next: number) {
    if (!pagination) return;
    setPage(Math.min(Math.max(1, next), pagination.totalPages || 1));
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 font-sans sm:px-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-sm">
              P
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">PRIMO Migration</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Member Directory · Preview</p>
            </div>
          </div>

          <button
            onClick={() => setExportOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Export
          </button>
        </div>

        {/* Export modal */}
        {exportOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setExportOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Export to PRIMO template</h2>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    ใส่จำนวนคนแล้วเลือกว่าจะเอาคนที่สมัครล่าสุดหรือสมัครก่อน (ตาม register date) — วันที่ไม่บังคับ
                    ผลลัพธ์เป็น .zip ที่มี 2 ไฟล์: แบบ PRIMO template
                    (map สำเร็จ) และไฟล์ที่ต้องตรวจสอบ (address/tier ไม่ match)
                  </p>
                </div>
                <button
                  onClick={() => setExportOpen(false)}
                  aria-label="Close"
                  className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                    จำนวนคน
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      placeholder="ทั้งหมด"
                      value={exportLimit}
                      onChange={(e) => setExportLimit(e.target.value.trim())}
                      className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm dark:bg-zinc-950 ${
                        exportLimitValid ? "border-zinc-300 dark:border-zinc-700" : "border-red-400 dark:border-red-500"
                      }`}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                    เรียงจาก
                    <select
                      value={exportOrder}
                      onChange={(e) => setExportOrder(e.target.value as "asc" | "desc")}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <option value="desc">สมัครล่าสุดก่อน</option>
                      <option value="asc">สมัครก่อน (คนแรก)</option>
                    </select>
                  </label>
                </div>
                <span className={`-mt-1.5 text-xs ${exportLimitValid ? "text-zinc-400 dark:text-zinc-500" : "text-red-600 dark:text-red-400"}`}>
                  {exportLimitValid
                    ? "เว้นว่างเพื่อ export ทุกคน — คนที่ไม่มีวันที่สมัครจะอยู่ท้ายสุดเสมอ"
                    : "กรุณาใส่จำนวนเต็มที่มากกว่า 0"}
                </span>

                <div className="flex gap-3">
                  <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                    วันที่เริ่ม (ไม่บังคับ)
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => handleExportStartDateChange(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                    ถึงวันที่ (ไม่บังคับ)
                    <input
                      type="date"
                      value={exportEndDate}
                      min={exportStartDate || undefined}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Tier
                  <select
                    value={exportTier}
                    onChange={(e) => setExportTier(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {TIER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {exportLimitValid && (
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                  {exportSummaryLoading && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">กำลังนับจำนวน...</p>
                  )}
                  {!exportSummaryLoading && exportSummaryError && (
                    <p className="text-sm text-red-600 dark:text-red-400">เกิดข้อผิดพลาด: {exportSummaryError}</p>
                  )}
                  {!exportSummaryLoading && !exportSummaryError && exportSummary && (
                    <div className="text-sm">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        พบทั้งหมด {exportSummary.total.toLocaleString()} คน
                      </div>
                      <div className="mt-1 flex gap-4 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ✓ ผ่าน {exportSummary.valid.toLocaleString()} คน
                        </span>
                        <span
                          className={
                            exportSummary.needsReview > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-zinc-400 dark:text-zinc-500"
                          }
                        >
                          ⚠ ต้องตรวจสอบ {exportSummary.needsReview.toLocaleString()} คน
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/30">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  รายการที่ต้องแก้ทั้งหมดในฐานข้อมูล (ไม่สนตัวกรองด้านบน) — สำหรับประชุม/ส่งทีมแก้ข้อมูล
                </p>
                <button
                  type="button"
                  disabled={anyDownloadBusy}
                  onClick={() => startDownload("/api/export/needs-review", "needs_review_all.csv", setReviewDownload)}
                  className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-300 dark:hover:bg-amber-950"
                >
                  <DownloadLabel state={reviewDownload} idle="ดาวน์โหลด .csv" now={now} />
                </button>
              </div>
              {reviewDownload.phase === "error" && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">ดาวน์โหลดไม่สำเร็จ: {reviewDownload.message}</p>
              )}

              {zipDownload.phase === "error" && (
                <p className="mt-3 text-right text-xs text-red-600 dark:text-red-400">ดาวน์โหลดไม่สำเร็จ: {zipDownload.message}</p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setExportOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  ยกเลิก
                </button>
                {exportLimitValid ? (
                  <button
                    type="button"
                    disabled={anyDownloadBusy}
                    onClick={() => startDownload(`/api/export?${exportQuery}`, "primo_export.zip", setZipDownload)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-80"
                  >
                    <DownloadLabel state={zipDownload} idle="ดาวน์โหลด .zip" now={now} />
                  </button>
                ) : (
                  <span
                    className="cursor-not-allowed rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                    title="จำนวนคนไม่ถูกต้อง"
                  >
                    ดาวน์โหลด .zip
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total members" value={pagination ? pagination.total.toLocaleString() : "—"} />
          <StatCard label="Tier filter" value={tier ? TIER_OPTIONS.find((t) => t.value === tier)?.label ?? tier : "All"} />
          <StatCard
            label="Showing"
            value={pagination ? `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()}` : "—"}
          />
          <StatCard label="Page" value={pagination ? `${pagination.page} / ${pagination.totalPages}` : "—"} />
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            Tier
            <select
              value={tier}
              onChange={(e) => {
                setTier(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            Rows / page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          {loading && <span className="text-sm text-zinc-400">กำลังโหลด…</span>}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            เกิดข้อผิดพลาด: {error}
          </div>
        )}

        {/* Table card */}
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  {["Member", "Contact", "Tier", "Gender", "Birth date", "Address", "Register date"].map(
                    (col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                      กำลังโหลด...
                    </td>
                  </tr>
                )}

                {!loading && result?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}

                {!loading &&
                  result?.data.map((m) => (
                    <tr key={m.sourceId} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.displayName || m.cusRef} imageUrl={m.lineImageUrl} seed={m.cusRef || m.sourceId} />
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{m.displayName || "—"}</div>
                            <div className="font-mono text-xs text-zinc-400">{m.cusRef || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                        <div>{m.phoneNo || "—"}</div>
                        <div className="text-xs text-zinc-400">{m.email || "—"}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <TierBadge record={m} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                        {m.genderDescription}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                        {dateOnly(m.birthDate) || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {m.provinceNameTh || m.districtNameTh || m.subDistrictNameTh ? (
                          <>
                            {[m.subDistrictNameTh, m.districtNameTh, m.provinceNameTh].filter(Boolean).join(", ")}
                            {m.zipcode && <span className="ml-1 font-mono">{m.zipcode}</span>}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                        {m.createdDate || "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {pagination && pagination.totalPages > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                หน้า {pagination.page.toLocaleString()} จาก {pagination.totalPages.toLocaleString()}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goToPage(1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  « แรก
                </button>
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  ‹ ก่อนหน้า
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={!pagination || page >= pagination.totalPages}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  ถัดไป ›
                </button>
                <button
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={!pagination || page >= pagination.totalPages}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  สุดท้าย »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
