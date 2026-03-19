"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Pencil,
  Presentation,
  Sheet,
  Archive,
  Trash2,
  XCircle,
} from "lucide-react";
import { MATERIAL_CATEGORIES } from "@/lib/material-storage-shared";

export type MaterialItem = {
  id: string;
  title: string;
  description?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  sortOrder: number;
  uploadedById?: string | null;
  uploadedByEmail?: string | null;
  createdAt: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
};

type MaterialCardProps = {
  material: MaterialItem;
  canDelete: boolean;
  canEdit: boolean;
  canReorder: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onPreview?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isFirst: boolean;
  isLast: boolean;
  downloadUrl: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const cls = "h-8 w-8 text-muted-foreground shrink-0";
  if (mimeType === "application/pdf") return <FileText className={cls} />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation className={cls} />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <Sheet className={cls} />;
  if (mimeType.startsWith("image/")) return <ImageIcon className={cls} />;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("compressed")
  )
    return <Archive className={cls} />;
  return <FileText className={cls} />;
}

function canPreviewMime(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export default function MaterialCard({
  material,
  canDelete,
  canEdit,
  canReorder,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  onPreview,
  onApprove,
  onReject,
  isFirst,
  isLast,
  downloadUrl,
}: MaterialCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categoryLabel =
    MATERIAL_CATEGORIES[material.category] ?? material.category;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 sm:p-4">
      <FileIcon mimeType={material.mimeType} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{material.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {material.fileName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {categoryLabel} &middot; {formatFileSize(material.fileSize)} &middot;{" "}
          {formatDate(material.createdAt)}
          {material.uploadedByEmail
            ? ` \u00b7 ${material.uploadedByEmail}`
            : ""}
        </p>
        {material.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {material.description}
          </p>
        ) : null}
        {material.status === "PENDING" ? (
          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            &#x23F3; In attesa
          </span>
        ) : material.status === "REJECTED" ? (
          <div className="mt-1">
            <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              &#x2717; Rifiutato
            </span>
            {material.rejectionReason ? (
              <p className="mt-0.5 text-xs text-red-600">
                {material.rejectionReason}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onApprove ? (
          <button
            type="button"
            onClick={onApprove}
            className="rounded bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            title="Approva"
          >
            <Check className="inline h-3.5 w-3.5 mr-1" />
            Approva
          </button>
        ) : null}
        {onReject ? (
          <button
            type="button"
            onClick={onReject}
            className="rounded bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            title="Rifiuta"
          >
            <XCircle className="inline h-3.5 w-3.5 mr-1" />
            Rifiuta
          </button>
        ) : null}

        {canReorder && !isFirst ? (
          <button
            type="button"
            onClick={onMoveUp}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
            title="Sposta su"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        ) : null}
        {canReorder && !isLast ? (
          <button
            type="button"
            onClick={onMoveDown}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
            title="Sposta giu"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        ) : null}

        {onPreview && canPreviewMime(material.mimeType) ? (
          <button
            type="button"
            onClick={onPreview}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
            title="Anteprima"
          >
            <Eye className="h-4 w-4" />
          </button>
        ) : null}

        <a
          href={downloadUrl}
          download
          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
          title="Scarica"
        >
          <Download className="h-4 w-4" />
        </a>

        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
            title="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}

        {canDelete ? (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete?.();
                }}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
              >
                Conferma
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded border px-2 py-1 text-xs hover:bg-muted"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              title="Elimina"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
