'use client';

import { useMemo, useState } from 'react';

import {
  deleteSavedDesign,
  exportDesignBundle,
  importDesignBundle,
  loadSavedDesigns,
  saveDesignToStorage,
  type Design,
  type Difficulty,
  type ExportedDesignBundle,
  type MissionScore,
  type PathwayId,
  type SavedDesignEntry,
} from '@/game';

interface ExportDesignProps {
  pathwayId: PathwayId;
  trajectoryId: string | null;
  vehicleId: string | null;
  difficulty: Difficulty;
  design: Design;
  callSign: string;
  score: MissionScore;
  science: number;
  onClose: () => void;
  onLoadDesign: (bundle: {
    design: Design;
    pathwayId: PathwayId;
    trajectoryId: string | null;
    vehicleId: string | null;
  }) => void;
}

export function ExportDesign({
  pathwayId,
  trajectoryId,
  vehicleId,
  difficulty,
  design,
  callSign,
  score,
  science,
  onClose,
  onLoadDesign,
}: ExportDesignProps) {
  const [designName, setDesignName] = useState(`${callSign}'s ${pathwayId.toUpperCase()} Craft`);
  const [savedList, setSavedList] = useState<SavedDesignEntry[]>(() => loadSavedDesigns());
  const [importInput, setImportInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const exported = useMemo(
    () =>
      exportDesignBundle({
        name: designName,
        pathwayId,
        trajectoryId,
        vehicleId,
        difficulty,
        design,
        runSummary: {
          callSign,
          outcome: score.outcome,
          score: score.total,
          grade: score.grade,
          stars: score.stars,
          science: Math.round(science),
          totalCost: Math.round(score.totalCost * 10) / 10,
          wetMass: Math.round(score.summary.wetMass),
          deltaV: Math.round(score.summary.deltaV),
        },
      }),
    [designName, pathwayId, trajectoryId, vehicleId, difficulty, design, callSign, score, science],
  );

  const handleSaveLocal = () => {
    const updated = saveDesignToStorage({
      name: designName,
      pathwayId,
      trajectoryId,
      vehicleId,
      difficulty,
      design,
    });
    setSavedList(updated);
    setErrorMsg(null);
    setStatusMsg(`Saved "${designName}" (${exported.bundle.designHash}) to browser storage.`);
  };

  const handleDeleteLocal = (id: string) => {
    setSavedList(deleteSavedDesign(id));
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setErrorMsg(null);
      setStatusMsg(`Copied ${label} to clipboard!`);
    } catch {
      setImportInput(text);
      setStatusMsg(`Prepared ${label} in text box below.`);
    }
  };

  const handleImport = () => {
    const res = importDesignBundle(importInput);
    if (!res.ok) {
      setStatusMsg(null);
      setErrorMsg(res.error);
      return;
    }
    const d: ExportedDesignBundle = res.data;
    const updated = saveDesignToStorage({
      name: d.name,
      pathwayId: d.pathwayId,
      trajectoryId: d.trajectoryId,
      vehicleId: d.vehicleId,
      difficulty: d.difficulty,
      design: d.design,
    });
    setSavedList(updated);
    setErrorMsg(null);
    setStatusMsg(`Imported "${d.name}" (${d.designHash}) and loaded into Assembly!`);
    onLoadDesign({
      design: d.design,
      pathwayId: d.pathwayId,
      trajectoryId: d.trajectoryId,
      vehicleId: d.vehicleId,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save, Share and Import Spacecraft Design"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              Persistence &amp; Sharing (N2)
            </p>
            <h3 className="text-lg font-bold text-ink">
              Save, Export &amp; Import Spacecraft Designs
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-space/80 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent"
          >
            ✕ Close
          </button>
        </div>

        {statusMsg && (
          <div className="mt-3 rounded-xl border border-ok/50 bg-ok/15 px-3.5 py-2 text-xs font-semibold text-ok">
            ✓ {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 rounded-xl border border-danger/50 bg-danger/15 px-3.5 py-2 text-xs font-semibold text-danger">
            ⚠ {errorMsg}
          </div>
        )}

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Save & Export Current Design */}
          <div className="rounded-xl border border-line bg-space/65 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
              1. Save or Share Current Design ({exported.bundle.designHash})
            </h4>
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                aria-label="Design Name"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-ink"
                placeholder="Name your spacecraft build..."
              />
              <button
                type="button"
                onClick={handleSaveLocal}
                className="rounded-lg border border-ok/60 bg-ok/20 px-4 py-1.5 text-xs font-bold text-ok transition hover:bg-ok hover:text-space"
              >
                💾 Save Design Locally
              </button>
              <button
                type="button"
                onClick={() => handleCopy(exported.shareCode, 'MA1 Share Code')}
                className="rounded-lg border border-accent/60 bg-accent/20 px-3.5 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-space"
              >
                📋 Copy Share Code
              </button>
              <button
                type="button"
                onClick={() => handleCopy(exported.json, 'Design JSON')}
                className="rounded-lg border border-line bg-panel px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:border-accent"
              >
                { } Copy JSON
              </button>
            </div>
            <div className="mt-2.5">
              <label htmlFor="export-share-code" className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                Shareable Build Code (MA1)
              </label>
              <input
                id="export-share-code"
                type="text"
                readOnly
                value={exported.shareCode}
                className="mt-1 w-full rounded border border-line bg-panel/80 px-2.5 py-1 font-mono text-[11px] text-accent"
              />
            </div>
          </div>

          {/* Saved Designs List */}
          <div className="rounded-xl border border-line bg-space/65 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
              2. Saved Designs in Browser ({savedList.length})
            </h4>
            {savedList.length === 0 ? (
              <p className="mt-2 text-xs text-muted">
                No saved designs yet. Click &ldquo;Save Design Locally&rdquo; above to store your current spacecraft.
              </p>
            ) : (
              <ul className="mt-2.5 divide-y divide-line/60">
                {savedList.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                    <div>
                      <span className="font-bold text-ink">{item.name}</span>
                      <span className="ml-2 rounded bg-panel px-1.5 py-0.5 font-mono text-[10px] text-accent">
                        {item.designHash}
                      </span>
                      <span className="ml-2 text-[11px] text-muted">
                        Pathway: {item.pathwayId.toUpperCase()} · Propellant: {item.design.options.fuelMass} kg
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onLoadDesign({
                            design: item.design,
                            pathwayId: item.pathwayId,
                            trajectoryId: item.trajectoryId,
                            vehicleId: item.vehicleId,
                          })
                        }
                        className="rounded-lg border border-accent/50 bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent transition hover:bg-accent hover:text-space"
                      >
                        Load into Assembly →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocal(item.id)}
                        className="rounded-lg border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] text-danger transition hover:bg-danger/25"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Import Design from Share Code or JSON */}
          <div className="rounded-xl border border-line bg-space/65 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
              3. Import a Design (Paste MA1 Share Code or JSON)
            </h4>
            <textarea
              aria-label="Paste Design JSON or Share Code"
              rows={3}
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Paste an MA1:... share code or exported JSON bundle here..."
              className="mt-2 w-full rounded-lg border border-line bg-panel p-2.5 font-mono text-xs text-ink"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportInput(exported.shareCode)}
                className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-muted transition hover:text-ink"
              >
                Paste Current Share Code
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="rounded-lg border border-accent bg-accent/20 px-4 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-space"
              >
                Import &amp; Load into Assembly →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
