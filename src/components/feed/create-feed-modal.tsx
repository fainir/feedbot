"use client";

import { useState } from "react";
import { Rss, Mail, Bell, MessageCircle, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreateFeedModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateFeedModal({ open, onClose }: CreateFeedModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    whatsapp: false,
  });
  const [schedule, setSchedule] = useState<"daily" | "hourly">("daily");

  function toggleNotification(key: keyof typeof notifications) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCreate() {
    // Will be wired to real API later
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Feed">
      <div className="space-y-5">
        {/* Feed Name */}
        <div>
          <label
            htmlFor="feed-name"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Feed Name
          </label>
          <input
            id="feed-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., AI Research Papers"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="feed-description"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Describe what you want in this feed...
          </label>
          <textarea
            id="feed-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="e.g., Latest papers on large language models and transformer architectures from arxiv, OpenAI blog, and Google AI blog. Focus on practical applications and benchmark results."
            className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Notifications */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text">
            Notifications
          </label>
          <div className="flex flex-wrap gap-2">
            <NotificationToggle
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              active={notifications.email}
              onClick={() => toggleNotification("email")}
            />
            <NotificationToggle
              icon={<Bell className="h-4 w-4" />}
              label="Push"
              active={notifications.push}
              onClick={() => toggleNotification("push")}
            />
            <NotificationToggle
              icon={<MessageCircle className="h-4 w-4" />}
              label="WhatsApp"
              active={notifications.whatsapp}
              onClick={() => toggleNotification("whatsapp")}
            />
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text">
            Check Schedule
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSchedule("daily")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors",
                schedule === "daily"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-text-muted hover:bg-bg-hover"
              )}
            >
              <Clock className="h-4 w-4" />
              Daily
            </button>
            <button
              type="button"
              onClick={() => setSchedule("hourly")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors",
                schedule === "hourly"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-text-muted hover:bg-bg-hover"
              )}
            >
              <Clock className="h-4 w-4" />
              Hourly
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !description.trim()}
          >
            <Rss className="h-4 w-4" />
            Create Feed
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function NotificationToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-text-muted hover:bg-bg-hover"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
